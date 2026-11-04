<script setup lang="ts">
/**
 * Ваги нової ознаки ↔ її дисперсія й помилка відновлення (лекція 09,
 * розділ 2.1, рис. 7). П'ять квартир зі стандартизованими площею й орендою;
 * обидві величини рахуються тут-таки за визначенням, їхня сума завжди 2,00.
 * Дані — tools/gen_lec09_widgets.py.
 */
import { ref, computed } from 'vue'
import d from '../../data/lec09_direction.json'

const pts = d.X as number[][]
const N = pts.length
const angle = ref(0)

/** Дисперсія z і помилка відновлення для лінії під кутом a (радіани). */
function stats(a: number) {
  const c = Math.cos(a), s = Math.sin(a)
  let v = 0, e = 0
  for (const [x, y] of pts) {
    const z = x * c + y * s
    v += z * z
    e += (x - z * c) ** 2 + (y - z * s) ** 2
  }
  return [v / N, e / N]
}

const rad = computed(() => (angle.value * Math.PI) / 180)
const cur = computed(() => stats(rad.value))
const f = (v: number, nd = 3) => v.toFixed(nd).replace('.', ',')
const w1 = computed(() => Math.cos(rad.value))
const w2 = computed(() => Math.sin(rad.value))

// ліва панель: квартири, відновлені точки на лінії, втрата при відновленні
const S = 300, R = 2.3
const sx = (v: number) => S / 2 + (v / R) * (S / 2 - 8)
const sy = (v: number) => S / 2 - (v / R) * (S / 2 - 8)
const line = computed(() => {
  const c = Math.cos(rad.value) * R, s = Math.sin(rad.value) * R
  return { x1: sx(-c), y1: sy(-s), x2: sx(c), y2: sy(s) }
})
const perps = computed(() => {
  const c = Math.cos(rad.value), s = Math.sin(rad.value)
  return pts.map(([x, y]) => {
    const z = x * c + y * s
    return { x1: sx(x), y1: sy(y), x2: sx(z * c), y2: sy(z * s) }
  })
})

// права панель: дві криві за кутом
const CW = 300, CH = 300, PL = 34, PB = 34, PT = 10, PR = 20
const cx = (a: number) => PL + (a / 180) * (CW - PL - PR)
const cy = (v: number) => CH - PB - (v / 2) * (CH - PB - PT)
const curves = Array.from({ length: 91 }, (_, i) => {
  const a = i * 2
  const [v, e] = stats((a * Math.PI) / 180)
  return { a, v, e }
})
const pathV = curves.map(c => `${cx(c.a)},${cy(c.v)}`).join(' ')
const pathE = curves.map(c => `${cx(c.a)},${cy(c.e)}`).join(' ')
</script>

<template>
  <div class="lab">
    <div class="lab__head">
      <div>
        <div class="lab__title">Ваги нової ознаки: дисперсія і помилка відновлення</div>
        <div class="lab__sub">
          Ті самі п'ять квартир, що на рис. 6 і 7. Сині точки — квартири, помаранчеві — вони ж після
          стиснення й відновлення, червоні відрізки — втрата. Кожен поворот лінії — інші ваги.
        </div>
      </div>
    </div>

    <div class="dl__plots">
      <svg :viewBox="`0 0 ${S} ${S}`" class="dl__plot" role="img" aria-label="П'ять квартир і лінія відновлених точок">
        <line v-bind="line" class="dl__line" />
        <line v-for="(p, i) in perps" :key="i" v-bind="p" class="dl__perp" />
        <circle v-for="(p, i) in perps" :key="'r' + i" :cx="p.x2" :cy="p.y2" r="4.5" class="dl__rec" />
        <template v-for="(p, i) in pts" :key="'p' + i">
          <circle :cx="sx(p[0])" :cy="sy(p[1])" r="5" class="dl__pt" />
          <text :x="sx(p[0]) - 9" :y="sy(p[1]) - 7" class="dl__name">{{ d.names[i] }}</text>
        </template>
      </svg>
      <svg :viewBox="`0 0 ${CW} ${CH}`" class="dl__plot" role="img" aria-label="Дисперсія нової ознаки і помилка відновлення за поворотом лінії">
        <line :x1="PL" :x2="CW - PR" :y1="cy(0)" :y2="cy(0)" class="dl__axis" />
        <line :x1="PL" :x2="PL" :y1="cy(2)" :y2="cy(0)" class="dl__axis" />
        <template v-for="t in [0, 1, 2]" :key="t">
          <text :x="PL - 6" :y="cy(t) + 4" text-anchor="end" class="dl__tick">{{ t }}</text>
        </template>
        <template v-for="t in [0, 45, 90, 135, 180]" :key="'a' + t">
          <text :x="cx(t)" :y="CH - PB + 16" text-anchor="middle" class="dl__tick">{{ t }}°</text>
        </template>
        <polyline :points="pathV" class="dl__var" />
        <polyline :points="pathE" class="dl__err" />
        <line :x1="cx(angle)" :x2="cx(angle)" :y1="cy(2)" :y2="cy(0)" class="dl__mark" />
      </svg>
    </div>

    <div class="lab__controls">
      <label class="lab__ctl">
        <span>Поворот лінії = <b data-check="angle">{{ angle }}°</b></span>
        <input type="range" min="0" max="180" step="1" v-model.number="angle" />
      </label>
    </div>
    <div class="lab__pills">
      <button class="lab__pill" :class="{ 'is-on': angle === 0 }" @click="angle = 0">лише площа</button>
      <button class="lab__pill" :class="{ 'is-on': angle === 90 }" @click="angle = 90">лише оренда</button>
      <button class="lab__pill" :class="{ 'is-on': angle === 45 }" @click="angle = 45">порівну</button>
      <button class="lab__pill" :class="{ 'is-on': angle === 135 }" @click="angle = 135">оренда мінус площа</button>
    </div>

    <div class="lab__stats">
      <div class="lab__stat"><b data-check="w">{{ f(w1) }}; {{ f(w2) }}</b><span>ваги w₁ і w₂</span></div>
      <div class="lab__stat"><b data-check="var" class="dl__c-var">{{ f(cur[0]) }}</b><span>дисперсія нової ознаки</span></div>
      <div class="lab__stat"><b data-check="err" class="dl__c-err">{{ f(cur[1]) }}</b><span>помилка відновлення</span></div>
      <div class="lab__stat"><b data-check="sum">{{ f(cur[0] + cur[1], 2) }}</b><span>їхня сума</span></div>
    </div>

    <p class="lab__note">
      За будь-яких ваг сума дорівнює 2,00: що не зберегла нова ознака, те стає помилкою.
      Коли площу й оренду беремо порівну, дисперсія найбільша, 1,996, а помилка найменша, 0,004.
    </p>
  </div>
</template>

<style scoped>
.dl__plots {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 0.6rem;
  margin-bottom: 0.8rem;
}
.dl__plot {
  width: 100%;
  height: auto;
  display: block;
  border: 1px solid var(--uk-line);
  border-radius: 8px;
  background: var(--vp-c-bg);
}
.dl__pt { fill: #2F6DB5; }
.dl__name { font-size: 14px; fill: var(--vp-c-text-1); }
.dl__perp { stroke: #B3312C; stroke-width: 1.6; }
.dl__line { stroke: #C2571A; stroke-width: 1.2; stroke-dasharray: 5 4; }
.dl__rec { fill: #C2571A; }
.dl__axis { stroke: var(--vp-c-text-3); stroke-width: 1; }
.dl__tick { font-size: 13px; fill: var(--vp-c-text-2); }
.dl__var, .dl__err { fill: none; stroke-width: 2.2; }
.dl__var { stroke: #2F6DB5; }
.dl__err { stroke: #B3312C; }
.dl__mark { stroke: var(--vp-c-text-2); stroke-width: 1.2; stroke-dasharray: 4 3; }
.dl__c-var { color: #2F6DB5; }
.dl__c-err { color: #B3312C; }
</style>
