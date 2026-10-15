import puppeteer from 'puppeteer-core'

const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true,
  args: ['--no-sandbox', '--enable-unsafe-swiftshader']
})
const page = await browser.newPage()
page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 2 })
page.on('console', (m) => {
  const t = m.text()
  if (t.includes('avatar3d') || t.includes('GLB')) console.log('CONSOLE:', t.slice(0, 200))
})
await page.goto('http://localhost:5304/', { waitUntil: 'networkidle2' })
await page.waitForSelector('.t-menu', { timeout: 10000 })
await page.evaluate(() => {
  const i = [...document.querySelectorAll('.t-menu__item')].find((e) => e.textContent.includes('减肥管理'))
  i?.click()
})
await new Promise((r) => setTimeout(r, 3000))

const dbg = await page.evaluate(() => window.__WB_AVATAR_DEBUG__?.())
console.log(JSON.stringify(dbg, null, 1))
await browser.close()
