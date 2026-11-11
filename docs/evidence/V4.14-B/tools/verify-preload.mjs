// verify-preload.mjs · V4.14-B 构建产物验证（纯 Node 脚本）
// 本卡禁用 Chrome/浏览器——性能量测独占窗口归 Lead 集成期（PROJECT-APPENDIX §A 量测条款）。
// 运行（npm run build 之后）：node docs/evidence/V4.14-B/tools/verify-preload.mjs
//
// ① modulepreload 注入断言：dist/index.html 含 rel="modulepreload"、href 匹配
//    /assets/p01-*.js、目标文件在盘；任一不满足 → 退出码 1；
// ② precache revision 对拍：从 dist/sw.js 提取 "url":"index.html" 条目的 revision
//    字段，对注入后 dist/index.html 内容算 md5 与 sha256 hex 各试比对——任一匹配
//    → 记 MATCH(算法名)；都不匹配 → 如实记录实际 revision + 两种哈希并标 MISMATCH
//    （禁硬凑判定通过，交 Lead 裁决；MISMATCH 不改变退出码，如实留证）；
// ③ 打印预算三数值（.js 未压缩总字节 / index 主包字节 / 路由分块数）。
// 全部结果落 runs/verify-preload.json（本脚本所在 V4.14-B/runs/ 下）。
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = fileURLToPath(new URL('.', import.meta.url)); // docs/evidence/V4.14-B/tools
const cardDir = dirname(scriptDir); // docs/evidence/V4.14-B
const treeRoot = join(cardDir, '..', '..', '..'); // tools→V4.14-B→evidence→docs→树根
const assetsDir = join(treeRoot, 'dist', 'assets');
const indexHtmlPath = join(treeRoot, 'dist', 'index.html');
const swPath = join(treeRoot, 'dist', 'sw.js');

const result = {
  tool: 'verify-preload.mjs',
  generatedAt: new Date().toISOString(),
  injection: {
    pass: false,
    hasPreloadLink: false,
    href: null,
    p01File: null,
    fileOnDisk: false,
  },
  revision: {
    swEntryFound: false,
    swEntry: null,
    swRevision: null,
    indexHtmlMd5: null,
    indexHtmlSha256: null,
    result: 'NOT_COMPARED', // MATCH(md5) | MATCH(sha256) | MISMATCH | MISMATCH(sw条目未提取到)
  },
  budget: {
    totalJsBytes: null,
    jsFileCount: null,
    indexChunkBytes: null,
    indexChunkFiles: [],
    routeChunkCount: null,
    routeChunkMin: 16,
    caliber: 'uncompressed-bytes',
  },
};

// ── ① 注入断言 ─────────────────────────────────────────────────────────
const html = readFileSync(indexHtmlPath, 'utf8');
const hasPreloadLink = html.includes('rel="modulepreload"');
const m = html.match(/href="(\/assets\/p01-[\w-]+\.js)"/);
const href = m !== null && m[1] !== undefined ? m[1] : null;
const p01File = href !== null ? href.replace('/assets/', '') : null;
const fileOnDisk = p01File !== null && existsSync(join(assetsDir, p01File));
result.injection = {
  pass: hasPreloadLink && href !== null && fileOnDisk,
  hasPreloadLink,
  href,
  p01File,
  fileOnDisk,
};

// ── ② precache revision 对拍 ───────────────────────────────────────────
const sw = readFileSync(swPath, 'utf8');
// 兼容键序两种排布 + 键引号有无（workbox generateSW 输出 / 压缩器输出）
const swMatch =
  sw.match(/[{,]\s*"url"\s*:\s*"index\.html"\s*,\s*"revision"\s*:\s*"([^"]+)"/) ??
  sw.match(/[{,]\s*"revision"\s*:\s*"([^"]+)"\s*,\s*"url"\s*:\s*"index\.html"/) ??
  sw.match(/[{,]\s*url\s*:\s*"index\.html"\s*,\s*revision\s*:\s*"([^"]+)"/) ??
  sw.match(/[{,]\s*revision\s*:\s*"([^"]+)"\s*,\s*url\s*:\s*"index\.html"/);
const swRevision = swMatch !== null && swMatch[1] !== undefined ? swMatch[1] : null;
const indexHtmlMd5 = createHash('md5').update(html).digest('hex');
const indexHtmlSha256 = createHash('sha256').update(html).digest('hex');
result.revision = {
  swEntryFound: swMatch !== null,
  swEntry: swMatch !== null ? swMatch[0] : null,
  swRevision,
  indexHtmlMd5,
  indexHtmlSha256,
  result:
    swRevision === null
      ? 'MISMATCH(sw条目未提取到)'
      : swRevision === indexHtmlMd5
        ? 'MATCH(md5)'
        : swRevision === indexHtmlSha256
          ? 'MATCH(sha256)'
          : 'MISMATCH',
};

// ── ③ 预算三数值 ───────────────────────────────────────────────────────
const jsFiles = readdirSync(assetsDir)
  .filter((f) => f.endsWith('.js'))
  .sort();
const totalJsBytes = jsFiles.reduce((s, f) => s + statSync(join(assetsDir, f)).size, 0);
const indexChunkFiles = jsFiles.filter((f) => /^index-[\w-]+\.js$/.test(f));
const indexChunkBytes = indexChunkFiles.reduce((s, f) => s + statSync(join(assetsDir, f)).size, 0);
const routeChunkCount = jsFiles.filter((f) => /^p\d{2}-/.test(f)).length;
result.budget = {
  totalJsBytes,
  jsFileCount: jsFiles.length,
  indexChunkBytes,
  indexChunkFiles,
  routeChunkCount,
  routeChunkMin: 16,
  caliber: 'uncompressed-bytes',
};

// ── 落档 + 打印 ────────────────────────────────────────────────────────
mkdirSync(join(cardDir, 'runs'), { recursive: true });
const jsonPath = join(cardDir, 'runs', 'verify-preload.json');
writeFileSync(jsonPath, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
// 可公开态（附录 G）：stdout 只打仓库相对路径，不打机器绝对路径
console.log('[verify-preload] 写出 docs/evidence/V4.14-B/runs/verify-preload.json');
if (result.injection.pass === false) {
  console.error('[verify-preload] 注入断言未通过，退出码 1');
  process.exitCode = 1;
}
