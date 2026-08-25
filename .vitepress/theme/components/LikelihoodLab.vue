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

const pHat = computed(() => h.value / N.value)

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
const path = computed(() =>
  curve.value.map(c => `${sx(c.p).toFixed(1)},${sy(c.t).toFixed(1)}`).join(' '))

/** Ширина піка на половині висоти — наочна міра невизначеності оцінки. */
const width = computed(() => {
  const above = curve.value.filter(c => c.t >= 0.5)
  if (!above.length) return 0
  return above[above.length - 1].p - above[0].p
})

const fmt = (v: number, d = 3) => v.toFixed(d).replace('.', ',')
const PRESETS = [
  { N: 10, h: 3 }, { N: 10, h: 7 }, { N: 10, h: 9 },
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
      <button class="lab__pill" :class="{ 'is-on': useLog }" @click="useLog = !useLog">
        логарифм
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
    </div>

    <svg :viewBox="`0 0 ${W} ${H}`" class="lk" role="img"
         aria-label="Крива правдоподібності для підкидання монети">
      <line :x1="PAD" :y1="H - PAD" :x2="W - PAD" :y2="H - PAD" class="lk__axis" />
      <line :x1="PAD" :y1="PAD" :x2="PAD" :y2="H - PAD" class="lk__axis" />
      <polyline :points="path" class="lk__curve" />
      <line :x1="sx(pHat)" :y1="PAD" :x2="sx(pHat)" :y2="H - PAD" class="lk__hat" />
      <circle :cx="sx(pHat)" :cy="sy(1)" r="4.5" class="lk__dot" />
      <text :x="sx(pHat)" :y="PAD - 8" class="lk__lbl" text-anchor="middle">
        p̂ = {{ fmt(pHat, 2) }}
      </text>
      <text v-for="t in [0, 0.5, 1]" :key="t" :x="sx(t)" :y="H - PAD + 15"
            class="lk__lbl" text-anchor="middle">{{ fmt(t, 1) }}</text>
      <text :x="W / 2" :y="H - 4" class="lk__lbl" text-anchor="middle">
        ймовірність орла p
      </text>
    </svg>

    <div class="lab__stats">
      <div class="lab__stat"><b>{{ fmt(pHat) }}</b><span>оцінка p̂ = h / N</span></div>
      <div class="lab__stat"><b>{{ fmt(width, 3) }}</b><span>ширина піка на половині висоти</span></div>
      <div class="lab__stat is-green"><b>{{ N }}</b><span>спостережень у вибірці</span></div>
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
  </div>
</template>

<style scoped>
.lk { width: 100%; height: auto; display: block; }
.lk__axis { stroke: var(--uk-line); stroke-width: 1; }
.lk__curve { fill: none; stroke: var(--uk-accent); stroke-width: 2; }
.lk__hat { stroke: var(--uk-warm); stroke-width: 1.4; stroke-dasharray: 4 3; }
.lk__dot { fill: var(--uk-warm); }
.lk__lbl { fill: var(--vp-c-text-3); font-size: 11px; }
</style>
