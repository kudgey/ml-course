<script setup lang="ts">
/**
 * Метод Платта руками: p = σ(a·s + b) поверх логіта s зваженої моделі
 * (class_weight='balanced') на 13 564 тестових клієнтах Bank Marketing.
 * Логіти взято з кроком 0,01 і згруповано з кількістю згод і відмов; кошики —
 * ті самі шість квантильних кошиків, що в розділі калібрування. При a > 0
 * перетворення монотонне, тож склад кошиків не змінюється: рухаються лише
 * їхні середні передбачені ймовірності p̄, а фактичні частки ȳ стоять на місці.
 * Дані й еталонні числа пише tools/gen_lec05_widgets.py: a = 1, b = 0 → Брайєр
 * 0,1850; a і b, які підібрав CalibratedClassifierCV у коді розділу, → 0,0857.
 * Браузерну звірку робить course-site/check_lec05_widgets.mjs.
 */
import { ref, computed } from 'vue'
import data from '../../data/lec05_calib.json'

const f3 = (v: number) => v.toFixed(3).replace('.', ',').replace('-', '−')
const f4 = (v: number) => v.toFixed(4).replace('.', ',').replace('-', '−')

const G = data.groups as number[][]          // [логіт s, згод, відмов, кошик]
const N = data.n as number
const BY = data.bins_y as number[]           // фактична частка згод у кошику
type Preset = { tag: string; a: number; b: number; brier: number; mean_p: number }
const PRESETS = data.presets as Preset[]
const LABEL: Record<string, string> = {
  bal: 'без калібрування: a = 1, b = 0',
  platt: `Платт: a = ${f3(data.platt.a)}, b = ${f3(data.platt.b)}`,
  prior: `лише зсув: a = 1, b = ${f3(data.prior)}`,
}

const a = ref(1)
const b = ref(0)
const sigma = (z: number) => 1 / (1 + Math.exp(-z))

const res = computed(() => {
  let br = 0, sp = 0
  const sumB = [0, 0, 0, 0, 0, 0], nB = [0, 0, 0, 0, 0, 0]
  for (const [s, n1, n0, k] of G) {
    const p = sigma(a.value * s + b.value)
    br += n1 * (1 - p) ** 2 + n0 * p * p
    sp += (n1 + n0) * p
    sumB[k] += (n1 + n0) * p
    nB[k] += n1 + n0
  }
  return { brier: br / N, meanP: sp / N, bins: sumB.map((v, k) => v / nB[k]) }
})
// еталон без калібрування — сірим, щоб було видно, куди рушили кошики
const REF = (() => {
  const sumB = [0, 0, 0, 0, 0, 0], nB = [0, 0, 0, 0, 0, 0]
  for (const [s, n1, n0, k] of G) { sumB[k] += (n1 + n0) * sigma(s); nB[k] += n1 + n0 }
  return sumB.map((v, k) => v / nB[k])
})()
const isOn = (pr: Preset) => Math.abs(a.value - pr.a) < 1e-9 && Math.abs(b.value - pr.b) < 1e-9

const W = 330, H = 300, P = 34, MAX = 1
const sx = (v: number) => P + (v / MAX) * (W - P - 10)
const sy = (v: number) => H - P - (v / MAX) * (H - P - 10)
const line = (xs: number[]) => xs.map((x, k) => `${sx(x).toFixed(1)},${sy(BY[k]).toFixed(1)}`).join(' ')
const TICKS = [0, 0.2, 0.4, 0.6, 0.8, 1]
const fT = (v: number) => String(v).replace('.', ',')
</script>

<template>
  <div class="lab">
    <div class="lab__head">
      <div>
        <div class="lab__title">Метод Платта: два числа лагодять імовірності</div>
        <div class="lab__sub">
          Зважена модель на 13 564 тестових клієнтах Bank Marketing. Кожен логіт s
          перетворюємо на p = σ(a·s + b) і дивимося, куди рушають шість кошиків і
          як змінюється міра Брайєра.
        </div>
      </div>
    </div>

    <div class="lab__pills">
      <button v-for="pr in PRESETS" :key="pr.tag" class="lab__pill"
              :class="{ 'is-on': isOn(pr) }" @click="a = pr.a; b = pr.b">{{ LABEL[pr.tag] }}</button>
    </div>

    <div class="cl__grid">
      <svg :viewBox="`0 0 ${W} ${H}`" role="img" aria-label="Крива калібрування з шести кошиків">
        <defs>
          <clipPath id="cl-clip"><rect :x="P" :y="10" :width="W - P - 10" :height="H - P - 10" /></clipPath>
        </defs>
        <line v-for="t in TICKS" :key="'g' + t" :x1="P" :x2="W - 10" :y1="sy(t)" :y2="sy(t)" class="cl__gl" />
        <text v-for="t in TICKS" :key="'y' + t" :x="P - 5" :y="sy(t) + 3" class="cl__lbl" text-anchor="end">{{ fT(t) }}</text>
        <text v-for="t in TICKS" :key="'x' + t" :x="sx(t)" :y="H - P + 13" class="cl__lbl" text-anchor="middle">{{ fT(t) }}</text>
        <line :x1="sx(0)" :y1="sy(0)" :x2="sx(MAX)" :y2="sy(MAX)" class="cl__diag" />
        <g clip-path="url(#cl-clip)">
          <polyline :points="line(REF)" class="cl__ref" />
          <polyline :points="line(res.bins)" class="cl__cur" />
          <circle v-for="(x, k) in res.bins" :key="k" :cx="sx(x)" :cy="sy(BY[k])" r="4.5" class="cl__pt" />
        </g>
        <text :x="(W + P) / 2" :y="H - 4" class="cl__lbl" text-anchor="middle">середня передбачена ймовірність у кошику p̄</text>
        <text :x="10" :y="(H - P) / 2" class="cl__lbl" text-anchor="middle"
              :transform="`rotate(-90 10 ${(H - P) / 2})`">фактична частка згод ȳ</text>
      </svg>

      <div class="lab__controls cl__ctl">
        <label class="lab__ctl">
          <span>Масштаб a = <b>{{ f3(a) }}</b></span>
          <input type="range" min="0.2" max="2" step="0.001" v-model.number="a" />
        </label>
        <label class="lab__ctl">
          <span>Зсув b = <b>{{ f3(b) }}</b></span>
          <input type="range" min="-4" max="1" step="0.001" v-model.number="b" />
        </label>
        <p class="cl__legend">
          <i class="cl__swatch is-ref" /> без калібрування &nbsp;
          <i class="cl__swatch is-cur" /> поточні a і b &nbsp;
          пунктир — ідеальне калібрування
        </p>
      </div>
    </div>

    <div class="lab__stats">
      <div class="lab__stat" :class="res.brier < 0.09 ? 'is-green' : 'is-warm'">
        <b data-check="brier">{{ f4(res.brier) }}</b><span>міра Брайєра</span>
      </div>
      <div class="lab__stat"><b data-check="meanp">{{ f3(res.meanP) }}</b><span>середня p; частка згод {{ f3(data.rate) }}</span></div>
      <div class="lab__stat"><b data-check="p0">{{ f3(sigma(b)) }}</b><span>p при s = 0, тобто σ(b)</span></div>
      <div class="lab__stat"><b>{{ f4(data.auc) }}</b><span>ROC-AUC — однаковий при будь-якому a &gt; 0</span></div>
    </div>

    <p class="lab__note">
      Без калібрування зважена модель обіцяє в середньому {{ f3(PRESETS[0].mean_p) }} при
      частці згод {{ f3(data.rate) }}, і всі кошики лежать праворуч від діагоналі; Брайєр
      {{ f4(PRESETS[0].brier) }}. Кнопка «Платт» ставить ті a і b, які підібрав
      <code>CalibratedClassifierCV</code> у коді розділу: кошики лягають на діагональ,
      Брайєр {{ f4(PRESETS[1].brier) }}. Клієнт із логітом s = 0, якому зважена модель
      давала рівно 0,5, тепер отримує σ({{ f3(data.platt.b) }}) = {{ f3(sigma(data.platt.b)) }}.
      Третя кнопка лишає a = 1 і зсуває логіт лише на логарифм шансів згоди,
      log({{ f3(data.rate) }}/{{ f3(1 - data.rate) }}) = {{ f3(data.prior) }}, — і дає
      той самий Брайєр {{ f4(PRESETS[2].brier) }}: зважування класів здебільшого просто
      зсунуло логіт на цю величину. Тепер посуньте a: кошики розходяться віялом,
      а ROC-AUC стоїть на місці — порядок клієнтів той самий.
    </p>
  </div>
</template>

<style scoped>
.cl__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(260px, 100%), 1fr));
  gap: 1rem;
  align-items: center;
  margin: 0.4rem 0 0.6rem;
}
.cl__grid svg { width: 100%; height: auto; display: block; }
.cl__ctl { flex-direction: column; }
.cl__gl { stroke: var(--uk-line); stroke-width: 1; }
.cl__diag { stroke: var(--vp-c-text-3); stroke-width: 1.2; stroke-dasharray: 4 3; }
.cl__ref { fill: none; stroke: var(--vp-c-text-3); stroke-width: 1.6; stroke-dasharray: 2 3; }
.cl__cur { fill: none; stroke: #2F6DB5; stroke-width: 2.2; }
.cl__pt { fill: #2F6DB5; stroke: var(--vp-c-bg); stroke-width: 1.2; }
.cl__lbl { fill: var(--vp-c-text-3); font-size: 10px; }
.cl__legend { font-size: 0.76rem; color: var(--vp-c-text-3); margin: 0.3rem 0 0; line-height: 1.6; }
.cl__swatch { display: inline-block; width: 16px; height: 0; vertical-align: middle; margin-right: 0.25rem; }
.cl__swatch.is-ref { border-top: 2px dotted var(--vp-c-text-3); }
.cl__swatch.is-cur { border-top: 2px solid #2F6DB5; }
</style>
