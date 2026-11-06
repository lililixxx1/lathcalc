/**
 * verify-v45.mjs · v0.5.0（WAVE-PLAN-V4.4 §6）p06 参数化大图 A4 工装
 *
 * 沿革：verify-w5→w7→w8→w12→p06→v43——Emulation.setDeviceMetricsOverride
 * 390×844@2x mobile 必带（Windows DPI 伪影教训）。与 v43 差异：全 12 案两输入
 * 对拍（推广后无静态案）；标签比较用**排序集**（断言语义=标签集合等于输入真值，
 * 不约束构建顺序）；末尾加 p05 图库缩略回归拍（thumb 本波不动）。
 * 预注册预期（§6：标签=输入真值，V4.4-02 等号规则）：
 * 用法：CHROME="...chrome.exe" node verify-v45.mjs http://localhost:4173/ <outDir>
 */
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const URL_TO_TEST = process.argv[2] ?? 'http://localhost:4173/';
const OUT_DIR = process.argv[3] ?? 'docs/evidence/V4.4-FIG/runs';
const CHROME = process.env.CHROME ?? 'chrome';
const DEBUG_PORT = Number(process.env.CDP_PORT ?? 9353);
const BUDGET_MS = 180_000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** 12 案 × 两输入（第二组输入可达性算式见 WAVE-PLAN-V4.4 §4 各案约束：如
 *  AC02 需 0<dZ<R1+R2（10<14）、AC06 需 |c|<2R（√145≈12.04<16）、AC08 需 |dZ|≤2R） */
const CASES = [
  { id: 'AC01', first: ['R5', 'α45°', 'Ø36'], second: { inputs: { R: '12', angle: '30', stepD: '50' }, labels: ['R12', 'α30°', 'Ø50'] } },
  { id: 'AC02', first: ['R1=10', 'R2=15', 'dZ=15'], second: { inputs: { R1: '8', R2: '6', dZ: '10' }, labels: ['R1=8', 'R2=6', 'dZ=10'] } },
  { id: 'AC03', first: ['R1=25', 'R2=10', 'dZ=9'], second: { inputs: { R1: '20', R2: '5', dZ: '6' }, labels: ['R1=20', 'R2=5', 'dZ=6'] } },
  { id: 'AC04', first: ['R1=5', 'R2=3', 'α45°'], second: { inputs: { R1: '4', R2: '6', angle: '30' }, labels: ['R1=4', 'R2=6', 'α30°'] } },
  { id: 'AC05', first: ['R4', 'Ø20', 'Z-10'], second: { inputs: { R: '8', stepX: '28', stepZ: '-16' }, labels: ['R8', 'Ø28', 'Z-16'] } },
  { id: 'AC06', first: ['R10', 'dX=12', 'dZ=8'], second: { inputs: { R: '8', dX: '16', dZ: '9' }, labels: ['R8', 'dX=16', 'dZ=9'] } },
  { id: 'AC07', first: ['R5', 'Ø30', 'Z-30'], second: { inputs: { R: '4', dX: '40', dZ: '-20' }, labels: ['R4', 'Ø40', 'Z-20'] } },
  { id: 'AC08', first: ['R6', 'dZ=-4'], second: { inputs: { R: '8', dZ: '6' }, labels: ['R8', 'dZ=6'] } },
  { id: 'AC09', first: ['R5', 'α30°'], second: { inputs: { R: '3', angle: '45' }, labels: ['R3', 'α45°'] } },
  { id: 'AC10', first: ['R5', 'lead=3.5'], second: { inputs: { R: '8', lead: '4' }, labels: ['R8', 'lead=4'] } },
  { id: 'AC11', first: ['R10'], second: { inputs: { R: '6' }, labels: ['R6'] }, selfSimilar: true }, // 单参数案：实体全 ∝R，归一化视图自相似——path 不变是数学必然（V44-B 上报项 1 裁决：接受；响应由标签承载）
  { id: 'AC12', first: ['R3', 'Ø20'], second: { inputs: { R: '5', boreD: '28' }, labels: ['R5', 'Ø28'] } },
];

function startChrome() {
  const profile = mkdtempSync(join(tmpdir(), 'lathcalc-v45-cdp-'));
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

const TEXTS_EXPR = `[...document.querySelectorAll('.rc-p06__diagram svg text')].map((el) => el.textContent)`;
const PATHS_EXPR = `[...document.querySelectorAll('.rc-p06__diagram svg path, .rc-p06__diagram svg circle')].map((el) => (el.tagName === 'circle' ? 'C' + el.getAttribute('cx') + ',' + el.getAttribute('cy') + ',' + el.getAttribute('r') : el.getAttribute('d')))`;

/** 排序集比较（标签断言不约束构建顺序） */
const sameSet = (a, b) =>
  JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());

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
      if (!sameSet(texts1, entry.first)) {
        throw new Error(`${entry.id} 缺省标签不符：${JSON.stringify(texts1)} ≠ ${JSON.stringify(entry.first)}`);
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
        `JSON.stringify([...${TEXTS_EXPR}].sort()) === ${JSON.stringify(JSON.stringify([...entry.second.labels].sort()))}`,
        `${entry.id} 第二组标签`,
      );
      const texts2 = await evaluate(c, TEXTS_EXPR);
      const paths2 = await evaluate(c, PATHS_EXPR);
      if (!entry.selfSimilar && JSON.stringify(paths1) === JSON.stringify(paths2)) {
        throw new Error(`${entry.id} 图形未随输入变化（path/circle 集不变）`);
      }
      const shot2 = `p06-${id}-param-b-390x844`;
      await screenshot(c, join(OUT_DIR, `${shot2}.png`));
      shots.push(shot2);
      labelChecks.push({
        id: entry.id,
        first: texts1,
        second: texts2,
        figureChanged: entry.selfSimilar ? 'labels-only（单参数自相似案，登记裁决）' : true,
      });
    }

    // p05 图库缩略回归拍（thumb 本波不动：12 案缩略仍为冻结静态稿）
    await evaluate(c, `location.hash = '#/p05'; true`);
    await waitFor(c, `document.querySelector('.la-page')?.dataset.page === 'p05'`, 'p05 图库');
    await waitFor(c, `document.querySelectorAll('svg').length >= 12`, 'p05 缩略 12 案');
    await screenshot(c, join(OUT_DIR, 'p05-gallery-regression-390x844.png'));
    shots.push('p05-gallery-regression-390x844');

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
    writeFileSync(join(OUT_DIR, 'verify-v45.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
    c.close();
  } finally {
    child.kill();
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
