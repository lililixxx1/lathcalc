/**
 * W6-C3 证据汇总脚本（附录 G：判定行由脚本计算，人工只解读不计算）
 *
 * 读取 runs/ 下三门禁原始档，提取 REAL_EXIT 与测试计数行，输出判定行。
 * 用法：node docs/evidence/W6-C3/tools/summarize.mjs
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const runsDir = fileURLToPath(new URL('../runs/', import.meta.url));

function readRun(name) {
  return readFileSync(join(runsDir, name), 'utf8');
}

function exitOf(text, name) {
  const match = text.match(/REAL_EXIT=(\d+)/);
  if (!match) throw new Error(`${name}: 缺 REAL_EXIT 行`);
  return Number(match[1]);
}

function countOf(text, pattern, name) {
  const match = text.match(pattern);
  if (!match) throw new Error(`gate2: 缺 ${name} 计数行`);
  return Number(match[1]);
}

const tsc = readRun('gate1-tsc.txt');
const vitest = readRun('gate2-vitest.txt');
const build = readRun('gate3-build.txt');

const tscExit = exitOf(tsc, 'gate1-tsc.txt');
const vitestExit = exitOf(vitest, 'gate2-vitest.txt');
const buildExit = exitOf(build, 'gate3-build.txt');
const fileCount = countOf(vitest, /Test Files\s+(\d+) passed/, 'Test Files');
const testCount = countOf(vitest, /Tests\s+(\d+) passed/, 'Tests');

const line =
  `gate1 tsc REAL_EXIT=${tscExit}` +
  ` ｜ gate2 vitest REAL_EXIT=${vitestExit}：${fileCount} files / ${testCount} tests passed` +
  ` ｜ gate3 build REAL_EXIT=${buildExit}`;

console.log(line);
console.log(`ALL_GATES_REAL_EXIT_ZERO=${[tscExit, vitestExit, buildExit].every((code) => code === 0)}`);
