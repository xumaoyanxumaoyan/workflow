<template>
  <t-layout class="wb-root">
    <!-- 头部 -->
    <t-header class="wb-header">
      <div class="wb-title">
        <span class="logo">✓</span>
        工作台
        <t-tag size="small" variant="light-outline">TDesign · Vue3</t-tag>
      </div>
      <div class="wb-header-right">{{ todayText }}</div>
    </t-header>

    <!-- 头部下方：侧边导航 + 内容 -->
    <t-layout class="wb-body">
      <t-aside width="220px" class="wb-aside">
        <t-menu :value="activeMenu" theme="light" class="wb-menu" @change="onNav">
          <t-menu-item value="todo">
            <template #icon><task-icon /></template>
            待办工作台
          </t-menu-item>
          <t-menu-item value="journal">
            <template #icon><edit1-icon /></template>
            写日志
          </t-menu-item>
          <t-menu-item value="article">
            <template #icon><file-icon /></template>
            写文章
          </t-menu-item>
          <t-menu-item value="memo">
            <template #icon><bookmark-icon /></template>
            备忘录
          </t-menu-item>
          <t-menu-item value="fitness">
            <template #icon><rocket-icon /></template>
            减肥管理
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

const route = useRoute()
const router = useRouter()

const activeMenu = computed(() => (['todo', 'journal', 'article', 'memo', 'fitness'].includes(route.name) ? route.name : 'todo'))

function onNav(name) {
  router.push({ name })
}

const todayText = computed(() => {
  const d = new Date()
  return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日`
})
</script>
