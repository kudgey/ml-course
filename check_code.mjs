/**
 * Гейт оформлення коду на сторінках лекцій (зразок — курс IMD).
 *
 *   node check_code.mjs http://localhost:8235
 *
 * Для кожної лекції з .vitepress/dist перевіряє:
 *   · код згорнуто за замовчуванням — тіло кожного <CodeFold> не видно;
 *   · клік по шапці першого блока показує код, повторний — ховає;
 *   · під кожним блоком із виводом (<RunOutput>) вивід видно одразу
 *     і є рядок «На що дивитися»;
 *   · фрагменти (fragment) не мають виводу;
 *   · на сторінці немає жодної помилки JavaScript (pageerror).
 * Код виходу 1, якщо хоч щось не так. Ширину телефона перевіряє check_mobile.mjs.
 */
import puppeteer from 'puppeteer-core'
import { readdirSync } from 'node:fs'

const BASE = process.argv[2] ?? 'http://localhost:8235'
const pages = readdirSync('.vitepress/dist/lectures')
  .filter(f => /^\d\d\.html$/.test(f)).sort().map(f => '/lectures/' + f)

const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' })
const problems = []
const tot = { blocks: 0, outputs: 0, fragments: 0 }
for (const path of pages) {
  const p = await b.newPage()
  const errs = []
  p.on('pageerror', e => errs.push(e.message.slice(0, 100)))
  await p.setViewport({ width: 1400, height: 900 })
  const resp = await p.goto(BASE + path, { waitUntil: 'networkidle0', timeout: 90000 })
  if (!resp || !resp.ok()) { problems.push(`${path}: HTTP ${resp && resp.status()}`); await p.close(); continue }
  const r = await p.evaluate(() => {
    const vis = el => !!el && el.getClientRects().length > 0
    const cfs = [...document.querySelectorAll('.cf')]
    const ros = [...document.querySelectorAll('.ro')]
    return {
      blocks: cfs.length,
      fragments: cfs.filter(c => c.classList.contains('is-fragment')).length,
      openByDefault: cfs.filter(c => vis(c.querySelector('.cf__body'))).length,
      emptyCode: cfs.filter(c => !c.querySelector('.cf__body pre code')?.textContent.trim()).length,
      outputs: ros.length,
      hiddenOut: ros.filter(o => !vis(o.querySelector('.ro__body pre'))).length,
      noNote: ros.filter(o => !/На що дивитися/.test(o.querySelector('.ro__note')?.textContent || '')).length,
      // RunOutput має стояти одразу під своїм CodeFold, а фрагмент — без виводу
      orphanOut: ros.filter(o => !o.previousElementSibling?.classList.contains('cf')).length,
      fragWithOut: cfs.filter(c => c.classList.contains('is-fragment') && c.nextElementSibling?.classList.contains('ro')).length,
      codeNoOut: cfs.filter(c => !c.classList.contains('is-fragment') && !c.nextElementSibling?.classList.contains('ro')).length,
    }
  })
  // клік: перший блок розгортається й згортається
  let toggle = 'немає блоків'
  if (r.blocks) {
    // VitePress прокручує плавно (scroll-behavior: smooth): поки сторінка їде,
    // клік puppeteer влучає в порожнє місце. Для перевірки вимикаємо плавність.
    await p.addStyleTag({ content: 'html { scroll-behavior: auto !important }' })
    // до гідратації Vue кнопка ще без обробника: чекаємо, поки застосунок змонтується
    await p.waitForFunction(() => !!document.querySelector('#app')?.__vue_app__, { timeout: 30000 })
    const head = await p.$('.cf .cf__head')
    const until = f => p.waitForFunction(f, { timeout: 10000 }).then(() => true, () => false)
    // Шапку ставимо в центр екрана (біля краю її накриває закріплена навігація)
    // і чекаємо, поки вона перестане рухатися: ліниві рисунки вище догружаються
    // й зсувають сторінку, а клік у старі координати влучає повз. Під навантаженням
    // це траплялося на різних сторінках при кожному прогоні — звідси й повтори.
    const settle = async () => {
      await head.evaluate(e => e.scrollIntoView({ block: 'center' }))
      let prev = null
      for (let k = 0; k < 20; k++) {
        await new Promise(res => setTimeout(res, 150))
        const y = await head.evaluate(e => Math.round(e.getBoundingClientRect().top))
        if (y === prev) break
        prev = y
      }
      return head.evaluate(e => {
        const r = e.getBoundingClientRect()
        return e.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2))
      })
    }
    let onTop = false, opened = false, closed = false
    for (let attempt = 0; attempt < 3 && !opened; attempt++) {
      onTop = await settle()
      await head.click()
      opened = await until(() => {
        const body = document.querySelector('.cf .cf__body')
        return body.getClientRects().length > 0 && body.querySelector('pre').getBoundingClientRect().height > 20
      })
    }
    // «накриває» — лише пояснення до невдалого кліку, а не окрема вада
    if (!opened && !onTop) problems.push(`${path}: шапку першого блока щось накриває`)
    for (let attempt = 0; attempt < 3 && opened && !closed; attempt++) {
      await settle()
      await head.click()
      closed = await until(() => document.querySelector('.cf .cf__body').getClientRects().length === 0)
    }
    toggle = opened && closed ? 'ok' : `відкрився=${opened} закрився=${closed}`
    if (toggle !== 'ok') problems.push(`${path}: клік по шапці: ${toggle}`)
  }
  tot.blocks += r.blocks; tot.outputs += r.outputs; tot.fragments += r.fragments
  const bad = []
  if (r.openByDefault) bad.push(`розгорнуто за замовчуванням ${r.openByDefault}`)
  if (r.emptyCode) bad.push(`порожніх блоків ${r.emptyCode}`)
  if (r.hiddenOut) bad.push(`прихованих виводів ${r.hiddenOut}`)
  if (r.noNote) bad.push(`виводів без «На що дивитися» ${r.noNote}`)
  if (r.orphanOut) bad.push(`виводів не під блоком ${r.orphanOut}`)
  if (r.fragWithOut) bad.push(`фрагментів із виводом ${r.fragWithOut}`)
  if (r.codeNoOut) bad.push(`блоків без виводу ${r.codeNoOut}`)
  if (errs.length) bad.push(`помилок JS ${errs.length}: ${errs[0]}`)
  if (bad.length) problems.push(`${path}: ${bad.join('; ')}`)
  console.log(`${path.padEnd(18)} блоків ${String(r.blocks).padStart(2)} · з виводом ${String(r.outputs).padStart(2)} · фрагментів ${r.fragments} · клік ${toggle} · помилок JS ${errs.length}`)
  await p.close()
}
await b.close()
console.log(`\nразом: блоків ${tot.blocks}, з виводом ${tot.outputs}, фрагментів ${tot.fragments}`)
console.log(problems.length ? 'ПРОБЛЕМИ:\n  ' + problems.join('\n  ') : 'проблем не знайдено ✓')
process.exit(problems.length ? 1 : 0)
