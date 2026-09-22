import puppeteer from 'puppeteer-core'
import * as http from 'node:http'

const exe = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const uniq = '标签测试-' + Date.now()

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

// 按是否传 commitByEnter 决定输入方式：true=敲回车；false=敲完直接用真实鼠标点保存
async function runScenario(commitByEnter) {
  const created = await post('http://localhost:3001/api/journals', {
    date: '2026-09-21',
    content: '场景测试-' + (commitByEnter ? 'enter' : 'no-enter'),
    mood: 'ok',
    title: uniq
  })
  const id = created.data.id

  const browser = await puppeteer.launch({ executablePath: exe, headless: true, args: ['--no-sandbox'] })
  const page = await browser.newPage()
  page.on('pageerror', (e) => console.log('PAGEERROR', e.message))
  await page.goto('http://localhost:5173/journal', { waitUntil: 'networkidle2' })
  await page.waitForSelector('.t-table tbody tr', { timeout: 10000 })

  const opened = await page.evaluate((t) => {
    const row = [...document.querySelectorAll('.t-table tbody tr')].find((r) => r.textContent.includes(t))
    if (!row) return false
    const link = [...row.querySelectorAll('a, .t-link')].find((a) => a.textContent.includes('编辑'))
    link?.click()
    return true
  }, uniq)
  console.log('打开编辑弹窗:', opened)
  await page.waitForSelector('.t-dialog .t-tag-input input', { timeout: 8000 })
  await new Promise((r) => setTimeout(r, 600)) // 等弹窗入场动画结束

  await page.click('.t-dialog .t-tag-input input')
  await page.keyboard.type('软考', { delay: 15 })
  if (commitByEnter) await page.keyboard.press('Enter')
  await new Promise((r) => setTimeout(r, 200))

  // 真实鼠标点击保存（产生 mousedown → blur）；enter 场景也用真实点击
  await new Promise((r) => setTimeout(r, 500)) // 等弹窗入场动画结束
  const btn = await page.evaluateHandle(() =>
    [...document.querySelectorAll('.t-dialog button')].find((b) => b.textContent.includes('保存'))
  )
  let box = await btn.asElement().boundingBox()
  for (let i = 0; i < 5 && !box; i++) {
    await new Promise((r) => setTimeout(r, 300))
    box = await btn.asElement().boundingBox()
  }
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
  await new Promise((r) => setTimeout(r, 1200))

  const list = await get('http://localhost:3001/api/journals')
  const saved = list.find((j) => j.id === id)
  console.log(`场景[${commitByEnter ? '敲回车' : '不回车直接保存'}] → 后端 tags:`, JSON.stringify(saved?.tags))

  await new Promise((resolve) => {
    const req = http.request(`http://localhost:3001/api/journals/${id}`, { method: 'DELETE' }, resolve)
    req.end()
  })
  await browser.close()
}

console.log('--- 场景A: 敲回车后保存 ---')
await runScenario(true)
console.log('--- 场景B: 不按回车直接保存 ---')
await runScenario(false)
