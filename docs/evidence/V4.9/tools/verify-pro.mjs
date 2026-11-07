/**
 * verify-pro.mjs · v0.7.0（WAVE-PLAN-V4.9 §4 A4）全站图形化收口工装
 *
 * 沿革：verify-w5→…→v45→tri→tol→gear→pro。CDP Emulation 390×844@2x mobile 必带。
 * 前置纪律（V4.8-R2 教训固化）：跑本工装前必须 `npm run build` 重建 dist，并核对
 * preview 服务的 bundle hash 与 dist/assets/index-*.js 一致（本工装启动时打印）。
 *
 * 拍位（16 拍；环境变量 PAGES=p03,p11,p09,p10 可过滤分段跑）：
 *   p03 六拍（A 卡）：metric/Tr40×7/G1/2/worm m2/sealpipe 基面/无参无图；
 *   p11 六拍（B 卡）：round 默认 → hex → pipe → plate → 切回 round 改 D=80 重绘
 *     → pipe + t=30（t·2≥D 物理无效）保帧；
 *   p09 三拍（B 卡）：默认 D=50（r=36, Vc 150, n 955 r/min）→ 模式切 vc（几何恒等
 *     + 文本 Vc 150.0，形值同源 V4.9-01）→ 改 D=100 重绘（r=18, ⌀100, n 477）；
 *   p10 一拍（C 卡）：静态三要素（texts 全等 ['Vc','ap','f']）。
 *
 * 预注册预期（WAVE-PLAN-V4.9 §3 金锚；标签值=页面计算真值同源）：
 *   p11：round D50/L100 → 条 80×40、r=34；hex S20 → 68×58.9、条 200×40；
 *   pipe D60/t5 → rO=34、rI=28.33、条 66.67×40；plate W100/T10/L200 → 68×6.8、200×10；
 *   p09：n=1000×150/(π×50)=954.93→'955'；vc 模式（输入=rpm）Vc=150.0（toFixed(1)）；
 *   redraw 拍在 vc 模式改 d=100 → r=min(40,36·50/100)=18、Vc=π×100×955/1000=
 *   300.02→'300.0'、n=955（输入值）——初笔预注册 '477' 系按「vc 模式输入 vc」的
 *   语义误解（vc 模式输入字段是 rpm，切换时自动换算 n=955），实跑勘正入档。
 *   p03 五族标签集按 §3-A 金锚 contains 断言（d/d₂/d₁ 值与页面 toFixed 同源）。
 *
 * 用法：CHROME="...chrome.exe" node verify-pro.mjs http://localhost:4173/ <outDir>
 */
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const URL_TO_TEST = process.argv[2] ?? 'http://localhost:4173/';
const OUT_DIR = process.argv[3] ?? 'docs/evidence/V4.9/runs';
const CHROME = process.env.CHROME ?? 'chrome';
const DEBUG_PORT = Number(process.env.CDP_PORT ?? 9361);
const BUDGET_MS = 180_000;
const PAGES = (process.env.PAGES ?? 'p03,p11,p09,p10').split(',').map((s) => s.trim());

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** p03 图卡选择器（A 卡实现 class，收获时核对——惯例同 p09/p11 __diagram）。 */
const P03_SEL = '.rc-p03__figure'; // A 卡实现 class（收获时核对：__figure 非 __diagram）

/**
 * 场景定义：
 *   hash：导航（page 切换必带）；click：{sel} 点击；set：{name:value} 文本框输入；
 *   textsEq：svg text 集合排序全等；contains：texts 逐项包含；
 *   counts：svg 内元素计数 {circle|rect|polygon|polyline|path}；
 *   rAttr：svg circle r 属性值（主圆断言）；
 *   keepFrameFrom：保帧参考拍 id（svg outerHTML 逐位相同）+ pageReady：保帧态页面断言；
 *   geoSameAs：几何恒等参考拍 id（circle/箭头坐标序列化相同——p09 模式切换只改文本）；
 *   changeFrom：图变断言参考拍（texts 排序集必须不同）。
 */
const SCENARIOS = [
  // —— p03 六拍（A 卡：五族 + 无参）——
  {
    id: 'p03-metric', page: 'p03',
    hash: '#/p03?family=metric&spec=M10&d=10&p=1.5',
    sel: P03_SEL, shot: 'p03-metric-390x844',
    contains: ['d 10', 'd₂ 9.026', 'd₁ 8.376', 'P 1.5', 'α 60°'],
    counts: { polyline: 1 },
  },
  {
    id: 'p03-tr', page: 'p03',
    hash: '#/p03?family=trapezoid&spec=Tr40%C3%977&d=40&p=7',
    sel: P03_SEL, shot: 'p03-tr-390x844',
    contains: ['d 40', 'd₂ 36.5', 'd₁ 32', 'P 7', 'α 30°'],
    counts: { polyline: 1 },
  },
  {
    id: 'p03-pipe55', page: 'p03',
    // 路由族键为 pipe（pipe55 是 dataFamily；首跑误写 family=pipe55 → readFamily null
    // 降级「请先选型」，勘正见 README A4 节）
    hash: '#/p03?family=pipe&spec=G1%2F2&d=20.955&p=1.8142857142857143',
    sel: P03_SEL, shot: 'p03-pipe55-390x844',
    contains: ['P 1.814', 'α 55°'],
  },
  {
    id: 'p03-worm', page: 'p03',
    hash: '#/p03?family=worm&spec=m2&d=2&p=2',
    sel: P03_SEL, shot: 'p03-worm-390x844',
    contains: ['px 6.283', 'h₁ 4.4', 'α 40°'],
    counts: { polyline: 1 },
  },
  {
    id: 'p03-sealpipe', page: 'p03',
    hash: '#/p03?family=sealpipe&spec=R1%2F2&d=20.955&p=1.8142857142857143',
    sel: P03_SEL, shot: 'p03-sealpipe-390x844',
    contains: ['基面', 'α 55°'],
    counts: { polyline: 1, line: 5 },
  },
  {
    id: 'p03-noparams', page: 'p03',
    hash: '#/p03', absentSel: P03_SEL, shot: 'p03-noparams-390x844',
  },

  // —— p11 六拍（B 卡：四形状 + 重绘 + 保帧）——
  {
    id: 'p11-round', page: 'p11',
    hash: '#/p11', sel: '.rc-p11__diagram', shot: 'p11-round-390x844',
    textsEq: ['D 50', 'L 100'],
    counts: { circle: 1, rect: 1, line: 4 },
  },
  {
    id: 'p11-hex', page: 'p11',
    click: { sel: '.rc-seg__item[data-value="hex"]' },
    sel: '.rc-p11__diagram', shot: 'p11-hex-390x844',
    textsEq: ['S 20', 'L 100'],
    counts: { polygon: 1, rect: 1, line: 4 },
    changeFrom: 'p11-round',
  },
  {
    id: 'p11-pipe', page: 'p11',
    click: { sel: '.rc-seg__item[data-value="pipe"]' },
    sel: '.rc-p11__diagram', shot: 'p11-pipe-390x844',
    textsEq: ['D 60', 't 5', 'L 100'],
    counts: { circle: 2, rect: 1, line: 5 },
    changeFrom: 'p11-hex',
  },
  {
    id: 'p11-plate', page: 'p11',
    click: { sel: '.rc-seg__item[data-value="plate"]' },
    sel: '.rc-p11__diagram', shot: 'p11-plate-390x844',
    textsEq: ['W 100', 'T 10', 'L 200'],
    counts: { polygon: 1, rect: 1, line: 3 },
    changeFrom: 'p11-pipe',
  },
  {
    id: 'p11-redraw', page: 'p11',
    click: { sel: '.rc-seg__item[data-value="round"]' },
    set: { D: '80' },
    sel: '.rc-p11__diagram', shot: 'p11-redraw-d80-390x844',
    textsEq: ['D 80', 'L 100'],
    counts: { circle: 1, rect: 1, line: 4 },
  },
  {
    id: 'p11-keepframe', page: 'p11',
    click: { sel: '.rc-seg__item[data-value="pipe"]' },
    set: { t: '30' },
    sel: '.rc-p11__diagram', shot: 'p11-keepframe-t30-390x844',
    keepFrameFrom: 'p11-pipe',
    pageReady: `document.querySelector('.rc-p11__statcard .rc-stat')?.textContent.includes('—')`,
  },

  // —— p09 三拍（B 卡：默认 + 模式几何恒等 + 重绘）——
  {
    id: 'p09-default', page: 'p09',
    hash: '#/p09', sel: '.rc-p09__diagram', shot: 'p09-default-390x844',
    textsEq: ['⌀50', 'Vc 150', 'n 955 r/min'],
    counts: { circle: 1 },
    rAttr: 36,
  },
  {
    id: 'p09-mode', page: 'p09',
    click: { sel: '.rc-seg__item[data-value="vc"]' },
    sel: '.rc-p09__diagram', shot: 'p09-mode-vc-390x844',
    contains: ['Vc 150.0', 'n 955 r/min'],
    geoSameAs: 'p09-default',
  },
  {
    // vc 模式（输入=rpm 955，模式切换时自动换算自默认帧）：改 d=100 →
    // Vc=π×100×955/1000=300.02→'300.0'、n 显示输入值 955、r=min(40,36·50/100)=18
    id: 'p09-redraw', page: 'p09',
    set: { d: '100' },
    sel: '.rc-p09__diagram', shot: 'p09-redraw-d100-390x844',
    textsEq: ['⌀100', 'Vc 300.0', 'n 955 r/min'],
    counts: { circle: 1 },
    rAttr: 18,
  },

  // —— p10 一拍（C 卡：静态三要素）——
  {
    id: 'p10-static', page: 'p10',
    hash: '#/p10', sel: '.rc-p10__figurecard', shot: 'p10-static-390x844',
    textsEq: ['Vc', 'ap', 'f'],
    counts: { circle: 1, rect: 2 },
  },
];

function startChrome() {
  const profile = mkdtempSync(join(tmpdir(), 'lathcalc-pro-cdp-'));
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

/** svg text 集合 / 元素计数 / 主圆 r / outerHTML / 几何序列化 —— 全按拍内 sel 取。 */
const exprTexts = (sel) =>
  `[...document.querySelectorAll('${sel} svg text')].map((el) => el.textContent)`;
const exprCounts = (sel) => `(() => {
  const svg = document.querySelector('${sel} svg');
  if (!svg) return null;
  const out = {};
  for (const tag of ['circle', 'rect', 'polygon', 'polyline', 'path', 'line']) {
    out[tag] = svg.querySelectorAll(tag).length;
  }
  return out;
})()`;
const exprR = (sel) => `document.querySelector('${sel} svg circle')?.getAttribute('r')`;
const exprFrame = (sel) => `document.querySelector('${sel} svg')?.outerHTML`;
/** p09 几何恒等序列化：主圆 + 尺寸线几何字段 + Vc 箭头端点（不含文本）。 */
const exprGeo = (sel) => `(() => {
  const svg = document.querySelector('${sel} svg');
  if (!svg) return null;
  const c = svg.querySelector('circle');
  const lines = [...svg.querySelectorAll('line')].map((l) => l.getAttribute('points') ?? [l.getAttribute('x1'), l.getAttribute('y1'), l.getAttribute('x2'), l.getAttribute('y2')].join(','));
  return JSON.stringify({ r: c?.getAttribute('r'), cx: c?.getAttribute('cx'), cy: c?.getAttribute('cy'), lines });
})()`;

/** 输入驱动：文本框赋值 + input 事件；分段按钮点击。 */
function actExpr(entry) {
  const steps = [];
  if (entry.click) {
    steps.push(`(() => {
      const el = document.querySelector(${JSON.stringify(entry.click.sel)});
      if (!el) return 'missing:click';
      el.click();
      return 'ok';
    })()`);
  }
  for (const [name, value] of Object.entries(entry.set ?? {})) {
    steps.push(`(() => {
      const el = document.querySelector('input[name="${name}"]');
      if (!el) return 'missing:${name}';
      el.value = ${JSON.stringify(String(value))};
      el.dispatchEvent(new Event('input', { bubbles: true }));
      return 'ok';
    })()`);
  }
  if (steps.length === 0) return null;
  return `(async () => { for (const s of [${steps.join(',')}]) { const r = await s; if (r !== 'ok') return r; } return 'ok'; })()`;
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  // 前置纪律：打印 dist bundle hash（preview serve 一致性由启动流程人工核对）
  try {
    const assets = readdirSync(join(process.cwd(), 'dist', 'assets'));
    const indexJs = assets.filter((f) => /^index-.*\.js$/.test(f));
    console.log(`[precheck] dist/assets index bundle: ${indexJs.join(', ') || '(none)'}`);
  } catch {
    console.log('[precheck] dist/assets 不可读——未 build？A4 前必须 npm run build（V4.8-R2 教训）');
  }

  const scenarios = SCENARIOS.filter((entry) => PAGES.includes(entry.page));
  const { child, profile } = startChrome();
  const started = Date.now();
  const shots = [];
  const checks = [];
  const frameSig = new Map();
  const geoSig = new Map();
  const textsSig = new Map();
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

    let currentPage = '';
    for (const entry of scenarios) {
      if (entry.hash) {
        await evaluate(c, `location.hash = ${JSON.stringify(entry.hash)}; true`);
        await waitFor(c, `document.querySelector('.la-page')?.dataset.page === ${JSON.stringify(entry.page)}`, `${entry.id} page`);
        currentPage = entry.page;
      } else if (currentPage !== entry.page) {
        throw new Error(`${entry.id} 跨页无 hash 导航（当前 ${currentPage}）`);
      }

      const act = actExpr(entry);
      if (act) {
        const result = await evaluate(c, act);
        if (result !== 'ok') throw new Error(`${entry.id} 输入失败：${result}`);
      }

      let texts;
      if (entry.absentSel) {
        // 无图断言（p03 无参）：选择器必须不存在
        if (await evaluate(c, `!!document.querySelector(${JSON.stringify(entry.absentSel)})`)) {
          throw new Error(`${entry.id} 应无图卡但 ${entry.absentSel} 存在`);
        }
        checks.push({ id: entry.id, absent: entry.absentSel });
      } else {
        await waitFor(c, `!!document.querySelector(${JSON.stringify(`${entry.sel} svg`)})`, `${entry.id} svg`);
        if (entry.pageReady) {
          await waitFor(c, entry.pageReady, `${entry.id} pageReady`);
        }
        texts = await evaluate(c, exprTexts(entry.sel));

        if (entry.textsEq) {
          const expected = JSON.stringify([...entry.textsEq].sort());
          if (JSON.stringify([...texts].sort()) !== expected) {
            throw new Error(`${entry.id} 标签集不符：${JSON.stringify(texts)} ≠ ${expected}`);
          }
        }
        if (entry.contains) {
          for (const fragment of entry.contains) {
            if (!texts.some((text) => text.includes(fragment))) {
              throw new Error(`${entry.id} 标签缺「${fragment}」：${JSON.stringify(texts)}`);
            }
          }
        }
        if (entry.counts) {
          const counts = await evaluate(c, exprCounts(entry.sel));
          for (const [tag, n] of Object.entries(entry.counts)) {
            if (counts?.[tag] !== n) {
              throw new Error(`${entry.id} ${tag} 计数不符：${counts?.[tag]} ≠ ${n}（全量 ${JSON.stringify(counts)}）`);
            }
          }
        }
        if (entry.rAttr) {
          const r = await evaluate(c, exprR(entry.sel));
          if (Number(r) !== entry.rAttr) throw new Error(`${entry.id} 主圆 r=${r} ≠ ${entry.rAttr}`);
        }
        if (entry.changeFrom) {
          const ref = textsSig.get(entry.changeFrom);
          if (!ref || JSON.stringify(texts) === JSON.stringify(ref)) {
            throw new Error(`${entry.id} 图形未随输入变化`);
          }
        }
        if (entry.keepFrameFrom) {
          const ref = frameSig.get(entry.keepFrameFrom);
          const now = await evaluate(c, exprFrame(entry.sel));
          if (!ref || now !== ref) {
            throw new Error(`${entry.id} 未保上一帧（svg outerHTML 变化）`);
          }
        }
        if (entry.geoSameAs) {
          const ref = geoSig.get(entry.geoSameAs);
          const now = await evaluate(c, exprGeo(entry.sel));
          if (!ref || now !== ref) {
            throw new Error(`${entry.id} 几何不恒等（模式切换不得改几何，V4.9-01）`);
          }
        }

        frameSig.set(entry.id, await evaluate(c, exprFrame(entry.sel)));
        geoSig.set(entry.id, await evaluate(c, exprGeo(entry.sel)));
        textsSig.set(entry.id, texts);
        checks.push({ id: entry.id, texts, textsEq: Boolean(entry.textsEq), keptFrame: Boolean(entry.keepFrameFrom), geoSame: Boolean(entry.geoSameAs) });
      }

      const shot = entry.shot;
      await screenshot(c, join(OUT_DIR, `${shot}.png`));
      shots.push(shot);
    }

    const elapsed = Date.now() - started;
    const report = {
      ok: elapsed <= BUDGET_MS && c.events.exceptions.length === 0 && c.events.consoleErrors.length === 0,
      ms: elapsed,
      budgetMs: BUDGET_MS,
      pages: PAGES,
      shots,
      checks,
      exceptions: c.events.exceptions.length,
      consoleErrors: c.events.consoleErrors.length,
    };
    writeFileSync(join(OUT_DIR, 'verify-pro.json'), JSON.stringify(report, null, 2));
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
