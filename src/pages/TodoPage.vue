<template>
  <div class="wb-content">
    <!-- 页面头 -->
    <div class="wb-page-head">
      <h3>待办工作台</h3>
      <t-space size="small">
        <t-button variant="outline" @click="triggerImport">
          <template #icon><upload-icon /></template>导入
        </t-button>
        <t-button variant="outline" @click="exportJson">
          <template #icon><download-icon /></template>导出
        </t-button>
        <t-button theme="primary" @click="openCreate">
          <template #icon><add-icon /></template>新建任务
        </t-button>
      </t-space>
    </div>

    <!-- 领域切换：工作 / 生活（同一页面内 Tab 隔离数据） -->
    <div class="wb-domain-tabs-card">
      <t-tabs v-model="domain" @change="onDomainChange">
        <t-tab-panel value="work" label="💼 工作" />
        <t-tab-panel value="life" label="🏠 生活" />
      </t-tabs>
    </div>

    <!-- 统计卡片（点击可快速筛选） -->
    <StatsCards :cards="statCards" :active="activeStat" @select="toggleStatFilter" />

    <!-- 工具栏 -->
    <div class="wb-toolbar">
      <t-input v-model="keyword" placeholder="搜索标题 / 描述 / 标签" clearable style="width: 240px">
        <template #icon><search-icon /></template>
      </t-input>

      <t-radio-group v-model="statusFilter" variant="default-filled">
        <t-radio-button value="all">全部</t-radio-button>
        <t-radio-button value="todo">待办</t-radio-button>
        <t-radio-button value="doing">进行中</t-radio-button>
        <t-radio-button value="done">已完成</t-radio-button>
        <t-radio-button value="overdue">已逾期</t-radio-button>
      </t-radio-group>

      <t-select v-model="priorityFilter" style="width: 130px" clearable placeholder="全部优先级">
        <t-option value="high" label="高" />
        <t-option value="medium" label="中" />
        <t-option value="low" label="低" />
      </t-select>

      <div class="spacer" />

      <template v-if="selectedIds.length">
        <t-button variant="outline" theme="success" size="small" @click="batchDone">
          批量完成 ({{ selectedIds.length }})
        </t-button>
        <t-popconfirm content="确认删除选中的任务？" @confirm="batchRemove">
          <t-button variant="outline" theme="danger" size="small">批量删除</t-button>
        </t-popconfirm>
      </template>
      <t-popconfirm content="确认清空所有已完成任务？" @confirm="onClearCompleted">
        <t-button variant="text" theme="default" size="small">清理已完成</t-button>
      </t-popconfirm>
    </div>

    <!-- 任务表格 -->
    <div class="wb-table-card">
      <t-table
        row-key="id"
        :data="filteredTodos"
        :columns="columns"
        :selected-row-keys="selectedIds"
        :loading="loading"
        :pagination="pagination"
        max-height="calc(100vh - 380px)"
        @select-change="onSelectChange"
      >
        <template #title-cell="{ row }">
          <div class="wb-title-cell" :class="{ done: row.status === 'done' }">
            <div class="title">{{ row.title }}</div>
            <div v-if="row.desc" class="desc">{{ row.desc }}</div>
          </div>
        </template>

        <template #status-cell="{ row }">
          <t-select
            :value="row.status"
            size="small"
            style="width: 104px"
            @change="(val) => onStatusChange(row, val)"
          >
            <t-option value="todo" label="待办" />
            <t-option value="doing" label="进行中" />
            <t-option value="done" label="已完成" />
          </t-select>
        </template>

        <template #priority-cell="{ row }">
          <t-tag :theme="priorityMap[row.priority].theme" variant="light">
            {{ priorityMap[row.priority].label }}
          </t-tag>
        </template>

        <template #due-cell="{ row }">
          <span class="wb-due" :class="{ overdue: isOverdue(row), none: !row.dueDate }">
            {{ row.dueDate ? (isOverdue(row) ? '已逾期 · ' : '') + row.dueDate : '无截止日期' }}
          </span>
        </template>

        <template #created-cell="{ row }">
          <span class="wb-created">{{ fmtDateTime(row.createdAt) }}</span>
        </template>

        <template #completed-cell="{ row }">
          <span class="wb-created" :class="{ 'wb-completed': row.completedAt }">
            {{ row.completedAt ? fmtDateTime(row.completedAt) : '—' }}
          </span>
        </template>

        <template #tags-cell="{ row }">
          <t-tag v-for="tag in row.tags" :key="tag" variant="light" size="small" style="margin-right: 4px">
            {{ tag }}
          </t-tag>
          <span v-if="!row.tags?.length" class="wb-empty" style="padding: 0">—</span>
        </template>

        <template #op-cell="{ row }">
          <t-space size="4px">
            <t-link theme="primary" hover="color" @click="openEdit(row)">编辑</t-link>
            <t-popconfirm content="确认删除该任务？" @confirm="removeOne(row.id)">
              <t-link theme="danger" hover="color">删除</t-link>
            </t-popconfirm>
          </t-space>
        </template>

        <template #empty>
          <div class="wb-empty">
            <p style="margin: 0; font-size: 28px">🗂️</p>
            <p style="margin: 8px 0 0">没有符合条件的任务，换个筛选条件或新建一个任务吧</p>
          </div>
        </template>
      </t-table>
    </div>

    <!-- 新建 / 编辑弹窗 -->
    <TodoFormDialog v-model:visible="dialogVisible" :todo="editingTodo" :domain="domain" @saved="load" />

    <!-- 隐藏的文件选择（导入 JSON） -->
    <input
      ref="fileInputRef"
      type="file"
      accept=".json,application/json"
      style="display: none"
      @change="onFilePicked"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { MessagePlugin, DialogPlugin } from 'tdesign-vue-next'
import {
  AddIcon, SearchIcon, DownloadIcon, UploadIcon,
  TaskIcon, TimeIcon, CheckCircleIcon, ErrorCircleIcon
} from 'tdesign-icons-vue-next'
import * as api from '../api'
import { fmtDateTime } from '../utils/date'
import StatsCards from '../components/StatsCards.vue'
import TodoFormDialog from '../components/TodoFormDialog.vue'

/* ---------- 常量 ---------- */
const priorityMap = {
  high: { label: '高', theme: 'danger' },
  medium: { label: '中', theme: 'warning' },
  low: { label: '低', theme: 'success' }
}

/* ---------- 数据 ---------- */
const loading = ref(false)
const todos = ref([])
const selectedIds = ref([])
const domain = ref('work') // work: 工作领域 / life: 生活领域

const keyword = ref('')
const statusFilter = ref('all')
const priorityFilter = ref('')
const activeStat = ref('')
const pagination = { defaultPageSize: 15, pageSizeOptions: [10, 15, 30, 50] }

async function load() {
  loading.value = true
  try {
    todos.value = await api.listTodos(domain.value)
  } catch (e) {
    MessagePlugin.error(e.message)
  } finally {
    loading.value = false
  }
}
onMounted(load)

// 切换领域：重置筛选条件后重新加载对应数据
function onDomainChange() {
  keyword.value = ''
  statusFilter.value = 'all'
  priorityFilter.value = ''
  activeStat.value = ''
  selectedIds.value = []
  load()
}

/* ---------- 工具函数 ---------- */
const todayStr = () => {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
const isOverdue = (row) => row.status !== 'done' && !!row.dueDate && row.dueDate < todayStr()

const filteredTodos = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  return todos.value
    .filter((t) => {
      if (statusFilter.value === 'overdue') {
        if (!isOverdue(t)) return false
      } else if (statusFilter.value !== 'all' && t.status !== statusFilter.value) {
        return false
      }
      if (priorityFilter.value && t.priority !== priorityFilter.value) return false
      if (kw) {
        const hay = `${t.title} ${t.desc} ${t.tags.join(' ')}`.toLowerCase()
        if (!hay.includes(kw)) return false
      }
      return true
    })
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
})

/* ---------- 统计 ---------- */
const stats = computed(() => {
  const list = todos.value
  return {
    total: list.length,
    doing: list.filter((t) => t.status === 'doing').length,
    done: list.filter((t) => t.status === 'done').length,
    overdue: list.filter((t) => isOverdue(t)).length
  }
})

const statCards = computed(() => [
  { key: 'all', label: '全部任务', value: stats.value.total, icon: TaskIcon, color: '' },
  { key: 'doing', label: '进行中', value: stats.value.doing, icon: TimeIcon, color: '' },
  { key: 'done', label: '已完成', value: stats.value.done, icon: CheckCircleIcon, color: 'done' },
  { key: 'overdue', label: '已逾期', value: stats.value.overdue, icon: ErrorCircleIcon, color: 'overdue' }
])

function toggleStatFilter(key) {
  activeStat.value = activeStat.value === key ? '' : key
  statusFilter.value = activeStat.value || 'all'
  if (activeStat.value) keyword.value = ''
}

/* ---------- 表格 ---------- */
const columns = [
  { colKey: 'row-select', type: 'multiple', width: 46 },
  { colKey: 'title', title: '任务', cell: 'title-cell', minWidth: 260 },
  { colKey: 'status', title: '状态', cell: 'status-cell', width: 120 },
  { colKey: 'priority', title: '优先级', cell: 'priority-cell', width: 90 },
  { colKey: 'dueDate', title: '截止日期', cell: 'due-cell', width: 150 },
  { colKey: 'createdAt', title: '创建时间', cell: 'created-cell', width: 150 },
  { colKey: 'completedAt', title: '完成时间', cell: 'completed-cell', width: 150 },
  { colKey: 'tags', title: '标签', cell: 'tags-cell', minWidth: 120 },
  { colKey: 'op', title: '操作', cell: 'op-cell', width: 120 }
]

function onSelectChange(val) {
  selectedIds.value = val
}

/* ---------- 增删改 ---------- */
const dialogVisible = ref(false)
const editingTodo = ref(null)

function openCreate() {
  editingTodo.value = null
  dialogVisible.value = true
}

function openEdit(row) {
  editingTodo.value = row
  dialogVisible.value = true
}

async function onStatusChange(row, val) {
  try {
    await api.updateTodo(row.id, domain.value, { status: val })
    MessagePlugin.success(val === 'done' ? '已标记为完成 🎉' : '状态已更新')
    await load()
  } catch (e) {
    MessagePlugin.error(e.message)
    await load()
  }
}

async function removeOne(id) {
  try {
    await api.deleteTodo(id, domain.value)
    MessagePlugin.success('已删除')
    await load()
  } catch (e) {
    MessagePlugin.error(e.message)
  }
}

async function batchDone() {
  try {
    await Promise.all(selectedIds.value.map((id) => api.updateTodo(id, domain.value, { status: 'done' })))
    MessagePlugin.success(`已完成 ${selectedIds.value.length} 个任务`)
    selectedIds.value = []
    await load()
  } catch (e) {
    MessagePlugin.error(e.message)
  }
}

async function batchRemove() {
  try {
    await api.batchDelete(selectedIds.value, domain.value)
    MessagePlugin.success('已批量删除')
    selectedIds.value = []
    await load()
  } catch (e) {
    MessagePlugin.error(e.message)
  }
}

async function onClearCompleted() {
  try {
    const { removed } = await api.clearCompleted(domain.value)
    MessagePlugin.success(removed ? `已清理 ${removed} 个已完成任务` : '没有可清理的任务')
    await load()
  } catch (e) {
    MessagePlugin.error(e.message)
  }
}

/* ---------- 导入 / 导出 ---------- */
const fileInputRef = ref(null)
function triggerImport() {
  fileInputRef.value?.click()
}

async function onFilePicked(ev) {
  const file = ev.target.files?.[0]
  ev.target.value = ''
  if (!file) return
  try {
    const text = await file.text()
    const parsed = JSON.parse(text)
    const list = Array.isArray(parsed) ? parsed : parsed.todos
    if (!Array.isArray(list)) throw new Error('文件格式不正确')
    const dialog = DialogPlugin.confirm({
      header: '确认导入',
      body: `将导入 ${list.length} 条任务并【覆盖】当前所有数据，是否继续？`,
      confirmBtn: { content: '覆盖导入', theme: 'danger' },
      onConfirm: async () => {
        try {
          const { count } = await api.importTodos(list)
          MessagePlugin.success(`已导入 ${count} 条任务`)
          await load()
        } catch (e) {
          MessagePlugin.error(e.message)
        }
        dialog.destroy()
      }
    })
  } catch (e) {
    MessagePlugin.error(e.message || '文件解析失败')
  }
}

function exportJson() {
  const a = document.createElement('a')
  a.href = '/api/export'
  a.download = 'todo-workbench-export.json'
  a.click()
  MessagePlugin.success('已开始下载 JSON 备份')
}
</script>
