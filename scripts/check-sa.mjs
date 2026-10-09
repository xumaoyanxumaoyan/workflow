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

// 1. 菜单项名称与顺序
const menuNames = await page.$$eval('.t-menu__item', (els) => els.map((e) => e.textContent.trim()))
console.log('侧边菜单:', JSON.stringify(menuNames))

// 2. 点击菜单“系统架构师备考” → /SA
await page.evaluate(() => {
  const i = [...document.querySelectorAll('.t-menu__item')].find((e) => e.textContent.includes('系统架构师备考'))
  i?.click()
})
await new Promise((r) => setTimeout(r, 1000))
console.log('路由:', await page.evaluate(() => location.pathname), '| 页面标题:', await page.evaluate(() => document.querySelector('h3')?.textContent))
const checkinCells = await page.$$eval('.wb-checkin-day', (els) => els.length)
console.log('打卡格数:', checkinCells)

// 3. 头部倒计时点击 → 应留/去 /SA
await page.evaluate(() => document.querySelector('.wb-exam-shortcut')?.click())
await new Promise((r) => setTimeout(r, 800))
console.log('头部倒计时点击后路由:', await page.evaluate(() => location.pathname))

// 4. SA 页“去写文章”按钮 → /article
await page.evaluate(() => {
  const btn = [...document.querySelectorAll('button')].find((b) => b.textContent.includes('去写文章'))
  btn?.click()
})
await new Promise((r) => setTimeout(r, 1000))
console.log('写文章按钮后路由:', await page.evaluate(() => location.pathname), '| 页面标题:', await page.evaluate(() => document.querySelector('h3')?.textContent))
const editorExists = await page.evaluate(() => !!document.querySelector('.wb-editor'))
console.log('编辑器在写文章页:', editorExists)

// 5. 写文章页功能回归：自动保存
await page.click('.wb-editor')
await page.keyboard.type('SA页面拆分验证', { delay: 10 })
await new Promise((r) => setTimeout(r, 400))
const total = await page.evaluate(() => document.querySelector('.wb-editor-status span')?.textContent)
console.log('字数统计:', total)

// 6. SA 页打卡开关回归
await page.evaluate(() => {
  const i = [...document.querySelectorAll('.t-menu__item')].find((e) => e.textContent.includes('系统架构师备考'))
  i?.click()
})
await new Promise((r) => setTimeout(r, 800))
await page.evaluate(() => {
  document.querySelector('.wb-checkin-day .slot')?.click()
})
await new Promise((r) => setTimeout(r, 800))
const ck = JSON.parse(fs.readFileSync('data/checkins.json', 'utf8'))
console.log('打卡仍正常写入:', JSON.stringify(ck))
// 还原为未打卡
await page.evaluate(() => {
  document.querySelector('.wb-checkin-day .slot')?.click()
})
await new Promise((r) => setTimeout(r, 600))
await browser.close()
