<script setup lang="ts">
/**
 * Підготовка даних на справжніх рядках «Титаніка»: вісім пасажирів, серед них
 * ті самі, у кого бракує віку або порту. Три перемикачі відтворюють рівно те,
 * що робить ColumnTransformer із коду цього розділу, і кінцева форма таблиці
 * сходиться з його виводом: (891, 7) → (891, 12).
 */
import { ref, computed } from 'vue'
import d from '../../data/lec01_titanic.json'

const impute = ref(false)
const encode = ref(false)
const scale = ref(false)

const NUM = ['age', 'sibsp', 'parch', 'fare']
const CAT = ['pclass', 'sex', 'embarked']
const CATVALS: Record<string, string[]> = {
  pclass: ['1', '2', '3'],
  sex: ['female', 'male'],
  embarked: ['C', 'Q', 'S']
}

/** Стовпці після перетворень — у тому самому порядку, що дає get_feature_names_out. */
const columns = computed(() => {
  if (!encode.value) return d.cols
  const out = NUM.map(c => (scale.value ? `num__${c}` : c))
  for (const c of CAT) for (const v of CATVALS[c]) out.push(`cat__${c}_${v}`)
  return out
})

const rows = computed(() =>
  d.rows.map(r => {
    const rec: Record<string, any> = {}
    d.cols.forEach((c, i) => (rec[c] = r[i]))

    if (impute.value) {
      if (rec.age === null) rec.age = { v: d.medAge, filled: true }
      if (rec.embarked === null) rec.embarked = { v: d.modeEmb, filled: true }
    }
    const val = (c: string) => (rec[c] && rec[c].filled !== undefined ? rec[c].v : rec[c])
    const filled = (c: string) => !!(rec[c] && rec[c].filled)

    if (!encode.value) {
      return d.cols.map(c => ({ v: val(c), filled: filled(c), na: val(c) === null }))
    }

    const out: { v: any; filled: boolean; na: boolean }[] = []
    for (const c of NUM) {
      let v = val(c)
      if (v !== null && scale.value) {
        v = Math.round(((v - (d.means as any)[c]) / (d.stds as any)[c]) * 100) / 100
      }
      out.push({ v, filled: filled(c), na: v === null })
    }
    for (const c of CAT) {
      const cur = val(c)
      for (const level of CATVALS[c])
        out.push({ v: cur === null ? null : (String(cur) === level ? 1 : 0),
                   filled: filled(c), na: cur === null })
    }
    return out
  })
)

const shape = computed(() => `(${d.n}, ${columns.value.length})`)
const naLeft = computed(() => (impute.value ? 0 : d.naAge + d.naEmb))
const ready = computed(() => impute.value && encode.value)

const show = (c: { v: any; na: boolean }) =>
  c.na || c.v === null ? 'NaN' : typeof c.v === 'number' ? String(c.v).replace('.', ',') : c.v
</script>

<template>
  <div class="lab">
    <div class="lab__head">
      <div>
        <div class="lab__title">Що саме робить підготовка даних</div>
        <div class="lab__sub">
          Вісім справжніх рядків «Титаніка» — серед них ті, у кого бракує віку або
          порту посадки. Вмикайте кроки по черзі й дивіться, як змінюється таблиця:
          це рівно те, що виконує <code>ColumnTransformer</code> із коду вище.
        </div>
      </div>
    </div>

    <div class="lab__pills">
      <button class="lab__pill" :class="{ 'is-on': impute }" @click="impute = !impute">
        заповнити пропуски
      </button>
      <button class="lab__pill" :class="{ 'is-on': encode }" @click="encode = !encode">
        кодувати категорії
      </button>
      <button class="lab__pill" :class="{ 'is-on': scale }" @click="scale = !scale"
              :disabled="!encode" :title="encode ? '' : 'спершу увімкніть кодування'">
        стандартизувати числові
      </button>
    </div>

    <div class="pp__wrap">
      <table class="pp">
        <thead>
          <tr><th v-for="c in columns" :key="c" :title="c">{{ c.replace(/^(num|cat)__/, '') }}</th></tr>
        </thead>
        <tbody>
          <tr v-for="(r, i) in rows" :key="i">
            <td v-for="(c, j) in r" :key="j"
                :class="{ 'is-na': c.na, 'is-filled': c.filled && !c.na, 'is-bin': encode && j >= 4 }">
              {{ show(c) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="lab__stats">
      <div class="lab__stat"><b>{{ shape }}</b><span>форма всієї таблиці</span></div>
      <div class="lab__stat" :class="naLeft ? 'is-warm' : 'is-green'">
        <b>{{ naLeft }}</b><span>пропусків лишилося</span>
      </div>
      <div class="lab__stat" :class="ready ? 'is-green' : ''">
        <b>{{ ready ? 'так' : 'ні' }}</b><span>модель це прийме</span>
      </div>
    </div>

    <p class="lab__note">
      Поки пропуски не заповнено, <code>NaN</code> у таблиці — і жодна лінійна модель
      не навчиться: арифметика з ним дає знову <code>NaN</code>. Поки категорії не
      закодовано, стовпець <code>sex</code> містить слова, а не числа. Увімкніть
      обидва кроки — сім стовпців перетворяться на дванадцять, бо кожна категорія
      розгортається в набір нулів і одиниць; саме це число друкує код вище.
      Стандартизація нічого не додає до форми, але приводить ознаки до спільного
      масштабу — вік у роках і тариф у фунтах перестають конкурувати величиною.
      Зверніть увагу: медіана віку 28 років і найчастіший порт «S» рахуються
      <b>тільки за навчальною частиною</b>, інакше в модель просочиться інформація
      про тест.
    </p>
  </div>
</template>

<style scoped>
.pp__wrap { overflow-x: auto; margin: 0.3rem 0 0.2rem; }
.pp {
  border-collapse: collapse;
  font-size: 0.8rem;
  font-variant-numeric: tabular-nums;
  min-width: 100%;
}
.pp th {
  font-weight: 500;
  font-size: 0.7rem;
  color: var(--vp-c-text-3);
  text-align: right;
  padding: 0.25rem 0.5rem;
  border-bottom: 1px solid var(--uk-line);
  white-space: nowrap;
}
.pp td {
  text-align: right;
  padding: 0.25rem 0.5rem;
  border-bottom: 1px solid var(--uk-line);
  white-space: nowrap;
  transition: background 0.2s ease;
}
.pp tbody tr:last-child td { border-bottom: 0; }
.pp td.is-na { color: var(--uk-warm); background: var(--uk-warm-soft); }
.pp td.is-filled { color: var(--uk-green); background: var(--uk-green-soft); }
.pp td.is-bin { color: var(--vp-c-text-2); }
</style>
