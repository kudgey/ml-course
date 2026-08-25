<script setup lang="ts">
/**
 * Згортка на справжній цифрі MNIST. Ядро задається вручну — дев'ять чисел, —
 * і карта ознак перераховується тут-таки за тією самою формулою, що на картці:
 * сума добутків ваг на пікселі під вікном. Готові набори — ті самі класичні
 * фільтри, які до появи згорткових мереж програмували руками.
 */
import { ref, computed } from 'vue'
import data from '../../data/lec11_digits.json'

const digit = ref('4')
const pad = ref(true)
const stride = ref(1)

const PRESETS: Record<string, { k: number[]; hint: string }> = {
  'вертикальні краї': { k: [1, 0, -1, 1, 0, -1, 1, 0, -1], hint: 'реагує на перепад яскравості зліва направо' },
  'горизонтальні краї': { k: [1, 1, 1, 0, 0, 0, -1, -1, -1], hint: 'той самий фільтр, повернутий на 90°' },
  'лапласіан': { k: [0, 1, 0, 1, -4, 1, 0, 1, 0], hint: 'підсвічує будь-який різкий перепад — контур цілком' },
  'розмиття': { k: [1, 1, 1, 1, 1, 1, 1, 1, 1], hint: 'усереднення сусідів: шум гасне разом із деталями' },
  'різкість': { k: [0, -1, 0, -1, 5, -1, 0, -1, 0], hint: 'підсилює центр проти сусідів' },
  'тотожність': { k: [0, 0, 0, 0, 1, 0, 0, 0, 0], hint: 'нічого не змінює — перевірка, що механіка чесна' }
}

const preset = ref('вертикальні краї')
const kernel = ref([...PRESETS['вертикальні краї'].k])

function apply(name: string) {
  preset.value = name
  kernel.value = [...PRESETS[name].k]
}
function edit(i: number, v: string) {
  const n = Number(v.replace(',', '.'))
  if (Number.isFinite(n)) {
    kernel.value[i] = n
    preset.value = ''
  }
}

const img = computed(() => (data.digits as Record<string, number[]>)[digit.value])

/** Карта ознак: ядро 3 × 3, крок і доповнення — як на сусідніх картках. */
const featureMap = computed(() => {
  const src = img.value
  const P = pad.value ? 1 : 0
  const S = stride.value
  const size = Math.floor((28 + 2 * P - 3) / S) + 1
  const out: number[] = []
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      let s = 0
      for (let a = 0; a < 3; a++) {
        for (let b = 0; b < 3; b++) {
          const y = i * S + a - P
          const x = j * S + b - P
          if (y >= 0 && y < 28 && x >= 0 && x < 28) s += src[y * 28 + x] * kernel.value[a * 3 + b]
        }
      }
      out.push(s)
    }
  }
  return { size, out }
})

const range = computed(() => {
  const m = Math.max(1, ...featureMap.value.out.map(Math.abs))
  return m
})

/** Вхід — сірий, вихід — синьо-червоний: знак відгуку має бути видно. */
const gray = (v: number) => {
  const g = Math.round(255 - Math.max(0, Math.min(255, v)))
  return `rgb(${g},${g},${g})`
}
const signed = (v: number) => {
  const t = Math.max(-1, Math.min(1, v / range.value))
  return t >= 0
    ? `rgba(47,109,181,${(t * 0.92).toFixed(3)})`
    : `rgba(179,49,44,${(-t * 0.92).toFixed(3)})`
}

const outSize = computed(() => featureMap.value.size)
const weights = computed(() => kernel.value.reduce((a, b) => a + Math.abs(b), 0))
</script>

<template>
  <div class="lab">
    <div class="lab__head">
      <div>
        <div class="lab__title">Фільтр, який ви задаєте самі</div>
        <div class="lab__sub">
          Ліворуч — справжня цифра MNIST, 28 × 28 пікселів. Праворуч — карта ознак:
          ядро проходить по кожній позиції й рахує суму добутків. Синє означає
          додатний відгук, червоне — від'ємний, білі ділянки фільтр не помітив.
        </div>
      </div>
    </div>

    <div class="lab__pills">
      <button v-for="(v, name) in PRESETS" :key="name" class="lab__pill"
              :class="{ 'is-on': preset === name }" @click="apply(name as string)">
        {{ name }}
      </button>
    </div>

    <div class="cv__grid">
      <figure class="cv__panel">
        <figcaption>вхід 28 × 28</figcaption>
        <svg viewBox="0 0 28 28" class="cv__img">
          <rect v-for="(v, p) in img" :key="p" :x="p % 28" :y="Math.floor(p / 28)"
                width="1" height="1" :fill="gray(v)" />
        </svg>
      </figure>

      <div class="cv__kernel">
        <div class="cv__cap">ядро 3 × 3</div>
        <div class="cv__k">
          <input v-for="(v, i) in kernel" :key="i" :value="v" inputmode="decimal"
                 @input="edit(i, ($event.target as HTMLInputElement).value)" />
        </div>
        <p class="cv__hint">{{ preset ? PRESETS[preset].hint : 'ваше власне ядро' }}</p>
      </div>

      <figure class="cv__panel">
        <figcaption>карта ознак {{ outSize }} × {{ outSize }}</figcaption>
        <svg :viewBox="`0 0 ${outSize} ${outSize}`" class="cv__img">
          <rect v-for="(v, p) in featureMap.out" :key="p"
                :x="p % outSize" :y="Math.floor(p / outSize)"
                width="1" height="1" :fill="signed(v)" />
        </svg>
      </figure>
    </div>

    <div class="lab__controls">
      <label class="lab__ctl">
        <span>Цифра</span>
        <select v-model="digit">
          <option v-for="c in Object.keys(data.digits)" :key="c" :value="c">{{ c }}</option>
        </select>
      </label>
      <label class="lab__ctl">
        <span>Крок S = <b>{{ stride }}</b></span>
        <input type="range" min="1" max="4" step="1" v-model.number="stride" />
      </label>
      <div class="lab__ctl">
        <span>Доповнення нулями</span>
        <button class="lab__btn" @click="pad = !pad">{{ pad ? 'увімкнено (same)' : 'вимкнено (valid)' }}</button>
      </div>
    </div>

    <div class="lab__stats">
      <div class="lab__stat"><b>{{ outSize }} × {{ outSize }}</b><span>розмір карти ознак</span></div>
      <div class="lab__stat"><b>9 + 1</b><span>ваг у ядрі, разом зі зсувом</span></div>
      <div class="lab__stat is-green"><b>{{ 784 }}</b><span>позицій, де працюють ті самі 9 ваг</span></div>
    </div>

    <p class="lab__note">
      Перевірте формулу розміру виходу самі: при доповненні й кроці 1 карта
      лишається 28 × 28, при кроці 2 стає 14 × 14, а без доповнення втрачає по
      пікселю з кожного боку. Порівняйте «вертикальні краї» з «горизонтальними»:
      це те саме ядро, повернуте на 90°, і воно бачить зовсім інші частини цифри.
      «Тотожність» повертає вхід без змін — корисна перевірка, що механіка чесна.
      А головне: скільки б не було позицій, ваг завжди дев'ять — саме на цьому
      тримається вся економія згорткового шару.
    </p>
  </div>
</template>

<style scoped>
.cv__grid {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 1rem;
  align-items: center;
  margin: 0.4rem 0 0.8rem;
}
@media (max-width: 620px) { .cv__grid { grid-template-columns: 1fr; } }

.cv__panel { margin: 0; text-align: center; }
.cv__panel figcaption {
  font-size: 0.75rem;
  color: var(--vp-c-text-3);
  margin-bottom: 0.3rem;
}
.cv__img {
  width: 100%;
  max-width: 210px;
  height: auto;
  border: 1px solid var(--uk-line);
  border-radius: 6px;
  background: #fff;
  image-rendering: pixelated;
}
.cv__cap { font-size: 0.75rem; color: var(--vp-c-text-3); margin-bottom: 0.3rem; text-align: center; }
.cv__k {
  display: grid;
  grid-template-columns: repeat(3, 2.5rem);
  gap: 3px;
  justify-content: center;
}
.cv__k input {
  width: 2.5rem;
  padding: 0.3rem 0.1rem;
  text-align: center;
  font-family: var(--vp-font-family-mono);
  font-size: 0.82rem;
  border: 1px solid var(--uk-line);
  border-radius: 5px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
}
.cv__k input:focus { outline: none; border-color: var(--uk-accent); }
.cv__hint {
  font-size: 0.75rem;
  line-height: 1.4;
  color: var(--vp-c-text-3);
  text-align: center;
  margin: 0.5rem 0 0;
  max-width: 12rem;
}
.lab__ctl select {
  width: auto;
  min-width: 5rem;
}
</style>
