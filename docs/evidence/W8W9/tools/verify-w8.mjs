#!/usr/bin/env node
/**
 * W8W9 · 终局验收工装（Chrome headless + CDP），v0.2.1 两段式：
 *
 *   1. a3chain  —— A3：30 秒 v0.2.1 链流（WAVE-PLAN-V3 §0 A3）：
 *                  p02 切「密封管 R」页签选 R1/16 → p03 断言基面值 7.142/6.561 + 「基准平面」标注
 *                  → 回 p02 切「蜗杆」选 m2 → p03 断言 px=6.283 / h₁=4.4 / 无三针卡
 *                  → p04 带 M30×3.5 切 GSK 断言 988TA 两行（mm 小数）→ 切 980TDc 断言增量两行
 *                  → HNC 切直进循环断言 G82 单行 + 分刀行注
 *                  → p08 输入 Ø30 点 H7/g6 断言配合卡 +7 … +41 μm（clearance）。
 *   2. a4shots  —— A4：改动五页（p02/p03/p04/p08/p13）390×844 截图（新族/型号/G82/配合/速查态）。
 *
 * 用法：node docs/evidence/W8W9/tools/verify-w8.mjs <url> <outDir>
 *   CHROME 环境变量可指定浏览器可执行文件；默认 chrome。
 * 输出：stdout JSON（ok_a3 / ok_a4 + 逐跳明细）+ <outDir>/pNN-*.png + verify-w8.json。
 *
 * 工装沿革：verify-w5 → verify-w7（Emulation.setDeviceMetricsOverride 390×844@2x 必带，
 * Windows DPI 129% 伪影教训 V2-A4-P1，本版原样保留）→ 本版扩七族/GSK 型号/G82/配合链。
 */
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const URL_TO_TEST = process.argv[2] ?? 'http://localhost:4173/';
const OUT_DIR = process.argv[3] ?? 'docs/evidence/W8W9/runs';
const CHROME = process.env.CHROME ?? 'chrome';
const DEBUG_PORT = Number(process.env.CDP_PORT ?? 9336);
const CHAIN_BUDGET_MS = 30_000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const P4 = '#/p04?family=metric&spec=M30%20%C3%97%203.5&d=30&p=3.5';

/** A4 截图清单：五页新态（v0.2.1 改动面） */
const SHOTS = [
  { id: 'p02', name: 'p02-seven-tabs', hash: '#/p02' },
  { id: 'p02', name: 'p02-sealpipe', hash: '#/p02', p02tab: 'sealpipe' },
  { id: 'p02', name: 'p02-worm', hash: '#/p02', p02tab: 'worm' },
  { id: 'p03', name: 'p03-sealpipe-r116', hash: '#/p03?family=sealpipe&spec=R1%2F16&d=7.723&p=0.907' },
  { id: 'p03', name: 'p03-worm-m2', hash: '#/p03?family=worm&spec=m2&d=2&p=2' },
  { id: 'p04', name: 'p04-gsk-988ta', hash: `${P4}&system=gsk` },
  { id: 'p04', name: 'p04-gsk-980tdc', hash: `${P4}&system=gsk&gskmodel=980tdc` },
  { id: 'p04', name: 'p04-hnc-g82', hash: `${P4}&system=hnc&cycle=g92` },
  { id: 'p08', name: 'p08-fit-h7g6', hash: '#/p08', fit: { nominal: '30', chip: 'H7/g6' } },
  { id: 'p13', name: 'p13-drill', hash: '#/p13', tab: 'drill' },
  { id: 'p13', name: 'p13-hardness', hash: '#/p13', tab: 'hardness' },
];

function startChrome() {
  const profile = mkdtempSync(join(tmpdir(), 'lathcalc-w8-cdp-'));
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

/** p03 结果卡取值：data-label 行的 value 文本 */
const P3_READ = `(() => {
  const read = (label) => document.querySelector(
    '.rc-resultcard__row[data-label="' + label + '"]'
  )?.querySelector('.rc-resultcard__value, .rc-resultcard__mono')?.textContent ?? null;
  return read;
})()`;

/** —— 段 1：A3 v0.2.1 链流（真实点击，逐跳金值断言） —— */
async function a3chain(client) {
  const steps = [];
  const t0 = Date.now();
  const step = async (name, fn) => {
    const started = Date.now();
    const detail = await fn();
    steps.push({ name, ms: Date.now() - started, ...detail });
  };

  await evaluate(client, `localStorage.clear(); location.hash = '#/p02'; true`);
  await waitFor(client, `document.querySelector('.la-page')?.dataset.page === 'p02'`, 'p02');

  await step('p02 切「密封管 R」页签 → 点 R1/16 行 → p03', async () => {
    await waitFor(client, `!!document.querySelector('.la-seg[aria-label="螺纹制式"] .rc-seg__item[data-value="sealpipe"]')`, '七族页签');
    await evaluate(client, `document.querySelector('.la-seg[aria-label="螺纹制式"] .rc-seg__item[data-value="sealpipe"]')?.click(); true`);
    await waitFor(client, `[...document.querySelectorAll('.la-lrow')].some((b) => b.textContent.trim().startsWith('R1/16'))`, 'R1/16 行渲染');
    await evaluate(client, `[...document.querySelectorAll('.la-lrow')].find((b) => b.textContent.trim().startsWith('R1/16'))?.click(); true`);
    await waitFor(client, `document.querySelector('.la-page')?.dataset.page === 'p03'`, 'p03');
    return { ok: true };
  });

  await step('p03 断言基面值 d₂=7.142 / d₁=6.561 + 「基准平面」标注', async () => {
    const values = await evaluate(client, `(() => {
      const read = (label) => document.querySelector(
        '.rc-resultcard__row[data-label="' + label + '"]'
      )?.querySelector('.rc-resultcard__value, .rc-resultcard__mono')?.textContent ?? null;
      return { d2: read('中径 d₂'), d1: read('小径 d₁') };
    })()`);
    if (values.d2 !== '7.142' || values.d1 !== '6.561') {
      throw new Error(`p03 基面金值不符：${JSON.stringify(values)}`);
    }
    const datumNote = await evaluate(client, `(document.querySelector('.la-body')?.textContent ?? '').includes('基准平面')`);
    if (!datumNote) throw new Error('锥管「基准平面」标注缺失');
    return { ok: true, values };
  });

  await step('回 p02 切「蜗杆」→ 点 m2 行 → p03', async () => {
    await navigateHash(client, '#/p02');
    await waitFor(client, `[...document.querySelectorAll('.la-lrow')].some((b) => b.textContent.trim().startsWith('M1 '))`, 'p02 行渲染');
    await evaluate(client, `document.querySelector('.la-seg[aria-label="螺纹制式"] .rc-seg__item[data-value="worm"]')?.click(); true`);
    await waitFor(client, `[...document.querySelectorAll('.la-lrow')].some((b) => (b.getAttribute('aria-label') ?? '').startsWith('m2，'))`, '蜗杆 m2 行渲染');
    await evaluate(client, `[...document.querySelectorAll('.la-lrow')].find((b) => (b.getAttribute('aria-label') ?? '').startsWith('m2，'))?.click(); true`);
    await waitFor(client, `document.querySelector('.la-page')?.dataset.page === 'p03'`, 'p03');
    return { ok: true };
  });

  await step('p03 断言蜗杆 px=6.283 / h₁=4.4 / 无三针卡', async () => {
    const values = await evaluate(client, `(() => {
      const read = (label) => document.querySelector(
        '.rc-resultcard__row[data-label="' + label + '"]'
      )?.querySelector('.rc-resultcard__value, .rc-resultcard__mono')?.textContent ?? null;
      return { px: read('轴向齿距 px'), h1: read('全齿高 h₁') };
    })()`);
    if (values.px !== '6.283' || values.h1 !== '4.400') {
      throw new Error(`蜗杆金值不符：${JSON.stringify(values)}`);
    }
    const threeWireGone = await evaluate(client, `!(document.querySelector('.la-body')?.textContent ?? '').includes('三针')`);
    if (!threeWireGone) throw new Error('蜗杆态不应出现三针行（V3-2）');
    return { ok: true, values };
  });

  await step('p04 带 M30×3.5 → 切 GSK → 988TA 默认两行（mm 小数）', async () => {
    await navigateHash(client, P4);
    await waitFor(client, `document.querySelector('.la-page')?.dataset.page === 'p04'`, 'p04');
    await evaluate(client, `document.querySelector('.la-seg[aria-label="数控系统"] .rc-seg__item[data-value="gsk"]')?.click(); true`);
    await waitFor(client, `!!document.querySelector('.la-seg[aria-label="GSK 型号"]')`, 'GSK 型号页签出现');
    const lines = await evaluate(client, `[...document.querySelectorAll('.rc-codecard__line')].map((el) => el.textContent)`);
    if (lines[0] !== 'G76 P021060 Q0.1 R0.05' || lines[1] !== 'G76 X26.211 Z-30. P1.894 Q0.4 F3.5') {
      throw new Error(`988TA 两行不符：${JSON.stringify(lines)}`);
    }
    return { ok: true, lines };
  });

  await step('切 980TDc → 增量两行（Q1000 / P18944 Q4000）', async () => {
    await evaluate(client, `document.querySelector('.la-seg[aria-label="GSK 型号"] .rc-seg__item[data-value="980tdc"]')?.click(); true`);
    await waitFor(client, `[...document.querySelectorAll('.rc-codecard__line')].some((el) => el.textContent.includes('P18944'))`, '980TDc 渲染');
    const lines = await evaluate(client, `[...document.querySelectorAll('.rc-codecard__line')].map((el) => el.textContent)`);
    if (lines[0] !== 'G76 P021060 Q1000 R0.05' || lines[1] !== 'G76 X26.211 Z-30. P18944 Q4000 F3.5') {
      throw new Error(`980TDc 两行不符：${JSON.stringify(lines)}`);
    }
    const note = await evaluate(client, `(document.querySelector('.la-body')?.textContent ?? '').includes('0.0001mm')`);
    if (!note) throw new Error('980TDc 口径注缺失');
    return { ok: true, lines };
  });

  await step('切 HNC + 直进循环 → G82 单行 + 分刀行注', async () => {
    await evaluate(client, `document.querySelector('.la-seg[aria-label="数控系统"] .rc-seg__item[data-value="hnc"]')?.click(); true`);
    await sleep(150);
    await evaluate(client, `document.querySelector('.la-seg[aria-label="循环形式"] .rc-seg__item[data-value="g92"]')?.click(); true`);
    await waitFor(client, `[...document.querySelectorAll('.rc-codecard__line')].length === 1`, 'G82 单行');
    const lines = await evaluate(client, `[...document.querySelectorAll('.rc-codecard__line')].map((el) => el.textContent)`);
    if (lines[0] !== 'G82 X26.211 Z-30. I0 R0 E0 C1 P0 F3.5') {
      throw new Error(`G82 行不符：${JSON.stringify(lines)}`);
    }
    const rowNote = await evaluate(client, `(document.querySelector('.la-body')?.textContent ?? '').includes('分刀')`);
    if (!rowNote) throw new Error('G82 分刀行注缺失');
    return { ok: true, lines };
  });

  await step('p08 输入 Ø30 → 点 H7/g6 → 配合卡 +7 … +41 μm（clearance）', async () => {
    await navigateHash(client, '#/p08');
    await waitFor(client, `!!document.querySelector('input[name="nominal"]')`, 'p08 尺寸输入');
    await setInput(client, `document.querySelector('input[name="nominal"]')`, '30');
    await sleep(150);
    await evaluate(client, `[...document.querySelectorAll('.rc-p08__preset')].find((b) => b.textContent.includes('H7/g6'))?.click(); true`);
    await waitFor(client, `!!document.querySelector('.rc-p08__fitcard')`, '配合卡渲染');
    const fit = await evaluate(client, `(() => {
      const card = document.querySelector('.rc-p08__fitcard');
      const row = card?.querySelector('.rc-resultcard__row[data-label="配合 Xmin–Xmax"]');
      return {
        head: card?.querySelector('.la-eyebrow')?.textContent ?? null,
        range: row?.querySelector('.rc-resultcard__value, .rc-resultcard__mono')?.textContent ?? null,
      };
    })()`);
    if (fit.head !== '配合实算 Ø30 H7/g6' || fit.range !== '+7 … +41') {
      throw new Error(`配合卡不符：${JSON.stringify(fit)}`);
    }
    const badge = await evaluate(client, `document.querySelector('.rc-p08__fitcard .rc-badge')?.textContent ?? document.querySelector('.rc-p08__fitcard [class*="badge"]')?.textContent ?? ''`);
    if (!badge.includes('间隙')) throw new Error(`配合类别徽标不符：${JSON.stringify(badge)}`);
    return { ok: true, fit, badge };
  });

  const elapsedMs = Date.now() - t0;
  return { elapsedMs, budgetMs: CHAIN_BUDGET_MS, ok: elapsedMs < CHAIN_BUDGET_MS, steps };
}

/** —— 段 2：A4 五页截图（v0.2.1 新态） —— */
async function a4shots(client) {
  const results = [];
  for (const target of SHOTS) {
    await navigateHash(client, target.hash);
    await waitFor(client, `document.querySelector('.la-page')?.dataset.page === '${target.id}'`, target.name);
    if (target.fit) {
      await setInput(client, `document.querySelector('input[name="nominal"]')`, target.fit.nominal);
      await sleep(150);
      await evaluate(client, `[...document.querySelectorAll('.rc-p08__preset')].find((b) => b.textContent.includes(${JSON.stringify(target.fit.chip)}))?.click(); true`);
      await waitFor(client, `!!document.querySelector('.rc-p08__fitcard')`, `${target.name} 配合卡`);
    }
    if (target.p02tab) {
      await evaluate(client, `document.querySelector('.la-seg[aria-label="螺纹制式"] .rc-seg__item[data-value="${target.p02tab}"]')?.click(); true`);
      await sleep(150);
    }
    if (target.tab) {
      await evaluate(client, `document.querySelector('.la-seg[aria-label="速查分类"] .rc-seg__item[data-value="${target.tab}"]')?.click(); true`);
      await sleep(150);
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
    // 与 W5/W7 工装同参：390×844 @2x 必带（Windows DPI 129% 伪影教训 V2-A4-P1，原样保留）
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
    writeFileSync(join(OUT_DIR, 'verify-w8.json'), JSON.stringify(report, null, 2));
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
