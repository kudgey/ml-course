<script setup lang="ts">
/**
 * Реконструкція цифр із K головних компонент — та сама вісімка цифр, що на
 * рис. 10. Відновлення рахується тут-таки за формулою з розділу: zₙW плюс вектор середніх.
 * Числа розділу 3.2 відтворюються: K = 2 → 28,5 %, K = 8 → 67,4 %, K = 16 → 84,9 %,
 * K = 21 → 90,3 %, K = 32 → 96,6 % поясненої дисперсії. Дані — tools/gen_lec09_widgets.py.
 */
import { ref, computed } from 'vue'
import pca from '../../data/lec09_pca.json'

const K = ref(8)
const MEAN = pca.mean as number[]
const COMP = pca.comp as number[][]
const Z = pca.z as number[][]
const ORIG = pca.orig as number[][]

/** x̂ = z[:K] · W[:K] + x̄ — рівно та формула, що в розділі. */
const recon = computed(() =>
  Z.map(z => {
    const out = [...MEAN]
    for (let k = 0; k < K.value; k++) {
      const zk = z[k], w = COMP[k]
      for (let p = 0; p < 64; p++) out[p] += zk * w[p]
    }
    return out
  })
)

const evr = computed(() => pca.evr[K.value - 1])
const ratio = computed(() => 64 / K.value)

/** 0…16 у відтінок сірого, як у matplotlib gray_r: більше — темніше. */
const shade = (v: number) => {
  const t = Math.max(0, Math.min(1, v / 16))
  const g = Math.round(255 - t * 255)
  return `rgb(${g},${g},${g})`
}

const PRESETS = [2, 8, 16, 21, 32]
const pct = (v: number) => (v * 100).toFixed(1).replace('.', ',') + ' %'
</script>

<template>
  <div class="lab">
    <div class="lab__head">
      <div>
        <div class="lab__title">Скільки чисел треба, щоб цифра лишилася цифрою</div>
        <div class="lab__sub">
          Ті самі вісім цифр, що на рис. 10. Верхній ряд — оригінал у 64 пікселі,
          нижній — відновлення з K чисел: zₙW плюс вектор середніх. Обчислюється просто
          тут: посуньте K і дивіться, коли цифра стає впізнаваною.
        </div>
      </div>
    </div>

    <div class="lab__pills">
      <button v-for="p in PRESETS" :key="p" class="lab__pill"
              :class="{ 'is-on': K === p }" @click="K = p">
        K = {{ p }}
      </button>
    </div>

    <label class="lab__ctl pc__slider">
      <span>Компонент K = <b>{{ K }}</b> із 64</span>
      <input type="range" min="1" max="32" step="1" v-model.number="K" />
    </label>

    <div class="pc__rows">
      <div class="pc__label">оригінал<br /><i>64 числа</i></div>
      <div class="pc__strip">
        <svg v-for="(img, n) in ORIG" :key="'o' + n" viewBox="0 0 8 8" class="pc__img">
          <rect v-for="(v, p) in img" :key="p" :x="p % 8" :y="Math.floor(p / 8)"
                width="1" height="1" :fill="shade(v)" />
        </svg>
      </div>

      <div class="pc__label">відновлено<br /><i>{{ K }} {{ K === 1 ? 'число' : K < 5 ? 'числа' : 'чисел' }}</i></div>
      <div class="pc__strip">
        <svg v-for="(img, n) in recon" :key="'r' + n" viewBox="0 0 8 8" class="pc__img">
          <rect v-for="(v, p) in img" :key="p" :x="p % 8" :y="Math.floor(p / 8)"
                width="1" height="1" :fill="shade(v)" />
        </svg>
      </div>
    </div>

    <div class="lab__stats">
      <div class="lab__stat"><b>{{ pct(evr) }}</b><span>поясненої дисперсії</span></div>
      <div class="lab__stat is-green"><b>{{ ratio.toFixed(1).replace('.', ',') }}×</b><span>стиснення обсягу</span></div>
      <div class="lab__stat"><b>{{ K }} / 64</b><span>чисел на зображення</span></div>
    </div>

    <p class="lab__note">
      Дві компоненти (28,5 %) дають розмиту пляму. Вісім (67,4 %) — упізнавані цифри без
      деталей. Двадцять одна (90,3 %) — значення кроку 3. При малих K пікселі можуть
      виходити за межі шкали 0–16: відновлення не зобов'язане лишатися в діапазоні яскравості.
    </p>
  </div>
</template>

<style scoped>
.pc__slider { display: block; margin-bottom: 1.1rem; }
.pc__rows {
  display: grid;
  grid-template-columns: 5.5rem 1fr;
  gap: 0.5rem 0.8rem;
  align-items: center;
}
.pc__label {
  font-size: 0.78rem;
  color: var(--vp-c-text-2);
  text-align: right;
  line-height: 1.35;
}
.pc__label i {
  font-style: normal;
  font-size: 0.7rem;
  color: var(--vp-c-text-3);
}
.pc__strip { display: flex; gap: 0.4rem; flex-wrap: wrap; }
.pc__img {
  width: 100%;
  max-width: 62px;
  flex: 1 1 42px;
  height: auto;
  border-radius: 4px;
  border: 1px solid var(--uk-line);
  background: #fff;
  image-rendering: pixelated;
}
</style>
