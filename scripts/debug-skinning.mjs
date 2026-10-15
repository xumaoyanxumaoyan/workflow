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

async function snap(name) {
  await new Promise((r) => setTimeout(r, 250))
  await card.screenshot({ path: `scripts/avatar-${name}.png` })
  console.log('snapped', name)
}

// 关闭自动旋转、摆正相机
await page.evaluate(() => {
  const dbg = window.__WB_AVATAR_DEBUG__
  dbg.controls.autoRotate = false
  dbg.camera.position.set(0, 110, 330)
  dbg.controls.target.set(0, 79, 0)
  dbg.controls.update()

  // 结构探针
  const raw = dbg.getRaw()
  const meshes = []
  raw?.traverse((o) => {
    if (o.isMesh) {
      meshes.push({
        name: o.name,
        isSkinned: o.isSkinnedMesh,
        bones: o.skeleton?.bones?.length ?? null,
        verts: o.geometry?.attributes?.position?.count ?? null
      })
    }
  })
  console.log('GLB 结构:', JSON.stringify(meshes))

  // 测试 1: 原型直接显示（不克隆），只显示人体件
  await page.evaluate(() => {
    const dbg = window.__WB_AVATAR_DEBUG__
    const cur = dbg.getCurrent()
    if (cur) cur.visible = false
    const raw = dbg.getRaw()
    if (raw) raw.visible = true
    dbg.scene.children.forEach(() => {})
    raw?.traverse((o) => {
      if (o.isSkinnedMesh) {
        o.skeleton?.posed
        o.pose?.()
      }
    })
    dbg.controls.update()
  })
  await snap('T1-raw-direct')

  // 测试 2: 深拷贝（普通 clone，不走 SkeletonUtils）
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
      c2.traverse((o) => {
        if (o.isSkinnedMesh) o.pose?.()
      })
      dbg.scene.add(c2)
    }
  })
  await snap('T2-shallow-clone')

  await page.evaluate(() => {
    const dbg = window.__WB_AVATAR_DEBUG__
    const extras = dbg.scene.children.filter((c) => c.type === 'Group' && c.visible && c.scale.x > 100)
    extras.forEach((c) => dbg.scene.remove(c))
    dbg.controls.update()
  })
  await browser.close()
