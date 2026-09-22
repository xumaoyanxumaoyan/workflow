import puppeteer from 'puppeteer-core'

const exe = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const browser = await puppeteer.launch({ executablePath: exe, headless: true, args: ['--no-sandbox'] })
const page = await browser.newPage()
page.on('pageerror', (e) => console.log('PAGEERROR', e.message))

await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' })

// 1. 首页应是待办工作台
console.log('route /:', await page.evaluate(() => location.pathname))
const todoTable = await page.waitForSelector('.t-table', { timeout: 5000 })
console.log('todo page table rendered:', !!todoTable)

// 2. 点击侧边导航“写日志”
await page.evaluate(() => {
  const item = [...document.querySelectorAll('.t-menu__item')].find((el) => el.textContent.includes('写日志'))
  item?.click()
})
await new Promise((r) => setTimeout(r, 800))
console.log('route after nav:', await page.evaluate(() => location.pathname))
const journalHead = await page.evaluate(() => document.querySelector('h3')?.textContent)
console.log('page title:', journalHead)

// 3. 写一篇日志：打开弹窗、输入、保存
await page.evaluate(() => {
  const btn = [...document.querySelectorAll('button')].find((b) => b.textContent.includes('写一篇'))
  btn?.click()
})
await new Promise((r) => setTimeout(r, 600))

await page.click('input[placeholder="今天的关键词（可选）"]')
await page.keyboard.type('重构完成日志页', { delay: 15 })

// 内容 textarea（按 placeholder 精确定位）
const taSel = 'textarea[placeholder*="记录今天"]'
await page.click(taSel)
await page.keyboard.type('完成 vue-router 多页面拆分与日志功能联调，一切正常。', { delay: 10 })
await new Promise((r) => setTimeout(r, 300))

await page.evaluate(() => {
  const btn = [...document.querySelectorAll('.t-dialog button')].find((b) => b.textContent.includes('保存'))
  btn?.click()
})
await new Promise((r) => setTimeout(r, 1000))

const rows = await page.$$eval('.t-table tbody tr', (trs) => trs.map((t) => t.textContent))
console.log('日志表中包含新日志:', rows.some((t) => t.includes('重构完成日志页')))

// 4. 回到待办页确认互不影响
await page.evaluate(() => {
  const item = [...document.querySelectorAll('.t-menu__item')].find((el) => el.textContent.includes('待办工作台'))
  item?.click()
})
await new Promise((r) => setTimeout(r, 600))
console.log('back route:', await page.evaluate(() => location.pathname))

await browser.close()
