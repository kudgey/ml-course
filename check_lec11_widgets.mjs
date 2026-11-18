/**
 * Звірка віджета Л11 із текстом лекції: ConvolutionLab (розділ 2.3) рахує карту за
 * формулою (3) — з рамкою в 1 піксель карта 28 × 28, без рамки 26 × 26; ваг ядра
 * дев'ять, положень вікна стільки, скільки чисел у карті; цифра, зміщена праворуч
 * на 1–4 пікселі, дає ту саму карту, зміщену на ті самі пікселі (розбіжність 0).
 * Повзунка кроку вікна у віджеті немає: про крок лекція не говорить.
 *
 *   node check_lec11_widgets.mjs http://localhost:8235
 */
import puppeteer from 'puppeteer-core'

const BASE = process.argv[2] ?? 'http://localhost:8235'
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' })
const p = await b.newPage()
const errs = []
p.on('pageerror', e => errs.push(e.message))
await p.setViewport({ width: 1300, height: 1000 })
await p.goto(BASE + '/lectures/11.html', { waitUntil: 'networkidle0' })
await p.waitForFunction(() => !!document.querySelector('#app')?.__vue_app__, { timeout: 30000 })

const problems = []
const pause = () => new Promise(r => setTimeout(r, 150))
const L = `[...document.querySelectorAll('.lab')].find(l => l.querySelector('.lab__title')?.textContent.includes('Фільтр, який ви задаєте самі'))`
const stats = () => p.evaluate(`[...${L}.querySelectorAll('.lab__stat')].map(s => s.querySelector('b').textContent.trim())`)
const section = () => p.evaluate(`(() => { const w = ${L}; let last = ''
  for (const h of document.querySelectorAll('h2')) if (h.compareDocumentPosition(w) & Node.DOCUMENT_POSITION_FOLLOWING) last = h.textContent.trim()
  return last })()`)
const setShift = async v => {
  await p.evaluate(`(() => { const r = ${L}.querySelector('input[type=range]'); r.value = '${v}'; r.dispatchEvent(new Event('input', { bubbles: true })) })()`)
  await pause()
}

if (!(await p.evaluate(`!!${L}`))) problems.push('віджета «Фільтр, який ви задаєте самі» на сторінці немає')
else {
  const sec = await section()
  if (!sec.includes('2.3. Згортка на справжній цифрі')) problems.push(`віджет стоїть у розділі «${sec}», а не в 2.3`)
  const ranges = await p.evaluate(`${L}.querySelectorAll('input[type=range]').length`)
  if (ranges !== 1) problems.push(`повзунків ${ranges}, має бути один — зміщення`)
  const maxShift = await p.evaluate(`${L}.querySelector('input[type=range]').max`)
  if (maxShift !== '4') problems.push(`зміщення до ${maxShift} пікселів, у лекції — до 4`)
  let s = await stats()
  if (s[0] !== '28 × 28' || s[1] !== '9 + 1' || s[2] !== '784') problems.push(`з рамкою: ${s.slice(0, 3).join(' | ')}`)
  for (const k of [1, 2, 3, 4]) {
    await setShift(k)
    s = await stats()
    if (s[3] !== '0') problems.push(`зміщення ${k}: розбіжність карт «${s[3]}», а не 0`)
  }
  await setShift(0)
  await p.evaluate(`${L}.querySelector('.lab__btn').click()`)
  await pause()
  s = await stats()
  if (s[0] !== '26 × 26' || s[2] !== '676') problems.push(`без рамки: ${s[0]} і ${s[2]} положень замість 26 × 26 і 676`)
  const text = await p.evaluate(`${L}.textContent`)
  for (const bad of ['Крок S', 'Зсув зображення', 'зсунули']) if (text.includes(bad)) problems.push(`у віджеті лишилося «${bad}»`)
}

if (errs.length) problems.push(`помилки JS: ${errs.slice(0, 2).join(' | ')}`)
await b.close()
console.log(problems.length ? 'РОЗБІЖНОСТІ:\n  ' + problems.join('\n  ') : 'віджет Л11 збігається з текстом лекції ✓')
process.exit(problems.length ? 1 : 0)
