/**
 * خادم تطوير ثابت (بدون أي مكتبات خارجية).
 *   node tools/server.mjs [منفذ]
 * يخدم مجلد المشروع على 0.0.0.0 ليسهل معاينته من الخارج.
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.argv[2] || process.env.PORT || 4173);
const HOST = process.env.HOST || '0.0.0.0';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
};

const server = http.createServer((req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    let pathname = decodeURIComponent(url.pathname);
    if (pathname.endsWith('/')) pathname += 'index.html';

    let filePath = path.join(ROOT, pathname);
    if (!filePath.startsWith(ROOT)) {
      res.writeHead(403).end('Forbidden');
      return;
    }
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      // احتياطي: صفحة التطبيق (SPA)
      filePath = path.join(ROOT, 'index.html');
    }
    const ext = path.extname(filePath).toLowerCase();
    const body = fs.readFileSync(filePath);
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Content-Length': body.length,
      'Cache-Control': 'no-cache',
      'Service-Worker-Allowed': '/',
    });
    res.end(body);
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(`خطأ في الخادم: ${err.message}`);
  }
});

server.listen(PORT, HOST, () => {
  console.log(`وِردي يعمل على http://${HOST}:${PORT}`);
});
