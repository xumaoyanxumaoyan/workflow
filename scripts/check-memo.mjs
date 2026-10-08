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

// 1. 待办页：完成时间列
await page.waitForSelector('.t-table th', { timeout: 10000 })
await new Promise((r) => setTimeout(r, 400))
const headers = await page.$$eval('.t-table th', (els) => els.map((e) => e.textContent.trim()))
console.log('待办表头:', JSON.stringify(headers))
const colIdx = headers.indexOf('完成时间')
const doneRowInfo = await page.evaluate((ci) => {
  const rows = [...document.querySelectorAll('.t-table tbody tr')]
  const done = rows.find((r) => r.querySelector('.wb-title-cell.done'))
  if (!done) return { found: false }
  const cells = [...done.querySelectorAll('td')].map((c) => c.textContent.trim())
  return { found: true, completedAt: cells[ci] }
}, colIdx)
console.log('已完成任务的完成时间:', JSON.stringify(doneRowInfo))

// 2. 进入备忘录
await page.evaluate(() => {
  const item = [...document.querySelectorAll('.t-menu__item')].find((el) => el.textContent.includes('备忘录'))
  item?.click()
})
await new Promise((r) => setTimeout(r, 1200))
console.log('页面标题:', await page.evaluate(() => document.querySelector('h3')?.textContent))
console.log('左栏文件夹:', JSON.stringify(await page.$$eval('.wb-memo-folder span', (els) => els.map((e) => e.textContent.trim()).filter(Boolean))))

// 3. 新建文件夹「软考资源」
await page.evaluate(() => {
  const btn = [...document.querySelectorAll('.wb-memo-folders button')].find((b) => b.textContent.includes('新建'))
  btn?.click()
})
await page.waitForSelector('input[placeholder="文件夹名称"]', { timeout: 8000, visible: true })
await new Promise((r) => setTimeout(r, 400))
await page.click('input[placeholder="文件夹名称"]')
await page.keyboard.type('软考资源', { delay: 15 })
await page.evaluate(() => {
  const btn = [...document.querySelectorAll('.t-dialog button')].find((b) => b.textContent.includes('确定'))
  btn?.click()
})
await new Promise((r) => setTimeout(r, 1000))

// 4. 新建备忘（标题 + 链接 + 归入软考资源文件夹）
await page.evaluate(() => {
  const btn = [...document.querySelectorAll('button')].find((b) => b.textContent.includes('新建备忘'))
  btn?.click()
})
await page.waitForSelector('input[placeholder="站点名称"]', { timeout: 8000, visible: true })
await new Promise((r) => setTimeout(r, 400))
await page.click('input[placeholder="站点名称"]')
await page.keyboard.type('希赛网软考', { delay: 10 })
await page.click('input[placeholder*="保存后标题可点击跳转"]')
await page.keyboard.type('https://www.educity.cn/', { delay: 10 })
// 选择文件夹（真实鼠标点击打开下拉，再点选项）
const selEl = await page.$('.t-dialog .t-select')
const selBox = await selEl.boundingBox()
await page.mouse.click(selBox.x + selBox.width / 2, selBox.y + selBox.height / 2)
await new Promise((r) => setTimeout(r, 800))
const optEl = await page.evaluateHandle(() =>
  [...document.querySelectorAll('.t-select-option')].find((o) => o.textContent.trim() === '软考资源')
)
const optBox = await optEl.asElement().boundingBox()
await page.mouse.click(optBox.x + optBox.width / 2, optBox.y + optBox.height / 2)
await new Promise((r) => setTimeout(r, 300))
await page.evaluate(() => {
  const btn = [...document.querySelectorAll('.t-dialog button')].find((b) => b.textContent.includes('保存'))
  btn?.click()
})
await new Promise((r) => setTimeout(r, 1200))

// 5. 校验数据文件
const memos = JSON.parse(fs.readFileSync('data/memos.json', 'utf8'))
const folder = memos.folders.find((f) => f.name === '软考资源')
const item = memos.items.find((i) => i.title === '希赛网软考')
console.log('文件夹已创建:', !!folder)
console.log('备忘已创建:', !!item, item ? `| folderId 归属软考资源: ${item.folderId === folder?.id} | 链接: ${item.url}` : '')

// 6. 校验标题是可点击链接（href 存在）
const linkHref = await page.evaluate(() => {
  const link = [...document.querySelectorAll('.t-table a')].find((a) => a.textContent.includes('希赛网软考'))
  return link?.href
})
console.log('标题渲染为可点击链接:', linkHref)

// 7. 清理测试数据
if (item && folder) {
  await page.evaluate(async (id) => fetch(`/api/memos/items/${id}`, { method: 'DELETE' }), item.id)
  await page.evaluate(async (id) => fetch(`/api/memos/folders/${id}`, { method: 'DELETE' }), folder.id)
  const after = JSON.parse(fs.readFileSync('data/memos.json', 'utf8'))
  console.log('测试数据已清理:', !after.items.some((i) => i.title === '希赛网软考'))
}
await browser.close()
