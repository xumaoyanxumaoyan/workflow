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
  const i = [...document.querySelectorAll('.t-menu__item')].find((e) => e.textContent.includes('减肥管理'))
  i?.click()
})
await new Promise((r) => setTimeout(r, 1200))
await page.waitForSelector('.wb-freq-chip', { timeout: 8000 })
await new Promise((r) => setTimeout(r, 300))

// 真实鼠标点击第一个标签的 ×
const xEl = await page.evaluateHandle(() => document.querySelector('.wb-freq-chip .wb-freq-x'))
console.log('× 元素存在:', !!xEl.asElement())
const xbox = await xEl.asElement().boundingBox()
console.log('× 位置:', JSON.stringify(xbox))
await page.mouse.click(xbox.x + xbox.width / 2, xbox.y + xbox.height / 2)
await new Promise((r) => setTimeout(r, 700))

const dump = await page.evaluate(() => {
  const els = [...document.querySelectorAll('[class*="popup"], [class*="popconfirm"], [class*="tooltip"]')]
  return els.map((e) => ({
    cls: (typeof e.className === 'string' ? e.className : e.className.baseVal || '').slice(0, 80),
    text: e.textContent.trim().slice(0, 50),
    visible: e.offsetParent !== null
  }))
})
console.log(JSON.stringify(dump, null, 1))
await browser.close()
