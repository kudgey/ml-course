<script setup lang="ts">
/**
 * DBSCAN на тих самих півмісяцях із фоном, що в лекції 08 (рис. 12, 14, 15,
 * таблиця 1): один повзунок ε при min_samples = 5, кнопка «ε зі зламу» і
 * перемикач на K-means із K = 2. Мітки для кожного ε обчислено заздалегідь
 * тим самим scikit-learn — tools/gen_lec08_dbscan.py.
 */
import { ref, computed } from 'vue'
import d from '../../data/lec08_dbscan.json'

const EPS = d.runs.map(r => r.eps)
const KNEE = EPS.indexOf(d.knee)
const ei = ref(KNEE)
const showKm = ref(false)

const run = computed(() => d.runs[ei.value])
const labels = computed(() => (showKm.value ? d.km.lab : run.value.lab))
const pts = d.X as number[][]

const W = 420, H = 300, PAD = 22
const xs = pts.map(p => p[0]), ys = pts.map(p => p[1])
const ext = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
const sx = (v: number) => PAD + ((v - ext[0]) / (ext[1] - ext[0])) * (W - 2 * PAD)
const sy = (v: number) => H - PAD - ((v - ext[2]) / (ext[3] - ext[2])) * (H - 2 * PAD)

const COL = ['#2F6DB5', '#C2571A', '#1E8E6A', '#6B4C9A', '#8A8A96',
             '#4E9CD8', '#E08A4B', '#3FB08A', '#9578C4', '#5F6B7A']
const color = (l: number) => (l < 0 ? '#B3312C' : COL[l % COL.length])
const f = (v: number, nd = 3) => v.toFixed(nd).replace('.', ',')
</script>

<template>
  <div class="lab">
    <div class="lab__head">
      <div>
        <div class="lab__title">DBSCAN на півмісяцях: один параметр ε</div>
        <div class="lab__sub">
          Ті самі 400 точок півмісяців і 45 точок фону, що на рис. 12; min_samples = 5.
          Червоні хрестики — шум. Рухайте ε і порівняйте з ε зі зламу графіка відстаней.
        </div>
      </div>
    </div>

    <svg :viewBox="`0 0 ${W} ${H}`" class="db__plot" role="img" aria-label="Кластери DBSCAN або K-means на півмісяцях">
      <template v-for="(p, i) in pts" :key="i">
        <g v-if="labels[i] < 0" :transform="`translate(${sx(p[0])} ${sy(p[1])})`" class="db__x">
          <line x1="-3" y1="-3" x2="3" y2="3" /><line x1="-3" y1="3" x2="3" y2="-3" />
        </g>
        <circle v-else :cx="sx(p[0])" :cy="sy(p[1])" r="3.2" :fill="color(labels[i])" opacity="0.85" />
      </template>
    </svg>

    <div class="lab__controls">
      <label class="lab__ctl">
        <span>Радіус ε = <b data-check="eps">{{ f(run.eps) }}</b></span>
        <input type="range" min="0" :max="EPS.length - 1" step="1" v-model.number="ei" :disabled="showKm" />
      </label>
    </div>
    <div class="lab__pills">
      <button class="lab__pill" :class="{ 'is-on': ei === KNEE && !showKm }" @click="ei = KNEE; showKm = false">
        ε зі зламу ({{ f(d.knee) }})
      </button>
      <button class="lab__pill" :class="{ 'is-on': showKm }" @click="showKm = !showKm">
        {{ showKm ? 'повернутися до DBSCAN' : 'K-means, K = 2, для порівняння' }}
      </button>
    </div>

    <div class="lab__stats" v-if="!showKm">
      <div class="lab__stat"><b data-check="k">{{ run.k }}</b><span>кластерів</span></div>
      <div class="lab__stat" :class="run.noise > 100 ? 'is-warm' : ''">
        <b data-check="noise">{{ run.noise }}</b><span>точок шуму, з них фону {{ run.bg }} з 45</span>
      </div>
      <div class="lab__stat" :class="run.ari > 0.9 ? 'is-green' : run.ari < 0.4 ? 'is-warm' : ''">
        <b data-check="ari">{{ f(run.ari) }}</b><span>ARI на 400 точках півмісяців</span>
      </div>
    </div>
    <div class="lab__stats" v-else>
      <div class="lab__stat"><b>2</b><span>кластери задано вручну</span></div>
      <div class="lab__stat is-warm"><b>0</b><span>точок шуму — K-means бере всіх</span></div>
      <div class="lab__stat"><b data-check="km-ari">{{ f(d.km.ari) }}</b><span>ARI на 400 точках півмісяців</span></div>
    </div>

    <p class="lab__note">
      При ε = 0,203 зі зламу DBSCAN знаходить обидва півмісяці: ARI 0,995, шум 26 точок,
      з них 25 — точки фону. Зменште ε до 0,10 — півмісяці розсипаються на десятки
      дрібних кластерів; збільште до 0,40 — зливаються в один. K-means на тих самих
      даних ріже півмісяці прямою: ARI 0,475, і жодної точки шуму.
    </p>
  </div>
</template>

<style scoped>
.db__plot {
  width: 100%;
  max-width: 560px;
  height: auto;
  display: block;
  border: 1px solid var(--uk-line);
  border-radius: 8px;
  background: var(--vp-c-bg);
  margin: 0.4rem auto 0.8rem;
}
.db__x line { stroke: #B3312C; stroke-width: 1.4; }
</style>
