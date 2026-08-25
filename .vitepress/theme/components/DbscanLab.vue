<script setup lang="ts">
/**
 * DBSCAN на трьох наборах, які по-різному ламають алгоритм: півмісяці,
 * згустки різної щільності та пара «щільний і розріджений». Мітки для всіх
 * комбінацій ε і minPts обчислено заздалегідь тим самим scikit-learn.
 * Кнопка знизу показує, що на тих самих даних робить K-means.
 */
import { ref, computed } from 'vue'
import d from '../../data/lec08_dbscan.json'

const NAMES = Object.keys(d.sets)
const set = ref(NAMES[0])
const ei = ref(d.eps.indexOf(0.3) >= 0 ? d.eps.indexOf(0.3) : 4)
const mi = ref(1)
const mode = ref<'db' | 'km'>('db')
const kmK = ref(2)

const cur = computed(() => (d.sets as any)[set.value])
const eps = computed(() => d.eps[ei.value])
const minpts = computed(() => d.minpts[mi.value])
const res = computed(() => cur.value.db[`${eps.value}|${minpts.value}`])

const labels = computed(() =>
  mode.value === 'db' ? res.value.lab : cur.value.km[String(kmK.value)])

const W = 420, H = 300, PAD = 22
const pts = computed(() => cur.value.X as number[][])
const ext = computed(() => {
  const xs = pts.value.map(p => p[0]), ys = pts.value.map(p => p[1])
  return [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
})
const sx = (v: number) => PAD + ((v - ext.value[0]) / (ext.value[1] - ext.value[0])) * (W - 2 * PAD)
const sy = (v: number) => H - PAD - ((v - ext.value[2]) / (ext.value[3] - ext.value[2])) * (H - 2 * PAD)

const COL = ['#2F6DB5', '#C2571A', '#1E8E6A', '#6B4C9A', '#B3312C',
             '#4E9CD8', '#E08A4B', '#3FB08A', '#9578C4', '#D06560']
const color = (l: number) => (l < 0 ? 'var(--vp-c-text-3)' : COL[l % COL.length])

const noisePct = computed(() => (res.value.noise / pts.value.length * 100).toFixed(1).replace('.', ','))
const fmt = (v: number) => v.toFixed(2).replace('.', ',')
</script>

<template>
  <div class="lab">
    <div class="lab__head">
      <div>
        <div class="lab__title">Той самий набір, різне ε</div>
        <div class="lab__sub">
          Три набори, кожен ламає алгоритм по-своєму. Сірі точки — шум: DBSCAN
          не зобов'язаний віднести до кластера всіх. Кнопка внизу перемикає на
          K-means, щоб порівняти на тих самих даних.
        </div>
      </div>
    </div>

    <div class="lab__pills">
      <button v-for="n in NAMES" :key="n" class="lab__pill"
              :class="{ 'is-on': set === n }" @click="set = n">{{ n }}</button>
    </div>

    <svg :viewBox="`0 0 ${W} ${H}`" class="db__plot" role="img"
         aria-label="Кластери DBSCAN на обраному наборі">
      <circle v-for="(p, i) in pts" :key="i" :cx="sx(p[0])" :cy="sy(p[1])"
              :r="labels[i] < 0 ? 2.2 : 3.4" :fill="color(labels[i])"
              :opacity="labels[i] < 0 ? 0.45 : 0.85" />
    </svg>

    <div class="lab__controls" v-if="mode === 'db'">
      <label class="lab__ctl">
        <span>Радіус ε = <b>{{ fmt(eps) }}</b></span>
        <input type="range" min="0" :max="d.eps.length - 1" step="1" v-model.number="ei" />
      </label>
      <label class="lab__ctl">
        <span>minPts = <b>{{ minpts }}</b></span>
        <input type="range" min="0" :max="d.minpts.length - 1" step="1" v-model.number="mi" />
      </label>
      <div class="lab__ctl">
        <span>Порівняти з іншим методом</span>
        <button class="lab__btn" @click="mode = 'km'">показати K-means</button>
      </div>
    </div>

    <div class="lab__controls" v-else>
      <label class="lab__ctl">
        <span>K-means, кластерів K = <b>{{ kmK }}</b></span>
        <input type="range" min="2" max="4" step="1" v-model.number="kmK" />
      </label>
      <div class="lab__ctl">
        <span>Повернутися</span>
        <button class="lab__btn" @click="mode = 'db'">показати DBSCAN</button>
      </div>
    </div>

    <div class="lab__stats" v-if="mode === 'db'">
      <div class="lab__stat"><b>{{ res.k }}</b><span>знайдено кластерів</span></div>
      <div class="lab__stat" :class="res.noise > pts.length * 0.3 ? 'is-warm' : ''">
        <b>{{ res.noise }}</b><span>точок у шумі ({{ noisePct }} %)</span>
      </div>
      <div class="lab__stat"><b>{{ pts.length }}</b><span>точок у наборі</span></div>
    </div>
    <div class="lab__stats" v-else>
      <div class="lab__stat"><b>{{ kmK }}</b><span>кластерів задано вручну</span></div>
      <div class="lab__stat is-warm"><b>0</b><span>точок у шумі — K-means бере всіх</span></div>
      <div class="lab__stat"><b>{{ pts.length }}</b><span>точок у наборі</span></div>
    </div>

    <p class="lab__note">
      На півмісяцях видно головну перевагу: DBSCAN знаходить два серпи, бо йде за
      щільністю, а не за відстанню до центра — перемкніться на K-means і побачите,
      що той ріже їх навпіл поперек. Але візьміть третій набір, де щільна група
      сусідить із розрідженою: жодне ε не годиться одразу для обох. Мале — і
      розріджена група цілком іде в шум; велике — і щільна злипається із сусідами.
      Саме цю ваду знімають HDBSCAN та OPTICS, які перебирають цілий діапазон
      радіусів замість одного. Параметр minPts діє м'якше: він задає, скільки
      сусідів робить точку ядром, і головно впливає на те, що вважати шумом.
    </p>
  </div>
</template>

<style scoped>
.db__plot {
  width: 100%;
  height: auto;
  display: block;
  border: 1px solid var(--uk-line);
  border-radius: 8px;
  background: var(--vp-c-bg);
  margin: 0.4rem 0 0.8rem;
}
</style>
