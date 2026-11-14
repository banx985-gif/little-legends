// Job 19 step 6: bedtime stories. Short, calm stories read aloud page by page, each page made from pictures already in
// the game (no new art, nothing drawn on them). Words are read by the tablet's own voice, or by a recorded line when one
// exists (AudioManager.speak looks for it first). Every story ends with "Goodnight".
// A page: { text, art: [[pictureId, x, y, w, h], …] } in 1920×1080 units; pictures stand on their bottom edge at y.
export const STORIES = [
  {
    id: 'moon_and_pip', title: 'Pip Says Goodnight', cover: 'objects.literacy.moon_sleepy_pedestal',
    pages: [
      { text: 'The sun went down over Wonder Island, and the sky turned soft and blue.', art: [['worlds.island_decor.lights.lamp_moon', 1340, 860, 300, 420], ['characters.pip.pip_front', 760, 900, 360, 460]] },
      { text: 'Pip looked up. The moon was rising, round and sleepy.', art: [['characters.pip.pip_look_up', 700, 900, 360, 460], ['objects.space.moon', 1300, 420, 300, 300]] },
      { text: 'One little star came out. Then two. Then three.', art: [['objects.space.star', 640, 380, 150, 150], ['objects.space.star', 960, 300, 170, 170], ['objects.space.star', 1280, 380, 150, 150]] },
      { text: 'Pip said goodnight to the bunny, all cosy in the grass.', art: [['characters.pip.pip_wave', 650, 900, 340, 440], ['creatures.bunny.bunny_tpose', 1250, 880, 300, 320]] },
      { text: 'Pip said goodnight to Rory, curled up in a leafy bed.', art: [['worlds.dino_valley.dino_bed_leaf', 1200, 900, 460, 240], ['creatures.rory.rory_idle', 1200, 800, 280, 280], ['characters.pip.pip_front', 620, 900, 320, 420]] },
      { text: 'Then Pip opened a book, and yawned a great big yawn.', art: [['objects.literacy.storybook_open', 1150, 860, 420, 320], ['characters.pip.pip_front', 650, 900, 340, 440]] },
      { text: 'Goodnight, moon. Goodnight, stars. Goodnight, little one.', art: [['objects.literacy.moon_sleepy_pedestal', 960, 880, 460, 520]], goodnight: true }
    ]
  },
  {
    id: 'octo_sea', title: 'Octo’s Quiet Sea', cover: 'creatures.sea_dino.octopus',
    pages: [
      { text: 'Deep in the sea, Octo was getting ready for bed.', art: [['creatures.sea_dino.octopus', 960, 820, 420, 420]] },
      { text: 'The little fish swam slowly home, swish, swish.', art: [['creatures.sea_dino.fish', 760, 700, 280, 200], ['creatures.sea_dino.fish', 1180, 780, 220, 160]] },
      { text: 'The seahorse held on to the soft sea grass.', art: [['creatures.sea_dino.seahorse', 960, 840, 260, 380]] },
      { text: 'The turtle tucked in its head and closed its eyes.', art: [['creatures.wild.turtle', 960, 840, 420, 320]] },
      { text: 'Octo gave everyone a gentle wave with all eight arms.', art: [['creatures.sea_dino.octopus', 960, 820, 420, 420], ['creatures.sea_dino.crab', 1420, 900, 220, 160]] },
      { text: 'Goodnight, sea. Goodnight, Octo. Goodnight, little one.', art: [['objects.space.moon', 960, 600, 360, 360]], goodnight: true }
    ]
  },
  {
    id: 'forest_owl', title: 'The Forest Falls Asleep', cover: 'creatures.forest.owl',
    pages: [
      { text: 'In Animal Forest, the trees whispered in the evening breeze.', art: [['worlds.island_decor.trees.tree_star', 960, 900, 460, 560]] },
      { text: 'Owl opened her big eyes. "Time for everyone to sleep," she said.', art: [['creatures.forest.owl', 960, 860, 320, 380]] },
      { text: 'Squirrel climbed into the cosy tree stump.', art: [['worlds.animal_forest.tree_stump_home', 1100, 900, 360, 380], ['creatures.forest.squirrel', 700, 900, 220, 260]] },
      { text: 'Hedgehog rolled into a little ball in the hollow log.', art: [['worlds.animal_forest.log_hollow', 960, 900, 460, 250], ['creatures.forest.hedgehog', 960, 820, 200, 160]] },
      { text: 'Bear gave a slow, sleepy yawn and went into the den.', art: [['worlds.animal_forest.den_cave', 1150, 900, 460, 350], ['creatures.forest.bear', 650, 900, 300, 320]] },
      { text: 'Goodnight, forest. Goodnight, Owl. Goodnight, little one.', art: [['worlds.decor.moon_crystal_sleepy', 960, 880, 380, 460]], goodnight: true }
    ]
  }
];

export const storyArtIds = story => [...new Set([story.cover, ...story.pages.flatMap(p => p.art.map(a => a[0]))])];
