import {
  EYES,
  HATS,
  RARITIES,
  RARITY_FLOOR,
  RARITY_WEIGHTS,
  SPECIES,
  STAT_NAMES,
} from '../data/types.js'

export function mulberry32(seed) {
  let state = seed >>> 0
  return function next() {
    state |= 0
    state = (state + 0x6d2b79f5) | 0
    let value = Math.imul(state ^ (state >>> 15), 1 | state)
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

export function hashString(input) {
  let hash = 2166136261
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export function pick(rng, values) {
  return values[Math.floor(rng() * values.length)]
}

export function rollRarity(rng) {
  const total = Object.values(RARITY_WEIGHTS).reduce((sum, weight) => sum + weight, 0)
  let roll = rng() * total
  for (const rarity of RARITIES) {
    roll -= RARITY_WEIGHTS[rarity]
    if (roll < 0) {
      return rarity
    }
  }
  return 'common'
}

export function rollStats(rng, rarity) {
  const floor = RARITY_FLOOR[rarity]
  const peak = pick(rng, STAT_NAMES)
  let dump = pick(rng, STAT_NAMES)

  while (dump === peak) {
    dump = pick(rng, STAT_NAMES)
  }

  const stats = {}
  for (const name of STAT_NAMES) {
    if (name === peak) {
      stats[name] = Math.min(100, floor + 50 + Math.floor(rng() * 30))
      continue
    }

    if (name === dump) {
      stats[name] = Math.max(1, floor - 10 + Math.floor(rng() * 15))
      continue
    }

    stats[name] = floor + Math.floor(rng() * 40)
  }

  return stats
}

export function rollBones(seed, forcedSpecies) {
  const rng = mulberry32(hashString(seed))
  const rarity = rollRarity(rng)

  return {
    rarity,
    species: forcedSpecies ?? pick(rng, SPECIES),
    eye: pick(rng, EYES),
    hat: rarity === 'common' ? 'none' : pick(rng, HATS),
    shiny: rng() < 0.01,
    stats: rollStats(rng, rarity),
    inspirationSeed: Math.floor(rng() * 1e9),
  }
}
