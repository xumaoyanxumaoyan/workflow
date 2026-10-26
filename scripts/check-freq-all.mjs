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
await new Promise((r) => setTimeout(r, 1500))
await page.waitForSelector('.wb-freq-chip', { timeout: 8000 })

// 场景：录入一个只有名称+千卡（无克重）的食物并保存
await page.evaluate(() => {
  const btn = [...document.querySelectorAll('.wb-fitness-form button')].find((b) => b.textContent.includes('添加食物'))
  btn?.click()
})
await new Promise((r) => setTimeout(r, 300))
await page.click('.wb-fitness-food-row input')
await page.keyboard.type('无克重测试苹果', { delay: 10 })
await page.evaluate(() => {
  const kcal = document.querySelector('.wb-fitness-food-row input[placeholder="千卡"]')
  const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
  s.call(kcal, '80')
  kcal.dispatchEvent(new Event('input', { bubbles: true }))
})
await new Promise((r) => setTimeout(r, 200))
await page.evaluate(() => {
  const btn = [...document.querySelectorAll('.wb-fitness-form button')].find((b) => b.textContent.includes('保存记录'))
  btn?.click()
})
await new Promise((r) => setTimeout(r, 1200))

// 校验常吃库出现该食物（无密度也要列出）
const ff = JSON.parse(fs.readFileSync('data/freq-foods.json', 'utf8'))
const apple = ff.find((f) => f.name === '无克重测试苹果')
console.log('常吃库列出无克重食物:', !!apple, apple ? `| kcalPer100g: ${apple.kcalPer100g} | useCount: ${apple.useCount}` : '')

// 页面标签显示
const chips = await page.$$eval('.wb-freq-chip', (els) => els.map((e) => e.textContent.trim()))
console.log('常吃标签:', JSON.stringify(chips))

// 清理测试记录 + 常吃条目
const fit = JSON.parse(fs.readFileSync('data/fitness.json', 'utf8'))
const junk = fit.find((r) => r.foods?.some((f) => f.name === '无克重测试苹果'))
if (junk) {
  fit.foods_placeholder = 1
  const d2 = fit
  // 通过 API 删除
  await fetch(`http://localhost:3101/api/fitness/${junk.id}`, { method: 'DELETE' })
  const ff2 = JSON.parse(fs.readFileSync('data/freq-foods.json', 'utf8')).filter((f) => f.name !== '无克重测试苹果')
  fs.writeFileSync('data/freq-foods.json', JSON.stringify(ff2, null, 2), 'utf8')
  console.log('测试数据已清理, 常吃库剩余:', ff2.length)
}
await browser.close()
