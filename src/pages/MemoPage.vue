<template>
  <div class="wb-content">
    <!-- 页面头 -->
    <div class="wb-page-head">
      <h3>备忘录</h3>
      <t-button theme="primary" @click="openItemDialog(null)">
        <template #icon><add-icon /></template>新建备忘
      </t-button>
    </div>

    <div class="wb-memo-layout">
      <!-- 左侧：文件夹 -->
      <aside class="wb-memo-folders">
        <div class="wb-memo-folder-head">
          <span>文件夹</span>
          <t-button size="small" variant="text" theme="primary" @click="openFolderDialog(null)">
            <template #icon><add-rectangle-icon /></template>新建
          </t-button>
        </div>

        <div
          class="wb-memo-folder"
          :class="{ active: folderFilter === 'all' }"
          @click="folderFilter = 'all'"
        >
          <span>全部</span>
          <span class="count">{{ items.length }}</span>
        </div>
        <div
          v-for="f in folders"
          :key="f.id"
          class="wb-memo-folder"
          :class="{ active: folderFilter === f.id }"
          @click="folderFilter = f.id"
        >
          <folder-icon size="14px" />
          <span class="name">{{ f.name }}</span>
          <span class="count">{{ folderCount(f.id) }}</span>
          <span class="ops" @click.stop>
            <t-link theme="primary" hover="color" size="small" @click="openFolderDialog(f)">
              <edit-icon />
            </t-link>
            <t-popconfirm
              :content="`删除文件夹「${f.name}」？其中备忘会移入未分类`"
              @confirm="removeFolder(f.id)"
            >
              <t-link theme="danger" hover="color" size="small"><delete-icon /></t-link>
            </t-popconfirm>
          </span>
        </div>
        <div
          class="wb-memo-folder"
          :class="{ active: folderFilter === 'none' }"
          @click="folderFilter = 'none'"
        >
          <span>未分类</span>
          <span class="count">{{ unfiledCount }}</span>
        </div>
      </aside>

      <!-- 右侧：备忘条目 -->
      <section class="wb-memo-main">
        <div class="wb-toolbar" style="margin-bottom: 12px">
          <t-input v-model="keyword" placeholder="搜索标题 / 链接 / 备注" clearable style="width: 240px">
            <template #icon><search-icon /></template>
          </t-input>
        </div>

        <div class="wb-table-card">
          <t-table
            row-key="id"
            :data="filteredItems"
            :columns="columns"
            :loading="loading"
            max-height="calc(100vh - 380px)"
          >
            <template #title-cell="{ row }">
              <div class="wb-memo-title-cell">
                <t-link
                  v-if="row.url"
                  :href="row.url"
                  target="_blank"
                  rel="noopener noreferrer"
                  hover="color"
                >
                  {{ row.title }}
                </t-link>
                <span v-else>{{ row.title }}</span>
                <div v-if="row.remark" class="desc">{{ row.remark }}</div>
              </div>
            </template>

            <template #folder-cell="{ row }">
              <t-tag
                v-if="row.folderId && folderName(row.folderId)"
                variant="light"
                size="small"
              >
                {{ folderName(row.folderId) }}
              </t-tag>
              <span v-else class="wb-empty" style="padding: 0">未分类</span>
            </template>

            <template #updated-cell="{ row }">
              <span class="wb-created">{{ fmtDateTime(row.updatedAt) }}</span>
            </template>

            <template #op-cell="{ row }">
              <t-space size="4px">
                <t-link theme="primary" hover="color" @click="openItemDialog(row)">编辑</t-link>
                <t-popconfirm content="确认删除该备忘？" @confirm="removeItem(row.id)">
                  <t-link theme="danger" hover="color">删除</t-link>
                </t-popconfirm>
              </t-space>
            </template>

            <template #empty>
              <div class="wb-empty">
                <p style="margin: 0; font-size: 28px">🔖</p>
                <p style="margin: 8px 0 0">这里还没有备忘，点右上角「新建备忘」记录站点信息</p>
              </div>
            </template>
          </t-table>
        </div>
      </section>
    </div>

    <!-- 新建 / 编辑备忘弹窗 -->
    <t-dialog
      v-model:visible="itemDialogVisible"
      :header="editingItem ? '编辑备忘' : '新建备忘'"
      width="520px"
      :confirm-btn="{ content: '保存', theme: 'primary' }"
      @confirm="submitItem"
    >
      <t-form ref="itemFormRef" :data="itemForm" :rules="itemRules" label-width="76px" @submit.prevent>
        <t-form-item label="标题" name="title">
          <t-input v-model="itemForm.title" placeholder="站点名称" :maxlength="60" />
        </t-form-item>
        <t-form-item label="链接" name="url">
          <t-input v-model="itemForm.url" placeholder="https://…（保存后标题可点击跳转）" />
        </t-form-item>
        <t-form-item label="备注" name="remark">
          <t-textarea v-model="itemForm.remark" placeholder="站点说明、账号提示等（可选）" :autosize="{ minRows: 2, maxRows: 4 }" />
        </t-form-item>
        <t-form-item label="文件夹" name="folderId">
          <t-select v-model="itemForm.folderId" clearable placeholder="未分类">
            <t-option v-for="f in folders" :key="f.id" :value="f.id" :label="f.name" />
          </t-select>
        </t-form-item>
      </t-form>
    </t-dialog>

    <!-- 新建 / 重命名文件夹弹窗 -->
    <t-dialog
      v-model:visible="folderDialogVisible"
      :header="editingFolder ? '重命名文件夹' : '新建文件夹'"
      width="380px"
      :confirm-btn="{ content: '确定', theme: 'primary' }"
      @confirm="submitFolder"
    >
      <t-input v-model="folderInput" placeholder="文件夹名称" :maxlength="20" @enter="submitFolder" />
    </t-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { MessagePlugin } from 'tdesign-vue-next'
import {
  AddIcon, AddRectangleIcon, DeleteIcon, EditIcon, FolderIcon, SearchIcon
} from 'tdesign-icons-vue-next'
import * as api from '../api'
import { fmtDateTime } from '../utils/date'

/* ---------- 数据 ---------- */
const loading = ref(false)
const folders = ref([])
const items = ref([])
const folderFilter = ref('all') // 'all' | 'none' | folderId
const keyword = ref('')

async function load() {
  loading.value = true
  try {
    const d = await api.listMemos()
    folders.value = d.folders
    items.value = d.items
  } catch (e) {
    MessagePlugin.error(e.message)
  } finally {
    loading.value = false
  }
}
onMounted(load)

/* ---------- 筛选 ---------- */
const unfiledCount = computed(() => items.value.filter((i) => !i.folderId).length)

const folderCount = (fid) => items.value.filter((i) => i.folderId === fid).length

const folderName = (fid) => folders.value.find((f) => f.id === fid)?.name || ''

const filteredItems = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  return items.value
    .filter((i) => {
      if (folderFilter.value === 'none' && i.folderId) return false
      if (folderFilter.value !== 'all' && folderFilter.value !== 'none' && i.folderId !== folderFilter.value) return false
      if (kw) {
        const hay = `${i.title} ${i.url} ${i.remark}`.toLowerCase()
        if (!hay.includes(kw)) return false
      }
      return true
    })
    .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))
})

/* ---------- 文件夹管理 ---------- */
const folderDialogVisible = ref(false)
const editingFolder = ref(null)
const folderInput = ref('')

function openFolderDialog(folder) {
  editingFolder.value = folder
  folderInput.value = folder ? folder.name : ''
  folderDialogVisible.value = true
}

async function submitFolder() {
  const name = folderInput.value.trim()
  if (!name) {
    MessagePlugin.warning('请输入文件夹名称')
    return
  }
  try {
    if (editingFolder.value) {
      await api.renameMemoFolder(editingFolder.value.id, name)
      MessagePlugin.success('已重命名')
    } else {
      await api.createMemoFolder(name)
      MessagePlugin.success('文件夹已创建')
    }
    folderDialogVisible.value = false
    await load()
  } catch (e) {
    MessagePlugin.error(e.message)
  }
}

async function removeFolder(id) {
  try {
    await api.deleteMemoFolder(id)
    if (folderFilter.value === id) folderFilter.value = 'all'
    MessagePlugin.success('文件夹已删除，备忘移入未分类')
    await load()
  } catch (e) {
    MessagePlugin.error(e.message)
  }
}

/* ---------- 备忘条目 ---------- */
const itemDialogVisible = ref(false)
const editingItem = ref(null)
const itemFormRef = ref(null)
const itemRules = {
  title: [{ required: true, message: '标题不能为空', type: 'error', trigger: 'blur' }]
}

const emptyItemForm = () => ({
  title: '',
  url: '',
  remark: '',
  folderId: folderFilter.value !== 'all' && folderFilter.value !== 'none' ? folderFilter.value : ''
})
const itemForm = ref(emptyItemForm())

function openItemDialog(row) {
  editingItem.value = row
  itemForm.value = row
    ? { title: row.title, url: row.url, remark: row.remark, folderId: row.folderId || '' }
    : emptyItemForm()
  itemDialogVisible.value = true
}

async function submitItem() {
  // TDesign：校验通过返回 true，失败返回错误对象（真值），必须严格判断 !== true
  const valid = (await itemFormRef.value?.validate().catch(() => false)) === true
  if (!valid) return
  const payload = {
    title: itemForm.value.title.trim(),
    url: itemForm.value.url.trim(),
    remark: itemForm.value.remark,
    folderId: itemForm.value.folderId || null
  }
  try {
    if (editingItem.value) {
      await api.updateMemoItem(editingItem.value.id, payload)
      MessagePlugin.success('备忘已更新')
    } else {
      await api.createMemoItem(payload)
      MessagePlugin.success('备忘已创建')
    }
    itemDialogVisible.value = false
    await load()
  } catch (e) {
    MessagePlugin.error(e.message)
  }
}

async function removeItem(id) {
  try {
    await api.deleteMemoItem(id)
    MessagePlugin.success('已删除')
    await load()
  } catch (e) {
    MessagePlugin.error(e.message)
  }
}

/* ---------- 表格 ---------- */
const columns = [
  { colKey: 'title', title: '站点', cell: 'title-cell', minWidth: 240 },
  { colKey: 'folderId', title: '文件夹', cell: 'folder-cell', width: 120 },
  { colKey: 'updatedAt', title: '更新时间', cell: 'updated-cell', width: 150 },
  { colKey: 'op', title: '操作', cell: 'op-cell', width: 120, fixed: 'right' }
]
</script>
