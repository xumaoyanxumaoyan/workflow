import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true,
  args: ['--no-sandbox']
})
const page = await browser.newPage()
page.setViewport({ width: 1280, height: 900 })
page.on('pageerror', (e) => console.log('PAGEERROR', e.message))

await page.goto('http://localhost:5304/', { waitUntil: 'networkidle2' })
await page.waitForSelector('.t-menu', { timeout: 10000 })
await page.evaluate(() => {
  const i = [...document.querySelectorAll('.t-menu__item')].find((e) => e.textContent.includes('减肥管理'))
  i?.click()
})
await new Promise((r) => setTimeout(r, 1200))
await page.waitForSelector('.wb-fitness-form', { timeout: 8000, visible: true })
await new Promise((r) => setTimeout(r, 400))

// 1. 表单里出现“睡眠 (小时)”输入框
const labels = await page.$$eval('.wb-fitness-form .t-form__label', (els) => els.map((e) => e.textContent.trim()))
console.log('表单标签:', JSON.stringify(labels))

// 2. 填写：睡眠 7.5 小时 + 体重 142.7（同一天覆盖你的真实记录前先记下原值）
const before = JSON.parse(fs.readFileSync('data/fitness.json', 'utf8'))
const orig = before.find((r) => r.date === todayIso())
function todayIso() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
console.log('今天已有记录:', orig ? JSON.stringify({ weight: orig.weight, sleepHours: orig.sleepHours }) : '无')

// 用明天的日期测试，不碰用户今天的数据
const d = new Date()
d.setDate(d.getDate() + 1)
const p2 = (n) => String(n).padStart(2, '0')
const testDate = `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`

await page.evaluate((v) => {
  const dpInput = document.querySelector('.wb-fitness-grid .t-date-picker input')
  const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
  s.call(dpInput, v)
  dpInput.dispatchEvent(new Event('input', { bubbles: true }))
}, testDate)
await page.keyboard.press('Enter')
await new Promise((r) => setTimeout(r, 300))

await page.evaluate(() => {
  const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
  const sleep = document.querySelector('.wb-fitness-grid input[placeholder="小时"]')
  s.call(sleep, '7.5')
  sleep.dispatchEvent(new Event('input', { bubbles: true }))
})
await new Promise((r) => setTimeout(r, 300))

// 保存
await page.evaluate(() => {
  const btn = [...document.querySelectorAll('.wb-fitness-form button')].find((b) => b.textContent.includes('保存记录'))
  btn?.click()
})
await new Promise((r) => setTimeout(r, 1200))

// 3. 校验文件 + 表格
const fit = JSON.parse(fs.readFileSync('data/fitness.json', 'utf8'))
const rec = fit.find((r) => r.date === testDate)
console.log('测试记录已保存:', !!rec, rec ? `| sleepHours: ${rec.sleepHours}` : '')

const row = await page.evaluate(() => {
  const rows = [...document.querySelectorAll('.t-table tbody tr')]
  const tr = rows[0]
  return tr ? tr.textContent.replace(/\s+/g, ' ').slice(0, 100) : null
})
console.log('首行(最近):', row)
console.log('表格行含 7.5 小时:', row?.includes('7.5 小时'))

// 4. 编辑回填校验：点首行编辑，睡眠输入框应有 7.5
await page.evaluate(() => {
  const row = document.querySelector('.t-table tbody tr')
  const link = [...row.querySelectorAll('a, .t-link')].find((a) => a.textContent.includes('编辑'))
  link?.click()
})
await new Promise((r) => setTimeout(r, 600))
const backfill = await page.evaluate(() => document.querySelector('.wb-fitness-grid input[placeholder="小时"]')?.value)
console.log('编辑回填睡眠:', backfill)

// 5. 清理测试记录
if (rec) {
  await page.evaluate(async (id) => fetch(`/api/fitness/${id}`, { method: 'DELETE' }), rec.id)
  const after = JSON.parse(fs.readFileSync('data/fitness.json', 'utf8'))
  console.log('测试记录已清理:', !after.some((r) => r.date === testDate))
}
await browser.close()
