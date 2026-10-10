<template>
  <t-layout class="wb-root">
    <!-- 头部 -->
    <t-header class="wb-header">
      <div class="wb-title">
        <img class="logo" src="/favicon.ico" alt="Z 工作台" />
        工作台
        <t-tag size="small" variant="light-outline">个人版</t-tag>
      </div>
      <div class="wb-header-right">
        <button class="wb-exam-shortcut" @click="onNav('sa')" title="去系统架构师备考页">
          <template v-if="countdown.phase === 'before'">
            <span class="icon">⏳</span>距考试
            <b class="days">{{ countdown.days }}</b>天
            <span class="mono">{{ pad(countdown.hours) }}:{{ pad(countdown.minutes) }}:{{ pad(countdown.seconds) }}</span>
          </template>
          <template v-else-if="countdown.phase === 'ongoing'">
            <span class="icon">🎉</span>考试进行中
          </template>
          <template v-else>
            <span class="icon">🏆</span>考试已结束
          </template>
        </button>
        <span class="wb-today">{{ todayText }}</span>
      </div>
    </t-header>

    <!-- 头部下方：侧边导航 + 内容 -->
    <t-layout class="wb-body">
      <t-aside width="220px" class="wb-aside">
        <t-menu :value="activeMenu" theme="light" class="wb-menu" @change="onNav">

          <t-menu-item value="todo">
            <template #icon><task-icon /></template>
            待办工作台
          </t-menu-item>
          <t-menu-item value="sa">
            <template #icon><file-icon /></template>
            系统架构师备考
          </t-menu-item>
          <t-menu-item value="fitness">
            <template #icon><rocket-icon /></template>
            减肥管理
          </t-menu-item>
          <t-menu-item value="journal">
            <template #icon><edit1-icon /></template>
            写日志
          </t-menu-item>
          <t-menu-item value="memo">
            <template #icon><bookmark-icon /></template>
            备忘录
          </t-menu-item>
        </t-menu>
      </t-aside>

      <t-content class="wb-content-wrap">
        <router-view />
      </t-content>
    </t-layout>
  </t-layout>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { TaskIcon, Edit1Icon, FileIcon, BookmarkIcon, RocketIcon } from 'tdesign-icons-vue-next'
import { useExamCountdown } from '../composables/useExamCountdown'

const route = useRoute()
const router = useRouter()

const { countdown, pad } = useExamCountdown()

const activeMenu = computed(() => (['todo', 'journal', 'sa', 'article', 'memo', 'fitness'].includes(route.name) ? route.name : 'todo'))

function onNav(name) {
  router.push({ name })
}

const todayText = computed(() => {
  const d = new Date()
  return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日`
})
</script>
