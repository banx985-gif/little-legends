# Putting Little Legends on Google Play

The Android app is **built but not published**. This page covers two things: what is ready, and what only you can do.

## What is ready

- **`app-android/`** is the Android app. It's a thin wrapper (Capacitor 8.5) around the same game files as the website.
  - Everything is inside the app, so it plays offline from the very first launch.
  - The only permission is INTERNET, which Android's web view needs to show the built-in game. The game makes no network requests, and there is no camera, microphone, location or storage access.
  - It doesn't back saves up to the cloud.
- **Tablet behaviour:**
  - Landscape only.
  - Full screen; the bars come back with a swipe from the edge.
  - The Android back button does nothing, so a toddler can't drop out of the game. The game's own BACK buttons work as usual.
- **App details:**
  - App id `com.banxgames.littlelegends`, name "Little Legends".
  - The icon and splash screen are Pip waving on the game's sky blue.
- **A test build:** `app-android/dist/LittleLegends-debug.apk` (about 80 MB). Install it on a tablet to try it; see below.
- **Privacy policy page:** `privacy.html`. After the push it's live at
  **https://banx985-gif.github.io/little-legends/privacy.html**, which is the link Google asks for.
- **Play Store icon:** `docs/store/play-icon-512.png` (512×512, the size Google wants).

### Rebuilding the app after game changes
```
cd app-android
npm install          (first time only)
npm run build        -> dist/LittleLegends-debug.apk          (for your own tablets)
npm run build:release -> dist/LittleLegends-release.aab       (for Google Play, see step 3)
```
It needs Java 21 and the Android SDK. Both are already on this PC and the script finds them.

### Trying the test build on a tablet
1. Copy `LittleLegends-debug.apk` to the tablet: USB cable, Google Drive, or email it to yourself.
2. Tap the file. Android will ask to allow "install unknown apps" for that app (Files, Drive…). Allow it once.
3. Tap Install, then open **Little Legends**.

## What only you can do

### 1. Google Play developer account
- Sign up at play.google.com/console. It's a one-off fee of $25 USD.
- Google checks your identity (photo ID) and wants a contact email and phone number. This can take a few days.
- **New personal accounts have to run a closed test** before the app can go public:
  - at least **12 testers**, opted in for **14 days in a row**;
  - family and friends with Android phones or tablets are fine.
- An organisation account (for a registered business) skips this, but needs a D-U-N-S number.

### 2. Create the app in Play Console
- Name: **Little Legends: Magic World**.
- Default language: English (Australia) or English (UK/US).
- App or game: **Game**.
- Free or paid: **Free**. You can't change a free app to paid later.
- Category: **Educational** (games), or Education if you list it as an app.

### 3. Your upload key (keep it safe forever)
Google Play needs the release build signed with a key that only you hold. Make it once:
```
cd app-android
keytool -genkey -v -keystore little-legends-upload.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload
```
- `keytool` is in the Java folder: `%LOCALAPPDATA%\Programs\Java\jdk-21…\bin\keytool.exe`.
- Copy `app-android/android/keystore.properties.example` to `keystore.properties` and fill in your passwords.
- Then run `npm run build:release`. Upload `dist/LittleLegends-release.aab`.
- **Back up the .jks file and the passwords** somewhere safe that isn't GitHub. Git ignores them on purpose.
- Turn on **Play App Signing** when asked. It's the default, and it means Google can help if you ever lose the upload key.
- Every new upload needs a higher **versionCode** in `app-android/android/app/build.gradle` (1, 2, 3…).

### 4. Policy forms in Play Console ("App content")
- **Privacy policy:** `https://banx985-gif.github.io/little-legends/privacy.html`.
  - Google wants a way to contact you. The page points to the contact details on your Play listing, so make sure that email is one you read.
  - You can also add your email to `privacy.html`.
- **Ads:** "No, my app does not contain ads".
- **App access:** "All functionality is available without special access" (there's no login).
- **Target audience and content:**
  - Choose **"5 and under"** (you can also tick 6–8).
  - This puts the app under the **Families policy**. The game already meets it: no ads, no analytics, no data collection, no links out, and nothing to buy. The Parent Area sits behind a hold-to-open gate.
- **Content rating:** fill in the IARC questionnaire honestly. There's no violence, no user chat, no purchases and no location sharing, so expect **Everyone / PEGI 3**.
- **Data safety:**
  - "Does your app collect or share any of the required user data types?" → **No**.
  - Everything stays on the device and nothing is sent.
  - "Is all of the user data encrypted in transit?" doesn't apply when nothing is sent.
  - Deletion: data lives only on the device. Uninstalling, or Parent Area → DATA → RESET, removes it.
- **Government apps / financial features / health:** No.
- **Teacher Approved** (optional, later): Google may review kids' apps for the "Teacher Approved" badge. There's nothing to apply for; keep the app in the Families programme.

### 5. Store listing (words and pictures)
- **Short description** (80 characters max), for example:
  "Gentle learning adventures with Pip for ages 2–5. No ads, works offline."
- **Full description**, a starting point:
  > Little Legends: Magic World is a calm, colourful learning game for children aged 2 to 5. Explore eight worlds with Pip: count with dinosaurs in Dino Valley, find colours and shapes in Rainbow Village, meet farm and forest animals, learn letters in Luna's Storybook, practise everyday routines in Bella's Day, build rockets on the Space Station, help the town helpers in Busy Town and make music in the Jungle. Little Missions adapt to your child, hints appear gently, and every win grows Wonder Island with new friends, decorations and rides.
  > For grown-ups: no ads, nothing to buy, no accounts and no internet needed. Everything stays on your tablet. A Parent Area (behind a hold-to-open gate) shows what your child is practising and lets you set volume, quiet mode, break reminders and more.
- **App icon:** `docs/store/play-icon-512.png`.
- **Feature graphic:** 1024×500, needed. Pip plus a world background works well. This needs to be made.
- **Screenshots** (only you can take these from a real tablet):
  - at least 2 phone screenshots;
  - for tablets: at least one each for **7-inch** and **10-inch**. Without them the app shows less prominently on tablets.
  - Good moments to capture: Wonder Island, the world map, a mission activity, the egg hatching, the Collection.
  - Take them on the tablet (power + volume down).
  - `npm run qa:tablet` also saves screenshots in `docs/qa_shots/`. They're good for picking moments, but use real tablet ones for the store.

### 6. Testing, then release
1. **Internal testing** track: upload the .aab and add your own Google account. Install it from the Play link on the cheap tablets and play through.
2. **Closed testing**: 12+ testers for 14 days (new personal accounts only, see step 1).
3. **Production**: send for review. The first review of a kids' app can take a week or more.

### 7. After it's live
- **Updating:**
  1. Change the game.
  2. Run `npm run check`.
  3. Raise versionCode.
  4. Run `npm run build:release` and upload.
- The website (GitHub Pages) and the app are the same game. Pushing updates the website straight away; the app updates only when you upload a new build.
- **Older tablets:** the app needs Android 7 or newer with an up-to-date "Android System WebView" (Chrome 97 or newer). It updates from the Play Store on its own on most tablets.
