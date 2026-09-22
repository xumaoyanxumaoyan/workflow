import puppeteer from 'puppeteer-core'

const exe = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const browser = await puppeteer.launch({ executablePath: exe, headless: true, args: ['--no-sandbox'] })
const page = await browser.newPage()

page.on('console', (m) => console.log('CONSOLE[' + m.type() + ']', m.text()))
page.on('pageerror', (e) => console.log('PAGEERROR', e.message))

await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' })

// 点击“新建任务”
const clicked = await page.evaluate(() => {
  const btn = [...document.querySelectorAll('button')].find((b) => b.textContent.includes('新建任务'))
  if (btn) { btn.click(); return true }
  return false
})
console.log('clicked create btn:', clicked)
await new Promise((r) => setTimeout(r, 600))

// 找弹窗里的标题输入框
const inputSel = '.t-dialog .t-input__inner'
await page.waitForSelector(inputSel, { timeout: 5000 })

// 点击聚焦并输入
await page.click(inputSel)
await page.keyboard.type('hello test title', { delay: 20 })
await new Promise((r) => setTimeout(r, 300))
let val = await page.$eval(inputSel, (el) => el.value)
console.log('latin typed value:', JSON.stringify(val))

// 中文输入（headless 无 IME，但可验证 value 双向绑定是否被吞）
await page.keyboard.type('中文标题测试', { delay: 20 })
await new Promise((r) => setTimeout(r, 300))
val = await page.$eval(inputSel, (el) => el.value)
console.log('final value:', JSON.stringify(val))

// 检查输入框是否有 readonly/disabled
const state = await page.$eval(inputSel, (el) => ({ readonly: el.readOnly, disabled: el.disabled }))
console.log('input state:', JSON.stringify(state))

// 描述 textarea、标签输入也测一下
const textareaSel = '.t-dialog textarea'
if (await page.$(textareaSel)) {
  await page.click(textareaSel)
  await page.keyboard.type('desc text')
  await new Promise((r) => setTimeout(r, 200))
  const tv = await page.$eval(textareaSel, (el) => el.value)
  console.log('textarea value:', JSON.stringify(tv))
}

await browser.close()
