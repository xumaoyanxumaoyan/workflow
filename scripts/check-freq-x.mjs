import puppeteer from 'puppeteer-core'

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
await page.waitForSelector('.wb-freq-chip', { timeout: 8000 })
await new Promise((r) => setTimeout(r, 300))

// 通过 API 新增一个临时常吃食物用于测试（不动用户的真实常吃库条目）
const created = await page.evaluate(async () => {
  const res = await fetch('/api/fitness', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date: '2026-10-09', foods: [{ name: '临时测试食物', grams: 100, kcal: 250 }] }) })
  return res.json()
})
console.log('制造学习记录:', created.code === 0)
await page.evaluate(() => fetch('/api/fitness').then((r) => r.json()))
// 刷新页面拿最新常吃库
await page.reload({ waitUntil: 'networkidle2' })
await page.waitForSelector('.t-menu', { timeout: 10000 })
await page.evaluate(() => {
  const i = [...document.querySelectorAll('.t-menu__item')].find((e) => e.textContent.includes('减肥管理'))
  i?.click()
})
await new Promise((r) => setTimeout(r, 1200))
await page.waitForSelector('.wb-freq-chip', { timeout: 8000 })

// 点击临时标签的 ×
const xEl = await page.evaluateHandle(() => {
  const chip = [...document.querySelectorAll('.wb-freq-chip')].find((c) => c.textContent.includes('临时测试食物'))
  return chip?.querySelector('.wb-freq-x')
})
const xbox = await xEl.asElement().boundingBox()
await page.mouse.click(xbox.x + xbox.width / 2, xbox.y + xbox.height / 2)
await new Promise((r) => setTimeout(r, 600))

// 气泡出现？
const bubbleText = await page.evaluate(() => document.querySelector('.t-popconfirm, .t-popup')?.textContent?.slice(0, 40))
console.log('点击 × 后气泡:', bubbleText)
console.log('气泡确认出现:', !!bubbleText && bubbleText.includes('移除'))

// 点确认 → 移除
await page.evaluate(() => {
  const btn = [...document.querySelectorAll('.t-popconfirm button, .t-popup button')].find((b) => b.textContent.trim() === '确定')
  btn?.click()
})
await new Promise((r) => setTimeout(r, 800))
const stillThere = await page.evaluate(() => [...document.querySelectorAll('.wb-freq-chip')].some((c) => c.textContent.includes('临时测试食物')))
console.log('确认后已从常吃列表移除:', !stillThere)

// 不再点确认而是点其他位置 → 不移除（验证误点安全）
await browser.close()
