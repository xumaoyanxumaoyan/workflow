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
  const item = [...document.querySelectorAll('.t-menu__item')].find((el) => el.textContent.includes('备忘录'))
  item?.click()
})
await new Promise((r) => setTimeout(r, 1200))

const btnInfo = await page.evaluate(() => {
  const panel = document.querySelector('.wb-memo-folders')
  const btns = panel ? [...panel.querySelectorAll('button')] : []
  return btns.map((b) => ({ text: b.textContent.trim(), cls: b.className.slice(0, 40) }))
})
console.log('面板按钮:', JSON.stringify(btnInfo))

await page.evaluate(() => {
  const btn = [...document.querySelectorAll('.wb-memo-folders button')].find((b) => b.textContent.includes('新建'))
  btn?.click()
})
await new Promise((r) => setTimeout(r, 1000))
const dlg = await page.evaluate(() => {
  const dialogs = [...document.querySelectorAll('.t-dialog')]
  return dialogs.map((d) => ({ visible: getComputedStyle(d).display !== 'none', text: d.textContent.slice(0, 40) }))
})
console.log('弹窗状态:', JSON.stringify(dlg, null, 1))
await browser.close()
