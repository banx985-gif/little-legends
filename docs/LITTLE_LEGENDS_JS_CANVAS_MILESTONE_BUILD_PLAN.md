# LITTLE LEGENDS: MAGIC WORLD
## JavaScript + HTML5 Canvas — Milestone Build Plan

**Platform:** Tablet-first web app / installable PWA  
**Target devices:** iPad and Android tablets  
**Engine:** Custom JavaScript + HTML5 Canvas  
**Primary target age:** 2–5 years  
**Game type:** Educational adventure / world builder / collection game  
**Core rule:** Learning is the gameplay.

---

# 1. TECHNICAL DIRECTION

Little Legends should be built as a lightweight, offline-first tablet game using:

- JavaScript
- HTML5 Canvas
- Web Audio API
- Pointer Events for touch/mouse input
- IndexedDB for local saves
- Service Worker for offline caching
- JSON-driven content
- CSS/HTML only for parent-gated menus and accessibility support where appropriate
- Canvas rendering for the child-facing game

Recommended project structure:

```text
/src
  /core
  /render
  /input
  /audio
  /state
  /save
  /activities
  /learning
  /adventures
  /world
  /characters
  /ui
  /content
/assets
  /characters
  /worlds
  /objects
  /rewards
  /audio
  /fonts
/data
  skills.json
  activities.json
  adventures.json
  rewards.json
  localisation.json
```

---

# 2. DEVELOPMENT PHILOSOPHY

Do not begin by building the whole game.

The build order is:

1. Prove touch input feels excellent.
2. Prove Pip and one activity are fun.
3. Prove a child understands the game without instruction.
4. Prove learning data can adapt difficulty.
5. Prove rewards make children want to continue.
6. Build reusable systems.
7. Scale content only after those systems work.

Every milestone must leave the game playable.

---

# 3. MILESTONE 0 — PROJECT FOUNDATION

## Goal

Create a stable tablet-ready JavaScript/Canvas foundation.

## Build

### App shell

- `index.html`
- Main JavaScript entry point
- Single Canvas element
- Responsive tablet scaling
- Safe-area handling
- Landscape and portrait decision support
- Full-screen mode where supported
- Device pixel ratio scaling
- Resize handling
- Pause/resume handling

### Game loop

Implement:

- `requestAnimationFrame`
- Fixed update timing where required
- Render loop
- Scene update loop
- Pause state
- Time delta clamping

### Scene manager

Initial scenes:

- Boot
- Profile Select
- Wonder Island
- Activity
- Parent Gate

### Asset loader

Support:

- PNG/WebP
- Sprite sheets
- JSON
- Audio
- Fonts

Include:

- Loading progress
- Missing asset fallback
- Retry behaviour
- Memory cleanup

### Input manager

Use Pointer Events.

Support:

- Tap
- Press
- Drag
- Drop
- Swipe
- Pointer cancel
- Multi-touch rejection where an activity expects one finger

### Coordinate system

Create one virtual design resolution.

Recommended starting reference:

```text
1920 × 1080 landscape
```

Scale to physical tablet size while preserving logical coordinates.

## Completion gate

- Runs on iPad-sized and Android tablet-sized screens.
- Touch coordinates remain accurate after resize/orientation handling.
- No accidental page scrolling or browser gesture interference in game area.
- Can change between scenes without page reload.

---

# 4. MILESTONE 1 — TOUCH AND DRAG PROTOTYPE

## Goal

Make dragging feel good enough for a two-year-old.

This milestone comes before learning systems.

## Build

### Draggable object component

Features:

- Large invisible touch target
- Finger offset handling
- Object lifts slightly when grabbed
- Scale or bounce feedback
- Smooth movement
- Drop detection
- Snap-to-target
- Return-to-origin animation
- Success animation
- Incorrect placement response

### Target zones

Support:

- Visible targets
- Invisible generous hit areas
- Multiple valid targets
- Capacity limits
- Object category requirements

### Child-friendly tolerance

Add:

- Minimum 25–40% target overlap rather than pixel-perfect placement
- Magnetic attraction near correct target
- Forgiving release thresholds
- Large pickup zones

### Prototype scene

Build a simple activity:

> Drag three apples into Bunny's basket.

## Completion gate

A child should be able to:

- Pick up an apple easily.
- Move it without losing it.
- Drop it near the basket and still succeed.
- Understand success from animation and sound.

Do not continue if touch feels fiddly.

---

# 5. MILESTONE 2 — FIRST CHARACTER: PIP

## Goal

Make Pip feel like a character rather than a tutorial icon.

## Build

### Pip controller

States:

- Idle
- Look
- Point
- Happy
- Laugh
- Celebrate
- Confused
- Encourage
- Sleepy
- Bounce
- Fall
- Wave

### Pip reaction queue

Allow activities to request reactions:

```js
pip.react("celebrate");
pip.lookAt(target);
pip.say("three_apples");
```

### Idle behaviour

Random low-frequency actions:

- Blink
- Look around
- Tail wiggle
- Tiny hop
- Inspect nearby object

### Voice event support

Character animation should sync approximately with spoken line duration.

## Completion gate

Pip must make the prototype noticeably more engaging than the same activity without Pip.

---

# 6. MILESTONE 3 — AUDIO FOUNDATION

## Goal

Make sound and music a core system early, not an end-stage polish pass.

## Build

### Audio manager

Channels:

- Music
- Voice
- Character SFX
- UI SFX
- Ambient
- Activity feedback

### Features

- Master volume
- Parent-configurable levels
- Audio unlock after first interaction
- Fade in/out
- Crossfade
- Prevent overlapping voice instructions
- Duck music under voice
- Stop/restart safely after app suspension

### Core sounds

Implement:

- Grab
- Drop
- Correct
- Gentle incorrect
- Count tick
- Reward
- Pip laugh
- Completion flourish

## Completion gate

Activity can be played without reading any text.

---

# 7. MILESTONE 4 — ACTIVITY ENGINE V1

## Goal

Stop creating bespoke scenes and begin using reusable activity definitions.

## Build

Create base `Activity` interface/class.

Example lifecycle:

```text
load()
start()
update()
render()
handlePointer()
checkProgress()
complete()
cleanup()
```

### First reusable activity types

1. DragToTarget
2. CountAndPlace
3. MatchPairs
4. SortObjects
5. TapRequestedObject

### JSON configuration

Example:

```json
{
  "id": "feed_bunny_3",
  "type": "CountAndPlace",
  "skill": "count_1_3",
  "character": "bunny",
  "object": "apple",
  "targetCount": 3,
  "instruction": "three_apples_for_bunny",
  "successReaction": "bunny_happy"
}
```

## Completion gate

Create at least 10 different playable activities without changing engine code.

---

# 8. MILESTONE 5 — LEARNING PROFILE V1

## Goal

Begin tracking what the child can actually do.

## Build

### Skill data

Each skill stores:

- Attempts
- Independent successes
- Hint-assisted successes
- Incorrect attempts
- Recent accuracy
- Last practised timestamp
- Current mastery state

### Initial mastery states

- NOT_INTRODUCED
- INTRODUCED
- PRACTISING
- RELIABLE
- MASTERED
- REVIEW

### First tracked skills

- Count 1
- Count 2
- Count 3
- Count 4
- Count 5
- Red
- Blue
- Yellow
- Circle
- Square
- Triangle
- Big/small
- Same/different

### Attempt event

Every meaningful response generates structured data.

Do not store unnecessary personal information.

## Completion gate

After a short session, the game can correctly report which skills were attempted and whether assistance was needed.

---

# 9. MILESTONE 6 — HINT SYSTEM

## Goal

Make activities self-correcting without adult intervention.

## Build

Central hint controller.

### Hint ladder

0. Wait.
1. Repeat instruction.
2. Relevant object wiggles.
3. Correct target glows.
4. Pip points.
5. Demonstrate first step.

### Rules

- Timer varies by developmental level.
- Any child input resets or pauses escalation.
- Hints are logged into learning data.
- No red X.
- No harsh buzzer.

## Completion gate

A child who initially does nothing can eventually understand what to do without a parent touching the screen.

---

# 10. MILESTONE 7 — RORY'S DINO PICNIC PROTOTYPE

## Goal

Build the first complete five-minute Little Legends experience.

## Sequence

### Scene 1
Pip finds Rory.

### Scene 2
Find three dinosaurs.

### Scene 3
Feed dinosaurs five pieces of fruit.

### Scene 4
Sort fruit by colour.

### Scene 5
Choose the biggest picnic blanket.

### Scene 6
Finish a simple AB pattern.

### Scene 7
Receive a dinosaur egg.

### Scene 8
Return to Wonder Island.

### Scene 9
Egg hatches into baby dinosaur.

### Scene 10
Place dinosaur home.

## Required systems

- Pip
- Rory
- Drag
- Tap
- Counting
- Colour sort
- Size
- Pattern
- Music
- Reward
- Save
- Learning tracking

## GATE 1 — FUN

Do not expand content until children voluntarily want to replay this slice.

Test ages 2, 3, 4 and 5 separately.

---

# 11. MILESTONE 8 — SAVE SYSTEM + CHILD PROFILES

## Goal

Persistent individual progress.

## Build

### IndexedDB save

Store:

- Profiles
- Learning skill state
- Unlocks
- Wonder Island placement
- Pip outfit
- Current adventure state
- Settings

### Multiple child profiles

Support at least four profiles.

### Profile creation

Parent enters:

- First name
- Approximate age
- Language

Child chooses:

- Avatar
- Favourite colour
- Pip starter hat

### Save resilience

- Autosave after important actions
- Save versioning
- Data migration support
- Recovery from interrupted write

## Completion gate

Closing and reopening the app restores exact child progress and island state.

---

# 12. MILESTONE 9 — WONDER ISLAND V1

## Goal

Create the persistent home that gives learning rewards meaning.

## Build

### Island scene

Include:

- Pip's home
- Beach
- Grass
- Pond
- Decoration zones
- Creature zones

### Placement mode

Child can:

- Drag reward onto island
- Snap into valid areas
- Move unlocked objects
- Return objects to storage

### Interactive objects

Initial:

- Tree
- Pond
- Bunny home
- Dinosaur home
- Slide
- Ball
- Drum

### Creature interactions

Examples:

- Bunny eats
- Dinosaur drinks
- Pip uses slide
- Animal chases ball

## Completion gate

Children spend time voluntarily interacting with their island after the structured mission ends.

---

# 13. MILESTONE 10 — REWARD AND COLLECTION SYSTEM

## Goal

Make progression meaningful without manipulative economies.

## Build

### Reward types

- Creature
- Decoration
- Pip cosmetic
- Vehicle
- Interactive toy
- Building

### Discovery Stars

Implement only as a lightweight unlock resource.

No grind loops.

### Reward reveal

Sequence:

1. Anticipation
2. Reveal
3. Name/voice
4. Short reaction
5. Immediate use

## Completion gate

Every major reward has at least one meaningful interaction.

---

# 14. MILESTONE 11 — EGG AND HATCHING SYSTEM

## Goal

Create a major recurring reward loop.

## Build

### Egg states

- Received
- Ready
- Interaction 1
- Interaction 2
- Crack
- Hatch
- Creature unlocked

### Example interactions

- Tap spots
- Count cracks
- Match colour
- Keep warm
- Play rhythm

### Important rule

No real-time waiting.

No premium acceleration.

## Completion gate

Egg reveal is one of the strongest moments in testing.

---

# 15. MILESTONE 12 — ADAPTIVE DIFFICULTY V1

## Goal

Automatically choose appropriate challenge.

## Build

### Difficulty selection

For each skill, use:

- Recent success rate
- Hint usage
- Time to completion
- Number of independent corrections
- Consecutive successes
- Time since practice

### Example counting progression

```text
1–3 objects
↓
1–5 objects
↓
numeral matching
↓
1–10 objects
↓
distractors
↓
mixed skill
```

### Downshift behaviour

When child struggles:

- Fewer options
- Smaller quantity
- More obvious targets
- Earlier hint
- Simpler instruction

No visible difficulty label.

## GATE 2 — LEARNING FIT

Children should receive activities that are challenging without repeatedly frustrating them.

---

# 16. MILESTONE 13 — ACTIVITY ENGINE V2

## Goal

Expand the reusable gameplay grammar.

## Add activity families

6. ShapeMatch
7. SizeCompare
8. PatternComplete
9. SequenceOrder
10. BuildObject
11. MemoryMatch
12. Categorise
13. WashSwipe
14. PaintSwipe
15. TracePath
16. SoundMatch
17. RhythmRepeat
18. StoryChoice

## Completion gate

At least 80% of planned V1 learning content can be produced through reusable activity families.

---

# 17. MILESTONE 14 — ACTIVITY SCHEDULER

## Goal

Choose activities intelligently.

## Scheduler priorities

1. Skills needing reinforcement.
2. New skills ready to introduce.
3. Spaced review.
4. Variety of interaction.
5. Adventure context.
6. Avoid recent duplication.
7. Avoid overstimulation.

### Anti-repetition rules

Do not repeat:

- Same activity template more than twice in short succession.
- Same character constantly.
- Same reward theme too frequently.
- Same learning skill with identical presentation.

## Completion gate

A 20-minute session feels varied even when practising the same underlying skill.

---

# 18. MILESTONE 15 — RAINBOW VILLAGE

## Goal

Prove the framework works outside Dino Valley.

## Skills

- Red
- Blue
- Yellow
- Green
- Orange
- Purple
- Circle
- Square
- Triangle
- Rectangle
- Big/small
- Patterns

## Adventures

Initial examples:

- The Missing Rainbow
- Octo's Paint Party
- Shape House Rescue
- Balloon Sort
- Build the Parade Float

## Reward set

- Rainbow decorations
- Octo cosmetics
- Colour creatures
- Paintable island objects

## GATE 3 — SYSTEM REUSE

Rainbow Village should mostly use existing engine systems rather than custom code.

---

# 19. MILESTONE 16 — DINO VALLEY FULL PASS

## Goal

Turn prototype area into first complete content world.

## Skills

- Counting 1–10
- Number recognition 1–10
- More/less
- Same amount
- Size
- Basic addition preparation
- Sequences

## Content

Target:

- 8–10 Little Missions
- 8+ dinosaur rewards
- 4–5 activity variants per core skill
- World music
- Character reactions
- Reusable background scenes

---

# 20. MILESTONE 17 — ANIMAL FOREST

## Goal

Add general knowledge and classification.

## Skills

- Animal names
- Sounds
- Habitats
- Baby/parent
- Land/water/air
- Food
- Body features
- Classification

## Adventures

Examples:

- Who Lives Here?
- Baby Animal Rescue
- Forest Breakfast
- Feather, Fur or Scales
- Pond Parade

---

# 21. MILESTONE 18 — MUSIC SYSTEM / JUNGLE JAM LITE

## Goal

Create a genuine free-play music feature.

## Build

### Music stage

Drag characters into slots.

Each adds:

- Percussion
- Bass
- Melody
- Sound effect
- Voice

### Learning modes

- Repeat beat
- Fast/slow
- Loud/quiet
- Sound recognition

### Free jam

No objective.

## Completion gate

Children voluntarily play with music after completing the learning task.

---

# 22. MILESTONE 19 — STORYBOOK LITERACY FOUNDATION

## Goal

Begin literacy progression.

## Build

Initial skills:

- Vocabulary
- Letter exposure
- A–Z recognition architecture
- Upper/lowercase matching
- First sounds
- Name-letter support

### Luna

Add Luna character and story presentation framework.

### Important

Do not attempt full reading instruction in first content pass.

Prioritise:

- Listening
- Vocabulary
- Letter familiarity
- Phonics foundations

---

# 23. MILESTONE 20 — LIFE SKILLS / BELLA ACTIVITIES

## Build

- Hand washing
- Teeth brushing
- Weather clothes
- Toy sorting
- Feelings
- Helping
- Simple routines

Keep all activities playful and non-judgemental.

---

# 24. MILESTONE 21 — PARENT AREA

## Goal

Give adults useful information without turning children into scores.

## Build

Parent gate.

Dashboard:

- Recently practised
- Reliable skills
- Skills being introduced
- Areas needing reinforcement
- Suggested real-world activity

Settings:

- Music
- Voice
- Quiet mode
- Reduced motion
- Session reminder
- Child profiles
- Language
- Data reset/export where appropriate

---

# 25. MILESTONE 22 — ACCESSIBILITY PASS

## Build

- Reduced motion
- Quiet mode
- Voice/subtitle pairing
- Visual alternatives for sound tasks
- Shape/symbol support for colour tasks
- Larger optional UI scale
- High touch tolerance
- Avoid critical red/green-only distinctions
- No essential speech requirement

---

# 26. MILESTONE 23 — OFFLINE PWA PASS

## Goal

Make the game reliable without internet.

## Build

### Service Worker

Cache:

- Core code
- Core artwork
- Audio
- Current content packs

### Manifest

Support installable app behaviour.

### Offline indicators

Do not show technical errors to child.

Parent area can indicate:

> Offline — your game still works.

### Update strategy

Never corrupt active session when new version becomes available.

---

# 27. MILESTONE 24 — PERFORMANCE PASS

## Targets

Aim for:

- 60 FPS on common modern tablets
- Graceful 30 FPS fallback on weaker hardware
- Fast scene transitions
- Controlled memory usage
- Small initial download
- Lazy-loaded worlds

## Optimisation work

- Sprite atlases
- WebP
- Audio compression
- Object pooling
- Limit canvas state changes
- Avoid excessive allocations inside render loop
- Pre-render static scenery where useful
- Particle count caps

---

# 28. MILESTONE 25 — CONTENT SCALE PASS

Only after systems are stable.

## V1 targets

### Worlds

- Wonder Island
- Dino Valley
- Rainbow Village
- Animal Forest
- Storybook starter content

### Activity families

25–30.

### Learning skills

50–70.

### Little Missions

30–40.

### Interactive creatures

30+.

### Pip cosmetics

40+.

### Decorations

60+.

### Vehicles

8–10.

---

# 29. MILESTONE 26 — CHILD TESTING ROUND

Test independently with:

- Age 2
- Age 3
- Age 4
- Age 5

Observe without coaching.

Record:

- First tap
- Mis-taps
- Lost drags
- Confusing instructions
- Activity completion
- Hint frequency
- Repeat requests
- Boredom points
- Favourite characters
- Favourite rewards
- Parent intervention frequency

## GATE 4 — CHILD INDEPENDENCE

Most core activities must be understandable without adult instruction.

---

# 30. MILESTONE 27 — PARENT TRUST / PRIVACY PASS

Confirm:

- No child-mode ads.
- No child-mode external links.
- No chat.
- No public profile.
- No unnecessary personal information.
- Parent-gated purchases only.
- Clear local save behaviour.
- Clear privacy information.
- No behavioural advertising.
- Microphone/camera not required.

---

# 31. MILESTONE 28 — LAUNCH POLISH

Polish:

- Character animation
- Loading transitions
- Music transitions
- Voice timing
- Particle effects
- Reward reveals
- Touch feedback
- Device orientation edge cases
- App resume behaviour
- Parent gate
- Save recovery
- Error handling

No new major systems during this milestone.

---

# 32. MILESTONE 29 — RELEASE CANDIDATE

Release candidate must pass:

### Technical

- iPad testing
- Android tablet testing
- Offline testing
- Reinstall/update testing
- Save migration
- Low-storage behaviour
- App suspension/resume

### Child experience

- First session
- Returning session
- Multiple profiles
- Hint recovery
- Reward use
- Free play

### Parent experience

- Profile creation
- Settings
- Progress view
- Purchase gate
- Privacy information

---

# 33. RELEASE GATES

## Gate A — Touch

Two-year-olds can reliably tap and drag.

## Gate B — Fun

Children voluntarily replay Rory's Dino Picnic.

## Gate C — Comprehension

Children understand activities without constant parent assistance.

## Gate D — Adaptive Learning

Difficulty can move up and down appropriately.

## Gate E — Reward Value

Children care about returning to Wonder Island.

## Gate F — Content Reuse

New content can be added primarily through data and existing activity templates.

## Gate G — Parent Trust

Parents understand the learning value and feel comfortable handing over the tablet.

## Gate H — Release

Stable, offline-capable, privacy-safe, performant and polished.

---

# 34. BUILD ORDER SUMMARY

```text
M0  Foundation
M1  Touch + Drag
M2  Pip
M3  Audio
M4  Activity Engine V1
M5  Learning Profile
M6  Hint System
M7  Dino Picnic Prototype
---- GATE: FUN ----
M8  Saves + Profiles
M9  Wonder Island
M10 Rewards
M11 Egg/Hatching
M12 Adaptive Difficulty
---- GATE: LEARNING FIT ----
M13 Activity Engine V2
M14 Scheduler
M15 Rainbow Village
---- GATE: SYSTEM REUSE ----
M16 Dino Valley Full
M17 Animal Forest
M18 Jungle Jam Lite
M19 Literacy Foundation
M20 Life Skills
M21 Parent Area
M22 Accessibility
M23 Offline PWA
M24 Performance
M25 Content Scale
M26 Child Testing
M27 Parent Trust/Privacy
M28 Launch Polish
M29 Release Candidate
```

---

# 35. WHAT NOT TO BUILD EARLY

Do not spend early production time on:

- 80 creatures
- 100 costumes
- Huge world map
- Dragons
- Every letter A–Z
- Full parent analytics
- Seasonal events
- Purchases
- Expansion packs
- Large story library

First prove:

**touch → fun → learning → reward → replay.**

Everything else scales after that.

---

# 36. FIRST IMPLEMENTATION TARGET

The first meaningful playable build should be:

## `Little Legends Prototype 0.1`

Contains:

- Canvas app
- Pip
- Rory
- Bunny
- Apples
- Basic drag-and-drop
- Counting 1–3
- Voice instruction
- Correct/incorrect feedback
- One reward
- Local save

Then expand it into:

## `Prototype 0.2 — Rory's Dino Picnic`

That becomes the first real child-testing build.
