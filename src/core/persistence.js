import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { INITIAL_SAVE } from '../data/types.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = path.resolve(__dirname, '..', '..')
const SAVE_PATH = path.join(ROOT_DIR, 'save.json')

function normalizeSave(input) {
  return {
    ...INITIAL_SAVE,
    ...input,
    pets: Array.isArray(input?.pets) ? input.pets : [],
    collectedSpecies: Array.isArray(input?.collectedSpecies)
      ? input.collectedSpecies
      : [],
    eventLog:
      Array.isArray(input?.eventLog) && input.eventLog.length > 0
        ? input.eventLog.slice(-8)
        : [...INITIAL_SAVE.eventLog],
  }
}

export async function loadSave() {
  try {
    const raw = await fs.readFile(SAVE_PATH, 'utf8')
    return normalizeSave(JSON.parse(raw))
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return normalizeSave(INITIAL_SAVE)
    }
    throw error
  }
}

export async function saveGame(state) {
  const payload = JSON.stringify(normalizeSave(state), null, 2)
  await fs.writeFile(SAVE_PATH, `${payload}\n`, 'utf8')
}

export async function resetSaveFile() {
  try {
    await fs.unlink(SAVE_PATH)
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return
    }
    throw error
  }
}

export function getSavePath() {
  return SAVE_PATH
}
