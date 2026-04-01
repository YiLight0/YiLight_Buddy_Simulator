import { getSpeciesProfile } from '../data/species.js'
import { renderSpeciesPreview, renderSprite } from '../data/sprites.js'
import { RARITY_STARS } from '../data/types.js'
import {
  deriveMood,
  dominantStat,
  formatTime,
  getActionCatalog,
  getActivePet,
  getNeedSummary,
} from '../core/gameState.js'

const useColor = Boolean(process.stdout.isTTY)
const actionLabelMap = Object.fromEntries(getActionCatalog().map(action => [action.key, action.label]))

function color(text, code) {
  return useColor ? `\u001b[${code}m${text}\u001b[0m` : text
}

function rarityTint(rarity, text) {
  const map = {
    common: 37,
    uncommon: 32,
    rare: 36,
    epic: 35,
    legendary: 33,
  }
  return color(text, map[rarity] ?? 37)
}

function title(text) {
  return color(text, '1;36')
}

function muted(text) {
  return color(text, '90')
}

function accent(text) {
  return color(text, '1;33')
}

function success(text) {
  return color(text, '32')
}

function danger(text) {
  return color(text, '31')
}

function bar(label, value) {
  const safe = Math.max(0, Math.min(100, Math.round(value)))
  const filled = Math.round(safe / 10)
  const body = `${'#'.repeat(filled)}${'-'.repeat(10 - filled)}`
  const line = `${label.padEnd(4, ' ')} [${body}] ${String(safe).padStart(3, ' ')}%`

  if (safe >= 70) {
    return success(line)
  }
  if (safe <= 30) {
    return danger(line)
  }
  return line
}

export function clearScreen() {
  if (typeof console.clear === 'function') {
    console.clear()
  }
}

export function renderMainScreen(state) {
  const pet = getActivePet(state)
  const header = [
    title('Buddy Sanctuary'),
    `${formatTime(state)}   星屑 ${state.coins}   图鉴 ${state.collectedSpecies.length}/18`,
    muted('从 src/buddy 提取并扩展的独立终端电子宠物系统'),
  ].join('\n')

  if (!pet) {
    return [
      header,
      '',
      '你还没有领养宠物。先选择一只源宠物进入收容所吧。',
      '',
      '9. 领养第一只宠物',
      '12. 帮助',
      '13. 保存并退出',
    ].join('\n')
  }

  const profile = getSpeciesProfile(pet.species)
  const sprite = renderSprite(pet, state.frameTick).map(line => `   ${line}`).join('\n')
  const mood = deriveMood(pet)
  const topStat = dominantStat(pet)
  const statsBlock = [
    bar('饱腹', pet.fullness),
    bar('体力', pet.energy),
    bar('卫生', pet.hygiene),
    bar('快乐', pet.joy),
    bar('健康', pet.health),
    bar('亲密', pet.bond),
  ].join('\n')
  const attributeLine = `主属性 ${accent(topStat)}   性格 ${pet.personality}   最爱 ${actionLabelMap[profile.favoriteAction] ?? profile.favoriteAction}`
  const statusLine = `当前心情 ${accent(mood)}   需求提示 ${getNeedSummary(pet)}`
  const logs = state.eventLog.map(line => `- ${line}`).join('\n')
  const actionLines = getActionCatalog()
    .map((action, index) => `${index + 1}. ${action.label}  ${muted(`(${action.summary})`)}`)
    .join('\n')

  return [
    header,
    '',
    `${rarityTint(pet.rarity, `${pet.name} / ${profile.label}`)}  Lv.${pet.level}  ${RARITY_STARS[pet.rarity]}${pet.shiny ? '  SHINY' : ''}`,
    `${profile.title}  ${muted(profile.habitat)}`,
    `${pet.biography}`,
    '',
    sprite,
    '',
    attributeLine,
    statusLine,
    '',
    statsBlock,
    '',
    '最近动态',
    logs,
    '',
    '动作菜单',
    actionLines,
    '9. 领养新宠',
    '10. 切换宠物',
    '11. 查看图鉴',
    '12. 帮助',
    '13. 保存并退出',
  ].join('\n')
}

export function renderAdoptionScreen(state, availableSpecies) {
  const lines = availableSpecies.map((species, index) => {
    const profile = getSpeciesProfile(species)
    return `${String(index + 1).padStart(2, ' ')}. ${renderSpeciesPreview(species)}  ${profile.label} / ${species}  ${muted(profile.intro)}`
  })

  return [
    title('领养中心'),
    `${formatTime(state)}   可领养 ${availableSpecies.length} / 18`,
    muted('这些都是从源文件中提取出的宠物物种，每个物种只收录一次。'),
    '',
    ...(lines.length > 0 ? lines : ['所有 18 个宠物都已经加入你的收容所。']),
    '',
    '输入编号领养，或输入 b 返回。',
  ].join('\n')
}

export function renderSwitchScreen(state) {
  const lines = state.pets.map((pet, index) => {
    const profile = getSpeciesProfile(pet.species)
    const active = pet.id === state.activePetId ? accent('[当前陪伴]') : '[待命]'
    return `${String(index + 1).padStart(2, ' ')}. ${active} ${pet.name} / ${profile.label}  Lv.${pet.level}  ${deriveMood(pet)}`
  })

  return [
    title('宠物编队'),
    `${formatTime(state)}   已拥有 ${state.pets.length} 只`,
    '',
    ...(lines.length > 0 ? lines : ['你还没有宠物。']),
    '',
    '输入编号切换，或输入 b 返回。',
  ].join('\n')
}

export function renderCodexRows(rows) {
  return [
    title('全宠物图鉴'),
    muted('以下 18 个宠物全部来自 src/buddy 的源物种。'),
    '',
    ...rows.map((row, index) => {
      const prefix = row.owned ? success('[已收集]') : muted('[未收集]')
      return `${String(index + 1).padStart(2, ' ')}. ${prefix} ${renderSpeciesPreview(row.species)}  ${row.label} / ${row.species}  ${row.title}`
    }),
    '',
    '按回车返回。',
  ].join('\n')
}

export function renderHelpScreen(savePath) {
  return [
    title('帮助'),
    '目标：照顾你的电子宠物，同时把 18 个源宠物都收入图鉴。',
    '',
    '主要菜单：',
    '1-8 进行互动动作。每个动作都会推进时间并改变宠物状态。',
    '9 进入领养中心，补全图鉴。',
    '10 切换当前陪伴的宠物。',
    '11 查看全部源宠物图鉴。',
    '13 保存并退出。',
    '',
    '养成建议：',
    '- 饱腹、体力、卫生、快乐太低都会拖慢健康。',
    '- 每只宠物都有“最爱动作”，经常做会获得额外成长。',
    '- 探险适合拿星屑和事件，休息适合救急回血。',
    '',
    `存档位置：${savePath}`,
    '',
    '按回车返回。',
  ].join('\n')
}

export function renderReport(titleText, lines) {
  return [
    title(titleText),
    '',
    ...lines.map(line => `- ${line}`),
    '',
    '按回车继续。',
  ].join('\n')
}

export function renderSmokeSummary(state, catalogRows) {
  const pet = getActivePet(state)
  return [
    title('Smoke Test Passed'),
    `图鉴物种数: ${catalogRows.length}`,
    `已领养数: ${state.pets.length}`,
    `当前时间: ${formatTime(state)}`,
    `当前宠物: ${pet ? `${pet.name} / ${getSpeciesProfile(pet.species).label}` : 'none'}`,
  ].join('\n')
}
