<script setup lang="ts">
/**
 * Той самий приклад, що в розділі «Один викид зсуває мінімум»: чотири
 * спостереження 1, 2, 3, 4 і п'яте, яке можна тягнути.
 *
 * Рахується тут-таки, без жодних заготовлених відповідей:
 *   MSE   — середнє квадратів відхилень, мінімум у середньому арифметичному;
 *   MAE   — середнє модулів, мінімум у медіані;
 *   Хубер — квадрат біля нуля, модуль далі, поріг δ.
 * Мінімуми беруться сіткою з кроком 0,01, тому їх видно й тоді, коли для
 * втрати немає формули. Числа розділу відтворюються точно: без викиду
 * MSE 2,5 і MAE 2–3; з викидом 20 → MSE 6,0, MAE лишається 3,0.
 */
import { ref, computed } from 'vue'

const BASE = [1, 2, 3, 4]
const outlier = ref(20)
const delta = ref(1)
const withOutlier = ref(true)

const data = computed(() => withOutlier.value ? [...BASE, outlier.value] : [...BASE])

const GRID_LO = -1, GRID_HI = 22, GRID_N = 2301   // крок рівно 0,01 — цілі точки на сітці
const grid = Array.from({ length: GRID_N }, (_, i) => GRID_LO + (GRID_HI - GRID_LO) * i / (GRID_N - 1))

const mse = (w: number) => data.value.reduce((s, y) => s + (y - w) ** 2, 0) / data.value.length
const mae = (w: number) => data.value.reduce((s, y) => s + Math.abs(y - w), 0) / data.value.length
const hub = (w: number) => data.value.reduce((s, y) => {
  const e = Math.abs(y - w), d = delta.value
  return s + (e <= d ? 0.5 * e * e : d * e - 0.5 * d * d)
}, 0) / data.value.length

/** Мінімум сіткою: усереднюємо плато, щоб для MAE не вискакував випадковий край. */
const argmin = (f: (w: number) => number) => {
  let best = Infinity
  for (const w of grid) { const v = f(w); if (v < best) best = v }
  const flat = grid.filter(w => f(w) <= best + 1e-9)
  return { at: flat.reduce((a, b) => a + b, 0) / flat.length, val: best,
           lo: flat[0], hi: flat[flat.length - 1] }
}

const mMse = computed(() => argmin(mse))
const mMae = computed(() => argmin(mae))
const mHub = computed(() => argmin(hub))

const W = 620, H = 250, PAD = 40

/** Вікно показу йде за даними, інакше при викиді 4 графік стискається в кут. */
const xLo = 0
const xHi = computed(() => Math.max(6, Math.max(...data.value) + 2))
const sx = (w: number) => PAD + ((w - xLo) / (xHi.value - xLo)) * (W - 2 * PAD)

/**
 * Кожна крива нормується на власний розмах у вікні показу. Інакше MSE, яка
 * при викиді 20 сягає сотень, притискає MAE й Хубера до осі, і порівняти
 * положення мінімумів — те, заради чого все й будується, — стає неможливо.
 * Висота тут нічого не означає; значення мають лише абсциси мінімумів.
 */
const curve = (f: (w: number) => number) => {
  const N = 240
  const vs: number[] = []
  for (let i = 0; i <= N; i++) vs.push(f(xLo + (xHi.value - xLo) * i / N))
  const lo = Math.min(...vs), hi = Math.max(...vs), rng = hi - lo || 1
  return vs.map((v, i) => {
    const x = sx(xLo + (xHi.value - xLo) * i / N)
    const y = H - PAD - ((v - lo) / rng) * (H - 2 * PAD - 10)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
}

const cMse = computed(() => curve(mse))
const cMae = computed(() => curve(mae))
const cHub = computed(() => curve(hub))

const fmt = (v: number) => v.toFixed(2).replace('.', ',')
const maeLabel = computed(() =>
  mMae.value.hi - mMae.value.lo > 0.05
    ? `${fmt(mMae.value.lo)}–${fmt(mMae.value.hi)}`
    : fmt(mMae.value.at))
</script>

<template>
  <div class="lab">
    <div class="lab__head">
      <div>
        <div class="lab__title">Куди поїде мінімум, якщо потягнути викид</div>
        <div class="lab__sub">
          Чотири спостереження — 1, 2, 3, 4 — і п'яте, яке ви пересуваєте самі.
          Модель без ознак: усім передбачає одне число, тож уся задача — знайти
          мінімум втрати по цьому числу.
        </div>
      </div>
    </div>

    <div class="lab__pills">
      <button class="lab__pill" :class="{ 'is-on': !withOutlier }" @click="withOutlier = false">
        чотири спостереження
      </button>
      <button class="lab__pill" :class="{ 'is-on': withOutlier }" @click="withOutlier = true">
        додати п'яте
      </button>
    </div>

    <div class="lab__controls">
      <label class="lab__ctl" :class="{ 'is-off': !withOutlier }">
        <span>П'яте значення: <b>{{ fmt(outlier) }}</b></span>
        <input type="range" min="0" max="20" step="0.5" v-model.number="outlier"
               :disabled="!withOutlier" />
      </label>
      <label class="lab__ctl">
        <span>Поріг Хубера δ = <b>{{ fmt(delta) }}</b></span>
        <input type="range" min="0.2" max="6" step="0.1" v-model.number="delta" />
      </label>
    </div>

    <svg :viewBox="`0 0 ${W} ${H}`" class="ol" role="img"
         aria-label="Три функції втрат і положення їхніх мінімумів">
      <line :x1="PAD" :y1="H - PAD" :x2="W - PAD" :y2="H - PAD" class="ol__axis" />

      <polyline :points="cMse" class="ol__mse" />
      <polyline :points="cMae" class="ol__mae" />
      <polyline :points="cHub" class="ol__hub" />

      <g v-for="(y, i) in data" :key="'d' + i">
        <line :x1="sx(y)" :y1="H - PAD" :x2="sx(y)" :y2="H - PAD + 9"
              :class="withOutlier && i === 4 ? 'ol__tickout' : 'ol__tick'" />
      </g>

      <line :x1="sx(mMse.at)" :y1="PAD - 6" :x2="sx(mMse.at)" :y2="H - PAD" class="ol__vmse" />
      <line :x1="sx(mMae.at)" :y1="PAD - 6" :x2="sx(mMae.at)" :y2="H - PAD" class="ol__vmae" />

      <text :x="W - PAD" :y="H - PAD + 22" class="ol__lbl" text-anchor="end">
        число, яке передбачає модель
      </text>
      <text :x="PAD + 4" :y="PAD - 8" class="ol__lbl">втрата — кожна у власному масштабі</text>
    </svg>

    <div class="ol__key">
      <span class="ol__k ol__k--mse">MSE</span>
      <span class="ol__k ol__k--mae">MAE</span>
      <span class="ol__k ol__k--hub">Хубер</span>
    </div>

    <div class="lab__stats">
      <div class="lab__stat is-warm">
        <b>{{ fmt(mMse.at) }}</b><span>мінімум MSE — середнє</span>
      </div>
      <div class="lab__stat is-green">
        <b>{{ maeLabel }}</b><span>мінімум MAE — медіана</span>
      </div>
      <div class="lab__stat">
        <b>{{ fmt(mHub.at) }}</b><span>мінімум Хубера, δ = {{ fmt(delta) }}</span>
      </div>
    </div>

    <p class="lab__note">
      Тягніть п'яте значення від 4 до 20 і дивіться на перші два числа. Мінімум
      квадратичної втрати їде слідом за викидом: він завжди дорівнює середньому,
      а середнє тягнеться за будь-яким одним спостереженням як завгодно далеко.
      Мінімум абсолютної втрати дорівнює медіані й лишається серед даних —
      на 3,0, хоч би куди поїхав викид. Хубер стоїть посередині: при малому δ він
      майже повторює MAE, при великому зливається з MSE. Саме тому вибір функції
      втрат — це рішення про те, скільки влади ви віддаєте найдальшій точці.
    </p>
  </div>
</template>

<style scoped>
.ol { width: 100%; height: auto; display: block; }
.ol__axis { stroke: var(--uk-line); stroke-width: 1; }
.ol__mse { fill: none; stroke: var(--uk-warm); stroke-width: 2; }
.ol__mae { fill: none; stroke: var(--uk-green); stroke-width: 2; }
.ol__hub { fill: none; stroke: var(--uk-accent); stroke-width: 1.6; stroke-dasharray: 5 3; }
.ol__vmse { stroke: var(--uk-warm); stroke-width: 1; stroke-dasharray: 3 3; opacity: 0.75; }
.ol__vmae { stroke: var(--uk-green); stroke-width: 1; stroke-dasharray: 3 3; opacity: 0.75; }
.ol__tick { stroke: var(--vp-c-text-3); stroke-width: 2; }
.ol__tickout { stroke: var(--uk-warm); stroke-width: 3; }
.ol__lbl { fill: var(--vp-c-text-3); font-size: 11px; }
.lab__ctl.is-off { opacity: 0.45; }
.ol__key { display: flex; gap: 1.1rem; font-size: 0.8rem; margin-top: -0.4rem; }
.ol__k { display: inline-flex; align-items: center; gap: 0.35rem; color: var(--vp-c-text-2); }
.ol__k::before { content: ''; width: 14px; height: 2px; border-radius: 1px; }
.ol__k--mse::before { background: var(--uk-warm); }
.ol__k--mae::before { background: var(--uk-green); }
.ol__k--hub::before { background: var(--uk-accent); }
</style>
