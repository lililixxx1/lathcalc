/**
 * verify-stage.mjs · V4.14-A 宽窗舞台列几何断言
 * 改自树内 docs/evidence/V4.14/baseline/tools/baseline-audit.mjs（同款 CDP WebSocket 骨架）。
 * 与基线工装差异：① 性能量测部分（PERF_INIT/PERF_READ/冷暖启循环/中位摘要）整体移除
 * ——量测独占窗口归 Lead 集成期（PROJECT-APPENDIX §A 量测条款），本工具只做几何断言；
 * ② 尺寸五档（+844×390 横屏，G0 I-03）；③ 断言改验收口径：≥560 pageW==540 / tileCols==3 /
 * appLeft==(winW−542)/2±2（542=540 内容+border 2，content-box），390 档与 baseline.json
 * 同路由值对拍 ±1px（<560 零回归）；④ 保留 SW 预清理（V4.10 教训）+ bundle 对拍
 * （页面实跑 script[src] 哈希 == dist/assets/index-*.js 实际文件名）。
 *
 * 用法（树根目录）：
 *   CHROME="C:\Program Files\Google\Chrome\Application\chrome.exe" CDP_PORT=9383 \
 *   node docs/evidence/V4.14-A/tools/verify-stage.mjs http://localhost:4183/ docs/evidence/V4.14-A/runs
 */
import { spawn } from 'node:child_process';
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const URL_BASE = process.argv[2] ?? 'http://localhost:4183/';
const OUT_DIR = process.argv[3] ?? 'docs/evidence/V4.14-A/runs';
const CHROME = process.env.CHROME ?? 'chrome';
const DEBUG_PORT = Number(process.env.CDP_PORT ?? 9383);
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..', '..');
const BASELINE_JSON = join(ROOT, 'docs', 'evidence', 'V4.14', 'baseline', 'baseline.json');
const DIST_ASSETS = join(ROOT, 'dist', 'assets');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync(OUT_DIR, { recursive: true });

/* 542 = 540 内容宽 + border-inline 1px×2（全仓 content-box，src/ 零 box-sizing 声明） */
const STAGE_MIN = 560;
const STAGE_W = 540;
const STAGE_BORDER_TOTAL = 2;
const TOL_LEFT = 2;   // appLeft 容差 px（派工单验收标准）
const TOL_BASE = 1;   // 390 档与基线对拍容差 px（派工单验收标准）

const SIZES = [
  { id: '390', w: 390, h: 844 },      // 手机（390 设计基线，<560 零回归档）
  { id: '768', w: 768, h: 1024 },     // 平板竖 / 半屏窗（≥560 舞台档）
  { id: '1280', w: 1280, h: 800 },    // 笔记本窗口（≥560 舞台档）
  { id: '1920', w: 1920, h: 1080 },   // 全高清桌面（≥560 舞台档）
  { id: '844x390', w: 844, h: 390 },  // 横屏（G0 I-03，≥560 舞台档）
];
const ROUTES = ['#/p01', '#/p02', '#/p06', '#/p09', '#/p12'];

/* 基线对拍值（docs/evidence/V4.14/baseline/baseline.json，2026-11-11 工装实测；
   无基线文件即抛错 fail-fast——缺基线不得判零回归） */
const baseline = JSON.parse(readFileSync(BASELINE_JSON, 'utf8'));
const baselineOf = (pageId) => baseline.responsive.find((r) => r.size === '390x844' && r.page === pageId) ?? null;

const PROBE = `(() => {
  const page = document.querySelector('.la-page');
  if (!page) return { error: 'no .la-page' };
  const pr = page.getBoundingClientRect();
  const appEl = document.getElementById('app');
  const ar = appEl ? appEl.getBoundingClientRect() : null;
  const grid = document.querySelector('.la-grid2');
  let tileCols = null;
  if (grid) {
    const lefts = new Set();
    for (const child of grid.children) {
      lefts.add(Math.round(child.getBoundingClientRect().left * 10) / 10);
    }
    tileCols = lefts.size;
  }
  const tile = document.querySelector('[class*=tile]');
  const input = document.querySelector('.la-input, .rc-param, [class*=input]');
  const w = (el) => el ? Math.round(el.getBoundingClientRect().width) : null;
  return {
    winW: window.innerWidth, pageW: Math.round(pr.width),
    appW: ar ? Math.round(ar.width) : null,
    appLeft: ar ? Math.round(ar.left * 10) / 10 : null,
    hScroll: document.documentElement.scrollWidth > window.innerWidth + 1,
    tileW: w(tile), inputW: w(input), tileCols,
  };
})()`;

const SCRIPT_SRC = `(() => {
  const src = [...document.scripts].map(s => s.getAttribute('src')).filter(Boolean)
    .find(s => s.includes('assets/index-'));
  return src ? src.split('/').pop() : null;
})()`;

const SW_PRECLEAN = `navigator.serviceWorker?.getRegistrations().then(rs=>Promise.all(rs.map(r=>r.unregister()))).then(()=>caches?.keys?.().then(ks=>Promise.all(ks.map(k=>caches.delete(k))))).catch(()=>{}); true`;

async function waitForTarget() {
  for (let i = 0; i < 100; i += 1) {
    try {
      const r = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`);
      const t = (await r.json()).find((x) => x.type === 'page' && x.webSocketDebuggerUrl);
      if (t) return t;
    } catch { /* not up */ }
    await sleep(100);
  }
  throw new Error('CDP target timeout');
}
function connect(url) {
  return new Promise((res, rej) => {
    const ws = new WebSocket(url);
    const pending = new Map(); let id = 0;
    ws.addEventListener('message', (e) => {
      const m = JSON.parse(e.data);
      if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); }
    });
    ws.addEventListener('open', () => res({
      send: (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); }),
      close: () => ws.close(),
    }));
    ws.addEventListener('error', rej, { once: true });
  });
}

/* bundle 对拍：dist/assets/index-*.js 实际文件名 vs 页面实跑 script[src] */
function distIndexChunk() {
  const files = readdirSync(DIST_ASSETS).filter((f) => /^index-.+\.js$/.test(f));
  if (files.length !== 1) throw new Error(`dist/assets index chunk != 1: ${files.join(',')}`);
  return files[0];
}

/* 逐路由判定（派工单验收标准；返回 [断言名, 布尔] 数组） */
function judge(size, pageId, v) {
  const checks = [];
  if (size.w >= STAGE_MIN) {
    checks.push([`pageW==${STAGE_W}`, v.pageW === STAGE_W]);
    checks.push(['hScroll==false', v.hScroll === false]);
    const expectLeft = (size.w - (STAGE_W + STAGE_BORDER_TOTAL)) / 2;
    checks.push([`appLeft≈${expectLeft}±${TOL_LEFT}`,
      v.appLeft !== null && Math.abs(v.appLeft - expectLeft) <= TOL_LEFT]);
    if (pageId === 'p01') checks.push(['tileCols==3', v.tileCols === 3]);
  } else {
    const base = baselineOf(pageId);
    checks.push([`pageW==${size.w}`, v.pageW === size.w]);
    checks.push(['hScroll==false', v.hScroll === false]);
    if (pageId === 'p01') {
      checks.push(['tileCols==2', v.tileCols === 2]);
      if (base?.tileW != null) {
        checks.push([`tileW≈基线${base.tileW}±${TOL_BASE}`,
          v.tileW != null && Math.abs(v.tileW - base.tileW) <= TOL_BASE]);
      }
    }
    if (base?.inputW != null) {
      checks.push([`inputW≈基线${base.inputW}±${TOL_BASE}`,
        v.inputW != null && Math.abs(v.inputW - base.inputW) <= TOL_BASE]);
    }
  }
  return checks;
}

const chrome = spawn(CHROME, [
  `--remote-debugging-port=${DEBUG_PORT}`, '--headless=new', '--no-first-run',
  '--user-data-dir=' + join(process.env.TEMP ?? '/tmp', 'cdp-v414a-verify'), 'about:blank',
], { stdio: 'ignore' });

let exitCode = 0;
try {
  const client = await connect((await waitForTarget()).webSocketDebuggerUrl);
  await client.send('Page.enable');
  await client.send('Runtime.enable');
  await client.send('Network.enable');

  const expectDist = distIndexChunk();
  const rows = [];

  for (const s of SIZES) {
    await client.send('Emulation.setDeviceMetricsOverride', { width: s.w, height: s.h, deviceScaleFactor: 2, mobile: s.w <= 480 });
    for (const route of ROUTES) {
      const pageId = route.replace('#/', '');
      await client.send('Page.navigate', { url: URL_BASE });
      await sleep(400);
      // SW 预清理（V4.10 教训：SW precache 旧包会顶掉新 bundle）
      await client.send('Runtime.evaluate', { expression: SW_PRECLEAN, awaitPromise: true });
      await client.send('Page.navigate', { url: URL_BASE + route });
      await sleep(900);
      const m = await client.send('Runtime.evaluate', { expression: PROBE, returnByValue: true });
      const v = m.result.value ?? { error: 'probe null' };
      const pageScript = (await client.send('Runtime.evaluate', { expression: SCRIPT_SRC, returnByValue: true })).result.value ?? null;
      const bundleOk = pageScript === expectDist;
      const checks = v.error ? [['probe错误:' + v.error, false]] : judge(s, pageId, v);
      if (!bundleOk) checks.push([`bundle==${expectDist}(页面实跑${pageScript})`, false]);
      const pass = checks.every(([, ok]) => ok);
      const row = { size: `${s.w}x${s.h}`, page: pageId, ...v, pageScript, expectDist, checks, verdict: pass ? 'PASS' : 'FAIL' };
      rows.push(row);
      console.log(`${pass ? 'PASS' : 'FAIL'}  ${s.w}x${s.h}  ${pageId}  pageW=${v.pageW} appW=${v.appW} appLeft=${v.appLeft} tileW=${v.tileW} inputW=${v.inputW} tileCols=${v.tileCols} hScroll=${v.hScroll} bundle=${bundleOk ? 'ok' : 'MISMATCH'}`);
      console.log(`       ${checks.map(([name, ok]) => `${ok ? 'ok' : 'NG'} ${name}`).join(' | ')}`);
      // 截图留证：≥560 四档的 p01 与 p09（键盘页，验收风险项）
      if (s.w >= STAGE_MIN && (pageId === 'p01' || pageId === 'p09')) {
        const shot = await client.send('Page.captureScreenshot', { format: 'png' });
        writeFileSync(join(OUT_DIR, `stage-${pageId}-${s.id}.png`), Buffer.from(shot.data, 'base64'));
      }
    }
  }

  const failCount = rows.filter((r) => r.verdict === 'FAIL').length;
  const summary = {
    when: new Date().toISOString(),
    url: URL_BASE,
    chrome: CHROME,
    cdpPort: DEBUG_PORT,
    stage: { minWidth: STAGE_MIN, columnWidth: STAGE_W, borderTotal: STAGE_BORDER_TOTAL, expectLeftFormula: '(winW-542)/2', tolLeft: TOL_LEFT, tolBaseline: TOL_BASE },
    bundle: { distIndexChunk: expectDist, allMatch: rows.every((r) => r.pageScript === expectDist) },
    total: rows.length, pass: rows.length - failCount, fail: failCount,
    rows,
  };
  writeFileSync(join(OUT_DIR, 'verify-stage.json'), JSON.stringify(summary, null, 2));
  console.log(`== 判定行（脚本计算生成） ==`);
  for (const r of rows) console.log(`${r.verdict}  ${r.size}  ${r.page}`);
  console.log(`FAIL=${failCount} / ${rows.length}`);
  exitCode = failCount === 0 ? 0 : 1;
  client.close();
} finally { chrome.kill(); }
process.exit(exitCode);
