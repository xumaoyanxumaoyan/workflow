import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true,
  args: ['--no-sandbox']
})
const page = await browser.newPage()
page.on('pageerror', (e) => console.log('PAGEERROR', e.message))

await page.goto('http://localhost:5304/', { waitUntil: 'networkidle2' })
await page.waitForSelector('.t-menu', { timeout: 10000 })
await page.evaluate(() => {
  const item = [...document.querySelectorAll('.t-menu__item')].find((el) => el.textContent.includes('减肥管理'))
  item?.click()
})
await new Promise((r) => setTimeout(r, 1200))
await page.waitForSelector('.wb-fitness-form', { timeout: 8000, visible: true })
await new Promise((r) => setTimeout(r, 400))

// 1. 常吃食物标签出现
const chips = await page.$$eval('.wb-freq-chip', (els) => els.map((e) => e.textContent.trim()))
console.log('常吃食物标签:', JSON.stringify(chips))

// 2. 点击「鸡胸肉」标签 → 自动加行
const chip = await page.evaluateHandle(() =>
  [...document.querySelectorAll('.wb-freq-chip span')].find((e) => e.textContent.includes('鸡胸肉'))
)
const cbox = await chip.asElement().boundingBox()
await page.mouse.click(cbox.x + cbox.width / 2, cbox.y + cbox.height / 2)
await new Promise((r) => setTimeout(r, 300))

const rowName = await page.evaluate(() => document.querySelector('.wb-fitness-food-row input')?.value)
console.log('点击标签后自动填入名称:', rowName)

// 3. 填克重 150g → 千卡自动算出（133/100*150 = 199.5）
await page.click('.wb-fitness-food-row input[placeholder="克重 g"]')
await page.keyboard.type('150', { delay: 15 })
// 触发 change：按 Tab 使其失焦
await page.keyboard.press('Tab')
await new Promise((r) => setTimeout(r, 400))
const kcal = await page.evaluate(() => document.querySelector('.wb-fitness-food-row input[placeholder="千卡"]')?.value)
console.log('克重 150g → 自动计算千卡:', kcal, '| 预期 199.5')

// 4. 保存记录 → 校验 fitness.json 与 freq-foods.json 学习
await page.evaluate(() => {
  const btn = [...document.querySelectorAll('.wb-fitness-form button')].find((b) => b.textContent.includes('保存记录'))
  btn?.click()
})
await new Promise((r) => setTimeout(r, 1200))

const fit = JSON.parse(fs.readFileSync('data/fitness.json', 'utf8'))
const rec = fit.find((r) => r.foods?.some((f) => f.name === '鸡胸肉' && f.grams === 150))
console.log('记录已保存:', !!rec, rec ? `| foods: ${JSON.stringify(rec.foods)}` : '')

const ff = JSON.parse(fs.readFileSync('data/freq-foods.json', 'utf8'))
const learned = ff.find((f) => f.name === '鸡胸肉')
console.log('常吃库已学习更新:', JSON.stringify({ kcalPer100g: learned?.kcalPer100g, useCount: learned?.useCount }))

// 5. 清理测试记录
if (rec) {
  await page.evaluate(async (id) => fetch(`/api/fitness/${id}`, { method: 'DELETE' }), rec.id)
  console.log('测试记录已清理')
}
await browser.close()
