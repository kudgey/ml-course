<script setup lang="ts">
/**
 * Слекові змінні й hinge-втрата руками: 100 квіток versicolor і virginica,
 * SVC(kernel="linear", C = 1), як на рисунку розділу «Реальні класи
 * перекриваються». Повзунки зсувають межу вздовж нормалі й змінюють довжину
 * вектора ваг; для кожної квітки віджет рахує η_n = y_n(wᵀx_n + w₀) і
 * ξ_n = max(0, 1 − η_n), а з них — ціль λ/2‖w‖² + (1/N)Σξ_n з λ = 1/(C N).
 * Дані й еталонні числа пише tools/gen_lec07_svm.py і звіряє з текстом;
 * у браузері їх перевіряє course-site/check_lec07_widgets.mjs.
 */
import { ref, computed } from 'vue'
import d from '../../data/lec07_slack.json'

const X = d.X as number[][]
const Y = d.y as number[]
const W = d.w as number[]
const W0 = d.w0 as number
const NW = Math.hypot(W[0], W[1])
const N = Y.length

const shift = ref(0)       // зсув межі вздовж нормалі, см
const k = ref(0)           // масштаб ваг s = 2^(k/10)
const s = computed(() => Math.pow(2, k.value / 10))
const w0 = computed(() => s.value * (W0 - shift.value * NW))
const w = computed(() => [s.value * W[0], s.value * W[1]])

const rows = computed(() => X.map((x, i) => {
  const eta = Y[i] * (w.value[0] * x[0] + w.value[1] * x[1] + w0.value)
  return { x, y: Y[i], eta, xi: Math.max(0, 1 - eta) }
}))
const sumXi = computed(() => rows.value.reduce((a, r) => a + r.xi, 0))
const viol = computed(() => rows.value.filter(r => r.xi > d.tol).length)
const wrong = computed(() => rows.value.filter(r => r.eta < 0).length)
const width = computed(() => 2 / (s.value * NW))
const obj = computed(() => d.lam / 2 * s.value * s.value * NW * NW + sumXi.value / N)

const f = (v: number, nd: number) => v.toFixed(nd).replace('.', ',').replace('-', '−')
function reset() { shift.value = 0; k.value = 0 }

/** Полотно: довжина пелюстки по горизонталі, ширина — по вертикалі. */
const VW = 320, VH = 220, P = 26
const [X0, X1, Y0, Y1] = [2.8, 7.2, 0.9, 2.6]
const px = (v: number) => P + ((v - X0) / (X1 - X0)) * (VW - 2 * P)
const py = (v: number) => VH - P - ((v - Y0) / (Y1 - Y0)) * (VH - 2 * P)
function line(level: number) {        // точки, де wᵀx + w₀ = level
  const [a, b] = w.value
  const yAt = (x: number) => (level - w0.value - a * x) / b
  return `${px(X0)},${py(yAt(X0))} ${px(X1)},${py(yAt(X1))}`
}
const COL: Record<number, string> = { [-1]: '#C2571A', 1: '#1E8E6A' }
</script>

<template>
  <div class="lab">
    <div class="lab__head">
      <div>
        <div class="lab__title">Слекові змінні: скільки коштує кожна квітка</div>
        <div class="lab__sub">
          Ті самі 100 квіток, що на рисунку з м'яким відступом. Посуньте межу або
          змініть довжину вектора ваг — для кожної квітки ξ = max(0, 1 − η)
          перераховується тут-таки, а з ними й ціль λ/2·‖w‖² + (1/N)·Σξ.
        </div>
      </div>
    </div>

    <svg class="sl__plot" :viewBox="`0 0 ${VW} ${VH}`" role="img" aria-label="Квітки, межа рішення і коридор">
      <defs><clipPath id="sl-clip"><rect :x="P" :y="P" :width="VW - 2 * P" :height="VH - 2 * P" /></clipPath></defs>
      <rect :x="P" :y="P" :width="VW - 2 * P" :height="VH - 2 * P" class="sl__frame" />
      <g clip-path="url(#sl-clip)">
        <polyline :points="line(1 / s)" class="sl__margin" />
        <polyline :points="line(-1 / s)" class="sl__margin" />
        <polyline :points="line(0)" class="sl__bound" />
      </g>
      <g v-for="(r, i) in rows" :key="i">
        <circle v-if="r.xi > d.tol" :cx="px(r.x[0])" :cy="py(r.x[1])" r="6.2" class="sl__ring" />
        <circle :cx="px(r.x[0])" :cy="py(r.x[1])" r="3.1" :fill="COL[r.y]" opacity="0.85">
          <title>η = {{ f(r.eta, 3) }}, ξ = {{ f(r.xi, 3) }}</title>
        </circle>
      </g>
      <text :x="VW / 2" :y="VH - 5" class="sl__lbl" text-anchor="middle">довжина пелюстки, см</text>
      <text :x="9" :y="VH / 2" class="sl__lbl" text-anchor="middle" :transform="`rotate(-90 9 ${VH / 2})`">ширина пелюстки, см</text>
      <text :x="VW - P - 4" :y="VH - P - 18" class="sl__lbl sl__o" text-anchor="end">● versicolor (y = −1)</text>
      <text :x="VW - P - 4" :y="VH - P - 6" class="sl__lbl sl__g" text-anchor="end">● virginica (y = +1)</text>
    </svg>

    <div class="lab__controls">
      <label class="lab__ctl">
        <span>зсув межі вздовж нормалі: <b>{{ f(shift, 2) }} см</b></span>
        <input type="range" min="-0.6" max="0.6" step="0.02" v-model.number="shift" />
      </label>
      <label class="lab__ctl">
        <span>масштаб ваг s = <b>{{ f(s, 2) }}</b></span>
        <input type="range" min="-20" max="20" step="1" v-model.number="k" />
      </label>
    </div>
    <div class="lab__pills">
      <button class="lab__pill" :class="{ 'is-on': shift === 0 && k === 0 }" @click="reset">оптимум SVM (C = 1)</button>
    </div>

    <div class="lab__stats">
      <div class="lab__stat"><b data-check="sumxi">{{ f(sumXi, 1) }}</b><span>сума ξ</span></div>
      <div class="lab__stat"><b data-check="viol">{{ viol }}</b><span>порушників, ξ &gt; 10⁻³</span></div>
      <div class="lab__stat is-warm"><b data-check="wrong">{{ wrong }}</b><span>помилок класифікації</span></div>
      <div class="lab__stat"><b data-check="width">{{ f(width, 2) }}</b><span>ширина коридору 2/‖w‖, см</span></div>
      <div class="lab__stat is-green"><b data-check="obj">{{ f(obj, 4) }}</b><span>ціль λ/2·‖w‖² + (1/N)·Σξ</span></div>
    </div>

    <p class="lab__note">
      На оптимумі SVM — 21 порушник, сума ξ = 13,6 і 5 помилок; ціль дорівнює 0,1849.
      Збільште s: коридор вужчий, порушників і Σξ менше, але штраф λ/2·‖w‖² росте
      швидше, і ціль зростає. Зменште s: коридор ширшає, штраф за ваги падає, проте
      Σξ росте ще швидше. Зсув межі в будь-який бік теж піднімає ціль. Саме цю суму
      і мінімізує SVM, а λ = 1/(C·N) = 0,01 визначає, що важить більше.
    </p>
  </div>
</template>

<style scoped>
.sl__plot {
  width: 100%;
  max-width: 560px;
  height: auto;
  display: block;
  margin: 0.4rem auto 0.6rem;
  border: 1px solid var(--uk-line);
  border-radius: 8px;
  background: var(--vp-c-bg);
}
.sl__frame { fill: none; stroke: var(--uk-line); }
.sl__bound { fill: none; stroke: var(--vp-c-text-1); stroke-width: 1.8; }
.sl__margin { fill: none; stroke: var(--vp-c-text-3); stroke-width: 1.2; stroke-dasharray: 5 4; }
.sl__ring { fill: none; stroke: #B3312C; stroke-width: 1.6; }
.sl__lbl { fill: var(--vp-c-text-3); font-size: 9.5px; }
.sl__o { fill: #C2571A; }
.sl__g { fill: #1E8E6A; }
</style>
