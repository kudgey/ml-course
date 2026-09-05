<script setup lang="ts">
/**
 * Правдоподібність підкидання монети — та сама функція, що на рисунку:
 * L(p) = p^h (1−p)^(N−h). Максимум завжди стоїть у точці p̂ = h/N, і це
 * видно безпосередньо: точка максимуму рахується тут-таки, а не підписана.
 */
import { ref, computed } from 'vue'

const N = ref(10)
const h = ref(7)
const useLog = ref(false)

/** Режим MAP: до правдоподібності домножується симетричний пріор Beta(s, s),
    тобто апріорне переконання «монета радше чесна». Сила переконання s = 1 —
    пріор рівномірний і MAP збігається з MLE; що більше s, то він вужчий. */
const usePrior = ref(false)
const sPrior = ref(2)

function togglePrior() {
  usePrior.value = !usePrior.value
  if (usePrior.value) useLog.value = false        // логарифм і три криві разом нечитні
}

const pHat = computed(() => h.value / N.value)

/** Вершина Beta(h + s, N − h + s): (h + s − 1) / (N + 2s − 2). */
const pMap = computed(() => {
  const den = N.value + 2 * sPrior.value - 2
  return den <= 0 ? pHat.value : (h.value + sPrior.value - 1) / den
})

/** Нормована на власний максимум крива p^(a−1)(1−p)^(b−1) — для пріора,
    правдоподібності й апостеріорного розподілу однією функцією. */
function betaCurve(a: number, b: number) {
  const raw: number[] = []
  for (let i = 0; i <= 200; i++) {
    const p = i / 200
    raw.push(Math.exp((a - 1) * Math.log(p || 1e-12) + (b - 1) * Math.log(1 - p || 1e-12)))
  }
  const hi = Math.max(...raw.filter(Number.isFinite)) || 1
  return raw.map((v, i) => ({ p: i / 200, t: Number.isFinite(v) ? v / hi : 0 }))
}

/** Значення L(p) або log L(p) на сітці. Нормуємо на максимум — інакше при
    великому N крива вироджується в нуль на всій ширині графіка. */
const curve = computed(() => {
  const pts: { p: number; v: number }[] = []
  for (let i = 0; i <= 200; i++) {
    const p = i / 200
    let v: number
    if (useLog.value) {
      v = (p === 0 || p === 1)
        ? -Infinity
        : h.value * Math.log(p) + (N.value - h.value) * Math.log(1 - p)
    } else {
      v = Math.pow(p, h.value) * Math.pow(1 - p, N.value - h.value)
    }
    pts.push({ p, v })
  }
  const finite = pts.map(x => x.v).filter(Number.isFinite)
  const hi = Math.max(...finite)
  const lo = useLog.value ? Math.min(...finite.filter(v => v > hi - 12)) : 0
  return pts.map(x => ({
    p: x.p,
    t: Number.isFinite(x.v) ? Math.max(0, (x.v - lo) / (hi - lo || 1)) : 0
  }))
})

const W = 560, H = 240, PAD = 34
const sx = (p: number) => PAD + p * (W - 2 * PAD)
const sy = (t: number) => H - PAD - t * (H - 2 * PAD)
const poly = (pts: { p: number; t: number }[]) =>
  pts.map(c => `${sx(c.p).toFixed(1)},${sy(c.t).toFixed(1)}`).join(' ')
const path = computed(() => poly(curve.value))
const pathPrior = computed(() => poly(betaCurve(sPrior.value, sPrior.value)))
const pathLik = computed(() => poly(betaCurve(h.value + 1, N.value - h.value + 1)))
const pathPost = computed(() =>
  poly(betaCurve(h.value + sPrior.value, N.value - h.value + sPrior.value)))

/** Ширина піка на половині висоти — наочна міра невизначеності оцінки. */
const width = computed(() => {
  const above = curve.value.filter(c => c.t >= 0.5)
  if (!above.length) return 0
  return above[above.length - 1].p - above[0].p
})

const fmt = (v: number, d = 3) => v.toFixed(d).replace('.', ',')
const PRESETS = [
  { N: 3, h: 3 }, { N: 10, h: 3 }, { N: 10, h: 7 },
  { N: 50, h: 35 }, { N: 200, h: 140 }
]
</script>

<template>
  <div class="lab">
    <div class="lab__head">
      <div>
        <div class="lab__title">Де стоїть максимум правдоподібності</div>
        <div class="lab__sub">
          Та сама функція, що на рисунку: монета впала орлом h разів із N.
          Крива рахується просто тут, а вертикальна риска — це не підпис, а
          обчислена точка максимуму.
        </div>
      </div>
    </div>

    <div class="lab__pills">
      <button v-for="p in PRESETS" :key="`${p.N}-${p.h}`" class="lab__pill"
              :class="{ 'is-on': N === p.N && h === p.h }" @click="N = p.N; h = p.h">
        {{ p.h }} з {{ p.N }}
      </button>
      <button class="lab__pill" :class="{ 'is-on': useLog }"
              :disabled="usePrior" @click="useLog = !useLog">
        логарифм
      </button>
      <button class="lab__pill" :class="{ 'is-on': usePrior }"
              @click="togglePrior">
        додати пріор
      </button>
    </div>

    <div class="lab__controls">
      <label class="lab__ctl">
        <span>Підкидань N = <b>{{ N }}</b></span>
        <input type="range" min="1" max="200" step="1" v-model.number="N"
               @input="h = Math.min(h, N)" />
      </label>
      <label class="lab__ctl">
        <span>Орлів h = <b>{{ h }}</b></span>
        <input type="range" min="0" :max="N" step="1" v-model.number="h" />
      </label>
      <label class="lab__ctl" :class="{ 'is-off': !usePrior }">
        <span>Сила пріора s = <b>{{ sPrior }}</b></span>
        <input type="range" min="1" max="20" step="1" v-model.number="sPrior"
               :disabled="!usePrior" />
      </label>
    </div>

    <svg :viewBox="`0 0 ${W} ${H}`" class="lk" role="img"
         aria-label="Крива правдоподібності для підкидання монети">
      <line :x1="PAD" :y1="H - PAD" :x2="W - PAD" :y2="H - PAD" class="lk__axis" />
      <line :x1="PAD" :y1="PAD" :x2="PAD" :y2="H - PAD" class="lk__axis" />
      <polyline v-if="usePrior" :points="pathPrior" class="lk__prior" />
      <polyline :points="usePrior ? pathLik : path" class="lk__curve" />
      <polyline v-if="usePrior" :points="pathPost" class="lk__post" />
      <line :x1="sx(pHat)" :y1="PAD" :x2="sx(pHat)" :y2="H - PAD" class="lk__hat" />
      <circle :cx="sx(pHat)" :cy="sy(1)" r="4.5" class="lk__dot" />
      <line v-if="usePrior" :x1="sx(pMap)" :y1="PAD" :x2="sx(pMap)" :y2="H - PAD"
            class="lk__map" />
      <text :x="sx(pHat)" :y="PAD - 8" class="lk__lbl" text-anchor="middle">
        p̂ = {{ fmt(pHat, 2) }}
      </text>
      <text v-for="t in [0, 0.5, 1]" :key="t" :x="sx(t)" :y="H - PAD + 15"
            class="lk__lbl" text-anchor="middle">{{ fmt(t, 1) }}</text>
      <text :x="W / 2" :y="H - 4" class="lk__lbl" text-anchor="middle">
        ймовірність орла p
      </text>
    </svg>

    <div v-if="usePrior" class="lk__key">
      <span class="lk__k lk__k--prior">пріор Beta({{ sPrior }}, {{ sPrior }})</span>
      <span class="lk__k lk__k--lik">правдоподібність</span>
      <span class="lk__k lk__k--post">апостеріорний розподіл</span>
    </div>

    <div class="lab__stats">
      <div class="lab__stat"><b>{{ fmt(pHat) }}</b><span>оцінка p̂ = h / N</span></div>
      <div class="lab__stat"><b>{{ fmt(width, 3) }}</b><span>ширина піка на половині висоти</span></div>
      <div v-if="usePrior" class="lab__stat is-green">
        <b>{{ fmt(pMap) }}</b><span>оцінка MAP із пріором Beta({{ sPrior }}, {{ sPrior }})</span>
      </div>
      <div v-else class="lab__stat is-green"><b>{{ N }}</b><span>спостережень у вибірці</span></div>
    </div>

    <p class="lab__note">
      Посуньте h — максимум поїде рівно у h/N, як і обіцяє формула
      <code>h/p − (N−h)/(1−p) = 0</code>. Тепер зафіксуйте частку орлів
      (наприклад, 7 із 10, потім 35 із 50, потім 140 із 200): точка максимуму
      стоїть на місці, а пік стає дедалі вужчим — більше даних не змінює оцінку,
      але зменшує сумнів щодо неї. Увімкніть логарифм: добуток перетворюється на
      суму, максимум лишається там само, зате крива стає зручною для похідної й
      не переповнює арифметику при великому N.
    </p>

    <p class="lab__note">
      Кнопка «додати пріор» знадобиться після розділу про MAP. Візьміть
      найкоротший можливий дослід — три орли з трьох. Правдоподібність
      максимальна в точці 1,000: за цією оцінкою монета ніколи не впаде
      решкою, хоч ми бачили лише три підкидання. Увімкніть пріор Beta(2, 2) —
      апріорне переконання «монета радше чесна» — і MAP дає 0,800: оцінка
      відходить від абсурду, не втрачаючи зв'язку з даними. Тягніть силу
      пріора: при s = 1 пріор рівномірний і MAP збігається з MLE, при
      s = 20 оцінка сповзає до 0,537, тобто дані майже нічого не важать.
      Тепер поверніть N до 200 при тій самій частці орлів — і побачите
      головне: із зростанням вибірки апостеріорна крива притискається до
      правдоподібності, і пріор перестає щось вирішувати.
    </p>
  </div>
</template>

<style scoped>
.lk { width: 100%; height: auto; display: block; }
.lk__axis { stroke: var(--uk-line); stroke-width: 1; }
.lk__curve { fill: none; stroke: var(--uk-accent); stroke-width: 2; }
.lk__prior { fill: none; stroke: var(--vp-c-text-3); stroke-width: 1.6; stroke-dasharray: 4 3; }
.lk__post { fill: none; stroke: var(--uk-green); stroke-width: 2.4; }
.lk__map { stroke: var(--uk-green); stroke-width: 1.4; stroke-dasharray: 4 3; }
.lab__ctl.is-off { opacity: 0.45; }
.lk__key { display: flex; gap: 1.1rem; flex-wrap: wrap; font-size: 0.78rem; margin-top: -0.2rem; }
.lk__k { display: inline-flex; align-items: center; gap: 0.35rem; color: var(--vp-c-text-2); }
.lk__k::before { content: ''; width: 15px; height: 2px; border-radius: 1px; }
.lk__k--prior::before { background: var(--vp-c-text-3); }
.lk__k--lik::before { background: var(--uk-accent); }
.lk__k--post::before { background: var(--uk-green); }
.lk__hat { stroke: var(--uk-warm); stroke-width: 1.4; stroke-dasharray: 4 3; }
.lk__dot { fill: var(--uk-warm); }
.lk__lbl { fill: var(--vp-c-text-3); font-size: 11px; }
</style>
