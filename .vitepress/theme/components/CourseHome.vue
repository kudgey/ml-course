<script setup lang="ts">
/** Головна: карта курсу за блоками. */
import { withBase } from 'vitepress'

const BLOCKS = [
  {
    code: 'A',
    name: 'Основи та лінійні моделі',
    lead: 'Що таке навчання з даних, як влаштована найпростіша модель і чому вона перестає працювати на нових даних.',
    items: [
      { id: '01', t: 'Вступ до машинного навчання' },
      { id: '02', t: 'Лінійна регресія та оптимізація' },
      { id: '03', t: 'Узагальнення, перенавчання та регуляризація' },
      { id: '04', t: 'Імовірнісний погляд: максимальна правдоподібність' }
    ]
  },
  {
    code: 'B',
    name: 'Класифікація та ядрові методи',
    lead: 'Від імовірності класу до межі рішень: логістична регресія, дерева, ансамблі та опорні вектори.',
    items: [
      { id: '05', t: 'Класифікація та логістична регресія' },
      { id: '06', t: 'Найближчі сусіди, дерева рішень та ансамблі' },
      { id: '07', t: 'Опорно-векторні машини та ядрові методи' }
    ]
  },
  {
    code: 'C',
    name: 'Навчання без учителя',
    lead: 'Структура в даних без міток: групування об’єктів і стиснення ознакового простору.',
    items: [
      { id: '08', t: 'Навчання без учителя: кластеризація' },
      { id: '09', t: 'Зниження розмірності та матричні розклади' }
    ]
  },
  {
    code: 'D',
    name: 'Нейронні мережі',
    lead: 'Зворотне поширення, згортки для зображень і механізм уваги, на якому стоять сучасні моделі.',
    items: [
      { id: '10', t: 'Нейронні мережі та зворотне поширення' },
      { id: '11', t: 'Згорткові мережі та навчання глибоких моделей' },
      { id: '12', t: 'Механізм уваги та трансформери' }
    ]
  },
  {
    code: 'E',
    name: 'Подання та генеративні моделі',
    lead: 'Як модель вчиться корисним поданням без міток і як вона починає породжувати нові дані.',
    items: [
      { id: '13', t: 'Сучасне навчання подань' },
      { id: '14', t: 'Генеративні та відповідальні моделі' }
    ]
  }
]
</script>

<template>
  <div class="uk-hero">
    <div class="uk-hero__eyebrow">КПІ ім. Ігоря Сікорського · магістратура · 2026/2027</div>
    <h1>Машинне навчання</h1>
    <p class="uk-hero__lead">
      Чотирнадцять лекцій — від прямої, проведеної через хмару точок, до трансформера
      й дифузійної моделі. Кожен метод проходить один і той самий шлях: задача →
      інтуїція → схема → математика → приклад на реальних даних → код → результат →
      обмеження. Дані справжні: California Housing, Breast Cancer, Iris, Wine,
      Titanic, MNIST.
    </p>
    <p class="uk-hero__author">Kirill Riazanovskiy, PhD</p>
  </div>

  <div class="uk-blocks">
    <section v-for="b in BLOCKS" :key="b.code" class="uk-block">
      <div class="uk-block__tag">БЛОК {{ b.code }}</div>
      <h3>{{ b.name }}</h3>
      <p class="uk-block__lead">{{ b.lead }}</p>
      <ol>
        <li v-for="l in b.items" :key="l.id">
          <a :href="withBase(`/lectures/${l.id}`)">{{ l.t }}</a>
        </li>
      </ol>
    </section>
  </div>

  <div class="uk-facts">
    <div class="uk-fact"><b>14</b><span>лекцій</span></div>
    <div class="uk-fact"><b>566</b><span>розділів</span></div>
    <div class="uk-fact"><b>307</b><span>ілюстрацій</span></div>
    <div class="uk-fact"><b>5</b><span>лабораторних</span></div>
  </div>
</template>

<style scoped>
.uk-hero__author {
  margin-top: 1.4rem;
  font-size: 0.95rem;
  color: var(--vp-c-text-2);
  border-left: 3px solid var(--uk-accent);
  padding-left: 0.8rem;
}
.uk-block__lead {
  font-size: 0.86rem;
  line-height: 1.5;
  color: var(--vp-c-text-3);
  margin: 0 0 0.7rem;
}
.uk-block ol { list-style: decimal; }
.uk-block ol li::marker {
  font-family: var(--vp-font-family-mono);
  font-size: 0.78rem;
  color: var(--vp-c-text-3);
}

.uk-facts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 0.7rem;
  margin: 2.5rem 0 0;
  padding-top: 1.8rem;
  border-top: 1px solid var(--uk-line);
}
.uk-fact { text-align: center; }
.uk-fact b {
  display: block;
  font-size: 1.75rem;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: var(--uk-accent);
  font-variant-numeric: tabular-nums;
}
.uk-fact span {
  font-size: 0.8rem;
  color: var(--vp-c-text-3);
}
</style>
