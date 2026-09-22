import puppeteer from 'puppeteer-core'

const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true,
  args: ['--no-sandbox']
})
const page = await browser.newPage()
page.on('pageerror', (e) => console.log('PAGEERROR', e.message))
page.on('request', (req) => {
  if (req.url().includes('/api/articles') && req.method() === 'PUT') {
    console.log('自动保存请求:', req.postData()?.slice(0, 120))
  }
})

await page.goto('http://localhost:5304/', { waitUntil: 'networkidle2' })
await page.waitForSelector('.t-menu', { timeout: 10000 })

// 1. 点击侧边导航“写文章”
await page.evaluate(() => {
  const item = [...document.querySelectorAll('.t-menu__item')].find((el) => el.textContent.includes('写文章'))
  item?.click()
})
await new Promise((r) => setTimeout(r, 1000))
console.log('路由:', await page.evaluate(() => location.hash || location.pathname))
console.log('页面标题:', await page.evaluate(() => document.querySelector('h3')?.textContent))
console.log('默认选中示例文章标题:', await page.evaluate(() => document.querySelector('.wb-editor-title input')?.value))

// 2. 清空 textarea，输入指定文字
await page.click('.wb-editor')
await page.evaluate(() => {
  const ta = document.querySelector('.wb-editor')
  ta.value = ''
  ta.dispatchEvent(new Event('input', { bubbles: true }))
})
await page.keyboard.type('今天写了三行文字测试字数统计功能', { delay: 10 })
await new Promise((r) => setTimeout(r, 300))
const total = await page.evaluate(() => document.querySelector('.wb-editor-status span')?.textContent)
console.log('状态栏:', total, '| 预期: 全文', '今天写了三行文字测试字数统计功能'.length, '字')

// 3. 选中文字：Home 到行首，Shift+方向键选 4 个字
await page.keyboard.down('Shift')
await page.keyboard.press('Home')
await page.keyboard.up('Shift')
await page.keyboard.press('Home') // 光标回行首
await page.keyboard.down('Shift')
for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowRight')
await page.keyboard.up('Shift')
await new Promise((r) => setTimeout(r, 400))
const status = await page.evaluate(() => [...document.querySelectorAll('.wb-editor-status span')].map((s) => s.textContent.trim()))
console.log('选中后状态栏:', JSON.stringify(status), '| 预期包含 已选中 4 字')

// 4. 等防抖自动保存，校验 articles.json
await new Promise((r) => setTimeout(r, 1500))
const fs = await import('node:fs')
const arts = JSON.parse(fs.readFileSync('data/articles.json', 'utf8'))
const target = arts.find((a) => a.content.includes('字数统计功能'))
console.log('articles.json 已自动保存:', !!target, target ? `| 内容长度 ${target.content.length}` : '')

await browser.close()
