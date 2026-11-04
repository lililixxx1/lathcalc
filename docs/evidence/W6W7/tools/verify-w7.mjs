#!/usr/bin/env node
/**
 * W7 · 终局验收工装（Chrome headless + CDP），v0.2.0 两段式：
 *
 *   1. a3chain  —— A3：30 秒 v0.2 全链流（WAVE-PLAN-V2 §0）：
 *                  p01 → p02 普通 M 页签**自定义输入 d=30 P=3.5** → p03 断言 27.727/26.211
 *                  → p04 切 G92 断言单行 `G92 X26.211 Z-30. F3.5`（lines=1，G0-B2）
 *                  → 复制程序剪贴板与代码卡逐字符一致（1 行）
 *                  → 方言单点（F1 部分成之替代断言，R1/R2 裁决）：G76 形式切 KND
 *                  断言两行 R50 + 口径注；GSK 在 G76 下禁用；华中在 G92 下禁用+G82 提示。
 *   2. a4shots  —— A4：改动 5 页（p02/p04/p07/p09/p12）390×844 截图。
 *                  默认态用 W5 基准同 hash（可与 v0.1 基准逐元素对拍）；
 *                  另加 v0.2 新态各一张（p02 自定义展开 / p04 KND+G92 / p07 反推 /
 *                  p09 带 f / p12 SSA）供 vision-reader 判定新增 UI。
 *
 * 用法：node docs/evidence/W6W7/tools/verify-w7.mjs <url> <outDir>
 *   CHROME 环境变量可指定浏览器可执行文件；默认 chrome。
 * 输出：stdout JSON（ok_a3 / ok_a4 + 逐跳明细）+ <outDir>/pNN-*.png 截图。
 */
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const URL_TO_TEST = process.argv[2] ?? 'http://localhost:4173/';
const OUT_DIR = process.argv[3] ?? 'docs/evidence/W6W7/runs';
const CHROME = process.env.CHROME ?? 'chrome';
const DEBUG_PORT = Number(process.env.CDP_PORT ?? 9334);
const CHAIN_BUDGET_MS = 30_000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** A4 截图清单：5 页 ×（默认态 = W5 基准同 hash + v0.2 新态） */
const SHOTS = [
  { id: 'p02', name: 'p02-default', hash: '#/p02' },
  { id: 'p02', name: 'p02-custom-open', hash: '#/p02', openCustom: true },
  { id: 'p04', name: 'p04-fanuc-g76', hash: '#/p04?family=metric&spec=M30%20%C3%97%203.5&d=30&p=3.5' },
  { id: 'p04', name: 'p04-knd-g76', hash: '#/p04?family=metric&spec=M30%20%C3%97%203.5&d=30&p=3.5&system=knd' },
  { id: 'p04', name: 'p04-g92', hash: '#/p04?family=metric&spec=M30%20%C3%97%203.5&d=30&p=3.5&cycle=g92' },
  { id: 'p07', name: 'p07-calc', hash: '#/p07' },
  { id: 'p07', name: 'p07-morse', hash: '#/p07?mode=morse&morse=4' },
  { id: 'p07', name: 'p07-reverse', hash: '#/p07?mode=reverse&taperC=0.05194&small=30&length=50' },
  { id: 'p09', name: 'p09-vc', hash: '#/p09?d=50&vc=150' },
  { id: 'p09', name: 'p09-f', hash: '#/p09?d=50&vc=150&f=0.2' },
  { id: 'p12', name: 'p12-sss', hash: '#/p12' },
  { id: 'p12', name: 'p12-ssa', hash: '#/p12?mode=ssa&a=40&c=50&A=36.87' },
];

function startChrome() {
  const profile = mkdtempSync(join(tmpdir(), 'lathcalc-w7-cdp-'));
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

/** 原生 input 赋值 + input 事件（页面监听 input 读取） */
async function setInput(client, inputExpr, value) {
  await evaluate(client, `(() => {
    const input = ${inputExpr};
    if (!input) throw new Error('input not found: ' + ${JSON.stringify(inputExpr)});
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, ${JSON.stringify(value)});
    input.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  })()`);
}

/** —— 段 1：A3 v0.2 全链流（真实点击，逐跳金值断言） —— */
async function a3chain(client) {
  const steps = [];
  const t0 = Date.now();
  const step = async (name, fn) => {
    const started = Date.now();
    const detail = await fn();
    steps.push({ name, ms: Date.now() - started, ...detail });
  };

  await evaluate(client, `localStorage.clear(); location.hash = '#/'; true`);
  await waitFor(client, `!!document.querySelector('.la-page[data-page="p01"]')`, '链流起点 p01');

  await step('p01 点击「螺纹」入口 → p02（普通 M 页签）', async () => {
    await evaluate(client, `document.querySelector('.la-grid2 .la-tile')?.click(); true`);
    await waitFor(client, `document.querySelector('.la-page')?.dataset.page === 'p02'`, 'p02');
    return { ok: true };
  });

  await step('p02 展开自定义规格行 → 输入 d=30 P=3.5 → 计算 → p03', async () => {
    await evaluate(client, `document.querySelector('.rc-p02__customrow')?.click(); true`);
    await waitFor(client, `!!document.querySelector('.rc-p02__custompanel')`, '自定义面板展开');
    const inputs = await evaluate(client, `document.querySelectorAll('.rc-p02__custompanel input').length`);
    if (inputs !== 2) throw new Error(`自定义输入格数期望 2 实得 ${inputs}`);
    await setInput(client, `document.querySelectorAll('.rc-p02__custompanel input')[0]`, '30');
    await setInput(client, `document.querySelectorAll('.rc-p02__custompanel input')[1]`, '3.5');
    await evaluate(client, `document.querySelector('.rc-p02__custompanel .rc-btn')?.click(); true`);
    await waitFor(client, `document.querySelector('.la-page')?.dataset.page === 'p03'`, 'p03');
    return { ok: true };
  });

  await step('p03 金值断言 d2=27.727 / d1=26.211（自定义 Ø30×3.5 同 M30×3.5）', async () => {
    const values = await evaluate(client, `(() => {
      const read = (label) => document.querySelector(
        '.rc-resultcard__row[data-label="' + label + '"]'
      )?.querySelector('.rc-resultcard__value, .rc-resultcard__mono')?.textContent ?? null;
      return { d2: read('中径 d₂'), d1: read('小径 d₁') };
    })()`);
    if (values.d2 !== '27.727' || values.d1 !== '26.211') {
      throw new Error(`p03 金值不符：${JSON.stringify(values)}`);
    }
    return { ok: true, values };
  });

  await step('p03 点击「生成 G76 程序」→ p04', async () => {
    await evaluate(client, `[...document.querySelectorAll('.rc-btn')].find((b) => b.textContent.includes('生成 G76'))?.click(); true`);
    await waitFor(client, `document.querySelector('.la-page')?.dataset.page === 'p04'`, 'p04');
    return { ok: true };
  });

  await step('p04 切「G92 直进循环」→ 单行逐字断言（lines=1，G0-B2）', async () => {
    await evaluate(client, `document.querySelector('.la-seg[aria-label="循环形式"] .rc-seg__item[data-value="g92"]')?.click(); true`);
    await waitFor(client, `[...document.querySelectorAll('.rc-codecard__line')].length === 1`, 'G92 单行');
    const lines = await evaluate(client, `[...document.querySelectorAll('.rc-codecard__line')].map((el) => el.textContent)`);
    if (lines[0] !== 'G92 X26.211 Z-30. F3.5') throw new Error(`G92 行不符：${JSON.stringify(lines)}`);
    return { ok: true, lines };
  });

  await step('复制程序 → 剪贴板与代码卡逐字符一致（1 行）', async () => {
    await evaluate(client, `(() => {
      window.__captured = null;
      const orig = navigator.clipboard.writeText.bind(navigator.clipboard);
      navigator.clipboard.writeText = (t) => { window.__captured = t; return orig(t); };
      return true;
    })()`);
    await evaluate(client, `[...document.querySelectorAll('.rc-btn')].find((b) => b.textContent.includes('复制程序'))?.click(); true`);
    await sleep(150);
    const captured = await evaluate(client, `window.__captured`);
    if (captured !== 'G92 X26.211 Z-30. F3.5') throw new Error(`剪贴板内容不符：${JSON.stringify(captured)}`);
    return { ok: true, captured };
  });

  await step('方言单点 R2：切回 G76 → 点 KND → 两行 R50 + 口径注', async () => {
    await evaluate(client, `document.querySelector('.la-seg[aria-label="循环形式"] .rc-seg__item[data-value="g76"]')?.click(); true`);
    await sleep(150);
    await evaluate(client, `document.querySelector('.la-seg[aria-label="数控系统"] .rc-seg__item[data-value="knd"]')?.click(); true`);
    await waitFor(client, `[...document.querySelectorAll('.rc-codecard__line')].length === 2`, 'KND 两行');
    const lines = await evaluate(client, `[...document.querySelectorAll('.rc-codecard__line')].map((el) => el.textContent)`);
    if (lines[0] !== 'G76 P021060 Q100 R50' || lines[1] !== 'G76 X26.211 Z-30. P1894 Q400 F3.5') {
      throw new Error(`KND 两行不符：${JSON.stringify(lines)}`);
    }
    const note = await evaluate(client, `(document.querySelector('.la-body')?.textContent ?? '').includes('KND-1000T')`);
    if (!note) throw new Error('KND 口径注缺失');
    return { ok: true, lines };
  });

  await step('方言单点 R1/R3：G76 下 GSK 禁用；G92 下华中禁用 + G82 提示', async () => {
    const g76GskDisabled = await evaluate(client, `document.querySelector('.la-seg[aria-label="数控系统"] .rc-seg__item[data-value="gsk"]')?.disabled ?? null`);
    await evaluate(client, `document.querySelector('.la-seg[aria-label="循环形式"] .rc-seg__item[data-value="g92"]')?.click(); true`);
    await sleep(150);
    const g92HncDisabled = await evaluate(client, `document.querySelector('.la-seg[aria-label="数控系统"] .rc-seg__item[data-value="hnc"]')?.disabled ?? null`);
    const g82Hint = await evaluate(client, `(document.querySelector('.rc-p04__sysnote')?.textContent ?? '').includes('G82')`);
    if (!g76GskDisabled || !g92HncDisabled || !g82Hint) {
      throw new Error(`enable 矩阵断言不符：gskG76Disabled=${g76GskDisabled} hncG92Disabled=${g92HncDisabled} g82Hint=${g82Hint}`);
    }
    return { ok: true, g76GskDisabled, g92HncDisabled, g82Hint };
  });

  const elapsedMs = Date.now() - t0;
  return { elapsedMs, budgetMs: CHAIN_BUDGET_MS, ok: elapsedMs < CHAIN_BUDGET_MS, steps };
}

/** —— 段 2：A4 五页截图（默认态 + v0.2 新态） —— */
async function a4shots(client) {
  const results = [];
  for (const target of SHOTS) {
    await navigateHash(client, target.hash);
    await waitFor(client, `document.querySelector('.la-page')?.dataset.page === '${target.id}'`, target.name);
    if (target.openCustom) {
      await evaluate(client, `document.querySelector('.rc-p02__customrow')?.click(); true`);
      await waitFor(client, `!!document.querySelector('.rc-p02__custompanel')`, '自定义面板展开');
    }
    await sleep(160); // 等输入即算与图标渲染稳定
    await screenshot(client, join(OUT_DIR, `${target.name}-390x844.png`));
    results.push({ name: target.name, hash: target.hash });
  }
  return { shots: results, ok: results.length === SHOTS.length };
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const { child, profile } = startChrome();
  let report;
  try {
    const target = await waitForTarget();
    const c = await connect(target.webSocketDebuggerUrl);
    await c.send('Page.enable');
    await c.send('Runtime.enable');
    await c.send('Log.enable');
    // 与 W5 工装同参：390×844 @2x（否则 Windows DPI 129% 缩放下窗口像素 504×748，
    // 与 W5 基准 780×1688 不可比——A4 首轮实测踩坑，2026-11-04 补齐）
    await c.send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
    });
    await evaluate(c, `location.href = ${JSON.stringify(URL_TO_TEST)}; true`);
    await waitFor(c, `!!document.querySelector('.la-page')`, '应用首渲染');

    const a3 = await a3chain(c);
    const a4 = await a4shots(c);

    report = {
      ok_a3: a3.ok,
      ok_a4: a4.ok,
      runtimeExceptions: c.events.exceptions,
      consoleErrors: c.events.consoleErrors,
      a3,
      a4,
      ok_all: a3.ok && a4.ok && c.events.exceptions.length === 0,
    };
    writeFileSync(join(OUT_DIR, 'verify-w7.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ ok_a3: report.ok_a3, ok_a4: report.ok_a4, ok_all: report.ok_all, a3ms: a3.elapsedMs, shots: a4.shots.length, exceptions: c.events.exceptions.length, consoleErrors: c.events.consoleErrors.length }, null, 2));
    c.close();
  } finally {
    child.kill();
    await sleep(600); // Windows: 等 Chrome 进程退出释放 profile 目录锁
    try {
      rmSync(profile, { recursive: true, force: true });
    } catch {
      /* 临时目录锁未释放不阻塞报告（系统临时目录会清理） */
    }
  }
  process.exit(report?.ok_all ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
