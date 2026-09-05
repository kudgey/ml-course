<script setup lang="ts">
/**
 * Позиційне кодування за формулою з розділу:
 *   PE(pos, 2i)   = sin(pos / 10000^(2i/D))
 *   PE(pos, 2i+1) = cos(pos / 10000^(2i/D))
 * Ліворуч — сама матриця кодування, праворуч — скалярний добуток кодувань
 * двох позицій: видно, що він залежить лише від відстані між ними.
 */
import { ref, computed } from 'vue'

const D = ref(64)
const T = ref(40)
const probe = ref(10)

/**
 * Перевірка перестановочної еквіваріантності просто у браузері. Беремо шість
 * токенів по вісім вимірів, рахуємо одноголову самоувагу, потім міняємо
 * місцями два токени й порівнюємо переставлений вихід із виходом від
 * переставленого входу. Без позиційного кодування вони збігаються; з ним —
 * ні, і саме в цьому вся суть розділу.
 */
const withPE = ref(false)
const SWAP: [number, number] = [2, 3]
const NT = 6, ND = 8

/** Відтворюваний генератор, щоб числа були однакові на всіх машинах. */
function prng(seed: number) {
  let v = seed
  return () => { v = (v * 1103515245 + 12345) % 2147483648; return v / 2147483648 - 0.5 }
}
const rnd = prng(7)
const mat = (r: number, c: number) =>
  Array.from({ length: r }, () => Array.from({ length: c }, () => rnd()))
const Wq = mat(ND, ND), Wk = mat(ND, ND), Wv = mat(ND, ND)
const X0 = mat(NT, ND)

const peRow = (pos: number) =>
  Array.from({ length: ND }, (_, i) => {
    const k = Math.floor(i / 2)
    const w = pos / Math.pow(10000, (2 * k) / ND)
    return i % 2 === 0 ? Math.sin(w) : Math.cos(w)
  })

const mul = (A: number[][], B: number[][]) =>
  A.map(row => B[0].map((_, j) => row.reduce((s, v, k) => s + v * B[k][j], 0)))

function selfAttention(X: number[][]) {
  const Q = mul(X, Wq), K = mul(X, Wk), Vv = mul(X, Wv)
  const scale = Math.sqrt(ND)
  return Q.map(q => {
    const sc = K.map(k => q.reduce((s, v, i) => s + v * k[i], 0) / scale)
    const mx = Math.max(...sc)
    const ex = sc.map(v => Math.exp(v - mx))
    const z = ex.reduce((a, b) => a + b, 0)
    return Vv[0].map((_, j) => ex.reduce((s, e, i) => s + (e / z) * Vv[i][j], 0))
  })
}

/** Максимальна розбіжність між SA(RX) і R·SA(X) для перестановки R. */
const permGap = computed(() => {
  const [a, b] = SWAP
  // кодування прив'язане до ПОЗИЦІЇ, а не до токена: переставляємо токени,
  // а кодування щоразу додаємо за новим порядком — саме так працює модель
  const withCode = (tokens: number[][]) =>
    tokens.map((row, t) => withPE.value ? row.map((v, i) => v + peRow(t)[i]) : [...row])

  const tokensSwapped = X0.map(r => [...r])
  ;[tokensSwapped[a], tokensSwapped[b]] = [tokensSwapped[b], tokensSwapped[a]]

  const outSwappedInput = selfAttention(withCode(tokensSwapped))
  const outBase = selfAttention(withCode(X0))
  const permutedOut = outBase.map(r => [...r])
  ;[permutedOut[a], permutedOut[b]] = [permutedOut[b], permutedOut[a]]

  let worst = 0
  for (let i = 0; i < NT; i++)
    for (let j = 0; j < ND; j++)
      worst = Math.max(worst, Math.abs(outSwappedInput[i][j] - permutedOut[i][j]))
  return worst
})

const pe = computed(() => {
  const rows: number[][] = []
  for (let pos = 0; pos < T.value; pos++) {
    const row: number[] = []
    for (let i = 0; i < D.value; i++) {
      const k = Math.floor(i / 2)
      const w = pos / Math.pow(10000, (2 * k) / D.value)
      row.push(i % 2 === 0 ? Math.sin(w) : Math.cos(w))
    }
    rows.push(row)
  }
  return rows
})

/** Схожість кодування обраної позиції з усіма іншими. */
const sims = computed(() => {
  const a = pe.value[Math.min(probe.value, T.value - 1)]
  const na = Math.hypot(...a)
  return pe.value.map(b => {
    const dot = b.reduce((s, v, i) => s + v * a[i], 0)
    return dot / (na * Math.hypot(...b) || 1)
  })
})

const CW = 560, CH = 240, PAD = 30
const color = (v: number) =>
  v >= 0 ? `rgba(47,109,181,${(v * 0.9).toFixed(3)})`
         : `rgba(194,87,26,${(-v * 0.9).toFixed(3)})`

const simPath = computed(() => {
  const w = CW - 2 * PAD, h = CH - 2 * PAD
  return sims.value
    .map((s, i) => `${(PAD + (i / (T.value - 1)) * w).toFixed(1)},${(CH - PAD - ((s + 1) / 2) * h).toFixed(1)}`)
    .join(' ')
})

const fmt = (v: number) => v.toFixed(2).replace('.', ',')
</script>

<template>
  <div class="lab">
    <div class="lab__head">
      <div>
        <div class="lab__title">Чим позиції відрізняються одна від одної</div>
        <div class="lab__sub">
          Матриця рахується просто тут, за формулою вище. Кожен рядок — вектор
          однієї позиції, кожен стовпець — своя частота: ліві стовпці міняються
          швидко, праві майже сталі.
        </div>
      </div>
    </div>

    <div class="pe__cap">кодування: рядок — позиція, стовпець — вимір</div>
    <div class="pe__grid" :style="{ gridTemplateColumns: `repeat(${D}, 1fr)` }">
      <template v-for="(row, pos) in pe" :key="pos">
        <i v-for="(v, i) in row" :key="i" :style="{ background: color(v) }"
           :class="{ 'is-probe': pos === probe }" />
      </template>
    </div>

    <div class="lab__controls">
      <label class="lab__ctl">
        <span>Вимірів D = <b>{{ D }}</b></span>
        <input type="range" min="8" max="128" step="8" v-model.number="D" />
      </label>
      <label class="lab__ctl">
        <span>Позицій у послідовності: <b>{{ T }}</b></span>
        <input type="range" min="10" max="80" step="2" v-model.number="T" />
      </label>
      <label class="lab__ctl">
        <span>Порівнюємо з позицією <b>{{ probe }}</b></span>
        <input type="range" min="0" :max="T - 1" step="1" v-model.number="probe" />
      </label>
    </div>

    <div class="pe__cap">схожість кодування позиції {{ probe }} з усіма іншими</div>
    <svg :viewBox="`0 0 ${CW} ${CH}`" class="pe__plot" role="img"
         aria-label="Косинусна схожість позиційних кодувань">
      <line :x1="PAD" :y1="CH - PAD - (CH - 2 * PAD) / 2" :x2="CW - PAD"
            :y2="CH - PAD - (CH - 2 * PAD) / 2" class="pe__zero" />
      <polyline :points="simPath" class="pe__curve" />
      <line :x1="PAD + (probe / (T - 1)) * (CW - 2 * PAD)" :y1="PAD"
            :x2="PAD + (probe / (T - 1)) * (CW - 2 * PAD)" :y2="CH - PAD" class="pe__mark" />
      <line :x1="PAD" :y1="CH - PAD" :x2="CW - PAD" :y2="CH - PAD" class="pe__axis" />
      <text :x="CW / 2" :y="CH - 6" class="pe__lbl" text-anchor="middle">позиція в послідовності</text>
      <text :x="PAD - 6" :y="PAD + 6" class="pe__lbl" text-anchor="end">+1</text>
      <text :x="PAD - 6" :y="CH - PAD" class="pe__lbl" text-anchor="end">−1</text>
    </svg>

    <div class="lab__stats">
      <div class="lab__stat is-green"><b>{{ fmt(sims[probe] ?? 1) }}</b><span>сама з собою</span></div>
      <div class="lab__stat"><b>{{ fmt(sims[Math.min(probe + 1, T - 1)] ?? 0) }}</b><span>із сусідньою</span></div>
      <div class="lab__stat"><b>{{ fmt(sims[Math.min(probe + 10, T - 1)] ?? 0) }}</b><span>через десять позицій</span></div>
      <div class="lab__stat"><b>{{ D }}</b><span>чисел на позицію</span></div>
    </div>

    <div class="lab__pills">
      <button class="lab__pill" :class="{ 'is-on': !withPE }" @click="withPE = false">
        сама увага
      </button>
      <button class="lab__pill" :class="{ 'is-on': withPE }" @click="withPE = true">
        увага + позиційне кодування
      </button>
    </div>

    <div class="lab__stats">
      <div class="lab__stat" :class="permGap < 1e-12 ? 'is-warm' : 'is-green'">
        <b>{{ permGap < 1e-12 ? '≈ 0' : permGap.toFixed(3).replace('.', ',') }}</b>
        <span>розбіжність після перестановки двох токенів</span>
      </div>
      <div class="lab__stat"><b>6 × 8</b><span>токенів і вимірів у перевірці</span></div>
      <div class="lab__stat"><b>{{ withPE ? 'так' : 'ні' }}</b><span>кодування додано до вкладень</span></div>
    </div>

    <p class="lab__note">
      Пік схожості стоїть рівно на обраній позиції й спадає з відстанню — саме тому
      модель може вивести «наскільки далеко» один токен від іншого, хоча сама увага
      порядку не бачить. Посуньте позицію: форма кривої їде за нею, не змінюючись,
      бо скалярний добуток двох кодувань залежить тільки від різниці позицій.
      Зменште D до восьми — частот стає замало, і далекі позиції починають
      виглядати схожими; це і є причина, чому розмірність кодування беруть такою
      самою, як розмірність вкладення.
    </p>

    <p class="lab__note">
      Друга частина вставки перевіряє те, заради чого кодування й вигадали.
      Кнопка «сама увага» рахує самоувагу на шести токенах, потім міняє місцями
      третій і четвертий і порівнює результат із переставленим виходом. Різниця
      дорівнює нулю з точністю машинної арифметики: увага справді не бачить
      порядку, і це властивість архітектури, а не наслідок навчання. У лекції
      той самий дослід на PyTorch дає 1,2·10⁻⁷ — розбіжність більша лише тому,
      що там float32, а тут подвійна точність.

      Тепер натисніть «увага + позиційне кодування». Розбіжність перестає бути
      нулем — на цих числах 0,076. Причина в тому, що кодування прив'язане до
      позиції, а не до токена: переставивши слова, ми лишили кодування на
      місці, і входи справді змінилися. Саме це й потрібно — так модель
      дізнається, що «вона любить котів більше за собак» не те саме, що «вона
      любить собак більше за котів».
    </p>
  </div>
</template>

<style scoped>
.pe__cap {
  font-size: 0.76rem;
  color: var(--vp-c-text-3);
  margin: 0.6rem 0 0.35rem;
}
.pe__grid {
  display: grid;
  gap: 0;
  border: 1px solid var(--uk-line);
  border-radius: 6px;
  overflow: hidden;
  background: var(--vp-c-bg);
}
.pe__grid i { display: block; aspect-ratio: 1; min-height: 3px; }
.pe__grid i.is-probe { outline: 1px solid var(--uk-warm); outline-offset: -1px; }
.pe__plot { width: 100%; height: auto; display: block; }
.pe__axis, .pe__zero { stroke: var(--uk-line); stroke-width: 1; }
.pe__zero { stroke-dasharray: 3 3; }
.pe__curve { fill: none; stroke: var(--uk-accent); stroke-width: 2; }
.pe__mark { stroke: var(--uk-warm); stroke-width: 1.2; stroke-dasharray: 3 3; }
.pe__lbl { fill: var(--vp-c-text-3); font-size: 10px; }
</style>
