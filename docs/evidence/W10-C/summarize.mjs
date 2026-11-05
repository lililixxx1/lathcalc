#!/usr/bin/env node
/**
 * W10-C 证据汇总：读取 runs/*.txt 的 REAL_EXIT，生成判定行（附录 G：判定行由脚本计算，
 * 人工只解读不计算）。同时从 vitest 档提取 Test Files / Tests 计数。
 */
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const runsDir = fileURLToPath(new URL('./runs/', import.meta.url));
const stripAnsi = (text) => text.replace(/\u001b\[[0-9;]*m/g, '');
const files = readdirSync(runsDir)
  .filter((name) => name.endsWith('.txt') && name !== '05-summary.txt')
  .sort();

const rows = [];
let allZero = true;
for (const name of files) {
  const text = stripAnsi(readFileSync(`${runsDir}/${name}`, 'utf8'));
  const exitMatches = [...text.matchAll(/REAL_EXIT=(\d+)/g)];
  const exit = exitMatches.length > 0 ? Number(exitMatches.at(-1)[1]) : null;
  const isGate = /^(01|02|03|04)-/.test(name);
  if (isGate && exit !== 0) allZero = false;
  rows.push({ name, exit, isGate });
}

const vitest = stripAnsi(readFileSync(`${runsDir}/03-vitest.txt`, 'utf8'));
const testFiles = vitest.match(/Test Files\s+(\d+) passed/);
const tests = vitest.match(/Tests\s+(\d+) passed/);

console.log('| 证据档 | REAL_EXIT | 门禁 |');
console.log('| --- | --- | --- |');
for (const row of rows) {
  console.log(`| ${row.name} | ${row.exit === null ? 'N/A' : row.exit} | ${row.isGate ? '是' : '否'} |`);
}
console.log('');
console.log(`VITEST=${testFiles ? `${testFiles[1]} files` : 'N/A'} / ${tests ? `${tests[1]} tests` : 'N/A'}`);
console.log(`VERDICT=${allZero ? 'PASS' : 'FAIL'}（四门禁 REAL_EXIT 全 0 = ${allZero}）`);
process.exit(allZero ? 0 : 1);
