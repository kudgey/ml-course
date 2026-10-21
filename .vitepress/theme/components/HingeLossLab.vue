<script setup lang="ts">
/**
 * Дві втрати на шести умовних точках на прямій: x = −3, −2, −1 (клас −1) і
 * 1, 2, 4 (клас +1), модель g(x) = w·x + w₀. Для кожної точки віджет рахує
 * η = y·g(x), перехресну ентропію ln(1 + e^(−η)), hinge max(0, 1 − η) і те,
 * наскільки точка тягне ваги: σ(−η) для ентропії, 1 або 0 для hinge. Внизу —
 * обидві цілі з однаковим штрафом λ/2·w², λ = 0,1. Оптимуми й еталонні числа
 * рахує tools/gen_lec07_svm.py і звіряє з текстом розділу.
 */
import { ref, computed } from 'vue'
import data from '../../data/lec07_toy.json'

const D = data.loss
const X = D.x as number[]
const Y = D.y as number[]
const LAM = D.lam as number

const w = ref(0.5)
const w0 = ref(0)

const sig = (z: number) => 1 / (1 + Math.exp(-z))
const rows = computed(() => X.map((x, i) => {
  const eta = Y[i] * (w.value * x + w0.value)
  return { x, y: Y[i], eta, log: Math.log1p(Math.exp(-eta)), hinge: Math.max(0, 1 - eta), pull: sig(-eta) }
}))
const mean = (k: 'log' | 'hinge') => rows.value.reduce((s, r) => s + r[k], 0) / X.length
const mLog = computed(() => mean('log'))
const mHinge = computed(() => mean('hinge'))
const pen = computed(() => LAM / 2 * w.value * w.value)
const p1 = computed(() => sig(w.value * 1 + w0.value))

/** Обидві цілі як функції w при поточному w₀ — звідки беруться мінімуми. */
const WS = Array.from({ length: 146 }, (_, i) => 0.1 + i * 0.02)
const jAt = (wv: number, k: 'log' | 'hinge') => X.reduce((s, x, i) => {
  const e = Y[i] * (wv * x + w0.value)
  return s + (k === 'log' ? Math.log1p(Math.exp(-e)) : Math.max(0, 1 - e))
}, 0) / X.length + LAM / 2 * wv * wv
const curves = computed(() => (['log', 'hinge'] as const).map(k => WS.map(wv => jAt(wv, k))))
const JW = 340, JH = 160, JL = 34, JB = 24, JT = 22, JR = 10
const J_MAX = 0.9
const jx = (wv: number) => JL + ((wv - 0.1) / 2.9) * (JW - JL - JR)
const jy = (v: number) => JH - JB - (Math.min(v, J_MAX) / J_MAX) * (JH - JB - JT)
const jPath = (vals: number[]) => vals.map((v, i) => `${jx(WS[i]).toFixed(1)},${jy(v).toFixed(1)}`).join(' ')
const jMin = (vals: number[]) => { let b = 0; vals.forEach((v, i) => { if (v < vals[b]) b = i }); return b }

const f = (v: number, nd = 3) => (Math.abs(v) < 0.5 * 10 ** -nd ? 0 : v).toFixed(nd).replace('.', ',').replace('-', '−')
function set(a: number, b: number) { w.value = a; w0.value = b }

/** Пряма з точками, межа g = 0 і лінії g = ±1. */
const VW = 340, VH = 112, P = 18, AY = 62
const [X0, X1] = [-4, 5]
const px = (v: number) => P + ((v - X0) / (X1 - X0)) * (VW - 2 * P)
const at = (level: number) => (level - w0.value) / w.value
const COL: Record<number, string> = { [-1]: '#2F6DB5', 1: '#C2571A' }
const inView = (v: number) => v > X0 && v < X1
// подписи ±1 ховаємо, коли лінії зливаються з межею (великі w)
const roomy = computed(() => Math.abs(px(at(1)) - px(at(0))) > 30)
</script>

<template>
  <div class="lab">
    <div class="lab__head">
      <div>
        <div class="lab__title">Дві втрати на шести точках</div>
        <div class="lab__sub">
          Модель g(x) = w·x + w₀: w — нахил, w₀ — зсув. Суцільна лінія — межа, де
          g = 0; штрихові — точки прямої, де g = −1 і g = +1. Точка між штриховими
          має η &lt; 1 і платить hinge. Рухайте w і w₀: для кожної точки
          перераховуються η = y·g(x), обидві втрати й те, наскільки точка тягне ваги.
        </div>
      </div>
    </div>

    <svg class="ll__plot" :viewBox="`0 0 ${VW} ${VH}`" role="img" aria-label="Точки на прямій і межа моделі">
      <line :x1="P" :y1="AY" :x2="VW - P" :y2="AY" class="ll__axis" />
      <template v-if="inView(at(-1))">
        <line :x1="px(at(-1))" y1="38" :x2="px(at(-1))" y2="84" class="ll__margin" />
        <text v-if="roomy" :x="px(at(-1))" y="33" class="ll__lbl" text-anchor="middle">g = −1</text>
      </template>
      <template v-if="inView(at(1))">
        <line :x1="px(at(1))" y1="38" :x2="px(at(1))" y2="84" class="ll__margin" />
        <text v-if="roomy" :x="px(at(1))" y="33" class="ll__lbl" text-anchor="middle">g = +1</text>
      </template>
      <template v-if="inView(at(0))">
        <line :x1="px(at(0))" y1="30" :x2="px(at(0))" y2="90" class="ll__bound" />
        <text :x="px(at(0))" y="25" class="ll__lbl ll__b" text-anchor="middle">g = 0</text>
      </template>
      <g v-for="(r, i) in rows" :key="i">
        <circle :cx="px(r.x)" :cy="AY" r="6" :fill="COL[r.y]" />
        <circle v-if="r.eta < 1" :cx="px(r.x)" :cy="AY" r="10" class="ll__ring" />
        <text :x="px(r.x)" :y="103" class="ll__lbl" text-anchor="middle">{{ String(r.x).replace('-', '−') }}</text>
      </g>
      <text :x="P" :y="12" class="ll__lbl ll__bl">● клас −1</text>
      <text :x="P + 62" :y="12" class="ll__lbl ll__o">● клас +1</text>
      <text :x="VW - P" :y="12" class="ll__lbl" text-anchor="end">обведено: η &lt; 1</text>
    </svg>
    <p class="ll__where">
      Межа: x = −w₀/w = <b data-check="x0">{{ f(-w0 / w, 2) }}</b>.
      Штрихові: x = (−1 − w₀)/w = <b data-check="xm">{{ f((-1 - w0) / w, 2) }}</b>
      і x = (1 − w₀)/w = <b data-check="xp">{{ f((1 - w0) / w, 2) }}</b>.
    </p>

    <div class="lab__controls">
      <label class="lab__ctl">
        <span>w = <b>{{ f(w, 2) }}</b></span>
        <input type="range" min="0.1" max="3" step="0.05" v-model.number="w" />
      </label>
      <label class="lab__ctl">
        <span>w₀ = <b>{{ f(w0, 2) }}</b></span>
        <input type="range" min="-2" max="2" step="0.05" v-model.number="w0" />
      </label>
    </div>
    <div class="lab__pills">
      <button class="lab__pill" @click="set(0.5, 0)">w = 0,5</button>
      <button class="lab__pill" @click="set(D.log_opt[0], D.log_opt[1])">мінімум перехресної ентропії</button>
      <button class="lab__pill" @click="set(D.hinge_opt[0], D.hinge_opt[1])">мінімум hinge (SVM)</button>
    </div>

    <div class="ll__table">
      <div class="ll__row ll__hd"><span>x</span><span>y</span><span>η = y·g</span><span>ln(1+e^−η)</span><span>max(0, 1−η)</span><span>тяга ПЕ σ(−η)</span><span>тяга hinge</span></div>
      <div v-for="(r, i) in rows" :key="i" class="ll__row">
        <span>{{ String(r.x).replace('-', '−') }}</span><span>{{ r.y > 0 ? '+1' : '−1' }}</span><span>{{ f(r.eta, 2) }}</span>
        <span>{{ f(r.log) }}</span><span>{{ f(r.hinge, 2) }}</span><span>{{ f(r.pull) }}</span>
        <span :class="{ 'is-zero': r.eta >= 1 }">{{ r.eta < 1 ? '1' : '0' }}</span>
      </div>
    </div>

    <div class="lab__stats">
      <div class="lab__stat"><b data-check="mlog">{{ f(mLog, 4) }}</b><span>середня перехресна ентропія</span></div>
      <div class="lab__stat"><b data-check="mhinge">{{ f(mHinge, 4) }}</b><span>середня hinge</span></div>
      <div class="lab__stat"><b data-check="jlog">{{ f(mLog + pen, 4) }}</b><span>ціль ПЕ + λ/2·w²</span></div>
      <div class="lab__stat is-green"><b data-check="jhinge">{{ f(mHinge + pen, 4) }}</b><span>ціль hinge + λ/2·w²</span></div>
      <div class="lab__stat"><b data-check="p1">{{ f(p1) }}</b><span>σ(g(1)) — імовірність «+1» для x = 1</span></div>
    </div>

    <svg class="ll__jplot" :viewBox="`0 0 ${JW} ${JH}`" role="img" aria-label="Обидві цілі залежно від w">
      <text :x="JL - 26" y="10" class="ll__lbl">ціль J(w) при поточному w₀ = {{ f(w0, 2) }}</text>
      <line :x1="JL" :y1="JH - JB" :x2="JW - JR" :y2="JH - JB" class="ll__axis" />
      <line :x1="JL" :y1="JT" :x2="JL" :y2="JH - JB" class="ll__axis" />
      <text v-for="v in [0, 0.3, 0.6, 0.9]" :key="'y' + v" :x="JL - 4" :y="jy(v) + 3" class="ll__lbl" text-anchor="end">{{ f(v, 1) }}</text>
      <text v-for="v in [0.5, 1, 1.5, 2, 2.5, 3]" :key="'x' + v" :x="jx(v)" :y="JH - JB + 11" class="ll__lbl" text-anchor="middle">{{ f(v, 1) }}</text>
      <text :x="JW - JR" :y="JH - 2" class="ll__lbl" text-anchor="end">w</text>
      <polyline :points="jPath(curves[0])" class="ll__jc" style="stroke: #C2571A" />
      <polyline :points="jPath(curves[1])" class="ll__jc" style="stroke: #2F6DB5" />
      <circle :cx="jx(WS[jMin(curves[0])])" :cy="jy(curves[0][jMin(curves[0])])" r="3.5" fill="#C2571A" />
      <circle :cx="jx(WS[jMin(curves[1])])" :cy="jy(curves[1][jMin(curves[1])])" r="3.5" fill="#2F6DB5" />
      <line :x1="jx(w)" :y1="JT" :x2="jx(w)" :y2="JH - JB" class="ll__margin" />
      <text :x="JW - JR" y="30" class="ll__lbl ll__o" text-anchor="end">з перехресною ентропією</text>
      <text :x="JW - JR" y="42" class="ll__lbl ll__h" text-anchor="end">з hinge</text>
    </svg>

    <p class="lab__note">
      При w = 0,5 штрихові лінії стоять у x = −2 і x = 2. Середня перехресна ентропія
      0,3172 (платять усі шість точок), середня hinge 0,1667: платять лише x = −1 і
      x = 1, що лежать між штриховими з η = 0,5. Натисніть
      «мінімум hinge»: w = 1, усі η ≥ 1, hinge дорівнює нулю, і ціль 0,05 — це вже
      тільки штраф λ/2·w². Далі збільшувати w немає сенсу: штраф росте, а hinge
      нижче нуля не впаде. Так виходить найширший коридор — від −1 до 1. Мінімум
      перехресної ентропії інший: w = 1,30, бо кожна точка й далі тягне, хоч і
      слабше, а модель видає ймовірність: для x = 1 — 0,781. Обидва мінімуми видно
      на нижньому графіку як точки на кривих.
    </p>
  </div>
</template>

<style scoped>
.ll__plot {
  width: 100%;
  max-width: 560px;
  height: auto;
  display: block;
  margin: 0.4rem auto 0.6rem;
  border: 1px solid var(--uk-line);
  border-radius: 8px;
  background: var(--vp-c-bg);
}
.ll__axis { stroke: var(--uk-line); stroke-width: 1.2; }
.ll__bound { stroke: var(--vp-c-text-1); stroke-width: 2; }
.ll__margin { stroke: var(--vp-c-text-3); stroke-width: 1.2; stroke-dasharray: 4 3; }
.ll__ring { fill: none; stroke: #B3312C; stroke-width: 1.6; }
.ll__lbl { fill: var(--vp-c-text-3); font-size: 9px; }
.ll__b { fill: var(--vp-c-text-1); font-weight: 600; }
.ll__h, .ll__bl { fill: #2F6DB5; }
.ll__where { margin: 0 0 0.6rem; font-size: 0.82rem; font-variant-numeric: tabular-nums; }
.ll__jplot {
  width: 100%;
  max-width: 560px;
  height: auto;
  display: block;
  margin: 0.2rem auto 0.6rem;
}
.ll__jc { fill: none; stroke-width: 2; }
.ll__o { fill: #C2571A; }
.ll__table { display: grid; gap: 2px; margin: 0.2rem 0 0.8rem; font-size: 0.78rem; overflow-x: auto; }
.ll__row {
  display: grid;
  grid-template-columns: repeat(7, minmax(46px, 1fr));
  gap: 0.3rem;
  padding: 0.2rem 0.4rem;
  border-radius: 5px;
  background: var(--uk-fill);
  font-variant-numeric: tabular-nums;
  min-width: 440px;
}
.ll__hd { background: transparent; color: var(--vp-c-text-3); font-size: 0.72rem; }
.is-zero { color: var(--uk-green); font-weight: 600; }
</style>
