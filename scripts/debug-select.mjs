import puppeteer from 'puppeteer-core'

const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true,
  args: ['--no-sandbox']
})
const page = await browser.newPage()
await page.goto('http://localhost:5304/', { waitUntil: 'networkidle2' })
await page.waitForSelector('.t-menu', { timeout: 10000 })
await page.evaluate(() => {
  const item = [...document.querySelectorAll('.t-menu__item')].find((el) => el.textContent.includes('备忘录'))
  item?.click()
})
await new Promise((r) => setTimeout(r, 1200))

await page.evaluate(() => {
  const btn = [...document.querySelectorAll('button')].find((b) => b.textContent.includes('新建备忘'))
  btn?.click()
})
await page.waitForSelector('input[placeholder="站点名称"]', { timeout: 8000, visible: true })
await new Promise((r) => setTimeout(r, 400))

// 真实鼠标点击 select
const sel = await page.$('.t-dialog .t-select')
const box = await sel.boundingBox()
await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
await new Promise((r) => setTimeout(r, 800))

const dump = await page.evaluate(() => {
  const els = [...document.querySelectorAll('[class*="select"], [class*="popup"]')]
  return els
    .filter((e) => e.textContent.trim())
    .slice(0, 12)
    .map((e) => ({ cls: e.className.slice(0, 70), text: e.textContent.trim().slice(0, 50) }))
})
console.log(JSON.stringify(dump, null, 1))
await browser.close()
