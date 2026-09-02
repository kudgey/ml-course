<script setup lang="ts">
/**
 * Активації та їхні похідні — та сама пара панелей, що на рисунку, але з
 * можливістю поставити точку z і побачити множник, який піде в ланцюгове правило.
 * Число з розділу відтворюється: похідна сигмоїди максимальна в нулі й дорівнює
 * 0,25, а 0,25¹⁰ ≈ 10⁻⁶ — саме тому сигнал до перших шарів не доходить.
 */
import { ref, computed } from 'vue'

const z = ref(2.5)
const depth = ref(10)

const FN = {
  sigmoid: {
    name: 'сигмоїда',
    f: (x: number) => 1 / (1 + Math.exp(-x)),
    d: (x: number) => { const s = 1 / (1 + Math.exp(-x)); return s * (1 - s) },
    color: '#2F6DB5'
  },
  tanh: {
    name: 'tanh',
    f: (x: number) => Math.tanh(x),
    d: (x: number) => 1 - Math.tanh(x) ** 2,
    color: '#C2571A'
  },
  relu: {
    name: 'ReLU',
    f: (x: number) => Math.max(0, x),
    d: (x: number) => (x > 0 ? 1 : 0),
    color: '#1E8E6A'
  },
  gelu: {
    name: 'GELU',
    f: (x: number) => x / (1 + Math.exp(-1.702 * x)),
    d: (x: number) => {
      const s = 1 / (1 + Math.exp(-1.702 * x))
      return s + x * 1.702 * s * (1 - s)
    },
    color: '#6B4C9A'
  }
}
type Key = keyof typeof FN
const on = ref<Key[]>(['sigmoid', 'tanh', 'relu'])
const toggle = (k: Key) =>
  (on.value = on.value.includes(k) ? on.value.filter(v => v !== k) : [...on.value, k])

const W = 300, H = 210, PAD = 28
const XR = 5

const px = (x: number) => PAD + ((x + XR) / (2 * XR)) * (W - 2 * PAD)
const pyF = (y: number) => H - PAD - ((y + 1.2) / 3.4) * (H - 2 * PAD)
const pyD = (y: number) => H - PAD - (y / 1.15) * (H - 2 * PAD)

function curve(fn: (x: number) => number, py: (y: number) => number) {
  const pts: string[] = []
  for (let i = 0; i <= 120; i++) {
    const x = -XR + (2 * XR * i) / 120
    pts.push(`${px(x).toFixed(1)},${py(fn(x)).toFixed(1)}`)
  }
  return pts.join(' ')
}

const rows = computed(() =>
  on.value.map(k => {
    const d = FN[k].d(z.value)
    return { k, name: FN[k].name, color: FN[k].color, d, prod: Math.pow(d, depth.value) }
  })
)

const SUP: Record<string, string> = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
  '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻'
}
const sup = (n: string) => [...n].map(c => SUP[c] ?? c).join('')

const fmt = (v: number) => {
  if (v === 0) return '0'
  if (Math.abs(v) >= 1e-4) return v.toFixed(4).replace('.', ',')
  const [m, e] = v.toExponential(1).split('e')
  return `${m.replace('.', ',')} · 10${sup(String(Number(e)))}`
}
</script>

<template>
  <div class="lab">
    <div class="lab__head">
      <div>
        <div class="lab__title">Чому похідна активації важливіша за саму активацію</div>
        <div class="lab__sub">
          Ліва панель — самі функції, права — їхні похідні. Похідна входить множником
          у кожен крок ланцюгового правила, тому в глибокій мережі перемножується
          сама на себе стільки разів, скільки шарів.
        </div>
      </div>
    </div>

    <div class="lab__pills">
      <button v-for="(v, k) in FN" :key="k" class="lab__pill"
              :class="{ 'is-on': on.includes(k as Key) }"
              :style="on.includes(k as Key) ? { borderColor: v.color, color: v.color } : {}"
              @click="toggle(k as Key)">
        {{ v.name }}
      </button>
    </div>

    <div class="ac__grid">
      <div>
        <div class="ac__cap">функція φ(z)</div>
        <svg :viewBox="`0 0 ${W} ${H}`" role="img" aria-label="Графіки активацій">
          <defs>
            <clipPath id="ac-clip-f">
              <rect :x="PAD - 2" :y="PAD - 8" :width="W - 2 * PAD + 4" :height="H - 2 * PAD + 10" />
            </clipPath>
          </defs>
          <line :x1="PAD" :y1="pyF(0)" :x2="W - PAD" :y2="pyF(0)" class="ac__axis" />
          <line :x1="px(0)" :y1="PAD" :x2="px(0)" :y2="H - PAD" class="ac__axis" />
          <g clip-path="url(#ac-clip-f)">
            <polyline v-for="k in on" :key="k" :points="curve(FN[k].f, pyF)"
                      class="ac__curve" :style="{ stroke: FN[k].color }" />
          </g>
          <line :x1="px(z)" :y1="PAD" :x2="px(z)" :y2="H - PAD" class="ac__mark" />
        </svg>
      </div>
      <div>
        <div class="ac__cap">похідна φ′(z)</div>
        <svg :viewBox="`0 0 ${W} ${H}`" role="img" aria-label="Графіки похідних активацій">
          <defs>
            <clipPath id="ac-clip-d">
              <rect :x="PAD - 2" :y="PAD - 8" :width="W - 2 * PAD + 4" :height="H - 2 * PAD + 10" />
            </clipPath>
          </defs>
          <line :x1="PAD" :y1="pyD(0)" :x2="W - PAD" :y2="pyD(0)" class="ac__axis" />
          <line :x1="px(0)" :y1="PAD" :x2="px(0)" :y2="H - PAD" class="ac__axis" />
          <line :x1="PAD" :y1="pyD(1)" :x2="W - PAD" :y2="pyD(1)" class="ac__one" />
          <g clip-path="url(#ac-clip-d)">
            <polyline v-for="k in on" :key="k" :points="curve(FN[k].d, pyD)"
                      class="ac__curve" :style="{ stroke: FN[k].color }" />
          </g>
          <line :x1="px(z)" :y1="PAD" :x2="px(z)" :y2="H - PAD" class="ac__mark" />
          <text :x="W - PAD" :y="pyD(1) - 4" class="ac__lbl" text-anchor="end">1</text>
        </svg>
      </div>
    </div>

    <div class="lab__controls">
      <label class="lab__ctl">
        <span>Точка z = <b>{{ z.toFixed(1).replace('.', ',') }}</b></span>
        <input type="range" min="-5" max="5" step="0.1" v-model.number="z" />
      </label>
      <label class="lab__ctl">
        <span>Глибина мережі: <b>{{ depth }}</b> шарів</span>
        <input type="range" min="1" max="30" step="1" v-model.number="depth" />
      </label>
    </div>

    <table class="ac__table">
      <tbody>
      <tr>
        <th>активація</th>
        <th>φ′(z) у точці</th>
        <th>множник після {{ depth }} шарів</th>
      </tr>
      <tr v-for="r in rows" :key="r.k">
        <td><i :style="{ background: r.color }" />{{ r.name }}</td>
        <td>{{ fmt(r.d) }}</td>
        <td :class="r.prod < 1e-4 ? 'is-dead' : r.prod > 0.5 ? 'is-live' : ''">{{ fmt(r.prod) }}</td>
      </tr>
      </tbody>
    </table>

    <p class="lab__note">
      Поставте z = 0 — це найкраще, що може дати сигмоїда: похідна рівно 0,25, і вже
      через десять шарів множник падає до 10⁻⁶. Це і є <b>зникаючий градієнт</b>:
      перші шари майже не отримують сигналу. У ReLU на додатному боці похідна дорівнює
      одиниці, тому множник лишається одиницею на будь-якій глибині — але зсуньте z
      у від'ємну зону, і вона стане строго нулем: нейрон «помирає» і більше не
      навчається. GELU згладжує цей злам, тому її беруть у трансформерах.
    </p>
  </div>
</template>

<style scoped>
.ac__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(255px, 1fr));
  gap: 1rem;
  margin: 0.4rem 0 0.6rem;
}
.ac__cap { font-size: 0.78rem; color: var(--vp-c-text-3); margin-bottom: 0.25rem; }
.ac__grid svg { width: 100%; height: auto; display: block; }
.ac__axis { stroke: var(--uk-line); stroke-width: 1; }
.ac__one { stroke: var(--uk-line); stroke-width: 1; stroke-dasharray: 3 3; }
.ac__mark { stroke: var(--vp-c-text-3); stroke-width: 1; stroke-dasharray: 2 3; opacity: 0.8; }
.ac__curve { fill: none; stroke-width: 1.9; }
.ac__lbl { fill: var(--vp-c-text-3); font-size: 9.5px; }

.ac__table { width: 100%; margin-top: 0.9rem; font-size: 0.86rem; }
.ac__table th {
  text-align: left;
  font-weight: 500;
  font-size: 0.76rem;
  color: var(--vp-c-text-3);
  padding-bottom: 0.35rem;
}
.ac__table td {
  padding: 0.3rem 0;
  font-variant-numeric: tabular-nums;
  border-top: 1px solid var(--uk-line);
}
.ac__table td i {
  display: inline-block;
  width: 9px; height: 9px;
  border-radius: 2px;
  margin-right: 0.45rem;
}
.ac__table td.is-dead { color: var(--uk-warm); }
.ac__table td.is-live { color: var(--uk-green); }
</style>
