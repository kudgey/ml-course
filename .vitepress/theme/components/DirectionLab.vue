<script setup lang="ts">
/**
 * Напрям прямої ↔ дисперсія проєкцій і помилка реконструкції (лекція 09,
 * розділ 2.1, рис. 7). Дві стандартизовані ознаки Wine, ті самі 178 точок;
 * обидві величини рахуються тут-таки за визначенням, їхня сума завжди 2,00.
 * Дані — tools/gen_lec09_widgets.py.
 */
import { ref, computed } from 'vue'
import d from '../../data/lec09_direction.json'

const pts = d.X as number[][]
const N = pts.length
const angle = ref(20)

/** Середній квадрат проєкції і перпендикуляра для кута a (радіани). */
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
const f = (v: number, nd = 4) => v.toFixed(nd).replace('.', ',')
const pct = computed(() => f((100 * cur.value[0]) / (cur.value[0] + cur.value[1]), 1))

// ліва панель: хмара, пряма, перпендикуляри кожної третьої точки
const S = 300, R = 3.4
const sx = (v: number) => S / 2 + (v / R) * (S / 2 - 8)
const sy = (v: number) => S / 2 - (v / R) * (S / 2 - 8)
const line = computed(() => {
  const c = Math.cos(rad.value) * R, s = Math.sin(rad.value) * R
  return { x1: sx(-c), y1: sy(-s), x2: sx(c), y2: sy(s) }
})
const perps = computed(() => {
  const c = Math.cos(rad.value), s = Math.sin(rad.value)
  return pts.filter((_, i) => i % 3 === 0).map(([x, y]) => {
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
        <div class="lab__title">Кут прямої: дисперсія проєкцій і помилка реконструкції</div>
        <div class="lab__sub">
          Ті самі 178 вин, що на рис. 6 і 7: дві стандартизовані ознаки, кореляція {{ f(d.r) }}.
          Обертайте пряму: червоні відрізки — перпендикуляри, показано кожен третій.
        </div>
      </div>
    </div>

    <div class="dl__plots">
      <svg :viewBox="`0 0 ${S} ${S}`" class="dl__plot" role="img" aria-label="Хмара точок і пряма під заданим кутом">
        <line v-for="(p, i) in perps" :key="i" v-bind="p" class="dl__perp" />
        <circle v-for="(p, i) in pts" :key="'p' + i" :cx="sx(p[0])" :cy="sy(p[1])" r="2.4" class="dl__pt" />
        <line v-bind="line" class="dl__line" />
      </svg>
      <svg :viewBox="`0 0 ${CW} ${CH}`" class="dl__plot" role="img" aria-label="Дисперсія проєкцій і помилка реконструкції за кутом">
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
        <span>Кут прямої = <b data-check="angle">{{ angle }}°</b></span>
        <input type="range" min="0" max="180" step="1" v-model.number="angle" />
      </label>
    </div>
    <div class="lab__pills">
      <button class="lab__pill" :class="{ 'is-on': angle === 45 }" @click="angle = 45">найбільша дисперсія, 45°</button>
    </div>

    <div class="lab__stats">
      <div class="lab__stat"><b data-check="var" class="dl__c-var">{{ f(cur[0]) }}</b><span>дисперсія проєкцій</span></div>
      <div class="lab__stat"><b data-check="err" class="dl__c-err">{{ f(cur[1]) }}</b><span>помилка реконструкції</span></div>
      <div class="lab__stat"><b data-check="sum">{{ f(cur[0] + cur[1], 2) }}</b><span>їхня сума, повна дисперсія</span></div>
      <div class="lab__stat"><b data-check="share">{{ pct }} %</b><span>частка дисперсії</span></div>
    </div>

    <p class="lab__note">
      За будь-якого кута сума дорівнює 2,00: це теорема Піфагора, усереднена за точками.
      При 45° дисперсія найбільша, 1,8646, а помилка найменша, 0,1354; при 0° і 90° обидві
      дорівнюють 1, бо пряма йде вздовж однієї з ознак.
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
.dl__pt { fill: #8A8A96; opacity: 0.8; }
.dl__perp { stroke: #B3312C; stroke-width: 0.9; opacity: 0.75; }
.dl__line { stroke: #C2571A; stroke-width: 2.6; }
.dl__axis { stroke: var(--vp-c-text-3); stroke-width: 1; }
.dl__tick { font-size: 13px; fill: var(--vp-c-text-2); }
.dl__var, .dl__err { fill: none; stroke-width: 2.2; }
.dl__var { stroke: #2F6DB5; }
.dl__err { stroke: #B3312C; }
.dl__mark { stroke: var(--vp-c-text-2); stroke-width: 1.2; stroke-dasharray: 4 3; }
.dl__c-var { color: #2F6DB5; }
.dl__c-err { color: #B3312C; }
</style>
