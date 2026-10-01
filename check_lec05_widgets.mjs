/**
 * Звірка віджетів Л05 із даними генератора (tools/gen_lec05_widgets.py), а отже
 * з текстом лекції: віджети рахують формули самі, у браузері, і мусять дати
 * ті самі числа, що стоять у таблицях і прикладах розділів.
 *
 *   node check_lec05_widgets.mjs http://localhost:8235
 */
import puppeteer from 'puppeteer-core'
import { readFileSync } from 'node:fs'

const BASE = process.argv[2] ?? 'http://localhost:8235'
const J = f => JSON.parse(readFileSync(`.vitepress/data/${f}`, 'utf8'))
const losses = J('lec05_losses.json'), sig = J('lec05_sigmoid.json'), desc = J('lec05_descent.json')
const thr = J('lec05_proba.json'), cal = J('lec05_calib.json'), soft = J('lec05_softmax.json')
const uk = (v, nd = 3) => v.toFixed(nd).replace('.', ',').replace('-', '−')

const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' })
const p = await b.newPage()
const errs = []
p.on('pageerror', e => errs.push(e.message))
await p.setViewport({ width: 1300, height: 1000 })
await p.goto(BASE + '/lectures/05.html', { waitUntil: 'networkidle0' })
await p.waitForFunction(() => !!document.querySelector('#app')?.__vue_app__, { timeout: 30000 })

const problems = []
const eq = (what, got, want) => { if (got !== want) problems.push(`${what}: віджет «${got}», очікується «${want}»`) }
// клік по кнопці всередині віджета з потрібним заголовком
async function click(title, label) {
  const ok = await p.evaluate((title, label) => {
    const lab = [...document.querySelectorAll('.lab')].find(l => l.querySelector('.lab__title')?.textContent.includes(title))
    const btn = lab && [...lab.querySelectorAll('button')].find(x => x.textContent.trim().startsWith(label))
    if (btn) btn.click()
    return !!btn
  }, title, label)
  if (!ok) problems.push(`немає кнопки «${label}» у віджеті «${title}»`)
  await new Promise(r => setTimeout(r, 150))
}
const read = (title, sel, attr) => p.evaluate((title, sel, attr) => {
  const lab = [...document.querySelectorAll('.lab')].find(l => l.querySelector('.lab__title')?.textContent.includes(title))
  const el = lab?.querySelector(sel)
  return attr ? el?.getAttribute(attr) : el?.textContent.trim()
}, title, sel, attr)

const LT = 'Чотири втрати'
for (const pr of losses.presets) {
  await click(LT, `m = ${String(pr.m).replace('-', '−')}`)
  for (const k of ['zero_one', 'logistic', 'hinge', 'squared'])
    eq(`LossLab m=${pr.m} ${k}`, await read(LT, `tr[data-loss="${k}"] .ll__v`), uk(pr[k]))
}

const ST = 'Від відстані до ймовірності'
await click(ST, 'z = 2');  eq('SigmoidLab σ(2)', await read(ST, '[data-check="p"]'), uk(sig.s_plus2))
await click(ST, 'z = −2'); eq('SigmoidLab σ(−2)', await read(ST, '[data-check="p"]'), uk(sig.s_minus2))
await click(ST, 'p = 0,9')
eq('SigmoidLab логіт при p = 0,9', await read(ST, '[data-check="z"]'), uk(sig.logit))
eq('SigmoidLab шанси при p = 0,9', await read(ST, '[data-check="odds"]'), uk(sig.odds))
await click(ST, 'd = 1'); eq('SigmoidLab σ(5)', await read(ST, '[data-check="p"]'), uk(sig.d1_w5))
await click(ST, '‖w‖ нашої'); eq('SigmoidLab ‖w‖ моделі, d = 0,5', await read(ST, '[data-check="p"]'), uk(sig.model_p_half))

const DT = 'Градієнтний спуск на справжній'
const s0 = desc.path[0], s1 = desc.path[1], s60 = desc.path[60]
eq('DescentLab старт, втрата', await read(DT, '[data-check="loss"]'), uk(s0[2]))
eq('DescentLab старт, градієнт', await read(DT, '[data-check="g"]'), `(${uk(s0[3])}; ${uk(s0[4])})`)
await click(DT, 'крок')
eq('DescentLab крок 1, ваги', await read(DT, '[data-check="w"]'), `(${uk(s1[0])}; ${uk(s1[1])})`)
eq('DescentLab крок 1, втрата', await read(DT, '[data-check="loss"]'), uk(s1[2]))
await click(DT, 'до 60-го')
eq('DescentLab крок 60, втрата', await read(DT, '[data-check="loss"]'), uk(s60[2]))
eq('DescentLab крок 60, ваги', await read(DT, '[data-check="w"]'), `(${uk(s60[0])}; ${uk(s60[1])})`)

const TT = 'Поріг вирішує'
eq('ThresholdLab AP', await read(TT, '[data-check="ap"]'), uk(thr.ap))
eq('ThresholdLab AUC', await read(TT, '[data-check="auc"]'), uk(thr.auc))
for (const [t, label] of [[0.1, 'скринінг'], [0.5, 'за звичкою'], [0.9, 'обережний']]) {
  await click(TT, label)
  const [tn, fp, fn, tp] = thr.cm[String(t)]
  eq(`ThresholdLab матриця при ${t}`, await read(TT, '[data-check="cm"]', 'data-cm'), `${tn} ${fp} ${fn} ${tp}`)
  eq(`ThresholdLab повнота при ${t}`, await read(TT, '[data-check="rec"]'), uk(tp / (tp + fn)))
  eq(`ThresholdLab точність при ${t}`, await read(TT, '[data-check="prec"]'), uk(tp / (tp + fp)))
}
await click(TT, `поріг за F1 (перехресна перевірка): ${uk(thr.f1_threshold, 2)}`)

const CT = 'Метод Платта'
for (const pr of cal.presets) {
  const label = { bal: 'без калібрування', platt: 'Платт', prior: 'лише зсув' }[pr.tag]
  await click(CT, label)
  eq(`CalibrationLab ${pr.tag}: Брайєр`, await read(CT, '[data-check="brier"]'), uk(pr.brier, 4))
  eq(`CalibrationLab ${pr.tag}: середня p`, await read(CT, '[data-check="meanp"]'), uk(pr.mean_p))
}

const MT = 'Softmax: від оцінок'
await click(MT, 'приклад розділу')
for (const k of [0, 1, 2]) {
  eq(`SoftmaxLab exp${k}`, await read(MT, `[data-check="exp${k}"]`), uk(soft.exp[k]))
  eq(`SoftmaxLab p${k}`, await read(MT, `[data-check="p${k}"]`), uk(soft.p[k]))
}
eq('SoftmaxLab сума', await read(MT, '[data-check="sum"]'), uk(soft.sum))
eq('SoftmaxLab втрата', await read(MT, '[data-check="loss"]'), uk(soft.loss))
eq('SoftmaxLab K = 2', await read(MT, '[data-check="ratio"]'), await read(MT, '[data-check="sig"]'))
await click(MT, 'додати 2')
for (const k of [0, 1, 2]) eq(`SoftmaxLab p${k} після зсуву`, await read(MT, `[data-check="p${k}"]`), uk(soft.p[k]))

if (errs.length) problems.push(`помилки JS: ${errs.slice(0, 2).join(' | ')}`)
await b.close()
console.log(problems.length ? 'РОЗБІЖНОСТІ:\n  ' + problems.join('\n  ') : 'віджети Л05 збігаються з даними генератора й текстом ✓')
process.exit(problems.length ? 1 : 0)
