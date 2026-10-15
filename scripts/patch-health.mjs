import fs from 'node:fs'

let c = fs.readFileSync('server/index.js', 'utf8')
if (c.includes('/health')) {
  console.log('已有 /health，跳过')
} else {
  const target = 'const api = express.Router()'
  const insert = `const api = express.Router()

// 健康检查：前端据此判断后端是否可达
api.get('/health', (_req, res) => {
  res.json({ code: 0, data: 'ok' })
})`
  if (!c.includes(target)) throw new Error('找不到插入点')
  c = c.replace(target, insert)
  fs.writeFileSync('server/index.js', c, 'utf8')
  console.log('已补充 /api/health')
}
