<script setup lang="ts">
/**
 * Наскрізний приклад уваги на трьох токенах, той самий, що в розділі
 * «кіт п'є молоко»: Q = K = [[1,0],[0,1],[1,1]], V = [[1,0],[0,2],[3,1]].
 * Усе рахується тут-таки за формулою softmax(QKᵀ/√d_k)·V, тож числа
 * збігаються з рисунком: найбільша оцінка 1,41, ваги «кота» 0,40 / 0,20 / 0,40,
 * ваги «молока» 0,25 / 0,25 / 0,50, вихід «кота» (1,60; 0,80).
 */
import { ref, computed } from 'vue'

const NAMES = ['кіт', "п'є", 'молоко']
const qk = ref([[1, 0], [0, 1], [1, 1]])
const v = ref([[1, 0], [0, 2], [3, 1]])
const edit = ref(0)
const scaled = ref(true)

const DK = 2
const scale = computed(() => (scaled.value ? Math.sqrt(DK) : 1))

const scores = computed(() =>
  qk.value.map(q => qk.value.map(k => (q[0] * k[0] + q[1] * k[1]) / scale.value)))

const weights = computed(() => scores.value.map(row => {
  const m = Math.max(...row)
  const e = row.map(s => Math.exp(s - m))
  const z = e.reduce((a, b) => a + b, 0)
  return e.map(x => x / z)
}))

const out = computed(() => weights.value.map(w =>
  [0, 1].map(d => w.reduce((s, p, j) => s + p * v.value[j][d], 0))))

/** Наскільки розподіл уваги гострий: ентропія рядка в бітах, максимум log2(3). */
const entropy = computed(() => weights.value.map(w =>
  -w.reduce((s, p) => s + (p > 0 ? p * Math.log2(p) : 0), 0)))

const f = (x: number, d = 2) => x.toFixed(d).replace('.', ',')
const heat = (p: number) => `rgba(47, 109, 181, ${(0.06 + 0.8 * p).toFixed(3)})`

function setComp(which: 'qk' | 'v', d: number, val: number) {
  const src = which === 'qk' ? qk : v
  const next = src.value.map(r => [...r])
  next[edit.value][d] = val
  src.value = next
}
function reset() {
  qk.value = [[1, 0], [0, 1], [1, 1]]
  v.value = [[1, 0], [0, 2], [3, 1]]
  scaled.value = true
}
</script>

<template>
  <div class="lab">
    <div class="lab__head">
      <div>
        <div class="lab__title">Увага на трьох токенах, число за числом</div>
        <div class="lab__sub">
          Той самий приклад, що на рисунку: три токени, d<sub>k</sub> = 2.
          Оберіть токен і посуньте його вектори — оцінки, ваги після softmax
          і вихід перерахуються тут-таки за формулою розділу.
        </div>
      </div>
    </div>

    <div class="lab__pills">
      <button v-for="(n, i) in NAMES" :key="n" class="lab__pill"
              :class="{ 'is-on': edit === i }" @click="edit = i">{{ n }}</button>
      <button class="lab__pill" :class="{ 'is-on': scaled }" @click="scaled = !scaled">
        ділити на √d<sub>k</sub>
      </button>
      <button class="lab__pill" @click="reset">повернути як було</button>
    </div>

    <div class="lab__controls">
      <label class="lab__ctl">
        <span>запит і ключ «{{ NAMES[edit] }}», 1-ша координата:
          <b>{{ f(qk[edit][0]) }}</b></span>
        <input type="range" min="-2" max="3" step="0.1" :value="qk[edit][0]"
               @input="setComp('qk', 0, Number(($event.target as HTMLInputElement).value))" />
      </label>
      <label class="lab__ctl">
        <span>2-га координата: <b>{{ f(qk[edit][1]) }}</b></span>
        <input type="range" min="-2" max="3" step="0.1" :value="qk[edit][1]"
               @input="setComp('qk', 1, Number(($event.target as HTMLInputElement).value))" />
      </label>
      <label class="lab__ctl">
        <span>значення «{{ NAMES[edit] }}», 1-ша: <b>{{ f(v[edit][0]) }}</b></span>
        <input type="range" min="-2" max="4" step="0.1" :value="v[edit][0]"
               @input="setComp('v', 0, Number(($event.target as HTMLInputElement).value))" />
      </label>
      <label class="lab__ctl">
        <span>значення «{{ NAMES[edit] }}», 2-га: <b>{{ f(v[edit][1]) }}</b></span>
        <input type="range" min="-2" max="4" step="0.1" :value="v[edit][1]"
               @input="setComp('v', 1, Number(($event.target as HTMLInputElement).value))" />
      </label>
    </div>

    <div class="at__grid">
      <figure class="at__panel">
        <figcaption>оцінки QKᵀ{{ scaled ? ' / √d' : '' }}</figcaption>
        <table class="at__tab">
          <tbody>
          <tr><td class="at__corner"></td><th v-for="n in NAMES" :key="n">{{ n }}</th></tr>
          <tr v-for="(row, i) in scores" :key="i">
            <th>{{ NAMES[i] }}</th>
            <td v-for="(s, j) in row" :key="j">{{ f(s) }}</td>
          </tr>
          </tbody>
        </table>
      </figure>

      <figure class="at__panel">
        <figcaption>ваги після softmax по рядках</figcaption>
        <table class="at__tab">
          <tbody>
          <tr><td class="at__corner"></td><th v-for="n in NAMES" :key="n">{{ n }}</th></tr>
          <tr v-for="(row, i) in weights" :key="i">
            <th>{{ NAMES[i] }}</th>
            <td v-for="(p, j) in row" :key="j" :style="{ background: heat(p) }">{{ f(p) }}</td>
          </tr>
          </tbody>
        </table>
      </figure>

      <figure class="at__panel">
        <figcaption>вихід Z = P · V</figcaption>
        <table class="at__tab">
          <tbody>
          <tr><td class="at__corner"></td><th>1-ша</th><th>2-га</th><th>ентропія</th></tr>
          <tr v-for="(z, i) in out" :key="i">
            <th>{{ NAMES[i] }}</th>
            <td>{{ f(z[0]) }}</td><td>{{ f(z[1]) }}</td>
            <td class="at__ent">{{ f(entropy[i]) }}</td>
          </tr>
          </tbody>
        </table>
      </figure>
    </div>

    <p class="lab__note">
      За замовчуванням тут числа з рисунка: найбільша оцінка 1,41 стоїть
      у «молока» на самого себе, «кіт» розподіляє увагу як 0,40 / 0,20 / 0,40,
      а його вихід дорівнює (1,60; 0,80) — уже не власне значення (1; 0),
      а суміш усіх трьох. Це і є контекстуалізоване подання, порахувати яке
      можна на папері за хвилину.

      Три речі варто побачити руками. Перше: оберіть «молоко» і збільште його
      першу координату до 3 — оцінка на самого себе злетить, softmax стягне на
      нього майже всю увагу (0,99), а ентропія рядка впаде з 1,50 біта до 0,08
      при максимально можливих 1,58. Друге: вимкніть ділення на √d<sub>k</sub>
      і подивіться на ваги «кота»: 0,40 / 0,20 / 0,40 перетворюються на
      0,42 / 0,16 / 0,42. Оцінки виросли всього в 1,41 раза, а розподіл уже
      помітно гостріший — і саме це псує навчання, коли d<sub>k</sub> дорівнює
      не 2, а 64. Третє: змініть лише значення V, не чіпаючи запитів і ключів, —
      ваги не зрушать зовсім, а вихід зміниться. Увага вирішує, звідки брати,
      а не що саме брати.
    </p>
  </div>
</template>

<style scoped>
.at__grid {
  display: grid;
  /* Рівно три колонки: auto-fit на ширині колонки сайту давав 2 + 1,
     і третя таблиця лишалася сама в рядку. */
  grid-template-columns: 1fr 1fr 1.2fr;
  gap: 1rem;
  margin: 0.5rem 0 0.8rem;
}
.at__panel { margin: 0; }
.at__panel figcaption {
  font-size: 0.75rem; color: var(--vp-c-text-3);
  margin-bottom: 0.35rem; text-align: center;
}
.at__tab {
  width: 100%; border-collapse: collapse; font-size: 0.85rem;
  font-variant-numeric: tabular-nums;
}
.at__tab th {
  font-weight: 500; color: var(--vp-c-text-3); font-size: 0.75rem;
  padding: 0.25rem 0.3rem; text-align: center;
}
.at__tab td {
  text-align: center; padding: 0.3rem; border: 1px solid var(--uk-line);
  color: var(--vp-c-text-1);
}
.at__corner { border: none !important; }
.at__ent { color: var(--vp-c-text-3); }
@media (max-width: 640px) { .at__grid { grid-template-columns: 1fr; } }
</style>
