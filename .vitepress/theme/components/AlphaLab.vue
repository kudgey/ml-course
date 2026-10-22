<script setup lang="ts">
/**
 * Двоїсті змінні α_n на тих самих 100 квітках versicolor і virginica, що в
 * SlackLab: SVC(kernel="linear", C = 1). |dual_coef_| scikit-learn — це
 * α_n ∈ [0, C] із формули лекції, тут C = 1. Клацання по точці
 * показує її α_n, 1 − η_n і рядок таблиці розділу «Значення альфа розказує, де
 * лежить точка»; праворуч ваги збираються як w = Σ α_n y_n x_n. Дані пише
 * tools/gen_lec07_svm.py, браузерну звірку робить check_lec07_widgets.mjs.
 */
import { ref, computed } from 'vue'
import d from '../../data/lec07_slack.json'

const X = d.X as number[][]
const Y = d.y as number[]
const A = d.alpha as number[]
const W = d.w as number[]
const W0 = d.w0 as number
const TOL = d.tol as number

const pts = X.map((x, i) => {
  const eta = Y[i] * (W[0] * x[0] + W[1] * x[1] + W0)
  const cat = eta > 1 + TOL ? 0 : eta < 1 - TOL ? 2 : 1
  return { x, y: Y[i], eta, a: A[i], cat }
})
const counts = [0, 1, 2].map(c => pts.filter(p => p.cat === c).length)
const nSV = pts.filter(p => p.a > 1e-8).length
const wA = [0, 1].map(j => pts.reduce((s, p) => s + p.a * p.y * p.x[j], 0))
const sumAY = pts.reduce((s, p) => s + p.a * p.y, 0)

const sel = ref(pts.findIndex(p => p.cat === 1 && p.a > 1e-8 && p.a < 1 - 1e-8))
const cur = computed(() => pts[sel.value])

const f = (v: number, nd: number) => (Math.abs(v) < 0.5 * 10 ** -nd ? 0 : v).toFixed(nd).replace('.', ',').replace('-', '−')
const ROWS = [
  ['за коридором, на своєму боці', 'η > 1', 'α = 0 — не впливає'],
  ['точно на межі коридору', 'η = 1', 'α від 0 до C'],
  ['усередині коридору або на чужому боці', 'η < 1', 'α = C — найбільший'],
]

const VW = 320, VH = 220, P = 26
const [X0, X1, Y0, Y1] = [2.8, 7.2, 0.9, 2.6]
const px = (v: number) => P + ((v - X0) / (X1 - X0)) * (VW - 2 * P)
const py = (v: number) => VH - P - ((v - Y0) / (Y1 - Y0)) * (VH - 2 * P)
function line(level: number) {
  const yAt = (x: number) => (level - W0 - W[0] * x) / W[1]
  return `${px(X0)},${py(yAt(X0))} ${px(X1)},${py(yAt(X1))}`
}
const COL: Record<number, string> = { [-1]: '#C2571A', 1: '#1E8E6A' }
</script>

<template>
  <div class="lab">
    <div class="lab__head">
      <div>
        <div class="lab__title">Двоїсті змінні α: внесок кожної квітки</div>
        <div class="lab__sub">
          Ті самі 100 квіток і та сама модель SVC з C = 1. Яскраві точки — опорні
          вектори (α &gt; 0), бліді — точки з α = 0. Клацніть по точці: віджет покаже
          її відступ η, внесок α і рядок таблиці, у який вона потрапляє.
        </div>
      </div>
    </div>

    <svg class="al__plot" :viewBox="`0 0 ${VW} ${VH}`" role="img" aria-label="Квітки, межа рішення, коридор і двоїсті змінні">
      <defs><clipPath id="al-clip"><rect :x="P" :y="P" :width="VW - 2 * P" :height="VH - 2 * P" /></clipPath></defs>
      <rect :x="P" :y="P" :width="VW - 2 * P" :height="VH - 2 * P" class="al__frame" />
      <g clip-path="url(#al-clip)">
        <polyline :points="line(1)" class="al__margin" />
        <polyline :points="line(-1)" class="al__margin" />
        <polyline :points="line(0)" class="al__bound" />
      </g>
      <g v-for="(p, i) in pts" :key="i" class="al__pt" @click="sel = i">
        <circle v-if="p.cat === 2" :cx="px(p.x[0])" :cy="py(p.x[1])" r="6.2" class="al__ring is-viol" />
        <circle v-if="p.cat === 1" :cx="px(p.x[0])" :cy="py(p.x[1])" r="6.2" class="al__ring is-edge" />
        <circle :cx="px(p.x[0])" :cy="py(p.x[1])" :r="p.a > 1e-8 ? 3.4 : 2.6" :fill="COL[p.y]"
                :opacity="p.a > 1e-8 ? 0.95 : 0.4" />
        <circle :cx="px(p.x[0])" :cy="py(p.x[1])" r="8" fill="transparent" />
      </g>
      <circle :cx="px(cur.x[0])" :cy="py(cur.x[1])" r="9" class="al__sel" />
      <text :x="VW / 2" :y="VH - 5" class="al__lbl" text-anchor="middle">довжина пелюстки, см</text>
      <text :x="9" :y="VH / 2" class="al__lbl" text-anchor="middle" :transform="`rotate(-90 9 ${VH / 2})`">ширина пелюстки, см</text>
    </svg>

    <p class="al__who">
      Квітка: довжина {{ f(cur.x[0], 1) }} см, ширина {{ f(cur.x[1], 1) }} см,
      {{ cur.y > 0 ? 'virginica (y = +1)' : 'versicolor (y = −1)' }};
      η = <b data-check="eta">{{ f(cur.eta, 3) }}</b>, внесок α = <b data-check="alpha">{{ f(cur.a, 3) }}</b>.
    </p>
    <div class="al__table">
      <div v-for="(r, c) in ROWS" :key="c" class="al__row" :class="{ 'is-on': cur.cat === c }">
        <span>{{ r[0] }}</span><span>{{ r[1] }}</span><span>{{ r[2] }}</span>
      </div>
    </div>

    <div class="lab__stats">
      <div class="lab__stat"><b data-check="c0">{{ counts[0] }}</b><span>за коридором</span></div>
      <div class="lab__stat"><b data-check="c1">{{ counts[1] }}</b><span>на межі коридору</span></div>
      <div class="lab__stat is-warm"><b data-check="c2">{{ counts[2] }}</b><span>порушників, α = C = 1</span></div>
      <div class="lab__stat"><b data-check="nsv">{{ nSV }}</b><span>опорних векторів, α &gt; 0</span></div>
      <div class="lab__stat is-green"><b data-check="w">({{ f(wA[0], 3) }}; {{ f(wA[1], 3) }})</b><span>w = Σ αₙ yₙ xₙ</span></div>
    </div>

    <p class="lab__note">
      Ваги, зібрані лише з опорних векторів, — ({{ f(wA[0], 3) }}; {{ f(wA[1], 3) }}) —
      збігаються з тими, що повертає SVC: ({{ f(W[0], 3) }}; {{ f(W[1], 3) }}). 75 квіток
      за коридором мають α = 0 і на межу не впливають. 21 порушник має найбільший
      внесок α = C = 1. На межі коридору лежать 4 квітки, їхні внески — 0, 0,707 і 1.
      Разом опорних векторів 24. Внески класів урівноважені: сума α·y дорівнює
      {{ f(sumAY, 3) }}.
    </p>
  </div>
</template>

<style scoped>
.al__plot {
  width: 100%;
  max-width: 560px;
  height: auto;
  display: block;
  margin: 0.4rem auto 0.4rem;
  border: 1px solid var(--uk-line);
  border-radius: 8px;
  background: var(--vp-c-bg);
}
.al__frame { fill: none; stroke: var(--uk-line); }
.al__bound { fill: none; stroke: var(--vp-c-text-1); stroke-width: 1.8; }
.al__margin { fill: none; stroke: var(--vp-c-text-3); stroke-width: 1.2; stroke-dasharray: 5 4; }
.al__ring { fill: none; stroke-width: 1.6; }
.al__ring.is-viol { stroke: #B3312C; }
.al__ring.is-edge { stroke: #6B4C9A; stroke-width: 2; }
.al__sel { fill: none; stroke: var(--vp-c-text-1); stroke-width: 1.4; stroke-dasharray: 2 2; pointer-events: none; }
.al__pt { cursor: pointer; }
.al__lbl { fill: var(--vp-c-text-3); font-size: 9.5px; }
.al__who { font-size: 0.86rem; color: var(--vp-c-text-2); margin: 0.2rem 0 0.4rem; }
.al__table { display: grid; gap: 2px; margin-bottom: 0.7rem; font-size: 0.8rem; }
.al__row {
  display: grid;
  grid-template-columns: minmax(0, 2.2fr) minmax(0, 1fr) minmax(0, 1.4fr);
  gap: 0.5rem;
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
  background: var(--uk-fill);
  color: var(--vp-c-text-2);
}
.al__row.is-on { background: var(--uk-warm-soft); color: var(--vp-c-text-1); font-weight: 600; }
</style>
