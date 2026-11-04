/**
 * Звірка віджетів Л09 із текстом і даними генератора (tools/gen_lec09_widgets.py):
 * PCALab (K = 21), DirectionLab (кути 0°, 45°, 90°), SgdMatrixLab (перший крок =
 * блок «Розрахунок: один крок SGD», 110 кроків), TsneGallery (довіра дев'яти карт).
 *
 *   node check_lec09_widgets.mjs http://localhost:8235
 */
import puppeteer from 'puppeteer-core'
import { readFileSync } from 'node:fs'

const BASE = process.argv[2] ?? 'http://localhost:8235'
const g = JSON.parse(readFileSync('.vitepress/data/lec09_tsne.json', 'utf8'))
const dir = JSON.parse(readFileSync('.vitepress/data/lec09_direction.json', 'utf8'))
const uk = (v, nd) => v.toFixed(nd).replace('.', ',')

const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' })
const p = await b.newPage()
const errs = []
p.on('pageerror', e => errs.push(e.message))
await p.setViewport({ width: 1300, height: 1000 })
await p.goto(BASE + '/lectures/09.html', { waitUntil: 'networkidle0' })
await p.waitForFunction(() => !!document.querySelector('#app')?.__vue_app__, { timeout: 30000 })

const problems = []
const eq = (what, got, want) => { if (got !== want) problems.push(`${what}: віджет «${got}», очікується «${want}»`) }
const pause = () => new Promise(r => setTimeout(r, 120))
const lab = t => `[...document.querySelectorAll('.lab')].find(l => l.querySelector('.lab__title')?.textContent.includes(${JSON.stringify(t)}))`
const read = (L, sel) => p.evaluate(`${L}?.querySelector(${JSON.stringify(sel)})?.textContent.trim()`)
const slide = async (L, v) => { await p.evaluate(`(() => { const el = ${L}.querySelector('input[type=range]'); el.value = '${v}'; el.dispatchEvent(new Event('input', { bubbles: true })) })()`); await pause() }
const click = async (L, sel, text) => { await p.evaluate(`[...${L}.querySelectorAll(${JSON.stringify(sel)})].find(x => x.textContent.trim().startsWith(${JSON.stringify(text)})).dispatchEvent(new MouseEvent('click', { bubbles: true }))`); await pause() }

// PCALab
const PC = lab('Скільки чисел треба')
await click(PC, '.lab__pill', 'K = 21')
eq('PCALab K = 21, частка', await read(PC, '.lab__stat b'), '90,3 %')
await click(PC, '.lab__pill', 'K = 2')
eq('PCALab K = 2, частка', await read(PC, '.lab__stat b'), '28,5 %')

// DirectionLab: дисперсія і помилка рахуються за визначенням
const DL = lab('Кут прямої')
const stat = a => {
  const c = Math.cos(a * Math.PI / 180), s = Math.sin(a * Math.PI / 180)
  let v = 0, e = 0
  for (const [x, y] of dir.X) { const z = x * c + y * s; v += z * z; e += (x - z * c) ** 2 + (y - z * s) ** 2 }
  return [v / dir.X.length, e / dir.X.length]
}
for (const a of [0, 20, 45, 90]) {
  await slide(DL, a)
  const [v, e] = stat(a)
  eq(`DirectionLab ${a}°, дисперсія`, await read(DL, '[data-check="var"]'), uk(v, 4))
  eq(`DirectionLab ${a}°, помилка`, await read(DL, '[data-check="err"]'), uk(e, 4))
  eq(`DirectionLab ${a}°, сума`, await read(DL, '[data-check="sum"]'), '2,00')
}
await slide(DL, 45)
eq('DirectionLab 45°, дисперсія', await read(DL, '[data-check="var"]'), '1,8646')
eq('DirectionLab 45°, частка', await read(DL, '[data-check="share"]'), '93,2 %')

// SgdMatrixLab: перший крок — числа блока «Розрахунок: один крок SGD»
const SM = lab('SGD на матриці')
await click(SM, '.lab__btn', 'крок')
eq('SgdMatrixLab крок 1, номер', await read(SM, '[data-check="step"]'), '1')
eq('SgdMatrixLab крок 1, прогноз', await read(SM, '[data-check="pred"]'), '1,30')
eq('SgdMatrixLab крок 1, e', await read(SM, '[data-check="e"]'), '3,70')
eq('SgdMatrixLab крок 1, z', await read(SM, '[data-check="z"]'), '(1,40; 0,65)')
eq('SgdMatrixLab крок 1, w', await read(SM, '[data-check="w"]'), '(1,46; 0,58)')
eq('SgdMatrixLab крок 1, новий прогноз', await read(SM, '[data-check="next"]'), '2,43')
await click(SM, '.lab__btn', 'спочатку')
for (let i = 0; i < 10; i++) await click(SM, '.lab__btn', 'епоха')
eq('SgdMatrixLab 110 кроків, номер', await read(SM, '[data-check="step"]'), '110')
eq('SgdMatrixLab 110 кроків, RMSE', await read(SM, '[data-check="rmse"]'), '0,093')

// TsneGallery: довіра кожної з дев'яти карт
const TG = lab("Дев'ять карт")
for (const m of g.maps) {
  await p.evaluate(`(() => { const rows = ${TG}.querySelectorAll('.tg__row');
    [...rows[0].querySelectorAll('.lab__pill')].find(x => x.textContent.trim() === '${m.seed}').click();
    [...rows[1].querySelectorAll('.lab__pill')].find(x => x.textContent.trim() === '${m.perp}').click() })()`)
  await pause()
  eq(`TsneGallery зерно ${m.seed}, перплексія ${m.perp}`, await read(TG, '[data-check="T"]'), uk(m.T, 3))
}

if (errs.length) problems.push(`помилки JS: ${errs.slice(0, 2).join(' | ')}`)
await b.close()
console.log(problems.length ? 'РОЗБІЖНОСТІ:\n  ' + problems.join('\n  ') : 'віджети Л09 збігаються з текстом і генератором ✓')
process.exit(problems.length ? 1 : 0)
