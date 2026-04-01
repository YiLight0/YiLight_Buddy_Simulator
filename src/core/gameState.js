import { getSpeciesCatalog, getSpeciesProfile } from '../data/species.js'
import { RARITY_STARS, SPECIES, STAT_NAMES } from '../data/types.js'
import { hashString, mulberry32, pick, rollBones } from './random.js'

export const ACTIONS = [
  { key: 'pet', label: '抚摸', hours: 1, summary: '快速提升亲密度和心情。' },
  { key: 'feed', label: '喂食', hours: 1, summary: '恢复饱腹和生命状态。' },
  { key: 'play', label: '玩耍', hours: 2, summary: '高强度提升快乐，但会消耗体力。' },
  { key: 'clean', label: '清洁', hours: 1, summary: '整理卫生，避免健康下降。' },
  { key: 'rest', label: '休息', hours: 4, summary: '大幅恢复体力，并缓慢回血。' },
  { key: 'train', label: '训练', hours: 3, summary: '提升经验和主属性。' },
  { key: 'explore', label: '探险', hours: 3, summary: '触发随机事件，获得星屑和额外成长。' },
  { key: 'talk', label: '对话', hours: 1, summary: '听宠物说话，增强默契。' },
]

const ACTION_MAP = Object.fromEntries(ACTIONS.map(action => [action.key, action]))

const EXPLORE_EVENTS = [
  { text: '你们在角落里翻到一包闪闪发光的饼干。', coins: 6, joy: 4, bond: 2 },
  { text: '路上遇见一阵好天气，大家都精神了不少。', coins: 3, energy: 6, joy: 6 },
  { text: '你们带回一张古老地图，感觉明天会更顺。', coins: 5, xp: 8, wisdom: 1 },
  { text: '探险途中结识了新的朋友，社交经验暴涨。', coins: 4, bond: 5, xp: 6 },
  { text: '你们找到一处安静的休息点，状态被慢慢拉回来了。', health: 8, energy: 8, joy: 4 },
]

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(value)))
}

function unique(values) {
  return [...new Set(values)]
}

function average(values) {
  if (values.length === 0) {
    return 0
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function makeSeed(parts) {
  return parts.join(':')
}

function pickDistinctPair(rng, values) {
  const first = pick(rng, values)
  let second = pick(rng, values)
  while (second === first) {
    second = pick(rng, values)
  }
  return [first, second]
}

function getLevelThreshold(level) {
  return 18 + level * 14
}

export function formatTime(state) {
  const label = `${String(state.hour).padStart(2, '0')}:00`
  return `第${state.day}天  ${label}`
}

export function getActionCatalog() {
  return ACTIONS
}

export function normalizePet(pet) {
  const profile = getSpeciesProfile(pet.species)
  return {
    id: pet.id,
    species: pet.species,
    rarity: pet.rarity,
    eye: pet.eye,
    hat: pet.hat,
    shiny: Boolean(pet.shiny),
    stats: Object.fromEntries(
      STAT_NAMES.map(name => [name, clamp(pet.stats?.[name] ?? 25)]),
    ),
    name: pet.name,
    title: pet.title ?? profile.title,
    personality: pet.personality ?? profile.traitPool[0],
    biography: pet.biography ?? profile.intro,
    favoriteAction: pet.favoriteAction ?? profile.favoriteAction,
    level: pet.level ?? 1,
    xp: pet.xp ?? 0,
    ageHours: pet.ageHours ?? 0,
    fullness: clamp(pet.fullness ?? 72),
    energy: clamp(pet.energy ?? 72),
    hygiene: clamp(pet.hygiene ?? 72),
    joy: clamp(pet.joy ?? 72),
    health: clamp(pet.health ?? 80),
    bond: clamp(pet.bond ?? 20),
    lastAction: pet.lastAction ?? 'adopt',
    adoptedOnDay: pet.adoptedOnDay ?? 1,
  }
}

export function hydrateState(state) {
  const pets = Array.isArray(state.pets) ? state.pets.map(normalizePet) : []
  const activePetId = pets.some(pet => pet.id === state.activePetId)
    ? state.activePetId
    : pets[0]?.id ?? null

  return {
    ...state,
    pets,
    activePetId,
    collectedSpecies: unique([
      ...(Array.isArray(state.collectedSpecies) ? state.collectedSpecies : []),
      ...pets.map(pet => pet.species),
    ]),
    eventLog:
      Array.isArray(state.eventLog) && state.eventLog.length > 0
        ? state.eventLog.slice(-8)
        : ['Buddy 收容所已经准备好了。'],
  }
}

export function getActivePet(state) {
  return state.pets.find(pet => pet.id === state.activePetId) ?? null
}

export function getOwnedSpecies(state) {
  return unique(state.pets.map(pet => pet.species))
}

export function getAvailableSpecies(state) {
  const owned = new Set(getOwnedSpecies(state))
  return SPECIES.filter(species => !owned.has(species))
}

export function getCatalogRows(state) {
  const owned = new Set(getOwnedSpecies(state))
  return getSpeciesCatalog().map(entry => ({
    ...entry,
    owned: owned.has(entry.species),
  }))
}

export function dominantStat(pet) {
  return STAT_NAMES.reduce((best, current) =>
    pet.stats[current] > pet.stats[best] ? current : best,
  )
}

export function deriveMood(pet) {
  if (pet.health <= 30) {
    return '虚弱'
  }
  if (pet.fullness <= 25) {
    return '饥饿'
  }
  if (pet.energy <= 25) {
    return '困倦'
  }
  if (pet.hygiene <= 25) {
    return '脏兮兮'
  }
  if (pet.joy <= 30) {
    return '无聊'
  }
  if (pet.bond >= 85 && pet.joy >= 75) {
    return '贴贴模式'
  }
  if (average([pet.fullness, pet.energy, pet.hygiene, pet.joy, pet.health]) >= 78) {
    return '状态极佳'
  }
  return '平稳'
}

export function getNeedSummary(pet) {
  const needs = [
    { key: 'fullness', label: '该吃饭了', value: pet.fullness },
    { key: 'energy', label: '需要休息', value: pet.energy },
    { key: 'hygiene', label: '该洗澡了', value: pet.hygiene },
    { key: 'joy', label: '有点无聊', value: pet.joy },
    { key: 'health', label: '需要照顾', value: pet.health },
  ].sort((left, right) => left.value - right.value)

  return needs[0].value >= 60 ? '状态很稳，可以继续培养。' : needs[0].label
}

function appendLog(state, lines) {
  return {
    ...state,
    eventLog: [...state.eventLog, ...lines].slice(-8),
  }
}

function replacePet(state, pet) {
  return {
    ...state,
    pets: state.pets.map(current => (current.id === pet.id ? pet : current)),
  }
}

function decayPet(pet, hours, active) {
  const next = normalizePet({
    ...pet,
    ageHours: pet.ageHours + hours,
    fullness: pet.fullness - hours * 3,
    energy: pet.energy - hours * 2,
    hygiene: pet.hygiene - hours * 2,
    joy: pet.joy - hours * (active ? 1 : 1.6),
    bond: pet.bond - hours * (active ? 0 : 0.4),
  })

  const lowNeeds = [next.fullness, next.energy, next.hygiene, next.joy].filter(value => value <= 30).length
  const healthyNeeds = [next.fullness, next.energy, next.hygiene, next.joy].filter(value => value >= 60).length

  if (lowNeeds >= 2) {
    next.health = clamp(next.health - hours * (4 + lowNeeds))
  } else if (healthyNeeds >= 3) {
    next.health = clamp(next.health + hours * 1.2)
  }

  return next
}

function advanceTime(state, hours) {
  const nextPets = state.pets.map(pet => decayPet(pet, hours, pet.id === state.activePetId))
  let nextHour = state.hour + hours
  let nextDay = state.day
  const messages = []

  while (nextHour >= 24) {
    nextHour -= 24
    nextDay += 1
    messages.push(`第${nextDay}天开始了，收容所重新热闹起来。`)
  }

  return {
    state: {
      ...state,
      pets: nextPets,
      day: nextDay,
      hour: nextHour,
      frameTick: state.frameTick + 1,
      collectedSpecies: unique([
        ...state.collectedSpecies,
        ...nextPets.map(pet => pet.species),
      ]),
    },
    messages,
  }
}

function pickProfileLine(seed, lines) {
  const rng = mulberry32(hashString(seed))
  return pick(rng, lines)
}

function applyDelta(pet, delta) {
  const next = normalizePet({
    ...pet,
    fullness: pet.fullness + (delta.fullness ?? 0),
    energy: pet.energy + (delta.energy ?? 0),
    hygiene: pet.hygiene + (delta.hygiene ?? 0),
    joy: pet.joy + (delta.joy ?? 0),
    health: pet.health + (delta.health ?? 0),
    bond: pet.bond + (delta.bond ?? 0),
    xp: pet.xp + (delta.xp ?? 0),
    lastAction: delta.lastAction ?? pet.lastAction,
  })

  return next
}

function levelUpPet(pet, reportLines) {
  let leveled = false
  while (pet.xp >= getLevelThreshold(pet.level)) {
    pet.xp -= getLevelThreshold(pet.level)
    pet.level += 1
    pet.health = clamp(pet.health + 8)
    pet.bond = clamp(pet.bond + 4)
    leveled = true
    reportLines.push(`${pet.name} 升到了 Lv.${pet.level}。`) 
  }

  if (leveled) {
    const peak = dominantStat(pet)
    pet.stats[peak] = clamp(pet.stats[peak] + 2)
    reportLines.push(`${peak} 也跟着变强了一点。`)
  }

  return pet
}

function createSoul(seed, species, state) {
  const profile = getSpeciesProfile(species)
  const rng = mulberry32(hashString(`${seed}:soul`))
  const [firstTrait, secondTrait] = pickDistinctPair(rng, profile.traitPool)
  const baseName = pick(rng, profile.namePool)
  const duplicateCount = state.pets.filter(pet => pet.name.startsWith(baseName)).length
  return {
    name: duplicateCount === 0 ? baseName : `${baseName}${duplicateCount + 1}`,
    personality: `${firstTrait} / ${secondTrait}`,
  }
}

export function adoptPet(state, species) {
  if (!SPECIES.includes(species)) {
    return {
      state,
      reportLines: ['未知物种。'],
    }
  }

  if (state.pets.some(pet => pet.species === species)) {
    return {
      state,
      reportLines: ['这个物种已经在你的收容所里了，可以直接切换它。'],
    }
  }

  const seed = makeSeed([species, state.day, state.hour, state.pets.length, state.frameTick, Date.now()])
  const profile = getSpeciesProfile(species)
  const bones = rollBones(seed, species)
  const soul = createSoul(seed, species, state)
  const rng = mulberry32(hashString(`${seed}:stats`))

  const pet = normalizePet({
    ...bones,
    ...soul,
    id: `${species}-${hashString(seed).toString(36)}`,
    title: profile.title,
    biography: profile.intro,
    favoriteAction: profile.favoriteAction,
    level: 1,
    xp: 0,
    ageHours: 0,
    fullness: 72 + Math.floor(rng() * 15),
    energy: 70 + Math.floor(rng() * 15),
    hygiene: 70 + Math.floor(rng() * 15),
    joy: 72 + Math.floor(rng() * 15),
    health: 78 + Math.floor(rng() * 15),
    bond: 18 + Math.floor(rng() * 12),
    lastAction: 'adopt',
    adoptedOnDay: state.day,
  })

  const nextState = appendLog(
    {
      ...state,
      pets: [...state.pets, pet],
      activePetId: pet.id,
      collectedSpecies: unique([...state.collectedSpecies, species]),
      coins: state.coins + 4,
    },
    [
      `${pet.name} 已作为 ${profile.label} 加入收容所。`,
      profile.adoptLine,
    ],
  )

  return {
    state: nextState,
    reportLines: [
      `${pet.name} (${profile.label}) 已加入。`,
      profile.adoptLine,
      `稀有度 ${RARITY_STARS[pet.rarity]}  主属性 ${dominantStat(pet)}`,
      `你获得了 4 点星屑作为欢迎奖励。`,
    ],
  }
}

export function switchActivePet(state, petId) {
  const pet = state.pets.find(current => current.id === petId)
  if (!pet) {
    return {
      state,
      reportLines: ['没有找到对应的宠物。'],
    }
  }

  return {
    state: appendLog({ ...state, activePetId: pet.id }, [`已将当前陪伴切换为 ${pet.name}。`]),
    reportLines: [`现在陪在你身边的是 ${pet.name}。`, `${pet.name} 看起来很高兴。`],
  }
}

function applyFavoriteBonus(pet, actionKey, reportLines) {
  if (pet.favoriteAction !== actionKey) {
    return pet
  }

  pet.joy = clamp(pet.joy + 5)
  pet.bond = clamp(pet.bond + 3)
  pet.xp += 4
  reportLines.push(`${pet.name} 特别喜欢这个动作，状态明显更好了。`)
  return pet
}

function applySpeciesStatBonus(pet, actionKey, reportLines) {
  const topStat = dominantStat(pet)
  if (actionKey === 'train') {
    pet.stats[topStat] = clamp(pet.stats[topStat] + 1)
    reportLines.push(`${topStat} 获得了额外磨炼。`)
  }

  if (actionKey === 'talk' && (topStat === 'WISDOM' || topStat === 'PATIENCE')) {
    pet.bond = clamp(pet.bond + 3)
    reportLines.push(`${pet.name} 很擅长交流，这次谈话特别有效。`)
  }

  if (actionKey === 'play' && topStat === 'CHAOS') {
    pet.joy = clamp(pet.joy + 4)
    reportLines.push(`${pet.name} 越玩越兴奋，快乐值又跳了一截。`)
  }

  return pet
}

export function applyAction(state, actionKey) {
  const action = ACTION_MAP[actionKey]
  const activePet = getActivePet(state)

  if (!action) {
    return {
      state,
      reportLines: ['未知动作。'],
    }
  }

  if (!activePet) {
    return {
      state,
      reportLines: ['先领养一只宠物，电子宠物系统才会启动。'],
    }
  }

  const advance = advanceTime(state, action.hours)
  let nextState = advance.state
  let pet = getActivePet(nextState)
  const profile = getSpeciesProfile(pet.species)
  const reportLines = [...advance.messages]
  const seed = makeSeed([actionKey, nextState.day, nextState.hour, pet.id, nextState.frameTick])
  const rng = mulberry32(hashString(seed))

  switch (actionKey) {
    case 'pet':
      pet = applyDelta(pet, {
        joy: 10,
        bond: 8,
        health: 2,
        xp: 4,
        lastAction: actionKey,
      })
      reportLines.push(`${pet.name} 舒服地贴了过来。`)
      break
    case 'feed':
      pet = applyDelta(pet, {
        fullness: 28,
        joy: 4,
        health: 5,
        bond: 3,
        xp: 3,
        lastAction: actionKey,
      })
      reportLines.push(`${pet.name} 吃得很满足，还认真舔了舔嘴。`)
      break
    case 'play':
      pet = applyDelta(pet, {
        joy: 18,
        bond: 5,
        energy: -8,
        fullness: -6,
        hygiene: -6,
        xp: 8,
        lastAction: actionKey,
      })
      reportLines.push(`${pet.name} 玩得非常投入，四周都热闹起来了。`)
      break
    case 'clean':
      pet = applyDelta(pet, {
        hygiene: 32,
        health: 6,
        joy: 3,
        bond: 4,
        xp: 4,
        lastAction: actionKey,
      })
      reportLines.push(`${pet.name} 被整理得干干净净，整只都轻松了。`)
      break
    case 'rest':
      pet = applyDelta(pet, {
        energy: 40,
        health: 7,
        joy: 4,
        fullness: -2,
        xp: 5,
        lastAction: actionKey,
      })
      reportLines.push(`${pet.name} 好好睡了一觉，呼吸都平稳了。`)
      break
    case 'train': {
      const peak = dominantStat(pet)
      pet = applyDelta(pet, {
        energy: -10,
        fullness: -8,
        joy: -2,
        bond: 2,
        xp: 14,
        lastAction: actionKey,
      })
      pet.stats[peak] = clamp(pet.stats[peak] + 2)
      reportLines.push(`${pet.name} 认真完成了训练，${peak} 明显变强。`)
      break
    }
    case 'explore': {
      const event = pick(rng, EXPLORE_EVENTS)
      pet = applyDelta(pet, {
        joy: 8 + (event.joy ?? 0),
        energy: -12 + (event.energy ?? 0),
        fullness: -10,
        hygiene: -8,
        health: event.health ?? 0,
        bond: 4 + (event.bond ?? 0),
        xp: 10 + (event.xp ?? 0),
        lastAction: actionKey,
      })
      if (typeof event.wisdom === 'number') {
        pet.stats.WISDOM = clamp(pet.stats.WISDOM + event.wisdom)
      }
      nextState.coins += event.coins ?? 0
      reportLines.push(event.text)
      reportLines.push(`你获得了 ${event.coins ?? 0} 点星屑。`)
      break
    }
    case 'talk':
      pet = applyDelta(pet, {
        joy: 8,
        bond: 7,
        xp: 5,
        lastAction: actionKey,
      })
      reportLines.push(pickProfileLine(seed, profile.talkLines))
      break
    default:
      break
  }

  pet = applyFavoriteBonus(pet, actionKey, reportLines)
  pet = applySpeciesStatBonus(pet, actionKey, reportLines)

  if (pet.shiny && rng() < 0.35) {
    nextState.coins += 2
    reportLines.push(`${pet.name} 身上的闪光掉下两点星屑。`)
  }

  pet = levelUpPet(pet, reportLines)
  nextState = replacePet(nextState, pet)
  nextState = appendLog(nextState, reportLines)

  if (pet.health <= 20) {
    reportLines.push(`${pet.name} 现在比较虚弱，最好优先喂食、休息或清洁。`)
  } else if (deriveMood(pet) === '贴贴模式') {
    reportLines.push(`${pet.name} 已进入贴贴模式，今天非常信任你。`)
  }

  return {
    state: nextState,
    reportLines,
  }
}

