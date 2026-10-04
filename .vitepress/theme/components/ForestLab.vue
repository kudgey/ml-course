<script setup lang="ts">
/**
 * Беггінг і випадковий ліс на десяти пасажирах — ті самі п'ять бутстреп-вибірок,
 * пеньки й ознаки, що в коді розділів «Беггінг покроково» і «Випадковий ліс
 * покроково». Дані пише tools/gen_lec06_steps.py і звіряє з текстом; віджет лише
 * проводить обраного пасажира через кожен пеньок, усереднює ймовірності й рахує
 * оцінку поза мішком. Браузерну звірку робить course-site/check_lec06_widgets.mjs.
 */
import { ref, computed } from 'vue'
import data from '../../data/lec06_forest.json'

type Stump = [number, number, number, number]   // ознака, поріг, P ліворуч, P праворуч
const FEAT = data.features as string[]
const PASS = data.passengers as number[][]       // стать, клас, вік, квиток, вижив
const NEW = data.new as number[]
const BOOTS = data.boots as number[][]
const FEATS = data.feats as number[][]
const BAG = data.bag as Stump[]
const FOREST = data.forest as Stump[]

const mode = ref<'forest' | 'bag'>('forest')
const who = ref<number>(-1)                     // −1 — нова пасажирка, 0…9 — пасажири 1…10
const nTrees = ref(5)

const stumps = computed(() => (mode.value === 'forest' ? FOREST : BAG))
const x = computed(() => (who.value < 0 ? NEW : PASS[who.value]))

const f3 = (v: number) => v.toFixed(3).replace('.', ',')
const fT = (v: number) => v.toFixed(2).replace('.', ',')
function rule(j: number, t: number) {
  if (j === 0) return 'стать = жінка?'
  if (j === 3) return `квиток ≤ ${fT(t)} £?`
  return `${FEAT[j]} ≤ ${fT(t)}?`
}
function describe(row: number[]) {
  return `${row[0] ? 'чоловік' : 'жінка'}, клас ${row[1]}, ${String(row[2]).replace('.', ',')} р., квиток ${fT(row[3])} £`
}
const counts = BOOTS.map(b => {
  const c = Array(10).fill(0)
  b.forEach(i => c[i]++)
  return c
})

const trees = computed(() =>
  stumps.value.slice(0, nTrees.value).map(([j, t, pl, pr], k) => {
    const left = x.value[j] <= t
    const oob = who.value >= 0 && counts[k][who.value] === 0
    return { k, j, t, pl, pr, left, p: left ? pl : pr, oob }
  }))
const avg = computed(() => trees.value.reduce((s, tr) => s + tr.p, 0) / trees.value.length)
const yes = computed(() => trees.value.filter(tr => tr.p >= 0.5).length)
const oobTrees = computed(() => trees.value.filter(tr => tr.oob))
const oobAvg = computed(() =>
  oobTrees.value.length ? oobTrees.value.reduce((s, tr) => s + tr.p, 0) / oobTrees.value.length : NaN)
const truth = computed(() => (x.value[0] ? ['загинув', 'вижив'] : ['загинула', 'вижила'])[x.value[4]])
const treesWord = (n: number) => (n === 1 ? 'дерева' : 'дерев')
</script>

<template>
  <div class="lab">
    <div class="lab__head">
      <div>
        <div class="lab__title">Беггінг і ліс на десяти пасажирах</div>
        <div class="lab__sub">
          П'ять пеньків на тих самих бутстреп-вибірках. У беггінгу кожен пеньок бачить
          усі чотири ознаки, у випадковому лісі — лише дві, випадково витягнуті для нього.
        </div>
      </div>
    </div>

    <div class="lab__pills">
      <button class="lab__pill" :class="{ 'is-on': mode === 'forest' }" @click="mode = 'forest'">випадковий ліс: 2 випадкові ознаки</button>
      <button class="lab__pill" :class="{ 'is-on': mode === 'bag' }" @click="mode = 'bag'">беггінг: усі 4 ознаки</button>
    </div>
    <div class="lab__pills">
      <span class="fl__cap">пасажир:</span>
      <button class="lab__pill" :class="{ 'is-on': who === -1 }" @click="who = -1">нова пасажирка</button>
      <button v-for="n in 10" :key="n" class="lab__pill" :class="{ 'is-on': who === n - 1 }"
              @click="who = n - 1">{{ n }}</button>
    </div>
    <p class="fl__who">{{ who < 0 ? 'Нова пасажирка з тестової частини' : `Пасажир ${who + 1}` }}: {{ describe(x) }}; насправді {{ truth }}.</p>

    <label class="lab__ctl">
      <span>Дерев у ансамблі: <b>{{ nTrees }}</b></span>
      <input type="range" min="1" max="5" step="1" v-model.number="nTrees" />
    </label>

    <div class="fl__grid">
      <div v-for="tr in trees" :key="tr.k" class="fl__tree" :class="{ 'is-oob': tr.oob }">
        <div class="fl__name">Дерево {{ tr.k + 1 }}<span v-if="tr.oob" class="fl__badge">поза мішком</span></div>
        <div class="fl__chips">
          <span v-for="(c, i) in counts[tr.k]" :key="i" class="fl__chip"
                :class="{ 'is-out': c === 0, 'is-me': i === who }">{{ i + 1 }}<sub v-if="c > 1">×{{ c }}</sub></span>
        </div>
        <div class="fl__feats">{{ mode === 'forest' ? 'випали: ' + FEATS[tr.k].map(f => FEAT[f]).join(' і ') : 'усі 4 ознаки' }}</div>
        <div class="fl__rule">{{ rule(tr.j, tr.t) }}</div>
        <div class="fl__leaves">
          <div class="fl__leaf" :class="{ 'is-path': tr.left }">так<br><b>{{ f3(tr.pl) }}</b></div>
          <div class="fl__leaf" :class="{ 'is-path': !tr.left }">ні<br><b>{{ f3(tr.pr) }}</b></div>
        </div>
      </div>
    </div>

    <div class="lab__stats">
      <div class="lab__stat is-green"><b data-check="avg">{{ f3(avg) }}</b><span>середня ймовірність вижити</span></div>
      <div class="lab__stat"><b data-check="votes">{{ yes }} з {{ trees.length }}</b><span>{{ treesWord(trees.length) }} дають «вижив» (імовірність ≥ 0,5)</span></div>
      <div class="lab__stat"><b>{{ (x[0] ? ['загинув', 'вижив'] : ['загинула', 'вижила'])[avg >= 0.5 ? 1 : 0] }}</b><span>прогноз ансамблю</span></div>
      <div v-if="who >= 0" class="lab__stat"><b data-check="oob">{{ oobTrees.length ? f3(oobAvg) : '—' }}</b><span>оцінка поза мішком: середнє {{ oobTrees.length }} дерев, які не бачили пасажира</span></div>
    </div>

    <p class="lab__note">
      У беггінгу всі п'ять пеньків обирають стать — бутстреп змінює лише числа в листках.
      Перемкніть на випадковий ліс: дерева 1 і 2 без статі розбивають за вартістю квитка,
      дерево 3 — за класом, дерево 5 — за віком, і для нової пасажирки середнє падає з 1,000 до 0,669.
      Номери в рядку — бутстреп-вибірка дерева: «×3» означає, що пасажира витягнуто тричі, сірі
      номери — поза мішком. Оберіть пасажира 3: його не бачили дерева 1, 3 і 4, і в беггінгу саме
      вони дають оцінку поза мішком 0,178.
    </p>
  </div>
</template>

<style scoped>
.fl__cap { font-size: 0.8rem; color: var(--vp-c-text-3); align-self: center; margin-right: 0.2rem; }
.fl__who { font-size: 0.86rem; color: var(--vp-c-text-2); margin: 0.2rem 0 0.6rem; }
.fl__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(150px, 100%), 1fr));
  gap: 0.6rem;
  margin: 0.6rem 0 0.8rem;
}
.fl__tree { border: 1px solid var(--uk-line); border-radius: 8px; padding: 0.5rem; background: var(--vp-c-bg); }
.fl__tree.is-oob { border-color: #6B4C9A; }
.fl__name { font-weight: 600; font-size: 0.86rem; margin-bottom: 0.3rem; }
.fl__badge { font-size: 0.66rem; font-weight: 500; color: #6B4C9A; margin-left: 0.35rem; }
.fl__chips { display: flex; flex-wrap: wrap; gap: 2px; margin-bottom: 0.35rem; }
.fl__chip {
  font-size: 0.68rem; min-width: 1.35rem; text-align: center; border-radius: 4px;
  background: var(--uk-fill); color: var(--vp-c-text-1); padding: 0 2px; font-variant-numeric: tabular-nums;
}
.fl__chip.is-out { color: var(--vp-c-text-3); background: transparent; border: 1px dashed var(--uk-line); }
.fl__chip.is-me { outline: 2px solid #B3312C; }
.fl__chip sub { font-size: 0.58rem; }
.fl__feats { font-size: 0.72rem; color: var(--vp-c-text-3); }
.fl__rule { font-size: 0.8rem; margin: 0.25rem 0; }
.fl__leaves { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; }
.fl__leaf {
  text-align: center; font-size: 0.72rem; color: var(--vp-c-text-3);
  border: 1px solid var(--uk-line); border-radius: 6px; padding: 0.2rem;
}
.fl__leaf b { font-size: 0.86rem; color: var(--vp-c-text-1); font-variant-numeric: tabular-nums; }
.fl__leaf.is-path { border-color: #B3312C; background: var(--uk-warm-soft); }
</style>
