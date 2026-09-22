import puppeteer from 'puppeteer-core'
import * as http from 'node:http'
import fs from 'node:fs'

// 1. 造一条旧任务并直接把 createdAt 改成去年
const created = await new Promise((resolve, reject) => {
  const data = JSON.stringify({ title: '去年任务年份测试' })
  const req = http.request('http://localhost:3001/api/todos', { method: 'POST', headers: { 'Content-Type': 'application/json' } }, (res) => {
    let buf = ''
    res.on('data', (c) => (buf += c))
    res.on('end', () => resolve(JSON.parse(buf)))
  })
  req.on('error', reject)
  req.end(data)
})
const id = created.data.id

const dbPath = 'data/db.json'
const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'))
const todo = db.todos.find((t) => t.id === id)
todo.createdAt = '2025-06-01T08:00:00.000Z'
fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8')
console.log('已把测试任务 createdAt 改为 2025-06-01')

const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true,
  args: ['--no-sandbox']
})
const page = await browser.newPage()
await page.goto('http://localhost:5304/', { waitUntil: 'networkidle2' })
await page.waitForSelector('.t-table tbody tr', { timeout: 10000 })
await new Promise((r) => setTimeout(r, 500))

const rows = await page.$$eval('.t-table tbody tr', (trs) =>
  trs.map((tr) => {
    const cells = [...tr.querySelectorAll('td')]
    const title = tr.querySelector('.wb-title-cell .title')?.textContent.trim()
    const created = cells.map((c) => c.textContent.trim()).find((t) => /(\d{2,4}-)?\d{2}-\d{2} \d{2}:\d{2}/.test(t))
    return { title, created }
  })
)
rows.slice(0, 6).forEach((r, i) => console.log(`${i + 1}. ${r.title} | ${r.created}`))

const oldRow = rows.find((r) => r.title === '去年任务年份测试')
const thisYearRows = rows.filter((r) => r.title !== '去年任务年份测试' && r.created)
const okOld = oldRow?.created?.startsWith('2025-06-01')
const okNew = thisYearRows.length > 0 && thisYearRows.every((r) => !/^\d{4}-/.test(r.created || ''))
console.log('去年任务带年份:', okOld, '| 今年任务不带年份:', okNew)

// 清理测试任务
await new Promise((resolve) => {
  const req = http.request(`http://localhost:3001/api/todos/${id}`, { method: 'DELETE' }, resolve)
  req.end()
})
const db2 = JSON.parse(fs.readFileSync(dbPath, 'utf8'))
console.log('清理后任务数:', db2.todos.length)
await browser.close()
