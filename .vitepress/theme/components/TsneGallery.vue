<script setup lang="ts">
/**
 * Галерея готових карт t-SNE тих самих цифр (лекція 09, розділ 5.2):
 * три зерна × три перплексії, випадковий старт. Осі умовні, координати зведено
 * до сітки 0–999. Під картою — довіра T(12) цієї карти. Перерахунку в браузері
 * немає: дані — tools/gen_lec09_widgets.py.
 */
import { ref, computed, onMounted, watch } from 'vue'
import g from '../../data/lec09_tsne.json'

const SEEDS = [0, 1, 2], PERPS = [5, 30, 50]
const seed = ref(0), perp = ref(30)
const map = computed(() => g.maps.find(m => m.seed === seed.value && m.perp === perp.value)!)
const canvas = ref<HTMLCanvasElement | null>(null)
const COL = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd',
             '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf']
const SIZE = 640

function draw() {
  const c = canvas.value
  if (!c) return
  const ctx = c.getContext('2d')!
  ctx.clearRect(0, 0, SIZE, SIZE)
  const xy = map.value.xy
  for (let i = 0; i < g.labels.length; i++) {
    ctx.fillStyle = COL[g.labels[i]]
    ctx.beginPath()
    ctx.arc(14 + (xy[2 * i] / 999) * (SIZE - 28), SIZE - 14 - (xy[2 * i + 1] / 999) * (SIZE - 28), 3.6, 0, 7)
    ctx.fill()
  }
}
onMounted(draw)
watch(map, draw)
const f = (v: number) => v.toFixed(3).replace('.', ',')
</script>

<template>
  <div class="lab">
    <div class="lab__head">
      <div>
        <div class="lab__title">Дев'ять карт тих самих цифр</div>
        <div class="lab__sub">
          Готові карти t-SNE для 1797 цифр: перемикайте випадкове зерно й перплексію.
          Колір — справжня цифра, у побудові він не використаний; осі умовні.
        </div>
      </div>
    </div>

    <div class="tg__row">
      <span class="tg__lab">Зерно</span>
      <button v-for="s in SEEDS" :key="s" class="lab__pill" :class="{ 'is-on': seed === s }" @click="seed = s">{{ s }}</button>
    </div>
    <div class="tg__row">
      <span class="tg__lab">Перплексія</span>
      <button v-for="p in PERPS" :key="p" class="lab__pill" :class="{ 'is-on': perp === p }" @click="perp = p">{{ p }}</button>
    </div>

    <canvas ref="canvas" :width="SIZE" :height="SIZE" class="tg__plot" role="img" aria-label="Карта t-SNE цифр"></canvas>

    <div class="tg__legend">
      <span v-for="(c, i) in COL" :key="i"><i :style="{ background: c }"></i>{{ i }}</span>
    </div>

    <div class="lab__stats">
      <div class="lab__stat is-green"><b data-check="T">{{ f(map.T) }}</b><span>довіра T(12) цієї карти</span></div>
    </div>

    <p class="lab__note">
      Положення й форма скупчень змінюються від карти до карти, а довіра лишається в межах
      від 0,989 до 0,992: кожна з цих карт добре зберігає сусідів і жодна не є «правильною» формою даних.
    </p>
  </div>
</template>

<style scoped>
.tg__row { display: flex; flex-wrap: wrap; gap: 0.4rem; align-items: center; margin-bottom: 0.4rem; }
.tg__lab { font-size: 0.8rem; color: var(--vp-c-text-2); min-width: 5.5rem; }
.tg__plot {
  width: 100%;
  max-width: 480px;
  height: auto;
  display: block;
  margin: 0.5rem auto;
  border: 1px solid var(--uk-line);
  border-radius: 8px;
  background: var(--vp-c-bg);
}
.tg__legend { display: flex; flex-wrap: wrap; gap: 0.3rem 0.7rem; justify-content: center; font-size: 0.8rem; margin-bottom: 0.6rem; }
.tg__legend i { display: inline-block; width: 0.7rem; height: 0.7rem; border-radius: 50%; margin-right: 0.25rem; }
</style>
