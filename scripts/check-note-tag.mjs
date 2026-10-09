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
await new Promise((r) => setTimeout(r, 1300))
await page.waitForSelector('.t-table tbody tr', { timeout: 8000 })
await new Promise((r) => setTimeout(r, 300))

const cells = await page.evaluate(() =>
  [...document.querySelectorAll('.t-table tbody tr')].map((tr) => {
    const cell = tr.querySelector('td:nth-child(2)')
    const main = cell?.querySelector('span')?.textContent.replace(/\s+/g, ' ').trim()
    const tag = cell?.querySelector('.wb-note-tag')
    return {
      main,
      noteTag: tag ? { text: tag.textContent.trim(), fontSize: getComputedStyle(tag).fontSize } : null
    }
  })
)
console.log(JSON.stringify(cells, null, 1))
const allShown = cells.every((c) => c.noteTag && c.noteTag.text)
console.log('两行备注 tag 均显示:', allShown)
await browser.close()
