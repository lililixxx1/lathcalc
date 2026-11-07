/**
 * verify-tol.mjs · v0.6.2（WAVE-PLAN-V4.7 §4 A4）p08 公差带示意图工装
 *
 * 沿革：verify-w5→…→v45→tri→tol。CDP Emulation 390×844@2x mobile 必带。
 * 场景（8 拍：每拍标签集 + 矩形数 + 零线 y 锚 + 图变断言）：
 *   默认 Ø40 IT7 H（单带 0..+25，零线 88）→ Ø18（+18，图变）→ IT8（+39）
 *   → h（−25..0，零线 22）→ g6（双带，零线 55）→ k6 → p6 → 超范围保帧。
 * 预注册预期（V4.7 §3 金锚；数据源 tolerance-it.json/fundamental-deviations.json
 * >30–50 行：IT7=25/IT6=16/g=−9/k=+2/p=+26；(10,18] IT7=18；IT8=39 μm）：
 *   零线 d：默认/IT8/k6/p6 `M16 88L204 88`；h `M16 22L204 22`；g6 `M16 55L204 55`。
 * 用法：CHROME="...chrome.exe" node verify-tol.mjs http://localhost:4173/ <outDir>
 */
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const URL_TO_TEST = process.argv[2] ?? 'http://localhost:4173/';
const OUT_DIR = process.argv[3] ?? 'docs/evidence/V4.7/runs';
const CHROME = process.env.CHROME ?? 'chrome';
const DEBUG_PORT = Number(process.env.CDP_PORT ?? 9357);
const BUDGET_MS = 120_000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const SCENARIOS = [
  {
    id: 'default', hash: '#/p08', shot: 'p08-tol-default-390x844',
    labels: ['+25', '0', 'H7', 'μm'], rects: 1, zero: 'M16 88L204 88',
  },
  {
    id: 'd18', hash: '#/p08', shot: 'p08-tol-d18-390x844',
    set: { nominal: '18' },
    labels: ['+18', '0', 'H7', 'μm'], rects: 1, zero: 'M16 88L204 88',
    changeFrom: 'default',
  },
  {
    id: 'it8', hash: '#/p08', shot: 'p08-tol-it8-390x844',
    set: { nominal: '40', grade: '8' },
    labels: ['+39', '0', 'H8', 'μm'], rects: 1, zero: 'M16 88L204 88',
    changeFrom: 'd18',
  },
  {
    id: 'h7', hash: '#/p08', shot: 'p08-tol-h7-390x844',
    set: { nominal: '40', grade: '7', fundamental: 'h' },
    labels: ['0', 'h7', 'μm', '\u221225'], rects: 1, zero: 'M16 22L204 22',
    changeFrom: 'it8',
  },
  {
    id: 'g6', hash: '#/p08', shot: 'p08-tol-g6-390x844',
    set: { nominal: '40', fundamental: 'H', fit: 'g6' },
    labels: ['+25', '0', 'H7', 'g6', 'μm', '\u221225', '\u22129'], rects: 2,
    zero: 'M16 55L204 55', changeFrom: 'h7',
  },
  {
    id: 'k6', hash: '#/p08', shot: 'p08-tol-k6-390x844',
    set: { fit: 'k6' },
    labels: ['+18', '+2', '+25', '0', 'H7', 'k6', 'μm'], rects: 2,
    zero: 'M16 88L204 88',
  },
  {
    id: 'p6', hash: '#/p08', shot: 'p08-tol-p6-390x844',
    set: { fit: 'p6' },
    labels: ['+25', '+26', '+42', '0', 'H7', 'p6', 'μm'], rects: 2,
    zero: 'M16 88L204 88',
  },
  {
    // 保帧断言：承接 p6 现场，输入 3150.001 超表 → hint 出现，标签集/矩形不变
    id: 'out-of-range', hash: null, shot: 'p08-tol-keepframe-390x844',
    set: { nominal: '3150.001' },
    keepFrameFrom: 'p6', hint: '内置公差表范围',
  },
];

function startChrome() {
  const profile = mkdtempSync(join(tmpdir(), 'lathcalc-tol-cdp-'));
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

async function screenshot(client, path) {
  const result = await client.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  writeFileSync(path, Buffer.from(result.data, 'base64'));
}

const TEXTS_EXPR = `[...document.querySelectorAll('.rc-p08__diagram svg text')].map((el) => el.textContent)`;
const RECTS_EXPR = `document.querySelectorAll('.rc-p08__diagram svg rect').length`;
const ZERO_EXPR = `document.querySelector('.rc-p08__diagram svg path')?.getAttribute('d')`;
const HINT_EXPR = `document.querySelector('.rc-p08__hint')?.textContent ?? ''`;

/** p08 输入驱动：nominal 文本框 / IT 分段与孔轴分段 / 配合 chip */
function actExpr(inputs) {
  const steps = [];
  if ('nominal' in inputs) {
    steps.push(`(() => {
      const el = document.querySelector('input[name="nominal"]');
      if (!el) return 'missing:nominal';
      el.value = ${JSON.stringify(String(inputs.nominal))};
      el.dispatchEvent(new Event('input', { bubbles: true }));
      return 'ok';
    })()`);
  }
  if ('grade' in inputs) {
    steps.push(`(() => {
      const el = document.querySelector('.rc-seg.small .rc-seg__item[data-value="${inputs.grade}"]');
      if (!el) return 'missing:grade';
      el.click();
      return 'ok';
    })()`);
  }
  if ('fundamental' in inputs) {
    steps.push(`(() => {
      const el = document.querySelector('.rc-seg:not(.small) .rc-seg__item[data-value="${inputs.fundamental}"]');
      if (!el) return 'missing:fundamental';
      el.click();
      return 'ok';
    })()`);
  }
  if ('fit' in inputs) {
    steps.push(`(() => {
      const el = document.querySelector('.rc-p08__preset[data-fit="${inputs.fit}"]');
      if (!el) return 'missing:fit';
      el.click();
      return 'ok';
    })()`);
  }
  return `(async () => { for (const s of [${steps.join(',')}]) { const r = await s; if (r !== 'ok') return r; } return 'ok'; })()`;
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const { child, profile } = startChrome();
  const started = Date.now();
  const shots = [];
  const labelChecks = [];
  const frameSig = new Map();
  try {
    const target = await waitForTarget();
    const c = await connect(target.webSocketDebuggerUrl);
    await c.send('Page.enable');
    await c.send('Runtime.enable');
    await c.send('Log.enable');
    await c.send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
    });

    await evaluate(c, `location.href = ${JSON.stringify(URL_TO_TEST)}; true`);

    for (const entry of SCENARIOS) {
      if (entry.hash) {
        await evaluate(c, `location.hash = ${JSON.stringify(entry.hash)}; true`);
        await waitFor(c, `document.querySelector('.la-page')?.dataset.page === 'p08'`, `p08 ${entry.id}`);
      }

      if (entry.set) {
        const act = await evaluate(c, actExpr(entry.set));
        if (act !== 'ok') throw new Error(`${entry.id} 输入失败：${act}`);
      }

      let texts;
      if (entry.keepFrameFrom) {
        await waitFor(c, `!!document.querySelector('.rc-p08__hint')`, `${entry.id} hint`);
        const hint = await evaluate(c, HINT_EXPR);
        if (!hint.includes(entry.hint)) throw new Error(`${entry.id} 提示不符：${hint}`);
        const textsNow = await evaluate(c, TEXTS_EXPR);
        const rectsNow = await evaluate(c, RECTS_EXPR);
        const ref = frameSig.get(entry.keepFrameFrom);
        if (!ref || JSON.stringify(textsNow) !== JSON.stringify(ref.texts) || rectsNow !== ref.rects) {
          throw new Error(`${entry.id} 未保上一帧（标签/矩形集变化）`);
        }
        texts = textsNow;
      } else {
        await waitFor(
          c,
          `JSON.stringify([...${TEXTS_EXPR}].sort()) === ${JSON.stringify(JSON.stringify([...entry.labels].sort()))}`,
          `${entry.id} 标签集`,
        );
        texts = await evaluate(c, TEXTS_EXPR);
        const rects = await evaluate(c, RECTS_EXPR);
        if (rects !== entry.rects) {
          throw new Error(`${entry.id} 矩形数不符：${rects} ≠ ${entry.rects}`);
        }
        const zero = await evaluate(c, ZERO_EXPR);
        if (zero !== entry.zero) {
          throw new Error(`${entry.id} 零线 d 不符：${zero} ≠ ${entry.zero}`);
        }
        frameSig.set(entry.id, { texts, rects });
        if (entry.changeFrom) {
          const ref = frameSig.get(entry.changeFrom);
          if (!ref || JSON.stringify(texts) === JSON.stringify(ref.texts)) {
            throw new Error(`${entry.id} 图形未随输入变化`);
          }
        }
      }

      const shot = entry.shot;
      await screenshot(c, join(OUT_DIR, `${shot}.png`));
      shots.push(shot);
      labelChecks.push({ id: entry.id, texts, keptFrame: Boolean(entry.keepFrameFrom) });
    }

    const elapsed = Date.now() - started;
    const report = {
      ok: elapsed <= BUDGET_MS && c.events.exceptions.length === 0 && c.events.consoleErrors.length === 0,
      ms: elapsed,
      budgetMs: BUDGET_MS,
      shots,
      labelChecks,
      exceptions: c.events.exceptions.length,
      consoleErrors: c.events.consoleErrors.length,
    };
    writeFileSync(join(OUT_DIR, 'verify-tol.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
    c.close();
  } finally {
    child.kill();
    await sleep(1500);
    try {
      rmSync(profile, { recursive: true, force: true });
    } catch {
      /* 临时目录由系统清理 */
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
