<script setup lang="ts">
/**
 * Поріг класифікації на справжніх передбаченнях моделі з коду scikit-learn:
 * логістична регресія на Breast Cancer Wisconsin, відкладені 171 спостереження.
 * Дані пише tools/gen_lec05_widgets.py і звіряє з текстом: поріг 0,5 → 4 пропуски
 * і 4 хибні тривоги; 0,1 → 1 і 14; 0,9 → 8 і 0. ROC-AUC = 0,992, AP = 0,989.
 * Матриця, точка на ROC-кривій і точка на кривій точність–повнота рухаються разом.
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

/** Крива точність–повнота: те саме сортування, інші осі; AP = Σ (Rᵢ − Rᵢ₋₁)·Pᵢ, як у scikit-learn. */
const pr = computed(() => {
  const pos = Y.reduce((a, b) => a + b, 0)
  const idx = P.map((p, i) => i).sort((a, b) => P[b] - P[a])
  const pts: { x: number; y: number }[] = []
  let tp = 0, fp = 0, ap = 0, prevR = 0
  for (let k = 0; k < idx.length; k++) {
    Y[idx[k]] === 1 ? tp++ : fp++
    // поріг бере групу однакових імовірностей цілком
    if (k + 1 < idx.length && P[idx[k + 1]] === P[idx[k]]) continue
    const r = tp / pos, p = tp / (tp + fp)
    ap += (r - prevR) * p
    prevR = r
    pts.push({ x: r, y: p })
  }
  return { pts, ap, base: pos / Y.length }
})
const prPath = computed(() => {
  const pts = pr.value.pts
  const out = [`${rx(0).toFixed(1)},${ry(pts[0].y).toFixed(1)}`]
  let last = pts[0]
  for (const q of pts) {   // на відрізку повноти (Rᵢ₋₁; Rᵢ] точність Pᵢ — саме ця площа і є AP
    out.push(`${rx(last.x).toFixed(1)},${ry(q.y).toFixed(1)}`, `${rx(q.x).toFixed(1)},${ry(q.y).toFixed(1)}`)
    last = q
  }
  return out.join(' ')
})

/**
 * Ціна помилки. Поріг, оптимальний за Баєсом, дорівнює C_FP / (C_FP + C_FN) —
 * але лише за умови, що ймовірності калібровані. Емпіричний оптимум шукається
 * перебором по самих передбаченнях і на 171 спостереженні може від нього
 * відрізнятися; обидва числа показуємо поруч саме заради цього порівняння.
 */
const cFN = ref(10)
const cFP = ref(1)

const costAt = (thr: number) => {
  let fn = 0, fp = 0
  for (let i = 0; i < P.length; i++) {
    const pred = P[i] >= thr
    if (Y[i] === 1) { if (!pred) fn++ } else if (pred) fp++
  }
  return fn * cFN.value + fp * cFP.value
}
const cost = computed(() => cm.value.fn * cFN.value + cm.value.fp * cFP.value)
const bayesT = computed(() => cFP.value / (cFP.value + cFN.value))

const best = computed(() => {
  const grid = [...new Set(P)].sort((a, b) => a - b)
  let bt = 0.5, bc = Infinity
  for (let i = 0; i < grid.length; i++) {
    const c = costAt(grid[i])
    // поріг ставимо посередині між сусідніми ймовірностями: тоді й округлене
    // до третього знака значення дає ту саму матрицю похибок
    if (c < bc) { bc = c; bt = i > 0 ? (grid[i - 1] + grid[i]) / 2 : grid[i] / 2 }
  }
  return { t: bt, cost: bc }
})

const fmt3 = (v: number) => v.toFixed(3).replace('.', ',')
const fmt2 = (v: number) => v.toFixed(2).replace('.', ',')

const PRESETS = [
  { t: 0.1, label: 'скринінг: 0,1' },
  { t: data.f1_threshold, label: `поріг за F1 (перехресна перевірка): ${fmt2(data.f1_threshold)}` },
  { t: 0.5, label: 'за звичкою: 0,5' },
  { t: 0.9, label: 'обережний: 0,9' }
]
</script>

<template>
  <div class="lab">
    <div class="lab__head">
      <div>
        <div class="lab__title">Поріг вирішує, яким буде діагноз</div>
        <div class="lab__sub">
          Справжні передбачення моделі з коду scikit-learn: логістична регресія на Breast Cancer
          Wisconsin, відкладені 171 спостереження. Модель не змінюється — змінюється лише поріг,
          і разом із ним матриця похибок, точка на ROC-кривій і точка на кривій точність–повнота.
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

    <div class="lab__controls">
      <label class="lab__ctl">
        <span>Ціна пропущеної пухлини = <b>{{ cFN }}</b></span>
        <input type="range" min="1" max="50" step="1" v-model.number="cFN" />
      </label>
      <label class="lab__ctl">
        <span>Ціна хибної тривоги = <b>{{ cFP }}</b></span>
        <input type="range" min="1" max="20" step="1" v-model.number="cFP" />
      </label>
    </div>

    <div class="lab__pills">
      <button class="lab__pill" @click="t = bayesT">
        поріг за Баєсом: {{ fmt3(bayesT) }}
      </button>
      <button class="lab__pill" @click="t = best.t">
        підгонка під ці 171 (так не можна): {{ fmt3(best.t) }}
      </button>
    </div>

    <div class="tl__grid">
      <div class="tl__cm" data-check="cm" :data-cm="`${cm.tn} ${cm.fp} ${cm.fn} ${cm.tp}`">
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

    </div>

    <div class="tl__curves">
      <div class="tl__roc">
        <div class="tl__cmhead">ROC-крива: AUC = <b data-check="auc">{{ String(data.auc).replace('.', ',') }}</b></div>
        <svg :viewBox="`0 0 ${W} ${H}`" role="img" aria-label="ROC-крива">
          <line :x1="rx(0)" :y1="ry(0)" :x2="rx(1)" :y2="ry(1)" class="tl__diag" />
          <polyline :points="rocPath" class="tl__curve" />
          <circle :cx="rx(here.x)" :cy="ry(here.y)" r="5" class="tl__pt" />
          <line :x1="PAD" :y1="H - PAD" :x2="W - PAD" :y2="H - PAD" class="tl__axis" />
          <line :x1="PAD" :y1="PAD" :x2="PAD" :y2="H - PAD" class="tl__axis" />
          <text :x="W / 2" :y="H - 6" class="tl__lbl" text-anchor="middle">частка хибних тривог (FPR)</text>
          <text :x="10" :y="H / 2" class="tl__lbl" text-anchor="middle"
                :transform="`rotate(-90 10 ${H / 2})`">повнота (TPR)</text>
        </svg>
      </div>
      <div class="tl__roc">
        <div class="tl__cmhead">Точність–повнота: AP = <b data-check="ap">{{ fmt3(pr.ap) }}</b></div>
        <svg :viewBox="`0 0 ${W} ${H}`" role="img" aria-label="Крива точність–повнота">
          <line :x1="rx(0)" :y1="ry(pr.base)" :x2="rx(1)" :y2="ry(pr.base)" class="tl__diag" />
          <text :x="rx(1)" :y="ry(pr.base) - 4" class="tl__lbl" text-anchor="end">базовий рівень {{ fmt2(pr.base) }}</text>
          <polyline :points="prPath" class="tl__curve" />
          <circle :cx="rx(rec)" :cy="ry(prec)" r="5" class="tl__pt" />
          <line :x1="PAD" :y1="H - PAD" :x2="W - PAD" :y2="H - PAD" class="tl__axis" />
          <line :x1="PAD" :y1="PAD" :x2="PAD" :y2="H - PAD" class="tl__axis" />
          <text :x="W / 2" :y="H - 6" class="tl__lbl" text-anchor="middle">повнота</text>
          <text :x="10" :y="H / 2" class="tl__lbl" text-anchor="middle"
                :transform="`rotate(-90 10 ${H / 2})`">точність</text>
        </svg>
      </div>
    </div>

    <div class="lab__stats">
      <div class="lab__stat"><b data-check="rec">{{ fmt3(rec) }}</b><span>повнота: скільки злоякісних знайдено</span></div>
      <div class="lab__stat"><b data-check="prec">{{ fmt3(prec) }}</b><span>точність: скільки тривог справдилися</span></div>
      <div class="lab__stat"><b>{{ fmt3(f1) }}</b><span>F1 — гармонічне середнє точності й повноти</span></div>
      <div class="lab__stat" :class="cm.fn > 2 ? 'is-warm' : 'is-green'">
        <b>{{ cm.fn }}</b><span>пропущено злоякісних пухлин</span>
      </div>
      <div class="lab__stat" :class="cost <= best.cost ? 'is-green' : 'is-warm'">
        <b>{{ cost }}</b><span>сумарна ціна помилок; мінімум на цих 171 пацієнтках — {{ best.cost }}</span>
      </div>
    </div>

    <p class="lab__note">
      Зсуньте поріг до 0,1 — пропусків стане один замість чотирьох, а хибних тривог
      чотирнадцять замість чотирьох. Це той самий обмін, що в розділі «Поріг рухає
      матрицю похибок». Точка на ROC-кривій при цьому повзе вправо й угору, а на
      кривій точність–повнота — вправо й униз: повнота росте, точність падає. Жодна
      метрика не скаже, який поріг правильний: це вирішує ціна помилки в клініці,
      а не модель. AUC і AP при цьому не змінюються взагалі — криві описують модель на
      всіх порогах одразу, тому вибір порога вони не підказують.
      Поріг {{ fmt2(data.f1_threshold) }} для максимуму F1 пораховано нижче, у розділі «Поріг можна
      підбирати автоматично», а формулу порога за Баєсом виведено в розділі
      «Поріг за ціною помилок».
    </p>

    <p class="lab__note">
      Тепер задайте ціну помилок числами — і поріг перестане бути справою смаку.
      Якщо пропустити злоякісну пухлину вдесятеро дорожче за хибну тривогу,
      теорія дає поріг <code>C_FP / (C_FP + C_FN)</code>, тобто 0,091: саме там
      очікувані втрати від двох рішень зрівнюються. Друга кнопка ставить поріг,
      найкращий на цих конкретних 171 спостереженні, — тут це 0,030. Це підбір
      на тестовій вибірці: так робити не можна, кнопка лише показує, наскільки
      оптимістичною виходить така оцінка. Сумарні
      втрати виходять однакові, 24, хоча матриці похибок різні: один пропуск
      і чотирнадцять тривог проти жодного пропуску і двадцяти чотирьох.
      Баєсів поріг оптимальний для справжніх імовірностей, емпіричний
      підлаштовується під випадковість маленької вибірки: його оцінка
      оптимістична, і перевага на нових даних не гарантована. І головне: зрівняйте обидві ціни. Баєсів поріг стане
      рівно 0,5 — тим самим, який бібліотека ставить за замовчуванням. Отже,
      0,5 — не константа, а мовчазне припущення, що обидві помилки коштують
      однаково.
    </p>
  </div>
</template>

<style scoped>
.tl__slider { display: block; margin-bottom: 1.1rem; }
.tl__grid { max-width: 30rem; }
.tl__curves {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(230px, 100%), 1fr));
  gap: 1.2rem;
  margin-top: 1rem;
  align-items: start;
}

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
