#!/usr/bin/env node
/**
 * W4-C3 · p05 / p06 390×844 布局量测（Chrome headless + CDP，零第三方依赖）
 *
 * 用法：
 *   node docs/evidence/W4-C3/tools/measure-390-c3.mjs <url> [outDir]
 *   CHROME 环境变量可指定 Chrome/Edge 可执行文件；默认 "chrome"（PATH）。
 *
 * 判定（脚本计算，不手填）：
 *   - 14 页 documentElement.scrollWidth <= clientWidth（390）→ 无横向滚动
 *   - p05：12 卡全部在 390 内；网格两列；切点橙点存在
 *   - p06：body 内容不溢出 844（scrollHeight <= clientHeight）且最后子块在 body 内
 *   - p06 后刀架切换后仍无横向溢出
 *   - 截图：p05 / p06（前刀架）/ p06（后刀架）/ p06（空参数选择器）
 */

import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const URL_TO_TEST =
  process.argv[2] ?? 'http://127.0.0.1:5199/docs/evidence/W4-C3/tools/harness.html';
const OUT_DIR = process.argv[3] ?? 'docs/evidence/W4-C3/runs';
const CHROME = process.env.CHROME ?? 'chrome';
const DEBUG_PORT = Number(process.env.CDP_PORT ?? 9333);
const PAGE_IDS = Array.from({ length: 14 }, (_, index) => `p${String(index + 1).padStart(2, '0')}`);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function startChrome() {
  const profile = mkdtempSync(join(tmpdir(), 'lathcalc-c3-cdp-'));
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
  const page = document.querySelector('.la-page');
  const body = document.querySelector('.la-body');
  const rect = (element) => {
    if (!element) return null;
    const r = element.getBoundingClientRect();
    return {
      x: Math.round(r.x * 10) / 10,
      y: Math.round(r.y * 10) / 10,
      width: Math.round(r.width * 10) / 10,
      height: Math.round(r.height * 10) / 10,
      right: Math.round(r.right * 10) / 10,
      bottom: Math.round(r.bottom * 10) / 10,
    };
  };
  const style = (element, prop) => (element ? getComputedStyle(element)[prop] : null);
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
    documentBody: { scrollWidth: document.body.scrollWidth, clientWidth: document.body.clientWidth },
    page: rect(page),
    body: rect(body),
    bodyScroll: body
      ? {
          scrollWidth: body.scrollWidth,
          clientWidth: body.clientWidth,
          scrollHeight: body.scrollHeight,
          clientHeight: body.clientHeight,
          overflowX: style(body, 'overflowX'),
          overflowY: style(body, 'overflowY'),
        }
      : null,
    pageOverflow: style(page, 'overflow'),
    horizontalOverflow: html.scrollWidth > html.clientWidth,
    verticalOverflow: html.scrollHeight > html.clientHeight,
  };
})()`;

const P05_DETAIL_EXPRESSION = `(() => {
  const grid = document.querySelector('.rc-p05__body .la-grid2');
  const tiles = Array.from(document.querySelectorAll('.rc-p05__body .rc-tile--compact'));
  const rect = (element) => {
    if (!element) return null;
    const r = element.getBoundingClientRect();
    return {
      x: Math.round(r.x * 10) / 10,
      y: Math.round(r.y * 10) / 10,
      width: Math.round(r.width * 10) / 10,
      height: Math.round(r.height * 10) / 10,
      right: Math.round(r.right * 10) / 10,
      bottom: Math.round(r.bottom * 10) / 10,
    };
  };
  return {
    grid: rect(grid),
    gridColumns: grid ? getComputedStyle(grid).gridTemplateColumns : null,
    tileCount: tiles.length,
    tileHeights: tiles.map((tile) => Math.round(tile.getBoundingClientRect().height * 10) / 10),
    tileMinWidth: tiles.length ? Math.min(...tiles.map((tile) => tile.getBoundingClientRect().width)) : null,
    tileMaxRight: tiles.length ? Math.max(...tiles.map((tile) => tile.getBoundingClientRect().right)) : null,
    anchorLines: tiles.map((tile) => tile.querySelector('.rc-p05__anchor')?.textContent ?? null),
    accentDots: document.querySelectorAll('.rc-p05__body circle[fill="var(--la-accent)"]').length,
  };
})()`;

const P06_DETAIL_EXPRESSION = `(() => {
  const body = document.querySelector('.la-body');
  const children = body ? Array.from(body.children) : [];
  const rect = (element) => {
    if (!element) return null;
    const r = element.getBoundingClientRect();
    return {
      x: Math.round(r.x * 10) / 10,
      y: Math.round(r.y * 10) / 10,
      width: Math.round(r.width * 10) / 10,
      height: Math.round(r.height * 10) / 10,
      right: Math.round(r.right * 10) / 10,
      bottom: Math.round(r.bottom * 10) / 10,
    };
  };
  const bodyRect = body ? body.getBoundingClientRect() : null;
  const bottoms = children.map((child) => child.getBoundingClientRect().bottom);
  const lastChildBottom = bottoms.length ? Math.round(Math.max(...bottoms) * 10) / 10 : null;
  const basisRow = Array.from(document.querySelectorAll('.rc-resultcard__row')).find(
    (row) => row.dataset.label === '判向依据',
  );
  return {
    body: bodyRect
      ? {
          top: Math.round(bodyRect.top * 10) / 10,
          bottom: Math.round(bodyRect.bottom * 10) / 10,
          clientHeight: body.clientHeight,
          scrollHeight: body.scrollHeight,
        }
      : null,
    childCount: children.length,
    lastChildBottom,
    contentInsideBody:
      bodyRect && lastChildBottom !== null ? lastChildBottom <= bodyRect.bottom + 0.5 : null,
    bodyContentOverflow: body ? body.scrollHeight > body.clientHeight + 1 : null,
    rects: {
      diagram: rect(document.querySelector('.la-card.rc-p06__diagram-card')),
      form: rect(document.querySelector('.rc-p06__form')),
      result: rect(document.querySelector('.rc-p06__result')),
      code: rect(document.querySelector('.rc-codecard')),
      toolbar: rect(document.querySelector('.rc-p06__toolbar')),
      accordion: rect(document.querySelector('.rc-acc')),
    },
    inputCount: document.querySelectorAll('.rc-p06__form .rc-input').length,
    inputNames: Array.from(document.querySelectorAll('.rc-p06__form input')).map((input) => input.name),
    codeLine: document.querySelector('.rc-codecard__line')?.textContent ?? null,
    basis: basisRow?.querySelector('.rc-resultcard__mono')?.textContent ?? null,
    rearOn:
      document.querySelector('.rc-p06__toolbar .rc-seg__item[data-value="rear"]')?.classList.contains('on') ??
      null,
    diagramSvg: Boolean(document.querySelector('.rc-p06__diagram svg')),
  };
})()`;

const P06_PICKER_EXPRESSION = `(() => {
  const picker = document.querySelector('.rc-p06__picker');
  return {
    picker: picker
      ? {
          width: Math.round(picker.getBoundingClientRect().width * 10) / 10,
          height: Math.round(picker.getBoundingClientRect().height * 10) / 10,
        }
      : null,
    chipCount: document.querySelectorAll('.rc-p06__picker .rc-chip').length,
    chipLabels: Array.from(document.querySelectorAll('.rc-p06__picker .rc-chip')).map(
      (chip) => chip.textContent,
    ),
    codeCard: Boolean(document.querySelector('.rc-codecard')),
  };
})()`;

async function capture(client, path) {
  const screenshot = await client.send('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: false,
  });
  writeFileSync(path, Buffer.from(screenshot.data, 'base64'));
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
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
      pages.push(await evaluate(client, MEASURE_EXPRESSION));
    }

    await evaluate(client, `location.hash = '#/p05'`);
    await waitFor(client, `document.querySelector('.la-page')?.dataset.page === 'p05'`, 'p05');
    await sleep(150);
    const p05Detail = await evaluate(client, P05_DETAIL_EXPRESSION);
    await capture(client, join(OUT_DIR, 'p05-390x844.png'));

    await evaluate(client, `location.hash = '#/p06?case=AC01'`);
    await waitFor(client, `document.querySelector('.la-page')?.dataset.page === 'p06'`, 'p06');
    await waitFor(client, `Boolean(document.querySelector('.rc-codecard__line'))`, 'p06 result');
    await sleep(150);
    const p06Detail = await evaluate(client, P06_DETAIL_EXPRESSION);
    await capture(client, join(OUT_DIR, 'p06-390x844.png'));

    await evaluate(
      client,
      `document.querySelector('.rc-p06__toolbar .rc-seg__item[data-value="rear"]')?.click()`,
    );
    await sleep(120);
    const p06RearDetail = await evaluate(client, P06_DETAIL_EXPRESSION);
    await capture(client, join(OUT_DIR, 'p06-rear-390x844.png'));

    await evaluate(client, `location.hash = '#/p06'`);
    await waitFor(
      client,
      `Boolean(document.querySelector('.rc-p06__picker'))`,
      'p06 picker',
    );
    await sleep(150);
    const p06PickerDetail = await evaluate(client, P06_PICKER_EXPRESSION);
    await capture(client, join(OUT_DIR, 'p06-picker-390x844.png'));

    const p05Page = pages.find((page) => page.pageId === 'p05');
    const p06Page = pages.find((page) => page.pageId === 'p06');
    const summary = {
      allPagesNoHorizontalOverflow: pages.every((page) => page.horizontalOverflow === false),
      p05NoHorizontalOverflow: p05Page ? p05Page.horizontalOverflow === false : false,
      p06NoHorizontalOverflow: p06Page ? p06Page.horizontalOverflow === false : false,
      p05DetailNoHorizontalOverflow:
        p05Detail.tileMaxRight !== null && p05Detail.tileMaxRight <= 390,
      p06ContentFits:
        p06Detail.contentInsideBody === true && p06Detail.bodyContentOverflow === false,
      p06RearNoHorizontalOverflow: p06RearDetail.bodyContentOverflow === false,
      p06PickerNoHorizontalOverflow: p06PickerDetail.picker !== null,
    };
    const judgmentLines = [
      `allPagesNoHorizontalOverflow=${summary.allPagesNoHorizontalOverflow}`,
      `p05NoHorizontalOverflow=${summary.p05NoHorizontalOverflow}`,
      `p06NoHorizontalOverflow=${summary.p06NoHorizontalOverflow}`,
      `p05DetailNoHorizontalOverflow=${summary.p05DetailNoHorizontalOverflow} (tileMaxRight=${p05Detail.tileMaxRight})`,
      `p06ContentFits=${summary.p06ContentFits} (body scrollHeight=${p06Detail.body?.scrollHeight}, clientHeight=${p06Detail.body?.clientHeight}, lastChildBottom=${p06Detail.lastChildBottom})`,
      `p06RearNoHorizontalOverflow=${summary.p06RearNoHorizontalOverflow}`,
      `p06PickerChips=${p06PickerDetail.chipCount}`,
      `p05AccentDots=${p05Detail.accentDots}`,
    ];
    const ok =
      summary.allPagesNoHorizontalOverflow &&
      summary.p05NoHorizontalOverflow &&
      summary.p06NoHorizontalOverflow &&
      summary.p05DetailNoHorizontalOverflow &&
      summary.p06ContentFits &&
      summary.p06RearNoHorizontalOverflow;

    const report = {
      tool: 'chrome-headless-cdp',
      chromeVersion,
      url: URL_TO_TEST,
      viewport: { width: 390, height: 844, deviceScaleFactor: 1, mobile: true },
      pages,
      p05Detail,
      p06Detail,
      p06RearDetail,
      p06PickerDetail,
      summary,
      judgmentLines,
      exceptions: client.events.exceptions,
      consoleErrors: client.events.consoleErrors,
      screenshots: [
        'docs/evidence/W4-C3/runs/p05-390x844.png',
        'docs/evidence/W4-C3/runs/p06-390x844.png',
        'docs/evidence/W4-C3/runs/p06-rear-390x844.png',
        'docs/evidence/W4-C3/runs/p06-picker-390x844.png',
      ],
    };
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    process.exitCode = ok ? 0 : 1;
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
      // Windows 上 Chrome 子进程可能短暂占用 profile
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
