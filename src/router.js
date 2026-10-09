import { createRouter, createWebHistory } from 'vue-router'
import MainLayout from './layouts/MainLayout.vue'

// 页面隔离：待办工作台 / 写日志，均挂在 MainLayout 下
const routes = [
  {
    path: '/',
    component: MainLayout,
    children: [
      {
        path: '',
        name: 'todo',
        component: () => import('./pages/TodoPage.vue'),
        meta: { title: '待办工作台' }
      },
      {
        path: 'journal',
        name: 'journal',
        component: () => import('./pages/JournalPage.vue'),
        meta: { title: '写日志' }
      },
      {
        path: 'SA',
        name: 'sa',
        component: () => import('./pages/SaPage.vue'),
        meta: { title: '系统架构师备考' }
      },
      {
        path: 'article',
        name: 'article',
        component: () => import('./pages/ArticlePage.vue'),
        meta: { title: '写文章' }
      },
      {
        path: 'memo',
        name: 'memo',
        component: () => import('./pages/MemoPage.vue'),
        meta: { title: '备忘录' }
      },
      {
        path: 'fitness',
        name: 'fitness',
        component: () => import('./pages/FitnessPage.vue'),
        meta: { title: '减肥管理' }
      }
    ]
  },
  { path: '/:pathMatch(.*)*', redirect: '/' }
]

export const router = createRouter({
  history: createWebHistory(),
  routes
})

router.afterEach((to) => {
  document.title = `${to.meta.title || '工作台'} · 徐茂艳的工作台`
})
