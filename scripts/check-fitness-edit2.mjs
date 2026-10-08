import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const DATE = '2026-10-08'

const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true,
  args: ['--no-sandbox']
})
const page = await browser.newPage()
page.on('pageerror', (e) => console.log('PAGEERROR', e.message))
page.on('request', (req) => {
  if (req.url().includes('/api/fitness') && req.method() === 'POST') {
    console.log('POST /api/fitness body:', req.postData())
  }
})
page.on('response', async (res) => {
  if (res.url().includes('/api/fitness') && res.request().method() === 'POST') {
    console.log('响应:', res.status(), (await res.text()).slice(0, 160))
  }
})

await page.goto('http://localhost:5304/', { waitUntil: 'networkidle2' })
await page.waitForSelector('.t-menu', { timeout: 10000 })
await page.evaluate(() => {
  const item = [...document.querySelectorAll('.t-menu__item')].find((el) => el.textContent.includes('减肥管理'))
  item?.click()
})
await new Promise((r) => setTimeout(r, 1200))
await page.waitForSelector('.t-table tbody tr', { timeout: 8000 })

const before = JSON.parse(fs.readFileSync('data/fitness.json', 'utf8'))
const target = before.find((r) => r.date === DATE)
console.log('编辑前目标记录:', target ? JSON.stringify({ date: target.date, weight: target.weight }) : `找不到 ${DATE} 记录`)

// 点击该记录的“编辑”（页面日期显示为 10-08，今年不显示年份）
const clicked = await page.evaluate((d) => {
  const rows = [...document.querySelectorAll('.t-table tbody tr')]
  const short = d.slice(5)
  const row = rows.find((r) => r.textContent.includes(short))
  if (!row) return false
  const link = [...row.querySelectorAll('a, .t-link')].find((a) => a.textContent.includes('编辑'))
  link?.click()
  return true
}, DATE)
console.log('点击编辑:', clicked)
await new Promise((r) => setTimeout(r, 600))

// 表单是否回填
const formWeight = await page.evaluate(() => document.querySelector('.wb-fitness-grid input[placeholder="kg"]')?.value)
const btnText = await page.evaluate(() => {
  const btn = [...document.querySelectorAll('.wb-fitness-form button')].find((b) => b.textContent.includes('当天记录') || b.textContent.includes('保存记录'))
  return btn?.textContent.trim()
})
console.log('表单回填体重:', formWeight, '| 按钮:', btnText)

// 改体重为 70.2 并保存
await page.evaluate(() => {
  const w = document.querySelector('.wb-fitness-grid input[placeholder="kg"]')
  const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
  s.call(w, '70.2')
  w.dispatchEvent(new Event('input', { bubbles: true }))
})
await new Promise((r) => setTimeout(r, 300))
await page.evaluate(() => {
  const btn = [...document.querySelectorAll('.wb-fitness-form button')].find((b) => b.textContent.includes('更新当天记录'))
  btn?.click()
})
await new Promise((r) => setTimeout(r, 1200))

const after = JSON.parse(fs.readFileSync('data/fitness.json', 'utf8'))
const target2 = after.find((r) => r.date === DATE)
console.log('编辑后目标记录:', JSON.stringify({ date: target2?.date, weight: target2?.weight, sameId: target2?.id === target?.id }))
console.log('体重已更新为 70.2:', target2?.weight === 70.2)

// 还原用户数据
if (target2 && target2.weight === 70.2 && target) {
  target2.weight = target.weight
  fs.writeFileSync('data/fitness.json', JSON.stringify(after, null, 2), 'utf8')
  console.log('已还原体重为', target.weight)
}
await browser.close()
