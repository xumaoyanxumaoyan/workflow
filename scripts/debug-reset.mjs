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
await page.waitForSelector('.t-table tbody tr', { timeout: 8000 })
await new Promise((r) => setTimeout(r, 400))

// 编辑 → 立即点更新 → 不同时间点观察晨重输入框
await page.evaluate(() => {
  const row = document.querySelector('.t-table tbody tr')
  const link = [...row.querySelectorAll('a, .t-link')].find((a) => a.textContent.includes('编辑'))
  link?.click()
})
await new Promise((r) => setTimeout(r, 700))
const v1 = await page.evaluate(() => document.querySelector('.wb-fitness-grid input[placeholder="斤"]')?.value)
console.log('编辑回填后:', v1)

await page.evaluate(() => {
  const btn = [...document.querySelectorAll('.wb-fitness-form button')].find((b) => b.textContent.includes('更新当天记录'))
  btn?.click()
})
await new Promise((r) => setTimeout(r, 500))
const v2 = await page.evaluate(() => document.querySelector('.wb-fitness-grid input[placeholder="斤"]')?.value)
console.log('更新后 500ms:', v2)
await new Promise((r) => setTimeout(r, 1500))
const v3 = await page.evaluate(() => document.querySelector('.wb-fitness-grid input[placeholder="斤"]')?.value)
console.log('更新后 2s:', v3)
await browser.close()
