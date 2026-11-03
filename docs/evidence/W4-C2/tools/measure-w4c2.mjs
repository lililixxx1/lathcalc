#!/usr/bin/env node
/**
 * W4-C2 · p02/p03/p04 390×844 布局自验工具（Chrome headless + Chrome DevTools Protocol）
 *
 * 用法：
 *   node docs/evidence/W4-C2/tools/measure-w4c2.mjs <url> [outDir]
 *   CHROME 环境变量可指定 Chrome/Edge 可执行文件；默认 "chrome"（PATH）。
 *   <url> 默认指向 `npm run preview` 的 dist 站点（真实构建产物）。
 *   量测前先 `npm run build` 并启动 `npx vite preview --port 4173 --strictPort`。
 *
 * 判定：
 *   - 逐目标（p02 四族页签 / p03 三族 / p04 两族 + 空参数）读取 390×844 下
 *     documentElement / .la-page / .la-body / p02 列表滚动容器宽度；
 *   - horizontalOverflow = documentElement.scrollWidth > clientWidth，必须全 false；
 *   - 输出 JSON（stdout）并可选落截图；汇总字段由本脚本计算，人工只解读。
 */

import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const URL_TO_TEST = process.argv[2] ?? 'http://localhost:4173/';
const OUT_DIR = process.argv[3] ?? 'docs/evidence/W4-C2/runs';
const CHROME = process.env.CHROME ?? 'chrome';
const DEBUG_PORT = Number(process.env.CDP_PORT ?? 9334);

const M30_STATUS = {
  family: 'metric',
  spec: 'M30 × 3.5',
  d: 30,
  p: 3.5,
};
const TR40 = { family: 'trapezoid', spec: 'Tr40 × 7', d: 40, p: 7 };
const G_HALF = { family: 'pipe', spec: 'G1/2', d: 20.955, p: 25.4 / 14 };

function hashFor(pageId, params) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params ?? {})) search.set(key, String(value));
  const query = search.toString();
  return `#/${pageId}${query ? `?${query}` : ''}`;
}

const TARGETS = [
  { name: 'p02-metric', hash: '#/p02', pageId: 'p02', tab: '普通 M', screenshot: 'p02-390x844.png' },
  { name: 'p02-trapezoid', pageId: 'p02', tab: '梯形 Tr' },
  { name: 'p02-pipe', pageId: 'p02', tab: '55° 管' },
  { name: 'p02-unified', pageId: 'p02', tab: '美制 UN' },
  { name: 'p03-M30x3.5', hash: hashFor('p03', M30_STATUS), pageId: 'p03', screenshot: 'p03-390x844.png' },
  { name: 'p03-Tr40x7', hash: hashFor('p03', TR40), pageId: 'p03' },
  { name: 'p03-G1/2', hash: hashFor('p03', G_HALF), pageId: 'p03' },
  { name: 'p04-M30x3.5', hash: hashFor('p04', M30_STATUS), pageId: 'p04', screenshot: 'p04-390x844.png' },
  { name: 'p04-G1/2', hash: hashFor('p04', G_HALF), pageId: 'p04' },
  { name: 'p04-empty', hash: '#/p04', pageId: 'p04' },
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function startChrome() {
  const profile = mkdtempSync(join(tmpdir(), 'lathcalc-w4c2-cdp-'));
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
  const page = document.querySelector('.la-page');
  const body = document.querySelector('.la-body');
  const list = document.querySelector('.rc-p02__listcard .la-rowlist');
  const widthInfo = (element) => element
    ? {
        scrollWidth: element.scrollWidth,
        clientWidth: element.clientWidth,
        scrollHeight: element.scrollHeight,
        clientHeight: element.clientHeight,
        overflowX: getComputedStyle(element).overflowX,
        overflowY: getComputedStyle(element).overflowY,
      }
    : null;
  return {
    hash: location.hash,
    pageId: page ? page.dataset.page : null,
    eyebrow: document.querySelector('.rc-eyebrow')?.textContent ?? null,
    viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio },
    documentElement: widthInfo(html),
    page: widthInfo(page),
    body: widthInfo(body),
    p02List: list
      ? {
          ...widthInfo(list),
          rowCount: list.querySelectorAll('.la-lrow').length,
        }
      : null,
    rowCount: document.querySelectorAll('.la-rowlist .la-lrow').length,
    resultLabels: [...document.querySelectorAll('.la-resrow')].map((row) => row.dataset.label ?? ''),
    codeLines: [...document.querySelectorAll('.rc-codecard__line')].map((line) => line.textContent ?? ''),
    warnText: document.querySelector('.rc-warn__text')?.textContent ?? null,
    horizontalOverflow: html.scrollWidth > html.clientWidth,
    documentFitsHeight: html.scrollHeight <= html.clientHeight,
    pageFits: page ? page.getBoundingClientRect().height <= page.clientHeight + 0.5 : null,
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

    const results = [];
    for (const targetConfig of TARGETS) {
      if (targetConfig.hash) {
        await evaluate(client, `location.hash = ${JSON.stringify(targetConfig.hash)}`);
      }
      if (targetConfig.pageId === 'p02') {
        await waitFor(
          client,
          `document.querySelector('.la-page')?.dataset.page === 'p02'`,
          'p02 render',
        );
        if (targetConfig.tab) {
          await evaluate(
            client,
            `(() => {
              const tab = [...document.querySelectorAll('.la-seg .rc-seg__item')]
                .find((item) => item.textContent === ${JSON.stringify(targetConfig.tab)});
              if (!tab) throw new Error('tab missing: ' + ${JSON.stringify(targetConfig.tab)});
              tab.click();
              return true;
            })()`,
          );
          await sleep(180);
        }
      } else {
        await waitFor(
          client,
          `document.querySelector('.la-page')?.dataset.page === '${targetConfig.pageId}'`,
          `${targetConfig.pageId} render`,
        );
        if (targetConfig.pageId === 'p04') {
          await sleep(120);
        }
      }
      await sleep(140);
      const metrics = await evaluate(client, MEASURE_EXPRESSION);
      results.push({ name: targetConfig.name, ...metrics });

      if (targetConfig.screenshot) {
        const screenshot = await client.send('Page.captureScreenshot', {
          format: 'png',
          captureBeyondViewport: false,
        });
        writeFileSync(join(OUT_DIR, targetConfig.screenshot), Buffer.from(screenshot.data, 'base64'));
      }
    }

    const summary = {
      targetCount: results.length,
      horizontalOverflowCount: results.filter((item) => item.horizontalOverflow).length,
      noHorizontalOverflow: results.every((item) => item.horizontalOverflow === false),
      allDocumentsFitHeight: results.every((item) => item.documentFitsHeight === true),
      p02RowCounts: results
        .filter((item) => item.pageId === 'p02')
        .map((item) => ({ name: item.name, rowCount: item.rowCount })),
      p04CodeLines: results
        .filter((item) => item.pageId === 'p04')
        .map((item) => ({ name: item.name, codeLines: item.codeLines })),
    };

    const report = {
      tool: 'chrome-headless-cdp',
      chromeVersion,
      url: URL_TO_TEST,
      viewport: { width: 390, height: 844, deviceScaleFactor: 1, mobile: true },
      results,
      summary,
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
