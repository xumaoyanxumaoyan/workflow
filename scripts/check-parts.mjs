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

const card = await page.$('.wb-avatar-card')

// 打印每个部位网格的世界盒
const parts = await page.evaluate(() => {
  const dbg = window.__WB_AVATAR_DEBUG__
  const raw = dbg.getRaw()
  const list = []
  raw?.traverse((o) => {
    if (o.isMesh) {
      raw.updateWorldMatrix(true, true)
      const b = new dbg.THREE.Box3().setFromObject(o)
      list.push({
        name: o.name || '(无名)',
        size: [b.max.x - b.min.x, b.max.y - b.min.y, b.max.z - b.min.z].map((n) => Number(n.toFixed(2))),
        center: [((b.min.x + b.max.x) / 2).toFixed(2), ((b.min.y + b.max.y) / 2).toFixed(2), ((b.min.z + b.max.z) / 2).toFixed(2)]
      })
    }
  })
  return list
})
console.log('部位网格数:', parts.length)
parts.forEach((p) => console.log(' -', p.name, '| size', JSON.stringify(p.size), '| center', JSON.stringify(p.center)))

// 直接整体显示（隐藏 current）
await page.evaluate(() => {
  const dbg = window.__WB_AVATAR_DEBUG__
  dbg.controls.autoRotate = false
  const cur = dbg.getCurrent()
  if (cur) cur.visible = false
  const raw = dbg.getRaw()
  if (raw) raw.visible = true
  dbg.camera.position.set(0, 110, 330)
  dbg.controls.target.set(0, 79, 0)
  dbg.controls.update()
})
await new Promise((r) => setTimeout(r, 250))
await card.screenshot({ path: 'scripts/avatar-T0-all-parts.png' })
console.log('snapped T0-all-parts')
await browser.close()
