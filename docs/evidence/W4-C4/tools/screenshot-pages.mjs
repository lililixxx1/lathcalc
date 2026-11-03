#!/usr/bin/env node
/**
 * W4-C4 · 390×844 逐页截图 + 布局量测（Chrome headless + CDP，零第三方依赖）
 *
 * CLI --window-size 会受 Chrome 最小窗口宽度限制（≈500px），截图被裁切但布局并非 390；
 * 因此本工具与 measure-390.mjs 一样使用 CDP Emulation.setDeviceMetricsOverride
 * 强制 390×844 / DPR=1 / mobile=true，再逐页截图。
 *
 * 用法：
 *   node docs/evidence/W4-C4/tools/screenshot-pages.mjs <url> <outDir>
 *   CHROME 环境变量可指定 Chrome/Edge 可执行文件；CDP_PORT 可改调试端口。
 *
 * 判定：每页 pageId 与请求一致、horizontalOverflow=false；否则 REAL_EXIT=1。
 */

import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const URL_TO_TEST = process.argv[2] ?? 'http://127.0.0.1:4173/';
const OUT_DIR = process.argv[3] ?? 'docs/evidence/W4-C4/runs';
const CHROME = process.env.CHROME ?? 'chrome';
const DEBUG_PORT = Number(process.env.CDP_PORT ?? 9335);
const PAGE_IDS = ['p01', 'p07', 'p08', 'p09', 'p10'];

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
  const page = document.querySelector('.la-page');
  const app = document.querySelector('#app');
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
    appWidth: app ? app.getBoundingClientRect().width : null,
    pageWidth: page ? page.getBoundingClientRect().width : null,
    horizontalOverflow: html.scrollWidth > html.clientWidth,
    verticalOverflow: html.scrollHeight > html.clientHeight,
  };
})()`;

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const { child, profile } = startChrome();
  let client;
  const shots = [];
  try {
    const target = await waitForTarget();
    client = await connect(target.webSocketDebuggerUrl);
    await client.send('Page.enable');
    await client.send('Runtime.enable');
    await client.send('Log.enable');
    const chromeVersion = (await client.send('Browser.getVersion')).product;

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

    for (const pageId of PAGE_IDS) {
      if (pageId !== 'p01') {
        await evaluate(client, `location.hash = '#/${pageId}'`);
        await waitFor(
          client,
          `document.querySelector('.la-page')?.dataset.page === '${pageId}'`,
          `${pageId} render`,
        );
      }
      await sleep(150);
      const metrics = await evaluate(client, MEASURE_EXPRESSION);
      const screenshot = await client.send('Page.captureScreenshot', {
        format: 'png',
        captureBeyondViewport: false,
      });
      const file = `${pageId}-390x844.png`;
      writeFileSync(join(OUT_DIR, file), Buffer.from(screenshot.data, 'base64'));
      shots.push({ ...metrics, file });
    }

    const report = {
      tool: 'chrome-headless-cdp',
      chromeVersion,
      url: URL_TO_TEST,
      viewport: { width: 390, height: 844, deviceScaleFactor: 1, mobile: true },
      shots,
      exceptions: client.events.exceptions,
      consoleErrors: client.events.consoleErrors,
      allPagesNoHorizontalOverflow: shots.every((shot) => shot.horizontalOverflow === false),
      allPageIdsMatch: shots.every((shot) => shot.pageId !== null),
    };
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);

    if (!report.allPagesNoHorizontalOverflow || !report.allPageIdsMatch) {
      process.exitCode = 1;
    }
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
