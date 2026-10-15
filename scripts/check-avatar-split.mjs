import puppeteer from 'puppeteer-core'

const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true,
  args: ['--no-sandbox', '--enable-unsafe-swiftshader']
})
const page = await browser.newPage()
page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 2 })
page.on('pageerror', (e) => console.log('PAGEERROR', e.message))

await page.goto('http://localhost:5304/', { waitUntil: 'networkidle2' })
await page.waitForSelector('.t-menu', { timeout: 10000 })
await page.evaluate(() => {
  const i = [...document.querySelectorAll('.t-menu__item')].find((e) => e.textContent.includes('减肥管理'))
  i?.click()
})
await new Promise((r) => setTimeout(r, 3000))

// 分组渲染：A) 只显示 current（克隆）  B) 只显示 raw（原型）
await page.evaluate(() => {
  const dbg = window.__WB_AVATAR_DEBUG__
  dbg.controls.autoRotate = false
  dbg.camera.position.set(0, 110, 320)
  dbg.controls.target.set(0, 79, 0)
  const cur = dbg.getCurrent()
  const raw = dbg.getRaw()
  if (raw) raw.visible = false
  if (cur) cur.visible = true
  dbg.controls.update()
})
await new Promise((r) => setTimeout(r, 300))
const card = await page.$('.wb-avatar-card')
await card.screenshot({ path: 'scripts/avatar-A-current.png' })

await page.evaluate(() => {
  const dbg = window.__WB_AVATAR_DEBUG__
  const cur = dbg.getCurrent()
  const raw = dbg.getRaw()
  if (cur) cur.visible = false
  if (raw) {
    raw.visible = true
    raw.scale.set(359, 359, 359)
    raw.position.set(0, -143, -0)
  }
  dbg.controls.update()
})
await new Promise((r) => setTimeout(r, 300))
await card.screenshot({ path: 'scripts/avatar-B-raw.png' })

console.log('screenshots saved')
await browser.close()
