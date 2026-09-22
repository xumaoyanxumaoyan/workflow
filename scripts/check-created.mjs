import puppeteer from 'puppeteer-core'

const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true,
  args: ['--no-sandbox']
})
const page = await browser.newPage()
page.on('pageerror', (e) => console.log('PAGEERROR', e.message))
await page.goto('http://localhost:5304/', { waitUntil: 'networkidle2' })
await page.waitForSelector('.t-table tbody tr', { timeout: 10000 })
await new Promise((r) => setTimeout(r, 500))

// 表头
const headers = await page.$$eval('.t-table th', (els) => els.map((e) => e.textContent.trim()))
console.log('表头:', JSON.stringify(headers))

// 首屏行：标题 + 创建时间列
const rows = await page.$$eval('.t-table tbody tr', (trs) =>
  trs.map((tr) => {
    const cells = [...tr.querySelectorAll('td')]
    const title = tr.querySelector('.wb-title-cell .title')?.textContent.trim()
    const created = cells.map((c) => c.textContent).find((t) => /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(t.trim()))
    return { title, created: created?.trim() }
  })
)
console.log('前 5 行:')
rows.slice(0, 5).forEach((r, i) => console.log(`  ${i + 1}. ${r.title} | 创建: ${r.created}`))

// 校验倒序
const times = rows.map((r) => r.created).filter(Boolean)
const sorted = [...times].sort().reverse()
console.log('按创建时间倒序:', JSON.stringify(times) === JSON.stringify(sorted))

await browser.close()
