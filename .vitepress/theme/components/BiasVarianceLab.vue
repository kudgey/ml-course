<script setup lang="ts">
/**
 * Розклад помилки на три доданки — ті самі числа, що в розділі: справжня
 * функція sin(2πx), шум 0,25, чотириста вибірок, ступені 1…12. При 25 точках
 * зміщення² 0,153 на першому ступені, 0,0001 на п'ятому; дисперсія 0,021,
 * 0,086 на шостому і 2742 на дванадцятому; мінімум суми — на третьому.
 *
 * Другий повзунок міняє розмір навчальної вибірки. Дані для всіх п'яти
 * розмірів пораховано tools/gen_lec03_bv.py тим самим експериментом, що й
 * рисунок 03_08, тож числа при 25 точках збігаються з опублікованими точно.
 */
import { ref, computed } from 'vue'
import d from '../../data/lec03_bv.json'

type Block = {
  avg: Record<string, number[]>
  spread: Record<string, number[][]>
  bias2: Record<string, number>
  var: Record<string, number>
}

const deg = ref(3)
const showAll = ref(true)
const SIZES = d.sizes as string[]
const size = ref('25')

const X = d.x as number[]
const TRUE = d.true as number[]
const cur = computed(() => (d.by_size as Record<string, Block>)[size.value])
const avg = computed(() => cur.value.avg[String(deg.value)])
const fits = computed(() => cur.value.spread[String(deg.value)])
const bias2 = computed(() => cur.value.bias2[String(deg.value)])
const vari = computed(() => cur.value.var[String(deg.value)])
const total = computed(() => bias2.value + vari.value + d.noise)

/** Ступінь із найменшою сумою трьох доданків — для поточного розміру вибірки. */
const bestOf = (b: Block) => Object.keys(b.bias2)
  .map(k => ({ k: Number(k), v: b.bias2[k] + b.var[k] + d.noise }))
  .reduce((a, c) => (c.v < a.v ? c : a)).k

const best = computed(() => bestOf(cur.value))

/** Як оптимальний ступінь росте з обсягом даних — підпис під повзунком. */
const bestBySize = computed(() =>
  SIZES.map(n => `${n} → ${bestOf((d.by_size as Record<string, Block>)[n])}`).join(' · '))

/** Ліва панель. Межі по y тримаємо сталими: інакше при ступені 12 графік
    схлопується і порівнювати ступені стає неможливо. */
const W = 300, H = 220, PAD = 26
const YLO = -2, YHI = 2
const sx = (x: number) => PAD + ((x - X[0]) / (X[X.length - 1] - X[0])) * (W - 2 * PAD)
const sy = (y: number) => H - PAD - ((Math.max(YLO, Math.min(YHI, y)) - YLO) / (YHI - YLO)) * (H - 2 * PAD)
const line = (ys: number[]) => ys.map((y, i) => `${sx(X[i]).toFixed(1)},${sy(y).toFixed(1)}`).join(' ')

/** Права панель: три доданки в логарифмічному масштабі — інакше 2742 поруч
    із 0,0001 не поміщаються на одній осі. Верхня межа йде за даними: при
    п'ятнадцяти точках дисперсія високих ступенів сягає 10¹¹, і фіксована
    шкала просто виштовхнула б стовпчик за край картинки. */
const BW = 300, BH = 220, BP = 30
const lg = (v: number) => Math.log10(Math.max(v, 1e-5))
const LO = -5
const HI = computed(() => Math.max(4, Math.ceil(lg(
  Math.max(...Object.values(cur.value.var), ...Object.values(cur.value.bias2))))))
const by = (v: number) => BH - BP - ((lg(v) - LO) / (HI.value - LO)) * (BH - 2 * BP)
const decades = computed(() => {
  const step = HI.value - LO > 10 ? 3 : 1
  const out: number[] = []
  for (let p = LO + 1; p <= HI.value; p += step) out.push(p)
  return out
})
const bars = computed(() => [
  { name: 'зміщення²', v: bias2.value, color: '#2F6DB5' },
  { name: 'дисперсія', v: vari.value, color: '#C2571A' },
  { name: 'шум σ²', v: d.noise, color: '#8A8A96' }
])

const fmt = (v: number) =>
  v >= 100 ? Math.round(v).toString()
    : v >= 1 ? v.toFixed(2).replace('.', ',')
    : v.toFixed(v < 0.001 ? 5 : 4).replace('.', ',')
</script>

<template>
  <div class="lab">
    <div class="lab__head">
      <div>
        <div class="lab__title">Три доданки на одному повзунку</div>
        <div class="lab__sub">
          Ті самі числа, що на рисунку: справжня функція sin(2πx), шум 0,25,
          {{ d.nsets }} незалежних вибірок по {{ size }} точок. Ліворуч —
          шість підгонок із різних вибірок і їхнє середнє; праворуч — розклад
          помилки в логарифмічному масштабі.
        </div>
      </div>
    </div>

    <div class="lab__pills">
      <button v-for="p in [1, 3, 5, 9, 12]" :key="p" class="lab__pill"
              :class="{ 'is-on': deg === p }" @click="deg = p">ступінь {{ p }}</button>
      <button class="lab__pill" :class="{ 'is-on': showAll }" @click="showAll = !showAll">
        показати окремі підгонки
      </button>
    </div>

    <div class="bv__grid">
      <figure class="bv__panel">
        <figcaption>моделі з різних вибірок</figcaption>
        <svg :viewBox="`0 0 ${W} ${H}`" role="img" aria-label="Підгонки різних ступенів">
          <line :x1="PAD" :y1="sy(0)" :x2="W - PAD" :y2="sy(0)" class="bv__axis" />
          <g v-if="showAll" clip-path="url(#bv-clip)">
            <polyline v-for="(f, i) in fits" :key="i" :points="line(f)" class="bv__fit" />
          </g>
          <polyline :points="line(TRUE)" class="bv__true" />
          <polyline :points="line(avg)" class="bv__avg" />
          <defs>
            <clipPath id="bv-clip">
              <rect :x="PAD - 2" :y="PAD - 6" :width="W - 2 * PAD + 4" :height="H - 2 * PAD + 12" />
            </clipPath>
          </defs>
        </svg>
        <div class="bv__legend">
          <span><i class="is-true" />справжня</span>
          <span><i class="is-avg" />середня модель</span>
          <span v-if="showAll"><i class="is-fit" />окремі підгонки</span>
        </div>
      </figure>

      <figure class="bv__panel">
        <figcaption>розклад помилки, логарифмічна шкала до 10<sup>{{ HI }}</sup></figcaption>
        <svg :viewBox="`0 0 ${BW} ${BH}`" role="img" aria-label="Три доданки помилки">
          <g v-for="p in decades" :key="p">
            <line :x1="BP" :y1="by(Math.pow(10, p))" :x2="BW - BP" :y2="by(Math.pow(10, p))" class="bv__grid-l" />
            <text :x="BP - 4" :y="by(Math.pow(10, p)) + 3" class="bv__lbl" text-anchor="end">
              10<tspan dy="-4" font-size="7">{{ p }}</tspan>
            </text>
          </g>
          <g v-for="(b, i) in bars" :key="b.name">
            <rect :x="BP + 14 + i * 82" :y="by(b.v)" width="52"
                  :height="Math.max(1, BH - BP - by(b.v))" :fill="b.color" opacity="0.85" />
            <text :x="BP + 40 + i * 82" :y="BH - BP + 13" class="bv__lbl" text-anchor="middle">{{ b.name }}</text>
          </g>
        </svg>
      </figure>
    </div>

    <label class="lab__ctl bv__slider">
      <span>Ступінь полінома: <b>{{ deg }}</b></span>
      <input type="range" min="1" max="12" step="1" v-model.number="deg" />
    </label>

    <div class="bv__sizes">
      <span class="bv__sizes-lbl">Точок у навчальній вибірці:</span>
      <button v-for="n in SIZES" :key="n" class="lab__pill"
              :class="{ 'is-on': size === n }" @click="size = n">{{ n }}</button>
    </div>

    <div class="lab__stats">
      <div class="lab__stat"><b>{{ fmt(bias2) }}</b><span>зміщення²</span></div>
      <div class="lab__stat is-warm"><b>{{ fmt(vari) }}</b><span>дисперсія</span></div>
      <div class="lab__stat"><b>{{ fmt(d.noise) }}</b><span>шум σ² — підлога</span></div>
      <div class="lab__stat" :class="deg === best ? 'is-green' : ''">
        <b>{{ fmt(total) }}</b><span>сума{{ deg === best ? ' — мінімум' : '' }}</span>
      </div>
      <div class="lab__stat is-green">
        <b>{{ best }}</b><span>найкращий ступінь при {{ size }} точках</span>
      </div>
    </div>

    <p class="lab__note">
      При 25 точках на першому ступені всі шість підгонок майже збігаються —
      дисперсія мала, 0,021, — але жодна не схожа на синус: зміщення² дорівнює
      0,153. На п'ятому зміщення падає до 0,0001, бо клас моделей уже достатньо
      багатий. Далі починається розплата: дисперсія 0,086 на шостому ступені й
      2742 на дванадцятому, де підгонки розлітаються за межі графіка. Мінімум
      суми — на третьому ступені, 0,076. Сірий стовпчик шуму не рухається
      взагалі: це підлога, нижче якої не опуститься жодна модель, бо шум не
      залежить від даних.
    </p>

    <p class="lab__note">
      Тепер перемкніть розмір вибірки. Зміщення² від нього майже не залежить —
      це властивість класу моделей, а не даних, — зате дисперсія падає з кожною
      доданою точкою: на дев'ятому ступені це 155&nbsp;243 при 15 точках,
      14,6 при 25, 0,017 при 50 і 0,005 при 100. Разом із нею відсувається межа
      складності, яку дані здатні прогодувати: найкращий ступінь
      {{ bestBySize }}. Питання «яка модель складна занадто» не має відповіді
      у відриві від того, скільки в нас спостережень.
    </p>

    <p class="lab__note">
      На п'ятнадцяти точках варто зупинитися окремо. Рисунок вище в цій-таки
      лекції показує поліном дев'ятого ступеня на 15 точках із помилкою 0,39 —
      крива хоч і вигинається, але виглядає пристойно. Тут же дисперсія на тому
      самому ступені дорівнює шестизначному числу. Суперечності немає: на
      рисунку одна конкретна вибірка, якій пощастило, а тут — середнє за
      чотирмастами. Час від часу точки лягають так, що поліном іде у стелю, і
      саме ці рідкісні випадки дають майже весь внесок у дисперсію. У цьому й
      полягає сенс доданка: він міряє не те, як модель поводиться на ваших
      даних, а те, наскільки по-різному вона повелася б на інших даних із того
      самого джерела. Одна вдала вибірка про це не говорить нічого.
    </p>
  </div>
</template>

<style scoped>
.bv__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(270px, 1fr));
  gap: 1rem;
  margin: 0.4rem 0 0.8rem;
}
.bv__panel { margin: 0; }
.bv__panel figcaption {
  font-size: 0.75rem;
  color: var(--vp-c-text-3);
  margin-bottom: 0.3rem;
  text-align: center;
}
.bv__panel svg {
  width: 100%;
  height: auto;
  display: block;
  border: 1px solid var(--uk-line);
  border-radius: 8px;
  background: var(--vp-c-bg);
}
.bv__axis { stroke: var(--uk-line); stroke-width: 1; }
.bv__grid-l { stroke: var(--uk-line); stroke-width: 0.6; opacity: 0.5; }
.bv__fit { fill: none; stroke: var(--uk-warm); stroke-width: 1; opacity: 0.45; }
.bv__true { fill: none; stroke: var(--vp-c-text-1); stroke-width: 2; stroke-dasharray: 5 3; }
.bv__avg { fill: none; stroke: var(--uk-green); stroke-width: 2.2; }
.bv__lbl { fill: var(--vp-c-text-3); font-size: 9px; }
.bv__legend {
  display: flex;
  gap: 0.8rem;
  justify-content: center;
  flex-wrap: wrap;
  font-size: 0.72rem;
  color: var(--vp-c-text-3);
  margin-top: 0.3rem;
}
.bv__legend i {
  display: inline-block;
  width: 14px; height: 2px;
  margin-right: 0.3rem;
  vertical-align: middle;
}
.bv__legend i.is-true { background: var(--vp-c-text-1); }
.bv__legend i.is-avg { background: var(--uk-green); }
.bv__legend i.is-fit { background: var(--uk-warm); opacity: 0.5; }
.bv__slider { display: block; margin-bottom: 0.3rem; }
.bv__sizes {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-bottom: 0.6rem;
}
.bv__sizes-lbl { font-size: 0.8rem; color: var(--vp-c-text-2); margin-right: 0.2rem; }
</style>
