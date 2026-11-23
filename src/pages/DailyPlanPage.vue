<template>
  <div class="wb-content">
    <!-- 长期事项横幅 -->
    <div class="wb-plan-note">
      <div class="wb-plan-note-head">
        <span class="wb-plan-note-title">📌 长期需要做的事情</span>
        <t-button variant="text" size="small" @click="openNoteEdit">编辑</t-button>
      </div>
      <p class="wb-plan-note-text">{{ planNote || '（点击"编辑"填写长期需要坚持的事情）' }}</p>
    </div>

    <!-- 页面头：日期切换 + 计划开关（只有今天可以开关） -->
    <div class="wb-page-head">
      <div class="wb-plan-nav">
        <h3>{{ pageDayLabel }}</h3>
        <t-button variant="outline" size="small" @click="shiftDay(-1)">前一天</t-button>
        <input v-model="selectedDate" type="date" class="wb-plan-date-input" />
        <t-button variant="outline" size="small" @click="shiftDay(1)">后一天</t-button>
        <t-button v-if="!isToday" theme="primary" variant="text" size="small" @click="selectedDate = todayStr">回到今天</t-button>
      </div>
      <div class="wb-plan-switch">
        <template v-if="isToday">
          <span class="wb-plan-switch-label">计划开关</span>
          <t-switch :value="enabled" :disabled="saving" @change="onSwitch" />
        </template>
        <t-tag :theme="status.theme" variant="light">{{ status.label }}</t-tag>
      </div>
    </div>

    <div class="wb-plan-card">
      <div class="wb-plan-card-head">
        <span class="wb-plan-card-title">工作内容<span v-if="isPast" class="wb-plan-readonly">（历史计划，只读）</span><span v-else-if="isFuture" class="wb-plan-readonly">（可提前规划）</span></span>
        <span class="wb-plan-progress">已完成 <b>{{ doneCount }}</b> / {{ tasks.length }}</span>
      </div>

      <!-- 全天：没有开始时间的事项置顶 -->
      <div class="wb-plan-allday">
        <span class="wb-plan-allday-label">全天</span>
        <div class="wb-plan-chips">
          <div
            v-for="t in untimedTasks"
            :key="t.id"
            class="wb-plan-chip"
            :class="[toneOf(toneIndex(t.id)), { done: t.done }]"
            @click="startEdit(t)"
          >
            <button
              type="button"
              role="radio"
              class="wb-plan-check"
              :class="{ done: t.done }"
              :aria-checked="t.done"
              :disabled="locked"
              @click.stop="toggleTask(t)"
            >
              <span v-if="t.done">✓</span>
            </button>
            <span class="wb-plan-chip-text">{{ t.text }}</span>
          </div>
          <button v-if="!locked" type="button" class="wb-plan-chip wb-plan-chip-add" @click="openCreate">+ 新增</button>
        </div>
      </div>

      <!-- 时间轴：固定的早会 / 休息 + 有开始时间的工作内容 -->
      <div class="wb-plan-timeline" :style="{ height: timelineHeight + 'px' }">
        <div v-for="h in hours" :key="h" class="wb-plan-hour" :style="{ top: yOf(h * 60) + 'px' }">
          <span>{{ pad(h) }}:00</span>
        </div>
        <div v-if="nowY !== null" class="wb-plan-now" :style="{ top: nowY + 'px' }"></div>
        <div
          v-for="it in timelineItems"
          :key="it.key"
          class="wb-plan-block"
          :class="[it.task ? it.tone : 'fixed', { done: it.task?.done }]"
          :style="blockStyle(it)"
          @click="it.task && startEdit(it.task)"
        >
          <button
            v-if="it.task"
            type="button"
            role="radio"
            class="wb-plan-check"
            :class="{ done: it.task.done }"
            :aria-checked="it.task.done"
            :disabled="locked"
            @click.stop="toggleTask(it.task)"
          >
            <span v-if="it.task.done">✓</span>
          </button>
          <div class="wb-plan-block-title">{{ it.title }}</div>
          <div class="wb-plan-block-time">{{ it.range }}</div>
          <div v-if="it.task?.note" class="wb-plan-block-note">{{ it.task.note }}</div>
        </div>
      </div>

      <div class="wb-plan-foot">
        <span v-if="plan.completedAt" class="wb-plan-completed">已于 {{ fmtDateTime(plan.completedAt) }} 完成</span>
        <t-popconfirm v-if="isToday" content="确认完成今日计划？完成后开关将自动关闭" @confirm="completePlan">
          <t-button theme="success" :disabled="!enabled || saving || locked">完成今日计划</t-button>
        </t-popconfirm>
      </div>
    </div>

    <!-- 新增 / 编辑弹窗 -->
    <t-dialog
      v-model:visible="dialogVisible"
      :header="editingId ? '编辑工作内容' : '新增工作内容'"
      confirm-btn="保存"
      @confirm="saveDialog"
    >
      <div class="wb-plan-form">
        <div class="wb-plan-form-item">
          <label>工作内容</label>
          <t-input v-model="draft.text" placeholder="例如：写接口文档" clearable />
        </div>
        <div class="wb-plan-form-item">
          <label>开始时间</label>
          <t-time-picker v-model="draft.time" format="HH:mm" clearable placeholder="不设置则放在全天" style="width: 100%" />
        </div>
        <div class="wb-plan-form-item">
          <label>时长（分钟）</label>
          <t-input-number v-model="draft.duration" :min="0" :step="5" placeholder="默认 30 分钟" style="width: 100%" />
        </div>
        <div class="wb-plan-form-item">
          <label>完成情况</label>
          <t-input v-model="draft.note" placeholder="记录完成情况" />
        </div>
        <t-popconfirm v-if="editingId" content="确认删除这项工作内容？" @confirm="removeFromDialog">
          <t-link theme="danger" hover="color">删除这项工作内容</t-link>
        </t-popconfirm>
      </div>
    </t-dialog>

    <!-- 长期事项编辑弹窗 -->
    <t-dialog
      v-model:visible="noteDialogVisible"
      header="编辑长期需要做的事情"
      confirm-btn="保存"
      @confirm="saveNote"
    >
      <t-textarea
        v-model="noteDraft"
        :autosize="{ minRows: 5, maxRows: 12 }"
        placeholder="填写长期需要坚持的事情"
      />
    </t-dialog>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { MessagePlugin } from 'tdesign-vue-next'
import * as api from '../api'
import { fmtDateTime } from '../utils/date'

/* ---------- 日期：每分钟检查一次，跨天后自动切换到新的一天 ---------- */
const pad = (n) => String(n).padStart(2, '0')
const now = ref(new Date())
const timer = setInterval(() => (now.value = new Date()), 60 * 1000)
onBeforeUnmount(() => clearInterval(timer))

const todayStr = computed(() => `${now.value.getFullYear()}-${pad(now.value.getMonth() + 1)}-${pad(now.value.getDate())}`)

// 当前查看的日期；跨天时如果正在看今天，自动跟到新的一天
const selectedDate = ref(todayStr.value)
const isToday = computed(() => selectedDate.value === todayStr.value)
const dateCmp = () => (selectedDate.value < todayStr.value ? -1 : selectedDate.value > todayStr.value ? 1 : 0)
const isPast = computed(() => dateCmp() < 0)
const isFuture = computed(() => dateCmp() > 0)
const pageDayLabel = computed(() => (isToday.value ? '今日计划' : isFuture.value ? '未来计划' : '历史计划'))
watch(todayStr, (next, prev) => {
  if (selectedDate.value === prev) selectedDate.value = next
})

function shiftDay(n) {
  const d = new Date(`${selectedDate.value}T00:00:00`)
  d.setDate(d.getDate() + n)
  selectedDate.value = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/* ---------- 时间轴常量 ---------- */
const DEFAULT_START_HOUR = 8
const DEFAULT_END_HOUR = 17
const PX_PER_MIN = 1.2
const DEFAULT_DURATION = 30
const TONE_COUNT = 5
// 固定安排：早会、两段休息，不可编辑
const FIXED = [
  { key: 'fixed-meeting', title: '早会', start: '08:30', duration: 15 },
  { key: 'fixed-lunch', title: '休息', start: '12:00', duration: 60 },
  { key: 'fixed-evening', title: '休息', start: '17:30', duration: 30 }
]

const toMin = (hm) => {
  const [h, m] = hm.split(':').map(Number)
  return h * 60 + m
}
const fmtMin = (m) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`
const toneOf = (i) => `wb-plan-tone-${i % TONE_COUNT}`

/* ---------- 数据 ---------- */
const saving = ref(false)
const records = ref([])

// 没有记录的日期视为空计划
const plan = computed(
  () => records.value.find((r) => r.date === selectedDate.value) || { date: selectedDate.value, enabled: false, tasks: [], completedAt: null }
)
const enabled = computed(() => plan.value.enabled)
const tasks = computed(() => plan.value.tasks)
const doneCount = computed(() => tasks.value.filter((t) => t.done).length)
// 历史日期只读；未来日期可提前规划；今天完成后锁定内容，重新打开开关才能再次编辑
const locked = computed(() => isPast.value || !!plan.value.completedAt)

const status = computed(() => {
  if (plan.value.completedAt) return { label: '已完成', theme: 'success' }
  if (isPast.value) return { label: '未完成', theme: 'warning' }
  if (isFuture.value) return { label: '待开始', theme: 'default' }
  if (plan.value.enabled) return { label: '进行中', theme: 'primary' }
  return { label: '未开始', theme: 'default' }
})

const untimedTasks = computed(() => tasks.value.filter((t) => !t.time))
const toneIndex = (id) => tasks.value.findIndex((t) => t.id === id)

/* ---------- 时间轴布局：重叠的块并排显示 ---------- */
function layoutBlocks(items) {
  const colEnds = []
  for (const it of items) {
    let c = colEnds.findIndex((end) => end <= it.start)
    if (c === -1) c = colEnds.push(it.end) - 1
    else colEnds[c] = it.end
    it.col = c
  }
  return items.map((it) => ({ ...it, cols: colEnds.length, range: `${fmtMin(it.start)}–${fmtMin(it.end)}` }))
}

const timelineItems = computed(() => {
  const fixed = FIXED.map((f) => ({
    key: f.key,
    title: f.title,
    start: toMin(f.start),
    end: toMin(f.start) + f.duration,
    task: null,
    tone: null
  }))
  const work = tasks.value
    .filter((t) => t.time)
    .map((t) => {
      const start = toMin(t.time)
      return {
        key: t.id,
        title: t.text,
        start,
        end: start + (t.duration || DEFAULT_DURATION),
        task: t,
        tone: toneOf(toneIndex(t.id))
      }
    })
  return layoutBlocks([...fixed, ...work].sort((a, b) => a.start - b.start))
})

const startHour = computed(() =>
  Math.min(DEFAULT_START_HOUR, Math.floor(Math.min(...timelineItems.value.map((i) => i.start)) / 60))
)
const endHour = computed(() =>
  Math.max(DEFAULT_END_HOUR, Math.ceil(Math.max(...timelineItems.value.map((i) => i.end)) / 60))
)
const hours = computed(() => Array.from({ length: endHour.value - startHour.value + 1 }, (_, i) => startHour.value + i))
const timelineHeight = computed(() => (endHour.value - startHour.value) * 60 * PX_PER_MIN)

const yOf = (min) => (min - startHour.value * 60) * PX_PER_MIN
const blockStyle = (it) => ({
  top: `${yOf(it.start)}px`,
  height: `${Math.max((it.end - it.start) * PX_PER_MIN - 4, 36)}px`,
  left: `calc(72px + (100% - 80px) * ${it.col / it.cols})`,
  width: `calc((100% - 80px) / ${it.cols} - 4px)`
})

// 当前时间红线
const nowY = computed(() => {
  if (!isToday.value) return null
  const m = now.value.getHours() * 60 + now.value.getMinutes()
  return m >= startHour.value * 60 && m <= endHour.value * 60 ? yOf(m) : null
})

async function load() {
  try {
    records.value = await api.listDailyPlan()
    planNote.value = await api.getDailyPlanNote()
  } catch (e) {
    MessagePlugin.error(e.message)
  }
}
onMounted(load)

/* ---------- 长期事项横幅 ---------- */
const planNote = ref('')
const noteDialogVisible = ref(false)
const noteDraft = ref('')

function openNoteEdit() {
  noteDraft.value = planNote.value
  noteDialogVisible.value = true
}

async function saveNote() {
  const content = (noteDraft.value || '').trim()
  if (!content) return MessagePlugin.warning('内容不能为空')
  try {
    planNote.value = await api.saveDailyPlanNote(content)
    noteDialogVisible.value = false
    MessagePlugin.success('长期事项已更新')
  } catch (e) {
    MessagePlugin.error(e.message)
  }
}

async function save(patch) {
  if (locked.value) return null
  saving.value = true
  try {
    const saved = await api.saveDailyPlan({ date: selectedDate.value, ...patch })
    records.value = [...records.value.filter((r) => r.date !== saved.date), saved]
    return saved
  } catch (e) {
    MessagePlugin.error(e.message)
    return null
  } finally {
    saving.value = false
  }
}

/* ---------- 开关 / 完成 ---------- */
async function onSwitch(value) {
  const saved = await save({ enabled: value })
  if (saved && value) MessagePlugin.success('今日计划已开始')
}

async function completePlan() {
  const saved = await save({ completed: true, tasks: plan.value.tasks })
  if (saved) MessagePlugin.success('今日计划已完成，开关已关闭')
}

/* ---------- 勾选 ---------- */
// 服务端根据前后状态记录完成时刻
function toggleTask(t) {
  save({ tasks: tasks.value.map((x) => (x.id === t.id ? { ...x, done: !x.done } : x)) })
}

/* ---------- 新增 / 编辑弹窗 ---------- */
const dialogVisible = ref(false)
const editingId = ref(null)
const draft = ref({ text: '', time: null, duration: null, note: '' })

function openCreate() {
  editingId.value = null
  draft.value = { text: '', time: null, duration: null, note: '' }
  dialogVisible.value = true
}

function startEdit(t) {
  if (locked.value) return
  editingId.value = t.id
  draft.value = { text: t.text, time: t.time || null, duration: t.duration || null, note: t.note || '' }
  dialogVisible.value = true
}

async function saveDialog() {
  const text = (draft.value.text || '').trim()
  if (!text) return MessagePlugin.warning('请输入工作内容')
  const item = {
    text,
    time: draft.value.time || '',
    duration: Number(draft.value.duration) || 0,
    note: (draft.value.note || '').trim()
  }
  const list = editingId.value
    ? tasks.value.map((x) => (x.id === editingId.value ? { ...x, ...item } : x))
    : [...tasks.value, { ...item, done: false }]
  const saved = await save({ tasks: list })
  if (saved) dialogVisible.value = false
}

async function removeFromDialog() {
  const saved = await save({ tasks: tasks.value.filter((t) => t.id !== editingId.value) })
  if (saved) dialogVisible.value = false
}
</script>
