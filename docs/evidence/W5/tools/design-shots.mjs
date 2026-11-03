#!/usr/bin/env node
/**
 * W5 · 设计稿侧截图工装：加载 docs/车工计算App-无限画布.html，
 * 对 14 个 .design-page（390×844）逐个 clip 截图，产出 A4 对拍的设计侧基准图。
 *
 * 用法：node docs/evidence/W5/tools/design-shots.mjs <canvasUrl> <outDir>
 *   CHROME 环境变量可指定浏览器；默认 chrome。
 */
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const URL_TO_TEST = process.argv[2];
const OUT_DIR = process.argv[3] ?? 'docs/evidence/W5/runs';
const CHROME = process.env.CHROME ?? 'chrome';
const DEBUG_PORT = Number(process.env.CDP_PORT ?? 9334);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function startChrome() {
  const profile = mkdtempSync(join(tmpdir(), 'lathcalc-w5-dsgn-'));
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
      '--window-size=1600,1000',
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
      /* 未就绪 */
    }
    await sleep(100);
  }
  throw new Error('CDP target timeout');
}

function connect(webSocketUrl) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(webSocketUrl);
    const pending = new Map();
    let nextId = 0;
    socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      if (message.id && pending.has(message.id)) {
        const { resolve: resolvePending, reject: rejectPending } = pending.get(message.id);
        pending.delete(message.id);
        if (message.error) rejectPending(new Error(message.error.message));
        else resolvePending(message.result);
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

async function main() {
  const { child, profile } = startChrome();
  let client;
  try {
    const target = await waitForTarget();
    client = await connect(target.webSocketDebuggerUrl);
    await client.send('Page.enable');
    await client.send('Runtime.enable');
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 1600,
      height: 1000,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await client.send('Page.navigate', { url: URL_TO_TEST });

    // 等画布 JS 生成全部 .design-page
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const count = await evaluate(client, `document.querySelectorAll('.design-page').length`);
      if (count >= 14) break;
      await sleep(100);
    }
    // 诊断教训（首跑全黑）：viewport overflow:hidden 且无滚动，clip 超出视口的内容
    // 不会被栅格化。改为逐页把 world 平移使目标页进入视口 (20,20)，再在视口内 clip。
    await evaluate(client, `(() => {
      const world = document.getElementById('world');
      world.style.transition = 'none';
      return true;
    })()`);

    const manifest = [];
    for (let index = 0; index < 14; index += 1) {
      const placed = await evaluate(client, `(() => {
        const pages = [];
        document.querySelectorAll('.canvas-el').forEach((el) => {
          const design = el.querySelector(':scope > .design-page');
          if (!design) return;
          const r = design.getBoundingClientRect();
          if (Math.round(r.width) === 390 && Math.round(r.height) === 844) pages.push(design);
        });
        const design = pages[${index}];
        if (!design) return { found: false };
        const world = document.getElementById('world');
        const m = new DOMMatrix(getComputedStyle(world).transform);
        const r = design.getBoundingClientRect();
        // 新平移 = 旧平移 + (目标 20,20 − 当前矩形原点)
        world.style.transform = 'translate(' + (m.e + 20 - r.x) + 'px, ' + (m.f + 20 - r.y) + 'px)';
        return { found: true };
      })()`);
      if (!placed.found) throw new Error(`design-page #${index + 1} 未找到`);
      await sleep(80); // 等重排/重绘
      const label = await evaluate(client, `(() => {
        const design = [...document.querySelectorAll('.design-page')].find((el) => {
          const r = el.getBoundingClientRect();
          // 目标页被平移到精确 (20,20)；同列邻页同 x 不同 y，须双坐标锁定
          return Math.round(r.x) === 20 && Math.round(r.y) === 20 && Math.round(r.width) === 390;
        });
        return design?.parentElement?.querySelector(':scope .page-label')?.textContent?.trim() ?? '';
      })()`);
      const shot = await client.send('Page.captureScreenshot', {
        format: 'png',
        clip: { x: 20, y: 20, width: 390, height: 844, scale: 1 },
        captureBeyondViewport: false,
      });
      const name = `design-p${String(index + 1).padStart(2, '0')}-390x844.png`;
      writeFileSync(join(OUT_DIR, name), Buffer.from(shot.data, 'base64'));
      manifest.push({ file: name, label });
    }
    console.log(JSON.stringify({ ok: true, count: manifest.length, manifest }, null, 2));
  } catch (error) {
    console.error(String(error));
    process.exitCode = 1;
  } finally {
    try { client?.close(); } catch { /* 已关 */ }
    child.kill();
    try { rmSync(profile, { recursive: true, force: true }); } catch { /* 忽略 */ }
  }
}

main();
