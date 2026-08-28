import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Машинне навчання',
  description: 'Магістерський курс «Машинне навчання»: від лінійної регресії до трансформерів і генеративних моделей. КПІ.',
  lang: 'uk-UA',
  // GitHub Pages у підкаталозі вимагає base='/<репозиторій>/'.
  // Задається змінною оточення, тому той самий код працює і на власному домені.
  base: process.env.BASE ?? '/',
  cleanUrls: true,
  // README — інструкція для того, хто збирає, а не сторінка курсу
  srcExclude: ['README.md'],
  lastUpdated: true,
  markdown: {
    math: true,
    lineNumbers: true,
    theme: { light: 'github-light', dark: 'github-dark' },
    image: { lazyLoading: true }
  },
  head: [
    // base потрібен вручну: VitePress не переписує шляхи всередині head
    ['link', { rel: 'icon', type: 'image/svg+xml',
               href: (process.env.BASE ?? '/') + 'favicon.svg' }],
    ['meta', { name: 'theme-color', content: '#3D4EC4' }],
    ['meta', { property: 'og:title', content: 'Машинне навчання — курс КПІ' }],
  ],
  themeConfig: {
    outline: { level: [2, 2], label: 'На цій сторінці' },
    nav: [
      { text: 'Лекції', link: '/lectures/01' },
      { text: 'Лабораторні', link: '/labs' }
    ],
    sidebar: [
      { text: 'Курс', items: [
        { text: 'Огляд і структура', link: '/' },
        { text: 'Лабораторні роботи', link: '/labs' }
      ]},
    {
      text: "Блок A · Основи та лінійні моделі",
      collapsed: false,
      items: [
        { text: "01 · Вступ до машинного навчання", link: "/lectures/01" },
        { text: "02 · Лінійна регресія та оптимізація", link: "/lectures/02" },
        { text: "03 · Узагальнення, перенавчання та регуляризація", link: "/lectures/03" },
        { text: "04 · Імовірнісний погляд: максимальна правдоподібність", link: "/lectures/04" }
      ]
    },
    {
      text: "Блок B · Класифікація та ядрові методи",
      collapsed: false,
      items: [
        { text: "05 · Класифікація та логістична регресія", link: "/lectures/05" },
        { text: "06 · Найближчі сусіди, дерева рішень та ансамблі", link: "/lectures/06" },
        { text: "07 · Опорно-векторні машини та ядрові методи", link: "/lectures/07" }
      ]
    },
    {
      text: "Блок C · Навчання без учителя",
      collapsed: false,
      items: [
        { text: "08 · Навчання без учителя: кластеризація", link: "/lectures/08" },
        { text: "09 · Зниження розмірності та матричні розклади", link: "/lectures/09" }
      ]
    },
    {
      text: "Блок D · Нейронні мережі",
      collapsed: false,
      items: [
        { text: "10 · Нейронні мережі та зворотне поширення", link: "/lectures/10" },
        { text: "11 · Згорткові мережі та навчання глибоких моделей", link: "/lectures/11" },
        { text: "12 · Механізм уваги та трансформери", link: "/lectures/12" }
      ]
    },
    {
      text: "Блок E · Подання та генеративні моделі",
      collapsed: false,
      items: [
        { text: "13 · Сучасне навчання подань", link: "/lectures/13" },
        { text: "14 · Генеративні та відповідальні моделі", link: "/lectures/14" }
      ]
    },
    ],
    docFooter: { prev: 'Попередня лекція', next: 'Наступна лекція' },
    darkModeSwitchLabel: 'Тема',
    lightModeSwitchTitle: 'Світла тема',
    darkModeSwitchTitle: 'Темна тема',
    sidebarMenuLabel: 'Розділи',
    returnToTopLabel: 'Догори',
    lastUpdatedText: 'Оновлено',
    search: {
      provider: 'local',
      options: {
        translations: {
          button: { buttonText: 'Пошук', buttonAriaLabel: 'Пошук' },
          modal: {
            noResultsText: 'Нічого не знайдено',
            resetButtonTitle: 'Очистити',
            footer: { selectText: 'вибрати', navigateText: 'навігація', closeText: 'закрити' }
          }
        }
      }
    },
    footer: {
      message: 'Матеріали курсу. Схеми із зовнішніх джерел належать їхнім авторам — посилання під кожною ілюстрацією.',
      copyright: 'КПІ ім. Ігоря Сікорського · 2026/2027'
    }
  }
})
