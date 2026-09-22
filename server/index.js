import express from 'express'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  DOMAINS,
  readTodos, writeTodos, readJournals, writeJournals,
  readArticles, writeArticles,
  initStorage
} from './db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3001

app.use(express.json({ limit: '10mb' }))

// 简易日志
app.use((req, _res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`)
  next()
})

initStorage()

const api = express.Router()

/* ================= 待办（按领域 work / life 分文件存储） ================= */

const validDomain = (v, fallback) => (DOMAINS.includes(v) ? v : fallback)

// 列表 ?domain=work|life
api.get('/todos', (req, res) => {
  const domain = validDomain(req.query.domain, 'work')
  res.json({ code: 0, data: readTodos(domain) })
})

// 新建 { domain, title, ... }
api.post('/todos', (req, res) => {
  const domain = validDomain(req.body?.domain, 'work')
  const now = new Date().toISOString()
  const todo = {
    id: crypto.randomUUID(),
    title: String(req.body?.title || '').trim() || '未命名任务',
    desc: String(req.body?.desc || ''),
    priority: ['high', 'medium', 'low'].includes(req.body?.priority) ? req.body.priority : 'medium',
    status: ['todo', 'doing', 'done'].includes(req.body?.status) ? req.body.status : 'todo',
    dueDate: req.body?.dueDate ? String(req.body.dueDate) : '',
    tags: Array.isArray(req.body?.tags) ? req.body.tags.map(String).filter(Boolean) : [],
    createdAt: now,
    updatedAt: now,
    completedAt: req.body?.status === 'done' ? now : null
  }
  const list = readTodos(domain)
  list.push(todo)
  writeTodos(domain, list)
  res.json({ code: 0, data: todo })
})

// 更新：body 可带 domain 精确定位，否则在两个领域文件中查找
api.put('/todos/:id', (req, res) => {
  const body = req.body || {}
  const searchDomains = DOMAINS.includes(body.domain) ? [body.domain] : DOMAINS
  for (const domain of searchDomains) {
    const list = readTodos(domain)
    const idx = list.findIndex((t) => t.id === req.params.id)
    if (idx === -1) continue
    const prev = list[idx]
    const next = { ...prev }
    if (body.title !== undefined) next.title = String(body.title).trim() || prev.title
    if (body.desc !== undefined) next.desc = String(body.desc)
    if (body.priority !== undefined && ['high', 'medium', 'low'].includes(body.priority)) next.priority = body.priority
    if (body.status !== undefined && ['todo', 'doing', 'done'].includes(body.status)) next.status = body.status
    if (body.dueDate !== undefined) next.dueDate = body.dueDate ? String(body.dueDate) : ''
    if (body.tags !== undefined) next.tags = Array.isArray(body.tags) ? body.tags.map(String).filter(Boolean) : []
    if (next.status === 'done' && prev.status !== 'done') next.completedAt = new Date().toISOString()
    if (next.status !== 'done') next.completedAt = null
    next.updatedAt = new Date().toISOString()
    list[idx] = next
    writeTodos(domain, list)
    return res.json({ code: 0, data: next })
  }
  res.status(404).json({ code: 1, message: '任务不存在' })
})

// 删除单条：在两个领域文件中查找
api.delete('/todos/:id', (req, res) => {
  for (const domain of DOMAINS) {
    const list = readTodos(domain)
    const idx = list.findIndex((t) => t.id === req.params.id)
    if (idx === -1) continue
    list.splice(idx, 1)
    writeTodos(domain, list)
    return res.json({ code: 0, data: { removed: 1 } })
  }
  res.status(404).json({ code: 1, message: '任务不存在' })
})

// 批量删除：body { ids, domain? }
api.post('/todos/batch-delete', (req, res) => {
  const ids = new Set(Array.isArray(req.body?.ids) ? req.body.ids : [])
  const searchDomains = validDomain(req.body?.domain, null) ? [req.body.domain] : DOMAINS
  let removed = 0
  for (const domain of searchDomains) {
    const list = readTodos(domain)
    const kept = list.filter((t) => {
      if (ids.has(t.id)) {
        removed++
        return false
      }
      return true
    })
    if (kept.length !== list.length) writeTodos(domain, kept)
  }
  res.json({ code: 0, data: { removed } })
})

// 清空已完成：body { domain }，缺省时两个领域都清
api.post('/todos/clear-completed', (req, res) => {
  const searchDomains = validDomain(req.body?.domain, null) ? [req.body.domain] : DOMAINS
  let removed = 0
  for (const domain of searchDomains) {
    const list = readTodos(domain)
    const kept = list.filter((t) => t.status !== 'done')
    removed += list.length - kept.length
    if (kept.length !== list.length) writeTodos(domain, kept)
  }
  res.json({ code: 0, data: { removed } })
})

/* ================= 日志（独立文件 journals.json） ================= */

function normalizeJournal(body) {
  const now = new Date()
  const nowIso = now.toISOString()
  const today = nowIso.slice(0, 10)
  return {
    id: crypto.randomUUID(),
    date: /^\d{4}-\d{2}-\d{2}$/.test(String(body?.date || '')) ? String(body.date) : today,
    title: String(body?.title || ''),
    mood: ['great', 'ok', 'anxious', 'bad'].includes(body?.mood) ? body.mood : 'ok',
    content: String(body?.content || ''),
    tags: Array.isArray(body?.tags) ? body.tags.map(String).filter(Boolean) : [],
    createdAt: nowIso,
    updatedAt: nowIso
  }
}

api.get('/journals', (_req, res) => {
  res.json({ code: 0, data: readJournals() })
})

api.post('/journals', (req, res) => {
  const journal = normalizeJournal(req.body)
  const list = readJournals()
  list.push(journal)
  writeJournals(list)
  res.json({ code: 0, data: journal })
})

api.put('/journals/:id', (req, res) => {
  const list = readJournals()
  const idx = list.findIndex((j) => j.id === req.params.id)
  if (idx === -1) return res.status(404).json({ code: 1, message: '日志不存在' })
  const body = req.body || {}
  const next = { ...list[idx] }
  if (body.date !== undefined && /^\d{4}-\d{2}-\d{2}$/.test(String(body.date || ''))) next.date = String(body.date)
  if (body.title !== undefined) next.title = String(body.title)
  if (body.mood !== undefined && ['great', 'ok', 'anxious', 'bad'].includes(body.mood)) next.mood = body.mood
  if (body.content !== undefined) next.content = String(body.content)
  if (body.tags !== undefined) next.tags = Array.isArray(body.tags) ? body.tags.map(String).filter(Boolean) : []
  next.updatedAt = new Date().toISOString()
  list[idx] = next
  writeJournals(list)
  res.json({ code: 0, data: next })
})

api.delete('/journals/:id', (req, res) => {
  const list = readJournals()
  const before = list.length
  const kept = list.filter((j) => j.id !== req.params.id)
  writeJournals(kept)
  res.json({ code: 0, data: { removed: before - kept.length } })
})

/* ================= 导出 / 导入 ================= */

// 导出：三个模块打包成一个 JSON 备份
api.get('/export', (_req, res) => {
  const bundle = {
    todos: { work: readTodos('work'), life: readTodos('life') },
    journals: readJournals()
  }
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Content-Disposition', 'attachment; filename="todo-workbench-export.json"')
  res.send(JSON.stringify(bundle, null, 2))
})

// 导入：支持新版 bundle { todos:{work,life}, journals }，也兼容旧版 { todos:[...] }
api.post('/import', (req, res) => {
  const body = req.body
  const bundleMode = body?.todos && !Array.isArray(body.todos)
  let workIn = null
  let lifeIn = null
  let journalsIn = null
  if (bundleMode) {
    workIn = Array.isArray(body.todos.work) ? body.todos.work : null
    lifeIn = Array.isArray(body.todos.life) ? body.todos.life : null
    journalsIn = Array.isArray(body.journals) ? body.journals : null
  } else {
    // 旧版格式：todos 数组视为工作领域，生活与日志保持不变
    workIn = Array.isArray(body?.todos) ? body.todos : Array.isArray(body) ? body : null
  }
  if (workIn === null && lifeIn === null && journalsIn === null) {
    return res.status(400).json({ code: 1, message: '导入文件格式不正确' })
  }

  const dedup = (list) => {
    const seen = new Set()
    return list.filter((t) => (seen.has(t.id) ? false : (seen.add(t.id), true)))
  }
  const cleanTodos = (arr) =>
    dedup(
      arr
        .filter((t) => t && typeof t === 'object')
        .map((t, i) => ({
          id: String(t.id || crypto.randomUUID()),
          title: String(t.title || '未命名任务'),
          desc: String(t.desc || ''),
          priority: ['high', 'medium', 'low'].includes(t.priority) ? t.priority : 'medium',
          status: ['todo', 'doing', 'done'].includes(t.status) ? t.status : 'todo',
          dueDate: t.dueDate ? String(t.dueDate) : '',
          tags: Array.isArray(t.tags) ? t.tags.map(String).filter(Boolean) : [],
          createdAt: t.createdAt || new Date(i + 1e7).toISOString(),
          updatedAt: t.updatedAt || new Date().toISOString(),
          completedAt: t.completedAt || null
        }))
    )
  const cleanJournals = (arr) =>
    dedup(
      arr
        .filter((j) => j && typeof j === 'object')
        .map((j, i) => ({
          id: String(j.id || crypto.randomUUID()),
          date: /^\d{4}-\d{2}-\d{2}$/.test(String(j.date || '')) ? String(j.date) : new Date().toISOString().slice(0, 10),
          title: String(j.title || ''),
          mood: ['great', 'ok', 'anxious', 'bad'].includes(j.mood) ? j.mood : 'ok',
          content: String(j.content || ''),
          tags: Array.isArray(j.tags) ? j.tags.map(String).filter(Boolean) : [],
          createdAt: j.createdAt || new Date(i + 1e7).toISOString(),
          updatedAt: j.updatedAt || new Date().toISOString()
        }))
    )

  let count = 0
  if (workIn !== null) {
    const clean = cleanTodos(workIn)
    writeTodos('work', clean)
    count += clean.length
  }
  if (lifeIn !== null) {
    const clean = cleanTodos(lifeIn)
    writeTodos('life', clean)
    count += clean.length
  }
  if (journalsIn !== null) {
    const clean = cleanJournals(journalsIn)
    writeJournals(clean)
    count += clean.length
  }
  res.json({ code: 0, data: { count } })
})

/* ================= 文章（独立文件 articles.json） ================= */

function normalizeArticle(body) {
  const nowIso = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    title: String(body?.title || '').trim() || '未命名文章',
    content: String(body?.content || ''),
    createdAt: nowIso,
    updatedAt: nowIso
  }
}

api.get('/articles', (_req, res) => {
  res.json({ code: 0, data: readArticles() })
})

api.post('/articles', (req, res) => {
  const article = normalizeArticle(req.body)
  const list = readArticles()
  list.push(article)
  writeArticles(list)
  res.json({ code: 0, data: article })
})

api.put('/articles/:id', (req, res) => {
  const list = readArticles()
  const idx = list.findIndex((a) => a.id === req.params.id)
  if (idx === -1) return res.status(404).json({ code: 1, message: '文章不存在' })
  const body = req.body || {}
  const next = { ...list[idx] }
  if (body.title !== undefined) next.title = String(body.title).trim() || list[idx].title
  if (body.content !== undefined) next.content = String(body.content)
  next.updatedAt = new Date().toISOString()
  list[idx] = next
  writeArticles(list)
  res.json({ code: 0, data: next })
})

api.delete('/articles/:id', (req, res) => {
  const list = readArticles()
  const before = list.length
  writeArticles(list.filter((a) => a.id !== req.params.id))
  res.json({ code: 0, data: { removed: before - list.length } })
})

app.use('/api', api)

// 生产模式：直接托管前端构建产物
const distDir = path.join(__dirname, '..', 'dist')
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir))
  app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(path.join(distDir, 'index.html')))
}

app.listen(PORT, () => {
  console.log(`API server 已启动: http://localhost:${PORT}`)
})
