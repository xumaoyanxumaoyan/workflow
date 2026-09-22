<template>
  <div class="wb-content">
    <!-- 页面头 -->
    <div class="wb-page-head">
      <h3>写文章</h3>
      <t-button theme="primary" @click="createNew">
        <template #icon><add-icon /></template>新建文章
      </t-button>
    </div>

    <div class="wb-article-layout">
      <!-- 左侧：文章列表 -->
      <aside class="wb-article-list">
        <div
          v-for="a in articles"
          :key="a.id"
          class="wb-article-item"
          :class="{ active: a.id === currentId }"
          @click="selectArticle(a)"
        >
          <div class="wb-article-item-title">{{ a.title || '（无标题）' }}</div>
          <div class="wb-article-item-meta">
            <span>{{ fmtDateTime(a.updatedAt) }}</span>
            <t-popconfirm content="确认删除这篇文章？" @confirm="removeOne(a.id)">
              <t-link theme="danger" hover="color" size="small" @click.stop>删除</t-link>
            </t-popconfirm>
          </div>
        </div>
        <div v-if="!articles.length" class="wb-empty" style="padding: 20px 0">
          还没有文章，点右上角「新建文章」
        </div>
      </aside>

      <!-- 右侧：页内编辑器（非弹框） -->
      <section class="wb-editor-card">
        <template v-if="current">
          <t-input
            v-model="current.title"
            placeholder="文章标题"
            size="large"
            borderless
            class="wb-editor-title"
            @input="queueSave"
          />
          <textarea
            ref="editorRef"
            v-model="current.content"
            class="wb-editor"
            placeholder="开始写作…（自动保存）"
            spellcheck="false"
            @input="queueSave"
            @select="updateSelection"
            @keyup="updateSelection"
            @mouseup="updateSelection"
          ></textarea>
          <div class="wb-editor-status">
            <span>全文 {{ totalChars }} 字</span>
            <span v-if="selectedChars > 0" class="wb-editor-selected">已选中 {{ selectedChars }} 字</span>
            <span v-else-if="saveState" class="wb-editor-saving">{{ saveState }}</span>
          </div>
        </template>
        <div v-else class="wb-empty" style="padding: 80px 0; font-size: 14px">
          <p style="margin: 0; font-size: 36px">📄</p>
          <p style="margin: 12px 0 0">从左侧选择一篇文章，或新建一篇开始写作</p>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { MessagePlugin } from 'tdesign-vue-next'
import { AddIcon } from 'tdesign-icons-vue-next'
import * as api from '../api'
import { fmtDateTime } from '../utils/date'

/* ---------- 数据 ---------- */
const articles = ref([])
const currentId = ref('')
const current = ref(null) // 当前编辑副本 { id, title, content }
const saveState = ref('') // '已自动保存' 等提示
const editorRef = ref(null)

const totalChars = computed(() => (current.value?.content || '').length)

async function load() {
  try {
    articles.value = await api.listArticles()
    if (!current.value && articles.value.length) {
      selectArticle(articles.value[0])
    }
  } catch (e) {
    MessagePlugin.error(e.message)
  }
}
onMounted(load)

/* ---------- 选择 / 新建 / 删除 ---------- */
function selectArticle(a) {
  flushSave()
  currentId.value = a.id
  current.value = { ...a }
  selectedChars.value = 0
}

async function createNew() {
  try {
    const created = await api.createArticle({ title: '未命名文章', content: '' })
    articles.value.push(created)
    currentId.value = created.id
    current.value = { ...created }
    selectedChars.value = 0
    MessagePlugin.success('已新建文章')
    // 自动聚焦到编辑区
    setTimeout(() => {
      editorRef.value?.focus()
    }, 100)
  } catch (e) {
    MessagePlugin.error(e.message)
  }
}

async function removeOne(id) {
  try {
    await api.deleteArticle(id)
    articles.value = articles.value.filter((a) => a.id !== id)
    if (currentId.value === id) {
      currentId.value = ''
      current.value = articles.value[0] ? { ...articles.value[0] } : null
    }
    MessagePlugin.success('已删除')
  } catch (e) {
    MessagePlugin.error(e.message)
  }
}

/* ---------- 自动保存（600ms 防抖） ---------- */
let saveTimer = null

function queueSave() {
  saveState.value = '保存中…'
  clearTimeout(saveTimer)
  saveTimer = setTimeout(saveNow, 600)
}

async function saveNow() {
  if (!current.value) return
  const payload = { title: current.value.title, content: current.value.content }
  try {
    const saved = await api.updateArticle(current.value.id, payload)
    const idx = articles.value.findIndex((a) => a.id === current.value.id)
    if (idx !== -1) articles.value[idx] = { ...articles.value[idx], ...payload }
    saveState.value = '已自动保存'
    setTimeout(() => {
      if (saveState.value === '已自动保存') saveState.value = ''
    }, 0)
    void saved
  } catch (e) {
    saveState.value = ''
    MessagePlugin.error('保存失败: ' + e.message)
  }
}

function flushSave() {
  if (saveTimer) {
    clearTimeout(saveTimer)
    saveTimer = null
    saveNow()
  }
}

/* ---------- 选中字数统计 ---------- */
const selectedChars = ref(0)
function updateSelection(e) {
  const ta = e.target
  if (ta && typeof ta.selectionStart === 'number') {
    selectedChars.value = ta.selectionEnd - ta.selectionStart
  }
}

onBeforeUnmount(() => clearTimeout(saveTimer))
</script>
