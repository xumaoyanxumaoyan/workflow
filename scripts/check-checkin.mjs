import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

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
await new Promise((r) => setTimeout(r, 500))

// 1. 头部倒计时存在且秒级跳动
const h1 = await page.evaluate(() => document.querySelector('.wb-exam-shortcut')?.textContent.replace(/\s+/g, ' ').trim())
await new Promise((r) => setTimeout(r, 1600))
const h2 = await page.evaluate(() => document.querySelector('.wb-exam-shortcut')?.textContent.replace(/\s+/g, ' ').trim())
console.log('头部倒计时:', h1)
console.log('秒级跳动:', h1 !== h2)

// 2. 点头部倒计时 → 跳转 article
await page.evaluate(() => document.querySelector('.wb-exam-shortcut')?.click())
await new Promise((r) => setTimeout(r, 1000))
console.log('点击后路由:', await page.evaluate(() => location.pathname))
console.log('页面标题:', await page.evaluate(() => document.querySelector('h3')?.textContent))

// 3. 打卡模块：17 个格子（16 天 + 考试日）
const dayCells = await page.$$eval('.wb-checkin-day', (els) => els.length)
console.log('打卡格子数:', dayCells, '(预期 17 = 16 打卡日 + 考试日)')
const dates = await page.$$eval('.wb-checkin-day .date', (els) => els.map((e) => e.textContent.trim()))
console.log('日期范围:', JSON.stringify(dates))

// 4. 点第一个可用日期的上午打卡 → 气泡？(无气泡，直接打勾) 校验接口与文件
const slots = await page.$$('.wb-checkin-day .slot')
console.log('时段按钮总数:', slots.length, '(预期 32)')

const firstDate = dates[0]
await page.evaluate(() => {
  const btn = document.querySelector('.wb-checkin-day .slot')
  btn?.click()
})
await new Promise((r) => setTimeout(r, 800))

const ck = JSON.parse(fs.readFileSync('data/checkins.json', 'utf8'))
console.log('checkins.json 状态:', JSON.stringify(ck))

// 5. 再点一次 → 取消
await page.evaluate(() => {
  const btn = document.querySelector('.wb-checkin-day .slot')
  btn?.click()
})
await new Promise((r) => setTimeout(r, 800))
const ck2 = JSON.parse(fs.readFileSync('data/checkins.json', 'utf8'))
console.log('取消后:', JSON.stringify(ck2))
console.log('切换生效:', !!(ck[Object.keys(ck)[0]]?.am?.done === true) && !(ck2[Object.keys(ck2)[0]]?.am?.done))

// 6. 进度文本
const progress = await page.evaluate(() => document.querySelector('.wb-checkin-head .progress')?.textContent.replace(/\s+/g, ' '))
console.log('进度显示:', progress)

await browser.close()
