import readline from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'

import {
  applyAction,
  adoptPet,
  getActionCatalog,
  getAvailableSpecies,
  getCatalogRows,
  hydrateState,
  switchActivePet,
} from './gameState.js'
import { getSavePath, loadSave, resetSaveFile, saveGame } from './persistence.js'
import {
  clearScreen,
  renderAdoptionScreen,
  renderCodexRows,
  renderHelpScreen,
  renderMainScreen,
  renderReport,
  renderSmokeSummary,
  renderSwitchScreen,
} from '../ui/render.js'

function pickByNumber(answer, values) {
  const index = Number(answer) - 1
  if (!Number.isInteger(index) || index < 0 || index >= values.length) {
    return null
  }
  return values[index]
}

async function ask(rl, prompt) {
  try {
    return await rl.question(prompt)
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      ('code' in error || 'message' in error) &&
      (error.code === 'ERR_USE_AFTER_CLOSE' || String(error.message).includes('readline was closed'))
    ) {
      return null
    }
    throw error
  }
}

async function pause(rl) {
  await ask(rl, '')
}

async function showReport(rl, title, lines) {
  clearScreen()
  console.log(renderReport(title, lines))
  await pause(rl)
}

async function chooseFirstPet(rl, state) {
  while (state.pets.length === 0) {
    const available = getAvailableSpecies(state)
    clearScreen()
    console.log(renderAdoptionScreen(state, available))
    const answer = await ask(rl, '领养 > ')

    if (answer === null) {
      return state
    }

    const normalized = answer.trim().toLowerCase()
    const selected = pickByNumber(normalized, available)

    if (!selected) {
      await showReport(rl, '还没有开始', ['请输入列表里的编号，领养你的第一只宠物。'])
      continue
    }

    const result = adoptPet(state, selected)
    state = result.state
    await saveGame(state)
    await showReport(rl, '领养成功', result.reportLines)
  }

  return state
}

async function adoptionMenu(rl, state) {
  const available = getAvailableSpecies(state)
  if (available.length === 0) {
    await showReport(rl, '图鉴完成', ['18 个源宠物都已经在你的收容所里了。'])
    return state
  }

  while (true) {
    clearScreen()
    console.log(renderAdoptionScreen(state, available))
    const answer = await ask(rl, '领养 > ')

    if (answer === null) {
      return state
    }

    const normalized = answer.trim().toLowerCase()
    if (normalized === 'b') {
      return state
    }

    const selected = pickByNumber(normalized, available)
    if (!selected) {
      await showReport(rl, '输入无效', ['请输入可领养宠物前面的编号，或输入 b 返回。'])
      continue
    }

    const result = adoptPet(state, selected)
    state = result.state
    await showReport(rl, '领养成功', result.reportLines)
    return state
  }
}

async function switchMenu(rl, state) {
  if (state.pets.length <= 1) {
    await showReport(rl, '暂时无法切换', ['至少需要两只宠物时，切换菜单才有意义。'])
    return state
  }

  while (true) {
    clearScreen()
    console.log(renderSwitchScreen(state))
    const answer = await ask(rl, '切换 > ')

    if (answer === null) {
      return state
    }

    const normalized = answer.trim().toLowerCase()
    if (normalized === 'b') {
      return state
    }

    const selected = pickByNumber(normalized, state.pets)
    if (!selected) {
      await showReport(rl, '输入无效', ['请输入队列里的编号，或输入 b 返回。'])
      continue
    }

    const result = switchActivePet(state, selected.id)
    state = result.state
    await showReport(rl, '切换完成', result.reportLines)
    return state
  }
}

async function codexMenu(rl, state) {
  clearScreen()
  console.log(renderCodexRows(getCatalogRows(state)))
  await pause(rl)
}

async function helpMenu(rl) {
  clearScreen()
  console.log(renderHelpScreen(getSavePath()))
  await pause(rl)
}

async function runSmokeTest(initialState) {
  let state = hydrateState(initialState)
  const catalogRows = getCatalogRows(state)
  if (catalogRows.length !== 18) {
    throw new Error(`Expected 18 species, received ${catalogRows.length}.`)
  }

  if (state.pets.length === 0) {
    state = adoptPet(state, 'duck').state
  }

  state = applyAction(state, 'feed').state
  state = applyAction(state, 'play').state
  state = applyAction(state, 'talk').state

  const secondSpecies = getAvailableSpecies(state)[0]
  if (secondSpecies) {
    state = adoptPet(state, secondSpecies).state
    const newestPet = state.pets[state.pets.length - 1]
    state = switchActivePet(state, newestPet.id).state
    state = applyAction(state, 'rest').state
  }

  return hydrateState(state)
}

export async function startGame({ smokeTest = false, resetSave = false } = {}) {
  if (resetSave) {
    await resetSaveFile()
  }

  let state = hydrateState(await loadSave())

  if (smokeTest) {
    state = await runSmokeTest(state)
    await saveGame(state)
    clearScreen()
    console.log(renderSmokeSummary(state, getCatalogRows(state)))
    return
  }

  const rl = readline.createInterface({ input, output })

  try {
    if (state.pets.length === 0) {
      state = await chooseFirstPet(rl, state)
      if (state.pets.length === 0) {
        await saveGame(state)
        clearScreen()
        console.log('Buddy 未收到领养输入，当前没有建立新存档。')
        return
      }
    }

    const actions = getActionCatalog()

    while (true) {
      clearScreen()
      console.log(renderMainScreen(state))
      const answer = await ask(rl, '选择 > ')

      if (answer === null) {
        await saveGame(state)
        clearScreen()
        console.log('Buddy 进度已保存，输入流结束，已安全退出。')
        return
      }

      const normalized = answer.trim().toLowerCase()

      if (normalized === '13' || normalized === 'q' || normalized === 'quit' || normalized === 'exit') {
        await saveGame(state)
        clearScreen()
        console.log('Buddy 进度已保存，下次运行 `node index.js` 会继续当前收容所。')
        return
      }

      if (normalized === '9') {
        state = await adoptionMenu(rl, state)
        await saveGame(state)
        continue
      }

      if (normalized === '10') {
        state = await switchMenu(rl, state)
        await saveGame(state)
        continue
      }

      if (normalized === '11') {
        await codexMenu(rl, state)
        continue
      }

      if (normalized === '12') {
        await helpMenu(rl)
        continue
      }

      const action = pickByNumber(normalized, actions)
      if (!action) {
        await showReport(rl, '无法识别', ['请输入 1-13 的菜单编号。'])
        continue
      }

      const result = applyAction(state, action.key)
      state = hydrateState(result.state)
      await saveGame(state)
      await showReport(rl, action.label, result.reportLines)
    }
  } finally {
    rl.close()
  }
}
