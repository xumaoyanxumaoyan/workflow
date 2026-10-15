import express from 'express'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  DOMAINS,
  readTodos, writeTodos, readJournals, writeJournals,
  readArticles, writeArticles,
  readMemos, writeMemos,
  readFitness, writeFitness,
  readFreqFoods, writeFreqFoods,
  readCheckins, writeCheckins,
  initStorage
} from './db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3101

app.use(express.json({ limit: '10mb' }))

// 简易日志
app.use((req, _res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`)
  next()
})

initStorage()

const api = express.Router()

// 健康检查：前端据此判断后端是否可达
api.get('/health', (_req, res) => {
  res.json({ code: 0, data: 'ok' })
})

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

// 导出：所有模块打包成一个 JSON 备份
api.get('/export', (_req, res) => {
  const bundle = {
    todos: { work: readTodos('work'), life: readTodos('life') },
    journals: readJournals(),
    articles: readArticles(),
    memos: readMemos(),
    fitness: readFitness(),
    freqFoods: readFreqFoods(),
    checkins: readCheckins()
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
  const articlesIn = Array.isArray(body?.articles) ? body.articles : null
  if (articlesIn !== null) {
    const clean = dedup(
      articlesIn.filter((a) => a && typeof a === 'object').map((a) => ({
        id: String(a.id || crypto.randomUUID()),
        title: String(a.title || '未命名文章'),
        content: String(a.content || ''),
        createdAt: a.createdAt || new Date().toISOString(),
        updatedAt: a.updatedAt || new Date().toISOString()
      }))
    )
    writeArticles(clean)
    count += clean.length
  }
  if (body?.memos && typeof body.memos === 'object') {
    const foldersIn = Array.isArray(body.memos.folders) ? body.memos.folders : null
    const itemsIn = Array.isArray(body.memos.items) ? body.memos.items : null
    if (foldersIn !== null) {
      const clean = dedup(
        foldersIn.filter((f) => f && typeof f === 'object').map((f) => ({
          id: String(f.id || crypto.randomUUID()),
          name: String(f.name || '未命名文件夹'),
          createdAt: f.createdAt || new Date().toISOString()
        }))
      )
      const validIds = new Set(clean.map((f) => f.id))
      const items = dedup(
        itemsIn.filter((i) => i && typeof i === 'object').map((i) => ({
          id: String(i.id || crypto.randomUUID()),
          folderId: i.folderId && validIds.has(String(i.folderId)) ? String(i.folderId) : null,
          title: String(i.title || '未命名备忘'),
          url: String(i.url || '').trim(),
          remark: String(i.remark || ''),
          createdAt: i.createdAt || new Date().toISOString(),
          updatedAt: i.updatedAt || new Date().toISOString()
        }))
      )
      writeMemos({ folders: clean, items })
      count += clean.length + items.length
    }
  }
  const fitnessIn = Array.isArray(body?.fitness) ? body.fitness : null
  if (fitnessIn !== null) {
    const clean = dedup(
      fitnessIn.filter((r) => r && typeof r === 'object').map((r) => normalizeFitnessRecord(r, null))
    )
    writeFitness(clean)
    count += clean.length
  }
  const freqIn = Array.isArray(body?.freqFoods) ? body.freqFoods : null
  if (freqIn !== null) {
    const clean = dedup(
      freqIn.filter((f) => f && typeof f === 'object').map((f) => ({
        id: String(f.id || crypto.randomUUID()),
        name: String(f.name || '').trim(),
        kcalPer100g: numOr(f.kcalPer100g, 0),
        useCount: numOr(f.useCount, 0),
        lastUsedAt: f.lastUsedAt || new Date().toISOString(),
        createdAt: f.createdAt || new Date().toISOString(),
        updatedAt: f.updatedAt || new Date().toISOString()
      })).filter((f) => f.name)
    )
    writeFreqFoods(clean)
    count += clean.length
  }
  if (body?.checkins && typeof body.checkins === 'object' && !Array.isArray(body.checkins)) {
    const clean = {}
    for (const [date, day] of Object.entries(body.checkins)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !day || typeof day !== 'object') continue
      const cleanDay = {}
      if (day.am) cleanDay.am = { done: !!day.am.done, updatedAt: day.am.updatedAt || new Date().toISOString() }
      if (day.pm) cleanDay.pm = { done: !!day.pm.done, updatedAt: day.pm.updatedAt || new Date().toISOString() }
      if (cleanDay.am || cleanDay.pm) clean[date] = cleanDay
    }
    writeCheckins(clean)
    count += Object.keys(clean).length
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

/* ================= 备忘录（独立文件 memos.json：folders + items） ================= */

api.get('/memos', (_req, res) => {
  res.json({ code: 0, data: readMemos() })
})

// --- 文件夹 ---
api.post('/memos/folders', (req, res) => {
  const name = String(req.body?.name || '').trim()
  if (!name) return res.status(400).json({ code: 1, message: '文件夹名称不能为空' })
  const data = readMemos()
  if (data.folders.some((f) => f.name === name)) {
    return res.status(400).json({ code: 1, message: '同名文件夹已存在' })
  }
  const folder = { id: crypto.randomUUID(), name, createdAt: new Date().toISOString() }
  data.folders.push(folder)
  writeMemos(data)
  res.json({ code: 0, data: folder })
})

api.put('/memos/folders/:id', (req, res) => {
  const name = String(req.body?.name || '').trim()
  if (!name) return res.status(400).json({ code: 1, message: '文件夹名称不能为空' })
  const data = readMemos()
  const folder = data.folders.find((f) => f.id === req.params.id)
  if (!folder) return res.status(404).json({ code: 1, message: '文件夹不存在' })
  if (data.folders.some((f) => f.name === name && f.id !== folder.id)) {
    return res.status(400).json({ code: 1, message: '同名文件夹已存在' })
  }
  folder.name = name
  writeMemos(data)
  res.json({ code: 0, data: folder })
})

// 删除文件夹：其中条目移入「未分类」
api.delete('/memos/folders/:id', (req, res) => {
  const data = readMemos()
  const before = data.folders.length
  data.folders = data.folders.filter((f) => f.id !== req.params.id)
  data.items = data.items.map((i) => (i.folderId === req.params.id ? { ...i, folderId: null, updatedAt: new Date().toISOString() } : i))
  writeMemos(data)
  res.json({ code: 0, data: { removed: before - data.folders.length } })
})

// --- 条目 ---
api.post('/memos/items', (req, res) => {
  const data = readMemos()
  const item = normalizeItem(req.body, data.folders)
  data.items.push(item)
  writeMemos(data)
  res.json({ code: 0, data: item })
})

function normalizeItem(body, folders) {
  const nowIso = new Date().toISOString()
  const folderId = body?.folderId && folders.some((f) => f.id === body.folderId) ? String(body.folderId) : null
  return {
    id: crypto.randomUUID(),
    folderId,
    title: String(body?.title || '').trim() || '未命名备忘',
    url: String(body?.url || '').trim(),
    remark: String(body?.remark || ''),
    createdAt: nowIso,
    updatedAt: nowIso
  }
}

api.put('/memos/items/:id', (req, res) => {
  const data = readMemos()
  const idx = data.items.findIndex((i) => i.id === req.params.id)
  if (idx === -1) return res.status(404).json({ code: 1, message: '备忘不存在' })
  const body = req.body || {}
  const item = data.items[idx]
  if (body.title !== undefined) item.title = String(body.title).trim() || item.title
  if (body.url !== undefined) item.url = String(body.url).trim()
  if (body.remark !== undefined) item.remark = String(body.remark)
  if (body.folderId !== undefined) {
    item.folderId = body.folderId && data.folders.some((f) => f.id === body.folderId) ? String(body.folderId) : null
  }
  item.updatedAt = new Date().toISOString()
  data.items[idx] = item
  writeMemos(data)
  res.json({ code: 0, data: item })
})

api.delete('/memos/items/:id', (req, res) => {
  const data = readMemos()
  const before = data.items.length
  data.items = data.items.filter((i) => i.id !== req.params.id)
  writeMemos(data)
  res.json({ code: 0, data: { removed: before - data.items.length } })
})

/* ================= 减肥管理（独立文件 fitness.json，按日期 upsert） ================= */

const numOr = (v, fallback = null) => {
  const n = Number(v)
  return Number.isFinite(n) && n >= 0 ? n : fallback
}

function normalizeFitnessRecord(body, prev = null) {
  const nowIso = new Date().toISOString()
  return {
    id: prev?.id || crypto.randomUUID(),
    date: /^\d{4}-\d{2}-\d{2}$/.test(String(body?.date || '')) ? String(body.date) : (prev?.date || nowIso.slice(0, 10)),
    weight: body?.weight !== undefined && body?.weight !== null && body?.weight !== '' ? numOr(body.weight, prev?.weight ?? null) : (prev?.weight ?? null),
    foods: Array.isArray(body?.foods)
      ? body.foods
          .filter((f) => f && typeof f === 'object' && String(f.name || '').trim())
          .map((f) => ({
            name: String(f.name).trim(),
            grams: numOr(f.grams),
            kcal: numOr(f.kcal)
          }))
      : (prev?.foods || []),
    exerciseMin: body?.exerciseMin !== undefined && body?.exerciseMin !== null && body?.exerciseMin !== '' ? numOr(body.exerciseMin, prev?.exerciseMin ?? null) : (prev?.exerciseMin ?? null),
    caloriesBurned: body?.caloriesBurned !== undefined && body?.caloriesBurned !== null && body?.caloriesBurned !== '' ? numOr(body.caloriesBurned, prev?.caloriesBurned ?? null) : (prev?.caloriesBurned ?? null),
    sleepHours: body?.sleepHours !== undefined && body?.sleepHours !== null && body?.sleepHours !== '' ? numOr(body.sleepHours, prev?.sleepHours ?? null) : (prev?.sleepHours ?? null),
    note: body?.note !== undefined ? String(body.note) : (prev?.note || ''),
    createdAt: prev?.createdAt || nowIso,
    updatedAt: nowIso
  }
}

// 保存记录时自动学习：有 名称+克重+千卡 的食物 → 更新每 100g 热量密度
function learnFreqFoods(foods) {
  const list = readFreqFoods()
  const nowIso = new Date().toISOString()
  for (const f of foods) {
    if (!f?.name || !f?.grams || !f?.kcal) continue
    const density = Math.round(((f.kcal / f.grams) * 100) * 10) / 10
    const found = list.find((x) => x.name === f.name)
    if (found) {
      found.kcalPer100g = density
      found.useCount++
      found.lastUsedAt = nowIso
      found.updatedAt = nowIso
    } else {
      list.push({ id: crypto.randomUUID(), name: f.name, kcalPer100g: density, useCount: 1, lastUsedAt: nowIso, createdAt: nowIso, updatedAt: nowIso })
    }
  }
  writeFreqFoods(list)
}

// 列表
api.get('/fitness', (_req, res) => {
  res.json({ code: 0, data: readFitness() })
})

// 保存（同一日期视为同一天，直接覆盖更新）
api.post('/fitness', (req, res) => {
  const list = readFitness()
  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(req.body?.date || '')) ? String(req.body.date) : new Date().toISOString().slice(0, 10)
  const idx = list.findIndex((r) => r.date === date)
  const record = normalizeFitnessRecord(req.body, idx !== -1 ? list[idx] : null)
  if (idx !== -1) list[idx] = record
  else list.push(record)
  writeFitness(list)
  learnFreqFoods(record.foods)
  res.json({ code: 0, data: record })
})

api.delete('/fitness/:id', (req, res) => {
  const list = readFitness()
  const before = list.length
  writeFitness(list.filter((r) => r.id !== req.params.id))
  res.json({ code: 0, data: { removed: before - list.length } })
})

/* ---------- 常吃食物库 ---------- */
api.get('/freq-foods', (_req, res) => {
  res.json({ code: 0, data: readFreqFoods() })
})

api.delete('/freq-foods/:id', (req, res) => {
  const list = readFreqFoods()
  const before = list.length
  writeFreqFoods(list.filter((f) => f.id !== req.params.id))
  res.json({ code: 0, data: { removed: before - list.length } })
})

/* ================= 备考打卡（checkins.json） ================= */

api.get('/checkins', (_req, res) => {
  res.json({ code: 0, data: readCheckins() })
})

// 打卡切换：{ date, slot: 'am' | 'pm', done }
api.post('/checkins/toggle', (req, res) => {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(req.body?.date || '')) ? String(req.body.date) : null
  const slot = req.body?.slot === 'am' || req.body?.slot === 'pm' ? req.body.slot : null
  if (!date || !slot) return res.status(400).json({ code: 1, message: '参数不正确' })
  const data = readCheckins()
  const day = data[date] || {}
  day[slot] = { done: !!req.body?.done, updatedAt: new Date().toISOString() }
  data[date] = day
  writeCheckins(data)
  res.json({ code: 0, data: { date, slot, done: !!req.body?.done } })
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
