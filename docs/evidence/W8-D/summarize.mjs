#!/usr/bin/env node
/**
 * W8-D 门禁判定行生成器（附录 G：判定行由脚本计算，人工只解读不计算）。
 * 只读取 runs/gate-*.txt 中的 REAL_EXIT 字段；缺失即判 MISSING/FAIL。
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const gates = [
  ['lint', 'npm run lint', 'gate-lint.txt'],
  ['tsc', 'npx tsc --noEmit', 'gate-tsc.txt'],
  ['vitest', 'npx vitest run --maxWorkers=2', 'gate-vitest.txt'],
  ['build', 'npm run build', 'gate-build.txt'],
];

let allPass = true;
for (const [name, command, file] of gates) {
  const text = readFileSync(join(here, 'runs', file), 'utf8');
  const match = text.match(/^REAL_EXIT=(\d+)$/m);
  const code = match ? Number(match[1]) : Number.NaN;
  const pass = code === 0;
  if (!pass) allPass = false;
  console.log(
    `GATE ${name} | ${command} | REAL_EXIT=${Number.isNaN(code) ? 'MISSING' : code} | ${pass ? 'PASS' : 'FAIL'}`,
  );
}
console.log(`JUDGMENT | ${allPass ? 'ALL GATES PASS (exit 0)' : 'GATE FAILURE'}`);
process.exitCode = allPass ? 0 : 1;
