<script setup lang="ts">
/**
 * Алгоритм Ллойда крок за кроком на справжніх даних Iris.
 * Узято дві ознаки з чотирьох — довжину й ширину пелюстки, стандартизовані, —
 * щоб рух центроїдів було видно на площині. Обидва кроки рахуються тут-таки:
 * призначення до найближчого центроїда і перенесення центроїда в середнє.
 */
import { ref, computed, watch } from 'vue'
import iris from '../../data/iris2d.json'

const X = iris.X as number[][]
const K = ref(3)
const seed = ref(1)
const step = ref(0)                       // 0 — лише стартові центроїди
const showTruth = ref(false)

/** Відтворюваний генератор: та сама «випадковість» на всіх машинах. */
function rng(s: number) {
  let v = s * 9301 + 49297
  return () => ((v = (v * 9301 + 49297) % 233280) / 233280)
}

function startCentres(k: number, s: number) {
  const r = rng(s)
  const idx = new Set<number>()
  while (idx.size < k) idx.add(Math.floor(r() * X.length))
  return [...idx].map(i => [X[i][0], X[i][1]] as [number, number])
}

/** Уся історія ітерацій для довільної пари (K, старт) — чиста функція,
    щоб її можна було звати і для поточних значень, і для перебору стартів. */
function run(k: number, s: number) {
  let C = startCentres(k, s)
  const hist: { C: [number, number][]; a: number[]; wcss: number }[] = []
  const assign = (C: [number, number][]) =>
    X.map(p => {
      let best = 0, bd = Infinity
      C.forEach((c, j) => {
        const d = (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2
        if (d < bd) { bd = d; best = j }
      })
      return best
    })
  const wcssOf = (C: [number, number][], a: number[]) =>
    X.reduce((s, p, i) => s + (p[0] - C[a[i]][0]) ** 2 + (p[1] - C[a[i]][1]) ** 2, 0)

  let a = assign(C)
  hist.push({ C: C.map(c => [...c] as [number, number]), a, wcss: wcssOf(C, a) })

  for (let it = 0; it < 12; it++) {
    const next: [number, number][] = C.map((c, j) => {
      const pts = X.filter((_, i) => a[i] === j)
      if (!pts.length) return c
      return [pts.reduce((s, p) => s + p[0], 0) / pts.length,
              pts.reduce((s, p) => s + p[1], 0) / pts.length]
    })
    const moved = next.some((c, j) => Math.abs(c[0] - C[j][0]) + Math.abs(c[1] - C[j][1]) > 1e-9)
    C = next
    a = assign(C)
    hist.push({ C: C.map(c => [...c] as [number, number]), a, wcss: wcssOf(C, a) })
    if (!moved) break
  }
  return hist
}

const history = computed(() => run(K.value, seed.value))

watch([K, seed], () => (step.value = 0))
const cur = computed(() => history.value[Math.min(step.value, history.value.length - 1)])
const done = computed(() => step.value >= history.value.length - 1)

/**
 * Найгірший і найкращий старти з дванадцяти. Рахуємо тим самим кодом, що й
 * основну історію: жодних заготовлених відповідей, лише перебір варіантів.
 * Це дає кнопку «невдалий старт» — розділ про K-means++ саме про неї.
 */
function finalWcss(k: number, s: number) {
  const h = run(k, s)
  return h[h.length - 1].wcss
}
const seeds = computed(() => {
  const out = [] as { s: number; w: number }[]
  for (let s = 1; s <= 12; s++) out.push({ s, w: finalWcss(K.value, s) })
  return out
})
const worstSeed = computed(() => seeds.value.reduce((a, b) => (b.w > a.w ? b : a)))
const bestSeed = computed(() => seeds.value.reduce((a, b) => (b.w < a.w ? b : a)))

const W = 460, H = 320, PAD = 30
const xs = X.map(p => p[0]), ys = X.map(p => p[1])
const x0 = Math.min(...xs), x1 = Math.max(...xs)
const y0 = Math.min(...ys), y1 = Math.max(...ys)
const sx = (v: number) => PAD + ((v - x0) / (x1 - x0)) * (W - 2 * PAD)
const sy = (v: number) => H - PAD - ((v - y0) / (y1 - y0)) * (H - 2 * PAD)

const COL = ['#2F6DB5', '#C2571A', '#1E8E6A', '#6B4C9A', '#B3312C']

/** Траєкторія кожного центроїда від старту до поточного кроку. */
const trails = computed(() =>
  Array.from({ length: K.value }, (_, j) =>
    history.value.slice(0, step.value + 1)
      .map(h => `${sx(h.C[j][0]).toFixed(1)},${sy(h.C[j][1]).toFixed(1)}`).join(' ')))

const fmt = (v: number) => v.toFixed(1).replace('.', ',')
</script>

<template>
  <div class="lab">
    <div class="lab__head">
      <div>
        <div class="lab__title">Алгоритм Ллойда крок за кроком</div>
        <div class="lab__sub">
          Справжні дані Iris: довжина й ширина пелюстки, стандартизовані. Кожен крок —
          це два дії поспіль: кожна точка йде до найближчого центроїда, кожен центроїд
          переїжджає в середнє своїх точок.
        </div>
      </div>
    </div>

    <div class="lab__controls">
      <label class="lab__ctl">
        <span>Кластерів K = <b>{{ K }}</b></span>
        <input type="range" min="2" max="5" step="1" v-model.number="K" />
      </label>
      <label class="lab__ctl">
        <span>Стартові центроїди: варіант <b>{{ seed }}</b></span>
        <input type="range" min="1" max="12" step="1" v-model.number="seed" />
      </label>
      <div class="lab__ctl">
        <span>Ітерація <b>{{ step }}</b> із {{ history.length - 1 }}</span>
        <div class="km__btns">
          <button class="lab__btn" :disabled="step === 0" @click="step = 0">на старт</button>
          <button class="lab__btn" :disabled="done" @click="step++">крок →</button>
          <button class="lab__btn" :disabled="done" @click="step = history.length - 1">до збіжності</button>
        </div>
      </div>
      <div class="lab__ctl">
        <span>Старти з різним результатом</span>
        <div class="km__btns">
          <button class="lab__btn" @click="seed = worstSeed.s; step = 0">невдалий</button>
          <button class="lab__btn" @click="seed = bestSeed.s; step = 0">найкращий</button>
        </div>
      </div>
    </div>

    <svg :viewBox="`0 0 ${W} ${H}`" class="km" role="img"
         aria-label="Кластеризація Iris за двома ознаками">
      <polyline v-for="(t, j) in trails" :key="'t' + j" :points="t"
                class="km__trail" :style="{ stroke: COL[j] }" />
      <circle v-for="(p, i) in X" :key="i" :cx="sx(p[0])" :cy="sy(p[1])" r="3"
              :fill="showTruth ? COL[iris.y[i]] : COL[cur.a[i]]"
              :opacity="showTruth ? 0.5 : 0.72" />
      <g v-for="(c, j) in cur.C" :key="'c' + j">
        <circle :cx="sx(c[0])" :cy="sy(c[1])" r="9" class="km__halo" :style="{ fill: COL[j] }" />
        <path :d="`M${sx(c[0]) - 6},${sy(c[1])}H${sx(c[0]) + 6}M${sx(c[0])},${sy(c[1]) - 6}V${sy(c[1]) + 6}`"
              class="km__cross" />
      </g>
      <text :x="W / 2" :y="H - 6" class="km__lbl" text-anchor="middle">довжина пелюстки, стандартизована</text>
      <text :x="10" :y="H / 2" class="km__lbl" text-anchor="middle"
            :transform="`rotate(-90 10 ${H / 2})`">ширина пелюстки</text>
    </svg>

    <div class="lab__stats">
      <div class="lab__stat"><b>{{ fmt(cur.wcss) }}</b><span>WCSS на цьому кроці</span></div>
      <div class="lab__stat" :class="done ? 'is-green' : ''">
        <b>{{ done ? 'збіглося' : 'триває' }}</b>
        <span>центроїди {{ done ? 'стоять на місці' : 'ще рухаються' }}</span>
      </div>
      <div class="lab__stat">
        <b>{{ history.length - 1 }}</b><span>ітерацій до збіжності</span>
      </div>
      <div class="lab__stat"
           :class="Math.abs(history[history.length - 1].wcss - bestSeed.w) < 1e-6 ? 'is-green' : 'is-warm'">
        <b>{{ fmt(bestSeed.w) }} … {{ fmt(worstSeed.w) }}</b>
        <span>межі підсумкового WCSS по дванадцяти стартах</span>
      </div>
      <button class="lab__stat km__toggle" @click="showTruth = !showTruth">
        <b>{{ showTruth ? 'види' : 'кластери' }}</b>
        <span>показано зараз — натисніть, щоб порівняти</span>
      </button>
    </div>

    <p class="lab__note">
      WCSS не зростає жодного разу — це і є гарантія алгоритму. Дві кнопки поруч
      із кроками перебирають дванадцять різних стартів і ставлять найгірший
      і найкращий за підсумковим WCSS, а плашка поруч показує обидві межі.

      І тут на цих даних відбувається несподіване. При K = 2 і K = 3 межі
      збігаються: 54,15 і 18,02 незалежно від старту. Тобто на двовимірних Iris
      невдалої ініціалізації просто не існує — усі дванадцять стартів приходять
      в одну точку. Посуньте K до чотирьох, і розрив з'явиться: від 12,28 до
      17,32, тобто на чверть; при K = 5 — від 9,16 до 17,15. Правило звідси не
      «ініціалізація завжди важлива», а точніше: що дрібніше ділимо дані, то
      більше локальних мінімумів і то потрібніший n_init. На простій задачі
      з трьома добре розділеними групами про старт можна не думати. Перемкніть на «види» — видно,
      що setosa відокремлюється ідеально, а versicolor і virginica частково змішані:
      кластери не зобов'язані збігатися з класами.
    </p>
  </div>
</template>

<style scoped>
.km { width: 100%; height: auto; display: block; margin-top: 0.4rem; }
.km__trail { fill: none; stroke-width: 1.4; stroke-dasharray: 3 3; opacity: 0.75; }
.km__halo { stroke: var(--vp-c-bg); stroke-width: 2; }
.km__cross { stroke: #fff; stroke-width: 1.8; }
.km__lbl { fill: var(--vp-c-text-3); font-size: 10px; }
.km__btns { display: flex; gap: 0.35rem; flex-wrap: wrap; }
.km__toggle {
  border: 1px solid var(--uk-line);
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
  font-family: inherit;
}
.km__toggle:hover { border-color: var(--uk-accent); }
</style>
