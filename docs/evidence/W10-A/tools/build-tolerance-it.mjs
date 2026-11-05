#!/usr/bin/env node
/**
 * W10-A · 由双源规范化记录生成 tolerance-it.json 的 >500 段（8 段，IT1–IT18）。
 *
 * 输入：docs/evidence/W10-A/runs/source-values.json（extract-sources.mjs 产物）
 * 输出：src/data/tolerance-it.json（保留既有 13 行原文，仅在末尾追加；临时文件 + rename 原子替换）
 * 幂等：已存在同段时跳过；生成后由 verify-tolerance-it.mjs 逐格复核。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const treeRoot = path.resolve(here, '../../../..');
const dataPath = path.join(treeRoot, 'src/data/tolerance-it.json');
const sourcePath = path.join(here, '..', 'runs', 'source-values.json');

const sources = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
const SOURCE_LABEL =
  'GB/T 1800.1-2020 表1（IT 数值同 GB/T 1800.3-1998 / ISO 286-1:2010；>500 段 IT1–IT5 为试行）';

const raw = fs.readFileSync(dataPath, 'utf8');
const rows = JSON.parse(raw);
const existing = new Set(rows.map((r) => `${r.segment[0]},${r.segment[1]}`));
const additions = [];

for (const src of sources.segments) {
  if (src.hi <= 500) continue;
  if (existing.has(`${src.lo},${src.hi}`)) continue;
  const values = {};
  for (let i = 0; i < 18; i += 1) {
    if (src.a[i] !== src.b[i]) {
      throw new Error(`source mismatch at (${src.lo},${src.hi}] IT${i + 1}: ${src.a[i]} != ${src.b[i]}`);
    }
    values[i + 1] = src.a[i];
  }
  additions.push({ segment: [src.lo, src.hi], values, source: SOURCE_LABEL });
}

if (additions.length === 0) {
  console.log('no additions (idempotent)');
  process.exit(0);
}

const lines = rows.map((row) => `  ${JSON.stringify(row)}`);
for (const row of additions) lines.push(`  ${JSON.stringify(row)}`);
const next = `[\n${lines.join(',\n')}\n]\n`;

const tmpPath = `${dataPath}.tmp`;
fs.writeFileSync(tmpPath, next, 'utf8');
fs.renameSync(tmpPath, dataPath);
console.log(`appended ${additions.length} segments (IT1–IT18) -> ${path.relative(treeRoot, dataPath)}`);
