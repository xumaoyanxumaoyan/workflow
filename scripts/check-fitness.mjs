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

// 1. 进入减肥管理
await page.evaluate(() => {
  const item = [...document.querySelectorAll('.t-menu__item')].find((el) => el.textContent.includes('减肥管理'))
  item?.click()
})
await new Promise((r) => setTimeout(r, 1200))
console.log('页面标题:', await page.evaluate(() => document.querySelector('h3')?.textContent))

// 2. 填表单：体重、运动 40 分钟、消耗 280 千卡
await page.waitForSelector('.wb-fitness-form', { timeout: 8000, visible: true })
await page.evaluate(() => {
  const inputs = [...document.querySelectorAll('.wb-fitness-form input')]
  const w = inputs.find((i) => i.placeholder === 'kg')
  const setVal = (el, v) => {
    const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
    s.call(el, v)
    el.dispatchEvent(new Event('input', { bubbles: true }))
  }
  if (w) setVal(w, '65.5')
})
await new Promise((r) => setTimeout(r, 200))

// 添加食物：鸡胸肉 300 千卡
await page.evaluate(() => {
  const btn = [...document.querySelectorAll('.wb-fitness-form button')].find((b) => b.textContent.includes('添加食物'))
  btn?.click()
})
await new Promise((r) => setTimeout(r, 200))
await page.click('input[placeholder="食物 1 名称"]')
await page.keyboard.type('鸡胸肉', { delay: 10 })
await page.evaluate(() => {
  const kcal = document.querySelector('.wb-fitness-food-row input[placeholder="千卡"]')
  const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
  s.call(kcal, '300')
  kcal.dispatchEvent(new Event('input', { bubbles: true }))
})
await new Promise((r) => setTimeout(r, 200))

// 运动 40 / 消耗 280
await page.evaluate(() => {
  const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
  const setVal = (el, v) => { s.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })) }
  // 运动分钟 / 消耗千卡：都在表单网格区（.wb-fitness-grid），食物行的千卡在 .wb-fitness-food-row 里
  const ex = document.querySelector('.wb-fitness-grid input[placeholder="分钟"]')
  const burn = document.querySelector('.wb-fitness-grid input[placeholder="千卡"]')
  if (ex) setVal(ex, '40')
  if (burn) setVal(burn, '280')
})
await new Promise((r) => setTimeout(r, 400))

// 3. 校验自动计算的单位时间消耗（280/40*60 = 420 千卡/小时）
const summary = await page.evaluate(() => document.querySelector('.wb-fitness-summary')?.textContent.replace(/\s+/g, ' '))
console.log('表单汇总栏:', summary)
console.log('单位时间消耗正确(420 千卡/小时):', summary?.includes('420'))

// 4. 保存
await page.evaluate(() => {
  const btn = [...document.querySelectorAll('.wb-fitness-form button')].find((b) => b.textContent.includes('保存记录'))
  btn?.click()
})
await new Promise((r) => setTimeout(r, 1200))

// 5. 校验文件与表格
const fit = JSON.parse(fs.readFileSync('data/fitness.json', 'utf8'))
const rec = fit.find((r) => r.foods?.some((f) => f.name === '鸡胸肉'))
console.log('fitness.json 已写入:', !!rec, rec ? `| 体重: ${rec.weight} | 运动: ${rec.exerciseMin}min | 消耗: ${rec.caloriesBurned}kcal` : '')

const row = await page.evaluate(() => {
  const rows = [...document.querySelectorAll('.t-table tbody tr')]
  const tr = rows.find((r) => r.textContent.includes('鸡胸肉'))
  return tr ? tr.textContent.replace(/\s+/g, ' ').slice(0, 120) : null
})
console.log('表格行:', row)
console.log('表格行含 420 千卡/小时:', row?.includes('420 千卡/小时'))

// 6. 清理
if (rec) {
  await page.evaluate(async (id) => fetch(`/api/fitness/${id}`, { method: 'DELETE' }), rec.id)
  const after = JSON.parse(fs.readFileSync('data/fitness.json', 'utf8'))
  console.log('测试记录已清理:', !after.some((r) => r.foods?.some((f) => f.name === '鸡胸肉')))
}
await browser.close()
