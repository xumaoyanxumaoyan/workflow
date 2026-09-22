import puppeteer from 'puppeteer-core'

const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true,
  args: ['--no-sandbox']
})
const page = await browser.newPage()
page.on('pageerror', (e) => console.log('PAGEERROR', e.message.slice(0, 300)))
page.on('console', (m) => {
  if (m.type() === 'error') console.log('CONSOLE-ERR', m.text().slice(0, 300))
})
await page.goto('http://localhost:5173/journal', { waitUntil: 'networkidle2' })
await new Promise((r) => setTimeout(r, 1000))

await page.evaluate(() => {
  const rows = [...document.querySelectorAll('.t-table tbody tr')]
  console.log('行数:', rows.length)
  const row = rows.find((r) => r.textContent.includes('标签测试'))
  console.log('找到测试行:', !!row)
  if (row) {
    const link = [...row.querySelectorAll('a, .t-link')].find((a) => a.textContent.includes('编辑'))
    console.log('找到编辑链接:', !!link)
    link?.click()
  }
})
await new Promise((r) => setTimeout(r, 1500))

const info = await page.evaluate(() => {
  const d = document.querySelector('.t-dialog')
  return {
    dialogExists: !!d,
    dialogText: d ? d.textContent.slice(0, 80) : null,
    tagInput: !!document.querySelector('input[placeholder="输入后回车添加"]')
  }
})
console.log(JSON.stringify(info, null, 1))
await browser.close()
