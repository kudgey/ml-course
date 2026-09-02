<script setup lang="ts">
/**
 * Розклад помилки на три доданки — ті самі числа, що в розділі: справжня
 * функція sin(2πx), шум 0,25, чотириста вибірок по 25 точок, ступені 1…12.
 * Зміщення² 0,153 на першому ступені, 0,0001 на п'ятому; дисперсія 0,021,
 * 0,086 на шостому і 2742 на дванадцятому; мінімум суми — на третьому.
 */
import { ref, computed } from 'vue'
import d from '../../data/lec03_bv.json'

const deg = ref(3)
const showAll = ref(true)

const X = d.x as number[]
const TRUE = d.true as number[]
const avg = computed(() => (d.avg as Record<string, number[]>)[String(deg.value)])
const fits = computed(() => (d.spread as Record<string, number[][]>)[String(deg.value)])
const bias2 = computed(() => (d.bias2 as Record<string, number>)[String(deg.value)])
const vari = computed(() => (d.var as Record<string, number>)[String(deg.value)])
const total = computed(() => bias2.value + vari.value + d.noise)

const best = computed(() => {
  const t = Object.keys(d.bias2).map(k => ({
    k: Number(k),
    v: (d.bias2 as any)[k] + (d.var as any)[k] + d.noise
  }))
  return t.reduce((a, b) => (b.v < a.v ? b : a)).k
})

/** Ліва панель. Межі по y тримаємо сталими: інакше при ступені 12 графік
    схлопується і порівнювати ступені стає неможливо. */
const W = 300, H = 220, PAD = 26
const YLO = -2, YHI = 2
const sx = (x: number) => PAD + ((x - X[0]) / (X[X.length - 1] - X[0])) * (W - 2 * PAD)
const sy = (y: number) => H - PAD - ((Math.max(YLO, Math.min(YHI, y)) - YLO) / (YHI - YLO)) * (H - 2 * PAD)
const line = (ys: number[]) => ys.map((y, i) => `${sx(X[i]).toFixed(1)},${sy(y).toFixed(1)}`).join(' ')

/** Права панель: три доданки в логарифмічному масштабі — інакше 2742 поруч
    із 0,0001 не поміщаються на одній осі. */
const BW = 300, BH = 220, BP = 30
const lg = (v: number) => Math.log10(Math.max(v, 1e-5))
const LO = -5, HI = 4
const by = (v: number) => BH - BP - ((lg(v) - LO) / (HI - LO)) * (BH - 2 * BP)
const bars = computed(() => [
  { name: 'зміщення²', v: bias2.value, color: '#2F6DB5' },
  { name: 'дисперсія', v: vari.value, color: '#C2571A' },
  { name: 'шум σ²', v: d.noise, color: '#8A8A96' }
])

const fmt = (v: number) =>
  v >= 100 ? Math.round(v).toString()
    : v >= 1 ? v.toFixed(2).replace('.', ',')
    : v.toFixed(v < 0.001 ? 5 : 4).replace('.', ',')
</script>

<template>
  <div class="lab">
    <div class="lab__head">
      <div>
        <div class="lab__title">Три доданки на одному повзунку</div>
        <div class="lab__sub">
          Ті самі числа, що на рисунку: справжня функція sin(2πx), шум 0,25,
          {{ d.nsets }} незалежних вибірок по {{ d.ntrain }} точок. Ліворуч —
          шість підгонок із різних вибірок і їхнє середнє; праворуч — розклад
          помилки в логарифмічному масштабі.
        </div>
      </div>
    </div>

    <div class="lab__pills">
      <button v-for="p in [1, 3, 5, 9, 12]" :key="p" class="lab__pill"
              :class="{ 'is-on': deg === p }" @click="deg = p">ступінь {{ p }}</button>
      <button class="lab__pill" :class="{ 'is-on': showAll }" @click="showAll = !showAll">
        показати окремі підгонки
      </button>
    </div>

    <div class="bv__grid">
      <figure class="bv__panel">
        <figcaption>моделі з різних вибірок</figcaption>
        <svg :viewBox="`0 0 ${W} ${H}`" role="img" aria-label="Підгонки різних ступенів">
          <line :x1="PAD" :y1="sy(0)" :x2="W - PAD" :y2="sy(0)" class="bv__axis" />
          <g v-if="showAll" clip-path="url(#bv-clip)">
            <polyline v-for="(f, i) in fits" :key="i" :points="line(f)" class="bv__fit" />
          </g>
          <polyline :points="line(TRUE)" class="bv__true" />
          <polyline :points="line(avg)" class="bv__avg" />
          <defs>
            <clipPath id="bv-clip">
              <rect :x="PAD - 2" :y="PAD - 6" :width="W - 2 * PAD + 4" :height="H - 2 * PAD + 12" />
            </clipPath>
          </defs>
        </svg>
        <div class="bv__legend">
          <span><i class="is-true" />справжня</span>
          <span><i class="is-avg" />середня модель</span>
          <span v-if="showAll"><i class="is-fit" />окремі підгонки</span>
        </div>
      </figure>

      <figure class="bv__panel">
        <figcaption>розклад помилки, логарифмічна шкала</figcaption>
        <svg :viewBox="`0 0 ${BW} ${BH}`" role="img" aria-label="Три доданки помилки">
          <g v-for="p in [-4, -3, -2, -1, 0, 1, 2, 3]" :key="p">
            <line :x1="BP" :y1="by(Math.pow(10, p))" :x2="BW - BP" :y2="by(Math.pow(10, p))" class="bv__grid-l" />
            <text :x="BP - 4" :y="by(Math.pow(10, p)) + 3" class="bv__lbl" text-anchor="end">
              10<tspan dy="-4" font-size="7">{{ p }}</tspan>
            </text>
          </g>
          <g v-for="(b, i) in bars" :key="b.name">
            <rect :x="BP + 14 + i * 82" :y="by(b.v)" width="52"
                  :height="Math.max(1, BH - BP - by(b.v))" :fill="b.color" opacity="0.85" />
            <text :x="BP + 40 + i * 82" :y="BH - BP + 13" class="bv__lbl" text-anchor="middle">{{ b.name }}</text>
          </g>
        </svg>
      </figure>
    </div>

    <label class="lab__ctl bv__slider">
      <span>Ступінь полінома: <b>{{ deg }}</b></span>
      <input type="range" min="1" max="12" step="1" v-model.number="deg" />
    </label>

    <div class="lab__stats">
      <div class="lab__stat"><b>{{ fmt(bias2) }}</b><span>зміщення²</span></div>
      <div class="lab__stat is-warm"><b>{{ fmt(vari) }}</b><span>дисперсія</span></div>
      <div class="lab__stat"><b>{{ fmt(d.noise) }}</b><span>шум σ² — підлога</span></div>
      <div class="lab__stat" :class="deg === best ? 'is-green' : ''">
        <b>{{ fmt(total) }}</b><span>сума{{ deg === best ? ' — мінімум' : '' }}</span>
      </div>
    </div>

    <p class="lab__note">
      На першому ступені всі шість підгонок майже збігаються — дисперсія мала,
      0,021, — але жодна не схожа на синус: зміщення² дорівнює 0,153. На п'ятому
      зміщення падає до 0,0001, бо клас моделей уже достатньо багатий. Далі
      починається розплата: дисперсія 0,086 на шостому ступені й 2742 на
      дванадцятому, де підгонки розлітаються за межі графіка. Мінімум суми — на
      третьому ступені, 0,076. Сірий стовпчик шуму не рухається взагалі: це
      підлога, нижче якої не опуститься жодна модель, бо шум не залежить від даних.
    </p>
  </div>
</template>

<style scoped>
.bv__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(270px, 1fr));
  gap: 1rem;
  margin: 0.4rem 0 0.8rem;
}
.bv__panel { margin: 0; }
.bv__panel figcaption {
  font-size: 0.75rem;
  color: var(--vp-c-text-3);
  margin-bottom: 0.3rem;
  text-align: center;
}
.bv__panel svg {
  width: 100%;
  height: auto;
  display: block;
  border: 1px solid var(--uk-line);
  border-radius: 8px;
  background: var(--vp-c-bg);
}
.bv__axis { stroke: var(--uk-line); stroke-width: 1; }
.bv__grid-l { stroke: var(--uk-line); stroke-width: 0.6; opacity: 0.5; }
.bv__fit { fill: none; stroke: var(--uk-warm); stroke-width: 1; opacity: 0.45; }
.bv__true { fill: none; stroke: var(--vp-c-text-1); stroke-width: 2; stroke-dasharray: 5 3; }
.bv__avg { fill: none; stroke: var(--uk-green); stroke-width: 2.2; }
.bv__lbl { fill: var(--vp-c-text-3); font-size: 9px; }
.bv__legend {
  display: flex;
  gap: 0.8rem;
  justify-content: center;
  flex-wrap: wrap;
  font-size: 0.72rem;
  color: var(--vp-c-text-3);
  margin-top: 0.3rem;
}
.bv__legend i {
  display: inline-block;
  width: 14px; height: 2px;
  margin-right: 0.3rem;
  vertical-align: middle;
}
.bv__legend i.is-true { background: var(--vp-c-text-1); }
.bv__legend i.is-avg { background: var(--uk-green); }
.bv__legend i.is-fit { background: var(--uk-warm); opacity: 0.5; }
.bv__slider { display: block; margin-bottom: 0.3rem; }
</style>
