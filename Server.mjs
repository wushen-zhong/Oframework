import * as fs from 'node:fs'
import * as http from 'node:http'
import * as path from 'node:path'

const mimeTypes = {
  default: 'application/octet-stream',
  html: 'text/html; charset=UTF-8',
  js: 'application/javascript',
  mjs: 'application/javascript',
  css: 'text/css',
  png: 'image/png',
  jpg: 'image/jpg',
  gif: 'image/gif',
  ico: 'image/x-icon',
  svg: 'image/svg+xml',
  json: 'application/json'
}
const staticPath = path.join(process.cwd(), './')
const port = 8000
http
  .createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`)
    const filePath = path.join(staticPath, url.pathname)
    fs.access(filePath, fs.constants.R_OK, err => {
      if (err) {
        res.writeHead(404, { 'access-control-allow-origin': '*' })
        res.end()
        console.log(`${req.method} 404 .${url.pathname}`)
      } else {
        res.writeHead(200, {
          'Content-Type': mimeTypes[path.extname(filePath).slice(1)] ?? mimeTypes.default,
          'access-control-allow-origin': '*'
        })
        fs.createReadStream(filePath).pipe(res)
        console.log(`${req.method} 200 .${url.pathname}`)
      }
    })
  })
  .listen(port)

console.log(`[Server running at http://127.0.0.1:${port}/]`)
