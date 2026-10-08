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

// 先通过 API 造一条明天的测试记录（含食物，不含睡眠）
const d = new Date()
d.setDate(d.getDate() + 1)
const p2 = (n) => String(n).padStart(2, '0')
const testDate = `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`
const shortDate = `${p2(d.getMonth() + 1)}-${p2(d.getDate())}`

await page.goto('http://localhost:5304/', { waitUntil: 'networkidle2' })
await page.evaluate(async (dt) => {
  await fetch('/api/fitness', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date: dt, weight: 66, foods: [{ name: '测试燕麦', grams: 50, kcal: 190 }], exerciseMin: 20, caloriesBurned: 150, note: '测试记录' }) })
}, testDate)
console.log('已预置明天测试记录:', testDate)

await page.reload({ waitUntil: 'networkidle2' })
await page.waitForSelector('.t-menu', { timeout: 10000 })
await page.evaluate(() => {
  const i = [...document.querySelectorAll('.t-menu__item')].find((e) => e.textContent.includes('减肥管理'))
  i?.click()
})
await new Promise((r) => setTimeout(r, 1200))
await page.waitForSelector('.wb-fitness-form', { timeout: 8000, visible: true })
await new Promise((r) => setTimeout(r, 400))

// 用真实键盘输入日期
await page.click('.wb-fitness-grid .t-date-picker input')
await page.keyboard.type(testDate, { delay: 20 })
await page.keyboard.press('Enter')
await new Promise((r) => setTimeout(r, 600))

// 校验自动载入
const backfill = await page.evaluate(() => ({
  weight: document.querySelector('.wb-fitness-grid input[placeholder="斤"]')?.value,
  foodName: document.querySelector('.wb-fitness-food-row input')?.value,
  infoShown: !!document.querySelector('.t-message, .t-message__list')
}))
console.log('选日期后自动载入:', JSON.stringify(backfill))

// 补睡眠 7.5 小时并保存
await page.evaluate(() => {
  const sleep = document.querySelector('.wb-fitness-grid input[placeholder="小时"]')
  const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
  s.call(sleep, '7.5')
  sleep.dispatchEvent(new Event('input', { bubbles: true }))
})
await new Promise((r) => setTimeout(r, 300))
await page.evaluate(() => {
  const btn = [...document.querySelectorAll('.wb-fitness-form button')].find((b) => b.textContent.includes('保存记录'))
  btn?.click()
})
await new Promise((r) => setTimeout(r, 1200))

// 校验：食物保留 + 睡眠新增
const fit = JSON.parse(fs.readFileSync('data/fitness.json', 'utf8'))
const rec = fit.find((r) => r.date === testDate)
console.log('合并保存结果:', rec ? JSON.stringify({ weight: rec.weight, foods: rec.foods, sleepHours: rec.sleepHours, exerciseMin: rec.exerciseMin }) : '无记录')
console.log('食物未丢失:', rec?.foods?.some((f) => f.name === '测试燕麦'), '| 睡眠已记录:', rec?.sleepHours === 7.5)

// 确认用户今天的记录完好
const today = fit.find((r) => {
  const dd = new Date()
  const pp = (n) => String(n).padStart(2, '0')
  return r.date === `${dd.getFullYear()}-${pp(dd.getMonth() + 1)}-${pp(dd.getDate())}`
})
console.log('用户今天记录完好:', JSON.stringify({ weight: today?.weight, foods: today?.foods?.length, note: today?.note }))

// 清理测试记录
if (rec) {
  await page.evaluate(async (id) => fetch(`/api/fitness/${id}`, { method: 'DELETE' }), rec.id)
  console.log('测试记录已清理')
}
await browser.close()
