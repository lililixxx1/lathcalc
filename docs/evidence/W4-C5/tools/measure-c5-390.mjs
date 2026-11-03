#!/usr/bin/env node
/**
 * W4-C5 · 390×844 布局自验工具（Chrome headless + Chrome DevTools Protocol）
 *
 * 用法：
 *   node docs/evidence/W4-C5/tools/measure-c5-390.mjs <url> <outDir>
 *   CHROME 环境变量可指定 Chrome/Edge 可执行文件；默认尝试 "chrome"（PATH）。
 *
 * 量测对象：生产构建 preview（仓库根 `npm run build` 后 `npx vite preview --port 4175`），
 *   入口即真实 src/main.ts（Lead 已接通 hash 路由）。
 *
 * 判定：
 *   - documentElement / .la-page / .la-body 三层 scrollWidth <= clientWidth → 无横向滚动
 *   - 逐页 p11–p14 读取关键区块计数，证明真实渲染而非空页
 *   - p14 额外点按「生成分享长图」，读取 canvas dataURL 长度并截图
 *   - 输出 JSON（stdout），异常与 console error 一并留痕
 */

import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const URL_TO_TEST =
  process.argv[2] ?? 'http://localhost:4173/';
const OUT_DIR = process.argv[3] ?? 'docs/evidence/W4-C5/runs';
const CHROME = process.env.CHROME ?? 'chrome';
const DEBUG_PORT = Number(process.env.CDP_PORT ?? 9333);
const PAGE_IDS = ['p11', 'p12', 'p13', 'p14'];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function startChrome() {
  const profile = mkdtempSync(join(tmpdir(), 'lathcalc-c5-cdp-'));
  const child = spawn(
    CHROME,
    [
      '--headless=new',
      `--remote-debugging-port=${DEBUG_PORT}`,
      '--remote-debugging-address=127.0.0.1',
      `--user-data-dir=${profile}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--hide-scrollbars',
      '--window-size=390,844',
      'about:blank',
    ],
    { stdio: 'ignore' },
  );
  return { child, profile };
}

async function waitForTarget() {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`);
      const targets = await response.json();
      const page = targets.find((target) => target.type === 'page' && target.webSocketDebuggerUrl);
      if (page) return page;
    } catch {
      // Chrome 尚未监听端口
    }
    await sleep(100);
  }
  throw new Error('CDP target timeout');
}

function connect(webSocketUrl) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(webSocketUrl);
    const pending = new Map();
    const events = { exceptions: [], consoleErrors: [] };
    let nextId = 0;

    socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      if (message.id && pending.has(message.id)) {
        const { resolve: resolvePending, reject: rejectPending } = pending.get(message.id);
        pending.delete(message.id);
        if (message.error) rejectPending(new Error(`${message.error.message} (${message.error.code})`));
        else resolvePending(message.result);
        return;
      }
      if (message.method === 'Runtime.exceptionThrown') {
        const details = message.params.exceptionDetails;
        events.exceptions.push(details.exception?.description ?? details.text);
      }
      if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error') {
        const entry = message.params.entry;
        events.consoleErrors.push(`${entry.url ?? '(no url)'} :: ${entry.text}`);
      }
    });

    socket.addEventListener('open', () => {
      resolve({
        send(method, params = {}) {
          const id = ++nextId;
          return new Promise((resolvePending, rejectPending) => {
            pending.set(id, { resolve: resolvePending, reject: rejectPending });
            socket.send(JSON.stringify({ id, method, params }));
          });
        },
        events,
        close: () => socket.close(),
      });
    });
    socket.addEventListener('error', reject, { once: true });
  });
}

async function evaluate(client, expression) {
  const result = await client.send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
  }
  return result.result.value;
}

async function waitFor(client, expression, label, timeoutMs = 20000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      if (await evaluate(client, expression)) return;
    } catch {
      // 页面尚未就绪
    }
    await sleep(100);
  }
  throw new Error(`timeout waiting for ${label}`);
}

const MEASURE_EXPRESSION = `(() => {
  const html = document.documentElement;
  const app = document.querySelector('#app');
  const page = document.querySelector('.la-page');
  const body = document.querySelector('.la-body');
  const rect = (element) => {
    if (!element) return null;
    const r = element.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom };
  };
  const overflow = (element) => (element ? element.scrollWidth > element.clientWidth : null);
  const computed = page ? getComputedStyle(page) : null;
  const shareImg = document.querySelector('.rc-p14__shareimg');
  return {
    hash: location.hash,
    pageId: page ? page.dataset.page : null,
    viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio },
    documentElement: {
      scrollWidth: html.scrollWidth,
      clientWidth: html.clientWidth,
      scrollHeight: html.scrollHeight,
      clientHeight: html.clientHeight,
    },
    body: { scrollWidth: document.body.scrollWidth, clientWidth: document.body.clientWidth },
    app: rect(app),
    page: rect(page),
    pageOverflow: computed ? computed.overflow : null,
    bodyRect: rect(body),
    bodyScroll: body
      ? { scrollWidth: body.scrollWidth, clientWidth: body.clientWidth, scrollHeight: body.scrollHeight, clientHeight: body.clientHeight }
      : null,
    horizontalOverflow: overflow(html),
    pageHorizontalOverflow: overflow(page),
    bodyHorizontalOverflow: overflow(body),
    bodyVerticalOverflow: body ? body.scrollHeight > body.clientHeight : null,
    counts: {
      segItems: document.querySelectorAll('.rc-seg__item').length,
      inputs: document.querySelectorAll('.rc-input__field').length,
      densityChips: document.querySelectorAll('.rc-p11__density .la-chip').length,
      p12Fields: document.querySelectorAll('.rc-p12__field').length,
      resultRows: document.querySelectorAll('.la-resrow').length,
      gcodeRows: document.querySelectorAll('.rc-p13__list .la-lrow').length,
      p14Items: document.querySelectorAll('.rc-p14__item').length,
      p14DetailParams: document.querySelectorAll('.rc-p14__detail .rc-param').length,
      statValue: document.querySelector('.rc-stat__value')?.textContent ?? null,
      shareImageDataUrlLength: shareImg ? shareImg.src.length : null,
      shareDownloadName: document.querySelector('.rc-p14__download')?.getAttribute('download') ?? null,
    },
  };
})()`;

const SEED_FAVORITES = [
  {
    id: 'demo-1',
    kind: 'thread',
    title: 'M30 × 3.5 普通螺纹',
    params: { d2: '27.727', 底孔: '26.5', G76: '已生成' },
    ts: Date.now() - 86_400_000,
  },
  {
    id: 'demo-2',
    kind: 'taper',
    title: '莫氏 4 号锥度',
    params: { 锥度: '1:19.254', 半角: '1°29′' },
    ts: Date.now() - 3 * 86_400_000,
  },
  {
    id: 'demo-3',
    kind: 'speed',
    title: 'Ø50 车外圆',
    params: { n: '955 r/min', vf: '191 mm/min' },
    ts: Date.now() - 3 * 86_400_000,
  },
];

const SEED_HISTORY = [
  {
    id: 'demo-h1',
    kind: 'triangle',
    title: '30 / 40 / 50 直角三角形',
    params: { a: 30, b: 40, c: 50 },
    ts: Date.now() - 86_400_000,
  },
];

async function screenshot(client, path) {
  const result = await client.send('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: false,
  });
  writeFileSync(path, Buffer.from(result.data, 'base64'));
}

async function main() {
  const { child, profile } = startChrome();
  let client;
  let chromeVersion = null;
  try {
    const target = await waitForTarget();
    client = await connect(target.webSocketDebuggerUrl);
    await client.send('Page.enable');
    await client.send('Runtime.enable');
    await client.send('Log.enable');
    chromeVersion = (await client.send('Browser.getVersion')).product;

    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 1,
      mobile: true,
      screenWidth: 390,
      screenHeight: 844,
    });

    await client.send('Page.navigate', { url: URL_TO_TEST });
    await waitFor(client, `document.readyState === 'complete'`, 'document ready');
    await waitFor(
      client,
      `Boolean(document.querySelector('.la-page[data-page="p01"]'))`,
      'p01 render',
    );

    await evaluate(
      client,
      `localStorage.setItem('lathcalc.favorites', ${JSON.stringify(JSON.stringify(SEED_FAVORITES))});
       localStorage.setItem('lathcalc.history', ${JSON.stringify(JSON.stringify(SEED_HISTORY))});
       true`,
    );

    const pages = [];
    for (const pageId of PAGE_IDS) {
      await evaluate(client, `location.hash = '#/${pageId}'`);
      await waitFor(
        client,
        `document.querySelector('.la-page')?.dataset.page === '${pageId}'`,
        `${pageId} render`,
      );
      await sleep(160);
      const metrics = await evaluate(client, MEASURE_EXPRESSION);
      await screenshot(client, join(OUT_DIR, `${pageId}-390x844.png`));
      pages.push(metrics);
    }

    // p14 条目详情：点开首条 → 量测 + 截图 → 收起
    await evaluate(
      client,
      `document.querySelector('.rc-p14__item-main')?.click(), true`,
    );
    await sleep(160);
    const detailMetrics = await evaluate(client, MEASURE_EXPRESSION);
    await screenshot(client, join(OUT_DIR, 'p14-detail-390x844.png'));
    await evaluate(
      client,
      `document.querySelector('.rc-p14__detail-close')?.click(), true`,
    );
    await sleep(120);

    // p14 分享长图：真实 canvas 2D 生成 + 预览 + 下载链接
    const shareClick = await evaluate(
      client,
      `(() => {
        const button = document.querySelector('.rc-p14__body button.rc-btn');
        if (!button) return 'no-button';
        if (button.disabled) return 'disabled';
        button.click();
        return 'clicked';
      })()`,
    );
    await sleep(400);
    const shareProbe = await evaluate(
      client,
      `(() => ({
        click: ${JSON.stringify(shareClick)},
        hasImage: Boolean(document.querySelector('.rc-p14__shareimg')),
        message: document.querySelector('.rc-p14__share-msg')?.textContent ?? null,
        itemCount: document.querySelectorAll('.rc-p14__item').length,
        storedFavoritesCount: (() => {
          try {
            return JSON.parse(localStorage.getItem('lathcalc.favorites') ?? '[]').length;
          } catch {
            return -1;
          }
        })(),
      }))()`,
    );
    const shareMetrics = await evaluate(client, MEASURE_EXPRESSION);
    await screenshot(client, join(OUT_DIR, 'p14-share-390x844.png'));

    // 把 canvas 生成的 dataURL 落盘为 PNG，保留长图本体证据
    const shareDataUrl = await evaluate(
      client,
      `document.querySelector('.rc-p14__shareimg')?.getAttribute('src') ?? ''`,
    );
    let shareImagePath = null;
    if (shareDataUrl.startsWith('data:image/png;base64,')) {
      shareImagePath = join(OUT_DIR, 'p14-share-image.png');
      writeFileSync(shareImagePath, Buffer.from(shareDataUrl.split(',')[1] ?? '', 'base64'));
    }

    const report = {
      tool: 'chrome-headless-cdp',
      chromeVersion,
      url: URL_TO_TEST,
      viewport: { width: 390, height: 844, deviceScaleFactor: 1, mobile: true },
      pages,
      detailMetrics,
      shareMetrics,
      allPagesNoHorizontalOverflow: pages.every(
        (page) =>
          page.horizontalOverflow === false &&
          page.pageHorizontalOverflow === false &&
          page.bodyHorizontalOverflow === false,
      ),
      sharePreview: {
        dataUrlLength: shareMetrics.counts.shareImageDataUrlLength,
        downloadName: shareMetrics.counts.shareDownloadName,
      },
      shareProbe,
      shareImagePath,
      screenshots: PAGE_IDS.map((pageId) => `${pageId}-390x844.png`).concat([
        'p14-detail-390x844.png',
        'p14-share-390x844.png',
      ]),
      exceptions: client.events.exceptions,
      consoleErrors: client.events.consoleErrors,
    };
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } finally {
    try {
      client?.close();
    } catch {
      // ignore
    }
    child.kill();
    await sleep(200);
    try {
      rmSync(profile, { recursive: true, force: true });
    } catch {
      // Windows 上 Chrome 子进程可能短暂占用 profile，忽略清理失败
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
