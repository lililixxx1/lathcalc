#!/usr/bin/env node
/** 诊断画布：页面矩形 / world·viewport transform / 滚动信息 */
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME = process.env.CHROME ?? 'chrome';
const URL = process.argv[2];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const profile = mkdtempSync(join(tmpdir(), 'probe-'));
const child = spawn(CHROME, ['--headless=new', '--remote-debugging-port=9335', `--user-data-dir=${profile}`, '--no-first-run', '--disable-gpu', '--window-size=1600,1000', 'about:blank'], { stdio: 'ignore' });
try {
  for (let i = 0; i < 100; i++) {
    try {
      const r = await fetch('http://127.0.0.1:9335/json/list');
      if ((await r.json()).some((x) => x.type === 'page')) break;
    } catch { /* retry */ }
    await sleep(100);
  }
  const r = await fetch('http://127.0.0.1:9335/json/list');
  const target = (await r.json()).find((x) => x.type === 'page');
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  let nextId = 0;
  const pending = new Map();
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); }
  });
  await new Promise((res) => ws.addEventListener('open', res, { once: true }));
  const send = (method, params = {}) => new Promise((res) => { const id = ++nextId; pending.set(id, res); ws.send(JSON.stringify({ id, method, params })); });
  await send('Page.enable');
  await send('Page.navigate', { url: URL });
  await sleep(3000);
  const expression = `(() => {
    const pages = [...document.querySelectorAll('.design-page')];
    const world = document.getElementById('world');
    const vp = document.getElementById('viewport');
    const first = pages[0];
    const r = first ? first.getBoundingClientRect() : null;
    const last = pages[pages.length - 1];
    const rl = last ? last.getBoundingClientRect() : null;
    return {
      pageCount: pages.length,
      worldTransform: getComputedStyle(world).transform,
      vpTransform: vp ? getComputedStyle(vp).transform : null,
      vpOverflow: vp ? getComputedStyle(vp).overflow : null,
      vpScroll: vp ? [vp.scrollLeft, vp.scrollTop, vp.clientWidth, vp.clientHeight] : null,
      firstRect: r ? [r.x, r.y, r.width, r.height] : null,
      lastRect: rl ? [rl.x, rl.y, rl.width, rl.height] : null,
      docSize: [document.documentElement.scrollWidth, document.documentElement.scrollHeight],
    };
  })()`;
  const info = await send('Runtime.evaluate', { expression, returnByValue: true });
  console.log(JSON.stringify(info.result.value, null, 2));
} finally {
  child.kill();
  try { rmSync(profile, { recursive: true, force: true }); } catch { /* ignore */ }
}
