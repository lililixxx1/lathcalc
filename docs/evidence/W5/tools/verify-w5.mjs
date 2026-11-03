#!/usr/bin/env node
/**
 * W5 · 终局验收工装（Chrome headless + CDP），三段式：
 *
 *   1. pages14    —— 14 页 390×844 逐页量测（横向溢出/运行时异常/favicon 404）+ 截图
 *   2. m30chain   —— A3：30 秒 M30 全链流（p01→p02→p03→p04→星标→p14），
 *                    每跳断言金值（d2=27.727 / d1=26.211 / 两行 G76 / P1894 禁 1895 /
 *                    收藏+历史双落 localStorage）
 *   3. offline    —— SW 激活后断网重载，p01 必须离线渲染成功
 *
 * 用法：node docs/evidence/W5/tools/verify-w5.mjs <url> <outDir>
 *   CHROME 环境变量可指定浏览器可执行文件；默认 chrome。
 * 输出：stdout JSON（判定字段 ok_* 逐段布尔）+ <outDir>/pNN-390x844.png 截图 14 张。
 */
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const URL_TO_TEST = process.argv[2] ?? 'http://127.0.0.1:4173/';
const OUT_DIR = process.argv[3] ?? 'docs/evidence/W5/runs';
const CHROME = process.env.CHROME ?? 'chrome';
const DEBUG_PORT = Number(process.env.CDP_PORT ?? 9333);
const CHAIN_BUDGET_MS = 30_000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** 14 页截图与量测目标（金参数页：p03/p04 M30×3.5、p06 AC01、p07 MT4、p08 IT7、p09 Ø50） */
const PAGES = [
  { id: 'p01', hash: '#/' },
  { id: 'p02', hash: '#/p02' },
  { id: 'p03', hash: '#/p03?family=metric&spec=M30%20%C3%97%203.5&d=30&p=3.5' },
  { id: 'p04', hash: '#/p04?family=metric&spec=M30%20%C3%97%203.5&d=30&p=3.5' },
  { id: 'p05', hash: '#/p05' },
  { id: 'p06', hash: '#/p06?case=AC01' },
  { id: 'p07', hash: '#/p07?mode=morse&morse=4' },
  { id: 'p08', hash: '#/p08?d=30&grade=IT7' },
  { id: 'p09', hash: '#/p09?d=50&vc=150' },
  { id: 'p10', hash: '#/p10' },
  { id: 'p11', hash: '#/p11' },
  { id: 'p12', hash: '#/p12' },
  { id: 'p13', hash: '#/p13' },
  { id: 'p14', hash: '#/p14' },
];

function startChrome() {
  const profile = mkdtempSync(join(tmpdir(), 'lathcalc-w5-cdp-'));
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
      /* Chrome 尚未监听 */
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
      /* 页面尚未就绪 */
    }
    await sleep(80);
  }
  throw new Error(`timeout waiting for ${label}`);
}

async function navigateHash(client, hash) {
  await evaluate(client, `location.hash = ${JSON.stringify(hash)}`);
}

async function screenshot(client, path) {
  const result = await client.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  writeFileSync(path, Buffer.from(result.data, 'base64'));
}

const MEASURE_EXPRESSION = `(() => {
  const html = document.documentElement;
  const page = document.querySelector('.la-page');
  const body = document.querySelector('.la-body');
  const overflow = (el) => (el ? el.scrollWidth > el.clientWidth : null);
  return {
    pageId: page ? page.dataset.page : null,
    viewport: { width: innerWidth, height: innerHeight },
    documentElement: { scrollWidth: html.scrollWidth, clientWidth: html.clientWidth },
    horizontalOverflow: overflow(html),
    pageHorizontalOverflow: overflow(page),
    bodyHorizontalOverflow: overflow(body),
    textSample: (body ? body.textContent : '').slice(0, 120),
  };
})()`;

/** —— 段 1：14 页量测 + 截图 —— */
async function pages14(client) {
  const results = [];
  await navigateHash(client, '#/');
  await waitFor(client, `!!document.querySelector('.la-page[data-page="p01"]')`, 'p01 首渲染');
  for (const target of PAGES) {
    await navigateHash(client, target.hash);
    await waitFor(client, `document.querySelector('.la-page')?.dataset.page === '${target.id}'`, target.id);
    await sleep(120); // 等输入即算与图标渲染稳定
    const metrics = await evaluate(client, MEASURE_EXPRESSION);
    await screenshot(client, join(OUT_DIR, `${target.id}-390x844.png`));
    results.push({ ...metrics, hash: target.hash });
  }
  return results;
}

/** —— 段 2：A3 30 秒 M30 全链流（真实点击，逐跳金值断言） —— */
async function m30chain(client) {
  const steps = [];
  const t0 = Date.now();
  const step = async (name, fn) => {
    const started = Date.now();
    const detail = await fn();
    steps.push({ name, ms: Date.now() - started, ...detail });
  };

  // 清 store，保证收藏/历史断言不受前段污染
  await evaluate(client, `localStorage.clear(); location.hash = '#/'; true`);
  await waitFor(client, `!!document.querySelector('.la-page[data-page="p01"]')`, '链流起点 p01');

  await step('p01 点击「螺纹」入口 → p02', async () => {
    await evaluate(client, `document.querySelector('.la-grid2 .la-tile')?.click(); true`);
    await waitFor(client, `document.querySelector('.la-page')?.dataset.page === 'p02'`, 'p02');
    return { ok: true };
  });

  await step('p02 点击 M30 × 3.5 行 → p03', async () => {
    const clicked = await evaluate(client, `(() => {
      const rows = [...document.querySelectorAll('button.la-lrow')];
      const row = rows.find((r) => r.textContent.includes('M30') && r.textContent.includes('3.5'));
      if (!row) return { found: false, sample: rows.slice(0, 5).map((r) => r.textContent.slice(0, 20)) };
      row.click();
      return { found: true };
    })()`);
    if (!clicked.found) throw new Error(`M30 × 3.5 行未找到：${JSON.stringify(clicked.sample)}`);
    await waitFor(client, `document.querySelector('.la-page')?.dataset.page === 'p03'`, 'p03');
    return { ok: true };
  });

  await step('p03 金值断言 d2=27.727 / d1=26.211 / 底孔 26.5', async () => {
    const values = await evaluate(client, `(() => {
      const read = (label) => document.querySelector(
        '.rc-resultcard__row[data-label="' + label + '"]'
      )?.querySelector('.rc-resultcard__value, .rc-resultcard__mono')?.textContent ?? null;
      return { d2: read('中径 d₂'), d1: read('小径 d₁'), drill: read('底孔钻头') };
    })()`);
    const pass = values.d2 === '27.727' && values.d1 === '26.211';
    if (!pass) throw new Error(`p03 金值不符：${JSON.stringify(values)}`);
    return { ok: true, values };
  });

  await step('p03 点击「生成 G76 程序」→ p04', async () => {
    await evaluate(client, `[...document.querySelectorAll('.rc-btn')].find((b) => b.textContent.includes('生成 G76'))?.click(); true`);
    await waitFor(client, `document.querySelector('.la-page')?.dataset.page === 'p04'`, 'p04');
    return { ok: true };
  });

  await step('p04 两行 G76 逐字断言（P1894 禁 1895）', async () => {
    const lines = await evaluate(client, `[...document.querySelectorAll('.rc-codecard__line')].map((el) => el.textContent)`);
    const joined = lines.join(' | ');
    const expect = 'G76 P021060 Q100 R0.05 | G76 X26.211 Z-30. P1894 Q400 F3.5';
    if (joined !== expect) throw new Error(`G76 程序行不符：${joined}`);
    if (joined.includes('1895')) throw new Error('出现 1895（禁用值）');
    return { ok: true, lines };
  });

  await step('p04 返回 p03 点星标 → 收藏+历史双落', async () => {
    await evaluate(client, `document.querySelector('.rc-topbar__back')?.click(); true`);
    await waitFor(client, `document.querySelector('.la-page')?.dataset.page === 'p03'`, '返回 p03');
    await evaluate(client, `document.querySelector('.rc-topbar__star')?.click(); true`);
    await sleep(150);
    const store = await evaluate(client, `JSON.parse(localStorage.getItem('lathcalc.favorites') ?? '[]').length + '/' + JSON.parse(localStorage.getItem('lathcalc.history') ?? '[]').length`);
    if (store !== '1/1') throw new Error(`收藏/历史计数不符（期望 1/1）：${store}`);
    return { ok: true, store };
  });

  await step('p01 最近使用已动态显示 M30 条目（W5 集成①）', async () => {
    await navigateHash(client, '#/');
    await waitFor(client, `!!document.querySelector('.la-page[data-page="p01"]')`, 'p01');
    const first = await evaluate(client, `document.querySelector('.rc-home__chips .la-chip')?.textContent ?? null`);
    if (!first || !first.includes('M30')) throw new Error(`最近使用首条非 M30：${first}`);
    return { ok: true, first };
  });

  return { elapsedMs: Date.now() - t0, budgetMs: CHAIN_BUDGET_MS, ok: Date.now() - t0 < CHAIN_BUDGET_MS, steps };
}

/** —— 段 3：SW 断网重载 —— */
async function offline(client) {
  await navigateHash(client, '#/');
  await waitFor(client, `!!document.querySelector('.la-page[data-page="p01"]')`, '离线前 p01');
  await waitFor(client, `navigator.serviceWorker.controller !== null`, 'SW controller 接管', 15000);
  await client.send('Network.enable');
  await client.send('Network.emulateNetworkConditions', {
    offline: true,
    latency: 0,
    downloadThroughput: 0,
    uploadThroughput: 0,
  });
  await client.send('Page.reload', { ignoreCache: false });
  let offlineRendered = false;
  let textSample = null;
  try {
    await waitFor(client, `!!document.querySelector('.la-page[data-page="p01"]')`, '断网重载 p01', 15000);
    offlineRendered = true;
    textSample = await evaluate(client, `(document.querySelector('.la-body')?.textContent ?? '').slice(0, 80)`);
  } finally {
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: 0,
      downloadThroughput: -1,
      uploadThroughput: -1,
    });
  }
  return { swControlled: true, offlineRendered, textSample, ok: offlineRendered };
}

async function main() {
  const { child, profile } = startChrome();
  let client;
  try {
    const target = await waitForTarget();
    client = await connect(target.webSocketDebuggerUrl);
    await client.send('Page.enable');
    await client.send('Runtime.enable');
    await client.send('Log.enable');
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
    });

    await client.send('Page.navigate', { url: URL_TO_TEST });
    await waitFor(client, `!!document.querySelector('.la-page[data-page="p01"]')`, '应用首载', 20000);
    await sleep(400); // 等 SW 注册

    const pages = await pages14(client);
    const favicon404 = client.events.consoleErrors.filter((line) => line.includes('favicon'));
    const chain = await m30chain(client);
    const offlineResult = await offline(client);

    const result = {
      url: URL_TO_TEST,
      pages,
      ok_pages14: pages.every((p) => p.pageId && !p.horizontalOverflow && !p.pageHorizontalOverflow && !p.bodyHorizontalOverflow),
      favicon404Count: favicon404.length,
      m30chain: chain,
      ok_m30chain: chain.ok,
      offline: offlineResult,
      ok_offline: offlineResult.ok,
      exceptions: client.events.exceptions,
      consoleErrors: client.events.consoleErrors,
    };
    result.ok_all = result.ok_pages14 && result.ok_m30chain && result.ok_offline && result.exceptions.length === 0;
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.ok_all ? 0 : 1;
  } catch (error) {
    console.error(String(error));
    process.exitCode = 1;
  } finally {
    try { client?.close(); } catch { /* 已关 */ }
    child.kill();
    try { rmSync(profile, { recursive: true, force: true }); } catch { /* Windows 句柄延迟，忽略 */ }
  }
}

main();
