<script setup lang="ts">
/**
 * SGD на п'яти квартирах із закритою орендою D (лекція 09, розділ 5.1): один
 * шаблон, η = 0,1, ρ = 0,05. Кроки йдуть по відомих клітинках рядками, перший
 * крок — рівно блок «Розрахунок: один крок». Формули — (7).
 * Дані — tools/gen_lec09_widgets.py.
 */
import { ref, computed } from 'vue'
import d from '../../data/lec09_sgd.json'

const M = d.M as (number | null)[][]
const CELLS: [number, number][] = []
M.forEach((row, a) => row.forEach((x, b) => { if (x !== null) CELLS.push([a, b]) }))
const EPOCH = CELLS.length

/** Повний прогін: стан після кожного кроку. */
const states = (() => {
  let Z = [...d.Z], W = [...d.W]
  const rmse = () => Math.sqrt(CELLS.reduce((s, [a, b]) => s + ((M[a][b] as number) - Z[a] * W[b]) ** 2, 0) / EPOCH)
  const out = [{ Z, W, rmse: rmse(), info: null as null | Record<string, any> }]
  for (let t = 0; t < d.maxSteps; t++) {
    const [a, b] = CELLS[t % EPOCH]
    const z = Z[a], w = W[b]
    const pred = z * w, e = (M[a][b] as number) - pred
    const zn = z + d.eta * (e * w - d.rho * z)
    const wn = w + d.eta * (e * z - d.rho * w)
    Z = Z.map((v, i) => (i === a ? zn : v))
    W = W.map((v, i) => (i === b ? wn : v))
    out.push({ Z, W, rmse: rmse(), info: { a, b, x: M[a][b], pred, e, z, w, zn, wn, next: zn * wn } })
  }
  return out
})()

const step = ref(0)
const cur = computed(() => states[step.value])
const go = (n: number) => { step.value = Math.max(0, Math.min(d.maxSteps, n)) }

const f = (v: number, nd = 2) => v.toFixed(nd).replace('.', ',').replace('-', '−')
const pred = (a: number, b: number) => cur.value.Z[a] * cur.value.W[b]
const rent = computed(() => Math.round(d.rentMean + d.rentStd * pred(3, 1)))

const CW = 300, CH = 170, PL = 34, PB = 26, PT = 8, PR = 8
const top = states[0].rmse
const cx = (t: number) => PL + (t / d.maxSteps) * (CW - PL - PR)
const cy = (v: number) => CH - PB - (v / top) * (CH - PB - PT)
const curve = states.map((s, t) => `${cx(t)},${cy(s.rmse)}`).join(' ')
</script>

<template>
  <div class="lab">
    <div class="lab__head">
      <div>
        <div class="lab__title">Навчання на таблиці з діркою</div>
        <div class="lab__sub">
          П'ять квартир, оренду D закрито. Великі числа — відомі стандартизовані значення,
          дрібні — поточний прогноз z · w. Перший крок — той самий, що в розрахунку цього розділу.
        </div>
      </div>
    </div>

    <div class="sm__wrap">
      <table class="sm__grid">
        <thead><tr><th></th><th>вага z</th><th v-for="(c, b) in d.cols" :key="b">{{ c }}</th></tr></thead>
        <tbody>
          <tr><th>шаблон w</th><td class="is-empty"></td><td v-for="(w, b) in cur.W" :key="b" class="sm__par">{{ f(w) }}</td></tr>
          <tr v-for="(row, a) in M" :key="a">
            <th>{{ d.rows[a] }}</th>
            <td class="sm__par">{{ f(cur.Z[a]) }}</td>
            <td v-for="(x, b) in row" :key="b"
                :class="{ 'is-on': cur.info && cur.info.a === a && cur.info.b === b, 'is-empty': x === null }">
              <b v-if="x !== null">{{ f(x) }}</b>
              <span :data-check="`p${a}${b}`">{{ f(pred(a, b)) }}</span>
            </td>
          </tr>
        </tbody>
      </table>

      <div class="sm__info">
        <p class="sm__head">Крок <b data-check="step">{{ step }}</b> із {{ d.maxSteps }}<template v-if="step"> · епоха {{ Math.ceil(step / EPOCH) }}</template></p>
        <template v-if="cur.info">
          <p>клітинка {{ d.rows[cur.info.a] }}, {{ d.cols[cur.info.b] }}: {{ f(cur.info.x) }}</p>
          <p>прогноз <b data-check="pred">{{ f(cur.info.pred) }}</b>, помилка e = <b data-check="e">{{ f(cur.info.e) }}</b></p>
          <p>z: {{ f(cur.info.z) }} → <b data-check="z">{{ f(cur.info.zn) }}</b></p>
          <p>w: {{ f(cur.info.w) }} → <b data-check="w">{{ f(cur.info.wn) }}</b></p>
          <p>новий прогноз <b data-check="next">{{ f(cur.info.next) }}</b></p>
        </template>
        <p v-else>Натисніть «крок»: візьмемо першу відому клітинку.</p>
      </div>
    </div>

    <div class="lab__pills">
      <button class="lab__btn" :disabled="step >= d.maxSteps" @click="go(step + 1)">крок</button>
      <button class="lab__btn" :disabled="step >= d.maxSteps" @click="go(step + EPOCH)">епоха ({{ EPOCH }} кроків)</button>
      <button class="lab__btn" :disabled="step === 0" @click="go(0)">спочатку</button>
    </div>

    <svg :viewBox="`0 0 ${CW} ${CH}`" class="sm__plot" role="img" aria-label="Помилка на відомих клітинках за кроками">
      <line :x1="PL" :x2="CW - PR" :y1="cy(0)" :y2="cy(0)" class="sm__axis" />
      <line :x1="PL" :x2="PL" :y1="PT" :y2="cy(0)" class="sm__axis" />
      <text :x="PL - 5" :y="cy(0) + 4" text-anchor="end" class="sm__tick">0</text>
      <text :x="PL - 5" :y="cy(top) + 10" text-anchor="end" class="sm__tick">{{ f(top, 1) }}</text>
      <text :x="cx(d.maxSteps)" :y="CH - 8" text-anchor="end" class="sm__tick">{{ d.maxSteps }} кроків</text>
      <polyline :points="curve" class="sm__line" />
      <circle :cx="cx(step)" :cy="cy(cur.rmse)" r="4" class="sm__dot" />
    </svg>

    <div class="lab__stats">
      <div class="lab__stat is-green"><b data-check="rmse">{{ f(cur.rmse, 3) }}</b><span>RMSE на {{ EPOCH }} відомих клітинках</span></div>
      <div class="lab__stat"><b data-check="rent">{{ rent }}</b><span>прогноз оренди D, доларів (справжня 500)</span></div>
    </div>

    <p class="lab__note">
      За 20 епох (180 кроків) RMSE на відомих клітинках падає до 0,063, а закрита оренда D виходить
      близько 510 доларів, хоча в навчанні ця клітинка не брала участі.
    </p>
  </div>
</template>

<style scoped>
.sm__wrap {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  gap: 0.8rem;
  align-items: start;
  margin-bottom: 0.7rem;
}
.sm__grid {
  display: table;
  width: 100%;
  margin: 0;
  border-collapse: collapse;
  table-layout: fixed;
}
.sm__grid tr { background: none; border: 0; }
.sm__grid th { font-size: 0.72rem; font-weight: 500; color: var(--vp-c-text-2); border: 0; padding: 0.15rem; background: none; width: auto; }
.sm__grid td {
  border: 1px solid var(--uk-line);
  padding: 0.2rem 0.1rem;
  text-align: center;
  line-height: 1.15;
  background: var(--vp-c-bg);
  font-variant-numeric: tabular-nums;
}
.sm__grid td b { display: block; font-size: 0.95rem; }
.sm__grid td span { font-size: 0.72rem; color: var(--vp-c-text-2); }
.sm__grid td.sm__par { font-size: 0.82rem; color: #2F6DB5; }
.sm__grid td.is-empty { background: var(--vp-c-bg-soft); }
.sm__grid td.is-empty span { font-size: 0.9rem; font-style: italic; }
.sm__grid td.is-on { outline: 2px solid #C2571A; outline-offset: -2px; }
.sm__info { font-size: 0.86rem; line-height: 1.5; font-variant-numeric: tabular-nums; }
.sm__info p { margin: 0 0 0.15rem; }
.sm__head { font-size: 0.92rem; }
.sm__plot {
  width: 100%;
  max-width: 460px;
  height: auto;
  display: block;
  margin: 0.5rem auto;
  border: 1px solid var(--uk-line);
  border-radius: 8px;
  background: var(--vp-c-bg);
}
.sm__axis { stroke: var(--vp-c-text-3); stroke-width: 1; }
.sm__tick { font-size: 12px; fill: var(--vp-c-text-2); }
.sm__line { fill: none; stroke: #2F6DB5; stroke-width: 2; }
.sm__dot { fill: #C2571A; }
</style>
