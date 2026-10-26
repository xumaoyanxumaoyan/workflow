import puppeteer from 'puppeteer-core'

const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true,
  args: ['--no-sandbox']
})
const page = await browser.newPage()
page.setViewport({ width: 1280, height: 900 })
await page.goto('http://localhost:5304/', { waitUntil: 'networkidle2' })
await page.waitForSelector('.t-menu', { timeout: 10000 })
await page.evaluate(() => {
  const i = [...document.querySelectorAll('.t-menu__item')].find((e) => e.textContent.includes('减肥管理'))
  i?.click()
})
await new Promise((r) => setTimeout(r, 1300))
await page.waitForSelector('.wb-fitness-grid .t-form__label', { timeout: 8000 })

const labels = await page.evaluate(() =>
  [...document.querySelectorAll('.wb-fitness-grid .t-form__label')].map((l) => {
    const r = l.getBoundingClientRect()
    const inner = l.querySelector('label, .t-form__label-content, span') || l
    const ir = inner.getBoundingClientRect()
    return {
      text: l.textContent.trim(),
      labelW: Number(r.width.toFixed(1)),
      overflowX: l.scrollWidth > l.clientWidth + 1,
      innerW: Number(ir.width.toFixed(1))
    }
  })
)
console.log(JSON.stringify(labels, null, 1))
const clipped = labels.filter((l) => l.overflowX || (l.innerW > 0 && l.innerW >= l.labelW - 2 && l.innerW > 120))
console.log('疑似遮挡:', clipped.length)

const card = await page.$('.wb-fitness-form')
await card.screenshot({ path: 'scripts/fitness-form-labels.png' })
console.log('form screenshot saved')
await browser.close()
