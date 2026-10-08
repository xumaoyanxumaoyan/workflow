import puppeteer from 'puppeteer-core'

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
  const i = [...document.querySelectorAll('.t-menu__item')].find((e) => e.textContent.includes('减肥管理'))
  i?.click()
})
await new Promise((r) => setTimeout(r, 1500))
await page.waitForSelector('.t-table th', { timeout: 8000 })
const th = await page.$$eval('.t-table th', (els) => els.map((e) => e.textContent.trim()))
console.log('表头:', JSON.stringify(th))
const labels = await page.$$eval('.wb-fitness-form .t-form__label', (els) => els.map((e) => e.textContent.trim()))
console.log('表单标签:', JSON.stringify(labels))
const sum = await page.evaluate(() => document.querySelector('.wb-fitness-summary')?.textContent.replace(/\s+/g, ' '))
console.log('汇总栏:', sum)
await browser.close()
