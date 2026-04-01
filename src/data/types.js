export const RARITIES = [
  'common',
  'uncommon',
  'rare',
  'epic',
  'legendary',
]

export const RARITY_WEIGHTS = {
  common: 60,
  uncommon: 25,
  rare: 10,
  epic: 4,
  legendary: 1,
}

export const RARITY_FLOOR = {
  common: 5,
  uncommon: 15,
  rare: 25,
  epic: 35,
  legendary: 50,
}

export const RARITY_STARS = {
  common: '*',
  uncommon: '**',
  rare: '***',
  epic: '****',
  legendary: '*****',
}

export const SPECIES = [
  'duck',
  'goose',
  'blob',
  'cat',
  'dragon',
  'octopus',
  'owl',
  'penguin',
  'turtle',
  'snail',
  'ghost',
  'axolotl',
  'capybara',
  'cactus',
  'robot',
  'rabbit',
  'mushroom',
  'chonk',
]

export const EYES = ['o', 'O', 'x', '-', '@', '*']

export const HATS = [
  'none',
  'crown',
  'tophat',
  'propeller',
  'halo',
  'wizard',
  'beanie',
  'tinyduck',
]

export const STAT_NAMES = [
  'DEBUGGING',
  'PATIENCE',
  'CHAOS',
  'WISDOM',
  'SNARK',
]

export const INITIAL_SAVE = {
  version: 1,
  coins: 24,
  day: 1,
  hour: 8,
  frameTick: 0,
  activePetId: null,
  pets: [],
  collectedSpecies: [],
  eventLog: [
    'Buddy 收容所已启动。',
    '先领养第一只宠物，电子宠物系统就会开始运转。',
  ],
}

