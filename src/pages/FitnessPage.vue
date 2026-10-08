<template>
  <div class="wb-content">
    <!-- 页面头 -->
    <div class="wb-page-head">
      <h3>减肥管理</h3>
      <t-button theme="primary" @click="startNew">
        <template #icon><add-icon /></template>记录今天
      </t-button>
    </div>

    <!-- 统计卡片 -->
    <StatsCards :cards="statCards" />

    <!-- 每日记录表单 -->
    <div class="wb-fitness-form" :class="{ 'wb-fitness-editing': editingId }">
      <div v-if="editingId" class="wb-fitness-banner">
        ✏️ 正在编辑 <b>{{ form.date }}</b> 的记录，日期不可修改；想补别的日期请点「记录今天」
      </div>
      <t-form label-width="86px" @submit.prevent>
        <div class="wb-fitness-grid">
          <t-form-item label="日期" name="date">
            <t-date-picker v-model="form.date" mode="date" style="width: 150px" clearable :disabled="!!editingId" />
          </t-form-item>
          <t-form-item label="晨重 (斤)" name="weight">
            <t-input-number v-model="form.weight" :min="50" :max="500" :step="0.5" :decimal-places="1" placeholder="斤" theme="normal" style="width: 150px" />
          </t-form-item>
          <t-form-item label="运动 (分钟)" name="exerciseMin">
            <t-input-number v-model="form.exerciseMin" :min="0" :max="600" :step="5" placeholder="分钟" theme="normal" style="width: 150px" />
          </t-form-item>
          <t-form-item label="运动消耗 (千卡)" name="caloriesBurned">
            <t-input-number v-model="form.caloriesBurned" :min="0" :max="5000" :step="10" placeholder="千卡" theme="normal" style="width: 150px" />
          </t-form-item>
          <t-form-item label="睡眠 (小时)" name="sleepHours">
            <t-input-number v-model="form.sleepHours" :min="0" :max="24" :step="0.5" :decimal-places="1" placeholder="小时" theme="normal" style="width: 150px" />
          </t-form-item>
          <t-form-item label="备注" name="note">
            <t-input v-model="form.note" placeholder="运动内容 / 心情（可选）" style="width: 220px" />
          </t-form-item>
        </div>

        <div class="wb-fitness-foods">
          <div class="wb-fitness-foods-head">
            <span>今天吃了什么（填克重自动算热量）</span>
            <t-button size="small" variant="text" theme="primary" @click="addFoodRow">
              <template #icon><add-rectangle-icon /></template>添加食物
            </t-button>
          </div>

          <!-- 常吃食物快捷添加：点击即带出名称和热量密度，填克重自动算千卡 -->
          <div v-if="freqFoods.length" class="wb-freq-chips">
            <span class="wb-freq-label">常吃：</span>
            <t-tag
              v-for="f in freqFoods"
              :key="f.id"
              variant="light"
              class="wb-freq-chip"
            >
              <span @click="addFreqFood(f)">{{ f.name }} · {{ f.kcalPer100g }} 千卡/100g</span>
              <t-popconfirm content="从常吃列表移除该食物？" @confirm="removeFreqFood(f.id)">
                <span class="wb-freq-x" @click.stop>×</span>
              </t-popconfirm>
            </t-tag>
          </div>

          <div v-for="(f, i) in form.foods" :key="i" class="wb-fitness-food-row">
            <t-input v-model="f.name" :placeholder="`食物 ${i + 1} 名称`" style="width: 180px" />
            <t-input-number v-model="f.grams" :min="0" :max="5000" :step="10" :decimal-places="0" placeholder="克重 g" theme="normal" style="width: 110px" @change="() => onGramsChange(f)" />
            <t-input-number v-model="f.kcal" :min="0" :max="5000" :step="10" :decimal-places="1" placeholder="千卡" theme="normal" style="width: 120px" />
            <t-link theme="danger" hover="color" @click="form.foods.splice(i, 1)">
              <delete-icon />
            </t-link>
          </div>
          <div v-if="!form.foods.length" class="wb-empty" style="padding: 8px 0">点上面的常吃食物快速添加，或点「添加食物」手动记一笔</div>
        </div>

        <div class="wb-fitness-summary">
          <span>摄入合计：<b>{{ totalIntakeKcal }}</b> 千卡</span>
          <span>单位时间运动消耗：
            <b>{{ unitBurnRate ? unitBurnRate + ' 千卡/小时' : '—' }}</b>
          </span>
          <t-space size="small">
            <t-button v-if="editingId" variant="text" theme="default" @click="startNew">取消编辑</t-button>
            <t-button theme="primary" :disabled="!form.date" @click="saveRecord">
              {{ editingId ? '更新当天记录' : '保存记录' }}
            </t-button>
          </t-space>
        </div>
      </t-form>
    </div>

    <!-- 历史记录 -->
    <div class="wb-table-card" style="margin-top: 16px">
      <t-table
        row-key="id"
        :data="historyDesc"
        :columns="columns"
        :loading="loading"
        :pagination="pagination"
        max-height="calc(100vh - 560px)"
      >
        <template #date-cell="{ row }">
          <span class="wb-journal-date">📅 {{ fmtDate(row.date) }}</span>
        </template>

        <template #weight-cell="{ row }">
          <span :class="{ 'wb-completed': deltaOf(row) < 0, 'wb-due': deltaOf(row) > 0 }">
            {{ row.weight != null ? row.weight + ' 斤' : '—' }}
            <t-tag v-if="deltaOf(row) !== null" size="small" variant="light" :theme="deltaOf(row) < 0 ? 'success' : 'danger'">
              {{ deltaOf(row) > 0 ? '+' : '' }}{{ deltaOf(row) }} 斤
            </t-tag>
          </span>
        </template>

        <template #foods-cell="{ row }">
          <span v-if="row.foods?.length">
            {{ row.foods.map((f) => f.name + (f.grams ? `(${f.grams}g)` : '')).join('、') }}
          </span>
          <span v-else class="wb-empty" style="padding: 0">—</span>
        </template>

        <template #intake-cell="{ row }">
          {{ intakeKcal(row) ? intakeKcal(row) + ' 千卡' : '—' }}
        </template>

        <template #exercise-cell="{ row }">
          {{ row.exerciseMin ? row.exerciseMin + ' 分钟' : '—' }}
        </template>

        <template #sleep-cell="{ row }">
          <span v-if="row.sleepHours" class="wb-created">{{ row.sleepHours }} 小时</span>
          <span v-else class="wb-empty" style="padding: 0">—</span>
        </template>

        <template #burned-cell="{ row }">
          {{ row.caloriesBurned ? row.caloriesBurned + ' 千卡' : '—' }}
        </template>

        <template #rate-cell="{ row }">
          <span v-if="burnRate(row)" class="wb-created">{{ burnRate(row) }} 千卡/小时</span>
          <span v-else class="wb-empty" style="padding: 0">—</span>
        </template>

        <template #op-cell="{ row }">
          <t-space size="4px">
            <t-link theme="primary" hover="color" @click="startEdit(row)">编辑</t-link>
            <t-popconfirm content="确认删除这条记录？" @confirm="removeOne(row.id)">
              <t-link theme="danger" hover="color">删除</t-link>
            </t-popconfirm>
          </t-space>
        </template>

        <template #empty>
          <div class="wb-empty">
            <p style="margin: 0; font-size: 28px">⚖️</p>
            <p style="margin: 8px 0 0">还没有记录，从上面的表单开始打卡吧</p>
          </div>
        </template>
      </t-table>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { MessagePlugin } from 'tdesign-vue-next'
import { AddIcon, AddRectangleIcon, DeleteIcon, HeartIcon, RocketIcon, ThunderIcon, ChartIcon, TimeIcon } from 'tdesign-icons-vue-next'
import * as api from '../api'
import { fmtDate } from '../utils/date'
import StatsCards from '../components/StatsCards.vue'

/* ---------- 数据 ---------- */
const loading = ref(false)
const records = ref([])
const editingId = ref(null)
const pagination = { defaultPageSize: 15, pageSizeOptions: [10, 15, 30, 50] }
// 常吃食物库（自动学习）
const freqFoods = ref([])

const todayStr = () => {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

const emptyForm = () => ({
  date: todayStr(),
  weight: null,
  foods: [],
  exerciseMin: null,
  caloriesBurned: null,
  sleepHours: null,
  note: ''
})
const form = ref(emptyForm())

async function load() {
  loading.value = true
  try {
    records.value = await api.listFitness()
  } catch (e) {
    MessagePlugin.error(e.message)
  } finally {
    loading.value = false
  }
}

async function loadFreqFoods() {
  try {
    const list = await api.listFreqFoods()
    freqFoods.value = list
      .sort((a, b) => b.useCount - a.useCount || (b.lastUsedAt || '').localeCompare(a.lastUsedAt || ''))
      .slice(0, 10)
  } catch { /* 常吃库加载失败不影响主流程 */ }
}
onMounted(() => {
  load()
  loadFreqFoods()
})

// 日期变化时：若该日期已有记录，自动载入原内容（避免空表单覆盖已有数据；同日追加饮食/运动时直接带着旧数据改）
watch(
  () => form.value.date,
  (v) => {
    if (!v || editingId.value) return
    const hit = records.value.find((r) => r.date === v)
    if (hit) {
      form.value = {
        date: v,
        weight: hit.weight,
        foods: (hit.foods || []).map((f) => {
          const known = freqFoods.value.find((x) => x.name === f.name)
          return { ...f, kcalPer100g: known?.kcalPer100g ?? null }
        }),
        exerciseMin: hit.exerciseMin,
        caloriesBurned: hit.caloriesBurned,
        sleepHours: hit.sleepHours,
        note: hit.note || ''
      }
      MessagePlugin.info(`${fmtDate(v)} 已有记录，已载入原内容，修改后保存将覆盖当天记录`)
    }
  }
)

/* ---------- 常吃食物快捷添加 ---------- */
function addFreqFood(f) {
  // 已有同名行则不重复添加
  if (form.value.foods.some((x) => x.name === f.name)) {
    MessagePlugin.warning(`「${f.name}」已在列表里`)
    return
  }
  form.value.foods.push({ name: f.name, grams: null, kcal: null, kcalPer100g: f.kcalPer100g })
}

async function removeFreqFood(id) {
  try {
    await api.deleteFreqFood(id)
    freqFoods.value = freqFoods.value.filter((f) => f.id !== id)
    MessagePlugin.success('已从常吃列表移除')
  } catch (e) {
    MessagePlugin.error(e.message)
  }
}

// 填了克重且已知热量密度 → 千卡自动计算（手动改过的千卡在下次改克重时刷新）
function onGramsChange(row) {
  if (row.grams && row.kcalPer100g) {
    row.kcal = Math.round(((row.grams * row.kcalPer100g) / 100) * 10) / 10
  }
}

/* ---------- 计算逻辑 ---------- */
// 按日期升序（历史轨迹）
const historyAsc = computed(() =>
  [...records.value].sort((a, b) => (a.date || '').localeCompare(b.date || ''))
)
// 表格展示：倒序（最近在上）
const historyDesc = computed(() => [...historyAsc.value].reverse())

const intakeKcal = (row) =>
  row.foods?.length
    ? row.foods.reduce((s, f) => s + (Number.isFinite(f.kcal) ? f.kcal : 0), 0)
    : null

// 单位时间消耗 = 消耗千卡 ÷ 运动分钟 × 60
const burnRate = (row) => {
  if (!row.caloriesBurned || !row.exerciseMin) return null
  return Math.round((row.caloriesBurned / row.exerciseMin) * 60 * 10) / 10
}

const totalIntakeKcal = computed(() =>
  (form.value.foods || []).reduce((s, f) => s + (Number.isFinite(f.kcal) ? f.kcal : 0), 0)
)

const unitBurnRate = computed(() => burnRate({ caloriesBurned: form.value.caloriesBurned, exerciseMin: form.value.exerciseMin }))

// 与上一条记录的体重差
const deltaOf = (row) => {
  if (row.weight == null) return null
  const idx = historyAsc.value.findIndex((r) => r.id === row.id)
  if (idx <= 0) return null
  const prev = historyAsc.value[idx - 1]
  if (prev?.weight == null) return null
  const d = Math.round((row.weight - prev.weight) * 10) / 10
  return d === 0 ? null : d
}

/* ---------- 统计卡片 ---------- */
const statCards = computed(() => {
  const asc = historyAsc.value.filter((r) => r.weight != null)
  const latest = asc[asc.length - 1]
  const first = asc[0]
  let total = null
  if (latest && first && first.id !== latest.id) {
    total = Math.round((first.weight - latest.weight) * 10) / 10
  }
  let week = null
  if (latest) {
    const weekAgo = new Date(latest.date + 'T00:00:00')
    weekAgo.setDate(weekAgo.getDate() - 7)
    const wa = weekAgo.toISOString().slice(0, 10)
    const base = [...asc].reverse().find((r) => r.date <= wa)
    if (base && base.id !== latest.id) {
      week = Math.round((base.weight - latest.weight) * 10) / 10
    }
  }
  const totalMin = records.value.reduce((s, r) => s + (r.exerciseMin || 0), 0)
  const totalBurn = records.value.reduce((s, r) => s + (r.caloriesBurned || 0), 0)
  return [
    { key: 'weight', label: latest ? `最新体重 (${fmtDate(latest.date)})` : '最新体重', value: latest ? latest.weight + ' 斤' : '—', icon: HeartIcon, color: '' },
    { key: 'total', label: '累计减重', value: total == null ? '—' : `${total > 0 ? '-' : '+'}${Math.abs(total)} 斤`, icon: ChartIcon, color: '' },
    { key: 'week', label: '近 7 天变化', value: week == null ? '—' : `${week > 0 ? '-' : '+'}${Math.abs(week)} 斤`, icon: TimeIcon, color: '' },
    { key: 'burn', label: `累计运动 ${Math.round(totalMin / 60 * 10) / 10} h`, value: totalBurn ? `${totalBurn} 千卡` : '—', icon: ThunderIcon, color: '' }
  ]
})

/* ---------- 表单操作 ---------- */
function startNew() {
  editingId.value = null
  form.value = emptyForm()
}

function startEdit(row) {
  editingId.value = row.id
  form.value = {
    date: row.date,
    weight: row.weight,
    foods: (row.foods || []).map((f) => {
      const known = freqFoods.value.find((x) => x.name === f.name)
      return { ...f, kcalPer100g: known?.kcalPer100g ?? null }
    }),
    exerciseMin: row.exerciseMin,
    caloriesBurned: row.caloriesBurned,
    sleepHours: row.sleepHours,
    note: row.note || ''
  }
  window.scrollTo({ top: 0, behavior: 'smooth' })
  // 明确提示表单已回填：高亮 + 聚焦晨重输入框
  setTimeout(() => {
    document.querySelector('.wb-fitness-grid input[placeholder="斤"]')?.focus()
  }, 250)
}

function addFoodRow() {
  form.value.foods.push({ name: '', grams: null, kcal: null, kcalPer100g: null })
}

async function saveRecord() {
  if (!form.value.date) {
    MessagePlugin.warning('请选择日期')
    return
  }
  const f = form.value
  const payload = {
    date: f.date,
    weight: f.weight ?? '',
    // 只提交名称/克重/千卡，内部字段 kcalPer100g 不入库
    foods: f.foods
      .filter((x) => x.name.trim())
      .map(({ name, grams, kcal }) => ({ name: name.trim(), grams: grams ?? '', kcal: kcal ?? '' })),
    exerciseMin: f.exerciseMin ?? '',
    caloriesBurned: f.caloriesBurned ?? '',
    sleepHours: f.sleepHours ?? '',
    note: f.note
  }
  try {
    const saved = await api.saveFitness(payload)
    MessagePlugin.success(`已保存 ${fmtDate(saved.date)} 的记录 ✅`)
    // 保存后还原为全新的录入状态（服务端按日期 upsert，重复保存同一天也不会产生重复记录）
    startNew()
    await load()
    loadFreqFoods() // 服务端已自动学习，刷新常吃列表
  } catch (e) {
    MessagePlugin.error(e.message)
  }
}

async function removeOne(id) {
  try {
    await api.deleteFitness(id)
    if (editingId.value === id) startNew()
    MessagePlugin.success('已删除')
    await load()
  } catch (e) {
    MessagePlugin.error(e.message)
  }
}

/* ---------- 表格 ---------- */
const columns = [
  { colKey: 'date', title: '日期', cell: 'date-cell', width: 120 },
  { colKey: 'weight', title: '晨重', cell: 'weight-cell', width: 170 },
  { colKey: 'foods', title: '饮食', cell: 'foods-cell', minWidth: 200 },
  { colKey: 'intake', title: '摄入合计', cell: 'intake-cell', width: 110 },
  { colKey: 'exerciseMin', title: '运动', cell: 'exercise-cell', width: 100 },
  { colKey: 'sleepHours', title: '睡眠', cell: 'sleep-cell', width: 90 },
  { colKey: 'caloriesBurned', title: '运动消耗', cell: 'burned-cell', width: 110 },
  { colKey: 'rate', title: '单位时间运动消耗', cell: 'rate-cell', width: 170 },
  { colKey: 'op', title: '操作', cell: 'op-cell', width: 110 }
]
</script>
