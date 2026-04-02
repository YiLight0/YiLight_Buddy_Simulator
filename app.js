import { SPECIES_PROFILES } from './src/data/species.js';
import { renderFace, renderSprite, spriteFrameCount } from './src/data/sprites.js';
import {
  EYES,
  HATS,
  RARITIES,
  RARITY_FLOOR,
  RARITY_STARS,
  RARITY_WEIGHTS,
  SPECIES,
  STAT_NAMES,
} from './src/data/types.js';
import {
  HAT_LABELS,
  RARITY_LABELS,
  SPECIES_EN,
  STAT_LABELS,
  UI_TEXT,
} from './i18n.js';

const STORAGE_KEY = 'claude-code-buddy-simulator-v4';
const MAX_WAREHOUSE = 10;
const TICK_MS = 500;
const BUBBLE_MS = 10000;
const PET_BURST_MS = 2500;
const STAGE_LIMITS = { minX: 0.02, maxX: 0.98, minY: 0.04, maxY: 0.94, gapX: 0.15, gapY: 0.18 };
const IDLE_SEQUENCE = [0, 0, 0, 0, 1, 0, 0, 0, -1, 0, 0, 2, 0, 0, 0];
const PET_HEARTS = [
  '   <3    <3   ',
  '  <3  <3   <3 ',
  ' <3   <3  <3  ',
  '<3  <3      <3',
  ' o    o    o  ',
];
const RARITY_COLORS = {
  common: '#8891a1',
  uncommon: '#6dd58c',
  rare: '#7695ff',
  epic: '#d388ff',
  legendary: '#f1c96a',
};

const ENGLISH_NAME_POOLS = {
  duck: ['Quack', 'Paddle', 'Ripple', 'Moss'],
  goose: ['Honk', 'Marshal', 'Gale', 'Ivory'],
  blob: ['Bloop', 'Jelly', 'Squish', 'Gumdrop'],
  cat: ['Whisker', 'Mochi', 'Nightpaw', 'Ash'],
  dragon: ['Ember', 'Furnace', 'Cinder', 'Flare'],
  octopus: ['Ink', 'Octave', 'Coral', 'Tangle'],
  owl: ['Noctis', 'Sage', 'Branch', 'Beacon'],
  penguin: ['Frost', 'Skid', 'Pilot', 'Drift'],
  turtle: ['Stone', 'Shelly', 'Anchor', 'Morrow'],
  snail: ['Dew', 'Stamp', 'Pebble', 'Shellby'],
  ghost: ['Mist', 'Wisp', 'Echo', 'Pale'],
  axolotl: ['Axi', 'Bubbles', 'Gill', 'Blush'],
  capybara: ['Cappy', 'Steam', 'Puff', 'Mellow'],
  cactus: ['Spike', 'Sol', 'Dusty', 'Keep'],
  robot: ['Gear', 'R0', 'Patch', 'Tick'],
  rabbit: ['Hop', 'Clover', 'Dash', 'Velvet'],
  mushroom: ['Spore', 'Dome', 'Morrow', 'Puffin'],
  chonk: ['Biscuit', 'Pudge', 'Cloud', 'Bongo'],
};

const refs = {
  appTitle: document.getElementById('appTitle'),
  appSubtitle: document.getElementById('appSubtitle'),
  statusLeft: document.getElementById('statusLeft'),
  statusCenter: document.getElementById('statusCenter'),
  statusRight: document.getElementById('statusRight'),
  terminalStatus: document.querySelector('.terminal-status'),
  noticeText: document.getElementById('noticeText'),
  noticeCommand: document.getElementById('noticeCommand'),
  terminalFrame: document.querySelector('.terminal-frame'),
  terminalNotice: document.querySelector('.terminal-notice'),
  transcript: document.getElementById('transcript'),
  transcriptWrap: document.querySelector('.transcript-wrap'),
  warehousePanel: document.getElementById('warehousePanel'),
  warehouseTitle: document.getElementById('warehouseTitle'),
  warehouseSubtitle: document.getElementById('warehouseSubtitle'),
  closeWarehouseBtn: document.getElementById('closeWarehouseBtn'),
  warehouseSlots: document.getElementById('warehouseSlots'),
  warehouseDetail: document.getElementById('warehouseDetail'),
  stagePanel: document.getElementById('stagePanel'),
  bottomArea: document.querySelector('.bottom-area'),
  composerShell: document.getElementById('composerShell'),
  promptInput: document.getElementById('promptInput'),
  sendButton: document.getElementById('sendButton'),
  companionStage: document.getElementById('companionStage'),
  speechBubble: document.getElementById('speechBubble'),
  spriteArt: document.getElementById('spriteArt'),
  companionMeta: document.getElementById('companionMeta'),
  companionPill: document.getElementById('companionPill'),
  warehousePill: document.getElementById('warehousePill'),
  stagePill: document.getElementById('stagePill'),
  footerHint: document.getElementById('footerHint'),
  langToggle: document.getElementById('langToggle'),
};

let uiTick = 0;
let bubble = null;
let bubbleTimeout = null;
let dragState = null;
let stageDragState = null;
let state = loadState();
normalizeState();

function defaultState() {
  return {
    version: 4,
    language: 'en',
    pets: [],
    activePetId: null,
    selectedPetId: null,
    warehouseOpen: false,
    warehouseMobileDetailOpen: false,
    stageOpen: false,
    companionPosition: null,
    stagePositions: {},
    promptValue: '/buddy',
    logs: [
      { id: 1, type: 'boot', at: Date.now() },
    ],
    nextLogId: 2,
    nextPetId: 1,
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return defaultState();
    }
    return { ...defaultState(), ...JSON.parse(raw) };
  } catch {
    return defaultState();
  }
}

function normalizeState() {
  if (!Array.isArray(state.pets)) {
    state.pets = [];
  }
  state.pets = state.pets.slice(0, MAX_WAREHOUSE);

  if (!Array.isArray(state.logs) || state.logs.length === 0) {
    state.logs = defaultState().logs;
  }

  if (state.language !== 'zh' && state.language !== 'en') {
    state.language = 'en';
  }

  if (typeof state.promptValue !== 'string' || !state.promptValue.trim()) {
    state.promptValue = '/buddy';
  }

  if (!findPet(state.activePetId)) {
    state.activePetId = state.pets[0]?.id ?? null;
  }

  if (!findPet(state.selectedPetId)) {
    state.selectedPetId = state.activePetId ?? state.pets[0]?.id ?? null;
  }

  if (!state.pets.length) {
    state.activePetId = null;
    state.selectedPetId = null;
    state.warehouseOpen = false;
    state.warehouseMobileDetailOpen = false;
    state.stageOpen = false;
  }

  if (!state.companionPosition || typeof state.companionPosition.x !== 'number' || typeof state.companionPosition.y !== 'number') {
    state.companionPosition = null;
  }

  state.warehouseMobileDetailOpen = Boolean(state.warehouseMobileDetailOpen);
  state.stageOpen = Boolean(state.stageOpen);
  if (!state.stagePositions || typeof state.stagePositions !== 'object') {
    state.stagePositions = {};
  }
  const petIds = new Set(state.pets.map(pet => String(pet.id)));
  state.stagePositions = Object.fromEntries(
    Object.entries(state.stagePositions).filter(([id, position]) => (
      petIds.has(String(id)) && position && typeof position.x === 'number' && typeof position.y === 'number'
    )),
  );
  if (typeof state.nextLogId !== 'number') {
    state.nextLogId = state.logs.reduce((max, log) => Math.max(max, Number(log.id) || 0), 0) + 1;
  }

  if (typeof state.nextPetId !== 'number') {
    state.nextPetId = state.pets.reduce((max, pet) => Math.max(max, Number(pet.id) || 0), 0) + 1;
  }
}

function saveState() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      ...state,
      warehouseOpen: Boolean(state.warehouseOpen && state.pets.length),
      warehouseMobileDetailOpen: Boolean(state.warehouseMobileDetailOpen && state.pets.length),
      promptValue: state.promptValue || '/buddy',
    }),
  );
}

function clonePet(pet) {
  return JSON.parse(JSON.stringify(pet));
}

function appendLog(type, payload = {}) {
  state.logs.push({
    id: state.nextLogId++,
    type,
    at: Date.now(),
    ...payload,
  });

  if (state.logs.length > 80) {
    state.logs = state.logs.slice(-80);
  }

  saveState();
}

function findPet(id) {
  return state.pets.find(pet => pet.id === id) ?? null;
}

function getActivePet() {
  return findPet(state.activePetId);
}

function getSelectedPet() {
  return findPet(state.selectedPetId) ?? getActivePet() ?? state.pets[0] ?? null;
}

function isCompactWarehouseLayout() {
  return window.matchMedia('(max-width: 900px)').matches;
}

function updateWarehousePanelBounds() {
  if (!refs.terminalFrame || !refs.terminalStatus || !refs.composerShell) {
    return;
  }

  if (!isCompactWarehouseLayout()) {
    refs.warehousePanel.style.removeProperty('--warehouse-mobile-top');
    refs.warehousePanel.style.removeProperty('--warehouse-mobile-bottom');
    return;
  }

  const frameRect = refs.terminalFrame.getBoundingClientRect();
  const statusRect = refs.terminalStatus.getBoundingClientRect();
  const composerRect = refs.composerShell.getBoundingClientRect();
  const top = Math.max(0, Math.round(statusRect.bottom - frameRect.top));
  const bottom = Math.max(0, Math.round(frameRect.bottom - composerRect.top));

  refs.warehousePanel.style.setProperty('--warehouse-mobile-top', `${top}px`);
  refs.warehousePanel.style.setProperty('--warehouse-mobile-bottom', `${bottom}px`);
}

function getText(lang = state.language) {
  return UI_TEXT[lang];
}

function getProfile(species, lang = state.language) {
  const zh = SPECIES_PROFILES[species];
  if (lang === 'zh') {
    return zh;
  }
  return { ...zh, ...SPECIES_EN[species] };
}

function getNicknameZh(pet) {
  const pool = SPECIES_PROFILES[pet.species]?.namePool ?? [pet.species];
  return pool[pet.nameIndex % pool.length] ?? pool[0];
}

function getNicknameEn(pet) {
  const pool = ENGLISH_NAME_POOLS[pet.species] ?? [SPECIES_EN[pet.species]?.label ?? pet.species];
  return pool[pet.nameIndex % pool.length] ?? pool[0];
}

function getNickname(pet, lang = state.language) {
  return lang === 'zh' ? getNicknameZh(pet) : getNicknameEn(pet);
}

function getTrait(pet, lang = state.language) {
  const profile = getProfile(pet.species, lang);
  return profile.traitPool[pet.traitIndex % profile.traitPool.length] ?? '';
}

function getTalkLine(pet, lang = state.language) {
  const profile = getProfile(pet.species, lang);
  return profile.talkLines[pet.talkIndex % profile.talkLines.length] ?? profile.intro;
}

function getSpeciesLabel(pet, lang = state.language) {
  return getProfile(pet.species, lang).label;
}

function getMainStat(pet) {
  return STAT_NAMES.reduce((best, current) => {
    if (!best) {
      return current;
    }
    return pet.stats[current] > pet.stats[best] ? current : best;
  }, '');
}

function formatTime(timestamp) {
  return new Intl.DateTimeFormat(state.language === 'zh' ? 'zh-CN' : 'en-US', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(timestamp);
}

function getDefaultCompanionPosition() {
  return {
    x: Math.max(24, window.innerWidth - 360),
    y: Math.max(72, window.innerHeight - 430),
  };
}

function clampCompanionPosition(position) {
  const rect = refs.companionStage.getBoundingClientRect();
  const width = rect.width || 320;
  const height = rect.height || 260;
  const maxX = Math.max(12, window.innerWidth - width - 12);
  const maxY = Math.max(12, window.innerHeight - height - 12);
  return {
    x: Math.min(Math.max(12, position.x), maxX),
    y: Math.min(Math.max(12, position.y), maxY),
  };
}

function ensureCompanionPosition() {
  if (!state.companionPosition) {
    state.companionPosition = getDefaultCompanionPosition();
  }
  state.companionPosition = clampCompanionPosition(state.companionPosition);
  return state.companionPosition;
}

function applyCompanionPosition() {
  const position = ensureCompanionPosition();
  refs.companionStage.style.left = `${position.x}px`;
  refs.companionStage.style.top = `${position.y}px`;
  refs.companionStage.style.right = 'auto';
  refs.companionStage.style.bottom = 'auto';
}

function clampStageValue(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function createStagePosition(occupied, index = 0) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const candidate = {
      x: STAGE_LIMITS.minX + Math.random() * (STAGE_LIMITS.maxX - STAGE_LIMITS.minX),
      y: STAGE_LIMITS.minY + Math.random() * (STAGE_LIMITS.maxY - STAGE_LIMITS.minY),
    };
    const collides = occupied.some(position => (
      Math.abs(position.x - candidate.x) < STAGE_LIMITS.gapX &&
      Math.abs(position.y - candidate.y) < STAGE_LIMITS.gapY
    ));
    if (!collides) {
      return candidate;
    }
  }

  const columns = 3;
  const row = Math.floor(index / columns);
  const column = index % columns;
  return {
    x: clampStageValue(0.08 + column * 0.3, STAGE_LIMITS.minX, STAGE_LIMITS.maxX),
    y: clampStageValue(0.1 + row * 0.26, STAGE_LIMITS.minY, STAGE_LIMITS.maxY),
  };
}

function ensureStagePositions() {
  const next = {};
  const occupied = [];

  state.pets.forEach((pet, index) => {
    const current = state.stagePositions[String(pet.id)] ?? state.stagePositions[pet.id];
    let position = current && typeof current.x === 'number' && typeof current.y === 'number'
      ? {
          x: clampStageValue(current.x, STAGE_LIMITS.minX, STAGE_LIMITS.maxX),
          y: clampStageValue(current.y, STAGE_LIMITS.minY, STAGE_LIMITS.maxY),
        }
      : null;

    const overlaps = position && occupied.some(other => (
      Math.abs(other.x - position.x) < STAGE_LIMITS.gapX &&
      Math.abs(other.y - position.y) < STAGE_LIMITS.gapY
    ));

    if (!position || overlaps) {
      position = createStagePosition(occupied, index);
    }

    next[String(pet.id)] = position;
    occupied.push(position);
  });

  state.stagePositions = next;
  return next;
}

function clearPromptForStage() {
  state.promptValue = '/buddy';
  refs.promptInput.value = '/buddy';
  refs.composerShell.classList.add('command-ready');
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function pickRandom(rng, items) {
  return items[Math.floor(rng() * items.length)];
}

function rollRarity(rng) {
  const total = Object.values(RARITY_WEIGHTS).reduce((sum, value) => sum + value, 0);
  let roll = rng() * total;
  for (const rarity of RARITIES) {
    roll -= RARITY_WEIGHTS[rarity];
    if (roll < 0) {
      return rarity;
    }
  }
  return 'common';
}
function rollStats(rng, rarity) {
  const floor = RARITY_FLOOR[rarity];
  const peak = pickRandom(rng, STAT_NAMES);
  let dump = pickRandom(rng, STAT_NAMES);

  while (dump === peak) {
    dump = pickRandom(rng, STAT_NAMES);
  }

  const stats = {};
  for (const name of STAT_NAMES) {
    if (name === peak) {
      stats[name] = Math.min(100, floor + 50 + Math.floor(rng() * 30));
    } else if (name === dump) {
      stats[name] = Math.max(1, floor - 10 + Math.floor(rng() * 15));
    } else {
      stats[name] = floor + Math.floor(rng() * 40);
    }
  }
  return stats;
}

function createPet() {
  const seed = `${Date.now()}-${Math.random()}-${state.nextPetId}-${state.pets.length}`;
  const rng = mulberry32(hashString(seed));
  const availableSpecies = SPECIES.filter(
    species => !state.pets.some(pet => pet.species === species),
  );
  const species = pickRandom(rng, availableSpecies.length ? availableSpecies : SPECIES);
  const profile = SPECIES_PROFILES[species];
  const rarity = rollRarity(rng);

  return {
    id: state.nextPetId++,
    species,
    rarity,
    eye: pickRandom(rng, EYES),
    hat: rarity === 'common' ? 'none' : pickRandom(rng, HATS),
    shiny: rng() < 0.01,
    stats: rollStats(rng, rarity),
    nameIndex: Math.floor(rng() * profile.namePool.length),
    traitIndex: Math.floor(rng() * profile.traitPool.length),
    talkIndex: Math.floor(rng() * profile.talkLines.length),
    hatchedAt: Date.now(),
    seed,
  };
}

function showBubble(payload) {
  bubble = {
    ...payload,
    endsAt: Date.now() + BUBBLE_MS,
  };

  if (bubbleTimeout) {
    clearTimeout(bubbleTimeout);
  }

  bubbleTimeout = window.setTimeout(() => {
    bubble = null;
    renderCompanionStage();
  }, BUBBLE_MS + 30);

  renderCompanionStage();
}

function hatchBuddy() {
  if (state.pets.length >= MAX_WAREHOUSE) {
    state.warehouseOpen = true;
    state.warehouseMobileDetailOpen = false;
    appendLog('warehouse-full');
    showBubble({
      zh: getText('zh').warehouseFull,
      en: getText('en').warehouseFull,
      rarity: 'rare',
    });
    renderAll(true);
    return;
  }

  const pet = createPet();
  state.pets.unshift(pet);
  state.activePetId = pet.id;
  state.selectedPetId = pet.id;
  state.warehouseOpen = false;
  appendLog('hatch', { pet: clonePet(pet) });
  showBubble({
    zh: getTalkLine(pet, 'zh'),
    en: getTalkLine(pet, 'en'),
    rarity: pet.rarity,
  });
  saveState();
  renderAll(true);
}

function activatePet(id) {
  const pet = findPet(id);
  if (!pet || state.activePetId === id) {
    return;
  }

  state.activePetId = id;
  state.selectedPetId = id;
  appendLog('activate', { pet: clonePet(pet) });
  showBubble({
    zh: getTalkLine(pet, 'zh'),
    en: getTalkLine(pet, 'en'),
    rarity: pet.rarity,
  });
  saveState();
  renderAll(true);
}

function deletePet(id) {
  const pet = findPet(id);
  if (!pet) {
    return;
  }

  const wasActive = state.activePetId === id;
  const wasSelected = state.selectedPetId === id;

  state.pets = state.pets.filter(candidate => candidate.id !== id);
  delete state.stagePositions[String(id)];
  appendLog('release', { pet: clonePet(pet) });

  if (wasActive) {
    state.activePetId = state.pets[0]?.id ?? null;
  }

  if (wasSelected) {
    state.selectedPetId = state.activePetId ?? state.pets[0]?.id ?? null;
  }

  if (!state.pets.length) {
    state.warehouseOpen = false;
    bubble = null;
  }

  const nextActive = getActivePet();
  if (nextActive) {
    showBubble({
      zh: getTalkLine(nextActive, 'zh'),
      en: getTalkLine(nextActive, 'en'),
      rarity: nextActive.rarity,
    });
  }

  saveState();
  renderAll(true);
}

function handleCommand(rawCommand) {
  const command = (rawCommand || '/buddy').trim() || '/buddy';
  appendLog('command', { command });

  if (command === '/buddy') {
    state.promptValue = '/buddy';
    refs.promptInput.value = '/buddy';
    hatchBuddy();
    return;
  }

  appendLog('unsupported', { command });
  showBubble({
    zh: getText('zh').unsupported,
    en: getText('en').unsupported,
    rarity: 'common',
  });
  state.promptValue = '/buddy';
  refs.promptInput.value = '/buddy';
  saveState();
  renderAll(true);
}

function createRainbowCommand(value) {
  const rainbow = document.createElement('span');
  rainbow.className = 'rainbow-command';
  [...value].forEach(character => {
    const span = document.createElement('span');
    span.textContent = character;
    rainbow.append(span);
  });
  return rainbow;
}

function buildAnimatedSprite(pet, lively) {
  const frameCount = spriteFrameCount(pet.species);
  let blink = false;
  let frame = 0;

  if (lively || Date.now() - pet.hatchedAt < PET_BURST_MS) {
    frame = uiTick % frameCount;
  } else {
    const step = IDLE_SEQUENCE[uiTick % IDLE_SEQUENCE.length];
    if (step === -1) {
      frame = 0;
      blink = true;
    } else {
      frame = step % frameCount;
    }
  }

  let lines = renderSprite(pet, frame).slice();
  if (blink) {
    lines = lines.map(line => line.replaceAll(pet.eye, '-'));
  }

  const burstAge = Date.now() - pet.hatchedAt;
  if (burstAge < PET_BURST_MS) {
    const heartIndex = Math.min(
      PET_HEARTS.length - 1,
      Math.floor((burstAge / PET_BURST_MS) * PET_HEARTS.length),
    );
    lines = [PET_HEARTS[heartIndex], ...lines];
  }

  return lines;
}

function buildStaticSprite(pet) {
  return renderSprite(pet, 0).join('\n');
}

function createFactRow(label, value) {
  const row = document.createElement('div');
  row.className = 'fact-row';

  const key = document.createElement('span');
  key.className = 'fact-key';
  key.textContent = label;

  const result = document.createElement('span');
  result.className = 'fact-value';
  result.textContent = value;

  row.append(key, result);
  return row;
}

function createBarRow(label, value) {
  const row = document.createElement('div');
  row.className = 'bar-row';

  const title = document.createElement('div');
  title.className = 'bar-label';
  title.textContent = label.toUpperCase();

  const track = document.createElement('div');
  track.className = 'bar-track';

  const fill = document.createElement('div');
  fill.className = 'bar-fill';
  fill.style.width = `${Math.max(4, Math.min(100, value))}%`;
  track.append(fill);

  const score = document.createElement('div');
  score.className = 'bar-value';
  score.textContent = String(value);

  row.append(title, track, score);
  return row;
}

function createPetCard(pet) {
  const text = getText();
  const card = document.createElement('div');
  card.className = 'pet-card';

  const header = document.createElement('div');
  header.className = 'pet-card-header';

  const title = document.createElement('div');
  title.className = 'pet-card-title';
  title.textContent = `${getSpeciesLabel(pet).toUpperCase()} // ${getRarityLabel(pet.rarity).toLowerCase()} ${RARITY_STARS[pet.rarity]}`;

  const subtitle = document.createElement('div');
  subtitle.className = 'pet-card-subtitle';
  subtitle.textContent = getNickname(pet);

  header.append(title, subtitle);

  const body = document.createElement('div');
  body.className = 'pet-card-body';

  const art = document.createElement('pre');
  art.textContent = buildStaticSprite(pet);
  art.style.color = RARITY_COLORS[pet.rarity];

  const sections = document.createElement('div');
  sections.className = 'pet-card-sections';

  const factBlock = document.createElement('div');
  factBlock.className = 'fact-block';

  const facts = document.createElement('div');
  facts.className = 'pet-card-facts';
  facts.append(
    createFactRow('eye', pet.eye),
    createFactRow('hat', HAT_LABELS[state.language][pet.hat].toLowerCase()),
    createFactRow('shiny', pet.shiny ? 'yes' : 'no'),
  );
  factBlock.append(facts);

  const statBars = document.createElement('div');
  statBars.className = 'stat-bars';
  STAT_NAMES.forEach(statName => {
    statBars.append(createBarRow(STAT_LABELS[state.language][statName], pet.stats[statName]));
  });

  sections.append(factBlock, statBars);
  body.append(art, sections);
  card.append(header, body);
  return card;
}
function getRarityLabel(rarity) {
  return RARITY_LABELS[state.language][rarity];
}

function materializeLog(log) {
  const text = getText();

  switch (log.type) {
    case 'boot':
      return {
        role: 'system',
        lines: [text.bootLine1, text.bootLine2],
      };
    case 'command':
      return {
        role: 'user',
        lines: [log.command],
        command: true,
      };
    case 'hatch': {
      const pet = log.pet;
      const profile = getProfile(pet.species);
      return {
        role: 'assistant',
        lines: [text.hatchLead, profile.adoptLine, text.seatedAside],
        pet,
      };
    }
    case 'activate':
      return {
        role: 'system',
        lines: [
          `${text.activateLead} ${getNickname(log.pet)} · ${getSpeciesLabel(log.pet)}.`,
        ],
      };
    case 'release':
      return {
        role: 'system',
        lines: [
          `${text.releaseLead} ${getNickname(log.pet)} · ${getSpeciesLabel(log.pet)}.`,
        ],
      };
    case 'warehouse-full':
      return {
        role: 'system',
        lines: [text.warehouseFull],
      };
    case 'unsupported':
      return {
        role: 'assistant',
        lines: [text.unsupported],
      };
    default:
      return {
        role: 'system',
        lines: [],
      };
  }
}

function renderTranscript(shouldScroll = false) {
  refs.transcript.replaceChildren();

  if (!state.logs.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-terminal';
    empty.textContent = getText().emptyTranscript;
    refs.transcript.append(empty);
    return;
  }

  const fragment = document.createDocumentFragment();

  state.logs.forEach(log => {
    const view = materializeLog(log);
    const article = document.createElement('article');
    article.className = `message ${view.role}`;

    const head = document.createElement('div');
    head.className = 'message-head';

    const tag = document.createElement('span');
    tag.className = 'role-tag';
    tag.textContent = view.role === 'assistant' ? 'claude' : view.role;

    const time = document.createElement('span');
    time.textContent = formatTime(log.at);

    head.append(tag, time);

    const lines = document.createElement('div');
    lines.className = 'message-lines';

    view.lines.forEach(line => {
      const lineNode = document.createElement('div');
      if (view.command) {
        lineNode.className = 'command-line';
      }
      lineNode.textContent = line;
      lines.append(lineNode);
    });

    article.append(head, lines);

    if (view.pet) {
      article.append(createPetCard(view.pet));
    }

    fragment.append(article);
  });

  refs.transcript.append(fragment);

  if (shouldScroll) {
    refs.transcript.scrollTop = refs.transcript.scrollHeight;
  }
}

function renderWarehouse() {
  const text = getText();
  const compactLayout = isCompactWarehouseLayout();
  const mobileDetailOpen = compactLayout && state.warehouseMobileDetailOpen && Boolean(getSelectedPet());

  refs.warehouseTitle.textContent = text.warehouseTitle;
  refs.warehouseSubtitle.textContent = text.warehouseSubtitle(state.pets.length, MAX_WAREHOUSE);
  refs.closeWarehouseBtn.textContent = text.close;

  const shouldShow = state.warehouseOpen && state.pets.length > 0;
  refs.warehousePanel.classList.toggle('hidden', !shouldShow);
  refs.warehousePanel.classList.toggle('compact-layout', compactLayout);
  refs.warehousePanel.classList.toggle('mobile-detail-open', mobileDetailOpen);
  updateWarehousePanelBounds();

  refs.warehouseSlots.replaceChildren();
  refs.warehouseDetail.replaceChildren();

  for (let index = 0; index < MAX_WAREHOUSE; index += 1) {
    const pet = state.pets[index];
    const row = document.createElement('div');
    row.className = 'slot-row';

    const slotIndex = document.createElement('div');
    slotIndex.className = 'slot-index';
    slotIndex.textContent = `${String(index + 1).padStart(2, '0')}`;

    if (!pet) {
      row.classList.add('empty');
      const empty = document.createElement('div');
      empty.className = 'slot-summary';
      empty.textContent = text.emptySlot;
      row.append(slotIndex, empty);
      refs.warehouseSlots.append(row);
      continue;
    }

    row.dataset.selectId = String(pet.id);
    if (pet.id === state.selectedPetId) {
      row.classList.add('active');
    }

    const summary = document.createElement('div');
    summary.className = 'slot-summary';

    const main = document.createElement('div');
    main.className = 'slot-main';

    const face = document.createElement('span');
    face.textContent = renderFace(pet);
    face.style.color = RARITY_COLORS[pet.rarity];

    const name = document.createElement('strong');
    name.textContent = getNickname(pet);

    const species = document.createElement('span');
    species.textContent = getSpeciesLabel(pet);

    main.append(face, name, species);

    const sub = document.createElement('div');
    sub.className = 'slot-sub';
    sub.textContent = `${getRarityLabel(pet.rarity)} ${RARITY_STARS[pet.rarity]}${state.activePetId === pet.id ? ` · ${text.slotActive}` : ''}`;

    summary.append(main, sub);

    const controls = document.createElement('div');
    controls.className = 'slot-controls';

    const activate = document.createElement('button');
    activate.className = 'slot-action';
    activate.type = 'button';
    activate.dataset.action = 'activate';
    activate.dataset.id = String(pet.id);
    activate.textContent = state.activePetId === pet.id ? text.slotActive : text.slotDeploy;

    const remove = document.createElement('button');
    remove.className = 'slot-delete';
    remove.type = 'button';
    remove.dataset.action = 'delete';
    remove.dataset.id = String(pet.id);
    remove.textContent = text.slotDelete;

    controls.append(activate, remove);
    row.append(slotIndex, summary, controls);
    refs.warehouseSlots.append(row);
  }

  const selected = getSelectedPet();
  const detailColumn = document.createElement('div');
  detailColumn.className = 'warehouse-detail-stack';

  if (!selected) {
    const hint = document.createElement('div');
    hint.className = 'detail-empty';
    hint.textContent = state.pets.length ? text.detailHint : text.emptyWarehouseDetail;
    detailColumn.append(hint);
    refs.warehouseDetail.append(detailColumn);
    return;
  }

  const card = document.createElement('div');
  card.className = 'detail-card';

  const header = document.createElement('div');
  header.className = 'detail-header';

  if (compactLayout) {
    const backButton = document.createElement('button');
    backButton.className = 'detail-back';
    backButton.type = 'button';
    backButton.dataset.action = 'back-to-list';
    backButton.textContent = text.backToList;
    header.append(backButton);
  }

  const titleWrap = document.createElement('div');
  const name = document.createElement('h2');
  name.textContent = `${getNickname(selected)} · ${getSpeciesLabel(selected)}`;

  const intro = document.createElement('p');
  intro.textContent = getProfile(selected.species).intro;

  titleWrap.append(name, intro);

  const rarity = document.createElement('div');
  rarity.className = 'slot-sub';
  rarity.textContent = `${getRarityLabel(selected.rarity)} ${RARITY_STARS[selected.rarity]}`;

  header.append(titleWrap, rarity);

  const sprite = document.createElement('pre');
  sprite.className = 'detail-sprite';
  sprite.textContent = buildStaticSprite(selected);
  sprite.style.color = RARITY_COLORS[selected.rarity];

  const stats = document.createElement('div');
  stats.className = 'detail-stats';
  stats.append(
    createStatChip(text.titleKey, getProfile(selected.species).title),
    createStatChip(text.personality, getTrait(selected)),
    createStatChip(text.hat, HAT_LABELS[state.language][selected.hat]),
    createStatChip(text.mainStat, STAT_LABELS[state.language][getMainStat(selected)]),
    createStatChip(text.rarity, `${getRarityLabel(selected.rarity)} ${RARITY_STARS[selected.rarity]}`),
    createStatChip(text.variant, selected.shiny ? text.shiny : text.plain),
  );

  const statPanel = document.createElement('div');
  statPanel.className = 'detail-stats';
  STAT_NAMES.forEach(statName => {
    statPanel.append(
      createStatChip(
        STAT_LABELS[state.language][statName],
        String(selected.stats[statName]),
      ),
    );
  });

  card.append(header, sprite, stats, statPanel);
  detailColumn.append(card);
  refs.warehouseDetail.append(detailColumn);
}

function buildStageSprite(pet, index) {
  const frame = (uiTick + index) % spriteFrameCount(pet.species);
  let lines = renderSprite(pet, frame).slice();
  if ((uiTick + pet.id) % 9 === 0) {
    lines = lines.map(line => line.replaceAll(pet.eye, '-'));
  }
  return lines;
}

function createStagePanel(selected) {
  const text = getText();
  const shell = document.createElement('section');
  shell.className = 'stage-shell';

  const stage = document.createElement('div');
  stage.className = 'stage-canvas active';

  const positions = ensureStagePositions();
  state.pets.forEach((pet, index) => {
    const actor = document.createElement('button');
    actor.type = 'button';
    actor.className = 'stage-pet';
    actor.dataset.stagePetId = String(pet.id);
    actor.style.left = `${positions[String(pet.id)].x * 100}%`;
    actor.style.top = `${positions[String(pet.id)].y * 100}%`;
    actor.style.setProperty('--pet-accent', RARITY_COLORS[pet.rarity]);
    actor.style.setProperty('--pet-delay', `${(index % 7) * 0.12}s`);
    if (selected && pet.id === selected.id) {
      actor.classList.add('active');
    }

    const sprite = document.createElement('pre');
    sprite.className = 'stage-pet-sprite';
    sprite.textContent = buildStageSprite(pet, index).join('\n');
    sprite.style.color = RARITY_COLORS[pet.rarity];

    const meta = document.createElement('div');
    meta.className = 'stage-pet-meta';

    const line1 = document.createElement('div');
    line1.textContent = getNickname(pet);

    const line2 = document.createElement('div');
    line2.textContent = getSpeciesLabel(pet);

    meta.append(line1, line2);
    actor.append(sprite, meta);
    stage.append(actor);
  });

  shell.append(stage);
  return shell;
}

function renderStagePanel() {
  const shouldShow = state.stageOpen && state.pets.length > 0;
  refs.stagePanel.classList.toggle('hidden', !shouldShow);
  refs.transcriptWrap.classList.toggle('stage-open', shouldShow);
  refs.stagePanel.replaceChildren();
  if (!shouldShow) {
    return;
  }
  refs.stagePanel.append(createStagePanel(getSelectedPet()));
}

function renderWarehouseStageMotion() {
  if (!state.stageOpen || stageDragState) {
    return;
  }

  const stage = refs.stagePanel.querySelector('.stage-canvas.active');
  if (!stage) {
    return;
  }

  [...stage.querySelectorAll('[data-stage-pet-id]')].forEach((node, index) => {
    const pet = findPet(Number(node.dataset.stagePetId));
    if (!pet) {
      return;
    }
    const sprite = node.querySelector('.stage-pet-sprite');
    if (sprite) {
      sprite.textContent = buildStageSprite(pet, index).join('\n');
      sprite.style.color = RARITY_COLORS[pet.rarity];
    }
  });
}

function createStatChip(label, value) {
  const chip = document.createElement('div');
  chip.className = 'stat-chip';

  const title = document.createElement('strong');
  title.textContent = label;

  const body = document.createElement('span');
  body.textContent = value;

  chip.append(title, body);
  return chip;
}
function renderCompanionStage() {
  const pet = getActivePet();
  const text = getText();

  if (!pet || state.stageOpen) {
    refs.companionStage.classList.add('hidden');
    refs.speechBubble.classList.add('hidden');
    refs.spriteArt.textContent = '';
    refs.companionMeta.textContent = text.noCompanion;
    return;
  }

  refs.companionStage.classList.remove('hidden');
  applyCompanionPosition();

  const bubbleVisible = bubble && bubble.endsAt > Date.now();
  if (bubbleVisible) {
    refs.speechBubble.textContent = bubble[state.language];
    refs.speechBubble.classList.remove('hidden');
    refs.speechBubble.style.setProperty('--bubble-border', RARITY_COLORS[bubble.rarity]);
  } else {
    refs.speechBubble.classList.add('hidden');
  }

  refs.spriteArt.textContent = buildAnimatedSprite(pet, bubbleVisible).join('\n');
  refs.spriteArt.style.color = RARITY_COLORS[pet.rarity];

  refs.companionMeta.replaceChildren();

  const line1 = document.createElement('div');
  line1.textContent = `${getNickname(pet)} · ${getSpeciesLabel(pet)}`;

  const line2 = document.createElement('div');
  line2.textContent = `${getRarityLabel(pet.rarity)} ${RARITY_STARS[pet.rarity]} · ${getProfile(pet.species).title}`;

  refs.companionMeta.append(line1, line2);
}

function renderChrome() {
  const text = getText();
  const activePet = getActivePet();

  document.documentElement.lang = state.language === 'zh' ? 'zh-CN' : 'en';
  document.title = text.title;
  refs.appTitle.textContent = text.title;
  refs.appSubtitle.textContent = text.subtitle || '';
  refs.statusLeft.replaceChildren();
  const statusLeftLabel = document.createElement('span');
  statusLeftLabel.className = 'status-left-label';
  statusLeftLabel.textContent = `${activePet ? text.statusLeftReady(getNickname(activePet)) : text.statusLeftTeaser} `;
  refs.statusLeft.append(statusLeftLabel, createRainbowCommand('/buddy'));
  refs.statusCenter.textContent = activePet ? text.statusCenterOnline : text.statusCenterOffline;
  refs.statusRight.textContent = text.statusRight(state.pets.length, MAX_WAREHOUSE);
  refs.noticeText.textContent = '';
  refs.noticeCommand.replaceChildren();
  refs.sendButton.textContent = text.send;
  refs.promptInput.placeholder = text.promptPlaceholder;
  refs.footerHint.textContent = '';
  refs.langToggle.textContent = state.language === 'zh' ? 'English' : '\u4e2d\u6587';
  refs.langToggle.setAttribute('aria-label', state.language === 'zh' ? 'Switch to English' : '\u5207\u6362\u5230\u4e2d\u6587');
  refs.composerShell.classList.add('command-ready');

  if (activePet) {
    refs.companionPill.classList.remove('hidden');
    refs.companionPill.textContent = text.companionPill(getNickname(activePet));
  } else {
    refs.companionPill.classList.add('hidden');
    refs.companionPill.textContent = '';
  }

  refs.warehousePill.classList.toggle('hidden', state.pets.length === 0);
  refs.warehousePill.classList.toggle('active', state.warehouseOpen);
  refs.warehousePill.textContent = text.warehousePill(state.pets.length, MAX_WAREHOUSE);
  refs.stagePill.classList.toggle('hidden', state.pets.length === 0);
  refs.stagePill.classList.toggle('active', state.stageOpen);
  refs.stagePill.textContent = text.stagePill;
}

function renderAll(shouldScroll = false) {
  renderChrome();
  renderTranscript(shouldScroll);
  renderWarehouse();
  renderStagePanel();
  renderCompanionStage();
}

function bindDragEvents() {
  refs.companionStage.addEventListener('pointerdown', event => {
    if (!getActivePet()) {
      return;
    }
    if (event.pointerType !== 'touch' && event.button !== 0) {
      return;
    }

    const rect = refs.companionStage.getBoundingClientRect();
    dragState = {
      pointerId: event.pointerId,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
    };

    refs.companionStage.classList.add('dragging');
    refs.companionStage.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  });

  const moveDrag = event => {
    if (!dragState || event.pointerId !== dragState.pointerId) {
      return;
    }

    state.companionPosition = clampCompanionPosition({
      x: event.clientX - dragState.offsetX,
      y: event.clientY - dragState.offsetY,
    });
    applyCompanionPosition();
  };

  const stopDrag = event => {
    if (!dragState) {
      return;
    }
    if (event.pointerId !== undefined && event.pointerId !== dragState.pointerId) {
      return;
    }

    dragState = null;
    refs.companionStage.classList.remove('dragging');
    saveState();
  };

  refs.companionStage.addEventListener('pointermove', moveDrag);
  refs.companionStage.addEventListener('pointerup', stopDrag);
  refs.companionStage.addEventListener('pointercancel', stopDrag);
  window.addEventListener('pointermove', moveDrag);
  window.addEventListener('pointerup', stopDrag);
  window.addEventListener('pointercancel', stopDrag);

  window.addEventListener('resize', () => {
    if (!isCompactWarehouseLayout() && state.warehouseMobileDetailOpen) {
      state.warehouseMobileDetailOpen = false;
      saveState();
      renderWarehouse();
    }

    updateWarehousePanelBounds();

    if (!state.companionPosition) {
      return;
    }
    state.companionPosition = clampCompanionPosition(state.companionPosition);
    applyCompanionPosition();
    saveState();
  });
}

function bindEvents() {
  refs.sendButton.addEventListener('click', () => handleCommand('/buddy'));
  refs.langToggle.addEventListener('click', () => {
    state.language = state.language === 'zh' ? 'en' : 'zh';
    saveState();
    renderAll();
  });
  refs.companionPill.addEventListener('click', () => {
    state.warehouseOpen = false;
    state.warehouseMobileDetailOpen = false;
    state.stageOpen = false;
    state.selectedPetId = state.activePetId;
    saveState();
    renderAll();
  });
  refs.warehousePill.addEventListener('click', () => {
    state.warehouseOpen = !state.warehouseOpen;
    state.warehouseMobileDetailOpen = false;
    if (state.warehouseOpen) {
      state.stageOpen = false;
    }
    state.selectedPetId = state.selectedPetId ?? state.activePetId;
    saveState();
    renderAll();
  });
  refs.stagePill.addEventListener('click', () => {
    state.stageOpen = !state.stageOpen;
    if (state.stageOpen) {
      state.warehouseOpen = false;
      state.warehouseMobileDetailOpen = false;
      state.selectedPetId = state.selectedPetId ?? state.activePetId;
      ensureStagePositions();
      clearPromptForStage();
    }
    saveState();
    renderAll();
  });
  refs.closeWarehouseBtn.addEventListener('click', () => {
    state.warehouseOpen = false;
    state.warehouseMobileDetailOpen = false;
    saveState();
    renderAll();
  });
  refs.warehouseSlots.addEventListener('click', event => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const actionButton = target.closest('button[data-action]');
    if (actionButton) {
      const id = Number(actionButton.dataset.id);
      if (actionButton.dataset.action === 'activate') {
        activatePet(id);
      }
      if (actionButton.dataset.action === 'delete') {
        deletePet(id);
      }
      return;
    }

    const row = target.closest('[data-select-id]');
    if (!row) {
      return;
    }
    state.selectedPetId = Number(row.dataset.selectId);
    if (isCompactWarehouseLayout()) {
      state.warehouseMobileDetailOpen = true;
    }
    saveState();
    renderWarehouse();
  });

  refs.warehouseDetail.addEventListener('click', event => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const backButton = target.closest('button[data-action="back-to-list"]');
    if (!backButton) {
      return;
    }

    state.warehouseMobileDetailOpen = false;
    saveState();
    renderWarehouse();
  });

  refs.stagePanel.addEventListener('click', event => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const stage = target.closest('.stage-canvas');
    if (!stage) {
      return;
    }

    clearPromptForStage();

    const actor = target.closest('[data-stage-pet-id]');
    if (!state.stageOpen) {
      state.stageOpen = true;
      ensureStagePositions();
      saveState();
      renderAll();
      return;
    }

    if (!actor) {
      saveState();
      renderChrome();
      return;
    }

    state.selectedPetId = Number(actor.dataset.stagePetId);
    saveState();
    renderWarehouse();
    renderChrome();
  });

  refs.stagePanel.addEventListener('pointerdown', event => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const actor = target.closest('[data-stage-pet-id]');
    const stage = refs.stagePanel.querySelector('.stage-canvas.active');
    if (!actor || !stage) {
      return;
    }
    if (event.pointerType !== 'touch' && event.button !== 0) {
      return;
    }

    clearPromptForStage();
    state.selectedPetId = Number(actor.dataset.stagePetId);

    const petId = Number(actor.dataset.stagePetId);
    const position = state.stagePositions[String(petId)] ?? ensureStagePositions()[String(petId)];
    stageDragState = {
      pointerId: event.pointerId,
      petId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: position.x,
      startY: position.y,
    };

    actor.classList.add('dragging');
    actor.setPointerCapture?.(event.pointerId);
    stage.setPointerCapture?.(event.pointerId);
    event.preventDefault();
    renderChrome();
    renderWarehouse();
  });

  const moveStagePet = event => {
    if (!stageDragState || event.pointerId !== stageDragState.pointerId) {
      return;
    }

    const stage = refs.stagePanel.querySelector('.stage-canvas.active');
    if (!stage) {
      return;
    }

    const stageRect = stage.getBoundingClientRect();
    const deltaX = (event.clientX - stageDragState.startClientX) / Math.max(1, stageRect.width);
    const deltaY = (event.clientY - stageDragState.startClientY) / Math.max(1, stageRect.height);
    const nextX = clampStageValue(stageDragState.startX + deltaX, STAGE_LIMITS.minX, STAGE_LIMITS.maxX);
    const nextY = clampStageValue(stageDragState.startY + deltaY, STAGE_LIMITS.minY, STAGE_LIMITS.maxY);
    state.stagePositions[String(stageDragState.petId)] = {
      x: nextX,
      y: nextY,
    };

    const actor = refs.stagePanel.querySelector(`[data-stage-pet-id="${stageDragState.petId}"]`);
    if (actor) {
      actor.style.left = `${state.stagePositions[String(stageDragState.petId)].x * 100}%`;
      actor.style.top = `${state.stagePositions[String(stageDragState.petId)].y * 100}%`;
    }
  };

  const stopStagePet = event => {
    if (!stageDragState) {
      return;
    }
    if (event.pointerId !== undefined && event.pointerId !== stageDragState.pointerId) {
      return;
    }

    const actor = refs.stagePanel.querySelector(`[data-stage-pet-id="${stageDragState.petId}"]`);
    actor?.classList.remove('dragging');
    stageDragState = null;
    saveState();
  };

  window.addEventListener('pointermove', moveStagePet);
  window.addEventListener('pointerup', stopStagePet);
  window.addEventListener('pointercancel', stopStagePet);
}

function bootstrap() {
  refs.promptInput.value = '/buddy';
  bindDragEvents();
  bindEvents();
  renderAll(true);
  updateWarehousePanelBounds();

  window.setInterval(() => {
    uiTick += 1;
    renderCompanionStage();
    renderWarehouseStageMotion();
  }, TICK_MS);
}

bootstrap();






























