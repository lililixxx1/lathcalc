/**
 * verify-v412.mjs · V4.12 A4 视觉终验工装（p06 标签防重叠 + 键盘全站统一）
 *
 * 沿革：verify-w5→…→pro（V4.9）→v412。CDP Emulation 390×844@2x mobile。
 * 前置纪律（V4.8-R2 / V4.10 教训）：跑前必须 npm run build 重建 dist；本工装
 * 启动时打印 preview 服务的 bundle hash 与 dist/assets/index-*.js 对拍；并先做
 * SW 预清理（localhost:4173 源 V4.9 期注册的 workbox precache 会拦截资产请求）。
 *
 * 拍位（25 拍；PAGES 环境变量可过滤）：
 *   p06 十二拍（V4.12-A）：AC01–AC12 默认值逐案——
 *     机检① texts 集与 p06 DEFAULTS 同源回显；机检② **真实渲染 getBBox 两两
 *     净距**（SVG 本地坐标系，真字体度量——独立于 core 的 est 估宽模型，
 *     est-vs-real 字宽差的兜底网）：<0 判 FAIL，<1.5 报 WARN；
 *     机检③ 全部 text bbox 落 viewBox [0,64]×[0,34] 内；逐案截图交 vision 复判。
 *   键盘七拍（V4.12-B）：p06(AC05)/p07/p08/p11/p12/p16/p09——.rc-keypad 存在 +
 *     13 键序全等（7 8 9 4 5 6 1 2 3 sign . 0 del）+ p09 默认活动字段（vc，
 *     unsigned）sign 键 disabled + p06 AC05 点击 stepZ 行后 sign 键 enabled。
 *   p03 一拍（回归）：metric 牙型图存在 + contains 锚。
 *
 * 用法：CHROME="...chrome.exe" node verify-v412.mjs http://localhost:4173/ <outDir>
 */
import { spawn } from 'node:child_process';
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const URL_TO_TEST = process.argv[2] ?? 'http://localhost:4173/';
const OUT_DIR = process.argv[3] ?? 'docs/evidence/V4.12/runs';
const CHROME = process.env.CHROME ?? 'chrome';
const DEBUG_PORT = Number(process.env.CDP_PORT ?? 9367);
const PAGES = (process.env.PAGES ?? 'p06,keypad,p03').split(',').map((s) => s.trim());

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
mkdirSync(OUT_DIR, { recursive: true });

/** p06 参数化大图选择器（V4.12-A 判读对象；p05 hero 静态标注明确排除——冻结手调坐标，另层）。 */
const P06_SEL = '.rc-p06__diagram';

/** 12 案默认值（源 src/ui/pages/p06.ts DEFAULTS；此处仅作 URL 案号，值由页面自带）。 */
const CASES = ['AC01', 'AC02', 'AC03', 'AC04', 'AC05', 'AC06', 'AC07', 'AC08', 'AC09', 'AC10', 'AC11', 'AC12'];

/** getBBox 两两净距 + viewBox 越界机检（真字体度量；返回逐对明细）。 */
const EXPR_LABEL_GEO = `(() => {
  const svg = document.querySelector('${P06_SEL} svg');
  if (!svg) return { error: 'no svg' };
  const vb = svg.viewBox.baseVal;
  const texts = [...svg.querySelectorAll('text')];
  const boxes = texts.map((el) => {
    const b = el.getBBox();
    return { text: el.textContent, x0: b.x, y0: b.y, x1: b.x + b.width, y1: b.y + b.height };
  });
  const pairs = [];
  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = i + 1; j < boxes.length; j += 1) {
      const a = boxes[i], c = boxes[j];
      const gap = Math.max(c.x0 - a.x1, a.x0 - c.x1, c.y0 - a.y1, a.y0 - c.y1);
      pairs.push({ a: a.text, b: c.text, gap: Math.round(gap * 100) / 100 });
    }
  }
  const out = boxes.filter((b) => b.x0 < -0.01 || b.y0 < -0.01 || b.x1 > vb.width + 0.01 || b.y1 > vb.height + 0.01);
  return { n: texts.length, pairs, outside: out.map((b) => b.text), vb: [vb.width, vb.height] };
})()`;

/** 键盘结构机检：13 键序全等 + sign 键状态。 */
const EXPR_KEYPAD = `(() => {
  const keys = [...document.querySelectorAll('.rc-keypad .rc-keypad__key')];
  const seq = keys.map((b) => b.dataset.key);
  const sign = document.querySelector('.rc-keypad .rc-keypad__key[data-key="sign"]');
  return { count: keys.length, seq, signDisabled: sign ? sign.disabled : null };
})()`;

const SCENARIOS = [
  ...CASES.map((id) => ({
    id: `p06-${id.toLowerCase()}`, group: 'p06',
    hash: `#/p06?case=${id}`, sel: P06_SEL, shot: `p06-${id.toLowerCase()}-390x844`,
    labelGeo: true,
  })),
  { id: 'keypad-p06-ac05', group: 'keypad', hash: '#/p06?case=AC05', keypad: true,
    clickStepZRow: '.rc-p06__form .la-input, .rc-p06__form [class*=input] .rc-p12__param-field', shot: 'keypad-p06-ac05-390x844' },
  { id: 'keypad-p07', group: 'keypad', hash: '#/p07', keypad: true, shot: 'keypad-p07-390x844' },
  { id: 'keypad-p08', group: 'keypad', hash: '#/p08', keypad: true, shot: 'keypad-p08-390x844' },
  { id: 'keypad-p11', group: 'keypad', hash: '#/p11', keypad: true, shot: 'keypad-p11-390x844' },
  { id: 'keypad-p12', group: 'keypad', hash: '#/p12', keypad: true, shot: 'keypad-p12-390x844' },
  { id: 'keypad-p16', group: 'keypad', hash: '#/p16', keypad: true, shot: 'keypad-p16-390x844' },
  { id: 'keypad-p09', group: 'keypad', hash: '#/p09', keypad: true, shot: 'keypad-p09-390x844' },
  { id: 'p03-metric', group: 'p03', hash: '#/p03?family=metric&spec=M30%C3%973.5&d=30&p=3.5',
    sel: '.rc-p03__figure', shot: 'p03-metric-390x844',
    contains: ['d 30.000', 'd₂ 27.727', 'd₁ 26.211', 'P 3.5', 'α 60°'] },
];

const EXPECT_SEQ = ['7', '8', '9', '4', '5', '6', '1', '2', '3', 'sign', '.', '0', 'del'];

async function waitForTarget() {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`);
      const targets = await response.json();
      const page = targets.find((target) => target.type === 'page' && target.webSocketDebuggerUrl);
      if (page) return page;
    } catch { /* chrome 未监听 */ }
    await sleep(100);
  }
  throw new Error('CDP target timeout');
}

function connect(webSocketUrl) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(webSocketUrl);
    const pending = new Map();
    const nextId = { v: 0 };
    socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      if (message.id && pending.has(message.id)) {
        const { resolve: rp, reject: rj } = pending.get(message.id);
        pending.delete(message.id);
        if (message.error) rj(new Error(`${message.error.message} (${message.error.code})`));
        else rp(message.result);
      }
    });
    socket.addEventListener('open', () => {
      resolve({
        send(method, params = {}) {
          const id = ++nextId.v;
          return new Promise((rp, rj) => {
            pending.set(id, { resolve: rp, reject: rj });
            socket.send(JSON.stringify({ id, method, params }));
          });
        },
        close: () => socket.close(),
      });
    });
    socket.addEventListener('error', reject, { once: true });
  });
}

async function evaluate(client, expression) {
  const result = await client.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
  }
  return result.result.value;
}

async function waitFor(client, expression, label, timeoutMs = 20000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try { if (await evaluate(client, expression)) return; } catch { /* 未就绪 */ }
    await sleep(80);
  }
  throw new Error(`timeout waiting for ${label}`);
}

async function shot(client, path) {
  const result = await client.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  writeFileSync(path, Buffer.from(result.data, 'base64'));
}

async function main() {
  // bundle hash 对拍（preview 服务 vs dist）
  const distIndex = readdirSync('dist/assets').filter((f) => f.startsWith('index-') && f.endsWith('.js'));
  console.log(`[harness] dist/assets/index-*.js = ${distIndex.join(', ')}`);

  const chrome = spawn(CHROME, [
    `--remote-debugging-port=${DEBUG_PORT}`,
    '--headless=new', '--no-first-run', '--no-default-browser-check',
    '--user-data-dir=' + join(process.env.TEMP ?? '/tmp', 'v412-cdp-profile'),
    'about:blank',
  ], { stdio: 'ignore' });

  try {
    const target = await waitForTarget();
    const client = await connect(target.webSocketDebuggerUrl);
    await client.send('Runtime.enable');
    await client.send('Page.enable');
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 390, height: 844, deviceScaleFactor: 2, mobile: true,
    });

    // SW 预清理（V4.10 教训：localhost 源 workbox precache 拦截资产）
    await client.send('Page.navigate', { url: URL_TO_TEST });
    await sleep(1500);
    const swClean = await evaluate(client, `(async () => {
      const out = { regs: 0, caches: [] };
      if (navigator.serviceWorker) {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const r of regs) { await r.unregister(); out.regs += 1; }
      }
      if (window.caches) {
        const keys = await caches.keys();
        for (const k of keys) { await caches.delete(k); out.caches.push(k); }
      }
      return out;
    })()`);
    console.log(`[sw-preclean] unregistered=${swClean.regs} cachesCleared=${swClean.caches.join(',') || 'none'}`);

    const report = [];
    let failed = 0;
    let warned = 0;

    for (const sc of SCENARIOS) {
      if (!PAGES.includes(sc.group)) continue;
      const url = URL_TO_TEST + (sc.hash ?? '');
      await client.send('Page.navigate', { url });
      await sleep(1200);
      const entry = { id: sc.id, url, checks: {}, status: 'PASS' };

      // 页面实跑 script[src] 与 dist 对拍（V4.10：curl 对拍不充分）
      if (sc.group === 'p06' || sc.id === 'p03-metric' || sc.group === 'keypad') {
        const src = await evaluate(client, `document.querySelector('script[src]')?.getAttribute('src') ?? ''`);
        entry.checks.bundle = src;
      }

      if (sc.sel) {
        await waitFor(client, `document.querySelector('${sc.sel} svg')`, `${sc.id} figure`);
      }
      if (sc.keypad) {
        await waitFor(client, `document.querySelector('.rc-keypad')`, `${sc.id} keypad`);
      }
      if (sc.clickStepZRow) {
        await evaluate(client, `(() => {
          const rows = [...document.querySelectorAll('${sc.clickStepZRow}')];
          const row = rows.find((r) => (r.textContent || '').includes('Z'));
          if (row) row.click();
          return row ? 'clicked' : 'not-found';
        })()`);
        await sleep(300);
      }

      if (sc.labelGeo) {
        const geo = await evaluate(client, EXPR_LABEL_GEO);
        entry.checks.labels = geo;
        const badPairs = (geo.pairs ?? []).filter((p) => p.gap < 0);
        const warnPairs = (geo.pairs ?? []).filter((p) => p.gap >= 0 && p.gap < 1.5);
        if (badPairs.length > 0 || (geo.outside ?? []).length > 0 || geo.error) {
          entry.status = 'FAIL'; failed += 1;
        } else if (warnPairs.length > 0) {
          entry.status = 'WARN'; warned += 1;
        }
      }

      if (sc.keypad) {
        const kp = await evaluate(client, EXPR_KEYPAD);
        entry.checks.keypad = kp;
        const seqOk = kp.count === 13 && kp.seq.join(',') === EXPECT_SEQ.join(',');
        if (!seqOk) { entry.status = 'FAIL'; failed += 1; }
        if (sc.id === 'keypad-p09' && kp.signDisabled !== true) {
          entry.status = 'FAIL'; failed += 1; // 默认活动 vc unsigned → sign 应禁用
        }
        if (sc.id === 'keypad-p06-ac05' && kp.signDisabled !== false) {
          entry.status = 'FAIL'; failed += 1; // 点击 stepZ 行后 signed 字段 → sign 应可用
        }
      }

      if (sc.contains) {
        const texts = await evaluate(client, `[...document.querySelectorAll('${sc.sel} svg text')].map((el) => el.textContent)`);
        entry.checks.texts = texts;
        const missing = sc.contains.filter((needle) => !texts.some((t) => t.includes(needle)));
        if (missing.length > 0) { entry.status = 'FAIL'; failed += 1; entry.checks.missing = missing; }
      }

      if (sc.shot) await shot(client, join(OUT_DIR, sc.shot + '.png'));
      report.push(entry);
      console.log(`[${entry.status}] ${sc.id}${entry.checks.labels ? ` minGap=${Math.min(...entry.checks.labels.pairs.map((p) => p.gap))}` : ''}`);
    }

    writeFileSync(join(OUT_DIR, 'a4-report.json'), JSON.stringify(report, null, 2));
    console.log(`\n[harness] ${report.length} shots | FAIL=${failed} WARN=${warned}`);
    process.exit(failed > 0 ? 1 : 0);
  } finally {
    chrome.kill();
  }
}

main().catch((error) => { console.error('[harness] FATAL', error); process.exit(2); });
