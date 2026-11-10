/**
 * scroll-audit.mjs · V4.13 全站滚动审计（用户反馈「首页划不到底，看不见三角卡片，
 * 其它二级页面也看看」）
 *
 * 模型（取证结论，src/ui/components/base.ts:13 + PageShell.ts:21-23）：
 *   #app 100vh/100dvh 锁视口 → .la-page height:100% overflow:hidden →
 *   .la-body 默认 overflow:hidden——**滚动必须各页 opt-in**（页内 overflow-y 或
 *   .la-page[data-page=xx] .la-body{overflow-y:auto}）。无 opt-in 的页面在矮视口
 *   下内容被硬裁且无任何滚动通道（用户「划不到底」= 没得划）。
 *
 * 判定（每路由 × 每视口）：
 *   - scrollable  = .la-body 或其内部存在可滚动容器（scrollHeight>clientHeight+1
 *     且 computed overflowY 为 auto/scroll），内容裁切可经滚动到达；
 *   - FITS        = .la-body 无溢出（scrollHeight ≤ clientHeight+1）；
 *   - CLIP-NOSCROLL（缺陷）= body 内容底缘超出裁切缘（最deep子孙 rect.bottom >
 *     body 客户区底 + 1）且 body 不可滚且 documentElement 不可滚。
 *   附加取证：p01 三角卡片（Tile 文本含「三角」）rect.bottom vs 视口底。
 *
 * 视口：844（v0.7.0 审计基线，验回归）/ 740（常见安卓 dvh 减地址栏）/ 680（短屏）。
 * 用法：CHROME="...chrome.exe" node scroll-audit.mjs http://localhost:4173/ <outDir>
 * 前置纪律：SW 预清理（V4.10 教训）+ bundle 对拍。
 */
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const URL_TO_TEST = process.argv[2] ?? 'http://localhost:4173/';
const OUT_DIR = process.argv[3] ?? 'docs/evidence/V4.13/runs';
const CHROME = process.env.CHROME ?? 'chrome';
const DEBUG_PORT = Number(process.env.CDP_PORT ?? 9371);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
mkdirSync(OUT_DIR, { recursive: true });

/** 16 路由默认态（p03/p06 带默认参数以落到有内容态；p14 收藏空态亦在册）
 *  + 重内容态（首轮取证后补，验「默认 FITS」页的重型分支——占位态不是证据）：
 *  p03 蜗杆 m2 / p03 梯形 Tr40x7 / p03 密封管 R1/16 / p04 sealpipe G76 长程序。 */
const ROUTES = [
  '#/p01', '#/p02', '#/p03?family=metric', '#/p04', '#/p05', '#/p06', '#/p07',
  '#/p08', '#/p09', '#/p10', '#/p11', '#/p12', '#/p13', '#/p14', '#/p15', '#/p16',
  '#/p03?family=worm&spec=m2&d=2&p=2',
  '#/p03?family=trapezoid&spec=Tr40%C3%977&d=40&p=7',
  '#/p03?family=sealpipe&spec=R1%2F16&d=7.723&p=0.907',
  '#/p04?family=sealpipe&spec=R1%2F16&d=7.723&p=0.9071428571428571',
];
const VIEWPORTS = [844, 740, 680];

/** 滚动判定探针：返回 body/内部容器/文档三级可滚性 + 最深内容底缘 + 裁切缘 */
const EXPR_SCROLL = `(() => {
  const body = document.querySelector('.la-body');
  if (!body) return { error: 'no .la-body' };
  const cs = window.getComputedStyle(body);
  const bodyScrollable = (cs.overflowY === 'auto' || cs.overflowY === 'scroll')
    && body.scrollHeight > body.clientHeight + 1;
  // 内部可滚容器（不含 body 自身）：overflowY auto/scroll 且确有溢出
  let innerScrollable = false;
  const innerList = [];
  for (const el of body.querySelectorAll('*')) {
    const s = window.getComputedStyle(el);
    if ((s.overflowY === 'auto' || s.overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 1) {
      innerScrollable = true; innerList.push(el.className && el.className.baseVal !== undefined ? 'svg' : (el.className || el.tagName));
    }
  }
  const docScrollable = document.documentElement.scrollHeight > document.documentElement.clientHeight + 1;
  // 最 deep 内容底缘 vs body 裁切缘（取 body 所有子孙 rect.bottom 最大值）
  let deepBottom = 0; let deepEl = '';
  for (const el of body.querySelectorAll('*')) {
    const r = el.getBoundingClientRect();
    if (r.height > 0 && r.bottom > deepBottom) { deepBottom = r.bottom; deepEl = (el.className || el.tagName) + ''; }
  }
  const bodyClipBottom = body.getBoundingClientRect().bottom;
  const clipped = deepBottom > bodyClipBottom + 1;
  // p01 三角卡取证
  let triCard = null;
  for (const t of document.querySelectorAll('.la-tile, [class*=tile]')) {
    if (t.textContent && t.textContent.includes('三角')) { const r = t.getBoundingClientRect(); triCard = { top: Math.round(r.top), bottom: Math.round(r.bottom) }; break; }
  }
  return {
    bodyOverflowY: cs.overflowY,
    bodyScrollable, innerScrollable, innerList: innerList.slice(0, 5), docScrollable,
    deepBottom: Math.round(deepBottom), bodyClipBottom: Math.round(bodyClipBottom),
    clipped, triCard, vh: window.innerHeight,
  };
})()`;

async function waitForTarget() {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`);
      const targets = await response.json();
      const page = targets.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
      if (page) return page;
    } catch { /* chrome 未监听 */ }
    await sleep(100);
  }
  throw new Error('CDP target timeout');
}

function connect(webSocketUrl) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(webSocketUrl);
    const pending = new Map();
    const nextId = { v: 0 };
    socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      if (message.id && pending.has(message.id)) {
        const { resolve: rp, reject: rj } = pending.get(message.id);
        pending.delete(message.id);
        if (message.error) rj(new Error(`${message.error.message} (${message.error.code})`));
        else rp(message.result);
      }
    });
    socket.addEventListener('open', () => {
      resolve({
        send(method, params = {}) {
          const id = ++nextId.v;
          return new Promise((rp, rj) => {
            pending.set(id, { resolve: rp, reject: rj });
            socket.send(JSON.stringify({ id, method, params }));
          });
        },
        close: () => socket.close(),
      });
    });
    socket.addEventListener('error', reject, { once: true });
  });
}

async function evaluate(client, expression) {
  const result = await client.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
  }
  return result.result.value;
}

const chrome = spawn(CHROME, [
  `--remote-debugging-port=${DEBUG_PORT}`,
  '--headless=new', '--no-first-run', '--no-default-browser-check',
  '--user-data-dir=' + join(process.env.TEMP ?? '/tmp', 'cdp-scroll-audit'),
  'about:blank',
], { stdio: 'ignore' });

try {
  const target = await waitForTarget();
  const client = await connect(target.webSocketDebuggerUrl);
  await client.send('Page.enable');
  await client.send('Runtime.enable');

  const results = [];
  for (const vh of VIEWPORTS) {
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 390, height: vh, deviceScaleFactor: 2, mobile: true,
    });
    for (const route of ROUTES) {
      // SW 预清理 + 导航（V4.10 教训：localhost 源陈旧 precache 拦资产）
      await client.send('Page.navigate', { url: URL_TO_TEST });
      await sleep(400);
      await evaluate(client, `navigator.serviceWorker?.getRegistrations().then(rs => Promise.all(rs.map(r => r.unregister()))).then(() => caches?.keys?.().then(ks => Promise.all(ks.map(k => caches.delete(k))))).catch(() => {}); true`);
      await client.send('Page.navigate', { url: URL_TO_TEST + route });
      await sleep(700);
      const m = await evaluate(client, EXPR_SCROLL);
      const pageId = route.replace('#/', '').split('?')[0];
      let verdict;
      if (m.error) verdict = 'ERROR';
      else if (!m.clipped) verdict = 'FITS';
      else if (m.bodyScrollable || m.innerScrollable || m.docScrollable) verdict = 'SCROLLABLE';
      else verdict = 'CLIP-NOSCROLL';
      const row = {
        viewport: `390x${vh}`, page: pageId, verdict,
        bodyOverflowY: m.bodyOverflowY,
        deepBottom: m.deepBottom, clipBottom: m.bodyClipBottom, overflowPx: m.deepBottom - m.bodyClipBottom,
        triCard: m.triCard, inner: m.innerList,
      };
      results.push(row);
      console.log(`${row.viewport}  ${pageId.padEnd(4)} ${verdict.padEnd(14)} overflowY=${row.bodyOverflowY?.padEnd(6)} clip+${row.overflowPx}px${row.triCard ? `  tri=[${row.triCard.top},${row.triCard.bottom}]` : ''}`);
    }
  }

  const report = {
    when: new Date().toISOString(),
    url: URL_TO_TEST,
    bundle: await evaluate(client, `document.querySelector('script[src*=index]')?.getAttribute('src') ?? 'n/a'`),
    model: '#app 100dvh + .la-page/.la-body overflow:hidden（PageShell.ts:21-23），滚动须各页 opt-in',
    verdicts: results,
    summary: {
      clipNoScroll: results.filter((r) => r.verdict === 'CLIP-NOSCROLL').map((r) => `${r.viewport}:${r.page}`),
      scrollableAt740: results.filter((r) => r.viewport === '390x740' && r.verdict === 'SCROLLABLE').map((r) => r.page),
      fitsAt740: results.filter((r) => r.viewport === '390x740' && r.verdict === 'FITS').map((r) => r.page),
    },
  };
  writeFileSync(join(OUT_DIR, 'scroll-audit.json'), JSON.stringify(report, null, 2));
  console.log('\n== CLIP-NOSCROLL（缺陷集）==');
  for (const s of report.summary.clipNoScroll) console.log('  ', s);
  client.close();
} finally {
  chrome.kill();
}
