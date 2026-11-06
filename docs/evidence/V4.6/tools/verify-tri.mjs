/**
 * verify-tri.mjs · v0.6.0（WAVE-PLAN-V4.5 §6）p12 三角参数化图 A4 工装
 *
 * 沿革：verify-w5→…→v43→v45→tri。CDP Emulation 390×844@2x mobile 必带。
 * 场景（每场景一拍 + 标签排序集断言；path 集变化断言）：
 *   SSS 缺省 30/40/50 → SSS 13/14/15（图变）；SAS、ASA 两输入各一拍；
 *   SSA 双解（40/50/36.87，解₂ 虚线断言）；SSA 无解（45/50/120 → 保帧断言）。
 * 预注册预期（V4.5-02 标签规则）：
 *   30/40/50 → A 36.9°/B 53.1°/C 90°/a 30/b 40/c 50
 *   13/14/15 → A 53.1°/B 59.5°/C 67.4°/a 13/b 14/c 15
 *   SAS 40/50/36.87 → 同 30/40/50 集；SAS 40/50/60 → a 45.83（含 B/C 角标签）
 *   ASA 36.87/53.13/50 → 同 30/40/50 集；ASA 30/45/40 → 按 solver 复算集
 *   SSA 40/50/36.87 → 解₁ 集（B 94.5°/b 66.46 等）
 * 用法：CHROME="...chrome.exe" node verify-tri.mjs http://localhost:4173/ <outDir>
 */
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const URL_TO_TEST = process.argv[2] ?? 'http://localhost:4173/';
const OUT_DIR = process.argv[3] ?? 'docs/evidence/V4.5-TRI/runs';
const CHROME = process.env.CHROME ?? 'chrome';
const DEBUG_PORT = Number(process.env.CDP_PORT ?? 9354);
const BUDGET_MS = 120_000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** ASA 30/45/40 预期集由正弦定理预注册：C=105°；a=40·sin30/sin105、b=40·sin45/sin105 */
const asaB = 40 * Math.sin((45 * Math.PI) / 180) / Math.sin((105 * Math.PI) / 180);
const asaA = 40 * Math.sin((30 * Math.PI) / 180) / Math.sin((105 * Math.PI) / 180);
const round1 = (v) => String(Number(v.toFixed(1)));
const round2 = (v) => String(Number(v.toFixed(2)));

const SCENARIOS = [
  {
    id: 'sss-default', hash: '#/p12', shot: 'p12-sss-default-390x844',
    labels: ['A 36.9°', 'B 53.1°', 'C 90°', 'a 30', 'b 40', 'c 50'],
    dashed: 0, rightMark: true,
  },
  {
    id: 'sss-131415', hash: '#/p12', shot: 'p12-sss-131415-390x844',
    set: { a: '13', b: '14', c: '15' },
    labels: ['A 53.1°', 'B 59.5°', 'C 67.4°', 'a 13', 'b 14', 'c 15'],
    changeFrom: 'sss-default', dashed: 0, rightMark: false,
  },
  {
    id: 'sas-40-50-36.87', hash: '#/p12?mode=sas', shot: 'p12-sas-a-390x844',
    set: { b: '40', c: '50', A: '36.87' },
    labels: ['A 36.9°', 'B 53.1°', 'C 90°', 'a 30', 'b 40', 'c 50'],
    dashed: 0, rightMark: true,
  },
  {
    id: 'sas-40-50-60', hash: '#/p12?mode=sas', shot: 'p12-sas-b-390x844',
    set: { b: '40', c: '50', A: '60' },
    labels: ['A 60°', `a ${round2(Math.sqrt(2100))}`, 'b 40', 'c 50'].concat([
      `B ${round1(Math.acos(Math.min(1, (2100 + 2500 - 1600) / (2 * Math.sqrt(2100) * 50))) * 180 / Math.PI)}°`,
      `C ${round1(Math.acos(Math.min(1, (2100 + 1600 - 2500) / (2 * Math.sqrt(2100) * 40))) * 180 / Math.PI)}°`,
    ]),
    dashed: 0, rightMark: false,
  },
  {
    id: 'asa-36.87-53.13-50', hash: '#/p12?mode=asa', shot: 'p12-asa-a-390x844',
    set: { A: '36.87', B: '53.13', c: '50' },
    labels: ['A 36.9°', 'B 53.1°', 'C 90°', 'a 30', 'b 40', 'c 50'],
    dashed: 0, rightMark: true,
  },
  {
    id: 'asa-30-45-40', hash: '#/p12?mode=asa', shot: 'p12-asa-b-390x844',
    set: { A: '30', B: '45', c: '40' },
    labels: ['A 30°', 'B 45°', 'C 105°', `a ${round2(asaA)}`, `b ${round2(asaB)}`, 'c 40'],
    dashed: 0, rightMark: false,
  },
  {
    id: 'ssa-dual', hash: '#/p12?mode=ssa', shot: 'p12-ssa-dual-390x844',
    set: { a: '40', c: '50', A: '36.87' },
    labels: ['A 36.9°', 'B 94.5°', 'C 48.6°', 'a 40', 'b 66.46', 'c 50'],
    dashed: 3, rightMark: false,
  },
  {
    // 保帧断言：承接 ssa-dual 现场（a=40/c=50/A=36.87 已解），只翻 A=120
    // （X≥90 且 x≤y → 无解）——逐字段输入的中间 repaint 不干扰参考帧
    id: 'ssa-no-solution', hash: null, shot: 'p12-ssa-nosol-390x844',
    set: { A: '120' },
    keepFrameFrom: 'ssa-dual', hint: '构不成三角形',
  },
];

function startChrome() {
  const profile = mkdtempSync(join(tmpdir(), 'lathcalc-tri-cdp-'));
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

const TEXTS_EXPR = `[...document.querySelectorAll('.rc-p12__diagram svg text')].map((el) => el.textContent)`;
const PATHS_EXPR = `[...document.querySelectorAll('.rc-p12__diagram svg path')].map((el) => el.getAttribute('d'))`;
const DASHED_EXPR = `document.querySelectorAll('.rc-p12__diagram svg path[stroke-dasharray]').length`;

const sameSet = (a, b) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());

function setInputsExpr(inputs) {
  const pairs = Object.entries(inputs).map(([name, value]) => [name, String(value)]);
  return `(() => {
    for (const [name, value] of ${JSON.stringify(pairs)}) {
      const el = document.querySelector('input[data-field="' + name + '"]');
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
  const pathSets = new Map();
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
        await waitFor(c, `document.querySelector('.la-page')?.dataset.page === 'p12'`, `p12 ${entry.id}`);
      }

      if (entry.set) {
        const setResult = await evaluate(c, setInputsExpr(entry.set));
        if (setResult !== 'ok') throw new Error(`${entry.id} 输入失败：${setResult}`);
      }

      let texts;
      if (entry.keepFrameFrom) {
        // 保帧断言：path 集与参考场景逐位相同 + 提示语出现
        await waitFor(c, `!!document.querySelector('.rc-p12__hint')`, `${entry.id} hint`);
        const hint = await evaluate(c, `document.querySelector('.rc-p12__hint')?.textContent`);
        if (!hint?.includes(entry.hint)) throw new Error(`${entry.id} 提示不符：${hint}`);
        const paths = await evaluate(c, PATHS_EXPR);
        const ref = pathSets.get(entry.keepFrameFrom);
        if (!ref || JSON.stringify(paths) !== JSON.stringify(ref)) {
          throw new Error(`${entry.id} 未保上一帧（path 集变化）`);
        }
        texts = await evaluate(c, TEXTS_EXPR);
      } else {
        await waitFor(
          c,
          `JSON.stringify([...${TEXTS_EXPR}].sort()) === ${JSON.stringify(JSON.stringify([...entry.labels].sort()))}`,
          `${entry.id} 标签集`,
        );
        texts = await evaluate(c, TEXTS_EXPR);
        const paths = await evaluate(c, PATHS_EXPR);
        pathSets.set(entry.id, paths);
        if (entry.changeFrom) {
          const ref = pathSets.get(entry.changeFrom);
          if (!ref || JSON.stringify(paths) === JSON.stringify(ref)) {
            throw new Error(`${entry.id} 图形未随输入变化`);
          }
        }
        const dashed = await evaluate(c, DASHED_EXPR);
        if (dashed !== entry.dashed) {
          throw new Error(`${entry.id} 虚线段数不符：${dashed} ≠ ${entry.dashed}`);
        }
        const solidCount = paths.length - dashed;
        const expectSolid = entry.rightMark ? 5 : 3;
        if (solidCount !== expectSolid) {
          throw new Error(`${entry.id} 实线段数不符：${solidCount} ≠ ${expectSolid}`);
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
    writeFileSync(join(OUT_DIR, 'verify-tri.json'), JSON.stringify(report, null, 2));
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
