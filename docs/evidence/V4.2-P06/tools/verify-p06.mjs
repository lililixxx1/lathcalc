/**
 * verify-p06.mjs · v0.3.1（WAVE-PLAN-V4.2 §4）p06 大图标注层 A4 工装
 *
 * 沿革：verify-w5→w7→w8→w12（CDP 样板复用）——Emulation.setDeviceMetricsOverride
 * 390×844@2x mobile 必带（Windows DPI 129% 伪影教训，V2-A4-P1）。
 *
 * 四案四拍（AC01 三键 / AC05 尺寸线双对+换位修法 / AC06 换位修法 / AC12 孔径+内切），每拍：
 *   1) DOM 断言：hero svg text 键集 = V4.2 §3 冻结表（与 vitest 同锚）；
 *   2) 截图 390×844@2x → runs/。
 * 用法：CHROME="...chrome.exe" node verify-p06.mjs http://127.0.0.1:4173/ ../runs
 */
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const URL_TO_TEST = process.argv[2] ?? 'http://localhost:4173/';
const OUT_DIR = process.argv[3] ?? 'docs/evidence/V4.2-P06/runs';
const CHROME = process.env.CHROME ?? 'chrome';
const DEBUG_PORT = Number(process.env.CDP_PORT ?? 9351);
const BUDGET_MS = 30_000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** 四案 = 键型覆盖抽验（单符号 / 尺寸线双对 / 标签换位修法 / 中文键），键集 = V4.2 §3.1 修订表 */
const CASES = [
  { id: 'AC01', labels: ['R', 'α', 'Ø'] },
  { id: 'AC05', labels: ['R', 'stepX', 'stepZ'] },
  { id: 'AC06', labels: ['R', 'dX', 'dZ'] },
  { id: 'AC12', labels: ['R', '孔径'] },
];

function startChrome() {
  const profile = mkdtempSync(join(tmpdir(), 'lathcalc-v42-cdp-'));
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

async function waitFor(client, expression, label, timeoutMs = 15000) {
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

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const { child, profile } = startChrome();
  const started = Date.now();
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

    const shots = [];
    for (const entry of CASES) {
      await evaluate(c, `location.hash = '#/p06?case=${entry.id}'; true`);
      await waitFor(c, `document.querySelector('.la-page')?.dataset.page === 'p06'`, `p06 ${entry.id}`);
      await waitFor(
        c,
        `!!document.querySelector('.rc-p06__diagram svg text')`,
        `${entry.id} hero 标注文字`,
      );

      const texts = await evaluate(
        c,
        `[...document.querySelectorAll('.rc-p06__diagram svg text')].map((el) => el.textContent)`,
      );
      const expected = [...entry.labels];
      if (JSON.stringify(texts) !== JSON.stringify(expected)) {
        throw new Error(`${entry.id} 标注键集不符：${JSON.stringify(texts)} ≠ ${JSON.stringify(expected)}`);
      }
      const hasCenter = await evaluate(
        c,
        `!!document.querySelector('.rc-p06__diagram svg circle[fill="var(--la-sub)"]')`,
      );
      if (!hasCenter) throw new Error(`${entry.id} 圆心灰点缺失`);

      const name = `p06-${entry.id.toLowerCase()}-annot-390x844`;
      await screenshot(c, join(OUT_DIR, `${name}.png`));
      shots.push(name);
    }

    const elapsed = Date.now() - started;
    const report = {
      ok: elapsed <= BUDGET_MS && c.events.exceptions.length === 0 && c.events.consoleErrors.length === 0,
      ms: elapsed,
      budgetMs: BUDGET_MS,
      shots,
      labelChecks: CASES.map((entry) => ({ id: entry.id, labels: entry.labels })),
      exceptions: c.events.exceptions.length,
      consoleErrors: c.events.consoleErrors.length,
    };
    writeFileSync(join(OUT_DIR, 'verify-p06.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
    c.close();
  } finally {
    child.kill();
    // Windows：Chrome 退出有滞后，profile 目录可能仍被锁——清理失败不影响判定（best-effort）
    await sleep(1500);
    try {
      rmSync(profile, { recursive: true, force: true });
    } catch {
      /* 临时目录由系统清理；报告与截图已落盘 */
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
