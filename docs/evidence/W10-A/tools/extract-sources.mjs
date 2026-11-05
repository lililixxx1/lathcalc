#!/usr/bin/env node
/**
 * W10-A · 双源抽取与逐格对拍（>500–3150 段）
 *
 * 源 A：GB/T 1800.3-1998《标准公差数值》公开转写（mechtool.cn）
 *       https://www.mechtool.cn/drawingandaccuracy/drawingandaccuracy_standardtolerancevalues.html
 * 源 B：ISO 286-1:2010 Table 1 表值实现（thefhiter/tolerance-handbook js/engine/iso286.js）
 *       https://raw.githubusercontent.com/thefhiter/tolerance-handbook/main/js/engine/iso286.js
 *
 * 用法：node docs/evidence/W10-A/tools/extract-sources.mjs <source-a.html> <source-b.js>
 * 输入为抓取的原始快照（不随仓库分发；URL + SHA-256 见 runs/source-extraction.txt）。
 * 输出：>500 段逐格 A/B 值 + 差异计数；≤500 段 IT5–IT12 作源保真度旁证；
 *       任一差异退出码 1。
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const [srcAPath, srcBPath] = process.argv.slice(2);
if (!srcAPath || !srcBPath) {
  console.error('usage: node extract-sources.mjs <source-a.html> <source-b.js>');
  process.exit(2);
}

const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

/* ---------- 源 A：HTML 表 ---------- */
const html = fs.readFileSync(srcAPath, 'utf8');
const htmlBuf = fs.readFileSync(srcAPath);
const A_ROWS = [];
const rowRe = /<tr><td>([0-9]+|－)<\/td><td>([0-9]+)<\/td>((?:<td>[^<]*<\/td>)+)<\/tr>/g;
let match;
while ((match = rowRe.exec(html)) !== null) {
  const lo = match[1] === '－' ? 0 : Number(match[1]);
  const hi = Number(match[2]);
  const cells = [...match[3].matchAll(/<td>([^<]*)<\/td>/g)].map((m) => m[1].trim());
  if (cells.length !== 18) continue; // 只要 IT1–IT18 主表
  if (!(lo >= 0 && hi <= 3150)) continue; // 排除 3150–10000 附表
  // 表头：IT1–IT11 单位 μm；IT12–IT18 单位 mm → 统一换算为 μm。
  const values = cells.map((cell, i) => {
    const n = Number(cell);
    return i >= 11 ? Math.round(n * 1000) : n;
  });
  A_ROWS.push({ lo, hi, values });
}
A_ROWS.sort((a, b) => a.hi - b.hi);

/* ---------- 源 B：ISO 286-1 表值实现 ---------- */
const js = fs.readFileSync(srcBPath, 'utf8');
const jsBuf = fs.readFileSync(srcBPath);
const mainMatch = /var MAIN = \[([^\]]+)\]/.exec(js);
const itMatch = /var IT = \[([\s\S]*?)\n  \];/.exec(js);
if (!mainMatch || !itMatch) {
  console.error('PANIC: cannot locate MAIN/IT in source B');
  process.exit(2);
}
const B_MAIN = mainMatch[1].split(',').map((s) => Number(s.trim()));
const B_ROWS = itMatch[1]
  .trim()
  .split('\n')
  .map((line) => JSON.parse(line.trim().replace(/,$/, '')));

/** B 行索引：主段上界 <= MAIN[i] 的首个 i。 */
const bRowOf = (hi) => B_ROWS[B_MAIN.findIndex((m) => hi <= m)];

console.log('W10-A extraction · >500–3150 IT values');
console.log(`source A: ${srcAPath}`);
console.log(`  sha256: ${sha256(htmlBuf)}`);
console.log(`  rows parsed: ${A_ROWS.length}`);
console.log(`source B: ${srcBPath}`);
console.log(`  sha256: ${sha256(jsBuf)}`);
console.log(`  MAIN segments: ${B_MAIN.length}, IT rows: ${B_ROWS.length}`);
console.log('');

let diffs = 0;

/* 源保真度旁证：≤500 段 IT5–IT12（A 列 4..11 ↔ B 列 6..13）。 */
let sanityCells = 0;
for (const a of A_ROWS.filter((r) => r.hi <= 500)) {
  const b = bRowOf(a.hi);
  for (let i = 0; i < 8; i += 1) {
    sanityCells += 1;
    const av = a.values[4 + i];
    const bv = b[6 + i];
    if (av !== bv) {
      diffs += 1;
      console.log(`SANITY DIFF (${a.lo},${a.hi}] IT${5 + i}: A=${av} B=${bv}`);
    }
  }
}
console.log(`sanity ≤500 × IT5–IT12: ${sanityCells} cells, ${diffs} diffs`);
console.log('');

/* 目标：>500 段 IT1–IT18（A 列 0..17 ↔ B 列 2..19）。 */
console.log('segment        ' + ['IT1', 'IT2', 'IT3', 'IT4', 'IT5', 'IT6', 'IT7', 'IT8', 'IT9', 'IT10', 'IT11', 'IT12', 'IT13', 'IT14', 'IT15', 'IT16', 'IT17', 'IT18'].join(' '));
let targetCells = 0;
for (const a of A_ROWS.filter((r) => r.hi > 500)) {
  const b = bRowOf(a.hi);
  const out = [];
  for (let i = 0; i < 18; i += 1) {
    targetCells += 1;
    const av = a.values[i];
    const bv = b[2 + i];
    if (av !== bv) {
      diffs += 1;
      out.push(`${av}!=${bv}`);
    } else {
      out.push(String(av));
    }
  }
  console.log(`(${a.lo},${a.hi}]`.padEnd(14) + out.join(' '));
}
console.log('');
console.log(`target >500 × IT1–IT18: ${targetCells} cells, ${diffs} cumulative diffs`);
console.log(`RESULT: ${diffs === 0 ? 'PASS' : 'FAIL'}`);

/* 规范化源记录：供 verify-tolerance-it.mjs 离线复核（A/B 各自独立列）。 */
const normalized = {
  generatedFrom: {
    sourceA: {
      url: 'https://www.mechtool.cn/drawingandaccuracy/drawingandaccuracy_standardtolerancevalues.html',
      sha256: sha256(htmlBuf),
      note: 'GB/T 1800.3-1998《标准公差数值》公开转写；IT1–IT11 μm，IT12–IT18 mm（已换算为 μm）；>500 段 IT1–IT5 为试行',
    },
    sourceB: {
      url: 'https://raw.githubusercontent.com/thefhiter/tolerance-handbook/main/js/engine/iso286.js',
      sha256: sha256(jsBuf),
      note: 'ISO 286-1:2010 Table 1 表值实现（main/js/engine/iso286.js）；列 IT01,IT0,IT1…IT18，IT01/IT0 >500 未定义',
    },
  },
  segments: A_ROWS.map((a) => {
    const b = bRowOf(a.hi);
    return {
      lo: a.lo,
      hi: a.hi,
      a: a.values, // IT1–IT18
      b: b.slice(2), // IT1–IT18（去掉 IT01/IT0 两列）
    };
  }),
};
const outPath = path.join(here, '..', 'runs', 'source-values.json');
fs.writeFileSync(outPath, `${JSON.stringify(normalized, null, 2)}\n`, 'utf8');
console.log(`normalized source record: ${path.relative(path.join(here, '..', '..', '..', '..'), outPath)}`);

process.exit(diffs === 0 ? 0 : 1);
