/**
 * Звірка віджета Л10 із розрахунком лекції: BackpropLab (розділ 3.1) на точці (1, 0)
 * дає ті самі p, втрату, δ і крок, що блоки «Розрахунок» і код розділу 3.2; на точці
 * (0, 1) перший нейрон вимкнений і градієнти його ваг нульові. Очікувані числа —
 * з v2/figs/lec10/10_values.json, який пише v2/lec10_figs.py незалежно від віджета.
 *
 *   node check_lec10_widgets.mjs http://localhost:8235
 */
import puppeteer from 'puppeteer-core'
import { readFileSync } from 'node:fs'

const BASE = process.argv[2] ?? 'http://localhost:8235'
const V = JSON.parse(readFileSync('../v2/figs/lec10/10_values.json', 'utf8'))
const uk = (v, nd = 3) => {
  const s = (Math.abs(v) < 0.5 * 10 ** -nd ? 0 : v).toFixed(nd).replace('.', ',')
  return s.startsWith('-') ? '−' + s.slice(1) : s
}

const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' })
const p = await b.newPage()
const errs = []
p.on('pageerror', e => errs.push(e.message))
await p.setViewport({ width: 1300, height: 1000 })
await p.goto(BASE + '/lectures/10.html', { waitUntil: 'networkidle0' })
await p.waitForFunction(() => !!document.querySelector('#app')?.__vue_app__, { timeout: 30000 })

const problems = []
const eq = (what, got, want) => { if (got !== want) problems.push(`${what}: віджет «${got}», очікується «${want}»`) }
const pause = () => new Promise(r => setTimeout(r, 120))
const L = `[...document.querySelectorAll('.lab')].find(l => l.querySelector('.lab__title')?.textContent.includes('Зворотний прохід'))`
const read = sel => p.evaluate(`${L}?.querySelector(${JSON.stringify(sel)})?.textContent.trim()`)
const point = async t => { await p.evaluate(`[...${L}.querySelectorAll('.lab__pill')].find(x => x.textContent.trim().startsWith(${JSON.stringify(t)})).click()`); await pause() }
const node = async k => { await p.evaluate(`${L}.querySelectorAll('.bp__click')[${k}].dispatchEvent(new MouseEvent('click', { bubbles: true }))`); await pause() }

if (!(await p.evaluate(`!!${L}`))) problems.push('віджета «Зворотний прохід» на сторінці немає')
else {
  const bp = V.bp
  await point('(1, 0)')
  await node(2)                                             // вихідний нейрон
  eq('(1, 0) p', await read('[data-check="p"]'), uk(bp.p))
  eq('(1, 0) втрата', await read('[data-check="loss"]'), uk(bp.loss))
  eq('(1, 0) втрата після кроку', await read('[data-check="loss-new"]'), uk(bp.loss_new))
  eq('(1, 0) p після кроку', await read('[data-check="p-new"]'), uk(bp.p_new))
  eq('(1, 0) g(v₁)', await read('[data-check="g0"]'), uk(bp.g_v[0]))
  eq('(1, 0) g(v₂)', await read('[data-check="g1"]'), uk(bp.g_v[1]))
  if (!(await read('[data-check="delta"]')).endsWith(uk(bp.d_out))) problems.push('(1, 0): δ виходу не збігається')
  await node(0)                                             // перший прихований
  if (!(await read('[data-check="delta"]')).endsWith(uk(bp.d_hid[0]))) problems.push('(1, 0): δ₁ не збігається')
  eq('(1, 0) g(w₁₁)', await read('[data-check="g0"]'), uk(bp.g_W[0][0]))
  await node(1)
  if (!(await read('[data-check="delta"]')).endsWith(uk(bp.d_hid[1]))) problems.push('(1, 0): δ₂ не збігається')
  await point('(0, 1)')
  await node(0)
  eq('(0, 1) g(w₁₂) вимкненого нейрона', await read('[data-check="g1"]'), '0,000')
  if (!(await p.evaluate(`!!${L}.querySelector('.bp__dead')`))) problems.push('(0, 1): немає примітки про вимкнений нейрон')
  eq('(0, 1) p', await read('[data-check="p"]'), uk(V.bp_points['01'].p))
}

if (errs.length) problems.push(`помилки JS: ${errs.slice(0, 2).join(' | ')}`)
await b.close()
console.log(problems.length ? 'РОЗБІЖНОСТІ:\n  ' + problems.join('\n  ') : 'віджет Л10 збігається з розрахунком лекції ✓')
process.exit(problems.length ? 1 : 0)
