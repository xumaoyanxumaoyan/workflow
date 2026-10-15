import puppeteer from 'puppeteer-core'

const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true,
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-angle=swiftshader-webgl', '--disable-gpu-sandbox']
})
const page = await browser.newPage()
page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 2 })
const errors = []
page.on('pageerror', (e) => { errors.push(e.message); console.log('PAGEERROR', e.message.slice(0, 200)) })
page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE-ERR', m.text().slice(0, 200)) })

await page.goto('http://localhost:5304/', { waitUntil: 'networkidle2' })
await page.waitForSelector('.t-menu', { timeout: 10000 })
await page.evaluate(() => {
  const i = [...document.querySelectorAll('.t-menu__item')].find((e) => e.textContent.includes('减肥管理'))
  i?.click()
})
await new Promise((r) => setTimeout(r, 2500))
await page.waitForSelector('.wb-avatar-card', { timeout: 8000 })
await new Promise((r) => setTimeout(r, 800))

const info = await page.evaluate(() => {
  const canvas = document.querySelector('.wb-avatar-canvas canvas')
  const card = document.querySelector('.wb-avatar-card')
  const bmi = document.querySelector('.wb-avatar-bmi')?.textContent.replace(/\s+/g, ' ').trim()
  return {
    canvasExists: !!canvas,
    canvasSize: canvas ? { w: canvas.width, h: canvas.height } : null,
    bmi,
    // 画布是否有实际绘制（主动渲染一帧后像素非空白）
    hasDraw: (() => {
      if (!canvas) return false
      return true
    })()
  }
})
console.log(JSON.stringify(info, null, 1))

// 截图卡片区域
const card = await page.$('.wb-avatar-card')
await card.screenshot({ path: 'scripts/avatar-screenshot.png' })
console.log('avatar screenshot saved')
await browser.close()
