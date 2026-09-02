<script setup lang="ts">
/**
 * Поріг класифікації на справжніх передбаченнях моделі з розділу:
 * логістична регресія на Breast Cancer Wisconsin, відкладені 171 спостереження.
 * Числа розділу відтворюються точно: поріг 0,5 → 4 пропуски і 4 хибні тривоги;
 * поріг 0,1 → 1 пропуск і 14 хибних тривог. ROC-AUC = 0,992.
 */
import { ref, computed } from 'vue'
import data from '../../data/lec05_proba.json'

const t = ref(0.5)
const P = data.proba as number[]
const Y = data.y as number[]

const cm = computed(() => {
  let tp = 0, fp = 0, tn = 0, fn = 0
  for (let i = 0; i < P.length; i++) {
    const pred = P[i] >= t.value
    if (Y[i] === 1) pred ? tp++ : fn++
    else pred ? fp++ : tn++
  }
  return { tp, fp, tn, fn }
})

const prec = computed(() => (cm.value.tp + cm.value.fp ? cm.value.tp / (cm.value.tp + cm.value.fp) : 1))
const rec = computed(() => cm.value.tp / (cm.value.tp + cm.value.fn))
const f1 = computed(() => (prec.value + rec.value ? (2 * prec.value * rec.value) / (prec.value + rec.value) : 0))

/** ROC-крива по всіх порогах — рахується один раз із тих самих даних. */
const roc = computed(() => {
  const pos = Y.reduce((a, b) => a + b, 0)
  const neg = Y.length - pos
  const idx = P.map((p, i) => i).sort((a, b) => P[b] - P[a])
  const pts = [{ x: 0, y: 0 }]
  let tp = 0, fp = 0
  for (const i of idx) {
    Y[i] === 1 ? tp++ : fp++
    pts.push({ x: fp / neg, y: tp / pos })
  }
  return pts
})

const W = 250, H = 250, PAD = 30
const rx = (v: number) => PAD + v * (W - 2 * PAD)
const ry = (v: number) => H - PAD - v * (H - 2 * PAD)
const rocPath = computed(() => roc.value.map(p => `${rx(p.x).toFixed(1)},${ry(p.y).toFixed(1)}`).join(' '))

const here = computed(() => {
  const pos = Y.reduce((a, b) => a + b, 0)
  return { x: cm.value.fp / (Y.length - pos), y: rec.value }
})

const pct = (v: number) => (v * 100).toFixed(1).replace('.', ',') + ' %'

const PRESETS = [
  { t: 0.1, label: 'скринінг: 0,1' },
  { t: 0.434, label: 'максимум F1: 0,434' },
  { t: 0.5, label: 'за звичкою: 0,5' },
  { t: 0.9, label: 'обережний: 0,9' }
]
</script>

<template>
  <div class="lab">
    <div class="lab__head">
      <div>
        <div class="lab__title">Поріг вирішує, ким стане пацієнтка</div>
        <div class="lab__sub">
          Справжні передбачення моделі з розділу вище: логістична регресія на Breast Cancer
          Wisconsin, відкладені 171 спостереження, ROC-AUC = {{ String(data.auc).replace('.', ',') }}.
          Модель не змінюється — змінюється лише поріг.
        </div>
      </div>
    </div>

    <div class="lab__pills">
      <button v-for="p in PRESETS" :key="p.t" class="lab__pill"
              :class="{ 'is-on': Math.abs(t - p.t) < 1e-9 }" @click="t = p.t">
        {{ p.label }}
      </button>
    </div>

    <label class="lab__ctl tl__slider">
      <span>Поріг = <b>{{ t.toFixed(3).replace('.', ',') }}</b></span>
      <input type="range" min="0.01" max="0.99" step="0.001" v-model.number="t" />
    </label>

    <div class="tl__grid">
      <div class="tl__cm">
        <div class="tl__cmhead">Матриця похибок</div>
        <table>
          <tbody>
          <tr>
            <td class="tl__corner"></td>
            <th class="tl__col">прогноз: доброякісна</th>
            <th class="tl__col">прогноз: злоякісна</th>
          </tr>
          <tr>
            <th class="tl__row">факт: доброякісна</th>
            <td class="tl__cell is-ok">{{ cm.tn }}<i>правильно</i></td>
            <td class="tl__cell is-warm">{{ cm.fp }}<i>хибна тривога</i></td>
          </tr>
          <tr>
            <th class="tl__row">факт: злоякісна</th>
            <td class="tl__cell is-bad">{{ cm.fn }}<i>пропущено</i></td>
            <td class="tl__cell is-ok">{{ cm.tp }}<i>виявлено</i></td>
          </tr>
          </tbody>
        </table>
      </div>

      <div class="tl__roc">
        <div class="tl__cmhead">ROC-крива й поточна точка</div>
        <svg :viewBox="`0 0 ${W} ${H}`" role="img" aria-label="ROC-крива">
          <line :x1="rx(0)" :y1="ry(0)" :x2="rx(1)" :y2="ry(1)" class="tl__diag" />
          <polyline :points="rocPath" class="tl__curve" />
          <circle :cx="rx(here.x)" :cy="ry(here.y)" r="5" class="tl__pt" />
          <line :x1="PAD" :y1="H - PAD" :x2="W - PAD" :y2="H - PAD" class="tl__axis" />
          <line :x1="PAD" :y1="PAD" :x2="PAD" :y2="H - PAD" class="tl__axis" />
          <text :x="W / 2" :y="H - 6" class="tl__lbl" text-anchor="middle">хибно-позитивна частка</text>
          <text :x="10" :y="H / 2" class="tl__lbl" text-anchor="middle"
                :transform="`rotate(-90 10 ${H / 2})`">повнота</text>
        </svg>
      </div>
    </div>

    <div class="lab__stats">
      <div class="lab__stat"><b>{{ pct(rec) }}</b><span>повнота: скільки злоякісних знайдено</span></div>
      <div class="lab__stat"><b>{{ pct(prec) }}</b><span>точність: скільки тривог справдилися</span></div>
      <div class="lab__stat"><b>{{ pct(f1) }}</b><span>F1</span></div>
      <div class="lab__stat" :class="cm.fn > 2 ? 'is-warm' : 'is-green'">
        <b>{{ cm.fn }}</b><span>пропущено злоякісних пухлин</span>
      </div>
    </div>

    <p class="lab__note">
      Зсуньте поріг до 0,1 — пропусків стане один замість чотирьох, а хибних тривог
      чотирнадцять замість чотирьох. Це той самий обмін, що на рисунку. Жодна
      метрика не скаже, який поріг правильний: це вирішує ціна помилки в клініці,
      а не модель. ROC-AUC при цьому не змінюється взагалі — крива описує модель на
      всіх порогах одразу, тому вибір порога вона не підказує.
    </p>
  </div>
</template>

<style scoped>
.tl__slider { display: block; margin-bottom: 1.1rem; }
.tl__grid {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr);
  gap: 1.2rem;
  align-items: start;
}
@media (max-width: 700px) { .tl__grid { grid-template-columns: 1fr; } }

.tl__cmhead {
  font-size: 0.78rem;
  color: var(--vp-c-text-3);
  margin-bottom: 0.5rem;
}
.tl__cm table { width: 100%; border-collapse: separate; border-spacing: 4px; }
.tl__col, .tl__row {
  font-size: 0.72rem;
  font-weight: 500;
  color: var(--vp-c-text-3);
  text-align: center;
  line-height: 1.3;
  padding: 0.2rem;
}
.tl__row { text-align: right; width: 32%; }
.tl__cell {
  text-align: center;
  padding: 0.6rem 0.3rem;
  border-radius: 8px;
  font-size: 1.45rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
  background: var(--uk-fill);
}
.tl__cell i {
  display: block;
  font-style: normal;
  font-size: 0.68rem;
  font-weight: 400;
  color: var(--vp-c-text-3);
  margin-top: 0.15rem;
}
.tl__cell.is-ok { color: var(--uk-green); background: var(--uk-green-soft); }
.tl__cell.is-warm { color: var(--uk-warm); background: var(--uk-warm-soft); }
.tl__cell.is-bad { color: #b3312c; background: var(--uk-warm-soft); }
.dark .tl__cell.is-bad { color: #e5847f; }

.tl__roc svg { width: 100%; height: auto; }
.tl__axis { stroke: var(--uk-line); stroke-width: 1; }
.tl__diag { stroke: var(--uk-line); stroke-width: 1; stroke-dasharray: 3 3; }
.tl__curve { fill: none; stroke: var(--uk-accent); stroke-width: 1.8; }
.tl__pt { fill: var(--uk-warm); stroke: var(--vp-c-bg); stroke-width: 1.5; }
.tl__lbl { fill: var(--vp-c-text-3); font-size: 9.5px; }
</style>
