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
  const item = [...document.querySelectorAll('.t-menu__item')].find((el) => el.textContent.includes('减肥管理'))
  item?.click()
})
await new Promise((r) => setTimeout(r, 1200))
await page.waitForSelector('.t-table tbody tr', { timeout: 8000 })
await new Promise((r) => setTimeout(r, 300))

const label = await page.evaluate(() =>
  [...document.querySelectorAll('.wb-fitness-form .t-form__label')].map((l) => l.textContent.trim())
)
console.log('表单标签:', JSON.stringify(label))
const statVals = await page.$$eval('.wb-stat-card', (els) => els.map((e) => e.textContent.replace(/\s+/g, ' ').trim()))
console.log('统计卡片:', JSON.stringify(statVals))
const weightCells = await page.evaluate(() => {
  const rows = [...document.querySelectorAll('.t-table tbody tr')]
  return rows.slice(0, 3).map((r) => {
    const c = r.querySelector('td:nth-child(2)')
    return c ? c.textContent.replace(/\s+/g, ' ').trim() : null
  })
})
console.log('晨重列:', JSON.stringify(weightCells))
const hasJin = weightCells.every((c) => c?.includes('斤'))
const noKg = !JSON.stringify({ label, statVals, weightCells }).includes('kg')
console.log('全部用斤且无 kg 残留:', hasJin && noKg)
await browser.close()
