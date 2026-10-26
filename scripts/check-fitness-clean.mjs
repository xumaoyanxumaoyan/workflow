import puppeteer from 'puppeteer-core'

const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true,
  args: ['--no-sandbox']
})
const page = await browser.newPage()
page.setViewport({ width: 1280, height: 900 })
const errors = []
page.on('pageerror', (e) => { errors.push(e.message); console.log('PAGEERROR', e.message.slice(0, 150)) })

await page.goto('http://localhost:5304/', { waitUntil: 'networkidle2' })
await page.waitForSelector('.t-menu', { timeout: 10000 })
await page.evaluate(() => {
  const i = [...document.querySelectorAll('.t-menu__item')].find((e) => e.textContent.includes('减肥管理'))
  i?.click()
})
await new Promise((r) => setTimeout(r, 1500))
await page.waitForSelector('.t-table tbody tr', { timeout: 8000 })

const checks = await page.evaluate(() => ({
  title: document.querySelector('h3')?.textContent,
  statCards: document.querySelectorAll('.wb-stat-card').length,
  rows: document.querySelectorAll('.t-table tbody tr').length,
  noAvatar: !document.querySelector('.wb-avatar-card'),
  sleepCol: [...document.querySelectorAll('.t-table th')].some((t) => t.textContent.includes('睡眠'))
}))
console.log(JSON.stringify(checks, null, 1))
console.log('页面 JS 错误数:', errors.length)
await browser.close()
