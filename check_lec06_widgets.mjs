/**
 * Звірка віджетів Л06 ForestLab і BoostingLab із даними генератора
 * (tools/gen_lec06_steps.py), а отже з текстом покрокових розділів.
 *
 *   node check_lec06_widgets.mjs http://localhost:8235
 */
import puppeteer from 'puppeteer-core'
import { readFileSync } from 'node:fs'

const BASE = process.argv[2] ?? 'http://localhost:8235'
const J = f => JSON.parse(readFileSync(`.vitepress/data/${f}`, 'utf8'))
const forest = J('lec06_forest.json'), boost = J('lec06_boost.json')
const uk = (v, nd = 3) => v.toFixed(nd).replace('.', ',').replace('-', '−')

const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' })
const p = await b.newPage()
const errs = []
p.on('pageerror', e => errs.push(e.message))
await p.setViewport({ width: 1300, height: 1000 })
await p.goto(BASE + '/lectures/06.html', { waitUntil: 'networkidle0' })
await p.waitForFunction(() => !!document.querySelector('#app')?.__vue_app__, { timeout: 30000 })

const problems = []
const eq = (what, got, want) => { if (got !== want) problems.push(`${what}: віджет «${got}», очікується «${want}»`) }
async function click(title, label) {
  const ok = await p.evaluate((title, label) => {
    const lab = [...document.querySelectorAll('.lab')].find(l => l.querySelector('.lab__title')?.textContent.includes(title))
    const btn = lab && [...lab.querySelectorAll('button')].find(x => x.textContent.trim() === label || x.textContent.trim().startsWith(label))
    if (btn) btn.click()
    return !!btn
  }, title, label)
  if (!ok) problems.push(`немає кнопки «${label}» у віджеті «${title}»`)
  await new Promise(r => setTimeout(r, 150))
}
const read = (title, sel) => p.evaluate((title, sel) => {
  const lab = [...document.querySelectorAll('.lab')].find(l => l.querySelector('.lab__title')?.textContent.includes(title))
  return lab?.querySelector(sel)?.textContent.trim()
}, title, sel)

const FT = 'Беггінг і ліс на десяти'
await click(FT, 'нова пасажирка')
await click(FT, 'випадковий ліс')
eq('ForestLab ліс, нова', await read(FT, '[data-check="avg"]'), uk(forest.ref.new_forest))
eq('ForestLab ліс, голоси', await read(FT, '[data-check="votes"]'), '3 з 5')
await click(FT, 'беггінг')
eq('ForestLab беггінг, нова', await read(FT, '[data-check="avg"]'), uk(forest.ref.new_bag))
await click(FT, '3')
eq('ForestLab беггінг, поза мішком пасажира 3', await read(FT, '[data-check="oob"]'), uk(forest.ref.oob3_bag))

const BT = 'Градієнтний бустинг на восьми'
await click(BT, '0,5')
eq('BoostingLab крок 0, MSE', await read(BT, '[data-check="mse"]'), uk(boost.ref[0].mse, 4))
for (let s = 1; s <= 3; s++) {
  await click(BT, 'крок')
  const r = boost.ref[s]
  eq(`BoostingLab крок ${s}, MSE`, await read(BT, '[data-check="mse"]'), uk(r.mse, 4))
  eq(`BoostingLab крок ${s}, поріг`, await read(BT, '[data-check="thr"]'), uk(r.t))
}

if (errs.length) problems.push(`помилки JS: ${errs.slice(0, 2).join(' | ')}`)
await b.close()
console.log(problems.length ? 'РОЗБІЖНОСТІ:\n  ' + problems.join('\n  ') : 'віджети Л06 збігаються з даними генератора й текстом ✓')
process.exit(problems.length ? 1 : 0)
