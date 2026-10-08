import crypto from 'node:crypto'
import fs from 'node:fs'
import http from 'node:http'

function fetchBuf(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      const chunks = []
      res.on('data', (c) => chunks.push(c))
      res.on('end', () => resolve({ status: res.statusCode, buf: Buffer.concat(chunks) }))
    }).on('error', reject)
  })
}

const res = await fetchBuf('http://localhost:5304/favicon.ico')
const disk = fs.readFileSync('public/favicon.ico')
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex').slice(0, 12)
console.log('服务端 status:', res.status, '| 大小:', res.buf.length, '| sha:', sha(res.buf))
console.log('磁盘   大小:', disk.length, '| sha:', sha(disk))
console.log('服务端文件 == 磁盘新图标:', res.buf.equals(disk))

const html = await fetchBuf('http://localhost:5304/')
console.log('页面含 icon link:', html.buf.toString('utf8').includes('rel="icon"'))
