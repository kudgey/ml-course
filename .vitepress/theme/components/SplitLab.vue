<script setup lang="ts">
/**
 * Перебір правил у корені дерева — та сама арифметика, що в таблиці розділу,
 * на тих самих 623 пасажирах навчальної частини. Ентропія кореня 0,961 біта;
 * приріст для «стать = жінка» 0,214, для «вартість < 10 £» 0,064, для
 * «клас = 1» 0,057. Усе рахується тут-таки, жодних заготовлених відповідей.
 */
import { ref, computed } from 'vue'
import data from '../../data/lec06_titanic.json'

type Feat = { unit: string; values: number[] }
const FEATS = data.features as Record<string, Feat>
const NAMES = Object.keys(FEATS)
const Y = data.y as number[]
const N = Y.length

const feat = ref('стать')
const thr = ref(0.5)

const values = computed(() => FEATS[feat.value].values)

function H(idx: number[]) {
  if (!idx.length) return 0
  let s = 0
  for (const i of idx) s += Y[i]
  const p = s / idx.length
  return p === 0 || p === 1 ? 0 : -p * Math.log2(p) - (1 - p) * Math.log2(1 - p)
}

/** Пороги-кандидати: середини між сусідніми унікальними значеннями ознаки. */
function candidates(v: number[]) {
  const u = [...new Set(v)].sort((a, b) => a - b)
  const out: number[] = []
  for (let i = 1; i < u.length; i++) out.push((u[i - 1] + u[i]) / 2)
  return out
}

function splitOf(v: number[], t: number) {
  const L: number[] = [], R: number[] = []
  for (let i = 0; i < N; i++) (v[i] < t ? L : R).push(i)
  const after = (L.length * H(L) + R.length * H(R)) / N
  return { L, R, after, ig: data.h0 - after }
}

/** Найкращий поріг для довільної ознаки — без жодних побічних ефектів,
    щоб той самий обчислювач можна було звати і для поточної, і для всіх. */
function bestOf(v: number[]) {
  let best = { t: 0, ig: -1 }
  for (const t of candidates(v)) {
    const ig = splitOf(v, t).ig
    if (ig > best.ig) best = { t, ig }
  }
  return best
}

const cand = computed(() => candidates(values.value))
const cur = computed(() => splitOf(values.value, thr.value))
const share = (idx: number[]) => (idx.length ? idx.reduce((s, i) => s + Y[i], 0) / idx.length : 0)

/** Крива приросту по всіх кандидатах — видно, де саме дерево ставить поріг. */
const curve = computed(() => cand.value.map(t => ({ t, ig: splitOf(values.value, t).ig })))
const bestSplit = computed(() => bestOf(values.value))

const bestOverall = computed(() => {
  let best = { name: '', t: 0, ig: -1 }
  for (const name of NAMES) {
    const b = bestOf(FEATS[name].values)
    if (b.ig > best.ig) best = { name, ...b }
  }
  return best
})

const W = 560, H_ = 150, PAD = 34
const tLo = computed(() => Math.min(...cand.value))
const tHi = computed(() => Math.max(...cand.value))
const igHi = computed(() => Math.max(0.02, ...curve.value.map(c => c.ig)))
const cx = (t: number) => PAD + ((t - tLo.value) / (tHi.value - tLo.value || 1)) * (W - 2 * PAD)
const cy = (g: number) => H_ - PAD - (g / igHi.value) * (H_ - 2 * PAD)
const path = computed(() =>
  curve.value.map(c => `${cx(c.t).toFixed(1)},${cy(c.ig).toFixed(1)}`).join(' '))

function pick(name: string) {
  feat.value = name
  thr.value = bestSplit.value.t          // одразу найкращий поріг для цієї ознаки
}

const f2 = (v: number) => v.toFixed(3).replace('.', ',')
const pc = (v: number) => (v * 100).toFixed(0) + ' %'
const PRESETS = [
  { name: 'стать', t: 0.5, label: 'стать = жінка' },
  { name: 'вартість квитка', t: 10, label: 'квиток < 10 £' },
  { name: 'клас квитка', t: 2, label: 'клас = 1' },
  { name: 'вік', t: 6.5, label: 'вік < 6,5' }
]
</script>

<template>
  <div class="lab">
    <div class="lab__head">
      <div>
        <div class="lab__title">Перебір правил у корені</div>
        <div class="lab__sub">
          Ті самі {{ N }} пасажирів навчальної частини, що в таблиці: вижили
          {{ data.survived }}, тож ентропія кореня дорівнює {{ f2(data.h0) }} біта.
          Оберіть ознаку й поріг — приріст інформації рахується тут-таки.
        </div>
      </div>
    </div>

    <div class="lab__pills">
      <button v-for="p in PRESETS" :key="p.label" class="lab__pill"
              :class="{ 'is-on': feat === p.name && Math.abs(thr - p.t) < 1e-9 }"
              @click="feat = p.name; thr = p.t">{{ p.label }}</button>
    </div>

    <div class="lab__pills">
      <button v-for="n in NAMES" :key="n" class="lab__pill sp__feat"
              :class="{ 'is-on': feat === n }" @click="pick(n)">{{ n }}</button>
    </div>

    <label class="lab__ctl sp__slider">
      <span>Правило: <b>{{ feat }} &lt; {{ f2(thr) }}</b> ({{ FEATS[feat].unit }})</span>
      <input type="range" :min="tLo" :max="tHi"
             :step="(tHi - tLo) / 400" v-model.number="thr" />
    </label>

    <div class="sp__groups">
      <div class="sp__grp">
        <div class="sp__gt">умова виконується</div>
        <b>{{ cur.L.length }}</b> пасажирів · вижили {{ pc(share(cur.L)) }}
        <div class="sp__ge">ентропія {{ f2(H(cur.L)) }}</div>
      </div>
      <div class="sp__grp">
        <div class="sp__gt">умова не виконується</div>
        <b>{{ cur.R.length }}</b> пасажирів · вижили {{ pc(share(cur.R)) }}
        <div class="sp__ge">ентропія {{ f2(H(cur.R)) }}</div>
      </div>
    </div>

    <figure class="sp__fig">
      <figcaption>приріст інформації по всіх порогах цієї ознаки</figcaption>
      <svg :viewBox="`0 0 ${W} ${H_}`" role="img" aria-label="Приріст інформації від порога">
        <line :x1="PAD" :y1="H_ - PAD" :x2="W - PAD" :y2="H_ - PAD" class="sp__axis" />
        <polyline :points="path" class="sp__curve" />
        <line :x1="cx(thr)" :y1="PAD - 8" :x2="cx(thr)" :y2="H_ - PAD" class="sp__now" />
        <circle :cx="cx(bestSplit.t)" :cy="cy(bestSplit.ig)" r="4.5" class="sp__best" />
        <text :x="W - PAD" :y="PAD - 12" class="sp__lbl" text-anchor="end">
          найкращий поріг цієї ознаки: {{ f2(bestSplit.t) }} → приріст {{ f2(bestSplit.ig) }}
        </text>
      </svg>
    </figure>

    <div class="lab__stats">
      <div class="lab__stat"><b>{{ f2(data.h0) }}</b><span>ентропія до розбиття</span></div>
      <div class="lab__stat"><b>{{ f2(cur.after) }}</b><span>зважена ентропія після</span></div>
      <div class="lab__stat" :class="cur.ig > 0.2 ? 'is-green' : cur.ig < 0.02 ? 'is-warm' : ''">
        <b>{{ f2(cur.ig) }}</b><span>приріст інформації</span>
      </div>
      <div class="lab__stat is-green">
        <b>{{ f2(bestOverall.ig) }}</b><span>найкраще з усіх ознак: {{ bestOverall.name }}</span>
      </div>
    </div>

    <p class="lab__note">
      Чотири кнопки зверху — рядки таблиці розділу; числа збігаються до третього
      знака. Далі спробуйте самі: оберіть ознаку, і поріг одразу стане найкращим
      для неї, а крива покаже, як приріст залежить від порога. Дві речі варто
      побачити власноруч.

      Перша: жодна ознака навіть близько не підходить до статі. Найкращий поріг
      віку — «менше року» — дає всього 0,013, найкращий поріг вартості квитка
      трохи більше; стать дає 0,214. Саме тому вона й стоїть у корені дерева, і
      тепер це не твердження зі слайда, а результат перебору на ваших очах.

      Друга: подивіться, де крива притискається до нуля. Це краї, де в одній
      гілці лишається кілька десятків людей: хоч би якою чистою вона була, її
      внесок зважується на розмір групи. Корисне розбиття має бути водночас
      чистим і достатньо великим — саме цей компроміс і зашитий у формулу
      приросту.
    </p>
  </div>
</template>

<style scoped>
.sp__feat { font-size: 0.78rem; }
.sp__slider { display: block; margin: 0.2rem 0 0.8rem; }
.sp__groups {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 0.8rem;
  margin-bottom: 0.8rem;
}
.sp__grp {
  border: 1px solid var(--uk-line);
  border-radius: 8px;
  padding: 0.6rem 0.8rem;
  font-size: 0.85rem;
  color: var(--vp-c-text-2);
}
.sp__grp b { font-size: 1.15rem; color: var(--vp-c-text-1); }
.sp__gt { font-size: 0.72rem; color: var(--vp-c-text-3); margin-bottom: 0.2rem; }
.sp__ge { font-size: 0.78rem; color: var(--vp-c-text-3); margin-top: 0.15rem; }
.sp__fig { margin: 0 0 0.8rem; }
.sp__fig figcaption {
  font-size: 0.75rem; color: var(--vp-c-text-3);
  margin-bottom: 0.3rem; text-align: center;
}
.sp__fig svg {
  width: 100%; height: auto; display: block;
  border: 1px solid var(--uk-line); border-radius: 8px; background: var(--vp-c-bg);
}
.sp__axis { stroke: var(--uk-line); stroke-width: 1; }
.sp__curve { fill: none; stroke: var(--uk-accent); stroke-width: 2.2; }
.sp__now { stroke: var(--uk-warm); stroke-width: 1.4; stroke-dasharray: 4 3; }
.sp__best { fill: var(--uk-green); }
.sp__lbl { fill: var(--vp-c-text-3); font-size: 10px; }
</style>
