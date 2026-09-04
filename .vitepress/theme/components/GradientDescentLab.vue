<script setup lang="ts">
/**
 * Два режими, обидва з цієї ж лекції.
 *
 * «Парабола» — демонстрація розділу «Завеликий крок розхитує спуск»:
 * f(x) = x², старт x = 10, крок x ← x − η·f′(x) = x(1 − 2η).
 * Числа розділу відтворюються точно: η = 0,05 → 3,49; η = 1,1 → 61,9.
 *
 * «Дві ознаки California» — розділ «Масштаб ознак вирішує, скільки кроків
 * потрібно». Матриці A = XᵀX/N і вектори b = Xᵀy/N пораховані на справжніх
 * 20 640 округах для пари ознак «медіанний дохід / вік будинків», центрованих
 * і, у другому варіанті, стандартизованих. Спуск тут той самий, що на рисунку:
 * w ← w − η(Aw − b) із кроком η = 1/λmax, і він відтворює числа розділу —
 * обумовленість 44 проти 1,27 і 305 кроків проти 5.
 */
import { ref, computed } from 'vue'

type Vec = [number, number]
type Mat = [[number, number], [number, number]]

const mode = ref<'parabola' | 'california'>('parabola')

/* ── режим 1: парабола ─────────────────────────────────────────────── */
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

/* ── режим 2: дві ознаки California ────────────────────────────────── */
const scaled = ref(false)
const kEta = ref(1)

/** Пораховано на 20 640 округах; центровано, у варіанті «std» — і поділено на σ. */
const CASE: Record<'raw' | 'std', { A: Mat; b: Vec; w: Vec; cond: number; eta: number }> = {
  raw: {
    A: [[3.6091477, -2.8460024], [-2.8460024, 158.3885862]],
    b: [1.5084017, 1.5339137],
    w: [0.4316919, 0.0174413],
    cond: 44.5,
    eta: 0.0063115
  },
  std: {
    A: [[1, -0.11903399], [-0.11903399, 1]],
    b: [0.79398939, 0.12188183],
    w: [0.82011779, 0.21950373],
    cond: 1.27,
    eta: 0.89362790
  }
}

const cs = computed(() => CASE[scaled.value ? 'std' : 'raw'])

/** Спуск w ← w − η(Aw − b) до відносної похибки 10⁻³, як на рисунку. */
const run = computed(() => {
  const { A, b, w: opt, eta: e0 } = cs.value
  const eta2 = e0 * kEta.value
  const nOpt = Math.hypot(opt[0], opt[1])
  let w: Vec = [0, 0]
  const trail: Vec[] = [[0, 0]]
  let done = 0
  for (let i = 0; i < 4000; i++) {
    const g: Vec = [A[0][0] * w[0] + A[0][1] * w[1] - b[0],
                    A[1][0] * w[0] + A[1][1] * w[1] - b[1]]
    w = [w[0] - eta2 * g[0], w[1] - eta2 * g[1]]
    if (!Number.isFinite(w[0]) || !Number.isFinite(w[1]) || Math.hypot(w[0], w[1]) > 1e6) {
      done = -1; break
    }
    trail.push(w)
    done = i + 1
    if (Math.hypot(w[0] - opt[0], w[1] - opt[1]) / nOpt < 1e-3) break
  }
  return { trail, iters: done, converged: done > 0 && done < 4000 }
})

/** Власні пари симетричної матриці 2×2 — потрібні, щоб намалювати еліпси рівня. */
const eig = computed(() => {
  const [[a, b], , ] = cs.value.A as unknown as [[number, number], [number, number]]
  const d = cs.value.A[1][1]
  const tr = a + d, det = a * d - b * b
  const s = Math.sqrt(Math.max(tr * tr - 4 * det, 0))
  const l1 = (tr + s) / 2, l2 = (tr - s) / 2
  const norm = (v: Vec): Vec => { const n = Math.hypot(v[0], v[1]) || 1; return [v[0] / n, v[1] / n] }
  const v1: Vec = Math.abs(b) > 1e-12 ? norm([b, l1 - a]) : [1, 0]
  const v2: Vec = [-v1[1], v1[0]]
  return { l1, l2, v1, v2 }
})

const spanCA = computed(() => {
  const opt = cs.value.w
  let m = Math.max(Math.abs(opt[0]), Math.abs(opt[1]))
  for (const p of run.value.trail) {
    if (!Number.isFinite(p[0])) continue
    m = Math.max(m, Math.abs(p[0] - opt[0]), Math.abs(p[1] - opt[1]))
  }
  return Math.max(m, 1e-6) * 1.35
})

const cx = (v: number) => PAD + ((v - (cs.value.w[0] - spanCA.value)) / (2 * spanCA.value)) * (W - 2 * PAD)
const cy = (v: number) => H - PAD - ((v - (cs.value.w[1] - spanCA.value)) / (2 * spanCA.value)) * (H - 2 * PAD)

/** Еліпси рівня ½·dᵀA d = c у власному базисі: півосі √(2c/λ). */
const rings = computed(() => {
  const { l1, l2, v1, v2 } = eig.value
  const opt = cs.value.w
  const out: string[] = []
  for (let r = 1; r <= 6; r++) {
    const c = 0.5 * l2 * Math.pow(spanCA.value * (r / 6), 2)
    const a1 = Math.sqrt(2 * c / l1), a2 = Math.sqrt(2 * c / l2)
    const pts: string[] = []
    for (let i = 0; i <= 72; i++) {
      const t = (i / 72) * 2 * Math.PI
      const p0 = opt[0] + a1 * Math.cos(t) * v1[0] + a2 * Math.sin(t) * v2[0]
      const p1 = opt[1] + a1 * Math.cos(t) * v1[1] + a2 * Math.sin(t) * v2[1]
      pts.push(`${cx(p0).toFixed(1)},${cy(p1).toFixed(1)}`)
    }
    out.push(pts.join(' '))
  }
  return out
})

const trailPts = computed(() =>
  run.value.trail
    .filter(p => Number.isFinite(p[0]) &&
                 Math.abs(p[0] - cs.value.w[0]) <= spanCA.value * 1.6 &&
                 Math.abs(p[1] - cs.value.w[1]) <= spanCA.value * 1.6)
    .map(p => `${cx(p[0]).toFixed(1)},${cy(p[1]).toFixed(1)}`)
    .join(' ')
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
          <template v-if="mode === 'parabola'">
            Та сама демонстрація, що на рисунку: парабола f(x) = x², старт у точці x = 10.
            Крок спуску — <code>x ← x − η·f′(x) = x(1 − 2η)</code>.
          </template>
          <template v-else>
            Ті самі 20 640 округів Каліфорнії, дві ознаки — медіанний дохід і вік
            будинків. Лінії рівня справжньої функції втрат, крок
            <code class="nb">w ← w − η(Aw − b)</code> із базовим η = 1/λ<sub>max</sub>.
          </template>
        </div>
      </div>
    </div>

    <div class="lab__pills">
      <button class="lab__pill" :class="{ 'is-on': mode === 'parabola' }"
              @click="mode = 'parabola'">парабола f(x) = x²</button>
      <button class="lab__pill" :class="{ 'is-on': mode === 'california' }"
              @click="mode = 'california'">дві ознаки California</button>
    </div>

    <!-- ── парабола ────────────────────────────────────────────────── -->
    <template v-if="mode === 'parabola'">
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
        залежить від даних — перемкніть режим і подивіться, що з цього виходить.
      </p>
    </template>

    <!-- ── California ──────────────────────────────────────────────── -->
    <template v-else>
      <div class="lab__pills">
        <button class="lab__pill" :class="{ 'is-on': !scaled }" @click="scaled = false">
          сирі ознаки
        </button>
        <button class="lab__pill" :class="{ 'is-on': scaled }" @click="scaled = true">
          стандартизовані
        </button>
      </div>

      <div class="lab__controls">
        <label class="lab__ctl">
          <span>Темп навчання η = <b>{{ kEta.toFixed(2).replace('.', ',') }}</b> × 1/λ<sub>max</sub></span>
          <input type="range" min="0.1" max="2.2" step="0.05" v-model.number="kEta" />
        </label>
      </div>

      <svg :viewBox="`0 0 ${W} ${H}`" class="gd" role="img"
           aria-label="Лінії рівня функції втрат і траєкторія спуску у просторі двох ваг">
        <line :x1="PAD" :y1="cy(cs.w[1])" :x2="W - PAD" :y2="cy(cs.w[1])" class="gd__axis" />
        <line :x1="cx(cs.w[0])" :y1="PAD" :x2="cx(cs.w[0])" :y2="H - PAD" class="gd__axis" />
        <polyline v-for="(r, i) in rings" :key="i" :points="r" class="gd__ring" />
        <polyline v-if="trailPts" :points="trailPts" class="gd__path" />
        <circle :cx="cx(0)" :cy="cy(0)" r="4.5" class="gd__start" />
        <g :transform="`translate(${cx(cs.w[0])} ${cy(cs.w[1])})`">
          <path d="M0,-7 L2,-2 L7,-2 L3,1 L4,6 L0,3 L-4,6 L-3,1 L-7,-2 L-2,-2 Z"
                class="gd__opt" />
        </g>
        <text :x="W - PAD" :y="cy(cs.w[1]) - 8" class="gd__lbl" text-anchor="end">
          вага при доході
        </text>
        <text :x="cx(cs.w[0]) + 7" :y="PAD + 4" class="gd__lbl">вага при віці будинків</text>
      </svg>

      <div class="lab__stats">
        <div class="lab__stat" :class="scaled ? 'is-green' : 'is-warm'">
          <b>{{ scaled ? '1,27' : '44,5' }}</b>
          <span>число обумовленості</span>
        </div>
        <div class="lab__stat" :class="run.converged ? 'is-green' : 'is-warm'">
          <b>{{ run.converged ? run.iters : '—' }}</b>
          <span>кроків до збіжності</span>
        </div>
        <div class="lab__stat" :class="run.converged ? 'is-green' : 'is-warm'">
          <b>{{ run.iters === -1 ? 'розбігається' : run.converged ? 'збігається' : 'не встиг' }}</b>
          <span>межа: η &lt; 2/λ<sub>max</sub></span>
        </div>
      </div>

      <p class="lab__note">
        Зірка — точний розв'язок, точка ліворуч унизу — старт із нульових ваг.
        На сирих ознаках лінії рівня витягнуті у вузьку долину: градієнт майже не
        має складової вздовж плаского напрямку, і спуск повзе по дну — <b>305</b>
        кроків. Стандартизація не змінює ані даних, ані розв'язку — лише одиниці
        виміру, — але лінії рівня стають майже колами, і тих самих ваг спуск
        досягає за <b>5</b> кроків. Посуньте повзунок за 2,0: там починається та
        сама межа η &lt; 2/λ<sub>max</sub>, що й у режимі параболи.
      </p>
    </template>
  </div>
</template>

<style scoped>
.gd { width: 100%; height: auto; display: block; }
.gd__axis { stroke: var(--uk-line); stroke-width: 1; }
.gd__curve { fill: none; stroke: var(--vp-c-text-3); stroke-width: 1.6; opacity: 0.55; }
.gd__ring { fill: none; stroke: var(--uk-accent); stroke-width: 1; opacity: 0.5; }
.gd__path { fill: none; stroke: var(--uk-warm); stroke-width: 1.7; }
.gd__dot { fill: var(--uk-accent); }
.gd__start { fill: var(--uk-warm); }
.gd__opt { fill: var(--uk-green); }
.gd__lbl { fill: var(--vp-c-text-3); font-size: 11px; }
.lab__sub .nb { white-space: nowrap; }
</style>
