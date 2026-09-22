import puppeteer from 'puppeteer-core'

const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true,
  args: ['--no-sandbox']
})
const page = await browser.newPage()
page.on('console', (m) => console.log('CONSOLE[' + m.type() + ']', m.text().slice(0, 300)))
page.on('pageerror', (e) => console.log('PAGEERROR', e.message.slice(0, 400)))
page.on('request', (req) => {
  if (req.url().includes('/api/')) console.log('REQ', req.method(), req.url().slice(0, 80))
})
page.on('response', (res) => {
  if (res.url().includes('/api/articles')) console.log('RES', res.status(), res.url().slice(0, 80), res.headers()['content-type'])
})

await page.goto('http://localhost:5304/', { waitUntil: 'networkidle2' })
await page.waitForSelector('.t-menu', { timeout: 10000 })
await page.evaluate(() => {
  const item = [...document.querySelectorAll('.t-menu__item')].find((el) => el.textContent.includes('写文章'))
  item?.click()
})
await new Promise((r) => setTimeout(r, 1500))
const info = await page.evaluate(() => ({
  hash: location.hash,
  listExists: !!document.querySelector('.wb-article-list'),
  items: document.querySelectorAll('.wb-article-item').length,
  editorExists: !!document.querySelector('.wb-editor'),
  cardText: document.querySelector('.wb-editor-card')?.textContent.slice(0, 80)
}))
console.log(JSON.stringify(info, null, 1))
await browser.close()
