/**
 * W8-A 证据档汇总脚本（Appendix G：判定行由脚本计算，人工只解读）
 *
 * 读取 runs/ 下四门禁原始输出，提取 REAL_EXIT 与 vitest 计数，生成 runs/summary.txt。
 * 复跑：node docs/evidence/W8-A/tools/summarize.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';

const RUNS = new URL('../runs/', import.meta.url);

const gates = [
  ['lint', 'gate1-lint.txt'],
  ['tsc', 'gate2-tsc.txt'],
  ['vitest', 'gate3-vitest.txt'],
  ['build', 'gate4-build.txt'],
];

const lines = ['W8-A GATE SUMMARY (script-generated; do not hand-edit)', ''];
let allPass = true;

for (const [name, file] of gates) {
  let text = '';
  try {
    text = readFileSync(new URL(file, RUNS), 'utf8');
  } catch {
    lines.push(`${name.padEnd(7)} FILE_MISSING (${file})`);
    allPass = false;
    continue;
  }
  const exitMatch = text.match(/REAL_EXIT=(\d+)\s*$/m);
  const exit = exitMatch ? Number(exitMatch[1]) : null;
  const pass = exit === 0;
  if (!pass) allPass = false;
  let extra = '';
  if (name === 'vitest') {
    const testCount = text.match(/Tests\s+(\d+) passed/)?.[1] ?? '?';
    const fileCount = text.match(/Test Files\s+(\d+) passed/)?.[1] ?? '?';
    extra = `  tests=${testCount} files=${fileCount}`;
  }
  lines.push(`${name.padEnd(7)} REAL_EXIT=${exit ?? 'MISSING'}  ${pass ? 'PASS' : 'FAIL'}${extra}`);
}

lines.push('', `JUDGMENT: ${allPass ? 'ALL_GATES_PASS' : 'GATES_FAILED'}`);

const out = lines.join('\n') + '\n';
writeFileSync(new URL('summary.txt', RUNS), out);
process.stdout.write(out);
