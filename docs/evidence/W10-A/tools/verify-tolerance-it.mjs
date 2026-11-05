#!/usr/bin/env node
/**
 * W10-A · tolerance-it.json 双源逐格复核（自含脚本）
 *
 * 复核对象：src/data/tolerance-it.json（21 段）
 * 源值记录：docs/evidence/W10-A/runs/source-values.json
 *   （由 extract-sources.mjs 从两份原始快照解析生成；A/B 各自独立列）
 *
 * 口径：
 *   ≤500 段（前 13 段）复核 IT5–IT12（W3-C4 冻结范围，本次不改）；
 *   >500 段（后 8 段）复核两源交集 IT1–IT18（GB 表注：>500 的 IT1–IT5 为试行）。
 *   左开右闭 (lo,hi]；任一差异退出码 1。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const treeRoot = path.resolve(here, '../../../..');
const dataPath = path.join(treeRoot, 'src/data/tolerance-it.json');
const sourcePath = path.join(here, '..', 'runs', 'source-values.json');

const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const sources = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));

const GRADE_LABELS = Array.from({ length: 18 }, (_, i) => `IT${i + 1}`);
let failures = 0;

console.log('W10-A dual-source verify · tolerance-it.json');
console.log(`data: ${path.relative(treeRoot, dataPath)}`);
console.log(`source record: ${path.relative(treeRoot, sourcePath)}`);
console.log(`segments in data: ${data.length} | segments in source record: ${sources.segments.length}`);
console.log('');

if (data.length !== 21) {
  failures += 1;
  console.log(`FAIL: expected 21 segments, got ${data.length}`);
}
if (sources.segments.length !== 21) {
  failures += 1;
  console.log(`FAIL: expected 21 source segments, got ${sources.segments.length}`);
}

// 段界连续覆盖 (0,3150]。
for (let i = 1; i < data.length; i += 1) {
  if (data[i].segment[0] !== data[i - 1].segment[1]) {
    failures += 1;
    console.log(`FAIL: segment ${i} lo=${data[i].segment[0]} != previous hi=${data[i - 1].segment[1]}`);
  }
}
if (data[0]?.segment[0] !== 0 || data[data.length - 1]?.segment[1] !== 3150) {
  failures += 1;
  console.log('FAIL: segment coverage must start at 0 and end at 3150');
}

let cells = 0;
for (const src of sources.segments) {
  const row = data.find((r) => r.segment[0] === src.lo && r.segment[1] === src.hi);
  if (!row) {
    failures += 1;
    console.log(`FAIL: missing segment (${src.lo},${src.hi}]`);
    continue;
  }
  const isUpper = src.hi > 500;
  const from = isUpper ? 0 : 4; // IT1.. vs IT5..
  const to = isUpper ? 18 : 12; // IT12 inclusive for ≤500
  const pairs = [];
  let segDiff = 0;
  for (let i = from; i < to; i += 1) {
    cells += 1;
    const grade = i + 1;
    const a = src.a[i];
    const b = src.b[i];
    const d = row.values[grade];
    if (a !== b || b !== d) {
      segDiff += 1;
      failures += 1;
      pairs.push(`${GRADE_LABELS[i]}: A=${a} B=${b} data=${d} DIFF`);
    }
  }
  const gradeRange = `${GRADE_LABELS[from]}–${GRADE_LABELS[to - 1]}`;
  console.log(
    `(${src.lo},${src.hi}]`.padEnd(14) +
      ` ${gradeRange.padEnd(9)} ${to - from} grades × 3 = ${(to - from) * 3} comparisons, ${segDiff} diffs`,
  );
  for (const line of pairs) console.log(`  ${line}`);
}

console.log('');
console.log(`A vs B vs data: ${cells} cells (${cells * 3} comparisons), ${failures} diffs/failures`);
console.log(`RESULT: ${failures === 0 ? 'PASS' : 'FAIL'}`);
process.exit(failures === 0 ? 0 : 1);
