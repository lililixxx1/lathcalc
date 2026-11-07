/**
 * verify-gear.mjs · v0.6.3（WAVE-PLAN-V4.8 §4 A4）p16 挂轮系示意图工装
 *
 * 沿革：verify-w5→…→v45→tri→tol→gear。CDP Emulation 390×844@2x mobile 必带。
 * 场景（8 拍：每拍标签集 + 圆数（4 齿轮+2 啮合点）+ 选中态 + 图变断言）：
 *   默认 1.5/6 top1 20/40×20/40 → 点行 6（20/20×20/80）→ P=2 重置回行 1
 *   （20/30×20/40）→ T=12（20/40×20/80）→ 换齿组 {30,40,50,60}（30/60×30/60）
 *   → 极端齿组 i=1.25 {20,25,30,500}（20/20×25/20）→ P 非法保帧 → 齿数 3 枚保帧。
 * 预注册预期（V4.8 §3 金锚；top1 排序键 (errorPpm, Σz, 字典序) 独立穷举复算）：
 *   默认 20/40×20/40（Σ=120）；第 6 行 20/20×20/80；P=2 i=1/3 → 20/30×20/40；
 *   T=12 i=0.125 → 20/40×20/80；{30,40,50,60} i=0.25 → 30/60×30/60；
 *   i=1.25 → 20/20×25/20（字典序先于 25/20×20/20）。
 * 用法：CHROME="...chrome.exe" node verify-gear.mjs http://localhost:4173/ <outDir>
 */
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const URL_TO_TEST = process.argv[2] ?? 'http://localhost:4173/';
const OUT_DIR = process.argv[3] ?? 'docs/evidence/V4.8/runs';
const CHROME = process.env.CHROME ?? 'chrome';
const DEBUG_PORT = Number(process.env.CDP_PORT ?? 9358);
const BUDGET_MS = 120_000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const SCENARIOS = [
  {
    id: 'default', hash: '#/p16', shot: 'p16-gear-default-390x844',
    labels: ['a 20', 'b 40', 'c 20', 'd 40', '主轴', '中间轴', '丝杠'],
    pressed: { index: 0, count: 1 },
  },
  {
    id: 'row6', hash: null, shot: 'p16-gear-row6-390x844',
    pick: 5,
    labels: ['a 20', 'b 20', 'c 20', 'd 80', '主轴', '中间轴', '丝杠'],
    pressed: { index: 5, count: 1 },
    changeFrom: 'default',
  },
  {
    id: 'p2', hash: null, shot: 'p16-gear-p2-390x844',
    set: { p: '2' },
    labels: ['a 20', 'b 30', 'c 20', 'd 40', '主轴', '中间轴', '丝杠'],
    pressed: { index: 0, count: 1 },
    changeFrom: 'row6',
  },
  {
    id: 't12', hash: null, shot: 'p16-gear-t12-390x844',
    set: { p: '1.5', t: '12' },
    labels: ['a 20', 'b 40', 'c 20', 'd 80', '主轴', '中间轴', '丝杠'],
    pressed: { index: 0, count: 1 },
    changeFrom: 'p2',
  },
  {
    id: 'teeth60', hash: null, shot: 'p16-gear-teeth60-390x844',
    set: { t: '6', teeth: '30 40 50 60' },
    labels: ['a 30', 'b 60', 'c 30', 'd 60', '主轴', '中间轴', '丝杠'],
    pressed: { index: 0, count: 1 },
    changeFrom: 't12',
  },
  {
    id: 'i125', hash: null, shot: 'p16-gear-i125-390x844',
    set: { p: '1.25', t: '1', teeth: '20 25 30 500' },
    labels: ['a 20', 'b 20', 'c 25', 'd 20', '主轴', '中间轴', '丝杠'],
    pressed: { index: 0, count: 1 },
    changeFrom: 'teeth60',
  },
  {
    // 保帧断言：承接 i125 现场，P 置 0 → hint 出现，标签/圆集不变
    id: 'invalid-p', hash: null, shot: 'p16-gear-keepframe-p-390x844',
    set: { p: '0' },
    keepFrameFrom: 'i125', hint: '.rc-p16__hint', hintText: '请输入大于 0 的工件螺距',
  },
  {
    // 保帧断言：齿数 3 枚（P 恢复有效，画面只呈现齿数提示）→ 标签/圆集不变
    id: 'teeth3', hash: null, shot: 'p16-gear-keepframe-teeth-390x844',
    set: { p: '1.25', teeth: '20 25 30' },
    keepFrameFrom: 'i125', hint: '.rc-p16__setinfo', hintText: '至少 4 个（当前 3 个）',
  },
];

function startChrome() {
  const profile = mkdtempSync(join(tmpdir(), 'lathcalc-gear-cdp-'));
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

const TEXTS_EXPR = `[...document.querySelectorAll('.rc-p16__diagram svg text')].map((el) => el.textContent)`;
const CIRCLES_EXPR = `document.querySelectorAll('.rc-p16__diagram svg circle').length`;
const DOTS_EXPR = `document.querySelectorAll('.rc-p16__diagram svg circle[fill]').length`;
const PRESSED_EXPR = `[...document.querySelectorAll('.rc-p16__pick')].map((el) => el.getAttribute('aria-pressed'))`;

/** p16 输入驱动：p/t/teeth 文本框 + 行选择按钮 */
function actExpr(inputs) {
  const steps = [];
  for (const name of ['p', 't', 'teeth']) {
    if (name in inputs) {
      steps.push(`(() => {
        const el = document.querySelector('input[name="${name}"]');
        if (!el) return 'missing:${name}';
        el.value = ${JSON.stringify(String(inputs[name]))};
        el.dispatchEvent(new Event('input', { bubbles: true }));
        return 'ok';
      })()`);
    }
  }
  if ('pick' in inputs) {
    steps.push(`(() => {
      const buttons = [...document.querySelectorAll('.rc-p16__pick')];
      const el = buttons[${inputs.pick}];
      if (!el) return 'missing:pick';
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
        await waitFor(c, `document.querySelector('.la-page')?.dataset.page === 'p16'`, `p16 ${entry.id}`);
      }

      const act = await evaluate(c, actExpr(entry.pick !== undefined ? { pick: entry.pick, ...(entry.set ?? {}) } : entry.set ?? {}));
      if (act !== 'ok') throw new Error(`${entry.id} 输入失败：${act}`);

      // A4-R1 修补拍：行选择拍把选中行滚入视口（选中行原本在折叠线下不可视）
      if (entry.pick !== undefined) {
        await evaluate(
          c,
          `document.querySelectorAll('.rc-p16__pick')[${entry.pick}]?.scrollIntoView({ block: 'center' }); true`,
        );
        await sleep(120);
      }

      let texts;
      if (entry.keepFrameFrom) {
        await waitFor(
          c,
          `!!document.querySelector(${JSON.stringify(entry.hint)}) && document.querySelector(${JSON.stringify(entry.hint)}).textContent.includes(${JSON.stringify(entry.hintText)})`,
          `${entry.id} hint`,
        );
        const textsNow = await evaluate(c, TEXTS_EXPR);
        const circlesNow = await evaluate(c, CIRCLES_EXPR);
        const ref = frameSig.get(entry.keepFrameFrom);
        if (!ref || JSON.stringify(textsNow) !== JSON.stringify(ref.texts) || circlesNow !== ref.circles) {
          throw new Error(`${entry.id} 未保上一帧（标签/圆集变化）`);
        }
        texts = textsNow;
      } else {
        await waitFor(
          c,
          `JSON.stringify([...${TEXTS_EXPR}].sort()) === ${JSON.stringify(JSON.stringify([...entry.labels].sort()))}`,
          `${entry.id} 标签集`,
        );
        texts = await evaluate(c, TEXTS_EXPR);
        const circles = await evaluate(c, CIRCLES_EXPR);
        if (circles !== 6) throw new Error(`${entry.id} 圆数不符：${circles} ≠ 6（4 齿轮 + 2 啮合点）`);
        const dots = await evaluate(c, DOTS_EXPR);
        if (dots !== 2) throw new Error(`${entry.id} 啮合点数不符：${dots} ≠ 2`);
        const pressed = (await evaluate(c, PRESSED_EXPR)) ?? [];
        const trueCount = pressed.filter((value) => value === 'true').length;
        if (pressed[entry.pressed.index] !== 'true' || trueCount !== entry.pressed.count) {
          throw new Error(`${entry.id} 选中态不符：pressed=${JSON.stringify(pressed)}`);
        }
        frameSig.set(entry.id, { texts, circles });
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
    writeFileSync(join(OUT_DIR, 'verify-gear.json'), JSON.stringify(report, null, 2));
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
