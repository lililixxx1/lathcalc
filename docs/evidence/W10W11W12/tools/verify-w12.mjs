#!/usr/bin/env node
/**
 * W12 · v0.3 终局验收工装（Chrome headless + CDP），两段式：
 *
 *   1. a3chain  —— A3：30 秒链流。v0.2.1 八跳原样回归（verify-w8 沿革）+ v0.3 四新跳：
 *                  p04 锥管族 R1/16（L 默认 9.6）断言行2 逐字符 `G76 X6.561 Z-9.6 R-0.3 P581 Q200 F0.907`
 *                  → p08 Ø600 H7/g6 断言 >500 段配合卡 +22 … +136（W10-A 解锁）
 *                  → p15 宏程序库断言四模板 chip + 椭圆宏行 `WHILE [#4 LT #5] DO1` / `#6=2*#1*COS[#4]`（W11-A）
 *                  → p16 挂轮断言默认 8 行结果 + top1 精确徽标；URL ?p=3.175&t=12 断 top1 20/55 / 455.52 ppm（W11-B）。
 *   2. a4shots  —— A4：v0.3 改动面五截图（p04 锥管态 / p08 >500 配合 / p15 椭圆+油槽 / p16 默认表）。
 *
 * 用法：node docs/evidence/W10W11W12/tools/verify-w12.mjs <url> <outDir>
 *   CHROME 环境变量可指定浏览器可执行文件；默认 chrome。
 * 输出：stdout JSON（ok_a3 / ok_a4 + 逐跳明细）+ <outDir>/pNN-*.png + verify-w12.json。
 *
 * 工装沿革：verify-w5 → verify-w7（Emulation.setDeviceMetricsOverride 390×844@2x 必带，
 * Windows DPI 129% 伪影教训 V2-A4-P1）→ verify-w8（七族/GSK 型号/G82/配合）→ 本版扩锥度位/IT>500/p15/p16。
 */
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const URL_TO_TEST = process.argv[2] ?? 'http://localhost:4173/';
const OUT_DIR = process.argv[3] ?? 'docs/evidence/W10W11W12/runs';
const CHROME = process.env.CHROME ?? 'chrome';
const DEBUG_PORT = Number(process.env.CDP_PORT ?? 9346);
const CHAIN_BUDGET_MS = 30_000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const P4 = '#/p04?family=metric&spec=M30%20%C3%97%203.5&d=30&p=3.5';
/** R1/16 锥管态（p=25.4/28 全精度直传；l 缺省 9.6、首刀 0.2 由锥管态自动取——W10-C） */
const P4_TAPER = '#/p04?family=sealpipe&spec=R1%2F16&d=7.723&p=0.9071428571428571';

/** A4 截图清单（v0.3 改动面五态；v0.2.1 十一图见 W8W9 档不重拍） */
const SHOTS = [
  { id: 'p04', name: 'p04-taper-fanuc', hash: P4_TAPER },
  { id: 'p04', name: 'p04-taper-knd', hash: `${P4_TAPER}&system=knd` },
  { id: 'p08', name: 'p08-fit-600', hash: '#/p08', fit: { nominal: '600', chip: 'H7/g6' } },
  { id: 'p15', name: 'p15-macro-ellipse', hash: '#/p15?tpl=ellipse' },
  { id: 'p15', name: 'p15-macro-oilslot', hash: '#/p15?tpl=oilslot' },
  { id: 'p16', name: 'p16-gear-default', hash: '#/p16' },
  { id: 'p16', name: 'p16-gear-imperial', hash: '#/p16?p=3.175&t=12' },
];

function startChrome() {
  const profile = mkdtempSync(join(tmpdir(), 'lathcalc-w12-cdp-'));
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

const codeLines = () => `[...document.querySelectorAll('.rc-codecard__line')].map((el) => el.textContent)`;

/** —— 段 1：A3 链流（v0.2.1 八跳回归 + v0.3 四新跳，真实点击，逐跳金值断言） —— */
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
    const lines = await evaluate(client, codeLines());
    if (lines[0] !== 'G76 P021060 Q0.1 R0.05' || lines[1] !== 'G76 X26.211 Z-30. P1.894 Q0.4 F3.5') {
      throw new Error(`988TA 两行不符：${JSON.stringify(lines)}`);
    }
    return { ok: true, lines };
  });

  await step('切 980TDc → 增量两行（Q1000 / P18944 Q4000）', async () => {
    await evaluate(client, `document.querySelector('.la-seg[aria-label="GSK 型号"] .rc-seg__item[data-value="980tdc"]')?.click(); true`);
    await waitFor(client, `[...document.querySelectorAll('.rc-codecard__line')].some((el) => el.textContent.includes('P18944'))`, '980TDc 渲染');
    const lines = await evaluate(client, codeLines());
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
    const lines = await evaluate(client, codeLines());
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

  // ===== v0.3 四新跳 =====

  await step('v0.3 p04 锥管族 R1/16（L 缺省 9.6）→ FANUC 行2 逐字符 R-0.3 P581 Q200', async () => {
    await navigateHash(client, P4_TAPER);
    await waitFor(client, `document.querySelector('.la-page')?.dataset.page === 'p04'`, 'p04 锥管态');
    await waitFor(client, `[...document.querySelectorAll('.rc-codecard__line')].some((el) => el.textContent.includes('R-0.3'))`, '锥度位渲染');
    const lines = await evaluate(client, codeLines());
    if (lines[1] !== 'G76 X6.561 Z-9.6 R-0.3 P581 Q200 F0.907') {
      throw new Error(`锥管 FANUC 行2 不符：${JSON.stringify(lines)}`);
    }
    const note = await evaluate(client, `(document.querySelector('.la-body')?.textContent ?? '').includes('−L/32')`);
    if (!note) throw new Error('锥度推导式口径注缺失');
    return { ok: true, lines };
  });

  await step('v0.3 p04 锥管切 KND → R-300 整数μ（0.001mm 口径）', async () => {
    await evaluate(client, `document.querySelector('.la-seg[aria-label="数控系统"] .rc-seg__item[data-value="knd"]')?.click(); true`);
    await waitFor(client, `[...document.querySelectorAll('.rc-codecard__line')].some((el) => el.textContent.includes('R-300'))`, 'KND R-300 渲染');
    const lines = await evaluate(client, codeLines());
    if (lines[1] !== 'G76 X6.561 Z-9.6 R-300 P581 Q200 F0.907') {
      throw new Error(`锥管 KND 行2 不符：${JSON.stringify(lines)}`);
    }
    return { ok: true, lines };
  });

  await step('v0.3 p08 Ø600 → H7/g6 → >500 段配合卡 +22 … +136（W10-A 解锁）', async () => {
    await navigateHash(client, '#/p08');
    await waitFor(client, `!!document.querySelector('input[name="nominal"]')`, 'p08 尺寸输入');
    await setInput(client, `document.querySelector('input[name="nominal"]')`, '600');
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
    // Ø600 落 (500,630]：IT7=70、IT6=44、g=−22 → ei=−66；Xmin=+22、Xmax=+136（V4 §2 W10-A 金值组）
    if (fit.head !== '配合实算 Ø600 H7/g6' || fit.range !== '+22 … +136') {
      throw new Error(`>500 配合卡不符：${JSON.stringify(fit)}`);
    }
    return { ok: true, fit };
  });

  await step('v0.3 p15 宏程序库 → 四模板 chip + 椭圆宏行（W11-A）', async () => {
    await navigateHash(client, '#/p15?tpl=ellipse');
    await waitFor(client, `document.querySelector('.la-page')?.dataset.page === 'p15'`, 'p15');
    const seg = await evaluate(client, `[...document.querySelectorAll('.la-seg .rc-seg__item')].map((el) => el.textContent.trim())`);
    if (!seg.includes('椭圆') || !seg.includes('网纹') || !seg.includes('油槽') || !seg.includes('切槽')) {
      throw new Error(`p15 四模板 chip 不符：${JSON.stringify(seg)}`);
    }
    await waitFor(client, `[...document.querySelectorAll('.rc-codecard__line')].some((el) => el.textContent.includes('WHILE'))`, '宏行渲染');
    const lines = await evaluate(client, codeLines());
    const joined = lines.join('\\n');
    if (!joined.includes('WHILE [#4 LT #5] DO1') || !joined.includes('#6=2*#1*COS[#4]') || !joined.includes('G01 X#6 Z#7') || !joined.includes('END1')) {
      throw new Error(`椭圆宏锚点行缺失：${JSON.stringify(lines)}`);
    }
    return { ok: true, lines: lines.length };
  });

  await step('v0.3 p16 挂轮 → 默认 8 行 + top1 精确；URL ?p=3.175&t=12 → top1 20/55 / 455.52 ppm（W11-B）', async () => {
    await navigateHash(client, '#/p16');
    await waitFor(client, `document.querySelector('.la-page')?.dataset.page === 'p16'`, 'p16');
    await waitFor(client, `document.querySelectorAll('.rc-p16__resultcard .rc-p16__row').length === 8`, '结果表 8 行');
    const top1 = await evaluate(client, `document.querySelector('.rc-p16__resultcard .rc-p16__row')?.textContent ?? ''`);
    if (!top1.includes('精确')) throw new Error(`默认 top1 应含「精确」徽标（1.5/6 存在 e=0 解）：${top1}`);
    const defaultInfo = await evaluate(client, `(document.querySelector('.la-body')?.textContent ?? '').includes('数学示例')`);
    if (!defaultInfo) throw new Error('五倍组「数学示例」明示缺失（G2-W11 Minor-2）');

    await navigateHash(client, '#/p16?p=3.175&t=12');
    await sleep(250);
    await waitFor(client, `document.querySelectorAll('.rc-p16__resultcard .rc-p16__row').length === 8`, '英制态结果表 8 行');
    const imperialTop1 = await evaluate(client, `document.querySelector('.rc-p16__resultcard .rc-p16__row')?.textContent ?? ''`);
    // i=3.175/12=0.2645833333；top1=20/55×40/55（ratio=800/3025=0.264463）、e=455.52 ppm（V4.1 §3 Lead 预复算）
    if (!imperialTop1.includes('20') || !imperialTop1.includes('55') || !imperialTop1.includes('455.52')) {
      throw new Error(`英制 8tpi top1 不符：${imperialTop1}`);
    }
    return { ok: true, imperialTop1: imperialTop1.slice(0, 80) };
  });

  const elapsedMs = Date.now() - t0;
  return { elapsedMs, budgetMs: CHAIN_BUDGET_MS, ok: elapsedMs < CHAIN_BUDGET_MS, steps };
}

/** —— 段 2：A4 v0.3 改动面截图 —— */
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
    await sleep(200); // 等输入即算与图标渲染稳定
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
    // 与 W5/W7/W8 工装同参：390×844 @2x 必带（Windows DPI 129% 伪影教训 V2-A4-P1，原样保留）
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
    writeFileSync(join(OUT_DIR, 'verify-w12.json'), JSON.stringify(report, null, 2));
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
