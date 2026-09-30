<script setup lang="ts">
/**
 * Чотири функції втрат від функційного відступу m = y·g(x) — ті самі формули,
 * що в таблиці розділу «Функції втрат, придатні для класифікації» і на
 * рисунку 05_08. Кнопки ставлять відступи з таблиці (m = 2 і m = −1); їхні
 * значення віджет бере з tools/gen_lec05_widgets.py, який звіряє їх із текстом.
 */
import { ref, computed } from 'vue'
import data from '../../data/lec05_losses.json'

type Preset = { m: number; zero_one: number; logistic: number; hinge: number; squared: number }
const PRESETS = data.presets as Preset[]

const m = ref(PRESETS[0].m)

const LOSSES = [
  { key: 'zero_one', name: 'нуль-одинична', formula: '𝟙[m ≤ 0]', color: '#8A8A96',
    f: (v: number) => (v <= 0 ? 1 : 0) },
  { key: 'logistic', name: 'логістична', formula: 'log(1 + e⁻ᵐ)', color: '#2F6DB5',
    f: (v: number) => Math.log1p(Math.exp(-v)) },
  { key: 'hinge', name: 'hinge', formula: 'max(0, 1 − m)', color: '#1E8E6A',
    f: (v: number) => Math.max(0, 1 - v) },
  { key: 'squared', name: 'квадратична', formula: '(1 − m)²', color: '#C2571A',
    f: (v: number) => (1 - v) ** 2 },
] as const

const W = 560, H = 250, PL = 36, PR = 12, PT = 10, PB = 30
const XMIN = -3, XMAX = 3, YMAX = 4.4
const px = (x: number) => PL + ((x - XMIN) / (XMAX - XMIN)) * (W - PL - PR)
const py = (y: number) => H - PB - (y / YMAX) * (H - PT - PB)   // вище за YMAX обрізає clipPath

function curve(key: string, f: (v: number) => number) {
  if (key === 'zero_one')
    return [[XMIN, 1], [0, 1], [0, 0], [XMAX, 0]].map(([x, y]) => `${px(x)},${py(y)}`).join(' ')
  const pts: string[] = []
  for (let i = 0; i <= 150; i++) {
    const x = XMIN + ((XMAX - XMIN) * i) / 150
    pts.push(`${px(x).toFixed(1)},${py(f(x)).toFixed(1)}`)
  }
  return pts.join(' ')
}

const preset = computed(() => PRESETS.find(p => Math.abs(p.m - m.value) < 1e-9))
const rows = computed(() =>
  LOSSES.map(l => ({
    ...l,
    // на кнопках — еталонні значення з генератора, між ними — та сама формула живцем
    value: preset.value ? (preset.value as any)[l.key] as number : l.f(m.value),
  })))

const fmt = (v: number) => v.toFixed(3).replace('.', ',').replace('-', '−')
const fmtM = (v: number) => v.toFixed(2).replace('.', ',').replace('-', '−')
const XT = [-3, -2, -1, 0, 1, 2, 3]
const YT = [0, 1, 2, 3, 4]
</script>

<template>
  <div class="lab">
    <div class="lab__head">
      <div>
        <div class="lab__title">Чотири втрати для одного відступу</div>
        <div class="lab__sub">
          Відступ m = y·g(x) додатний, коли клас угадано, а його модуль — упевненість.
          Посуньте повзунок і подивіться, яка втрата скільки штрафує.
        </div>
      </div>
    </div>

    <div class="lab__pills">
      <button v-for="p in PRESETS" :key="p.m" class="lab__pill"
              :class="{ 'is-on': Math.abs(m - p.m) < 1e-9 }" @click="m = p.m">
        m = {{ fmtM(p.m).replace(',00', '') }} (з таблиці)
      </button>
      <button class="lab__pill" :class="{ 'is-on': m === 0 }" @click="m = 0">m = 0 (на межі)</button>
    </div>

    <svg class="ll__plot" :viewBox="`0 0 ${W} ${H}`" role="img" aria-label="Графіки чотирьох функцій втрат">
      <line v-for="t in YT" :key="'y' + t" :x1="PL" :x2="W - PR" :y1="py(t)" :y2="py(t)" class="ll__grid" />
      <text v-for="t in YT" :key="'yl' + t" :x="PL - 6" :y="py(t) + 3" class="ll__lbl" text-anchor="end">{{ t }}</text>
      <text v-for="t in XT" :key="'xl' + t" :x="px(t)" :y="H - PB + 14" class="ll__lbl" text-anchor="middle">{{ String(t).replace('-', '−') }}</text>
      <line :x1="px(0)" :x2="px(0)" :y1="PT" :y2="H - PB" class="ll__zero" />
      <text :x="(W + PL) / 2" :y="H - 4" class="ll__lbl" text-anchor="middle">відступ m = y·g(x)</text>
      <defs>
        <clipPath id="ll-clip"><rect :x="PL" :y="PT" :width="W - PL - PR" :height="H - PT - PB + 2" /></clipPath>
      </defs>
      <g clip-path="url(#ll-clip)">
        <polyline v-for="l in LOSSES" :key="l.key" :points="curve(l.key, l.f)" class="ll__curve" :style="{ stroke: l.color }" />
        <circle v-for="r in rows" :key="'c' + r.key" :cx="px(m)" :cy="py(r.value)" r="4.5" :style="{ fill: r.color }" />
      </g>
      <line :x1="px(m)" :x2="px(m)" :y1="PT" :y2="H - PB" class="ll__mark" />
    </svg>

    <label class="lab__ctl">
      <span>Відступ m = <b>{{ fmtM(m) }}</b></span>
      <input type="range" min="-3" max="3" step="0.05" v-model.number="m" />
    </label>

    <table class="ll__table">
      <tbody>
        <tr><th>втрата</th><th>формула</th><th>значення при m = {{ fmtM(m) }}</th></tr>
        <tr v-for="r in rows" :key="r.key" :data-loss="r.key">
          <td><i :style="{ background: r.color }" />{{ r.name }}</td>
          <td class="ll__f">{{ r.formula }}</td>
          <td class="ll__v">{{ fmt(r.value) }}</td>
        </tr>
      </tbody>
    </table>

    <p class="lab__note">
      Поставте m = 2: відповідь правильна й упевнена, логістична втрата майже нуль
      (0,127), hinge — рівно нуль, а квадратична все одно штрафує на 1. Далі
      праворуч квадратична тільки росте — вона карає модель за зайву впевненість.
      При m = −1 модель помилилася, і штрафують усі чотири. На самій межі, m = 0,
      логістична втрата дорівнює log 2 ≈ 0,693 — тій самій втраті, з якої починає
      спуск у коді «з нуля», коли всім приписано ймовірність 0,5.
    </p>
  </div>
</template>

<style scoped>
.ll__plot { width: 100%; height: auto; display: block; margin: 0.4rem 0 0.6rem; }
.ll__grid { stroke: var(--uk-line); stroke-width: 1; }
.ll__zero { stroke: var(--vp-c-text-3); stroke-width: 1; stroke-dasharray: 2 3; }
.ll__mark { stroke: var(--vp-c-text-2); stroke-width: 1.2; stroke-dasharray: 4 3; }
.ll__curve { fill: none; stroke-width: 2.2; }
.ll__lbl { fill: var(--vp-c-text-3); font-size: 10px; }
.ll__table { width: 100%; margin-top: 0.7rem; font-size: 0.86rem; }
.ll__table th {
  text-align: left; font-weight: 500; font-size: 0.76rem;
  color: var(--vp-c-text-3); padding-bottom: 0.35rem;
}
.ll__table td { padding: 0.3rem 0; border-top: 1px solid var(--uk-line); }
.ll__table td i {
  display: inline-block; width: 9px; height: 9px;
  border-radius: 2px; margin-right: 0.45rem;
}
.ll__f { font-family: var(--vp-font-family-mono); font-size: 0.8rem; }
.ll__v { font-variant-numeric: tabular-nums; font-weight: 600; }
</style>
