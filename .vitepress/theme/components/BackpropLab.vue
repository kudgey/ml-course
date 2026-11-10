<script setup lang="ts">
/**
 * Зворотне поширення на мережі 2-2-1 розділу 3.1: чотири точки «виключного або»,
 * стартові ваги з розрахунку лекції. Усе рахується тут-таки за формулою (6):
 *   δ = p − y,   δⱼ = vⱼ · δ · [zⱼ > 0],   g(vⱼ) = δ · hⱼ,   g(wⱼᵢ) = δⱼ · xᵢ.
 * Для точки (1, 0) числа збігаються з розрахунком і кодом розділу 3.2:
 * p = 0,545, втрата 0,607, δ = −0,455, δ₁ = −0,273, δ₂ = 0,182,
 * після кроку η = 0,5 — p = 0,677 і втрата 0,390.
 */
import { ref, computed } from 'vue'

const W = [[0.5, -0.5], [0.3, 0.8]]       // ваги прихованого шару: рядок — нейрон
const V = [0.6, -0.4]                      // ваги виходу
const ETA = 0.5
const POINTS: [number, number][] = [[0, 0], [0, 1], [1, 0], [1, 1]]
const xorOf = (p: [number, number]) => (p[0] + p[1] === 1 ? 1 : 0)
const pick = ref(2)                        // точка (1, 0)
const picked = ref<'h1' | 'h2' | 'out'>('out')

const relu = (v: number) => Math.max(0, v)
const sig = (v: number) => 1 / (1 + Math.exp(-v))
const bce = (o: number, y: number) => Math.max(o, 0) - o * y + Math.log(1 + Math.exp(-Math.abs(o)))

const x = computed(() => POINTS[pick.value])
const y = computed(() => xorOf(POINTS[pick.value]))

const fwd = computed(() => {
  const [x1, x2] = x.value
  const z = [W[0][0] * x1 + W[0][1] * x2, W[1][0] * x1 + W[1][1] * x2]
  const h = z.map(relu)
  const o = V[0] * h[0] + V[1] * h[1]
  return { z, h, o, p: sig(o), loss: bce(o, y.value) }
})

const back = computed(() => {
  const { z, h, p } = fwd.value
  const d = p - y.value
  const dh = [V[0] * d * (z[0] > 0 ? 1 : 0), V[1] * d * (z[1] > 0 ? 1 : 0)]
  return {
    d, dh,
    gV: [d * h[0], d * h[1]], gc: d,
    gW: dh.map(dj => [dj * x.value[0], dj * x.value[1]]), gb: dh
  }
})

/** Один крок спуску з η = 0,5 на обраній точці — те саме, що робить код розділу 3.2. */
const afterStep = computed(() => {
  const b = back.value
  const nW = W.map((r, j) => r.map((w, i) => w - ETA * b.gW[j][i]))
  const nb = b.gb.map(g => -ETA * g)
  const nV = V.map((v, j) => v - ETA * b.gV[j])
  const nc = -ETA * b.gc
  const [x1, x2] = x.value
  const h = [relu(nW[0][0] * x1 + nW[0][1] * x2 + nb[0]), relu(nW[1][0] * x1 + nW[1][1] * x2 + nb[1])]
  const o = nV[0] * h[0] + nV[1] * h[1] + nc
  return { p: sig(o), loss: bce(o, y.value) }
})

const f = (v: number, d = 3) => {
  const s = (Math.abs(v) < 0.5 * 10 ** -d ? 0 : v).toFixed(d).replace('.', ',')
  return s.startsWith('-') ? '−' + s.slice(1) : s
}
const sub = ['₁', '₂']

/** Що показати для обраного нейрона: сигнал похибки й градієнти ваг, що в нього входять. */
const detail = computed(() => {
  const b = back.value, fw = fwd.value
  if (picked.value === 'out') {
    return {
      title: 'вихідний нейрон',
      pre: `o = ${f(fw.o)}`, act: `p = σ(o) = ${f(fw.p)}`,
      delta: `δ = p − y = ${f(fw.p)} − ${y.value} = ${f(b.d)}`,
      rows: [['g(v₁) = δ · h₁', b.gV[0]], ['g(v₂) = δ · h₂', b.gV[1]],
             ['g(c) = δ', b.gc]] as [string, number][],
      dead: false
    }
  }
  const j = picked.value === 'h1' ? 0 : 1
  const dead = fw.z[j] <= 0
  return {
    title: `прихований нейрон ${j + 1}`,
    pre: `z${sub[j]} = ${f(fw.z[j])}`, act: `h${sub[j]} = ReLU(z${sub[j]}) = ${f(fw.h[j])}`,
    delta: `δ${sub[j]} = v${sub[j]} · δ · [z${sub[j]} > 0] = ${f(V[j], 1)} · ${f(b.d)} · `
      + `${dead ? 0 : 1} = ${f(b.dh[j])}`,
    rows: [[`g(w${sub[j]}₁) = δ${sub[j]} · x₁`, b.gW[j][0]], [`g(w${sub[j]}₂) = δ${sub[j]} · x₂`, b.gW[j][1]],
           [`g(b${sub[j]}) = δ${sub[j]}`, b.gb[j]]] as [string, number][],
    dead
  }
})

const SW = 420, SH = 210
const NODES: Record<string, [number, number]> = {
  x1: [50, 70], x2: [50, 150], h1: [200, 70], h2: [200, 150], out: [350, 110]
}
const edgeW = (g: number) => Math.min(6, 1 + Math.abs(g) * 8)
</script>

<template>
  <div class="lab">
    <div class="lab__head">
      <div>
        <div class="lab__title">Зворотний прохід на чотирьох точках</div>
        <div class="lab__sub">
          Мережа й стартові ваги розрахунку цього розділу. Оберіть точку й клацніть
          нейрон: побачите його сигнал похибки δ і градієнти ваг, що в нього входять.
          Товщина ребра — розмір градієнта цієї ваги.
        </div>
      </div>
    </div>

    <div class="lab__controls">
      <div class="lab__ctl">
        <span>Точка (x₁, x₂) і її клас y</span>
        <span class="bp__btns">
          <button v-for="(pt, k) in POINTS" :key="k" class="lab__pill"
                  :class="{ 'is-on': pick === k }" @click="pick = k">
            ({{ pt[0] }}, {{ pt[1] }}) → {{ xorOf(pt) }}
          </button>
        </span>
      </div>
    </div>

    <svg :viewBox="`0 0 ${SW} ${SH}`" class="bp" role="img"
         aria-label="Мережа два-два-один із градієнтами на ребрах">
      <g v-for="j in [0, 1]" :key="'e1' + j">
        <line v-for="i in [0, 1]" :key="i"
              :x1="NODES[i === 0 ? 'x1' : 'x2'][0]" :y1="NODES[i === 0 ? 'x1' : 'x2'][1]"
              :x2="NODES[j === 0 ? 'h1' : 'h2'][0]" :y2="NODES[j === 0 ? 'h1' : 'h2'][1]"
              class="bp__edge" :style="{ strokeWidth: edgeW(back.gW[j][i]) }" />
      </g>
      <line v-for="j in [0, 1]" :key="'e2' + j"
            :x1="NODES[j === 0 ? 'h1' : 'h2'][0]" :y1="NODES[j === 0 ? 'h1' : 'h2'][1]"
            :x2="NODES.out[0]" :y2="NODES.out[1]"
            class="bp__edge" :style="{ strokeWidth: edgeW(back.gV[j]) }" />

      <g v-for="(k, i) in ['x1', 'x2']" :key="k">
        <circle :cx="NODES[k][0]" :cy="NODES[k][1]" r="20" class="bp__in" />
        <text :x="NODES[k][0]" :y="NODES[k][1] + 4" class="bp__lbl" text-anchor="middle">
          {{ x[i] }}
        </text>
      </g>
      <g v-for="(k, j) in ['h1', 'h2']" :key="k" class="bp__click"
         @click="picked = (k as 'h1' | 'h2')">
        <circle :cx="NODES[k][0]" :cy="NODES[k][1]" r="24"
                :class="['bp__node', { 'is-on': picked === k, 'is-dead': fwd.z[j] <= 0 }]" />
        <text :x="NODES[k][0]" :y="NODES[k][1] + 4" class="bp__lbl" text-anchor="middle">
          {{ f(fwd.h[j], 2) }}
        </text>
      </g>
      <g class="bp__click" @click="picked = 'out'">
        <circle :cx="NODES.out[0]" :cy="NODES.out[1]" r="24"
                :class="['bp__node', { 'is-on': picked === 'out' }]" />
        <text :x="NODES.out[0]" :y="NODES.out[1] + 4" class="bp__lbl" text-anchor="middle">
          {{ f(fwd.p, 2) }}
        </text>
      </g>
      <text :x="50" :y="196" class="bp__cap" text-anchor="middle">входи</text>
      <text :x="200" :y="196" class="bp__cap" text-anchor="middle">прихований шар, ReLU</text>
      <text :x="350" :y="196" class="bp__cap" text-anchor="middle">вихід, σ</text>
    </svg>

    <div class="bp__detail">
      <div class="bp__dt">{{ detail.title }}</div>
      <div class="bp__row">{{ detail.pre }} · {{ detail.act }}</div>
      <div class="bp__row bp__delta" data-check="delta">{{ detail.delta }}</div>
      <div v-for="(r, i) in detail.rows" :key="i" class="bp__row">
        {{ r[0] }} = <b :data-check="'g' + i">{{ f(r[1]) }}</b>
      </div>
      <div v-if="detail.dead" class="bp__dead">
        z ≤ 0, тож [z > 0] = 0: сигнал похибки в цей нейрон не заходить, і градієнти
        всіх його ваг дорівнюють нулю. На цій точці нейрон не навчається.
      </div>
    </div>

    <div class="lab__stats">
      <div class="lab__stat"><b data-check="p">{{ f(fwd.p) }}</b><span>ймовірність класу 1, p</span></div>
      <div class="lab__stat"><b data-check="loss">{{ f(fwd.loss) }}</b><span>втрата до кроку</span></div>
      <div class="lab__stat" :class="afterStep.loss < fwd.loss ? 'is-green' : 'is-warm'">
        <b data-check="loss-new">{{ f(afterStep.loss) }}</b><span>втрата після кроку η = 0,5</span>
      </div>
      <div class="lab__stat"><b data-check="p-new">{{ f(afterStep.p) }}</b><span>p після кроку</span></div>
    </div>

    <p class="lab__note">
      Для точки (1, 0) тут ті самі числа, що в розрахунку й у коді розділу 3.2:
      p = 0,545, втрата 0,607, а після одного кроку — 0,677 і 0,390. Тепер оберіть
      точку (0, 1): у першого нейрона z₁ = −0,5, він видає 0, і градієнти всіх його
      ваг обнуляються. Якщо нейрон видає 0 на всіх точках, він не навчається зовсім —
      так застрягає навчання в розділі 3.2.
    </p>
  </div>
</template>

<style scoped>
.bp { width: 100%; height: auto; display: block; margin: 0.4rem 0; }
.bp__edge { stroke: var(--uk-accent); opacity: 0.45; }
.bp__in { fill: var(--vp-c-bg); stroke: var(--uk-line); stroke-width: 1.5; }
.bp__node { fill: var(--vp-c-bg); stroke: var(--uk-accent); stroke-width: 2; cursor: pointer; }
.bp__node.is-on { fill: color-mix(in srgb, var(--uk-accent) 16%, transparent); }
.bp__node.is-dead { stroke: var(--uk-warm); }
.bp__click { cursor: pointer; }
.bp__lbl { fill: var(--vp-c-text-1); font-size: 12px; }
.bp__cap { fill: var(--vp-c-text-3); font-size: 10px; }
.bp__btns { display: inline-flex; flex-wrap: wrap; gap: 0.35rem; }
.bp__detail {
  border: 1px solid var(--uk-line); border-radius: 8px;
  padding: 0.7rem 0.9rem; margin-bottom: 0.8rem;
}
.bp__dt { font-size: 0.78rem; color: var(--vp-c-text-3); margin-bottom: 0.35rem; }
.bp__row { font-size: 0.9rem; color: var(--vp-c-text-2); line-height: 1.7; }
.bp__delta { color: var(--vp-c-text-1); }
.bp__dead { margin-top: 0.5rem; font-size: 0.85rem; color: var(--uk-warm); }
</style>
