/**
 * verify-v43.mjs · v0.4.0（WAVE-PLAN-V4.3 §6）p06 参数化大图 A4 工装
 *
 * 沿革：verify-w5→w7→w8→w12→p06（CDP 样板复用）——Emulation.setDeviceMetricsOverride
 * 390×844@2x mobile 必带（Windows DPI 129% 伪影教训，V2-A4-P1）。
 *
 * 两案×两输入对拍（AC01: 5/45/36 → 12/30/50；AC05: 4/20/−10 → 8/28/−16），每案：
 *   1) 缺省拍：DOM 断言 svg text 集 = 预注册标签 → 截图；
 *   2) 改输入拍：setInputs（input 事件）→ 等 text 集变为第二组 → 断言 path d 集
 *      相对缺省拍已变（图形随值动，V4.3 核心主张）→ 截图。
 * 用法：CHROME="...chrome.exe" node verify-v43.mjs http://127.0.0.1:4173/ ../runs
 */
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const URL_TO_TEST = process.argv[2] ?? 'http://localhost:4173/';
const OUT_DIR = process.argv[3] ?? 'docs/evidence/V4.3-FIG/runs';
const CHROME = process.env.CHROME ?? 'chrome';
const DEBUG_PORT = Number(process.env.CDP_PORT ?? 9352);
const BUDGET_MS = 40_000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** 两案两拍（预注册预期：标签=输入真值；V4.3 §6） */
const CASES = [
  {
    id: 'AC01',
    first: { labels: ['R5', 'α45°', 'Ø36'] },
    second: { inputs: { R: '12', angle: '30', stepD: '50' }, labels: ['R12', 'α30°', 'Ø50'] },
  },
  {
    id: 'AC05',
    first: { labels: ['R4', 'Ø20', 'Z-10'] },
    second: { inputs: { R: '8', stepX: '28', stepZ: '-16' }, labels: ['R8', 'Ø28', 'Z-16'] },
  },
];

/** 静态回归抽验（§6：非试点案维持 v0.3.1 符号层，只拍不改） */
const STATIC_CASES = [{ id: 'AC02', labels: ['R1', 'R2', 'dZ'] }];

function startChrome() {
  const profile = mkdtempSync(join(tmpdir(), 'lathcalc-v43-cdp-'));
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

const TEXTS_EXPR = `[...document.querySelectorAll('.rc-p06__diagram svg text')].map((el) => el.textContent)`;
const PATHS_EXPR = `[...document.querySelectorAll('.rc-p06__diagram svg path')].map((el) => el.getAttribute('d'))`;

/** 经 input 事件改输入（InputRow 监听元素级 input，p06 onInput 重绘） */
function setInputsExpr(inputs) {
  const pairs = Object.entries(inputs).map(([name, value]) => [name, String(value)]);
  return `(() => {
    for (const [name, value] of ${JSON.stringify(pairs)}) {
      const el = document.querySelector('input[name="' + name + '"]');
      if (!el) return 'missing:' + name;
      el.value = value;
      el.dispatchEvent(new Event('input'));
    }
    return 'ok';
  })()`;
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const { child, profile } = startChrome();
  const started = Date.now();
  const shots = [];
  const labelChecks = [];
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

    for (const entry of CASES) {
      const id = entry.id.toLowerCase();
      await evaluate(c, `location.hash = '#/p06?case=${entry.id}'; true`);
      await waitFor(c, `document.querySelector('.la-page')?.dataset.page === 'p06'`, `p06 ${entry.id}`);
      await waitFor(c, `!!document.querySelector('.rc-p06__diagram svg text')`, `${entry.id} 大图文字`);

      // 缺省拍
      const texts1 = await evaluate(c, TEXTS_EXPR);
      if (JSON.stringify(texts1) !== JSON.stringify(entry.first.labels)) {
        throw new Error(`${entry.id} 缺省标签不符：${JSON.stringify(texts1)} ≠ ${JSON.stringify(entry.first.labels)}`);
      }
      const paths1 = await evaluate(c, PATHS_EXPR);
      const shot1 = `p06-${id}-param-a-390x844`;
      await screenshot(c, join(OUT_DIR, `${shot1}.png`));
      shots.push(shot1);

      // 改输入拍
      const setResult = await evaluate(c, setInputsExpr(entry.second.inputs));
      if (setResult !== 'ok') throw new Error(`${entry.id} 改输入失败：${setResult}`);
      await waitFor(
        c,
        `JSON.stringify(${TEXTS_EXPR}) === ${JSON.stringify(JSON.stringify(entry.second.labels))}`,
        `${entry.id} 第二组标签`,
      );
      const texts2 = await evaluate(c, TEXTS_EXPR);
      const paths2 = await evaluate(c, PATHS_EXPR);
      if (JSON.stringify(paths1) === JSON.stringify(paths2)) {
        throw new Error(`${entry.id} 图形未随输入变化（path d 集不变）`);
      }
      const shot2 = `p06-${id}-param-b-390x844`;
      await screenshot(c, join(OUT_DIR, `${shot2}.png`));
      shots.push(shot2);
      labelChecks.push({ id: entry.id, first: texts1, second: texts2, figureChanged: true });
    }

    // 静态回归抽验（§6）：标签集 = v0.3.1 冻结符号层，只拍不改
    for (const entry of STATIC_CASES) {
      await evaluate(c, `location.hash = '#/p06?case=${entry.id}'; true`);
      await waitFor(c, `document.querySelector('.la-page')?.dataset.page === 'p06'`, `p06 ${entry.id}`);
      await waitFor(c, `!!document.querySelector('.rc-p06__diagram svg text')`, `${entry.id} 大图文字`);
      const texts = await evaluate(c, TEXTS_EXPR);
      if (JSON.stringify(texts) !== JSON.stringify(entry.labels)) {
        throw new Error(`${entry.id} 静态标签不符：${JSON.stringify(texts)} ≠ ${JSON.stringify(entry.labels)}`);
      }
      const name = `p06-${entry.id.toLowerCase()}-static-390x844`;
      await screenshot(c, join(OUT_DIR, `${name}.png`));
      shots.push(name);
      labelChecks.push({ id: entry.id, static: texts });
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
    writeFileSync(join(OUT_DIR, 'verify-v43.json'), JSON.stringify(report, null, 2));
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
