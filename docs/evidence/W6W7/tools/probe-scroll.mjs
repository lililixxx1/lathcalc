#!/usr/bin/env node
/** W7 · p09 修复验证（one-off）：overflow-y 是否生效 + 滚动后键盘末行是否可达。 */
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const URL_TO_TEST = process.argv[2] ?? 'http://localhost:4173/';
const CHROME = process.env.CHROME ?? 'chrome';
const DEBUG_PORT = Number(process.env.CDP_PORT ?? 9335);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const profile = mkdtempSync(join(tmpdir(), 'lathcalc-scroll-'));
const child = spawn(
  CHROME,
  ['--headless=new', `--remote-debugging-port=${DEBUG_PORT}`, '--remote-debugging-address=127.0.0.1',
   `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--hide-scrollbars', 'about:blank'],
  { stdio: 'ignore' },
);

async function main() {
  let page;
  for (let i = 0; i < 100 && !page; i += 1) {
    try {
      const t = await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`)).json();
      page = t.find((x) => x.type === 'page' && x.webSocketDebuggerUrl);
    } catch { /* 未监听 */ }
    if (!page) await sleep(100);
  }
  if (!page) throw new Error('CDP timeout');
  const socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res, rej) => { socket.addEventListener('open', res, { once: true }); socket.addEventListener('error', rej, { once: true }); });
  let nextId = 0;
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++nextId;
    const onMessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id === id) { socket.removeEventListener('message', onMessage); msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result); }
    };
    socket.addEventListener('message', onMessage);
    socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
    return r.result.value;
  };

  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await evaluate(`location.href = ${JSON.stringify(URL_TO_TEST)}; true`);
  for (let i = 0; i < 100; i += 1) {
    if (await evaluate(`!!document.querySelector('.la-page[data-page="p01"]')`).catch(() => false)) break;
    await sleep(100);
  }
  await evaluate(`location.hash = '#/p09?d=50&vc=150&f=0.2'; true`);
  await sleep(600);

  const before = await evaluate(`(() => {
    const body = document.querySelector('.la-body');
    const key0 = [...document.querySelectorAll('.rc-keypad__key')].find((k) => k.dataset.key === '0');
    return {
      overflowY: getComputedStyle(body).overflowY,
      scrollTopBefore: body.scrollTop,
      key0BottomInViewport: key0.getBoundingClientRect().bottom,
      bodyRectBottom: body.getBoundingClientRect().bottom,
    };
  })()`);

  await evaluate(`document.querySelector('.la-body').scrollTo(0, 99999); true`);
  await sleep(150);
  const after = await evaluate(`(() => {
    const body = document.querySelector('.la-body');
    const key0 = [...document.querySelectorAll('.rc-keypad__key')].find((k) => k.dataset.key === '0');
    return {
      scrollTopAfter: body.scrollTop,
      key0BottomAfter: key0.getBoundingClientRect().bottom,
      bodyRectBottom: body.getBoundingClientRect().bottom,
      key0FullyVisibleAfterScroll: key0.getBoundingClientRect().bottom <= body.getBoundingClientRect().bottom + 0.5,
    };
  })()`);

  console.log(JSON.stringify({ before, after }, null, 2));
  socket.close();
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => {
  child.kill();
  setTimeout(() => { try { rmSync(profile, { recursive: true, force: true }); } catch { /* 锁 */ } }, 600);
});
