<script setup lang="ts">
/**
 * Два боки одного параметра. Ліворуч — саме ядро: як спадає схожість із
 * відстанню, рахується формулою з розділу exp(−γ‖x−x′‖²). Праворуч — що з
 * цього виходить на даних: межа рішень SVM на тих самих двох півмісяцях,
 * що в коді лекції. Числа розділу відтворюються: при γ = 0,1 схожість на
 * відстані 1,0 дорівнює 0,90; при γ = 10 — 4,5 · 10⁻⁵.
 */
import { ref, computed } from 'vue'
import d from '../../data/lec07_svm.json'

const gi = ref(3)                       // індекс у d.gammas
const ci = ref(1)                       // індекс у d.Cs
const gamma = computed(() => d.gammas[gi.value])
const C = computed(() => d.Cs[ci.value])
const key = computed(() => `${C.value}|${gamma.value}`)
const grid = computed(() => (d.grids as Record<string, string>)[key.value])
const meta = computed(() => (d.meta as Record<string, any>)[key.value])

/** Ліва панель: значення ядра від відстані. */
const KW = 250, KH = 190, KP = 30
const kx = (r: number) => KP + (r / 3) * (KW - 2 * KP)
const ky = (v: number) => KH - KP - v * (KH - 2 * KP)
const kernelPath = computed(() => {
  const pts: string[] = []
  for (let i = 0; i <= 120; i++) {
    const r = (3 * i) / 120
    pts.push(`${kx(r).toFixed(1)},${ky(Math.exp(-gamma.value * r * r)).toFixed(1)}`)
  }
  return pts.join(' ')
})
const atOne = computed(() => Math.exp(-gamma.value * 1))

/** Права панель: межа рішень із передобчисленої сітки. */
const SW = 250, SH = 190, SP = 12
const [ex0, ex1, ey0, ey1] = d.ext as number[]
const sx = (v: number) => SP + ((v - ex0) / (ex1 - ex0)) * (SW - 2 * SP)
const sy = (v: number) => SH - SP - ((v - ey0) / (ey1 - ey0)) * (SH - 2 * SP)
const cell = computed(() => ({
  w: (SW - 2 * SP) / d.G,
  h: (SH - 2 * SP) / d.G
}))

const fmt = (v: number) =>
  v < 1e-3 ? v.toExponential(1).replace('.', ',') : v.toFixed(3).replace('.', ',')
const COL = ['#2F6DB5', '#C2571A']
</script>

<template>
  <div class="lab">
    <div class="lab__head">
      <div>
        <div class="lab__title">Що робить gamma — і що з цього виходить</div>
        <div class="lab__sub">
          Ліворуч саме ядро: як швидко спадає схожість двох точок із відстанню.
          Праворуч — межа рішень на тих самих двох півмісяцях, що в коді лекції.
          Один параметр, два наслідки.
        </div>
      </div>
    </div>

    <div class="kr__grid">
      <figure class="kr__panel">
        <figcaption>схожість κ(r) = exp(−γ r²)</figcaption>
        <svg :viewBox="`0 0 ${KW} ${KH}`" role="img" aria-label="Значення ядра від відстані">
          <line :x1="KP" :y1="KH - KP" :x2="KW - KP" :y2="KH - KP" class="kr__axis" />
          <line :x1="KP" :y1="KP" :x2="KP" :y2="KH - KP" class="kr__axis" />
          <line :x1="kx(1)" :y1="KP" :x2="kx(1)" :y2="KH - KP" class="kr__mark" />
          <polyline :points="kernelPath" class="kr__curve" />
          <circle :cx="kx(1)" :cy="ky(atOne)" r="4" class="kr__dot" />
          <text :x="KP - 5" :y="ky(1) + 4" class="kr__lbl" text-anchor="end">1</text>
          <text :x="KP - 5" :y="ky(0) + 4" class="kr__lbl" text-anchor="end">0</text>
          <text :x="kx(1)" :y="KH - KP + 14" class="kr__lbl" text-anchor="middle">1,0</text>
          <text :x="KW / 2" :y="KH - 4" class="kr__lbl" text-anchor="middle">відстань між точками</text>
        </svg>
      </figure>

      <figure class="kr__panel">
        <figcaption>межа рішень на двох півмісяцях</figcaption>
        <svg :viewBox="`0 0 ${SW} ${SH}`" role="img" aria-label="Межа рішень RBF-SVM">
          <g shape-rendering="crispEdges">
            <rect v-for="(ch, i) in grid" :key="i"
                  :x="SP + (i % d.G) * cell.w" :y="SP + Math.floor(i / d.G) * cell.h"
                  :width="cell.w + 1.2" :height="cell.h + 1.2"
                  :fill="ch === '0' ? 'rgba(47,109,181,.17)' : 'rgba(194,87,26,.17)'" />
          </g>
          <circle v-for="(p, i) in d.tr" :key="'t' + i" :cx="sx(p[0])" :cy="sy(p[1])" r="2.6"
                  :fill="COL[d.ytr[i]]" opacity="0.8" />
        </svg>
      </figure>
    </div>

    <div class="lab__controls">
      <label class="lab__ctl">
        <span>gamma = <b>{{ gamma }}</b></span>
        <input type="range" min="0" :max="d.gammas.length - 1" step="1" v-model.number="gi" />
      </label>
      <label class="lab__ctl">
        <span>C = <b>{{ C }}</b></span>
        <input type="range" min="0" :max="d.Cs.length - 1" step="1" v-model.number="ci" />
      </label>
    </div>

    <div class="lab__stats">
      <div class="lab__stat"><b>{{ fmt(atOne) }}</b><span>схожість на відстані 1,0</span></div>
      <div class="lab__stat"><b>{{ meta.sv }}</b><span>опорних векторів із 210</span></div>
      <div class="lab__stat"><b>{{ fmt(meta.tr) }}</b><span>точність на навчальних</span></div>
      <div class="lab__stat" :class="meta.te > 0.94 ? 'is-green' : meta.te < 0.85 ? 'is-warm' : ''">
        <b>{{ fmt(meta.te) }}</b><span>точність на відкладених</span>
      </div>
    </div>

    <p class="lab__note">
      Поставте γ = 0,1: схожість на відстані 1,0 дорівнює 0,90 — кожна точка впливає
      далеко навколо себе, межа виходить майже прямою, і модель недонавчається.
      Поставте γ = 50: схожість падає практично до нуля, межа розпадається на
      острівці навколо окремих спостережень, точність на навчальних росте, а на
      відкладених — падає. Тепер зафіксуйте γ і посуньте C: він керує не радіусом,
      а ціною порушення відступу, тому змінює межу інакше — і кількість опорних
      векторів разом із нею. Саме тому ці два параметри підбирають спільно, сіткою,
      а не по черзі.
    </p>
  </div>
</template>

<style scoped>
.kr__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  gap: 1rem;
  margin: 0.4rem 0 0.7rem;
}
.kr__panel { margin: 0; }
.kr__panel figcaption {
  font-size: 0.75rem;
  color: var(--vp-c-text-3);
  margin-bottom: 0.3rem;
  text-align: center;
}
.kr__panel svg {
  width: 100%;
  height: auto;
  display: block;
  border: 1px solid var(--uk-line);
  border-radius: 8px;
  background: var(--vp-c-bg);
}
.kr__axis { stroke: var(--uk-line); stroke-width: 1; }
.kr__mark { stroke: var(--uk-line); stroke-width: 1; stroke-dasharray: 3 3; }
.kr__curve { fill: none; stroke: var(--uk-accent); stroke-width: 2; }
.kr__dot { fill: var(--uk-warm); }
.kr__lbl { fill: var(--vp-c-text-3); font-size: 10px; }
</style>
