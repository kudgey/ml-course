<script setup lang="ts">
/**
 * Блок коду, згорнутий за замовчуванням (рішення користувача 25.09.2026):
 * видно, що робить код, скільки в ньому рядків і скільки він виконувався;
 * сам код відкривається кнопкою. Вивід (RunOutput) стоїть під ним і видний завжди.
 *
 * Перенесено з курсу IMD. У ML додано позначку «продовження»: лекція виконується
 * в одному інтерпретаторі, і такий блок спирається на змінні попередніх.
 */
import { ref } from 'vue'

const props = defineProps<{
  title: string
  lines?: number | string
  sec?: number | string
  fragment?: boolean
  cont?: boolean
}>()

const open = ref(false)
const fmtSec = (s: number | string | undefined) =>
  s === undefined || s === '' ? '' : Number(s) < 0.1 ? '< 0,1 с' : `${String(s).replace('.', ',')} с`
</script>

<template>
  <div class="cf" :class="{ 'is-open': open, 'is-fragment': props.fragment }">
    <button class="cf__head" type="button" :aria-expanded="open" @click="open = !open">
      <span class="cf__chev" aria-hidden="true">▸</span>
      <span class="cf__title">{{ props.title }}</span>
      <span class="cf__meta" :title="props.sec !== undefined && !props.fragment
          ? 'Час виконання в нашому прогоні, у спільному інтерпретаторі лекції: орієнтир, не бенчмарк' : undefined">
        <template v-if="props.fragment">фрагмент · </template>
        <template v-else-if="props.cont">продовження · </template>
        {{ props.lines }} рядків<template v-if="props.sec !== undefined && !props.fragment"> · {{ fmtSec(props.sec) }}</template>
      </span>
      <span class="cf__btn">{{ open ? 'Сховати код' : 'Показати код' }}</span>
    </button>
    <div v-show="open" class="cf__body">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.cf {
  margin: 1.4rem 0 0;
  border: 1px solid var(--uk-line);
  border-radius: 10px 10px 0 0;   /* знизу до блоку прилягає RunOutput */
  overflow: hidden;
  background: var(--vp-c-bg-soft);
}
.cf__head {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  width: 100%;
  padding: 0.7rem 0.9rem;
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: 0;
  font: inherit;
  color: var(--vp-c-text-1);
}
.cf__head:hover { background: var(--vp-c-default-soft); }
.cf__chev {
  font-size: 0.8rem;
  color: var(--uk-accent);
  transition: transform 0.15s ease;
}
.is-open .cf__chev { transform: rotate(90deg); }
.cf__title {
  flex: 1 1 auto;
  font-weight: 600;
  font-size: 0.93rem;
  line-height: 1.35;
}
.cf__meta {
  flex: 0 0 auto;
  font-family: var(--vp-font-family-mono);
  font-size: 0.75rem;
  color: var(--vp-c-text-3);
  white-space: nowrap;
}
.cf__btn {
  flex: 0 0 auto;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--uk-accent);
  border: 1px solid var(--uk-accent);
  border-radius: 999px;
  padding: 0.15rem 0.65rem;
  white-space: nowrap;
}
.cf__body { border-top: 1px solid var(--uk-line); }
.cf__body :deep(div[class*='language-']) { margin: 0 !important; border-radius: 0 !important; }
.is-fragment { border-radius: 10px; margin-bottom: 1.4rem; }
.is-fragment .cf__chev { color: var(--vp-c-text-3); }

@media (max-width: 640px) {
  .cf__head { flex-wrap: wrap; row-gap: 0.3rem; }
  .cf__title { flex-basis: calc(100% - 1.5rem); }
  .cf__meta { margin-left: 1.4rem; }
  .cf__btn { margin-left: auto; }
}
</style>
