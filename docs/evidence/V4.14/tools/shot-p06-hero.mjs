/**
 * shot-p06-hero.mjs · V4.14 卡 C 补拍：p06 切点页 hero 变体图形（220×102 viewBox，
 * V4.2 §2 冻结坐标标注层）在 540 舞台列内的适配取证。
 *
 * 背景：计划 §1.3「p05 hero 适配核查」的 hero 变体（arcCaseGraphic(id,'hero')，
 * p05.ts:289）实际渲染于 p06 详情页（p06.ts:256；缺省黄金用例即渲染静态 hero，
 * p06.ts:278）——p05 图库态页首无 hero（vision 6/6 判读时发现，grep 坐实消费点）。
 * 本工具在 ≥560 两档拍 p06 默认态，供 vision 判读 hero 等比缩放/无裁切/无越界。
 *
 * 用法：CHROME="<chrome.exe>" CDP_PORT=9377 node shot-p06-hero.mjs <url> <outDir>
 */
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const URL_BASE = process.argv[2] ?? 'http://localhost:4173/';
const OUT_DIR = process.argv[3] ?? 'docs/evidence/V4.14/runs';
const CHROME = process.env.CHROME ?? 'chrome';
const DEBUG_PORT = Number(process.env.CDP_PORT ?? 9377);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync(OUT_DIR, { recursive: true });

const SIZES = [
  { id: '768', w: 768, h: 1024 },
  { id: '1280', w: 1280, h: 800 },
];

const SW_PRECLEAN = `navigator.serviceWorker?.getRegistrations().then(rs=>Promise.all(rs.map(r=>r.unregister()))).then(()=>caches?.keys?.().then(ks=>Promise.all(ks.map(k=>caches.delete(k))))).catch(()=>{}); true`;
/** hero 取证探针：hero SVG（220×102 viewBox 消费点）实测 rect + 越界判定 */
const PROBE = `(() => {
  const page = document.querySelector('.la-page');
  if (!page) return { error: 'no .la-page at all' };
  const holder = document.querySelector('.rc-p06__diagram');
  if (!holder) return { error: 'no .rc-p06__diagram', dataPage: page.dataset.page ?? null, svgCount: document.querySelectorAll('svg').length };
  const svg = holder.querySelector('svg');
  if (!svg) return { error: 'no svg in diagram' };
  const r = svg.getBoundingClientRect();
  const page = document.querySelector('.la-page').getBoundingClientRect();
  return {
    heroW: Math.round(r.width), heroH: Math.round(r.height),
    heroLeft: Math.round(r.left), pageLeft: Math.round(page.left), pageRight: Math.round(page.right),
    insideColumn: r.left >= page.left - 1 && r.right <= page.right + 1,
    aspect: +(r.width / r.height).toFixed(2),
  };
})()`;

async function waitForTarget() {
  for (let i = 0; i < 100; i += 1) {
    try {
      const resp = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`);
      const t = (await resp.json()).find((x) => x.type === 'page' && x.webSocketDebuggerUrl);
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

const chrome = spawn(CHROME, [
  `--remote-debugging-port=${DEBUG_PORT}`, '--headless=new', '--no-first-run',
  '--user-data-dir=' + join(process.env.TEMP ?? '/tmp', 'cdp-v414-p06hero'), 'about:blank',
], { stdio: 'ignore' });

try {
  const client = await connect((await waitForTarget()).webSocketDebuggerUrl);
  await client.send('Page.enable');
  await client.send('Runtime.enable');
  const rows = [];
  for (const s of SIZES) {
    await client.send('Emulation.setDeviceMetricsOverride', { width: s.w, height: s.h, deviceScaleFactor: 2, mobile: false });
    await client.send('Page.navigate', { url: URL_BASE });
    await sleep(400);
    await client.send('Runtime.evaluate', { expression: SW_PRECLEAN, awaitPromise: true });
    await client.send('Page.navigate', { url: URL_BASE + '#/p06?case=AC05' });
    await sleep(1600);
    const m = await client.send('Runtime.evaluate', { expression: PROBE, returnByValue: true });
    const v = m.result.value;
    rows.push({ size: `${s.w}x${s.h}`, ...v });
    console.log(`${s.w}x${s.h}`, JSON.stringify(v));
    const shot = await client.send('Page.captureScreenshot', { format: 'png' });
    writeFileSync(join(OUT_DIR, `hero-p06-${s.id}.png`), Buffer.from(shot.data, 'base64'));
  }
  writeFileSync(join(OUT_DIR, 'hero-p06.json'), JSON.stringify({ when: new Date().toISOString(), rows }, null, 2));
  client.close();
} finally { chrome.kill(); }
