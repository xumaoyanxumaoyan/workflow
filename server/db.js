import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, '..', 'data')

// 按功能模块拆分数据文件
const FILES = {
  todos: {
    work: path.join(DATA_DIR, 'todos-work.json'),
    life: path.join(DATA_DIR, 'todos-life.json')
  },
  journals: path.join(DATA_DIR, 'journals.json'),
  articles: path.join(DATA_DIR, 'articles.json'),
  memos: path.join(DATA_DIR, 'memos.json'),
  fitness: path.join(DATA_DIR, 'fitness.json'),
  freqFoods: path.join(DATA_DIR, 'freq-foods.json'),
  legacy: path.join(DATA_DIR, 'db.json') // 旧版单文件，迁移后仅作备份
}

export const DOMAINS = ['work', 'life']

const seedTodos = {
  work: [
    {
      id: 'seed-1',
      title: '整理季度 OKR 初稿',
      desc: '汇总各小组的季度目标，拆解关键结果并标注责任人。',
      priority: 'high',
      status: 'doing',
      dueDate: '2025-07-15',
      tags: ['工作', '规划'],
      createdAt: '2025-07-01T09:00:00.000Z',
      updatedAt: '2025-07-01T09:00:00.000Z',
      completedAt: null
    },
    {
      id: 'seed-2',
      title: '回复客户反馈邮件',
      desc: '三条待回复邮件，其中一条涉及合同续签。',
      priority: 'medium',
      status: 'todo',
      dueDate: '2025-07-10',
      tags: ['工作', '沟通'],
      createdAt: '2025-07-02T10:00:00.000Z',
      updatedAt: '2025-07-02T10:00:00.000Z',
      completedAt: null
    }
  ],
  life: [
    {
      id: 'seed-life-1',
      title: '预约周末体检',
      desc: '提前确认体检套餐与空腹要求。',
      priority: 'low',
      status: 'todo',
      dueDate: '',
      tags: ['健康'],
      createdAt: '2025-07-03T08:30:00.000Z',
      updatedAt: '2025-07-03T08:30:00.000Z',
      completedAt: null
    },
    {
      id: 'seed-life-2',
      title: '给阳台绿植换盆',
      desc: '买营养土和两个大一号的花盆。',
      priority: 'medium',
      status: 'todo',
      dueDate: '',
      tags: ['居家'],
      createdAt: '2025-07-05T12:00:00.000Z',
      updatedAt: '2025-07-05T12:00:00.000Z',
      completedAt: null
    }
  ]
}

const seedJournals = [
  {
    id: 'seed-j1',
    date: '2025-07-08',
    title: '工作台顺利上线',
    mood: 'great',
    content: 'TDesign 待办工作台搭建完成，前后端联调一次通过。整理一下组件拆分的经验，下周可以复用到别的内部工具。',
    tags: ['工作', '开发'],
    createdAt: '2025-07-08T16:00:00.000Z',
    updatedAt: '2025-07-08T16:00:00.000Z'
  }
]

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
}

function writeJson(file, data) {
  ensureDataDir()
  const tmp = file + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8')
  fs.renameSync(tmp, file)
}

function readJsonArray(file, seed) {
  ensureDataDir()
  if (!fs.existsSync(file)) {
    writeJson(file, seed)
    return JSON.parse(JSON.stringify(seed))
  }
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'))
    return Array.isArray(data) ? data : JSON.parse(JSON.stringify(seed))
  } catch {
    // 文件损坏时备份并重建
    try {
      fs.copyFileSync(file, file + '.broken-' + Date.now())
    } catch { /* ignore */ }
    fs.writeFileSync(file, JSON.stringify(seed, null, 2), 'utf8')
    return JSON.parse(JSON.stringify(seed))
  }
}

// 旧版单文件 db.json → 按模块拆分（仅首次）
function migrate() {
  if (!fs.existsSync(FILES.legacy)) return
  try {
    if (!fs.existsSync(FILES.todos.work) && !fs.existsSync(FILES.journals)) {
      const legacy = JSON.parse(fs.readFileSync(FILES.legacy, 'utf8'))
      writeJson(FILES.todos.work, Array.isArray(legacy.todos) ? legacy.todos : [])
      writeJson(FILES.journals, Array.isArray(legacy.journals) ? legacy.journals : JSON.parse(JSON.stringify(seedJournals)))
      console.log('已将旧 db.json 迁移到 todos-work.json / journals.json')
    }
    fs.renameSync(FILES.legacy, FILES.legacy + '.migrated-' + Date.now())
    console.log('旧 db.json 已重命名为备份文件')
  } catch (e) {
    console.error('db.json 迁移失败（不影响新文件读写）:', e.message)
  }
}

export function readTodos(domain) {
  const file = FILES.todos[domain] || FILES.todos.work
  return readJsonArray(file, seedTodos[domain] || [])
}

export function writeTodos(domain, list) {
  writeJson(FILES.todos[domain] || FILES.todos.work, list)
}

export function readJournals() {
  return readJsonArray(FILES.journals, seedJournals)
}

export function writeJournals(list) {
  writeJson(FILES.journals, list)
}

/* ---------- 文章模块（独立文件 articles.json） ---------- */
const seedArticles = [
  {
    id: 'seed-a1',
    title: '示例：我的第一篇文章',
    content: '这是一篇示例文章。\n\n在这里可以直接写作：输入会自动保存，右侧状态栏实时统计全文字数，选中一段文字还能看到选中了多少字。',
    tags: [],
    createdAt: '2025-07-10T10:00:00.000Z',
    updatedAt: '2025-07-10T10:00:00.000Z'
  }
]

export function readArticles() {
  return readJsonArray(FILES.articles, seedArticles)
}

export function writeArticles(list) {
  writeJson(FILES.articles, list)
}

/* ---------- 备忘录模块（独立文件 memos.json：folders + items） ---------- */
const seedMemos = {
  folders: [
    { id: 'seed-mf1', name: '常用站点', createdAt: '2025-07-10T10:00:00.000Z' }
  ],
  items: [
    {
      id: 'seed-mi1',
      folderId: 'seed-mf1',
      title: 'GitHub',
      url: 'https://github.com',
      remark: '代码托管平台',
      createdAt: '2025-07-10T10:00:00.000Z',
      updatedAt: '2025-07-10T10:00:00.000Z'
    },
    {
      id: 'seed-mi2',
      folderId: 'seed-mf1',
      title: 'TDesign 组件库',
      url: 'https://tdesign.tencent.com',
      remark: 'Vue3 组件库文档',
      createdAt: '2025-07-10T10:01:00.000Z',
      updatedAt: '2025-07-10T10:01:00.000Z'
    }
  ]
}

function readJsonObj(file, seed) {
  ensureDataDir()
  if (!fs.existsSync(file)) {
    writeJson(file, seed)
    return JSON.parse(JSON.stringify(seed))
  }
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'))
    return {
      folders: Array.isArray(data?.folders) ? data.folders : [],
      items: Array.isArray(data?.items) ? data.items : []
    }
  } catch {
    try {
      fs.copyFileSync(file, file + '.broken-' + Date.now())
    } catch { /* ignore */ }
    fs.writeFileSync(file, JSON.stringify(seed, null, 2), 'utf8')
    return JSON.parse(JSON.stringify(seed))
  }
}

export function readMemos() {
  return readJsonObj(FILES.memos, seedMemos)
}

export function writeMemos(data) {
  writeJson(FILES.memos, {
    folders: Array.isArray(data?.folders) ? data.folders : [],
    items: Array.isArray(data?.items) ? data.items : []
  })
}

/* ---------- 减肥管理模块（独立文件 fitness.json，每日一条记录） ---------- */
const seedFitness = [
  {
    id: 'seed-fit-1',
    date: '2025-07-10',
    weight: 145,
    foods: [
      { name: '燕麦粥', kcal: 200 },
      { name: '水煮蛋', kcal: 70 },
      { name: '鸡胸肉沙拉', kcal: 350 }
    ],
    exerciseMin: 45,
    caloriesBurned: 320,
    note: '跑步 + 拉伸',
    createdAt: '2025-07-10T07:30:00.000Z',
    updatedAt: '2025-07-10T07:30:00.000Z'
  },
  {
    id: 'seed-fit-2',
    date: '2025-07-11',
    weight: 144.6,
    foods: [
      { name: '全麦面包', kcal: 150 },
      { name: '牛肉西兰花', kcal: 400 }
    ],
    exerciseMin: 30,
    caloriesBurned: 210,
    note: '快走 3 公里',
    createdAt: '2025-07-11T07:30:00.000Z',
    updatedAt: '2025-07-11T07:30:00.000Z'
  }
]

export function readFitness() {
  return readJsonArray(FILES.fitness, seedFitness)
}

export function writeFitness(list) {
  writeJson(FILES.fitness, list)
}

/* ---------- 常吃食物库（独立文件 freq-foods.json，自动学习每 100g 热量） ---------- */
const seedFreqFoods = [
  { id: 'seed-ff-1', name: '鸡胸肉', kcalPer100g: 133, useCount: 2, lastUsedAt: '2025-07-11T08:00:00.000Z', createdAt: '2025-07-10T08:00:00.000Z', updatedAt: '2025-07-11T08:00:00.000Z' },
  { id: 'seed-ff-2', name: '水煮蛋', kcalPer100g: 144, useCount: 1, lastUsedAt: '2025-07-10T08:00:00.000Z', createdAt: '2025-07-10T08:00:00.000Z', updatedAt: '2025-07-10T08:00:00.000Z' },
  { id: 'seed-ff-3', name: '米饭', kcalPer100g: 116, useCount: 1, lastUsedAt: '2025-07-10T08:00:00.000Z', createdAt: '2025-07-10T08:00:00.000Z', updatedAt: '2025-07-10T08:00:00.000Z' }
]

export function readFreqFoods() {
  return readJsonArray(FILES.freqFoods, seedFreqFoods)
}

export function writeFreqFoods(list) {
  writeJson(FILES.freqFoods, list)
}

export function todoFile(domain) {
  return FILES.todos[domain] || FILES.todos.work
}

export function journalFile() {
  return FILES.journals
}

export function initStorage() {
  migrate()
  // 保证所有模块文件都存在
  readTodos('work')
  readTodos('life')
  readJournals()
  readArticles()
  readMemos()
  readFitness()
  readFreqFoods()
}
