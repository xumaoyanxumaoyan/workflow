import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true,
  args: ['--no-sandbox']
})
const page = await browser.newPage()
page.on('pageerror', (e) => console.log('PAGEERROR', e.message))

await page.goto('http://localhost:5304/', { waitUntil: 'networkidle2' })
await page.waitForSelector('.t-menu', { timeout: 10000 })
await page.evaluate(() => {
  const item = [...document.querySelectorAll('.t-menu__item')].find((el) => el.textContent.includes('减肥管理'))
  item?.click()
})
await new Promise((r) => setTimeout(r, 1200))
await page.waitForSelector('.t-table tbody tr', { timeout: 8000 })

const before = JSON.parse(fs.readFileSync('data/fitness.json', 'utf8'))
const target = before[0]
console.log('用户记录:', JSON.stringify({ date: target.date, weight: target.weight, exerciseMin: target.exerciseMin, caloriesBurned: target.caloriesBurned, note: target.note }))

// 进入编辑态
await page.evaluate(() => {
  const row = document.querySelector('.t-table tbody tr')
  const link = [...row.querySelectorAll('a, .t-link')].find((a) => a.textContent.includes('编辑'))
  link?.click()
})
await new Promise((r) => setTimeout(r, 600))

const inEditMode = await page.evaluate(() => ({
  banner: document.querySelector('.wb-fitness-banner')?.textContent.includes('正在编辑'),
  btn: [...document.querySelectorAll('.wb-fitness-form button')].find((b) => b.textContent.includes('更新当天记录')) ? true : false,
  dateDisabled: document.querySelector('.wb-fitness-grid .t-date-picker input')?.disabled
}))
console.log('编辑态横幅:', inEditMode.banner, '| 按钮为更新:', inEditMode.btn)

// 不改任何内容，直接点「更新当天记录」
await page.evaluate(() => {
  const btn = [...document.querySelectorAll('.wb-fitness-form button')].find((b) => b.textContent.includes('更新当天记录'))
  btn?.click()
})
await new Promise((r) => setTimeout(r, 1200))

// 保存后应还原为全新录入态
const after = await page.evaluate(() => ({
  bannerGone: !document.querySelector('.wb-fitness-banner'),
  btnBackToSave: [...document.querySelectorAll('.wb-fitness-form button')].some((b) => b.textContent.includes('保存记录')),
  weightEmpty: !document.querySelector('.wb-fitness-grid input[placeholder="斤"]')?.value,
  dateEnabled: !document.querySelector('.wb-fitness-grid .t-date-picker input')?.disabled
}))
console.log('保存后还原:', JSON.stringify(after))

// 数据无损校验
const afterData = JSON.parse(fs.readFileSync('data/fitness.json', 'utf8'))
const same = JSON.stringify(afterData[0]) === JSON.stringify(target)
console.log('记录数据无损:', same)
await browser.close()
