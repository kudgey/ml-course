<script setup lang="ts">
/**
 * Аналогії у просторі слів на справжніх векторах GloVe (wiki-gigaword-50),
 * тих самих, що завантажує код лекції. Арифметика рахується просто тут:
 * v = E[b] − E[a] + E[c], далі косинус із рештою словника.
 * Число слайда відтворюється: man : king = woman : queen зі схожістю 0,852.
 */
import { ref, computed } from 'vue'
import g from '../../data/lec13_glove.json'

const WORDS = g.words as string[]
const E = g.vecs as number[][]
const idx = Object.fromEntries(WORDS.map((w, i) => [w, i]))

const a = ref('man')
const b = ref('king')
const c = ref('woman')

const PRESETS = [
  { a: 'man', b: 'king', c: 'woman', what: 'стать' },
  { a: 'france', b: 'paris', c: 'italy', what: 'столиця країни' },
  { a: 'good', b: 'better', c: 'bad', what: 'ступінь порівняння' },
  { a: 'walk', b: 'walked', c: 'go', what: 'минулий час' },
  { a: 'cat', b: 'dog', c: 'car', what: 'аналогії немає' }
]

function cos(u: number[], v: number[]) {
  let s = 0, nu = 0, nv = 0
  for (let i = 0; i < u.length; i++) { s += u[i] * v[i]; nu += u[i] * u[i]; nv += v[i] * v[i] }
  return s / (Math.sqrt(nu) * Math.sqrt(nv) || 1)
}

/** a : b = c : ? — саме та формула, що в коді лекції. */
const answers = computed(() => {
  const ia = idx[a.value], ib = idx[b.value], ic = idx[c.value]
  if (ia === undefined || ib === undefined || ic === undefined) return []
  const v = E[ib].map((x, i) => x - E[ia][i] + E[ic][i])
  return WORDS
    .map((w, i) => ({ w, s: cos(v, E[i]) }))
    .filter(r => r.w !== a.value && r.w !== b.value && r.w !== c.value)
    .sort((x, y) => y.s - x.s)
    .slice(0, 5)
})

/** Пряма схожість двох слів — без жодної арифметики, для порівняння. */
const pairSim = computed(() => cos(E[idx[a.value]], E[idx[b.value]]))

const fmt = (v: number) => v.toFixed(3).replace('.', ',')
const bar = (v: number) => `${Math.max(0, Math.min(100, v * 100)).toFixed(1)}%`
</script>

<template>
  <div class="lab">
    <div class="lab__head">
      <div>
        <div class="lab__title">Арифметика у просторі слів</div>
        <div class="lab__sub">
          Справжні вектори GloVe (50 вимірів), ті самі, що вантажить код лекції.
          Обчислення просте: <code>v = вектор(b) − вектор(a) + вектор(c)</code>,
          далі шукаємо найближче слово за косинусом. Словник тут скорочено до 80 слів,
          щоб усе рахувалося миттєво.
        </div>
      </div>
    </div>

    <div class="lab__pills">
      <button v-for="p in PRESETS" :key="p.what" class="lab__pill"
              :class="{ 'is-on': a === p.a && b === p.b && c === p.c }"
              @click="a = p.a; b = p.b; c = p.c">
        {{ p.what }}
      </button>
    </div>

    <div class="wv__eq">
      <select v-model="a"><option v-for="w in WORDS" :key="w">{{ w }}</option></select>
      <span class="wv__op">:</span>
      <select v-model="b"><option v-for="w in WORDS" :key="w">{{ w }}</option></select>
      <span class="wv__op">=</span>
      <select v-model="c"><option v-for="w in WORDS" :key="w">{{ w }}</option></select>
      <span class="wv__op">:</span>
      <span class="wv__ans">{{ answers[0]?.w ?? '—' }}</span>
    </div>

    <div class="wv__list">
      <div v-for="(r, i) in answers" :key="r.w" class="lab__row">
        <code class="wv__w" :class="{ 'is-top': i === 0 }">{{ r.w }}</code>
        <div class="lab__bar"><i :style="{ width: bar(r.s), background: i === 0 ? 'var(--uk-accent)' : 'var(--uk-line)' }" /></div>
        <span class="lab__num">{{ fmt(r.s) }}</span>
      </div>
    </div>

    <div class="lab__stats">
      <div class="lab__stat"><b>{{ fmt(answers[0]?.s ?? 0) }}</b><span>схожість найкращої відповіді</span></div>
      <div class="lab__stat"><b>{{ fmt(pairSim) }}</b><span>пряма схожість «{{ a }}» і «{{ b }}»</span></div>
      <div class="lab__stat"><b>50</b><span>вимірів на слово</span></div>
    </div>

    <p class="lab__note">
      Класичний приклад працює: <b>man : king = woman : queen</b> зі схожістю 0,852 —
      те саме число друкує код лекції. Так само знаходяться столиці й ступені
      порівняння: напрямок «країна → столиця» у цьому просторі один і той самий
      для Франції та Італії. Але візьміть останню кнопку — <b>cat : dog = car : ?</b> —
      і відповідь буде беззмістовною, хоча схожість лишиться високою. Це і є межа
      методу: модель завжди повертає найближче слово, а чи існує сама аналогія,
      вона не перевіряє.
    </p>
  </div>
</template>

<style scoped>
.wv__eq {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
}
.wv__eq select {
  font-family: var(--vp-font-family-mono);
  font-size: 0.86rem;
  padding: 0.3rem 0.4rem;
  border: 1px solid var(--uk-line);
  border-radius: 6px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
}
.wv__eq select:focus { outline: none; border-color: var(--uk-accent); }
.wv__op { color: var(--vp-c-text-3); font-size: 1rem; }
.wv__ans {
  font-family: var(--vp-font-family-mono);
  font-size: 1rem;
  font-weight: 600;
  color: var(--uk-accent);
  padding: 0.2rem 0.55rem;
  border: 1px solid var(--uk-accent);
  border-radius: 6px;
  background: var(--uk-accent-soft);
}
.wv__list { display: flex; flex-direction: column; gap: 0.1rem; }
.wv__w { min-width: 6.5rem; }
.wv__w.is-top { color: var(--uk-accent); font-weight: 600; }
</style>
