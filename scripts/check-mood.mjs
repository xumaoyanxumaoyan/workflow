import puppeteer from 'puppeteer-core'

const exe = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const browser = await puppeteer.launch({ executablePath: exe, headless: true, args: ['--no-sandbox'] })
const page = await browser.newPage()
await page.goto('http://localhost:5173/journal', { waitUntil: 'networkidle2' })

await page.evaluate(() => {
  const btn = [...document.querySelectorAll('button')].find((b) => b.textContent.includes('写一篇'))
  btn?.click()
})
await new Promise((r) => setTimeout(r, 600))

const opts = await page.$$eval('.t-dialog .t-radio-button', (els) => els.map((e) => e.textContent.trim()))
console.log('心情选项:', JSON.stringify(opts))

// 点击“焦虑”选项
await page.evaluate(() => {
  const btn = [...document.querySelectorAll('.t-dialog .t-radio-button')].find((b) => b.textContent.includes('焦虑'))
  btn?.click()
})
await new Promise((r) => setTimeout(r, 300))
const checked = await page.evaluate(() => {
  const input = document.querySelector('.t-radio-group input[value="anxious"]')
  return input ? input.checked : null
})
console.log('anxious 可选中:', checked === true)

// 验证选中后能正常保存入库
await page.click('textarea[placeholder*="记录今天"]')
await page.keyboard.type('验证焦虑心情选项', { delay: 10 })
await new Promise((r) => setTimeout(r, 200))
await page.evaluate(() => {
  const btn = [...document.querySelectorAll('.t-dialog button')].find((b) => b.textContent.includes('保存'))
  btn?.click()
})
await new Promise((r) => setTimeout(r, 1000))

const rows = await page.$$eval('.t-table tbody tr', (trs) => trs.map((t) => t.textContent))
console.log('表格中有焦虑日志:', rows.some((t) => t.includes('焦虑') && t.includes('验证焦虑心情选项')))

await browser.close()
