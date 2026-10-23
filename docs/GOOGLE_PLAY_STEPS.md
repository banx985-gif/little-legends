# Putting Little Legends on Google Play

The Android app is **built but not published**. This page covers two things: what is ready, and what only you can do.

## What is ready

- **`app-android/`** is the Android app. It's a thin wrapper (Capacitor 8.5) around the same game files as the website.
  - Everything is inside the app, so it plays offline from the very first launch.
  - Permissions: INTERNET (Android's web view needs it, and so does Google Play Billing) and Google Play's BILLING, added by the billing library (Job 18). The game's only network use is Google Play checking the one-time unlock. There is no camera, microphone, location or storage access.
  - It doesn't back saves up to the cloud.
- **Tablet behaviour:**
  - Landscape only.
  - Full screen; the bars come back with a swipe from the edge.
  - The Android back button does nothing, so a toddler can't drop out of the game. The game's own BACK buttons work as usual.
- **App details:**
  - App id `com.banxgames.littlelegends`, name "Little Legends".
  - The icon is Pip waving on the game's sky blue. The splash screen is the Banx Games logo (Job 16).
- **Free to try + one "Unlock everything" (Job 18):** Google Play product `full_unlock`, a one-time purchase of about A$4.99. See "In-app product" below.
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

### In-app product: "Unlock everything" (Job 18)
The app sells one thing: a one-time (non-consumable) product. Set it up once in Play Console:
1. Upload any build that contains the billing code (Job 18 or later) to a testing track first. Play Console only lets you create products after an app with billing has been uploaded.
2. Play Console → your app → **Monetize with Play → Products → One-time products → Create product**.
   - **Product ID:** `full_unlock`. It must be exactly this; the game asks for this id.
   - **Name:** "Unlock everything". **Description:** "All worlds, all colouring pages, the full wardrobe and everything added later. Paid once."
   - **Price:** A$4.99 (Play suggests prices for other countries).
   - Save, then **Activate**.
3. Payments profile: Play Console asks for a merchant/payments profile the first time. It needs your bank details and is required before you can sell.
4. Testing purchases: Play Console → **Settings → License testing**. Add your own Google account (and any testers). Licence testers can buy without being charged. Test cards show in the purchase sheet.
5. In the app: Parent Area → **FULL GAME** shows what the unlock includes, the price from Google Play, **UNLOCK EVERYTHING** and **RESTORE PURCHASE**.
   - Buying first asks for a grown-up check: hold a button for 3 seconds, then answer a sum written in words. That's the Families-policy "parent gate".
   - Debug builds (the test APK) also show a **Developer test** switch that turns the unlock on and off without paying. Release builds never show it.
6. Refunds: if Google Play refunds the purchase, the app sees that the next time it starts online, and goes back to the free version.

### 4. Policy forms in Play Console ("App content")
- **Privacy policy:** `https://banx985-gif.github.io/little-legends/privacy.html`.
  - Google wants a way to contact you. The page points to the contact details on your Play listing, so make sure that email is one you read.
  - You can also add your email to `privacy.html`.
- **Ads:** "No, my app does not contain ads".
- **App access:** "All functionality is available without special access" (there's no login).
- **Target audience and content:**
  - Choose **"5 and under"** (you can also tick 6–8).
  - This puts the app under the **Families policy**. The game meets it: no ads, no analytics, no data collection and no links out. The only purchase is in the Parent Area, behind the hold-to-open gate plus a second grown-up check (hold 3 s, then a sum in words), and it uses Google Play Billing. Children never see a price.
- **Content rating:** fill in the IARC questionnaire honestly. There's no violence, no user chat and no location sharing, so expect **Everyone / PEGI 3**. Answer **yes** to "in-app purchases" (the one unlock); the store page will show "In-app purchases".
- **Data safety:**
  - "Does your app collect or share any of the required user data types?" → **No**.
  - Everything about the child stays on the device and nothing is sent to us. There is no server.
  - The purchase is handled by Google Play itself. Google's guidance is that data handled by Google Play Billing for a purchase does not have to be declared by the app, because the app doesn't collect it. The app only keeps "unlocked: yes/no" on the tablet.
  - If the form asks about **Purchase history**, the honest answer is that the app doesn't collect it: it only asks Google Play whether this account owns the unlock, and that answer stays on the device.
  - "Is all of the user data encrypted in transit?" doesn't apply when nothing is sent.
  - Deletion: data lives only on the device. Uninstalling, or Parent Area → DATA → RESET, removes it.
- **Government apps / financial features / health:** No.
- **Teacher Approved** (optional, later): Google may review kids' apps for the "Teacher Approved" badge. There's nothing to apply for; keep the app in the Families programme.

### 5. Store listing (words and pictures)
- **Short description** (80 characters max), for example:
  "Gentle learning adventures with Pip for ages 2–5. No ads, works offline."
- **Full description**, a starting point:
  > Little Legends: Magic World is a calm, colourful learning game for children aged 2 to 5. Explore eight worlds with Pip: count with dinosaurs in Dino Valley, find colours and shapes in Rainbow Village, meet farm and forest animals, learn letters in Luna's Storybook, practise everyday routines in Bella's Day, build rockets on the Space Station, help the town helpers in Busy Town and make music in the Jungle. Little Missions adapt to your child, hints appear gently, and every win grows Wonder Island with new friends, decorations and rides.
  > For grown-ups: free to try, with one optional payment that unlocks everything (no coins, no ads, no subscriptions, nothing else to buy). No accounts and no internet needed to play. Everything stays on your tablet. A Parent Area (behind a hold-to-open gate) shows what your child is practising and lets you set volume, quiet mode, break reminders and more.
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
