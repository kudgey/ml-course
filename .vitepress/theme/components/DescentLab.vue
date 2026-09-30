<script setup lang="ts">
/**
 * Градієнтний спуск логістичної регресії на двох стандартизованих ознаках
 * (радіус і увігнуті точки, без зсуву) — та сама поверхня, старт (−2,6; 2,9),
 * крок η = 1,6 і 60 кроків, що на рисунку 05_04. Дані й еталонна траєкторія —
 * з tools/gen_lec05_widgets.py; віджет рахує кроки сам, у браузері, і при
 * η = 1,6 мусить повторити еталон: крок 1 → (−1,974; 3,304), втрата 0,521;
 * крок 60 → втрата 0,196. Звірку робить course-site/check_lec05_widgets.mjs.
 */
import { ref, computed } from 'vue'
import data from '../../data/lec05_descent.json'

const Z = data.Z as number[][]
const Y = data.y as number[]
const START = data.start as number[]
const REF = data.path as number[][]       // [w1, w2, втрата, ∂1, ∂2] для η = 1,6
const BOX = data.box as { x: number[]; y: number[] }
const CONTOURS = data.contours as { level: number; lines: number[][][] }[]
const N = Y.length
const MAXK = 200

const ETAS = [0.3, 1.6, 5]  // 5 — найбільший, за якого шлях лишається в межах рисунка
const eta = ref(data.eta as number)
const k = ref(0)

const sigmoid = (z: number) => 1 / (1 + Math.exp(-z))
function state(w: number[]) {
  let loss = 0, g0 = 0, g1 = 0
  for (let i = 0; i < N; i++) {
    const z = Z[i][0] * w[0] + Z[i][1] * w[1]
    loss += Math.max(z, 0) + Math.log1p(Math.exp(-Math.abs(z))) - Y[i] * z   // log(1 + eᶻ) − y·z
    const r = sigmoid(z) - Y[i]
    g0 += r * Z[i][0]
    g1 += r * Z[i][1]
  }
  return { loss: loss / N, g: [g0 / N, g1 / N] }
}

// траєкторія для поточного η: MAXK кроків, рахуються один раз на зміну η
const path = computed(() => {
  const out: { w: number[]; loss: number; g: number[] }[] = []
  let w = [...START]
  for (let i = 0; i <= MAXK; i++) {
    const s = state(w)
    out.push({ w, loss: s.loss, g: s.g })
    w = [w[0] - eta.value * s.g[0], w[1] - eta.value * s.g[1]]
  }
  return out
})
const cur = computed(() => path.value[k.value])

const W = 330, H = 290, P = 30
const sx = (x: number) => P + ((x - BOX.x[0]) / (BOX.x[1] - BOX.x[0])) * (W - 2 * P)
const sy = (y: number) => H - P - ((y - BOX.y[0]) / (BOX.y[1] - BOX.y[0])) * (H - 2 * P)
const inBox = (w: number[]) => w[0] >= BOX.x[0] - 2 && w[0] <= BOX.x[1] + 2 && w[1] >= BOX.y[0] - 2 && w[1] <= BOX.y[1] + 2
const contourPaths = CONTOURS.map(c => ({
  level: c.level,
  d: c.lines.map(l => 'M' + l.map(([a, b]) => `${sx(a).toFixed(1)},${sy(b).toFixed(1)}`).join('L')).join(' '),
}))
const trail = computed(() =>
  path.value.slice(0, k.value + 1).filter(p => inBox(p.w))
    .map(p => `${sx(p.w[0]).toFixed(1)},${sy(p.w[1]).toFixed(1)}`).join(' '))
const best = REF[REF.length - 1]

// крива навчання
const LW = 300, LH = 170, LP = 30
const shown = computed(() => Math.max(60, k.value))
const lx = (i: number) => LP + (i / shown.value) * (LW - LP - 8)
const ly = (v: number) => LH - LP + 8 - (Math.min(v, 1) / 1) * (LH - LP - 8)
const lossLine = computed(() =>
  path.value.slice(0, k.value + 1).map((p, i) => `${lx(i).toFixed(1)},${ly(p.loss).toFixed(1)}`).join(' '))

const go = (n: number) => (k.value = Math.min(MAXK, Math.max(0, n)))
function setEta(v: number) { eta.value = v; k.value = 0 }

const f3 = (v: number) => v.toFixed(3).replace('.', ',').replace('-', '−')
const fE = (v: number) => String(v).replace('.', ',')
</script>

<template>
  <div class="lab">
    <div class="lab__head">
      <div>
        <div class="lab__title">Градієнтний спуск на справжній поверхні втрат</div>
        <div class="lab__sub">
          Модель на двох стандартизованих ознаках (середнє 0, відхилення 1) — радіусі
          й увігнутих точках, без зсуву. Кожен крок: w ← w − η·∇𝓛(w). Старт і крок η = 1,6 — ті самі, що на рисунку.
        </div>
      </div>
    </div>

    <div class="lab__pills">
      <span class="dl__cap">крок навчання η:</span>
      <button v-for="e in ETAS" :key="e" class="lab__pill" :class="{ 'is-on': eta === e }"
              @click="setEta(e)">{{ fE(e) }}</button>
    </div>

    <div class="dl__grid">
      <figure>
        <figcaption>лінії рівня втрат і шлях спуску</figcaption>
        <svg :viewBox="`0 0 ${W} ${H}`" role="img" aria-label="Поверхня втрат і шлях градієнтного спуску">
          <rect :x="P" :y="P" :width="W - 2 * P" :height="H - 2 * P" class="dl__box" />
          <path v-for="c in contourPaths" :key="c.level" :d="c.d" class="dl__lvl" />
          <polyline :points="trail" class="dl__trail" />
          <rect :x="sx(START[0]) - 5" :y="sy(START[1]) - 5" width="10" height="10" class="dl__start" />
          <text :x="sx(best[0])" :y="sy(best[1]) + 5" class="dl__star" text-anchor="middle">★</text>
          <circle v-if="inBox(cur.w)" :cx="sx(cur.w[0])" :cy="sy(cur.w[1])" r="5.5" class="dl__cur" />
          <text :x="W / 2" :y="H - 6" class="dl__lbl" text-anchor="middle">вага w₁ (радіус)</text>
          <text :x="10" :y="H / 2" class="dl__lbl" text-anchor="middle" :transform="`rotate(-90 10 ${H / 2})`">вага w₂ (увігнуті точки)</text>
        </svg>
      </figure>
      <figure>
        <figcaption>втрата за кроками</figcaption>
        <svg :viewBox="`0 0 ${LW} ${LH}`" role="img" aria-label="Крива навчання">
          <line :x1="LP" :x2="LW - 8" :y1="ly(0)" :y2="ly(0)" class="dl__axis" />
          <line :x1="LP" :x2="LP" :y1="ly(1)" :y2="ly(0)" class="dl__axis" />
          <text :x="LP - 4" :y="ly(0) + 3" class="dl__lbl" text-anchor="end">0</text>
          <text :x="LP - 4" :y="ly(1) + 3" class="dl__lbl" text-anchor="end">1</text>
          <text :x="LW - 8" :y="LH - 4" class="dl__lbl" text-anchor="end">{{ shown }} кроків</text>
          <polyline :points="lossLine" class="dl__loss" />
        </svg>
      </figure>
    </div>

    <div class="lab__pills">
      <button class="lab__pill" @click="go(k + 1)">крок</button>
      <button class="lab__pill" @click="go(k + 10)">+10 кроків</button>
      <button class="lab__pill" @click="go(60)">до 60-го кроку</button>
      <button class="lab__pill" @click="go(0)">скинути</button>
    </div>

    <div class="lab__stats">
      <div class="lab__stat"><b data-check="k">{{ k }}</b><span>крок</span></div>
      <div class="lab__stat"><b data-check="w">({{ f3(cur.w[0]) }}; {{ f3(cur.w[1]) }})</b><span>ваги w</span></div>
      <div class="lab__stat is-green"><b data-check="loss">{{ f3(cur.loss) }}</b><span>втрата 𝓛(w)</span></div>
      <div class="lab__stat"><b data-check="g">({{ f3(cur.g[0]) }}; {{ f3(cur.g[1]) }})</b><span>градієнт ∇𝓛(w)</span></div>
    </div>

    <p class="lab__note">
      Натисніть «крок» один раз: із (−2,6; 2,9) і градієнта (−0,391; −0,253) спуск
      переходить у (−1,974; 3,304), а втрата падає з 0,794 до 0,521 — ті самі числа,
      що в тексті. «До 60-го кроку» дає 0,196, як на рисунку. Тепер поставте
      η = 0,3: спуск іде тим самим напрямом, але вп'ятеро повільніше, і за 60 кроків
      втрата лише 0,252. При η = 5 уже за 60 кроків маємо 0,192 — нижче, ніж при
      1,6: ця поверхня полога, і великий крок їй не шкодить. Так буває не завжди:
      на крутішій поверхні завеликий крок перескакує мінімум, і втрата починає
      рости, — у лекції 10 це видно на нейронній мережі.
    </p>
  </div>
</template>

<style scoped>
.dl__cap { font-size: 0.8rem; color: var(--vp-c-text-3); align-self: center; margin-right: 0.2rem; }
.dl__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(260px, 100%), 1fr));
  gap: 1rem;
  margin: 0.4rem 0 0.6rem;
}
.dl__grid figure { margin: 0; }
.dl__grid figcaption { font-size: 0.75rem; color: var(--vp-c-text-3); margin-bottom: 0.25rem; text-align: center; }
.dl__grid svg { width: 100%; height: auto; display: block; }
.dl__box { fill: none; stroke: var(--uk-line); }
.dl__lvl { fill: none; stroke: #2F6DB5; stroke-opacity: 0.55; stroke-width: 1; }
.dl__trail { fill: none; stroke: #B3312C; stroke-width: 1.8; }
.dl__start { fill: #B3312C; }
.dl__star { fill: #1E8E6A; font-size: 16px; }
.dl__cur { fill: #C2571A; stroke: white; stroke-width: 1.5; }
.dl__axis { stroke: var(--uk-line); stroke-width: 1; }
.dl__loss { fill: none; stroke: #2F6DB5; stroke-width: 2; }
.dl__lbl { fill: var(--vp-c-text-3); font-size: 10px; }
</style>
