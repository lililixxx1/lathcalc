#!/usr/bin/env node
/**
 * W4-C2 · dist 静态服务（量测用，零第三方依赖）
 *
 * 用法：node docs/evidence/W4-C2/tools/serve-dist.mjs [distDir] [port] [host]
 * 仅服务构建产物；hash 路由不需要 history fallback。
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, normalize, join } from 'node:path';

const ROOT = normalize(process.argv[2] ?? 'dist');
const PORT = Number(process.argv[3] ?? 4173);
const HOST = process.argv[4] ?? '127.0.0.1';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? '/', `http://${HOST}`);
    let pathname = decodeURIComponent(url.pathname);
    if (pathname === '/') pathname = '/index.html';
    const filePath = normalize(join(ROOT, pathname));
    if (!filePath.startsWith(ROOT)) {
      response.writeHead(403);
      response.end('forbidden');
      return;
    }
    const data = await readFile(filePath);
    response.writeHead(200, {
      'Content-Type': MIME[extname(filePath)] ?? 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    response.end(data);
  } catch {
    response.writeHead(404);
    response.end('not found');
  }
});

server.listen(PORT, HOST, () => {
  process.stdout.write(`serving ${ROOT} at http://${HOST}:${PORT}/\n`);
});
