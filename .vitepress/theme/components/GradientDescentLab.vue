<script setup lang="ts">
/**
 * Градієнтний спуск на f(x) = x², старт x = 10 — рівно та демонстрація,
 * що в розділі. Крок: x ← x − η·f'(x) = x(1 − 2η).
 * Числа з розділу відтворюються точно: η = 0,05 → 3,49; η = 1,1 → 61,9.
 */
import { ref, computed } from 'vue'

const eta = ref(0.2)
const steps = ref(10)
const X0 = 10

const path = computed(() => {
  const xs = [X0]
  for (let i = 0; i < steps.value; i++) xs.push(xs[xs.length - 1] * (1 - 2 * eta.value))
  return xs
})

const last = computed(() => path.value[path.value.length - 1])
const diverges = computed(() => Math.abs(1 - 2 * eta.value) > 1)

/** Межа осей: тримаємо видимими всі точки, але не даємо графіку схлопнутись. */
const span = computed(() => {
  const m = Math.max(12, ...path.value.map(x => Math.abs(x)).filter(Number.isFinite))
  return Math.min(m * 1.12, 200)
})

const W = 620, H = 260, PAD = 34
const sx = (x: number) => PAD + ((x + span.value) / (2 * span.value)) * (W - 2 * PAD)
const sy = (y: number) => H - PAD - (y / (span.value * span.value)) * (H - 2 * PAD)

const curve = computed(() => {
  const pts: string[] = []
  for (let i = 0; i <= 80; i++) {
    const x = -span.value + (2 * span.value * i) / 80
    pts.push(`${sx(x).toFixed(1)},${sy(x * x).toFixed(1)}`)
  }
  return pts.join(' ')
})

const marks = computed(() =>
  path.value
    .filter(x => Number.isFinite(x) && Math.abs(x) <= span.value)
    .map(x => ({ x: sx(x), y: sy(x * x), v: x }))
)

const fmt = (v: number) =>
  !Number.isFinite(v) ? '∞'
    : Math.abs(v) >= 1000 ? v.toExponential(1).replace('.', ',')
    : v.toFixed(2).replace('.', ',')

const PRESETS = [
  { eta: 0.05, label: 'η = 0,05 — повільно' },
  { eta: 0.2, label: 'η = 0,2 — влучно' },
  { eta: 0.55, label: 'η = 0,55 — коливання' },
  { eta: 1.1, label: 'η = 1,1 — розбігається' }
]
</script>

<template>
  <div class="lab">
    <div class="lab__head">
      <div>
        <div class="lab__title">Темп навчання на власних очах</div>
        <div class="lab__sub">
          Та сама демонстрація, що на рисунку: парабола f(x) = x², старт у точці x = 10.
          Крок спуску — <code>x ← x − η·f′(x) = x(1 − 2η)</code>.
        </div>
      </div>
    </div>

    <div class="lab__pills">
      <button v-for="p in PRESETS" :key="p.eta" class="lab__pill"
              :class="{ 'is-on': Math.abs(eta - p.eta) < 1e-9 }" @click="eta = p.eta">
        {{ p.label }}
      </button>
    </div>

    <div class="lab__controls">
      <label class="lab__ctl">
        <span>Темп навчання η = <b>{{ eta.toFixed(2).replace('.', ',') }}</b></span>
        <input type="range" min="0.01" max="1.3" step="0.01" v-model.number="eta" />
      </label>
      <label class="lab__ctl">
        <span>Ітерацій: <b>{{ steps }}</b></span>
        <input type="range" min="1" max="20" step="1" v-model.number="steps" />
      </label>
    </div>

    <svg :viewBox="`0 0 ${W} ${H}`" class="gd" role="img"
         aria-label="Траєкторія градієнтного спуску на параболі">
      <line :x1="PAD" :y1="H - PAD" :x2="W - PAD" :y2="H - PAD" class="gd__axis" />
      <line :x1="sx(0)" :y1="PAD - 8" :x2="sx(0)" :y2="H - PAD" class="gd__axis" />
      <polyline :points="curve" class="gd__curve" />
      <polyline v-if="marks.length > 1"
                :points="marks.map(m => `${m.x},${m.y}`).join(' ')" class="gd__path" />
      <g v-for="(m, i) in marks" :key="i">
        <circle :cx="m.x" :cy="m.y" :r="i === 0 ? 5 : 3.4"
                :class="i === 0 ? 'gd__start' : 'gd__dot'" />
      </g>
      <text :x="W - PAD" :y="H - PAD + 16" class="gd__lbl" text-anchor="end">x</text>
      <text :x="sx(0) + 6" :y="PAD - 2" class="gd__lbl">f(x) = x²</text>
    </svg>

    <div class="lab__stats">
      <div class="lab__stat">
        <b>{{ fmt(last) }}</b>
        <span>x після {{ steps }} ітерацій</span>
      </div>
      <div class="lab__stat" :class="diverges ? '' : 'is-green'">
        <b>{{ fmt(Math.abs(1 - 2 * eta)) }}</b>
        <span>множник |1 − 2η| за крок</span>
      </div>
      <div class="lab__stat" :class="diverges ? 'is-warm' : 'is-green'">
        <b>{{ diverges ? 'розбігається' : 'збігається' }}</b>
        <span>умова: |1 − 2η| &lt; 1, тобто η &lt; 1</span>
      </div>
    </div>

    <p class="lab__note">
      Спуск збігається, поки множник за крок менший від одиниці. Для параболи це
      дає точну межу η &lt; 1; за η = 0,5 мінімум береться за один крок, а далі
      кожен крок перестрибує його все далі. Для реальної функції втрат кривина
      залежить від даних, тому універсального η немає — його підбирають,
      пробуючи значення, що відрізняються в десять разів.
    </p>
  </div>
</template>

<style scoped>
.gd { width: 100%; height: auto; display: block; }
.gd__axis { stroke: var(--uk-line); stroke-width: 1; }
.gd__curve { fill: none; stroke: var(--vp-c-text-3); stroke-width: 1.6; opacity: 0.55; }
.gd__path { fill: none; stroke: var(--uk-accent); stroke-width: 1.6; stroke-dasharray: 4 3; }
.gd__dot { fill: var(--uk-accent); }
.gd__start { fill: var(--uk-warm); }
.gd__lbl { fill: var(--vp-c-text-3); font-size: 11px; }
</style>
