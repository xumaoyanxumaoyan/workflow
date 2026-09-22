import puppeteer from 'puppeteer-core'
import * as http from 'node:http'

const exe = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'

function post(url, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body)
    const req = http.request(url, { method: 'POST', headers: { 'Content-Type': 'application/json' } }, (res) => {
      let buf = ''
      res.on('data', (c) => (buf += c))
      res.on('end', () => resolve(JSON.parse(buf)))
    })
    req.on('error', reject)
    req.end(data)
  })
}

const created = await post('http://localhost:3001/api/journals', {
  date: '2026-09-21',
  content: 'blur隔离测试',
  mood: 'ok',
  title: 'blur测试'
})
const id = created.data.id

const browser = await puppeteer.launch({ executablePath: exe, headless: true, args: ['--no-sandbox'] })
const page = await browser.newPage()
page.on('console', (m) => console.log('CONSOLE', m.text().slice(0, 200)))
page.on('pageerror', (e) => console.log('PAGEERROR', e.message))
await page.goto('http://localhost:5173/journal', { waitUntil: 'networkidle2' })
await new Promise((r) => setTimeout(r, 800))

await page.evaluate((id_) => {
  const rows = [...document.querySelectorAll('.t-table tbody tr')]
  const row = rows.find((r) => r.textContent.includes('blur测试'))
  const link = [...row.querySelectorAll('a, .t-link')].find((a) => a.textContent.includes('编辑'))
  link?.click()
}, id)
await page.waitForSelector('input[placeholder="输入后回车添加"]', { timeout: 8000 })

// 敲入标签
await page.click('input[placeholder="输入后回车添加"]')
await page.keyboard.type('软考')
await new Promise((r) => setTimeout(r, 200))

// 记录原生 blur 事件是否发生
await page.evaluate(() => {
  window.__blurLog = []
  const inner = document.querySelector('.t-tag-input input')
  inner.addEventListener('blur', () => window.__blurLog.push('inner-input-blur'))
})

// 真实鼠标点击弹窗标题（只触发失焦，不点保存）
const head = await page.$('.t-dialog__header')
const hbox = await head.boundingBox()
await page.mouse.click(hbox.x + hbox.width / 2, hbox.y + 10)
await new Promise((r) => setTimeout(r, 500))

const blurLog = await page.evaluate(() => window.__blurLog)
console.log('原生 blur 触发:', JSON.stringify(blurLog))

const chips = await page.$$eval('.t-dialog .t-tag', (els) => els.map((e) => e.textContent.trim()))
console.log('失焦后弹窗内标签芯片:', JSON.stringify(chips))

await new Promise((resolve) => {
  const req = http.request(`http://localhost:3001/api/journals/${id}`, { method: 'DELETE' }, resolve)
  req.end()
})
await browser.close()
