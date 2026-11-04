#!/usr/bin/env node
/**
 * W7 · A4 裁决辅助量测（one-off）：V2-A4-08（p09-f 键盘末行是否滚动可达）
 * 与 V2-A4-02（p02 默认态列表末行与容器底缘间距）。
 * 真实 390×844 视口（同 verify-w7.mjs Emulation 参数）下用 DOM Rect 量测。
 */
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const URL_TO_TEST = process.argv[2] ?? 'http://localhost:4173/';
const CHROME = process.env.CHROME ?? 'chrome';
const DEBUG_PORT = Number(process.env.CDP_PORT ?? 9335);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const profile = mkdtempSync(join(tmpdir(), 'lathcalc-probe-'));
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
    '--hide-scrollbars',
    'about:blank',
  ],
  { stdio: 'ignore' },
);

async function main() {
  let page;
  for (let i = 0; i < 100 && !page; i += 1) {
    try {
      const targets = await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`)).json();
      page = targets.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
    } catch { /* 未监听 */ }
    if (!page) await sleep(100);
  }
  if (!page) throw new Error('CDP timeout');

  const socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });
  let nextId = 0;
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = ++nextId;
      const onMessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.id === id) {
          socket.removeEventListener('message', onMessage);
          msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
        }
      };
      socket.addEventListener('message', onMessage);
      socket.send(JSON.stringify({ id, method, params }));
    });
  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.text);
    return r.result.value;
  };

  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await evaluate(`location.href = ${JSON.stringify(URL_TO_TEST)}; true`);
  for (let i = 0; i < 100; i += 1) {
    if (await evaluate(`!!document.querySelector('.la-page')`).catch(() => false)) break;
    await sleep(100);
  }

  // —— p09-f：键盘末行可见性与滚动可达性 ——
  await evaluate(`location.hash = '#/p09?d=50&vc=150&f=0.2'; true`);
  await sleep(400);
  const p09 = await evaluate(`(() => {
    const body = document.querySelector('.la-body');
    const keys = [...document.querySelectorAll('.rc-p09__key, .la-keypad button, button')];
    const keyRows = keys.map((k) => k.textContent.trim()).filter((t) => /^[0-9.]$/.test(t));
    const lastKey = [...keys].reverse().find((k) => /^0$/.test(k.textContent.trim()));
    const r = (el) => { const b = el.getBoundingClientRect(); return { top: +b.top.toFixed(1), bottom: +b.bottom.toFixed(1) }; };
    return {
      viewportH: innerHeight,
      bodyClientH: body.clientHeight,
      bodyScrollH: body.scrollHeight,
      bodyScrollable: body.scrollHeight > body.clientHeight,
      lastKeyRect: lastKey ? r(lastKey) : null,
      lastKeyInView: lastKey ? lastKey.getBoundingClientRect().bottom <= innerHeight : null,
      // 注意：first 轮此文件曾用「视口坐标 bottom 对比 clientHeight 高度值」误判末行被裁
      // （751.6 vs 727 属坐标系混用）；可见性判定必须对 body.getBoundingClientRect().bottom，
      // 见 probe-scroll.mjs 的正确口径（bodyRectBottom=824 > key0Bottom=751.6 → 完整可见）。
      lastKeyVisibleInBody: lastKey
        ? lastKey.getBoundingClientRect().bottom <= body.getBoundingClientRect().bottom + 0.5
        : null,
      bodyRectBottom: +body.getBoundingClientRect().bottom.toFixed(1),
    };
  })()`);

  // —— p02 默认态：列表末行与滚动容器底缘间距 ——
  await evaluate(`location.hash = '#/p02'; true`);
  await sleep(400);
  const p02 = await evaluate(`(() => {
    const body = document.querySelector('.la-body');
    const rows = [...document.querySelectorAll('.rc-p02__row, [class*="row"]')];
    const last = rows[rows.length - 1];
    const r = (el) => { const b = el.getBoundingClientRect(); return { top: +b.top.toFixed(1), bottom: +b.bottom.toFixed(1) }; };
    return {
      viewportH: innerHeight,
      bodyClientH: body.clientHeight,
      bodyScrollH: body.scrollHeight,
      bodyScrollTop: body.scrollTop,
      lastRowClass: last?.className ?? null,
      lastRowRect: last ? r(last) : null,
      gapLastRowToBodyBottom: last ? +(body.getBoundingClientRect().bottom - last.getBoundingClientRect().bottom).toFixed(1) : null,
    };
  })()`);

  console.log(JSON.stringify({ p09, p02 }, null, 2));
  socket.close();
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => {
  child.kill();
  setTimeout(() => { try { rmSync(profile, { recursive: true, force: true }); } catch { /* 锁未释放 */ } }, 600);
});
