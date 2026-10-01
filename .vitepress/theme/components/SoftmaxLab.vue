<script setup lang="ts">
/**
 * Softmax трьох оцінок: z → eᶻ → ділення на суму → p, і перехресна ентропія
 * −log p правильного класу. Стартові оцінки (−2,85; 0,86; 0,28) — приклад
 * розділу «Мультиклас: one-vs-rest і softmax»; еталонні eᶻ, сума, p і втрата —
 * з tools/gen_lec05_widgets.py, який звіряє їх із текстом. Браузерну звірку
 * робить course-site/check_lec05_widgets.mjs.
 */
import { ref, computed } from 'vue'
import data from '../../data/lec05_softmax.json'

const LIM = 8
const z = ref<number[]>([...data.z])
const truth = ref<number>(data.true)

const softmax = (v: number[]) => {
  const e = v.map(Math.exp)
  const s = e.reduce((x, y) => x + y, 0)
  return { e, s, p: e.map(x => x / s) }
}
const cur = computed(() => softmax(z.value))
const loss = computed(() => -Math.log(cur.value.p[truth.value]))
// K = 2 усередині K = 3: класи 2 і 3 окремо — це сигмоїда від різниці оцінок
const pair = computed(() => ({
  ratio: cur.value.p[1] / (cur.value.p[1] + cur.value.p[2]),
  diff: z.value[1] - z.value[2],
}))

const START = softmax(data.z)
const canShift = computed(() => Math.max(...z.value) + 2 <= LIM)
const canScale = computed(() => Math.max(...z.value.map(Math.abs)) * 2 <= LIM)
const isStart = computed(() => z.value.every((v, k) => Math.abs(v - data.z[k]) < 1e-9))

const COLORS = ['#2F6DB5', '#C2571A', '#1E8E6A']
const f3 = (v: number) => v.toFixed(3).replace('.', ',').replace('-', '−')
const f2 = (v: number) => v.toFixed(2).replace('.', ',').replace('-', '−')
</script>

<template>
  <div class="lab">
    <div class="lab__head">
      <div>
        <div class="lab__title">Softmax: від оцінок до ймовірностей</div>
        <div class="lab__sub">
          Три оцінки (логіти) z<sub>k</sub> = w<sub>k</sub><sup>⊤</sup>x + b<sub>k</sub>. Експонента робить їх
          додатними, ділення на суму — імовірностями. Втрата — −log імовірності правильного класу.
        </div>
      </div>
    </div>

    <div class="lab__pills">
      <button class="lab__pill" :class="{ 'is-on': isStart }" @click="z = [...data.z]">приклад розділу</button>
      <button class="lab__pill" :disabled="!canShift" @click="z = z.map(v => +(v + 2).toFixed(6))">додати 2 до всіх</button>
      <button class="lab__pill" :disabled="!canScale" @click="z = z.map(v => +(v * 2).toFixed(6))">помножити всі на 2</button>
      <button class="lab__pill" @click="z = [0, 0, 0]">усі рівні</button>
    </div>

    <div class="lab__controls">
      <label v-for="k in [0, 1, 2]" :key="k" class="lab__ctl">
        <span>Оцінка класу {{ k + 1 }}: z<sub>{{ k + 1 }}</sub> = <b>{{ f2(z[k]) }}</b></span>
        <input type="range" :min="-LIM" :max="LIM" step="0.01" :value="z[k]"
               @input="z = z.map((v, j) => (j === k ? +($event.target as HTMLInputElement).value : v))" />
      </label>
    </div>

    <table class="sm__table">
      <tbody>
        <tr><th>клас</th><th>оцінка z</th><th>e<sup>z</sup></th><th>p = e<sup>z</sup> / сума</th><th></th></tr>
        <tr v-for="k in [0, 1, 2]" :key="k" :class="{ 'is-true': truth === k }">
          <td><i :style="{ background: COLORS[k] }" />{{ k + 1 }}<span v-if="truth === k" class="sm__tag">правильний</span></td>
          <td class="sm__v">{{ f2(z[k]) }}</td>
          <td class="sm__v" :data-check="'exp' + k">{{ f3(cur.e[k]) }}</td>
          <td class="sm__v" :data-check="'p' + k">{{ f3(cur.p[k]) }}</td>
          <td class="sm__barcell"><span class="sm__bar" :style="{ width: (cur.p[k] * 100).toFixed(1) + '%', background: COLORS[k] }" /></td>
        </tr>
        <tr class="sm__sum"><td>сума</td><td></td><td class="sm__v" data-check="sum">{{ f3(cur.s) }}</td><td class="sm__v">1,000</td><td></td></tr>
      </tbody>
    </table>

    <div class="lab__pills">
      <span class="sm__cap">правильний клас:</span>
      <button v-for="k in [0, 1, 2]" :key="k" class="lab__pill" :class="{ 'is-on': truth === k }"
              @click="truth = k">{{ k + 1 }}</button>
    </div>

    <div class="lab__stats">
      <div class="lab__stat is-warm"><b data-check="loss">{{ f3(loss) }}</b><span>перехресна ентропія −log p<sub>{{ truth + 1 }}</sub></span></div>
      <div class="lab__stat"><b data-check="ratio">{{ f3(pair.ratio) }}</b><span>p₂ / (p₂ + p₃): лише класи 2 і 3</span></div>
      <div class="lab__stat"><b data-check="sig">{{ f3(1 / (1 + Math.exp(-pair.diff))) }}</b><span>σ(z₂ − z₃) = σ({{ f2(pair.diff) }})</span></div>
    </div>

    <p class="lab__note">
      Стартові оцінки — з розділу: експоненти {{ f3(START.e[0]) }}, {{ f3(START.e[1]) }} і
      {{ f3(START.e[2]) }} у сумі {{ f3(START.s) }} дають імовірності {{ f3(START.p[0]) }},
      {{ f3(START.p[1]) }} і {{ f3(START.p[2]) }}, і за правильного третього класу втрата
      −log {{ f3(START.p[2]) }} = {{ f3(-Math.log(START.p[2])) }}. Натисніть «додати 2 до всіх»:
      експоненти зростуть у e² ≈ 7,39 раза, а ймовірності не зміняться — softmax бачить
      лише різниці оцінок. «Помножити всі на 2» робить розподіл різкішим, так само як
      довжина вектора ваг робила різкішою сигмоїду. Два останні числа завжди однакові:
      для пари класів softmax — це сигмоїда від різниці їхніх оцінок. Поверніться до
      прикладу розділу й оберіть правильним клас 1: модель дає йому лише {{ f3(START.p[0]) }}, і втрата зростає до
      {{ f2(-Math.log(START.p[0])) }}.
    </p>
  </div>
</template>

<style scoped>
.sm__table { width: 100%; margin: 0.6rem 0; font-size: 0.86rem; }
.sm__table th {
  text-align: left; font-weight: 500; font-size: 0.74rem;
  color: var(--vp-c-text-3); padding-bottom: 0.3rem;
}
.sm__table td { padding: 0.3rem 0.4rem 0.3rem 0; border-top: 1px solid var(--uk-line); }
.sm__table td i {
  display: inline-block; width: 9px; height: 9px;
  border-radius: 2px; margin-right: 0.45rem;
}
.sm__table tr.is-true td { font-weight: 600; }
.sm__tag { font-size: 0.68rem; font-weight: 400; color: var(--vp-c-text-3); margin-left: 0.4rem; }
.sm__v { font-variant-numeric: tabular-nums; white-space: nowrap; }
.sm__barcell { width: 32%; }
.sm__bar { display: block; height: 10px; border-radius: 2px; min-width: 1px; }
.sm__sum td { color: var(--vp-c-text-2); }
.sm__cap { font-size: 0.8rem; color: var(--vp-c-text-3); align-self: center; margin-right: 0.2rem; }
.lab__pill:disabled { opacity: 0.4; cursor: not-allowed; }
</style>
