import puppeteer from 'puppeteer-core'
import * as http from 'node:http'
import fs from 'node:fs'

function get(url) {
  return new Promise((resolve) => {
    http.get(url, (res) => {
      let buf = ''
      res.on('data', (c) => (buf += c))
      res.on('end', () => resolve(JSON.parse(buf).data))
    })
  })
}

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

// 1. 首屏应为工作 tab
const tabs = await page.$$eval('.t-tabs .t-tab-panel, .t-tabs [role=tab]', (els) => els.map((e) => e.textContent.trim()))
console.log('Tab 项:', JSON.stringify(tabs))
const before = await page.$$eval('.t-table tbody tr .wb-title-cell .title', (els) => els.map((e) => e.textContent.trim()))
console.log('工作 tab 首行:', before[0])

// 2. 切到生活
await page.evaluate(() => {
  const tab = [...document.querySelectorAll('.t-tabs [role=tab], .t-tabs .t-tabs__nav-item')].find((e) => e.textContent.includes('生活'))
  tab?.click()
})
await new Promise((r) => setTimeout(r, 1000))
const lifeRows = await page.$$eval('.t-table tbody tr .wb-title-cell .title', (els) => els.map((e) => e.textContent.trim()))
console.log('生活 tab 任务:', JSON.stringify(lifeRows))

// 3. 在生活领域新建一条
await page.evaluate(() => {
  const btn = [...document.querySelectorAll('button')].find((b) => b.textContent.includes('新建任务'))
  btn?.click()
})
await page.waitForSelector('input[placeholder="请输入任务标题"]', { timeout: 8000 })
await new Promise((r) => setTimeout(r, 600)) // 等弹窗动画
await page.click('input[placeholder="请输入任务标题"]')
await page.keyboard.type('给猫买猫粮', { delay: 15 })
await new Promise((r) => setTimeout(r, 300))
await page.evaluate(() => {
  const btn = [...document.querySelectorAll('.t-dialog button')].find((b) => b.textContent.includes('保存'))
  btn?.click()
})
await new Promise((r) => setTimeout(r, 1200))

// 4. 校验：生活文件里有新任务，工作文件没有
const workFile = JSON.parse(fs.readFileSync('data/todos-work.json', 'utf8'))
const lifeFile = JSON.parse(fs.readFileSync('data/todos-life.json', 'utf8'))
console.log('todos-work.json 含"给猫买猫粮":', workFile.some((t) => t.title === '给猫买猫粮'))
console.log('todos-life.json 含"给猫买猫粮":', lifeFile.some((t) => t.title === '给猫买猫粮'))

// 5. 工作文件数量不受影响
console.log('work 条数:', workFile.length, '/ life 条数:', lifeFile.length)

// 6. 清理测试任务
const created = lifeFile.find((t) => t.title === '给猫买买猫粮' || t.title === '给猫买猫粮')
if (created) {
  await new Promise((resolve) => {
    const req = http.request(`http://localhost:3001/api/todos/${created.id}?domain=life`, { method: 'DELETE' }, resolve)
    req.end()
  })
  console.log('测试任务已清理')
}
await browser.close()
