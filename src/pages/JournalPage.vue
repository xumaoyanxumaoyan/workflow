<template>
  <div class="wb-content">
    <!-- 页面头 -->
    <div class="wb-page-head">
      <h3>写日志</h3>
      <t-button theme="primary" @click="openCreate">
        <template #icon><add-icon /></template>写一篇
      </t-button>
    </div>

    <!-- 统计卡片 -->
    <StatsCards :cards="statCards" />

    <!-- 工具栏 -->
    <div class="wb-toolbar">
      <t-input v-model="keyword" placeholder="搜索标题 / 内容 / 标签" clearable style="width: 240px">
        <template #icon><search-icon /></template>
      </t-input>

      <t-select v-model="moodFilter" style="width: 140px" clearable placeholder="全部心情">
        <t-option value="great" label="😊 美好" />
        <t-option value="ok" label="😐 一般" />
        <t-option value="anxious" label="😰 焦虑" />
        <t-option value="bad" label="😞 低落" />
      </t-select>

      <t-date-picker
        v-model="monthFilter"
        mode="month"
        style="width: 160px"
        clearable
        placeholder="按月份筛选"
      />
    </div>

    <!-- 日志列表 -->
    <div class="wb-table-card">
      <t-table
        row-key="id"
        :data="filteredJournals"
        :columns="columns"
        :loading="loading"
        :pagination="pagination"
        max-height="calc(100vh - 380px)"
      >
        <template #date-cell="{ row }">
          <span class="wb-journal-date">📅 {{ fmtDate(row.date) }}</span>
        </template>

        <template #content-cell="{ row }">
          <div class="wb-title-cell">
            <div class="title">{{ row.title || '（无标题）' }}</div>
            <div class="desc">{{ row.content }}</div>
          </div>
        </template>

        <template #mood-cell="{ row }">
          <t-tag :theme="moodMap[row.mood]?.theme || 'default'" variant="light">
            {{ moodMap[row.mood]?.label || row.mood }}
          </t-tag>
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
            <t-popconfirm content="确认删除这篇日志？" @confirm="removeOne(row.id)">
              <t-link theme="danger" hover="color">删除</t-link>
            </t-popconfirm>
          </t-space>
        </template>

        <template #empty>
          <div class="wb-empty">
            <p style="margin: 0; font-size: 28px">📝</p>
            <p style="margin: 8px 0 0">还没有日志，点击右上角「写一篇」记录今天吧</p>
          </div>
        </template>
      </t-table>
    </div>

    <!-- 写日志弹窗 -->
    <JournalFormDialog v-model:visible="dialogVisible" :journal="editingJournal" @saved="load" />
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { MessagePlugin } from 'tdesign-vue-next'
import { AddIcon, SearchIcon, BookIcon, CalendarIcon, SmileIcon } from 'tdesign-icons-vue-next'
import * as api from '../api'
import { fmtDate } from '../utils/date'
import StatsCards from '../components/StatsCards.vue'
import JournalFormDialog from '../components/JournalFormDialog.vue'

/* ---------- 常量 ---------- */
const moodMap = {
  great: { label: '😊 美好', theme: 'success' },
  ok: { label: '😐 一般', theme: 'warning' },
  anxious: { label: '😰 焦虑', theme: 'primary' },
  bad: { label: '😞 低落', theme: 'danger' }
}

/* ---------- 数据 ---------- */
const loading = ref(false)
const journals = ref([])
const keyword = ref('')
const moodFilter = ref('')
const monthFilter = ref('')
const pagination = { defaultPageSize: 15, pageSizeOptions: [10, 15, 30, 50] }

async function load() {
  loading.value = true
  try {
    journals.value = await api.listJournals()
  } catch (e) {
    MessagePlugin.error(e.message)
  } finally {
    loading.value = false
  }
}
onMounted(load)

/* ---------- 筛选 ---------- */
const filteredJournals = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  const ym = monthFilter.value ? String(monthFilter.value).slice(0, 7) : ''
  return journals.value
    .filter((j) => {
      if (moodFilter.value && j.mood !== moodFilter.value) return false
      if (ym && !(j.date || '').startsWith(ym)) return false
      if (kw) {
        const hay = `${j.title} ${j.content} ${j.tags.join(' ')}`.toLowerCase()
        if (!hay.includes(kw)) return false
      }
      return true
    })
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
})

/* ---------- 统计 ---------- */
const now = () => {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return { ym: `${d.getFullYear()}-${p(d.getMonth() + 1)}`, today: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}` }
}

const stats = computed(() => {
  const { ym } = now()
  const list = journals.value
  const latest = [...list].sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0]
  return {
    total: list.length,
    month: list.filter((j) => (j.date || '').startsWith(ym)).length,
    latest: latest ? fmtDate(latest.date) : '—'
  }
})

const statCards = computed(() => [
  { key: 'total', label: '累计日志', value: stats.value.total, icon: BookIcon, color: '' },
  { key: 'month', label: '本月记录', value: stats.value.month, icon: CalendarIcon, color: '' },
  { key: 'latest', label: '最近一篇', value: stats.value.latest, icon: SmileIcon, color: '' }
])

/* ---------- 表格 ---------- */
const columns = [
  { colKey: 'date', title: '日期', cell: 'date-cell', width: 130 },
  { colKey: 'content', title: '日志', cell: 'content-cell', minWidth: 320 },
  { colKey: 'mood', title: '心情', cell: 'mood-cell', width: 100 },
  { colKey: 'tags', title: '标签', cell: 'tags-cell', minWidth: 120 },
  { colKey: 'op', title: '操作', cell: 'op-cell', width: 120 }
]

/* ---------- 增删改 ---------- */
const dialogVisible = ref(false)
const editingJournal = ref(null)

function openCreate() {
  editingJournal.value = null
  dialogVisible.value = true
}

function openEdit(row) {
  editingJournal.value = row
  dialogVisible.value = true
}

async function removeOne(id) {
  try {
    await api.deleteJournal(id)
    MessagePlugin.success('已删除')
    await load()
  } catch (e) {
    MessagePlugin.error(e.message)
  }
}
</script>
