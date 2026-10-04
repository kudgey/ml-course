<script setup lang="ts">
/**
 * Градієнтний бустинг із пеньків на восьми районах California Housing — та сама
 * процедура, що в розділі «Градієнтний бустинг покроково»: F₀ = середнє, залишки
 * r = y − F, пеньок за найменшою сумою квадратів, F ← F + ν·пеньок. Віджет рахує
 * кроки сам; при ν = 0,5 він мусить повторити еталон із tools/gen_lec06_steps.py:
 * MSE 0,694 → 0,3159 → 0,1773 → 0,0787 і пороги 3,67, 2,27, 5,43. Звірку робить
 * course-site/check_lec06_widgets.mjs.
 */
import { ref, computed } from 'vue'
import data from '../../data/lec06_boost.json'

const X = data.x as number[]
const Y = data.y as number[]
const N = X.length
const ORDER = X.map((_, i) => i).sort((a, b) => X[a] - X[b])
const mean = (v: number[]) => v.reduce((s, a) => s + a, 0) / v.length

type Stump = { t: number; left: number; right: number }
function sseSplit(r: number[]): Stump {
  const xs = [...X].sort((a, b) => a - b)
  let best: Stump | null = null, bestS = Infinity
  for (let i = 1; i < xs.length; i++) {
    const t = (xs[i - 1] + xs[i]) / 2
    const L = r.filter((_, n) => X[n] <= t), R = r.filter((_, n) => X[n] > t)
    const mL = mean(L), mR = mean(R)
    const s = L.reduce((a, v) => a + (v - mL) ** 2, 0) + R.reduce((a, v) => a + (v - mR) ** 2, 0)
    if (s < bestS) { bestS = s; best = { t, left: mL, right: mR } }
  }
  return best as Stump
}

const NUS = [0.1, 0.5, 1]
const nu = ref(0.5)
const k = ref(0)
const MAXK = 30

const path = computed(() => {
  let F = Array(N).fill(mean(Y))
  const out: { F: number[]; stump?: Stump; mse: number; stumps: Stump[] }[] = []
  const stumps: Stump[] = []
  out.push({ F, mse: mean(Y.map((y, n) => (y - F[n]) ** 2)), stumps: [] })
  for (let s = 1; s <= MAXK; s++) {
    const st = sseSplit(Y.map((y, n) => y - F[n]))
    stumps.push(st)
    F = F.map((f, n) => f + nu.value * (X[n] <= st.t ? st.left : st.right))
    out.push({ F, stump: st, mse: mean(Y.map((y, n) => (y - F[n]) ** 2)), stumps: [...stumps] })
  }
  return out
})
const cur = computed(() => path.value[k.value])

// рисунок
const W = 520, H = 260, PL = 40, PR = 12, PT = 12, PB = 34
const XMIN = 1.4, XMAX = 9, YMIN = 0.4, YMAX = 3.4
const px = (x: number) => PL + ((x - XMIN) / (XMAX - XMIN)) * (W - PL - PR)
const py = (y: number) => H - PB - ((y - YMIN) / (YMAX - YMIN)) * (H - PT - PB)
const curve = computed(() => {
  const pts: string[] = []
  for (let i = 0; i <= 300; i++) {
    const x = XMIN + ((XMAX - XMIN) * i) / 300
    let f = mean(Y)
    for (const st of cur.value.stumps) f += nu.value * (x <= st.t ? st.left : st.right)
    pts.push(`${px(x).toFixed(1)},${py(f).toFixed(1)}`)
  }
  return pts.join(' ')
})
const f3 = (v: number) => v.toFixed(3).replace('.', ',').replace('-', '−')
const f4 = (v: number) => v.toFixed(4).replace('.', ',')
const sgn = (v: number) => (v >= 0 ? '+' : '') + f3(v)
const sgn4 = (v: number) => (v >= 0 ? '+' : '') + f4(v).replace('-', '−')
const XT = [2, 4, 6, 8], YT = [1, 2, 3]
function setNu(v: number) { nu.value = v; k.value = 0 }
const go = (n: number) => (k.value = Math.max(0, Math.min(MAXK, n)))
</script>

<template>
  <div class="lab">
    <div class="lab__head">
      <div>
        <div class="lab__title">Градієнтний бустинг на восьми районах</div>
        <div class="lab__sub">
          Крок: залишки r = y − F → пеньок за найменшою сумою квадратів → F ← F + ν·пеньок.
          Ознака — медіанний дохід району, ціль — вартість будинку в сотнях тисяч доларів.
        </div>
      </div>
    </div>

    <div class="lab__pills">
      <span class="bl__cap">темп навчання ν:</span>
      <button v-for="v in NUS" :key="v" class="lab__pill" :class="{ 'is-on': nu === v }"
              @click="setNu(v)">{{ String(v).replace('.', ',') }}</button>
    </div>

    <svg class="bl__plot" :viewBox="`0 0 ${W} ${H}`" role="img" aria-label="Бустинг на восьми районах">
      <line v-for="t in YT" :key="'y' + t" :x1="PL" :x2="W - PR" :y1="py(t)" :y2="py(t)" class="bl__grid" />
      <text v-for="t in YT" :key="'yl' + t" :x="PL - 6" :y="py(t) + 3" class="bl__lbl" text-anchor="end">{{ t }}</text>
      <text v-for="t in XT" :key="'xl' + t" :x="px(t)" :y="H - PB + 14" class="bl__lbl" text-anchor="middle">{{ t }}</text>
      <text :x="(W + PL) / 2" :y="H - 4" class="bl__lbl" text-anchor="middle">медіанний дохід, десятки тисяч $</text>
      <text :x="10" :y="(H - PB) / 2" class="bl__lbl" text-anchor="middle" :transform="`rotate(-90 10 ${(H - PB) / 2})`">вартість, сотні тисяч $</text>
      <line v-if="cur.stump" :x1="px(cur.stump.t)" :x2="px(cur.stump.t)" :y1="PT" :y2="H - PB" class="bl__thr" />
      <line v-for="n in N" :key="'r' + n" :x1="px(X[n - 1])" :x2="px(X[n - 1])"
            :y1="py(cur.F[n - 1])" :y2="py(Y[n - 1])" class="bl__res" />
      <polyline :points="curve" class="bl__curve" />
      <circle v-for="n in N" :key="'p' + n" :cx="px(X[n - 1])" :cy="py(Y[n - 1])" r="5" class="bl__pt" />
    </svg>

    <div class="lab__pills">
      <button class="lab__pill" @click="go(k + 1)">крок</button>
      <button class="lab__pill" @click="go(k + 5)">+5 кроків</button>
      <button class="lab__pill" @click="go(0)">скинути</button>
    </div>

    <div class="lab__stats">
      <div class="lab__stat"><b data-check="k">{{ k }}</b><span>пеньків у сумі</span></div>
      <div class="lab__stat is-green"><b data-check="mse">{{ f4(cur.mse) }}</b><span>MSE на восьми районах</span></div>
      <div class="lab__stat"><b data-check="thr">{{ cur.stump ? f3(cur.stump.t) : '—' }}</b><span>поріг останнього пенька</span></div>
      <div class="lab__stat"><b data-check="leaves">{{ cur.stump ? `${sgn(cur.stump.left)} / ${sgn(cur.stump.right)}` : '—' }}</b><span>листки останнього пенька</span></div>
    </div>

    <table class="bl__table">
      <tbody>
        <tr><th>дохід</th><th>вартість y</th><th>прогноз F</th><th>залишок y − F</th></tr>
        <tr v-for="i in ORDER" :key="i">
          <td>{{ X[i].toFixed(2).replace('.', ',') }}</td>
          <td>{{ Y[i].toFixed(2).replace('.', ',') }}</td>
          <td>{{ f4(cur.F[i]) }}</td>
          <td :class="{ 'is-neg': Y[i] - cur.F[i] < 0 }">{{ sgn4(Y[i] - cur.F[i]) }}</td>
        </tr>
      </tbody>
    </table>

    <p class="lab__note">
      Із ν = 0,5 три кроки повторюють розділ: пороги 3,67, 2,27 і 5,43, MSE 0,6940 → 0,3159 → 0,1773 → 0,0787.
      Червоні відрізки — залишки, на яких навчиться наступний пеньок. З ν = 1 перший крок
      одразу ставить сходинку на рівень середніх, з ν = 0,1 модель підкрадається до даних
      повільно. Натисніть «+5 кроків» кілька разів: MSE на цих восьми районах прямує до нуля —
      бустинг вивчає кожну точку. На нових районах така модель помилялася б більше: це
      перенавчання, і помітити його можна лише на даних, яких модель не бачила.
    </p>
  </div>
</template>

<style scoped>
.bl__cap { font-size: 0.8rem; color: var(--vp-c-text-3); align-self: center; margin-right: 0.2rem; }
.bl__plot { width: 100%; height: auto; display: block; margin: 0.4rem 0 0.6rem; }
.bl__grid { stroke: var(--uk-line); stroke-width: 1; }
.bl__lbl { fill: var(--vp-c-text-3); font-size: 10px; }
.bl__thr { stroke: var(--vp-c-text-3); stroke-width: 1; stroke-dasharray: 2 3; }
.bl__res { stroke: #B3312C; stroke-width: 1.6; stroke-dasharray: 4 3; }
.bl__curve { fill: none; stroke: #2F6DB5; stroke-width: 2.4; }
.bl__pt { fill: #2F6DB5; stroke: var(--vp-c-bg); stroke-width: 1.5; }
.bl__table { width: 100%; margin-top: 0.6rem; font-size: 0.82rem; font-variant-numeric: tabular-nums; }
.bl__table th { text-align: left; font-weight: 500; font-size: 0.74rem; color: var(--vp-c-text-3); padding-bottom: 0.3rem; }
.bl__table td { padding: 0.2rem 0.4rem 0.2rem 0; border-top: 1px solid var(--uk-line); }
.bl__table td.is-neg { color: #B3312C; }
</style>
