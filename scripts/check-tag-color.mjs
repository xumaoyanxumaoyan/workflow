import puppeteer from 'puppeteer-core'

const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true,
  args: ['--no-sandbox']
})
const page = await browser.newPage()
page.setViewport({ width: 1280, height: 900 })
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

const chips = await page.evaluate(() =>
  [...document.querySelectorAll('.wb-freq-chip')].map((c) => ({
    text: c.textContent.replace(/\s+/g, ' ').trim(),
    isDanger: c.className.includes('t-tag--theme-danger'),
    bg: getComputedStyle(c).backgroundColor
  }))
)
console.log(JSON.stringify(chips, null, 1))
const pork = chips.find((c) => c.isDanger)
console.log('超300千卡标签为红底:', !!pork, pork ? pork.bg : '')
const othersRed = chips.filter((c) => !c.isDanger).some((c) => c.bg.includes('237') || c.bg.includes('217'))
console.log('未超300的仍是普通浅色底(非红):', !othersRed)
await browser.close()
