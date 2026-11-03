#!/usr/bin/env node
/**
 * W4-C1 · 390×844 布局自验工具（Chrome headless + Chrome DevTools Protocol）
 *
 * 用法：
 *   node docs/evidence/W4-C1/tools/measure-390.mjs <url> [screenshotPath]
 *   CHROME 环境变量可指定 Chrome/Edge 可执行文件；默认尝试 "chrome"（PATH）。
 *
 * 判定：
 *   - documentElement.scrollWidth <= clientWidth（390）→ 无横向滚动
 *   - 逐页遍历 p01–p14，读取 pageId / 视口 / 文档宽高 / 网格列宽 / 入口数量
 *   - 输出 JSON（stdout），异常与 console error 一并留痕
 */

import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const URL_TO_TEST = process.argv[2] ?? 'http://127.0.0.1:4173/';
const SCREENSHOT_PATH = process.argv[3] ?? '';
const CHROME = process.env.CHROME ?? 'chrome';
const DEBUG_PORT = Number(process.env.CDP_PORT ?? 9333);
const PAGE_IDS = Array.from({ length: 14 }, (_, index) => `p${String(index + 1).padStart(2, '0')}`);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function startChrome() {
  const profile = mkdtempSync(join(tmpdir(), 'lathcalc-cdp-'));
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
      // Chrome 尚未监听端口，继续等待
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

const MEASURE_EXPRESSION = `(() => {
  const html = document.documentElement;
  const app = document.querySelector('#app');
  const page = document.querySelector('.la-page');
  const grid = document.querySelector('.la-grid2');
  const rect = (element) => {
    if (!element) return null;
    const r = element.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom };
  };
  const computed = page ? getComputedStyle(page) : null;
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
    grid: rect(grid),
    gridColumns: grid ? getComputedStyle(grid).gridTemplateColumns : null,
    tileCount: document.querySelectorAll('.la-tile').length,
    pageOverflow: computed ? computed.overflow : null,
    horizontalOverflow: html.scrollWidth > html.clientWidth,
    verticalOverflow: html.scrollHeight > html.clientHeight,
  };
})()`;

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

    const pages = [];
    for (const pageId of PAGE_IDS) {
      if (pageId !== 'p01') {
        await evaluate(client, `location.hash = '#/${pageId}'`);
        await waitFor(
          client,
          `document.querySelector('.la-page')?.dataset.page === '${pageId}'`,
          `${pageId} render`,
        );
      }
      await sleep(120);
      const metrics = await evaluate(client, MEASURE_EXPRESSION);
      pages.push(metrics);
    }

    if (SCREENSHOT_PATH) {
      await evaluate(client, `location.hash = '#/p01'`);
      await waitFor(
        client,
        `document.querySelector('.la-page')?.dataset.page === 'p01'`,
        'p01 screenshot render',
      );
      await sleep(150);
      const screenshot = await client.send('Page.captureScreenshot', {
        format: 'png',
        captureBeyondViewport: false,
      });
      writeFileSync(SCREENSHOT_PATH, Buffer.from(screenshot.data, 'base64'));
    }

    const report = {
      tool: 'chrome-headless-cdp',
      chromeVersion,
      url: URL_TO_TEST,
      viewport: { width: 390, height: 844, deviceScaleFactor: 1, mobile: true },
      pages,
      exceptions: client.events.exceptions,
      consoleErrors: client.events.consoleErrors,
      allPagesNoHorizontalOverflow: pages.every((page) => page.horizontalOverflow === false),
      screenshot: SCREENSHOT_PATH ? 'saved' : null,
      screenshotPath: SCREENSHOT_PATH || null,
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
