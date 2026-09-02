<script setup lang="ts">
/**
 * Шляхи коефіцієнтів ridge і lasso — ті самі, що на рисунку: 500 районів
 * California Housing, вісім стандартизованих ознак, сітка λ така сама.
 * Числа розділу відтворюються: при λ ≈ 0,074 lasso лишає рівно чотири ознаки —
 * медіанний дохід, вік забудови, кімнати на житло і мешканці на житло.
 */
import { ref, computed } from 'vue'
import paths from '../../data/lec03_paths.json'

type Kind = 'ridge' | 'lasso'
const kind = ref<Kind>('lasso')
const i = ref(0)

const P = computed(() => paths[kind.value])
const lam = computed(() => P.value.lam[i.value])
const coef = computed(() => P.value.coef[i.value] as number[])
const nz = computed(() => coef.value.filter(v => Math.abs(v) > 1e-8).length)

/** Найбільша вага по всій сітці — щоб масштаб стовпчиків не стрибав. */
const maxAbs = computed(() =>
  Math.max(...P.value.coef.flat().map(Math.abs)))

const best = computed(() => {
  const t = P.value.test as number[]
  return t.indexOf(Math.min(...t))
})

function setKind(k: Kind) {
  kind.value = k
  i.value = Math.min(i.value, paths[k].lam.length - 1)
}

const fmtL = (v: number) =>
  (v >= 1000 ? v.toExponential(0) : v >= 1 ? v.toFixed(1) : v.toFixed(4)).replace('.', ',')
const fmt = (v: number) => v.toFixed(3).replace('.', ',')
/** Вісім розрізнюваних кольорів: базова палітра курсу плюс два світліші відтінки
    для широти й довготи, які на графіку йдуть поруч. */
const COL = ['#2F6DB5', '#C2571A', '#1E8E6A', '#6B4C9A',
             '#8A8A96', '#B3312C', '#4E9CD8', '#E08A4B']
</script>

<template>
  <div class="lab">
    <div class="lab__head">
      <div>
        <div class="lab__title">Що робить λ з вагами</div>
        <div class="lab__sub">
          Ті самі дані, що на рисунку: 500 районів California Housing, вісім
          стандартизованих ознак. Посуньте λ — і побачите різницю між двома штрафами
          на тих самих вагах.
        </div>
      </div>
    </div>

    <div class="lab__pills">
      <button class="lab__pill" :class="{ 'is-on': kind === 'ridge' }" @click="setKind('ridge')">
        ridge — штраф за квадрат норми
      </button>
      <button class="lab__pill" :class="{ 'is-on': kind === 'lasso' }" @click="setKind('lasso')">
        lasso — штраф за суму модулів
      </button>
    </div>

    <label class="lab__ctl rg__slider">
      <span>λ = <b>{{ fmtL(lam) }}</b></span>
      <input type="range" min="0" :max="P.lam.length - 1" step="1" v-model.number="i" />
    </label>

    <div class="rg__bars">
      <div v-for="(n, k) in paths.names" :key="n" class="rg__row">
        <span class="rg__name" :class="{ 'is-off': Math.abs(coef[k]) <= 1e-8 }">{{ n }}</span>
        <div class="rg__track">
          <i class="rg__zero" />
          <i class="rg__bar"
             :style="{
               background: COL[k],
               left: coef[k] >= 0 ? '50%' : `${50 - (Math.abs(coef[k]) / maxAbs) * 50}%`,
               width: `${(Math.abs(coef[k]) / maxAbs) * 50}%`
             }" />
        </div>
        <span class="rg__val" :class="{ 'is-off': Math.abs(coef[k]) <= 1e-8 }">{{ fmt(coef[k]) }}</span>
      </div>
    </div>

    <div class="lab__stats">
      <div class="lab__stat" :class="nz < 8 ? 'is-warm' : ''">
        <b>{{ nz }} / 8</b><span>ознак лишилося в моделі</span>
      </div>
      <div class="lab__stat"><b>{{ fmt(P.train[i]) }}</b><span>RMSE на навчальних</span></div>
      <div class="lab__stat" :class="i === best ? 'is-green' : ''">
        <b>{{ fmt(P.test[i]) }}</b><span>RMSE на 5000 відкладених</span>
      </div>
      <button class="lab__stat rg__jump" @click="i = best">
        <b>{{ fmtL(P.lam[best]) }}</b><span>найкраще λ — натисніть, щоб перейти</span>
      </button>
    </div>

    <p class="lab__note">
      Ridge стискає всі вісім ваг плавно, але жодна не стає нулем навіть при
      λ = 100 000 — ознак завжди лишається вісім. Lasso вимикає їх по черзі:
      спочатку населення району, далі спальні на житло, потім широта й довгота.
      При λ ≈ 0,074 в моделі лишаються рівно чотири ознаки. Зверніть увагу на
      широту й довготу: їхні ваги майже однакові за модулем і зникають поруч — це
      слід географії, який модель не може розділити на два окремі впливи.
      Діапазони λ на двох штрафах різні, бо <code>Ridge</code> у scikit-learn
      штрафує без ділення на N, а <code>Lasso</code> — з ним.
    </p>
  </div>
</template>

<style scoped>
.rg__slider { display: block; margin-bottom: 1.1rem; }
.rg__bars { display: flex; flex-direction: column; gap: 0.3rem; }
.rg__row { display: grid; grid-template-columns: 10.5rem 1fr 3.6rem; align-items: center; gap: 0.6rem; }
@media (max-width: 620px) { .rg__row { grid-template-columns: 7.5rem 1fr 3.2rem; } }

.rg__name { font-size: 0.82rem; color: var(--vp-c-text-2); text-align: right; }
.rg__name.is-off, .rg__val.is-off { color: var(--vp-c-text-3); opacity: 0.45; }
.rg__track { position: relative; height: 15px; background: var(--uk-fill); border-radius: 4px; }
.rg__zero {
  position: absolute; left: 50%; top: 0; bottom: 0;
  width: 1px; background: var(--uk-line);
}
.rg__bar {
  position: absolute; top: 2px; bottom: 2px;
  border-radius: 3px;
  transition: width 0.2s ease, left 0.2s ease;
}
.rg__val {
  font-family: var(--vp-font-family-mono);
  font-size: 0.75rem;
  text-align: right;
  color: var(--vp-c-text-2);
  font-variant-numeric: tabular-nums;
}
.rg__jump {
  border: 1px solid var(--uk-line);
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
  font-family: inherit;
}
.rg__jump:hover { border-color: var(--uk-accent); }
</style>
