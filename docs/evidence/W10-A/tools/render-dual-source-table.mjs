#!/usr/bin/env node
/**
 * W10-A · 生成 >500–3150 双源核对表（Markdown）
 * 输入：runs/source-values.json + src/data/tolerance-it.json
 * 输出：docs/evidence/W10-A/dual-source-table.md
 * 单元格 = A/B（μm）；入库值须同时等于 A 与 B，否则标 DIFF。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const treeRoot = path.resolve(here, '../../../..');
const sources = JSON.parse(fs.readFileSync(path.join(here, '..', 'runs', 'source-values.json'), 'utf8'));
const data = JSON.parse(fs.readFileSync(path.join(treeRoot, 'src/data/tolerance-it.json'), 'utf8'));

const labels = Array.from({ length: 18 }, (_, i) => `IT${i + 1}`);
let lines = [];
lines.push('# W10-A · >500–3150 段双源核对表');
lines.push('');
lines.push('> 单元格 = `A/B`（源 A 值 / 源 B 值，μm）；入库值 = `src/data/tolerance-it.json` 对应格。');
lines.push('> 源 A = GB/T 1800.3-1998《标准公差数值》公开转写（mechtool.cn）；源 B = ISO 286-1:2010 Table 1 表值实现（thefhiter/tolerance-handbook `iso286.js`）。');
lines.push('> 两源值相同且等于入库值时记 `A/B`，否则记 `A/B/DIFF`。一致性列 = 本段 18 格中三向一致数。');
lines.push('');
lines.push(`| 段 (lo,hi] | ${labels.join(' | ')} | 一致性 |`);
lines.push(`| --- | ${labels.map(() => '---:').join(' | ')} | --- |`);

let totalCells = 0;
let totalOk = 0;
for (const src of sources.segments) {
  if (src.hi <= 500) continue;
  const row = data.find((r) => r.segment[0] === src.lo && r.segment[1] === src.hi);
  const cells = [];
  let ok = 0;
  for (let i = 0; i < 18; i += 1) {
    const a = src.a[i];
    const b = src.b[i];
    const d = row?.values[i + 1];
    const same = a === b && b === d;
    if (same) ok += 1;
    cells.push(same ? `${a}/${b}` : `${a}/${b}/DIFF(${d})`);
    totalCells += 1;
  }
  totalOk += ok;
  lines.push(`| (${src.lo},${src.hi}] | ${cells.join(' | ')} | ${ok}/18 |`);
}
lines.push(`| **合计** | ${labels.map(() => '').join(' | ')} | **${totalOk}/${totalCells} 一致，${totalCells - totalOk} 差异** |`);
lines.push('');
lines.push('## 说明');
lines.push('');
lines.push('- >500 段两源共同覆盖 IT1–IT18（18 级）；GB/T 1800.3-1998 转写原表注「基本尺寸大于 500mm 的 IT1 至 IT5 的标准公差数值为试行」。');
lines.push('- 源 A 原表 IT12–IT18 以 mm 列出，本表已 ×1000 换算为 μm（如 0.7 mm → 700 μm）。');
lines.push('- 逐格原始输出：`runs/source-extraction.txt`（A/B 解析与对拍）、`runs/dual-source-verify.txt`（A/B/入库值三向）。');

const outPath = path.join(here, '..', 'dual-source-table.md');
fs.writeFileSync(outPath, `${lines.join('\n')}\n`, 'utf8');
console.log(`wrote ${path.relative(treeRoot, outPath)}: ${totalOk}/${totalCells} cells consistent`);
process.exit(totalOk === totalCells ? 0 : 1);
