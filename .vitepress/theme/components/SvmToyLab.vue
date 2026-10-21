<script setup lang="ts">
/**
 * SVM на шести умовних точках A–F, усе руками. Повзунки задають w₁, w₂ і w₀;
 * для кожної точки віджет рахує g = w₁x₁ + w₂x₂ + w₀, η = y·g, ξ = max(0, 1 − η)
 * і відстань |g|/‖w‖, а внизу — ширину коридору 2/‖w‖ і ціль ½‖w‖² + C·Σξ з
 * C = 1. Кнопка ставить розв'язок SVC(kernel="linear") зі scikit-learn:
 * w = (0,4; 0,4), w₀ = −2,2. Дані пише tools/gen_lec07_svm.py і звіряє ці
 * числа з розрахунком у тексті розділу.
 */
import { ref, computed } from 'vue'
import data from '../../data/lec07_toy.json'

const T = data.toy
const NAMES = T.names as string[]
const X = T.X as number[][]
const Y = T.y as number[]
const C = T.C as number

const w1 = ref(T.w[0] as number)
const w2 = ref(T.w[1] as number)
const w0 = ref(T.w0 as number)
const sel = ref(0)

const norm = computed(() => Math.hypot(w1.value, w2.value))
const rows = computed(() => X.map((x, i) => {
  const g = w1.value * x[0] + w2.value * x[1] + w0.value
  const eta = Y[i] * g
  return { name: NAMES[i], x, y: Y[i], g, eta, xi: Math.max(0, 1 - eta), dist: Math.abs(g) / norm.value }
}))
const minEta = computed(() => Math.min(...rows.value.map(r => r.eta)))
const sumXi = computed(() => rows.value.reduce((s, r) => s + r.xi, 0))
const obj = computed(() => 0.5 * norm.value * norm.value + C * sumXi.value)
const cur = computed(() => rows.value[sel.value])

const f = (v: number, nd = 2) => (Math.abs(v) < 0.5 * 10 ** -nd ? 0 : v).toFixed(nd).replace('.', ',').replace('-', '−')
const sgn = (v: number) => (v < 0 ? ' − ' + f(-v) : ' + ' + f(v))
function optimum() { w1.value = T.w[0]; w2.value = T.w[1]; w0.value = T.w0 }

const VW = 300, VH = 270, P = 26
const [X0, X1, Y0, Y1] = [-0.5, 6.5, -0.5, 7]
const px = (v: number) => P + ((v - X0) / (X1 - X0)) * (VW - 2 * P)
const py = (v: number) => VH - P - ((v - Y0) / (Y1 - Y0)) * (VH - 2 * P)
function line(level: number) {            // точки, де g = level
  if (Math.abs(w2.value) > 1e-6) {
    const yAt = (x: number) => (level - w0.value - w1.value * x) / w2.value
    return `${px(X0)},${py(yAt(X0))} ${px(X1)},${py(yAt(X1))}`
  }
  const xc = (level - w0.value) / w1.value
  return `${px(xc)},${py(Y0)} ${px(xc)},${py(Y1)}`
}
const COL: Record<number, string> = { [-1]: '#2F6DB5', 1: '#C2571A' }
</script>

<template>
  <div class="lab">
    <div class="lab__head">
      <div>
        <div class="lab__title">SVM на шести точках: усе руками</div>
        <div class="lab__sub">
          Пряма g(x) = w₁x₁ + w₂x₂ + w₀ = 0 ділить площину; штрихові — лінії g = −1 і
          g = +1, межі коридору. Рухайте ваги й дивіться, як змінюються η, ξ і ширина
          коридору. Клацніть по точці — побачите її розрахунок.
        </div>
      </div>
    </div>

    <div class="st__grid">
      <svg class="st__plot" :viewBox="`0 0 ${VW} ${VH}`" role="img" aria-label="Шість точок, межа і коридор">
        <defs><clipPath id="st-clip"><rect :x="P" :y="P" :width="VW - 2 * P" :height="VH - 2 * P" /></clipPath></defs>
        <rect :x="P" :y="P" :width="VW - 2 * P" :height="VH - 2 * P" class="st__frame" />
        <g clip-path="url(#st-clip)">
          <polyline :points="line(1)" class="st__margin" />
          <polyline :points="line(-1)" class="st__margin" />
          <polyline :points="line(0)" class="st__bound" />
        </g>
        <g v-for="(r, i) in rows" :key="i" class="st__pt" @click="sel = i">
          <circle v-if="r.eta <= 1 + 1e-6" :cx="px(r.x[0])" :cy="py(r.x[1])" r="10" class="st__ring" />
          <circle :cx="px(r.x[0])" :cy="py(r.x[1])" r="6" :fill="COL[r.y]" />
          <text :x="px(r.x[0]) + 9" :y="py(r.x[1]) - 8" class="st__name">{{ r.name }}</text>
          <circle :cx="px(r.x[0])" :cy="py(r.x[1])" r="12" fill="transparent" />
        </g>
        <circle :cx="px(cur.x[0])" :cy="py(cur.x[1])" r="13" class="st__sel" />
        <text :x="VW / 2" :y="VH - 6" class="st__lbl" text-anchor="middle">x₁</text>
        <text :x="10" :y="VH / 2" class="st__lbl" text-anchor="middle">x₂</text>
      </svg>

      <div class="st__side">
        <label class="lab__ctl">
          <span>w₁ = <b>{{ f(w1) }}</b></span>
          <input type="range" min="-0.2" max="1.2" step="0.02" v-model.number="w1" />
        </label>
        <label class="lab__ctl">
          <span>w₂ = <b>{{ f(w2) }}</b></span>
          <input type="range" min="-0.2" max="1.2" step="0.02" v-model.number="w2" />
        </label>
        <label class="lab__ctl">
          <span>w₀ = <b>{{ f(w0) }}</b></span>
          <input type="range" min="-6" max="0" step="0.05" v-model.number="w0" />
        </label>
        <button class="lab__pill" @click="optimum">оптимум SVM (scikit-learn)</button>
        <p class="st__calc">
          <b>{{ cur.name }}</b> = ({{ f(cur.x[0], 0) }}; {{ f(cur.x[1], 0) }}), y = {{ cur.y > 0 ? '+1' : '−1' }}<br>
          g = {{ f(w1) }}·{{ f(cur.x[0], 0) }} + {{ f(w2) }}·{{ f(cur.x[1], 0) }}{{ sgn(w0) }} = <b data-check="g">{{ f(cur.g) }}</b><br>
          η = y·g = <b data-check="eta">{{ f(cur.eta) }}</b>, ξ = max(0, 1 − η) = <b data-check="xi">{{ f(cur.xi) }}</b><br>
          відстань = |g| / ‖w‖ = {{ f(Math.abs(cur.g)) }} / {{ f(norm, 3) }} = <b data-check="dist">{{ f(cur.dist) }}</b>
        </p>
      </div>
    </div>

    <div class="st__table">
      <div class="st__row st__hd"><span>точка</span><span>(x₁; x₂)</span><span>y</span><span>g</span><span>η</span><span>ξ</span><span>відстань</span></div>
      <div v-for="(r, i) in rows" :key="i" class="st__row" :class="{ 'is-on': i === sel }" @click="sel = i">
        <span>{{ r.name }}</span><span>({{ r.x[0] }}; {{ r.x[1] }})</span><span>{{ r.y > 0 ? '+1' : '−1' }}</span>
        <span>{{ f(r.g) }}</span><span>{{ f(r.eta) }}</span><span>{{ f(r.xi) }}</span><span>{{ f(r.dist) }}</span>
      </div>
    </div>

    <div class="lab__stats">
      <div class="lab__stat"><b data-check="norm">{{ f(norm, 3) }}</b><span>‖w‖ = √(w₁² + w₂²)</span></div>
      <div class="lab__stat is-green"><b data-check="width">{{ f(2 / norm, 2) }}</b><span>ширина коридору 2/‖w‖</span></div>
      <div class="lab__stat" :class="minEta >= 1 - 1e-6 ? '' : 'is-warm'"><b data-check="mineta">{{ f(minEta) }}</b><span>найменше η: умова η ≥ 1 {{ minEta >= 1 - 1e-6 ? 'виконана' : 'порушена' }}</span></div>
      <div class="lab__stat"><b data-check="sumxi">{{ f(sumXi) }}</b><span>Σξ</span></div>
      <div class="lab__stat"><b data-check="obj">{{ f(obj, 3) }}</b><span>½‖w‖² + C·Σξ, C = 1</span></div>
    </div>

    <p class="lab__note">
      На оптимумі w = (0,4; 0,4), w₀ = −2,2: точки A, B і D лежать рівно на межах
      коридору (η = 1) — це опорні вектори, а C, E і F мають η від 1,4 до 1,8.
      ‖w‖ = 0,566, ширина коридору 3,54, ½‖w‖² = 0,160. Збільште w₁ і w₂ разом —
      коридор звузиться, ціль зросте. Зменште — коридор розшириться, але A, B і D
      зайдуть усередину (η &lt; 1), з'являться ξ &gt; 0, і ціль знову зросте.
    </p>
  </div>
</template>

<style scoped>
.st__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 0.8rem;
  margin: 0.4rem 0 0.6rem;
  align-items: start;
}
.st__plot {
  width: 100%;
  height: auto;
  display: block;
  border: 1px solid var(--uk-line);
  border-radius: 8px;
  background: var(--vp-c-bg);
}
.st__side { display: grid; gap: 0.5rem; align-content: start; }
.st__frame { fill: none; stroke: var(--uk-line); }
.st__bound { fill: none; stroke: var(--vp-c-text-1); stroke-width: 2; }
.st__margin { fill: none; stroke: var(--vp-c-text-3); stroke-width: 1.3; stroke-dasharray: 5 4; }
.st__ring { fill: none; stroke: #6B4C9A; stroke-width: 2; }
.st__sel { fill: none; stroke: var(--vp-c-text-1); stroke-width: 1.3; stroke-dasharray: 2 2; pointer-events: none; }
.st__pt { cursor: pointer; }
.st__name { fill: var(--vp-c-text-1); font-size: 11px; font-weight: 600; }
.st__lbl { fill: var(--vp-c-text-3); font-size: 10px; }
.st__calc {
  margin: 0.2rem 0 0;
  padding: 0.5rem 0.6rem;
  border-radius: 8px;
  background: var(--uk-fill);
  font-size: 0.82rem;
  line-height: 1.6;
  font-variant-numeric: tabular-nums;
}
.st__table { display: grid; gap: 2px; margin: 0.2rem 0 0.8rem; font-size: 0.78rem; overflow-x: auto; }
.st__row {
  display: grid;
  grid-template-columns: 0.7fr 1.2fr 0.6fr repeat(4, 1fr);
  gap: 0.3rem;
  padding: 0.2rem 0.4rem;
  border-radius: 5px;
  background: var(--uk-fill);
  font-variant-numeric: tabular-nums;
  cursor: pointer;
  min-width: 400px;
}
.st__row.is-on { background: var(--uk-warm-soft); font-weight: 600; }
.st__hd { background: transparent; color: var(--vp-c-text-3); font-size: 0.72rem; cursor: default; }
</style>
