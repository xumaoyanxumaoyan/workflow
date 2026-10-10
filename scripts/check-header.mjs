import puppeteer from 'puppeteer-core'

const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true,
  args: ['--no-sandbox']
})
const page = await browser.newPage()
page.setViewport({ width: 1280, height: 400, deviceScaleFactor: 2 })
page.on('pageerror', (e) => console.log('PAGEERROR', e.message))
await page.goto('http://localhost:5304/', { waitUntil: 'networkidle2' })
await page.waitForSelector('.wb-header', { timeout: 10000 })
await new Promise((r) => setTimeout(r, 500))
const header = await page.$('.wb-header')
await header.screenshot({ path: 'scripts/header-preview.png' })
console.log('header screenshot saved')
await browser.close()
