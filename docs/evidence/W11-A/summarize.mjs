#!/usr/bin/env node
/**
 * W11-A 判定行汇总（读取 runs/ 原始档，人工只解读不计算；附录 G）。
 *
 * 用法：node docs/evidence/W11-A/summarize.mjs [baselineTests]
 * 默认 baselineTests=510（V4.1 §0：W11 契约预置后基线 510 tests）。
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const runsDir = join(dirname(fileURLToPath(import.meta.url)), 'runs');
const baselineTests = Number(process.argv[2] ?? 510);

function read(name) {
  try {
    return readFileSync(join(runsDir, name), 'utf8');
  } catch {
    return '';
  }
}

function exitOf(text) {
  const match = text.match(/REAL_EXIT=(-?\d+)/);
  return match ? Number(match[1]) : null;
}

function numberAfter(text, pattern) {
  const match = text.match(pattern);
  return match ? Number(match[1]) : null;
}

const gateFiles = [
  ['tsc', '01-tsc.txt'],
  ['lint', '02-lint.txt'],
  ['vitest', '03-vitest.txt'],
  ['build', '04-build.txt'],
];
const gateResults = gateFiles.map(([name, file]) => [name, exitOf(read(file))]);
const gatesOk = gateResults.every(([, exit]) => exit === 0);

const vitest = read('03-vitest.txt');
const testFiles = numberAfter(vitest, /Test Files\s+(\d+) passed/);
const tests = numberAfter(vitest, /Tests\s+(\d+) passed/);
const testsOk = tests !== null && tests >= baselineTests;

const recompute = read('05-recompute.txt');
const recomputeOk = /VERDICT=PASS/.test(recompute);

const scope = read('06-write-scope.txt');
const scopeOk = /VERDICT=PASS/.test(scope);

const ok = gatesOk && testsOk && recomputeOk && scopeOk;

console.log(`GATES=${gateResults.map(([name, exit]) => `${name}:${exit ?? 'MISSING'}`).join(' ')}`);
console.log(`VITEST=${testFiles ?? '?'} files / ${tests ?? '?'} tests passed`);
console.log(`BASELINE_TESTS=${baselineTests}`);
console.log(`NEW_TESTS=${tests === null ? '?' : tests - baselineTests}`);
console.log(`RECOMPUTE=${recomputeOk ? 'PASS' : 'FAIL'}`);
console.log(`WRITE_SCOPE=${scopeOk ? 'PASS' : 'FAIL'}`);
console.log(`VERDICT=${ok ? 'PASS' : 'FAIL'}`);
process.exit(ok ? 0 : 1);
