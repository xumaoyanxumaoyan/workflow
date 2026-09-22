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
function get(url) {
  return new Promise((resolve) => {
    http.get(url, (res) => {
      let buf = ''
      res.on('data', (c) => (buf += c))
      res.on('end', () => resolve(JSON.parse(buf).data))
    })
  })
}

const created = await post('http://localhost:3001/api/journals', {
  date: '2026-09-21',
  content: '未回车直接保存测试',
  mood: 'ok',
  title: '未回车测试'
})
const id = created.data.id

const browser = await puppeteer.launch({ executablePath: exe, headless: true, args: ['--no-sandbox'] })
const page = await browser.newPage()
await page.goto('http://localhost:5173/journal', { waitUntil: 'networkidle2' })
await new Promise((r) => setTimeout(r, 800))

await page.evaluate((id_) => {
  const rows = [...document.querySelectorAll('.t-table tbody tr')]
  const row = rows.find((r) => r.textContent.includes('未回车测试'))
  const link = [...row.querySelectorAll('a, .t-link')].find((a) => a.textContent.includes('编辑'))
  link?.click()
}, id)
await page.waitForSelector('input[placeholder="输入后回车添加"]', { timeout: 8000 })

// 敲入标签文字，不按回车，用真实鼠标点击保存（会触发输入框失焦）
await page.click('input[placeholder="输入后回车添加"]')
await page.keyboard.type('软考')
const saveBtn = await page.evaluateHandle(() =>
  [...document.querySelectorAll('.t-dialog button')].find((b) => b.textContent.includes('保存'))
)
const box = await saveBtn.asElement().boundingBox()
await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
await new Promise((r) => setTimeout(r, 1200))

const list = await get('http://localhost:3001/api/journals')
const saved = list.find((j) => j.id === id)
console.log('未按回车直接保存 → 后端 tags:', JSON.stringify(saved?.tags))

await new Promise((resolve) => {
  const req = http.request(`http://localhost:3001/api/journals/${id}`, { method: 'DELETE' }, resolve)
  req.end()
})
await browser.close()
