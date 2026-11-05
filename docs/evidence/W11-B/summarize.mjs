#!/usr/bin/env node
/**
 * W11-B 证据汇总：读取 runs/*.txt 的 REAL_EXIT / VERDICT / vitest 计数，生成判定行
 * （附录 G：判定行由脚本计算，人工只解读不计算）。
 */
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const runsDir = fileURLToPath(new URL('./runs/', import.meta.url));
const stripAnsi = (text) => text.replace(/\u001b\[[0-9;]*m/g, '');

const files = readdirSync(runsDir)
  .filter((name) => name.endsWith('.txt') && name !== '09-summary.txt') // 自引用排除
  .sort();
const read = (name) => stripAnsi(readFileSync(`${runsDir}/${name}`, 'utf8'));

const gates = ['01-tsc.txt', '02-lint.txt', '03-vitest.txt', '04-build.txt'];
const gatesPass = gates.every((name) => {
  const matches = [...read(name).matchAll(/REAL_EXIT=(\d+)/g)];
  return matches.length > 0 && Number(matches.at(-1)[1]) === 0;
});

const vitest = read('03-vitest.txt');
const testFiles = vitest.match(/Test Files\s+(\d+) passed/);
const tests = vitest.match(/Tests\s+(\d+) passed/);
const recompute = read('07-recompute.txt').match(/VERDICT=(PASS|FAIL)/);
const writeScope = read('08-write-scope.txt').match(/VERDICT=(PASS|FAIL)/);

console.log('| 证据档 | REAL_EXIT / VERDICT |');
console.log('| --- | --- |');
for (const name of files) {
  const text = read(name);
  const exitMatches = [...text.matchAll(/REAL_EXIT=(\d+)/g)];
  const verdict = text.match(/VERDICT=(PASS|FAIL)(?:[^\n]*)/);
  const exit = exitMatches.length > 0 ? `REAL_EXIT=${exitMatches.at(-1)[1]}` : '';
  const mark = [exit, verdict ? verdict[0] : ''].filter(Boolean).join(' / ') || 'N/A';
  console.log(`| ${name} | ${mark} |`);
}
console.log('');
console.log(`VITEST=${testFiles ? `${testFiles[1]} files` : 'N/A'} / ${tests ? `${tests[1]} tests` : 'N/A'}`);
console.log(`RECOMPUTE=${recompute ? recompute[1] : 'N/A'}`);
console.log(`WRITE_SCOPE=${writeScope ? writeScope[1] : 'N/A'}`);

const allPass =
  gatesPass && recompute?.[1] === 'PASS' && writeScope?.[1] === 'PASS';
console.log(
  `VERDICT=${allPass ? 'PASS' : 'FAIL'}（四门禁 REAL_EXIT 全 0 = ${gatesPass}；锚点复算 = ${
    recompute ? recompute[1] : 'N/A'
  }；写范围 = ${writeScope ? writeScope[1] : 'N/A'}）`,
);
process.exit(allPass ? 0 : 1);
