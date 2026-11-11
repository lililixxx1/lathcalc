/**
 * baseline-audit.mjs · V4.14 基线审计（用户反馈「窗口有大有小 / 设计规划 / 性能」）
 *
 * A. 响应式现状：四窗口尺寸 × 代表路由——.la-page 宽度、内容拉伸取证（tile/input
 *    卡实测宽度）、横向溢出、截图。现状预期：全仓零 @media（grep 已证），宽窗下
 *    .la-page width:100% 整页拉伸（base.ts .rc-route width:100%）。
 * B. 性能基线：冷启（禁缓存 + SW 注销）paint/navigation/LCP 指标 ×3 轮取中位，
 *    暖启（SW precache 命中）同口径——优化前后对拍用。
 *
 * 用法：CHROME="...chrome.exe" node baseline-audit.mjs <url> <outDir>
 */
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const URL_BASE = process.argv[2] ?? 'http://localhost:4173/';
const OUT_DIR = process.argv[3] ?? 'docs/evidence/V4.14/baseline';
const CHROME = process.env.CHROME ?? 'chrome';
const DEBUG_PORT = Number(process.env.CDP_PORT ?? 9377);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync(OUT_DIR, { recursive: true });

const SIZES = [
  { id: '390', w: 390, h: 844 },    // 手机（现设计基线）
  { id: '768', w: 768, h: 1024 },   // 平板竖 / 半屏窗
  { id: '1280', w: 1280, h: 800 },  // 笔记本窗口
  { id: '1920', w: 1920, h: 1080 }, // 全高清桌面
];
const ROUTES = ['#/p01', '#/p02', '#/p06', '#/p09', '#/p12'];

const PROBE = `(() => {
  const page = document.querySelector('.la-page');
  if (!page) return { error: 'no .la-page' };
  const pr = page.getBoundingClientRect();
  const tile = document.querySelector('[class*=tile]');
  const input = document.querySelector('.la-input, .rc-param, [class*=input]');
  const card = document.querySelector('.la-card, [class*=card]');
  const bar = document.querySelector('.rc-statusbar, [class*=statusbar]');
  const w = (el) => el ? Math.round(el.getBoundingClientRect().width) : null;
  return {
    winW: window.innerWidth, pageW: Math.round(pr.width),
    hScroll: document.documentElement.scrollWidth > window.innerWidth + 1,
    tileW: w(tile), inputW: w(input), cardW: w(card), barW: w(bar),
    // 拉伸比：内容元素宽 / 390 基线（>2 = 手机组件在宽窗裸奔拉伸）
    stretch: tile ? +(w(tile) / 390).toFixed(2) : null,
  };
})()`;

const PERF_INIT = `
window.__lcp = 0;
try {
  new PerformanceObserver((l) => { const es = l.getEntries(); if (es.length) window.__lcp = es[es.length-1].startTime; })
    .observe({ type: 'largest-contentful-paint', buffered: true });
} catch (e) {}
`;
const PERF_READ = `(() => ({
  paints: performance.getEntriesByType('paint').map(p => ({ name: p.name, t: Math.round(p.startTime) })),
  nav: (() => { const n = performance.getEntriesByType('navigation')[0]; return n ? {
    dcl: Math.round(n.domContentLoadedEventEnd), load: Math.round(n.loadEventEnd),
    transfer: n.transferSize, dom: Math.round(n.domInteractive) } : null; })(),
  lcp: Math.round(window.__lcp || 0),
  res: performance.getEntriesByType('resource').length,
  resTransfer: performance.getEntriesByType('resource').reduce((s, r) => s + (r.transferSize || 0), 0),
}))()`;

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

const chrome = spawn(CHROME, [
  `--remote-debugging-port=${DEBUG_PORT}`, '--headless=new', '--no-first-run',
  '--user-data-dir=' + join(process.env.TEMP ?? '/tmp', 'cdp-v414-base'), 'about:blank',
], { stdio: 'ignore' });

try {
  const client = await connect((await waitForTarget()).webSocketDebuggerUrl);
  await client.send('Page.enable');
  await client.send('Runtime.enable');
  await client.send('Network.enable');
  await client.send('Page.addScriptToEvaluateOnNewDocument', { source: PERF_INIT });

  /* ---- A. 响应式四尺寸 ---- */
  const resp = [];
  for (const s of SIZES) {
    await client.send('Emulation.setDeviceMetricsOverride', { width: s.w, height: s.h, deviceScaleFactor: 2, mobile: s.w <= 480 });
    for (const route of ROUTES) {
      await client.send('Page.navigate', { url: URL_BASE });
      await sleep(400);
      await client.send('Runtime.evaluate', { expression: `navigator.serviceWorker?.getRegistrations().then(rs=>Promise.all(rs.map(r=>r.unregister()))).then(()=>caches?.keys?.().then(ks=>Promise.all(ks.map(k=>caches.delete(k))))).catch(()=>{}); true`, awaitPromise: true });
      await client.send('Page.navigate', { url: URL_BASE + route });
      await sleep(900);
      const m = await client.send('Runtime.evaluate', { expression: PROBE, returnByValue: true });
      const v = m.result.value;
      const pageId = route.replace('#/', '');
      resp.push({ size: `${s.w}x${s.h}`, page: pageId, ...v });
      console.log(`${s.w}x${s.h}  ${pageId}  pageW=${v.pageW} tileW=${v.tileW} inputW=${v.inputW} stretch=${v.stretch} hScroll=${v.hScroll}`);
      const shot = await client.send('Page.captureScreenshot', { format: 'png' });
      writeFileSync(join(OUT_DIR, `resp-${pageId}-${s.id}.png`), Buffer.from(shot.data, 'base64'));
    }
  }

  /* ---- B. 性能基线（#/p01）：冷启 3 轮 + 暖启 3 轮 ---- */
  await client.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  const perf = { cold: [], warm: [] };
  for (let i = 0; i < 3; i += 1) {
    await client.send('Network.setCacheDisabled', { cacheDisabled: true });
    await client.send('Runtime.evaluate', { expression: `navigator.serviceWorker?.getRegistrations().then(rs=>Promise.all(rs.map(r=>r.unregister()))).then(()=>caches?.keys?.().then(ks=>Promise.all(ks.map(k=>caches.delete(k))))).catch(()=>{}); true`, awaitPromise: true });
    await client.send('Page.navigate', { url: 'about:blank' }); await sleep(150);
    await client.send('Page.navigate', { url: URL_BASE + '#/p01' });
    await sleep(3500);
    const m = await client.send('Runtime.evaluate', { expression: PERF_READ, returnByValue: true });
    perf.cold.push(m.result.value);
    console.log(`cold[${i}]`, JSON.stringify(m.result.value));
  }
  await client.send('Network.setCacheDisabled', { cacheDisabled: false });
  // 暖启：先访问一次让 SW 安装 + precache，再二次导航（SW 控制）
  await client.send('Page.navigate', { url: URL_BASE + '#/p01' });
  await sleep(2500);
  for (let i = 0; i < 3; i += 1) {
    await client.send('Page.navigate', { url: 'about:blank' }); await sleep(150);
    await client.send('Page.navigate', { url: URL_BASE + '#/p01' });
    await sleep(3000);
    const m = await client.send('Runtime.evaluate', { expression: PERF_READ, returnByValue: true });
    perf.warm.push(m.result.value);
    console.log(`warm[${i}]`, JSON.stringify(m.result.value));
  }
  const med = (arr, key) => { const xs = arr.map((x) => x[key] ?? x.lcp).sort((a, b) => a - b); return xs[Math.floor(xs.length / 2)]; };
  const summary = {
    cold: { fcp: med(perf.cold.map(p => ({ lcp: p.paints?.find(x => x.name === 'first-contentful-paint')?.t ?? 0 })), 'lcp'), lcp: med(perf.cold, 'lcp'), dcl: med(perf.cold, 'dcl'), load: med(perf.cold, 'load'), transferKB: Math.round(med(perf.cold, 'transfer') / 1024) },
    warm: { fcp: med(perf.warm.map(p => ({ lcp: p.paints?.find(x => x.name === 'first-contentful-paint')?.t ?? 0 })), 'lcp'), lcp: med(perf.warm, 'lcp'), dcl: med(perf.warm, 'dcl'), load: med(perf.warm, 'load'), transferKB: Math.round(med(perf.warm, 'transfer') / 1024) },
  };
  console.log('== 中位摘要 ==', JSON.stringify(summary));
  writeFileSync(join(OUT_DIR, 'baseline.json'), JSON.stringify({ when: new Date().toISOString(), url: URL_BASE, responsive: resp, perf, summary }, null, 2));
  client.close();
} finally { chrome.kill(); }
