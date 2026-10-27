/**
 * Звірка віджета Л08 DbscanLab із даними генератора (tools/gen_lec08_dbscan.py):
 * ε зі зламу, крайні ε 0,10 і 0,40 і перемикач на K-means.
 *
 *   node check_lec08_widgets.mjs http://localhost:8235
 */
import puppeteer from 'puppeteer-core'
import { readFileSync } from 'node:fs'

const BASE = process.argv[2] ?? 'http://localhost:8235'
const d = JSON.parse(readFileSync('.vitepress/data/lec08_dbscan.json', 'utf8'))
const uk = v => v.toFixed(3).replace('.', ',')

const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' })
const p = await b.newPage()
const errs = []
p.on('pageerror', e => errs.push(e.message))
await p.setViewport({ width: 1300, height: 1000 })
await p.goto(BASE + '/lectures/08.html', { waitUntil: 'networkidle0' })
await p.waitForFunction(() => !!document.querySelector('#app')?.__vue_app__, { timeout: 30000 })

const problems = []
const eq = (what, got, want) => { if (got !== want) problems.push(`${what}: віджет «${got}», очікується «${want}»`) }
const pause = () => new Promise(r => setTimeout(r, 120))
const LAB = `[...document.querySelectorAll('.lab')].find(l => l.querySelector('.lab__title')?.textContent.includes('DBSCAN на півмісяцях'))`
const read = sel => p.evaluate(`${LAB}?.querySelector(${JSON.stringify(sel)})?.textContent.trim()`)
const slide = async i => { await p.evaluate(`(() => { const el = ${LAB}.querySelector('input[type=range]'); el.value = '${i}'; el.dispatchEvent(new Event('input', { bubbles: true })) })()`); await pause() }

const eps = d.runs.map(r => r.eps)
for (const [what, i] of [['ε зі зламу', eps.indexOf(d.knee)], ['ε = 0,10', eps.indexOf(0.1)], ['ε = 0,40', eps.indexOf(0.4)]]) {
  await slide(i)
  const r = d.runs[i]
  eq(`DbscanLab ${what}, ε`, await read('[data-check="eps"]'), uk(r.eps))
  eq(`DbscanLab ${what}, кластерів`, await read('[data-check="k"]'), String(r.k))
  eq(`DbscanLab ${what}, шум`, await read('[data-check="noise"]'), String(r.noise))
  eq(`DbscanLab ${what}, ARI`, await read('[data-check="ari"]'), uk(r.ari))
}
await p.evaluate(`${LAB}.querySelectorAll('.lab__pill')[1].dispatchEvent(new MouseEvent('click', { bubbles: true }))`)
await pause()
eq('DbscanLab K-means, ARI', await read('[data-check="km-ari"]'), uk(d.km.ari))

if (errs.length) problems.push(`помилки JS: ${errs.slice(0, 2).join(' | ')}`)
await b.close()
console.log(problems.length ? 'РОЗБІЖНОСТІ:\n  ' + problems.join('\n  ') : 'віджет Л08 збігається з даними генератора ✓')
process.exit(problems.length ? 1 : 0)
