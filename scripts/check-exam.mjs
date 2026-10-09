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

// 菜单项
const menuNames = await page.$$eval('.t-menu__item', (els) => els.map((e) => e.textContent.trim()))
console.log('侧边菜单:', JSON.stringify(menuNames))

await page.evaluate(() => {
  const i = [...document.querySelectorAll('.t-menu__item')].find((e) => e.textContent.includes('系统架构师备考'))
  i?.click()
})
await new Promise((r) => setTimeout(r, 1200))

const title = await page.evaluate(() => document.querySelector('h3')?.textContent)
console.log('页面标题:', title)

// 倒计时秒级跳动
const t1 = await page.evaluate(() => document.querySelector('.wb-exam-countdown-value')?.textContent.replace(/\s+/g, ' '))
await new Promise((r) => setTimeout(r, 1500))
const t2 = await page.evaluate(() => document.querySelector('.wb-exam-countdown-value')?.textContent.replace(/\s+/g, ' '))
console.log('倒计时 t1:', t1)
console.log('倒计时 t2:', t2, '| 在秒级跳动:', t1 !== t2)

// 日期合理性：从现在到 2026-10-24 的剩余天数
const sane = await page.evaluate(() => {
  const m = document.querySelector('.wb-exam-countdown-value')?.textContent.replace(/\s+/g, '')
  const days = parseInt(m?.match(/(\d+)天/)?.[1])
  const now = new Date()
  const exam = new Date('2026-10-24T08:30:00')
  const expectDays = Math.floor((exam - now) / 86400000)
  return { days, expectDays, near: Math.abs(days - expectDays) <= 1 }
})
console.log('天数合理性:', JSON.stringify(sane))

// 日程
const schedule = await page.$$eval('.wb-exam-row', (els) => els.map((e) => e.textContent.replace(/\s+/g, ' ').trim()))
console.log('考试日程:', JSON.stringify(schedule))
await browser.close()
