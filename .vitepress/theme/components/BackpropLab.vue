<script setup lang="ts">
/**
 * Зворотне поширення крок за кроком на мережі 2-2-1 із розділу.
 * Усе рахується тут-таки за трьома формулами лекції:
 *   δ⁽ᴸ⁺¹⁾ = p − y,   δ⁽ˡ⁾ = (Wᵀδ⁽ˡ⁺¹⁾) ⊙ φ′(z⁽ˡ⁾),   ∂L/∂w = δ · a.
 * Числа збігаються з виводом autograd у коді лекції: при x = (1; 0,5) і y = 0
 * p = 0,4675, втрати 0,6303, ∂L/∂W₁ = [[0,2805; 0,1403], [−0,187; −0,0935]],
 * ∂L/∂W₂ = [0,1169; 0,3273].
 */
import { ref, computed } from 'vue'

const W1 = [[0.5, -0.5], [0.3, 0.8]]      // ваги з коду лекції
const W2 = [0.6, -0.4]
const x1 = ref(1.0)
const x2 = ref(0.5)
const y = ref(0)
const picked = ref<'h1' | 'h2' | 'out'>('out')

const relu = (v: number) => Math.max(0, v)
const sig = (v: number) => 1 / (1 + Math.exp(-v))

const fwd = computed(() => {
  const x = [x1.value, x2.value]
  const z1 = [W1[0][0] * x[0] + W1[0][1] * x[1], W1[1][0] * x[0] + W1[1][1] * x[1]]
  const a1 = z1.map(relu)
  const z2 = W2[0] * a1[0] + W2[1] * a1[1]
  const p = sig(z2)
  // бінарна перехресна ентропія по логіту, стійка форма
  const loss = Math.max(z2, 0) - z2 * y.value + Math.log(1 + Math.exp(-Math.abs(z2)))
  return { x, z1, a1, z2, p, loss }
})

const back = computed(() => {
  const { x, z1, a1, p } = fwd.value
  const d2 = p - y.value
  const d1 = [W2[0] * d2 * (z1[0] > 0 ? 1 : 0), W2[1] * d2 * (z1[1] > 0 ? 1 : 0)]
  return {
    d2, d1,
    gW2: [d2 * a1[0], d2 * a1[1]], gb2: d2,
    gW1: [[d1[0] * x[0], d1[0] * x[1]], [d1[1] * x[0], d1[1] * x[1]]], gb1: d1
  }
})

/** Один крок спуску з кроком 0,5 — те саме, що робить код лекції. */
const afterStep = computed(() => {
  const { x } = fwd.value
  const b = back.value
  const nW1 = W1.map((r, j) => r.map((w, i) => w - 0.5 * b.gW1[j][i]))
  const nb1 = b.gb1.map(g => -0.5 * g)
  const nW2 = W2.map((w, j) => w - 0.5 * b.gW2[j])
  const nb2 = -0.5 * b.gb2
  const z1 = [nW1[0][0] * x[0] + nW1[0][1] * x[1] + nb1[0],
              nW1[1][0] * x[0] + nW1[1][1] * x[1] + nb1[1]]
  const a1 = z1.map(relu)
  const z2 = nW2[0] * a1[0] + nW2[1] * a1[1] + nb2
  const loss = Math.max(z2, 0) - z2 * y.value + Math.log(1 + Math.exp(-Math.abs(z2)))
  return { p: sig(z2), loss }
})

const f = (v: number, d = 4) => v.toFixed(d).replace('.', ',')

/** Що показати для обраного вузла: сигнал похибки й похідні його ваг. */
const detail = computed(() => {
  const b = back.value, fw = fwd.value
  if (picked.value === 'out') {
    return {
      title: 'вихідний нейрон',
      pre: `z = ${f(fw.z2)}`, act: `p = σ(z) = ${f(fw.p)}`,
      delta: `δ = p − y = ${f(fw.p)} − ${y.value} = ${f(b.d2)}`,
      rows: [['∂L/∂w₁ = δ · a₁', b.gW2[0]], ['∂L/∂w₂ = δ · a₂', b.gW2[1]],
             ['∂L/∂b = δ', b.gb2]] as [string, number][],
      dead: false
    }
  }
  const j = picked.value === 'h1' ? 0 : 1
  const dead = fw.z1[j] <= 0
  return {
    title: `прихований нейрон ${j + 1}`,
    pre: `z = ${f(fw.z1[j])}`, act: `a = ReLU(z) = ${f(fw.a1[j])}`,
    delta: `δ = w${j + 1} · δ_вих · ReLU′(z) = ${f(W2[j])} · ${f(b.d2)} · `
      + `${dead ? 0 : 1} = ${f(b.d1[j])}`,
    rows: [[`∂L/∂w₁ = δ · x₁`, b.gW1[j][0]], [`∂L/∂w₂ = δ · x₂`, b.gW1[j][1]],
           ['∂L/∂b = δ', b.gb1[j]]] as [string, number][],
    dead
  }
})

const W = 420, H = 210
const NODES: Record<string, [number, number]> = {
  x1: [50, 70], x2: [50, 150], h1: [200, 70], h2: [200, 150], out: [350, 110]
}
const edgeW = (g: number) => Math.min(6, 1 + Math.abs(g) * 8)
</script>

<template>
  <div class="lab">
    <div class="lab__head">
      <div>
        <div class="lab__title">Зворотний прохід по мережі 2-2-1</div>
        <div class="lab__sub">
          Та сама мережа й ті самі ваги, що в коді розділу. Клацніть будь-який
          нейрон — і побачите його сигнал похибки δ та похідні всіх ваг, які
          в нього входять. Усе рахується тут за трьома формулами вище.
        </div>
      </div>
    </div>

    <div class="lab__controls">
      <label class="lab__ctl">
        <span>x₁ = <b>{{ f(x1, 2) }}</b></span>
        <input type="range" min="-1.5" max="1.5" step="0.1" v-model.number="x1" />
      </label>
      <label class="lab__ctl">
        <span>x₂ = <b>{{ f(x2, 2) }}</b></span>
        <input type="range" min="-1.5" max="1.5" step="0.1" v-model.number="x2" />
      </label>
      <div class="lab__ctl">
        <span>Правильна відповідь y</span>
        <span class="bp__btns">
          <button class="lab__pill" :class="{ 'is-on': y === 0 }" @click="y = 0">0</button>
          <button class="lab__pill" :class="{ 'is-on': y === 1 }" @click="y = 1">1</button>
        </span>
      </div>
    </div>

    <svg :viewBox="`0 0 ${W} ${H}`" class="bp" role="img"
         aria-label="Мережа два-два-один із похідними на ребрах">
      <g v-for="(j) in [0, 1]" :key="'e1' + j">
        <line v-for="i in [0, 1]" :key="i"
              :x1="NODES[i === 0 ? 'x1' : 'x2'][0]" :y1="NODES[i === 0 ? 'x1' : 'x2'][1]"
              :x2="NODES[j === 0 ? 'h1' : 'h2'][0]" :y2="NODES[j === 0 ? 'h1' : 'h2'][1]"
              class="bp__edge" :style="{ strokeWidth: edgeW(back.gW1[j][i]) }" />
      </g>
      <line v-for="j in [0, 1]" :key="'e2' + j"
            :x1="NODES[j === 0 ? 'h1' : 'h2'][0]" :y1="NODES[j === 0 ? 'h1' : 'h2'][1]"
            :x2="NODES.out[0]" :y2="NODES.out[1]"
            class="bp__edge" :style="{ strokeWidth: edgeW(back.gW2[j]) }" />

      <g v-for="k in ['x1', 'x2']" :key="k">
        <circle :cx="NODES[k][0]" :cy="NODES[k][1]" r="20" class="bp__in" />
        <text :x="NODES[k][0]" :y="NODES[k][1] + 4" class="bp__lbl" text-anchor="middle">
          {{ f(k === 'x1' ? x1 : x2, 2) }}
        </text>
      </g>
      <g v-for="(k, j) in ['h1', 'h2']" :key="k" class="bp__click"
         @click="picked = (k as 'h1' | 'h2')">
        <circle :cx="NODES[k][0]" :cy="NODES[k][1]" r="24"
                :class="['bp__node', { 'is-on': picked === k, 'is-dead': fwd.z1[j] <= 0 }]" />
        <text :x="NODES[k][0]" :y="NODES[k][1] + 4" class="bp__lbl" text-anchor="middle">
          {{ f(fwd.a1[j], 2) }}
        </text>
      </g>
      <g class="bp__click" @click="picked = 'out'">
        <circle :cx="NODES.out[0]" :cy="NODES.out[1]" r="24"
                :class="['bp__node', { 'is-on': picked === 'out' }]" />
        <text :x="NODES.out[0]" :y="NODES.out[1] + 4" class="bp__lbl" text-anchor="middle">
          {{ f(fwd.p, 2) }}
        </text>
      </g>
      <text :x="50" :y="196" class="bp__cap" text-anchor="middle">вхід</text>
      <text :x="200" :y="196" class="bp__cap" text-anchor="middle">прихований шар, ReLU</text>
      <text :x="350" :y="196" class="bp__cap" text-anchor="middle">вихід, σ</text>
    </svg>

    <div class="bp__detail">
      <div class="bp__dt">{{ detail.title }}</div>
      <div class="bp__row">{{ detail.pre }} · {{ detail.act }}</div>
      <div class="bp__row bp__delta">{{ detail.delta }}</div>
      <div v-for="(r, i) in detail.rows" :key="i" class="bp__row">
        {{ r[0] }} = <b>{{ f(r[1]) }}</b>
      </div>
      <div v-if="detail.dead" class="bp__dead">
        z ≤ 0, тож ReLU′ = 0: сигнал похибки в цей нейрон не заходить, і всі
        похідні його ваг дорівнюють нулю. Це той самий мертвий нейрон, який
        рахували в розділі 32 — тільки тут видно, звідки береться нуль.
      </div>
    </div>

    <div class="lab__stats">
      <div class="lab__stat"><b>{{ f(fwd.p) }}</b><span>прогноз p</span></div>
      <div class="lab__stat"><b>{{ f(fwd.loss) }}</b><span>втрати до кроку</span></div>
      <div class="lab__stat" :class="afterStep.loss < fwd.loss ? 'is-green' : 'is-warm'">
        <b>{{ f(afterStep.loss) }}</b><span>втрати після кроку η = 0,5</span>
      </div>
      <div class="lab__stat"><b>{{ f(back.d2) }}</b><span>δ на виході</span></div>
    </div>

    <p class="lab__note">
      За замовчуванням тут ті самі числа, що друкує код розділу: p = 0,4675,
      втрати 0,6303, а після одного кроку спуску — 0,3215 і 0,3879. Клацніть
      прихований нейрон: його δ дорівнює вазі до виходу, помноженій на δ виходу
      й на похідну ReLU. Саме тому сигнал похибки й називають сигналом — він
      справді тече назад тим самим графом, тільки в інший бік.

      Тепер зсуньте x₁ у мінус. Один із прихованих нейронів почервоніє: його
      z стало від'ємним, ReLU′ дорівнює нулю, і всі похідні його ваг обнулилися.
      На одному прикладі це тимчасово, але якщо так стається на всіх — нейрон
      мертвий назавжди, і саме цей механізм дає 227 із 256 у розділі 32.
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
.bp__btns { display: inline-flex; gap: 0.35rem; }
.bp__detail {
  border: 1px solid var(--uk-line); border-radius: 8px;
  padding: 0.7rem 0.9rem; margin-bottom: 0.8rem;
}
.bp__dt { font-size: 0.78rem; color: var(--vp-c-text-3); margin-bottom: 0.35rem; }
.bp__row { font-size: 0.9rem; color: var(--vp-c-text-2); line-height: 1.7; }
.bp__delta { color: var(--vp-c-text-1); }
.bp__dead { margin-top: 0.5rem; font-size: 0.85rem; color: var(--uk-warm); }
</style>
