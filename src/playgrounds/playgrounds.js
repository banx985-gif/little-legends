// Job 19: a playground in five worlds, built the Job 15 way (drag, hold for + and −, things react, saved per child).
// Each playground: a backdrop, where things may stand, and its things. Positions are 1920×1080 units; x, y is a thing's
// base (the middle of its bottom edge); w × h is the box its picture is fitted into at size 1.
// Kinds and what they do (src/scenes/PlaygroundScene.js):
//   friend   tap: bounce + its sound. Dropped on food: eats. On a nest or bed: naps.
//   animal   as a friend; dropped on (or next to) its home it goes inside, then pops out again.
//   food, nest, home, prop, egg   things to play with (an egg wobbles when tapped).
//   vehicle  dropped on a road it drives along it (round and round); tap: horn.
//   rocket   tap (or drop on the landing pad): it launches and lands again.
//   planet   spins slowly; tap: spins fast. floater: bobs gently anywhere in the sky.
//   swimmer  swims to and fro in the water; tap: bubbles.
export const PLAYGROUNDS = {
  dino: {
    title: 'Dino Playground', theme: 'dino', music: 'dino', hill: '#88c764', ground: { top: 600, bottom: 1060 },
    things: [
      { id: 'rory', art: 'creatures.rory.rory_idle', kind: 'friend', x: 300, y: 820, w: 220, h: 220, sound: 'dinoBaby' },
      { id: 'stego', art: 'creatures.dinos.stegosaurus', kind: 'friend', x: 640, y: 700, w: 280, h: 230, sound: 'dinoRoar' },
      { id: 'anky', art: 'creatures.dinos.ankylosaurus', kind: 'friend', x: 1000, y: 930, w: 270, h: 210, sound: 'dinoRoar' },
      { id: 'para', art: 'creatures.dinos.parasaurolophus', kind: 'friend', x: 1350, y: 700, w: 240, h: 260, sound: 'dinoRoarBig' },
      { id: 'orange', art: 'creatures.dino_orange.dino_orange_stand', kind: 'friend', x: 1640, y: 900, w: 210, h: 230, sound: 'dinoBaby' },
      { id: 'trike', art: 'creatures.sea_dino.triceratops', kind: 'friend', x: 1660, y: 650, w: 250, h: 200, sound: 'dinoRoar' },
      { id: 'brachio', art: 'creatures.sea_dino.brachiosaurus', kind: 'friend', x: 160, y: 640, w: 260, h: 330, sound: 'dinoRoarBig' },
      { id: 'bowl', art: 'objects.dino.food_bowl_dino', kind: 'food', x: 820, y: 860, w: 170, h: 120 },
      { id: 'bone', art: 'objects.dino.bone', kind: 'food', x: 1200, y: 1010, w: 150, h: 90 },
      { id: 'nest', art: 'objects.dino.nest_leaf', kind: 'nest', x: 480, y: 980, w: 230, h: 140 },
      { id: 'bed', art: 'worlds.dino_valley.dino_bed_leaf', kind: 'nest', x: 1500, y: 1020, w: 260, h: 150 },
      { id: 'egg', art: 'objects.dino_egg', kind: 'egg', x: 1150, y: 760, w: 120, h: 150 },
      { id: 'log', art: 'worlds.dino_valley.log_mossy', kind: 'prop', x: 960, y: 620, w: 240, h: 130 },
      { id: 'rocks', art: 'worlds.dino_valley.lava_rocks', kind: 'prop', x: 1800, y: 1050, w: 200, h: 130 }
    ]
  },
  rainbow: {
    title: 'Octo’s Sea', theme: 'sea', music: 'rainbow', ground: { top: 930, bottom: 1065 }, water: { top: 300, bottom: 900 },
    things: [
      { id: 'octo', art: 'creatures.sea_dino.octopus', kind: 'swimmer', x: 560, y: 560, w: 230, h: 230, sound: 'splash' },
      { id: 'fish', art: 'creatures.sea_dino.fish', kind: 'swimmer', x: 1100, y: 420, w: 170, h: 130, sound: 'pop' },
      { id: 'seahorse', art: 'creatures.sea_dino.seahorse', kind: 'swimmer', x: 1500, y: 700, w: 130, h: 190, sound: 'pop' },
      { id: 'turtle', art: 'creatures.wild.turtle', kind: 'swimmer', x: 300, y: 820, w: 210, h: 160, sound: 'splash' },
      { id: 'duck', art: 'creatures.farm.duck', kind: 'swimmer', x: 900, y: 360, w: 150, h: 150, sound: 'pop', surface: true },
      { id: 'crab', art: 'creatures.sea_dino.crab', kind: 'friend', x: 1250, y: 1040, w: 170, h: 120, sound: 'pop' },
      { id: 'ball', art: 'worlds.beach.beach_ball', kind: 'prop', x: 760, y: 1040, w: 110, h: 110 },
      { id: 'umbrella', art: 'worlds.beach.beach_umbrella', kind: 'prop', x: 1680, y: 1060, w: 230, h: 250 },
      { id: 'lilies', art: 'worlds.pond.lily_pads', kind: 'floater', x: 1650, y: 380, w: 220, h: 110, surface: true },
      { id: 'reeds', art: 'worlds.pond.reeds_bubbles', kind: 'prop', x: 160, y: 1060, w: 190, h: 230 }
    ]
  },
  space: {
    title: 'Space Playground', theme: 'space_moon_base', music: 'space', ground: { top: 640, bottom: 1065 }, sky: { top: 120, bottom: 560 },
    things: [
      { id: 'rocket', art: 'objects.space.rocket', kind: 'rocket', x: 420, y: 960, w: 200, h: 320 },
      { id: 'pad', art: 'worlds.space_base.landing_pad', kind: 'pad', x: 1180, y: 1050, w: 300, h: 130 },
      { id: 'lander', art: 'objects.space_base.lander_pod', kind: 'rocket', x: 1600, y: 980, w: 220, h: 220 },
      { id: 'rover', art: 'objects.space_base.rover', kind: 'vehicle', x: 860, y: 900, w: 230, h: 160, sound: 'horn' },
      { id: 'globe', art: 'objects.space.planet_globe', kind: 'planet', x: 380, y: 360, w: 170, h: 170 },
      { id: 'ringed', art: 'objects.space.planet_ringed', kind: 'planet', x: 1460, y: 330, w: 230, h: 170 },
      { id: 'moon', art: 'objects.space.moon', kind: 'planet', x: 980, y: 260, w: 150, h: 150 },
      { id: 'satellite', art: 'objects.space.satellite', kind: 'floater', x: 1750, y: 520, w: 190, h: 150 },
      { id: 'star', art: 'objects.space.star', kind: 'floater', x: 700, y: 520, w: 110, h: 110 },
      { id: 'telescope', art: 'objects.space.telescope', kind: 'prop', x: 160, y: 1040, w: 170, h: 200 },
      { id: 'crate', art: 'worlds.space_base.supply_crate', kind: 'prop', x: 1850, y: 1060, w: 150, h: 130 }
    ],
    roads: [{ y: 900, top: 820, bottom: 960, dir: 1, hidden: true }]
  },
  animal: {
    title: 'Forest Playground', theme: 'forest', music: 'animal', hill: '#6ac070', ground: { top: 620, bottom: 1060 },
    things: [
      { id: 'den', art: 'worlds.animal_forest.den_cave', kind: 'home', x: 260, y: 760, w: 330, h: 250 },
      { id: 'stump', art: 'worlds.animal_forest.tree_stump_home', kind: 'home', x: 1640, y: 760, w: 260, h: 280 },
      { id: 'log', art: 'worlds.animal_forest.log_hollow', kind: 'home', x: 980, y: 700, w: 300, h: 160 },
      { id: 'burrow', art: 'worlds.animal_forest.burrow', kind: 'home', x: 620, y: 1030, w: 230, h: 140 },
      { id: 'birdnest', art: 'worlds.animal_forest.nest_bird_eggs', kind: 'home', x: 1320, y: 1040, w: 200, h: 120 },
      { id: 'bear', art: 'creatures.forest.bear', kind: 'animal', home: 'den', x: 520, y: 840, w: 230, h: 240, sound: 'creature' },
      { id: 'squirrel', art: 'creatures.forest.squirrel', kind: 'animal', home: 'stump', x: 1380, y: 830, w: 150, h: 170, sound: 'chirp' },
      { id: 'hedgehog', art: 'creatures.forest.hedgehog', kind: 'animal', home: 'log', x: 1180, y: 900, w: 160, h: 130, sound: 'chatter' },
      { id: 'fox', art: 'creatures.farm.fox', kind: 'animal', home: 'burrow', x: 860, y: 970, w: 200, h: 190, sound: 'chatter' },
      { id: 'owl', art: 'creatures.forest.owl', kind: 'animal', home: 'birdnest', x: 1580, y: 1000, w: 150, h: 180, sound: 'chirp' },
      { id: 'deer', art: 'creatures.forest.deer', kind: 'animal', x: 260, y: 1040, w: 220, h: 250, sound: 'creature' },
      { id: 'raccoon', art: 'creatures.wild.raccoon', kind: 'animal', home: 'log', x: 1820, y: 1040, w: 170, h: 170, sound: 'chatter' },
      { id: 'acorns', art: 'objects.tracks.acorns', kind: 'food', x: 1080, y: 1050, w: 120, h: 90 }
    ]
  },
  town: {
    title: 'Busy Town Roads', theme: 'town', music: 'town', ground: { top: 640, bottom: 1065 },
    roads: [{ y: 790, top: 720, bottom: 850, dir: 1 }, { y: 1000, top: 930, bottom: 1060, dir: -1 }],
    things: [
      { id: 'fire', art: 'objects.vehicles.fire_truck', kind: 'vehicle', x: 300, y: 820, w: 300, h: 180, sound: 'horn' },
      { id: 'bus', art: 'objects.vehicles.school_bus', kind: 'vehicle', x: 1300, y: 820, w: 320, h: 180, sound: 'horn' },
      { id: 'police', art: 'objects.vehicles.police_car', kind: 'vehicle', x: 800, y: 1030, w: 260, h: 150, sound: 'horn' },
      { id: 'taxi', art: 'objects.vehicles.taxi', kind: 'vehicle', x: 1600, y: 1030, w: 240, h: 150, sound: 'horn' },
      { id: 'ambulance', art: 'objects.vehicles.ambulance', kind: 'vehicle', x: 220, y: 690, w: 250, h: 160, sound: 'horn' },
      { id: 'icecream', art: 'objects.vehicles.special.van_ice_cream', kind: 'vehicle', x: 560, y: 690, w: 240, h: 160, sound: 'bell' },
      { id: 'tractor', art: 'objects.vehicles.tractor', kind: 'vehicle', x: 960, y: 690, w: 220, h: 170, sound: 'horn' },
      { id: 'digger', art: 'objects.vehicles.digger', kind: 'vehicle', x: 1360, y: 690, w: 250, h: 180, sound: 'horn' },
      { id: 'mail', art: 'objects.vehicles.mail_van', kind: 'vehicle', x: 1720, y: 690, w: 230, h: 160, sound: 'horn' },
      { id: 'lights', art: 'objects.town.traffic_light', kind: 'prop', x: 1100, y: 920, w: 90, h: 200 },
      { id: 'stop', art: 'objects.town.sign_stop', kind: 'prop', x: 80, y: 920, w: 100, h: 170 },
      { id: 'cone', art: 'objects.town.cone', kind: 'prop', x: 1850, y: 920, w: 80, h: 90 }
    ]
  }
};
export const playgroundFor = world => PLAYGROUNDS[world] ?? null;
export const playgroundArtIds = world => [...new Set((PLAYGROUNDS[world]?.things ?? []).map(t => t.art))];
