import puppeteer from 'puppeteer-core'

const exe = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const browser = await puppeteer.launch({ executablePath: exe, headless: true, args: ['--no-sandbox'] })
const page = await browser.newPage()
await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' })

await page.evaluate(() => {
  const btn = [...document.querySelectorAll('button')].find((b) => b.textContent.includes('新建任务'))
  btn?.click()
})
await new Promise((r) => setTimeout(r, 600))

await page.click('.t-dialog .t-input__inner')
await page.keyboard.type('E2E验证任务', { delay: 15 })
await new Promise((r) => setTimeout(r, 300))

await page.evaluate(() => {
  const btn = [...document.querySelectorAll('.t-dialog button')].find((b) => b.textContent.includes('保存'))
  btn?.click()
})
await new Promise((r) => setTimeout(r, 1000))

const rows = await page.$$eval('.t-table tbody tr', (trs) => trs.map((t) => t.textContent))
console.log('表格中包含验证任务:', rows.some((t) => t.includes('E2E验证任务')))
await browser.close()
