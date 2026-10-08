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

// 预置明天的测试记录（含食物，不含睡眠）
const d = new Date()
d.setDate(d.getDate() + 1)
const p2 = (n) => String(n).padStart(2, '0')
const testDate = `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`

await page.goto('http://localhost:5304/', { waitUntil: 'networkidle2' })
await page.evaluate(async (dt) => {
  await fetch('/api/fitness', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date: dt, weight: 66, foods: [{ name: '测试燕麦', grams: 50, kcal: 190 }], exerciseMin: 20, caloriesBurned: 150, note: '测试记录' }) })
}, testDate)
console.log('预置测试记录:', testDate)

await page.reload({ waitUntil: 'networkidle2' })
await page.waitForSelector('.t-menu', { timeout: 10000 })
await page.evaluate(() => {
  const i = [...document.querySelectorAll('.t-menu__item')].find((e) => e.textContent.includes('减肥管理'))
  i?.click()
})
await new Promise((r) => setTimeout(r, 1200))
await page.waitForSelector('.t-table tbody tr', { timeout: 8000 })
await new Promise((r) => setTimeout(r, 400))

// 走“编辑”路径：点测试记录（首行）的编辑
await page.evaluate(() => {
  const row = document.querySelector('.t-table tbody tr')
  const link = [...row.querySelectorAll('a, .t-link')].find((a) => a.textContent.includes('编辑'))
  link?.click()
})
await new Promise((r) => setTimeout(r, 700))

// 编辑态：食物行应回填
const backfill = await page.evaluate(() => ({
  banner: document.querySelector('.wb-fitness-banner')?.textContent.slice(0, 20),
  foodName: document.querySelector('.wb-fitness-food-row input')?.value,
  foodKcal: document.querySelector('.wb-fitness-food-row input[placeholder="千卡"]')?.value
}))
console.log('编辑回填:', JSON.stringify(backfill))

// 补睡眠 7.5 并更新
await page.evaluate(() => {
  const sleep = document.querySelector('.wb-fitness-grid input[placeholder="小时"]')
  const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
  s.call(sleep, '7.5')
  sleep.dispatchEvent(new Event('input', { bubbles: true }))
})
await new Promise((r) => setTimeout(r, 300))
await page.evaluate(() => {
  const btn = [...document.querySelectorAll('.wb-fitness-form button')].find((b) => b.textContent.includes('更新当天记录'))
  btn?.click()
})
await new Promise((r) => setTimeout(r, 1200))

// 校验
const fit = JSON.parse(fs.readFileSync('data/fitness.json', 'utf8'))
const rec = fit.find((r) => r.date === testDate)
console.log('更新结果:', rec ? JSON.stringify({ weight: rec.weight, foods: rec.foods.map((f) => f.name), sleepHours: rec.sleepHours }) : '无')
console.log('食物保留:', rec?.foods?.some((f) => f.name === '测试燕麦') === true, '| 睡眠已记录:', rec?.sleepHours === 7.5)

// 用户今天记录完好性
const dd = new Date()
const pp = (n) => String(n).padStart(2, '0')
const todayKey = `${dd.getFullYear()}-${pp(dd.getMonth() + 1)}-${pp(dd.getDate())}`
const today = fit.find((r) => r.date === todayKey)
console.log('用户今天记录:', JSON.stringify({ weight: today?.weight, foods: today?.foods?.map((f) => f.name), note: today?.note }))

// 保存后表单还原检查
const resetState = await page.evaluate(() => ({
  bannerGone: !document.querySelector('.wb-fitness-banner'),
  weightEmpty: !document.querySelector('.wb-fitness-grid input[placeholder="斤"]')?.value
}))
console.log('保存后表单还原:', JSON.stringify(resetState))

// 清理测试记录
if (rec) {
  await page.evaluate(async (id) => fetch(`/api/fitness/${id}`, { method: 'DELETE' }), rec.id)
  console.log('测试记录已清理')
}
await browser.close()
