<script setup lang="ts">
/**
 * Прямий процес дифузії на справжній цифрі MNIST, рахується за формулою
 * зі слайда: x_t = α^t · x_0 + sqrt(1 − α^{2t}) · ξ. Видно обидві половини
 * рівняння окремо: як згасає сигнал і як накопичується шум.
 */
import { ref, computed } from 'vue'
import data from '../../data/lec11_digits.json'

const digit = ref('3')
const t = ref(0)
const alpha = ref(0.95)
const seed = ref(7)

const TMAX = 120

/** Відтворюваний шум: та сама картинка на будь-якій машині. */
function noise(n: number, s: number) {
  let v = s * 16807 % 2147483647
  const out: number[] = []
  for (let i = 0; i < n; i++) {
    // Box–Muller із лінійного конгруентного генератора
    v = (v * 16807) % 2147483647
    const u1 = v / 2147483647
    v = (v * 16807) % 2147483647
    const u2 = v / 2147483647
    out.push(Math.sqrt(-2 * Math.log(u1 + 1e-12)) * Math.cos(2 * Math.PI * u2))
  }
  return out
}

const x0 = computed(() =>
  ((data.digits as Record<string, number[]>)[digit.value]).map(v => v / 255 * 2 - 1))
const xi = computed(() => noise(784, seed.value))

const signal = computed(() => Math.pow(alpha.value, t.value))
const noiseLevel = computed(() => Math.sqrt(Math.max(0, 1 - Math.pow(alpha.value, 2 * t.value))))

const xt = computed(() =>
  x0.value.map((v, i) => signal.value * v + noiseLevel.value * xi.value[i]))

/** Скільки початкової дисперсії ще лишилося в кадрі. */
const snr = computed(() => {
  const s = signal.value ** 2
  const n = noiseLevel.value ** 2
  return s / (s + n || 1)
})

const shade = (v: number) => {
  const g = Math.round(255 - Math.max(0, Math.min(1, (v + 1) / 2)) * 255)
  return `rgb(${g},${g},${g})`
}

const fmt = (v: number, d = 3) => v.toFixed(d).replace('.', ',')
const STEPS = [0, 10, 30, 60, 120]
</script>

<template>
  <div class="lab">
    <div class="lab__head">
      <div>
        <div class="lab__title">Як цифра перетворюється на шум</div>
        <div class="lab__sub">
          Прямий процес рахується за формулою зі слайда, одним кроком із нуля:
          <code>x_t = α^t · x₀ + √(1 − α^2t) · ξ</code>. Ліворуч видно кожен доданок
          окремо, праворуч — їхню суму, тобто те, що бачить модель на кроці t.
        </div>
      </div>
    </div>

    <div class="lab__pills">
      <button v-for="s in STEPS" :key="s" class="lab__pill"
              :class="{ 'is-on': t === s }" @click="t = s">t = {{ s }}</button>
      <button class="lab__pill" @click="seed = (seed % 20) + 1">інший шум</button>
    </div>

    <div class="df__grid">
      <figure class="df__panel">
        <figcaption>сигнал: α<sup>t</sup> · x₀</figcaption>
        <svg viewBox="0 0 28 28" class="df__img">
          <rect v-for="(v, p) in x0" :key="p" :x="p % 28" :y="Math.floor(p / 28)"
                width="1" height="1" :fill="shade(v * signal)" />
        </svg>
        <span class="df__num">× {{ fmt(signal) }}</span>
      </figure>

      <div class="df__plus">+</div>

      <figure class="df__panel">
        <figcaption>шум: √(1−α<sup>2t</sup>) · ξ</figcaption>
        <svg viewBox="0 0 28 28" class="df__img">
          <rect v-for="(v, p) in xi" :key="p" :x="p % 28" :y="Math.floor(p / 28)"
                width="1" height="1" :fill="shade(v * noiseLevel)" />
        </svg>
        <span class="df__num">× {{ fmt(noiseLevel) }}</span>
      </figure>

      <div class="df__plus">=</div>

      <figure class="df__panel">
        <figcaption>x<sub>t</sub> — те, що бачить модель</figcaption>
        <svg viewBox="0 0 28 28" class="df__img is-result">
          <rect v-for="(v, p) in xt" :key="p" :x="p % 28" :y="Math.floor(p / 28)"
                width="1" height="1" :fill="shade(v)" />
        </svg>
        <span class="df__num">крок t = {{ t }}</span>
      </figure>
    </div>

    <div class="lab__controls">
      <label class="lab__ctl">
        <span>Крок t = <b>{{ t }}</b></span>
        <input type="range" min="0" :max="TMAX" step="1" v-model.number="t" />
      </label>
      <label class="lab__ctl">
        <span>Швидкість згасання α = <b>{{ fmt(alpha, 3) }}</b></span>
        <input type="range" min="0.9" max="0.995" step="0.005" v-model.number="alpha" />
      </label>
      <label class="lab__ctl">
        <span>Цифра</span>
        <select v-model="digit">
          <option v-for="c in Object.keys(data.digits)" :key="c" :value="c">{{ c }}</option>
        </select>
      </label>
    </div>

    <div class="lab__stats">
      <div class="lab__stat"><b>{{ fmt(signal) }}</b><span>частка сигналу α<sup>t</sup></span></div>
      <div class="lab__stat is-warm"><b>{{ fmt(noiseLevel) }}</b><span>рівень шуму</span></div>
      <div class="lab__stat" :class="snr < 0.05 ? 'is-warm' : snr > 0.5 ? 'is-green' : ''">
        <b>{{ fmt(snr * 100, 1) }} %</b><span>дисперсії ще від зображення</span>
      </div>
    </div>

    <p class="lab__note">
      Сигнал згасає як α<sup>t</sup>, шум накопичується — і сума завжди лишається
      з тією самою дисперсією, бо коефіцієнти підібрано так навмисно. Візьміть
      α = 0,9: цифра зникає за пару десятків кроків. Візьміть 0,995 — ланцюг
      доводиться тягнути в рази довше. Саме цей компроміс і задає розклад шуму в
      дифузійних моделях: чим повільніше руйнування, тим легше навчити зворотний
      крок, але тим дорожче семплування. Натисніть «інший шум» — картинка
      зміниться, а числа ні: вони залежать тільки від t і α.
    </p>
  </div>
</template>

<style scoped>
.df__grid {
  display: grid;
  grid-template-columns: 1fr auto 1fr auto 1fr;
  gap: 0.6rem;
  align-items: center;
  margin: 0.4rem 0 0.9rem;
}
@media (max-width: 700px) {
  .df__grid { grid-template-columns: 1fr; }
  .df__plus { display: none; }
}
.df__panel { margin: 0; text-align: center; }
.df__panel figcaption {
  font-size: 0.74rem;
  color: var(--vp-c-text-3);
  margin-bottom: 0.3rem;
  line-height: 1.3;
}
.df__img {
  width: 100%;
  max-width: 150px;
  height: auto;
  border: 1px solid var(--uk-line);
  border-radius: 6px;
  background: #fff;
  image-rendering: pixelated;
}
.df__img.is-result { border-color: var(--uk-accent); }
.df__num {
  display: block;
  font-family: var(--vp-font-family-mono);
  font-size: 0.75rem;
  color: var(--vp-c-text-3);
  margin-top: 0.25rem;
}
.df__plus {
  font-size: 1.3rem;
  color: var(--vp-c-text-3);
  text-align: center;
}
.lab__ctl select { width: auto; min-width: 5rem; }
</style>
