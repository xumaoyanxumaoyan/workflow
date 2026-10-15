import puppeteer from 'puppeteer-core'

const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true,
  args: ['--no-sandbox', '--enable-unsafe-swiftshader']
})
const page = await browser.newPage()
page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 2 })
page.on('pageerror', (e) => console.log('PAGEERROR', e.message))
page.on('console', (m) => console.log('PAGE-CONSOLE[' + m.type() + ']', m.text().slice(0, 300)))

await page.goto('http://localhost:5304/', { waitUntil: 'networkidle2' })
await page.waitForSelector('.t-menu', { timeout: 10000 })
await page.evaluate(() => {
  const i = [...document.querySelectorAll('.t-menu__item')].find((e) => e.textContent.includes('减肥管理'))
  i?.click()
})
await new Promise((r) => setTimeout(r, 3000))

const card = await page.$('.wb-avatar-card')

async function snap(name) {
  await new Promise((r) => setTimeout(r, 250))
  await card.screenshot({ path: `scripts/avatar-${name}.png` })
  console.log('snapped', name)
}

// 关自动旋转、摆正相机，并输出 GLB 结构
await page.evaluate(() => {
  const dbg = window.__WB_AVATAR_DEBUG__
  dbg.controls.autoRotate = false
  dbg.camera.position.set(0, 110, 330)
  dbg.controls.target.set(0, 79, 0)
  dbg.controls.update()

  const raw = dbg.getRaw()
  const meshes = []
  raw?.traverse((o) => {
    if (o.isMesh) {
      meshes.push({ name: o.name, isSkinned: o.isSkinnedMesh, bones: o.skeleton?.bones?.length ?? null })
    }
  })
  console.log('GLB 结构:', JSON.stringify(meshes))
})

// 测试 1: 原型直接显示（不克隆）
await page.evaluate(() => {
  const dbg = window.__WB_AVATAR_DEBUG__
  const cur = dbg.getCurrent()
  if (cur) cur.visible = false
  const raw = dbg.getRaw()
  if (raw) {
    raw.visible = true
    raw.traverse((o) => { if (o.isSkinnedMesh) o.pose?.() })
  }
  dbg.controls.update()
})
await snap('T1-raw-direct')

// 测试 2: 普通 clone(true)
await page.evaluate(() => {
  const dbg = window.__WB_AVATAR_DEBUG__
  const raw = dbg.getRaw()
  if (raw) raw.visible = false
  const cur = dbg.getCurrent()
  if (cur) cur.visible = false
  const c2 = raw?.clone(true)
  if (c2) {
    c2.visible = true
    c2.scale.set(359, 359, 359)
    c2.position.set(0, 0, 0)
    c2.traverse((o) => { if (o.isSkinnedMesh) o.pose?.() })
    dbg.scene.add(c2)
  }
  dbg.controls.update()
})
await snap('T2-plain-clone')

// 测试 3: SkeletonUtils.clone（恢复 current 用于对照）
await page.evaluate(() => {
  const dbg = window.__WB_AVATAR_DEBUG__
  const cur = dbg.getCurrent()
  if (cur) cur.visible = true
  dbg.controls.update()
})
await snap('T3-skeleton-current')

await browser.close()
