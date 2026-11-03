#!/usr/bin/env node
/** 一次性：截 p07 默认态（计算 tab）390×844 —— A4 告警闭环用 */
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const URL = process.argv[2];
const OUT = process.argv[3];
const CHROME = process.env.CHROME ?? 'chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const profile = mkdtempSync(join(tmpdir(), 'shot1-'));
const child = spawn(CHROME, ['--headless=new', '--remote-debugging-port=9336', `--user-data-dir=${profile}`, '--no-first-run', '--disable-gpu', '--hide-scrollbars', '--window-size=390,844', 'about:blank'], { stdio: 'ignore' });
try {
  for (let i = 0; i < 100; i++) {
    try {
      const r = await fetch('http://127.0.0.1:9336/json/list');
      if ((await r.json()).some((x) => x.type === 'page')) break;
    } catch { /* retry */ }
    await sleep(100);
  }
  const r = await fetch('http://127.0.0.1:9336/json/list');
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
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await send('Page.navigate', { url: URL });
  for (let i = 0; i < 50; i++) {
    try {
      const ok = await send('Runtime.evaluate', { expression: `!!document.querySelector('.la-page')`, returnByValue: true });
      if (ok.result.value) break;
    } catch { /* retry */ }
    await sleep(100);
  }
  await sleep(300);
  const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  writeFileSync(OUT, Buffer.from(shot.data, 'base64'));
  console.log('written', OUT);
} finally {
  child.kill();
  try { rmSync(profile, { recursive: true, force: true }); } catch { /* ignore */ }
}
