/**
 * W6-C4 证据档汇总脚本（附录 G：判定行由脚本计算生成，人工只解读不计算）。
 * 读取 runs/<gate>.log 的 REAL_EXIT 字段，输出 runs/summary.log。
 * 用法（仓库根目录）：node docs/evidence/W6-C4/summarize.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const runs = join(here, 'runs');

const GATES = [
  ['tsc', 'npx tsc --noEmit'],
  ['vitest', 'npx vitest run --maxWorkers=2'],
  ['build', 'npm run build'],
];

const lines = [];
let allPass = true;

for (const [file, command] of GATES) {
  let exit = 'MISSING';
  try {
    const log = readFileSync(join(runs, `${file}.log`), 'utf8');
    const match = /REAL_EXIT=(\d+)/.exec(log);
    if (match) exit = match[1];
  } catch {
    // 缺档按失败计
  }
  const pass = exit === '0';
  allPass = allPass && pass;
  lines.push(`GATE ${file} | ${command} | REAL_EXIT=${exit} | ${pass ? 'PASS' : 'FAIL'}`);
}

lines.push(`JUDGMENT | ${allPass ? 'ALL GATES PASS (exit 0)' : 'GATE FAILURE'}`);
const summary = `${lines.join('\n')}\n`;
writeFileSync(join(runs, 'summary.log'), summary, 'utf8');
process.stdout.write(summary);
if (!allPass) process.exitCode = 1;
