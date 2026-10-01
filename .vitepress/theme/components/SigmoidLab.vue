<script setup lang="ts">
/**
 * Ланцюжок розділів 10–13 одним рухом: відстань до межі d → логіт z = ‖w‖·d →
 * шанси e^z → імовірність σ(z), і навпаки log(p/(1 − p)) = z. Повзунок ‖w‖
 * показує, чому довжина вектора ваг — це крутизна переходу. Числа на кнопках
 * (σ(2) = 0,881, σ(−2) = 0,119, log 9 = 2,197, σ(1) = 0,731, σ(5) = 0,993) —
 * ті самі, що рахує tools/gen_lec05_widgets.py і звіряє з текстом лекції;
 * браузерну звірку віджета з цим файлом робить course-site/check_lec05_widgets.mjs.
 */
import { ref, computed } from 'vue'
import data from '../../data/lec05_sigmoid.json'

const d = ref(2)
const norm = ref(1)

const sigma = (z: number) => 1 / (1 + Math.exp(-z))
const z = computed(() => norm.value * d.value)
const p = computed(() => sigma(z.value))
const odds = computed(() => Math.exp(z.value))
const back = computed(() => Math.log(p.value / (1 - p.value)))

const PRESETS = [
  { label: 'z = 2', d: 2, w: 1 },
  { label: 'z = −2', d: -2, w: 1 },
  { label: 'p = 0,9', d: Math.log(9), w: 1 },  // log 9 = 2,197
  { label: 'd = 1, ‖w‖ = 5', d: 1, w: 5 },
  // довжина вектора ваг моделі з рисунка (код розділу «Геометрія»)
  { label: `‖w‖ нашої моделі = ${String(data.model_norm.toFixed(3)).replace('.', ',')}, d = 0,5`, d: 0.5, w: data.model_norm },
]
const isOn = (pr: { d: number; w: number }) =>
  Math.abs(d.value - pr.d) < 1e-9 && Math.abs(norm.value - pr.w) < 1e-9

const W = 520, H = 230, PL = 34, PR = 12, PT = 12, PB = 30
const DR = 3
const px = (x: number) => PL + ((x + DR) / (2 * DR)) * (W - PL - PR)
const py = (y: number) => H - PB - y * (H - PT - PB)
function curve(k: number) {
  const pts: string[] = []
  for (let i = 0; i <= 160; i++) {
    const x = -DR + (2 * DR * i) / 160
    pts.push(`${px(x).toFixed(1)},${py(sigma(k * x)).toFixed(1)}`)
  }
  return pts.join(' ')
}

const f3 = (v: number) => v.toFixed(3).replace('.', ',').replace('-', '−')
const f2 = (v: number) => v.toFixed(2).replace('.', ',').replace('-', '−')
const fOdds = (v: number) =>
  v >= 1000 ? Math.round(v).toLocaleString('uk-UA') : v >= 10 ? f2(v) : f3(v)
</script>

<template>
  <div class="lab">
    <div class="lab__head">
      <div>
        <div class="lab__title">Від відстані до ймовірності</div>
        <div class="lab__sub">
          Точка на відстані d від межі отримує логіт z = ‖w‖·d, шанси e<sup>z</sup>
          й імовірність σ(z). Логарифм шансів повертає назад той самий z.
        </div>
      </div>
    </div>

    <div class="lab__pills">
      <button v-for="pr in PRESETS" :key="pr.label" class="lab__pill"
              :class="{ 'is-on': isOn(pr) }" @click="d = pr.d; norm = pr.w">{{ pr.label }}</button>
    </div>

    <svg class="sg__plot" :viewBox="`0 0 ${W} ${H}`" role="img" aria-label="Сигмоїда від відстані до межі">
      <line v-for="t in [0, 0.5, 1]" :key="t" :x1="PL" :x2="W - PR" :y1="py(t)" :y2="py(t)" class="sg__grid" />
      <text v-for="t in [0, 0.5, 1]" :key="'l' + t" :x="PL - 6" :y="py(t) + 3" class="sg__lbl" text-anchor="end">{{ String(t).replace('.', ',') }}</text>
      <text v-for="t in [-3, -2, -1, 0, 1, 2, 3]" :key="'x' + t" :x="px(t)" :y="H - PB + 14" class="sg__lbl" text-anchor="middle">{{ String(t).replace('-', '−') }}</text>
      <line :x1="px(0)" :x2="px(0)" :y1="PT" :y2="H - PB" class="sg__zero" />
      <text :x="(W + PL) / 2" :y="H - 4" class="sg__lbl" text-anchor="middle">відстань до межі d</text>
      <polyline :points="curve(1)" class="sg__ref" />
      <polyline :points="curve(norm)" class="sg__curve" />
      <line :x1="px(d)" :x2="px(d)" :y1="py(p)" :y2="H - PB" class="sg__drop" />
      <circle :cx="px(d)" :cy="py(p)" r="5" class="sg__dot" />
    </svg>

    <div class="lab__controls">
      <label class="lab__ctl">
        <span>Відстань до межі d = <b>{{ f2(d) }}</b></span>
        <input type="range" min="-3" max="3" step="0.01" v-model.number="d" />
      </label>
      <label class="lab__ctl">
        <span>Довжина вектора ваг ‖w‖ = <b>{{ f2(norm) }}</b></span>
        <input type="range" min="0.5" max="6" step="0.1" v-model.number="norm" />
      </label>
    </div>

    <div class="lab__stats sg__chain">
      <div class="lab__stat"><b data-check="z">{{ f3(z) }}</b><span>логіт z = ‖w‖·d</span></div>
      <div class="lab__stat"><b data-check="odds">{{ fOdds(odds) }}</b><span>шанси e<sup>z</sup> = p/(1 − p)</span></div>
      <div class="lab__stat is-green"><b data-check="p">{{ f3(p) }}</b><span>імовірність p = σ(z)</span></div>
      <div class="lab__stat"><b>{{ f3(back) }}</b><span>log(p/(1 − p)) — знову z</span></div>
    </div>

    <p class="lab__note">
      Сіра крива — ‖w‖ = 1, синя — поточна довжина. Натисніть «p = 0,9»: шанси
      дорівнюють 9, а логіт — log 9 = 2,197. «z = 2» і «z = −2» дають 0,881 і
      0,119 — симетрично відносно 0,5. Тепер лишіть d = 1 і збільшуйте ‖w‖: при
      ‖w‖ = 1 точка отримує 0,731, при ‖w‖ = 5 — уже 0,993. Межа рішення
      (d = 0) при цьому не рухається: довжина вектора ваг змінює лише те, як
      різко модель перемикається з «ні» на «так», тобто її впевненість.
      Остання кнопка ставить довжину вектора ваг нашої моделі з рисунка,
      3,783: уже на відстані 0,5 від межі ймовірність 0,869.
    </p>
  </div>
</template>

<style scoped>
.sg__plot { width: 100%; height: auto; display: block; margin: 0.4rem 0 0.6rem; }
.sg__grid { stroke: var(--uk-line); stroke-width: 1; }
.sg__zero { stroke: var(--vp-c-text-3); stroke-width: 1; stroke-dasharray: 2 3; }
.sg__ref { fill: none; stroke: var(--vp-c-text-3); stroke-width: 1.4; stroke-dasharray: 4 3; }
.sg__curve { fill: none; stroke: #2F6DB5; stroke-width: 2.4; }
.sg__drop { stroke: var(--vp-c-text-3); stroke-width: 1; stroke-dasharray: 2 3; }
.sg__dot { fill: #B3312C; }
.sg__lbl { fill: var(--vp-c-text-3); font-size: 10px; }
.sg__chain { margin-top: 0.6rem; }
</style>
