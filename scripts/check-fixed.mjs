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

async function checkFixed(menuName) {
  await page.evaluate((m) => {
    const i = [...document.querySelectorAll('.t-menu__item')].find((e) => e.textContent.includes(m))
    i?.click()
  }, menuName)
  await new Promise((r) => setTimeout(r, 1000))
  await page.waitForSelector('.t-table th', { timeout: 8000 })
  const res = await page.evaluate(() => {
    const ths = [...document.querySelectorAll('.t-table th')]
    const last = ths[ths.length - 1]
    const isOp = last?.textContent.includes('操作')
    const fixedCls = last?.className.includes('fixed-right') || last?.style?.position === 'sticky' || last?.getAttribute('data-colkey') === 'op'
    return {
      opIsLast: isOp,
      classNames: last?.className.includes('--fixed-right'),
      stickyPos: getComputedStyle(last).position
    }
  })
  console.log(`${menuName}:`, JSON.stringify(res))
}

await checkFixed('待办工作台')
await checkFixed('写日志')
await checkFixed('备忘录')
await checkFixed('减肥管理')
await browser.close()
