/**
 * Гейт мобільної верстки: чи не ширша сторінка за екран телефона.
 *
 *   node check_mobile.mjs http://localhost:8235 [ширина=375]
 *
 * Для кожної сторінки з .vitepress/dist міряє:
 *   · переповнення документа: scrollWidth − ширина екрана;
 *   · елементи .vp-doc, що вилазять за правий край більш ніж на 2 px і НЕ
 *     сидять у контейнері з власною прокруткою чи обрізанням (таблиця або
 *     формула, що гортається всередині себе, — це норма, а не дефект).
 * Код виходу 1, якщо хоч одна сторінка переповнена.
 *
 * Порівнюємо з ЗАДАНОЮ шириною, а не з innerWidth. В емуляції телефона
 * (isMobile) Chrome, побачивши зашироку сторінку, сам розсуває вікно до
 * ширини вмісту — і перевірка «scrollWidth ≤ innerWidth» тоді завжди
 * проходить. Саме так перша версія цього гейта дала 0 px там, де насправді
 * було 247.
 */
import puppeteer from 'puppeteer-core'
import { readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const BASE = process.argv[2] ?? 'http://localhost:8235'
const W = Number(process.argv[3] ?? 375)
const DIST = '.vitepress/dist'
const pages = []
;(function walk(d) {
  for (const f of readdirSync(d)) {
    const p = join(d, f)
    if (statSync(p).isDirectory()) { if (!['assets', 'figs', 'labs'].includes(f)) walk(p) }
    else if (f.endsWith('.html') && f !== '404.html') pages.push('/' + relative(DIST, p).replace(/index\.html$/, '').replace(/\.html$/, ''))
  }
})(DIST)
pages.sort()

const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' })
const p = await b.newPage()
await p.setViewport({ width: W, height: 800, deviceScaleFactor: 1 })
let bad = 0
for (const path of pages) {
  // Повний шлях із .html: простий локальний сервер «чистих» адрес не знає й
  // віддає 404 — а порожня сторінка 404 проходить будь-яку перевірку ширини.
  const url = BASE + (path === '/' ? '/index.html' : path + '.html')
  const resp = await p.goto(url, { waitUntil: 'networkidle0', timeout: 90000 })
  const real = resp && resp.ok() && await p.evaluate(() => !!document.querySelector('.vp-doc h1, .vp-doc h2, .home, .VPHome'))
  if (!real) { console.log(`${path.padEnd(14)} ✗ сторінка не відкрилася (${resp && resp.status()})`); bad++; continue }
  const r = await p.evaluate((vw) => {
    const clips = el => {
      for (let a = el.parentElement; a && !a.classList.contains('vp-doc'); a = a.parentElement) {
        const o = getComputedStyle(a).overflowX
        if (o === 'auto' || o === 'scroll' || o === 'hidden' || o === 'clip') return true
      }
      return false
    }
    const off = []
    for (const el of document.querySelectorAll('.vp-doc *')) {
      const rc = el.getBoundingClientRect()
      if (rc.width === 0 || rc.right <= vw + 2 || clips(el)) continue
      if (el.parentElement && off.includes(el.parentElement)) continue      // лише зовнішній
      off.push(el)
    }
    const top = off.map(el => {
      let h = el; while (h && !/^H[23]$/.test(h.tagName)) h = h.previousElementSibling || h.parentElement
      const sec = [...document.querySelectorAll('.vp-doc h2')].filter(x => x.getBoundingClientRect().top <= el.getBoundingClientRect().top).pop()
      return { what: el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : ''),
               px: Math.round(el.getBoundingClientRect().right - vw),
               sec: sec ? sec.textContent.replace('​', '').trim().slice(0, 48) : '—' }
    }).sort((a, b) => b.px - a.px)
    // Віджети: вміст не ширший за власну рамку .lab (повзунки, поля, легенди, SVG).
    const labs = [...document.querySelectorAll('.vp-doc .lab')].map(lab => {
      const edge = lab.getBoundingClientRect().right
      let worst = 0, who = ''
      for (const el of lab.querySelectorAll('*')) {
        let inner = false
        for (let a = el.parentElement; a && a !== lab; a = a.parentElement) {
          const o = getComputedStyle(a).overflowX
          if (o === 'auto' || o === 'scroll') { inner = true; break }
        }
        const r = el.getBoundingClientRect()
        if (inner || r.width === 0) continue
        if (r.right - edge > worst) { worst = r.right - edge; who = el.tagName.toLowerCase() + '.' + String(el.className.baseVal ?? el.className).split(' ')[0] }
      }
      const title = (lab.querySelector('.lab__title') || {}).textContent || '?'
      return { title: title.trim().slice(0, 40), px: Math.round(worst), who }
    }).filter(x => x.px > 2)
    return { doc: document.documentElement.scrollWidth - vw, n: top.length, top: top.slice(0, 4), labs }
  }, W)
  if (r.doc > 0 || r.n || r.labs.length) bad++
  console.log(`${path.padEnd(14)} переповнення ${String(r.doc).padStart(4)} px · елементів за краєм ${r.n}` +
    (r.top.length ? '\n' + r.top.map(t => `      ${String(t.px).padStart(4)} px  ${t.what.padEnd(22)} ${t.sec}`).join('\n') : '') +
    (r.labs.length ? '\n' + r.labs.map(l => `      віджет «${l.title}»: ${l.who} на ${l.px} px за рамкою`).join('\n') : ''))
}
await b.close()
console.log(bad ? `\nСТОРІНОК ІЗ ПЕРЕПОВНЕННЯМ: ${bad}` : '\nПЕРЕПОВНЕННЯ НЕМАЄ')
process.exit(bad ? 1 : 0)
