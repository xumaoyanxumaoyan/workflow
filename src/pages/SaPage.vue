<template>
  <div class="wb-content">
    <!-- 页面头 -->
    <div class="wb-page-head">
      <h3>系统架构师备考</h3>
      <t-button theme="primary" @click="goWriting">
        <template #icon><edit-icon /></template>去写文章
      </t-button>
    </div>

    <!-- 考试倒计时 + 日程 -->
    <div class="wb-exam-cards">
      <div class="wb-exam-countdown">
        <div class="wb-exam-countdown-title">距系统架构师考试</div>
        <template v-if="countdown.phase === 'before'">
          <div class="wb-exam-countdown-value">
            <span class="num">{{ countdown.days }}</span><span class="unit">天</span>
            <span class="num">{{ countdown.hours }}</span><span class="unit">时</span>
            <span class="num">{{ countdown.minutes }}</span><span class="unit">分</span>
            <span class="num">{{ countdown.seconds }}</span><span class="unit">秒</span>
          </div>
          <div class="wb-exam-date">2026 年 10 月 24 日（周六）开考</div>
        </template>
        <div v-else class="wb-exam-date">{{ countdown.phase === 'ongoing' ? '🎉 考试进行中，全力以赴！' : '考试已结束' }}</div>
      </div>

      <div class="wb-exam-schedule">
        <div class="wb-exam-schedule-title">考试日程</div>
        <div class="wb-exam-row">
          <span class="when">上午</span>
          <span class="time">8:30 – 12:30</span>
          <span class="what">综合知识 + 案例分析</span>
        </div>
        <div class="wb-exam-row">
          <span class="when">下午</span>
          <span class="time">14:30 – 16:30</span>
          <span class="what">论文</span>
        </div>
      </div>
    </div>

    <!-- 16 天学习打卡 -->
    <div class="wb-checkin-card">
      <div class="wb-checkin-head">
        <span class="title">16 天学习打卡</span>
        <span class="legend">上午 = 综合知识 + 案例分析 1 小时 · 下午 = 论文学习 1 小时</span>
        <span class="progress">已完成 <b>{{ doneCount }}</b> / {{ totalSlots }}</span>
      </div>
      <div class="wb-checkin-grid">
        <div v-for="d in checkinDays" :key="d.date" class="wb-checkin-day" :class="{ today: d.today }">
          <div class="date">{{ d.label }}<span v-if="d.today" class="tag">今天</span></div>
          <div class="slots">
            <button class="slot" :class="{ done: isChecked(d.date, 'am') }" @click="toggleCheckin(d.date, 'am', '上午')">
              上午
            </button>
            <button class="slot" :class="{ done: isChecked(d.date, 'pm') }" @click="toggleCheckin(d.date, 'pm', '下午')">
              下午
            </button>
          </div>
        </div>
        <div class="wb-checkin-day exam-day">
          <div class="date">10-24</div>
          <div class="examLabel">考试日 🎯</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { MessagePlugin } from 'tdesign-vue-next'
import { EditIcon } from 'tdesign-icons-vue-next'
import * as api from '../api'
import { useExamCountdown } from '../composables/useExamCountdown'

const router = useRouter()
const { countdown } = useExamCountdown()

function goWriting() {
  router.push({ name: 'article' })
}

/* ---------- 16 天学习打卡 ---------- */
const checkins = ref({})

const checkinDays = computed(() => {
  const out = []
  const d = new Date()
  const key = (dt) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
  const todayKey = key(d)
  let start = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  if (todayKey < '2026-10-08') start = new Date(2026, 9, 8)
  while (key(start) <= '2026-10-23') {
    const k = key(start)
    out.push({ date: k, label: `${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`, today: k === todayKey })
    start.setDate(start.getDate() + 1)
    if (out.length >= 16) break
  }
  return out
})

const totalSlots = computed(() => checkinDays.value.length * 2)
const doneCount = computed(() => {
  let n = 0
  checkinDays.value.forEach((d) => {
    n += (checkins.value[d.date]?.am?.done ? 1 : 0) + (checkins.value[d.date]?.pm?.done ? 1 : 0)
  })
  return n
})

const isChecked = (date, slot) => !!checkins.value[date]?.[slot]?.done

async function toggleCheckin(date, slot, label) {
  const next = !isChecked(date, slot)
  try {
    await api.toggleCheckin(date, slot, next)
    checkins.value = await api.listCheckins()
    MessagePlugin.success(next ? `${label}打卡完成 ✅` : '已取消打卡')
  } catch (e) {
    MessagePlugin.error(e.message)
  }
}

onMounted(async () => {
  try {
    checkins.value = await api.listCheckins()
  } catch { /* 打卡加载失败不阻塞主流程 */ }
})
</script>
