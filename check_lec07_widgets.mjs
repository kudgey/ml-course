/**
 * Звірка віджетів Л07 KernelLab, SlackLab і AlphaLab із даними генератора
 * (tools/gen_lec07_svm.py). Числа приміток генератор звіряє з тими самими
 * даними, тож збіг тут означає збіг і з текстом.
 *
 *   node check_lec07_widgets.mjs http://localhost:8235
 */
import puppeteer from 'puppeteer-core'
import { readFileSync } from 'node:fs'

const BASE = process.argv[2] ?? 'http://localhost:8235'
const J = f => JSON.parse(readFileSync(`.vitepress/data/${f}`, 'utf8'))
const ker = J('lec07_svm.json'), sl = J('lec07_slack.json')
const uk = (v, nd = 3) => (Math.abs(v) < 0.5 * 10 ** -nd ? 0 : v).toFixed(nd).replace('.', ',').replace('-', '−')

const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' })
const p = await b.newPage()
const errs = []
p.on('pageerror', e => errs.push(e.message))
await p.setViewport({ width: 1300, height: 1000 })
await p.goto(BASE + '/lectures/07.html', { waitUntil: 'networkidle0' })
await p.waitForFunction(() => !!document.querySelector('#app')?.__vue_app__, { timeout: 30000 })

const problems = []
const eq = (what, got, want) => { if (got !== want) problems.push(`${what}: віджет «${got}», очікується «${want}»`) }
const pause = () => new Promise(r => setTimeout(r, 120))
const lab = title => `[...document.querySelectorAll('.lab')].find(l => l.querySelector('.lab__title')?.textContent.includes(${JSON.stringify(title)}))`
const read = (title, sel) => p.evaluate(`${lab(title)}?.querySelector(${JSON.stringify(sel)})?.textContent.trim()`)
async function clickNth(title, sel, n) {
  const ok = await p.evaluate(`(() => { const el = ${lab(title)}?.querySelectorAll(${JSON.stringify(sel)})[${n}];
    if (el) el.dispatchEvent(new MouseEvent('click', { bubbles: true })); return !!el })()`)
  if (!ok) problems.push(`немає елемента ${sel}[${n}] у віджеті «${title}»`)
  await pause()
}
async function slide(title, n, value) {
  await p.evaluate(`(() => { const el = ${lab(title)}?.querySelectorAll('input[type=range]')[${n}];
    el.value = ${JSON.stringify(String(value))}; el.dispatchEvent(new Event('input', { bubbles: true })) })()`)
  await pause()
}

// ── KernelLab: карта — перехресна перевірка, тест окремо ──
const KT = 'Що робить gamma'
for (const key of ['1|0.1', '1|0.5', '1|1', '1|50', ker.best]) {
  const [c, g] = key.split('|').map(Number)
  await clickNth(KT, '.kr__cell', ker.Cs.indexOf(c) * ker.gammas.length + ker.gammas.indexOf(g))
  const m = ker.meta[key]
  eq(`KernelLab ${key}, CV`, await read(KT, '[data-check="cv"]'), uk(m.cv))
  eq(`KernelLab ${key}, навчальні`, await read(KT, '[data-check="tr"]'), uk(m.tr))
  eq(`KernelLab ${key}, тест`, await read(KT, '[data-check="te"]'), uk(m.te))
  eq(`KernelLab ${key}, опорні`, await read(KT, '[data-check="sv"]'), String(m.sv))
}
const best = Object.entries(ker.meta).reduce((a, e) => (e[1].cv > a[1].cv ? e : a))
eq('KernelLab, найкраща пара за CV', ker.best, best[0])

// ── SlackLab: оптимум і зростання цілі вбік від нього ──
const ST = 'Слекові змінні: скільки коштує'
const r = sl.ref
eq('SlackLab Σξ', await read(ST, '[data-check="sumxi"]'), uk(r.sum_xi, 1))
eq('SlackLab порушники', await read(ST, '[data-check="viol"]'), String(r.viol))
eq('SlackLab помилки', await read(ST, '[data-check="wrong"]'), String(r.wrong))
eq('SlackLab ціль', await read(ST, '[data-check="obj"]'), uk(r.obj, 4))
eq('SlackLab ширина', await read(ST, '[data-check="width"]'), uk(r.width, 2))
const num = s => parseFloat(s.replace(',', '.').replace('−', '-'))
for (const [n, v] of [[0, 0.1], [0, -0.1], [1, 2], [1, -2]]) {
  await slide(ST, n, v)
  const o = num(await read(ST, '[data-check="obj"]'))
  if (!(o > r.obj)) problems.push(`SlackLab: повзунок ${n} = ${v} дав ціль ${o}, не більшу за оптимум ${r.obj}`)
  await slide(ST, n, 0)
}
eq('SlackLab ціль після повернення', await read(ST, '[data-check="obj"]'), uk(r.obj, 4))

// ── AlphaLab: категорії, ваги з α, одна точка кожного типу ──
const AT = 'Двоїсті змінні α'
eq('AlphaLab за коридором', await read(AT, '[data-check="c0"]'), String(r.cats[0]))
eq('AlphaLab на межі', await read(AT, '[data-check="c1"]'), String(r.cats[1]))
eq('AlphaLab порушники', await read(AT, '[data-check="c2"]'), String(r.cats[2]))
eq('AlphaLab опорні', await read(AT, '[data-check="nsv"]'), String(r.n_sv))
eq('AlphaLab w', await read(AT, '[data-check="w"]'), `(${uk(r.w_from_alpha[0])}; ${uk(r.w_from_alpha[1])})`)
const eta = sl.X.map((x, i) => sl.y[i] * (sl.w[0] * x[0] + sl.w[1] * x[1] + sl.w0))
for (const want of [0, 2]) {
  const i = eta.findIndex(e => (want === 0 ? e > 1 + sl.tol : e < 1 - sl.tol))
  await clickNth(AT, 'g.al__pt', i)
  eq(`AlphaLab точка ${i}, α`, await read(AT, '[data-check="alpha"]'), uk(sl.alpha[i]))
  eq(`AlphaLab точка ${i}, 1 − η`, await read(AT, '[data-check="one-eta"]'), uk(1 - eta[i]))
}

// ── HingeLossLab: w = 0,5 і два мінімуми ──
const toy = J('lec07_toy.json')
const HT = 'Дві втрати на шести'
const L = toy.loss
eq('HingeLossLab ПЕ при w = 0,5', await read(HT, '[data-check="mlog"]'), uk(L.ref.mlog05, 4))
eq('HingeLossLab hinge при w = 0,5', await read(HT, '[data-check="mhinge"]'), uk(L.ref.mhinge05, 4))
await clickNth(HT, '.lab__pill', 2)
eq('HingeLossLab мінімум hinge', await read(HT, '[data-check="jhinge"]'), uk(L.ref.jhinge_opt, 4))
await clickNth(HT, '.lab__pill', 1)
eq('HingeLossLab мінімум ПЕ', await read(HT, '[data-check="jlog"]'), uk(L.ref.jlog_opt, 4))
eq('HingeLossLab p(x = 1)', await read(HT, '[data-check="p1"]'), uk(L.ref.p1_opt))

// ── SvmToyLab: оптимум і розрахунок однієї точки ──
const TT = 'SVM на шести точках'
const T = toy.toy, nw = Math.hypot(T.w[0], T.w[1])
eq('SvmToyLab ‖w‖', await read(TT, '[data-check="norm"]'), uk(nw))
eq('SvmToyLab ширина', await read(TT, '[data-check="width"]'), uk(2 / nw, 2))
eq('SvmToyLab найменше η', await read(TT, '[data-check="mineta"]'), uk(1, 2))
await clickNth(TT, 'g.st__pt', 4)
const gE = T.w[0] * T.X[4][0] + T.w[1] * T.X[4][1] + T.w0
eq('SvmToyLab g(E)', await read(TT, '[data-check="g"]'), uk(gE, 2))
eq('SvmToyLab відстань E', await read(TT, '[data-check="dist"]'), uk(Math.abs(gE) / nw, 2))

if (errs.length) problems.push(`помилки JS: ${errs.slice(0, 2).join(' | ')}`)
await b.close()
console.log(problems.length ? 'РОЗБІЖНОСТІ:\n  ' + problems.join('\n  ') : 'віджети Л07 збігаються з даними генератора й текстом ✓')
process.exit(problems.length ? 1 : 0)
