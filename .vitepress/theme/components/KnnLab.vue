<script setup lang="ts">
/**
 * Межа рішень методу k найближчих сусідів — ті самі дані, що на рисунку:
 * Wine, дві стандартизовані ознаки, 124 зразки для навчання, 54 для перевірки.
 * Межа й точність рахуються тут-таки, у браузері, для будь-якого k.
 * Числа розділу відтворюються: k = 1 → 0,93; k = 15 → 0,94; k = 100 → 0,39.
 */
import { ref, computed, watch, onMounted, useTemplateRef } from 'vue'
import wine from '../../data/lec06_wine.json'

const TR = wine.tr as number[][]
const YTR = wine.ytr as number[]
const TE = wine.te as number[][]
const YTE = wine.yte as number[]

const k = ref(15)
const showTest = ref(false)
const canvas = useTemplateRef<HTMLCanvasElement>('canvas')

const W = 460, H = 340, PAD = 34
const xs = TR.concat(TE).map(p => p[0])
const ys = TR.concat(TE).map(p => p[1])
const x0 = Math.min(...xs) - 0.4, x1 = Math.max(...xs) + 0.4
const y0 = Math.min(...ys) - 0.4, y1 = Math.max(...ys) + 0.4
const sx = (v: number) => PAD + ((v - x0) / (x1 - x0)) * (W - 2 * PAD)
const sy = (v: number) => H - PAD - ((v - y0) / (y1 - y0)) * (H - 2 * PAD)

const COL = ['#2F6DB5', '#C2571A', '#1E8E6A']
const FILL = ['rgba(47,109,181,.16)', 'rgba(194,87,26,.16)', 'rgba(30,142,106,.16)']

/** Клас точки за голосуванням k найближчих сусідів навчальної вибірки. */
function classify(px: number, py: number, kk: number) {
  const d = TR.map((p, i) => ({ d: (p[0] - px) ** 2 + (p[1] - py) ** 2, y: YTR[i] }))
  d.sort((a, b) => a.d - b.d)
  const votes = [0, 0, 0]
  for (let i = 0; i < Math.min(kk, d.length); i++) votes[d[i].y]++
  return votes.indexOf(Math.max(...votes))
}

const acc = computed(() => {
  let ok = 0
  for (let i = 0; i < TE.length; i++) if (classify(TE[i][0], TE[i][1], k.value) === YTE[i]) ok++
  return ok / TE.length
})

const trainAcc = computed(() => {
  let ok = 0
  for (let i = 0; i < TR.length; i++) if (classify(TR[i][0], TR[i][1], k.value) === YTR[i]) ok++
  return ok / TR.length
})

/** Заливка регіонів: сітка 4 × 4 пікселі, щоб перерахунок лишався миттєвим. */
function paint() {
  const c = canvas.value
  if (!c) return
  const ctx = c.getContext('2d')
  if (!ctx) return
  const STEP = 4
  ctx.clearRect(0, 0, W, H)
  for (let px = PAD; px < W - PAD; px += STEP) {
    for (let py = PAD; py < H - PAD; py += STEP) {
      const vx = x0 + ((px - PAD) / (W - 2 * PAD)) * (x1 - x0)
      const vy = y0 + ((H - PAD - py) / (H - 2 * PAD)) * (y1 - y0)
      ctx.fillStyle = FILL[classify(vx, vy, k.value)]
      ctx.fillRect(px, py, STEP, STEP)
    }
  }
}

onMounted(paint)
watch(k, paint)

const pct = (v: number) => v.toFixed(2).replace('.', ',')
const PRESETS = [1, 15, 100]
</script>

<template>
  <div class="lab">
    <div class="lab__head">
      <div>
        <div class="lab__title">k керує гладкістю межі</div>
        <div class="lab__sub">
          Ті самі дані, що на рисунку: три сорти вина у двох ознаках, 124 зразки для
          навчання і 54 відкладених. Межа рішень перераховується просто тут — для
          будь-якого k, не лише для трьох показаних.
        </div>
      </div>
    </div>

    <div class="lab__pills">
      <button v-for="p in PRESETS" :key="p" class="lab__pill"
              :class="{ 'is-on': k === p }" @click="k = p">k = {{ p }}</button>
      <button class="lab__pill" :class="{ 'is-on': showTest }" @click="showTest = !showTest">
        показати відкладені зразки
      </button>
    </div>

    <label class="lab__ctl kn__slider">
      <span>Сусідів k = <b>{{ k }}</b> зі 124 навчальних</span>
      <input type="range" min="1" max="124" step="1" v-model.number="k" />
    </label>

    <div class="kn__plot">
      <canvas ref="canvas" :width="W" :height="H" class="kn__canvas" />
      <svg :viewBox="`0 0 ${W} ${H}`" class="kn__svg" role="img"
           aria-label="Межа рішень методу найближчих сусідів">
        <circle v-for="(p, i) in TR" :key="'tr' + i" :cx="sx(p[0])" :cy="sy(p[1])" r="3.2"
                :fill="COL[YTR[i]]" opacity="0.75" stroke="#fff" stroke-width="0.6" />
        <g v-if="showTest">
          <rect v-for="(p, i) in TE" :key="'te' + i"
                :x="sx(p[0]) - 3.4" :y="sy(p[1]) - 3.4" width="6.8" height="6.8"
                :fill="COL[YTE[i]]" stroke="#111" stroke-width="0.8" opacity="0.95" />
        </g>
        <line :x1="PAD" :y1="H - PAD" :x2="W - PAD" :y2="H - PAD" class="kn__axis" />
        <line :x1="PAD" :y1="PAD" :x2="PAD" :y2="H - PAD" class="kn__axis" />
        <text :x="W / 2" :y="H - 8" class="kn__lbl" text-anchor="middle">{{ wine.axes[0] }}</text>
        <text :x="11" :y="H / 2" class="kn__lbl" text-anchor="middle"
              :transform="`rotate(-90 11 ${H / 2})`">{{ wine.axes[1] }}</text>
      </svg>
    </div>

    <div class="kn__legend">
      <span v-for="(n, c) in wine.names" :key="n"><i :style="{ background: COL[c] }" />{{ n }}</span>
      <span v-if="showTest" class="kn__legend-te"><i /> відкладені зразки</span>
    </div>

    <div class="lab__stats">
      <div class="lab__stat" :class="acc > 0.9 ? 'is-green' : acc < 0.6 ? 'is-warm' : ''">
        <b>{{ pct(acc) }}</b><span>точність на 54 відкладених</span>
      </div>
      <div class="lab__stat"><b>{{ pct(trainAcc) }}</b><span>точність на навчальних</span></div>
      <div class="lab__stat"><b>{{ k }}</b><span>сусідів голосує за клас</span></div>
    </div>

    <p class="lab__note">
      При k = 1 регіони рвані: всередині чужої зони стоять острівці навколо окремих
      зразків, а точність на навчальних даних дорівнює одиниці — модель просто
      пам'ятає їх. При k = 15 межа згладжується, і точність на відкладених навіть
      зростає, від 0,93 до 0,94. Тягніть повзунок далі: при k = 100 сусідами стають
      майже всі навчальні зразки, найбільший клас поглинає решту, і точність падає
      до 0,39 — рівня найбільшого класу. Отже, k підбирають, а не вгадують, і робити
      це треба на окремій вибірці.
    </p>
  </div>
</template>

<style scoped>
.kn__slider { display: block; margin-bottom: 1rem; }
.kn__plot { position: relative; width: 100%; }
.kn__canvas, .kn__svg { display: block; width: 100%; height: auto; }
.kn__canvas { position: absolute; inset: 0; border-radius: 8px; }
.kn__svg { position: relative; }
.kn__axis { stroke: var(--uk-line); stroke-width: 1; }
.kn__lbl { fill: var(--vp-c-text-3); font-size: 10px; }

.kn__legend {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  justify-content: center;
  font-size: 0.79rem;
  color: var(--vp-c-text-2);
  margin-top: 0.35rem;
}
.kn__legend i {
  display: inline-block;
  width: 9px; height: 9px;
  border-radius: 50%;
  margin-right: 0.35rem;
}
.kn__legend-te i { border-radius: 2px; background: transparent; border: 1px solid var(--vp-c-text-1); }
</style>
