#!/usr/bin/env node
/**
 * W4-C4 · 证据汇总（判定行由本脚本计算生成，人工只解读不计算）
 *
 * 读取 docs/evidence/W4-C4/runs/ 下：
 *   gate1-tsc.txt / gate2-vitest.txt / gate3-build.txt / measure-390.json / screenshot-pages.json
 * 输出 Markdown 摘要 + 判定行到 stdout（重定向为 runs/summary.txt）。
 * 任一 REAL_EXIT != 0、或 p07–p10 存在横向溢出 → 退出码 1。
 */

import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../../../', import.meta.url));
const RUNS = `${ROOT}docs/evidence/W4-C4/runs`;

const stripAnsi = (text) => text.replace(/\x1b\[[0-9;]*m/g, '');

function readRun(name) {
  const path = `${RUNS}/${name}`;
  if (!existsSync(path)) throw new Error(`missing run file: ${path}`);
  return readFileSync(path, 'utf8');
}

function exitOf(text, name) {
  const match = /REAL_EXIT=(\d+)\s*$/.exec(text.trim());
  if (!match) throw new Error(`missing REAL_EXIT in ${name}`);
  return Number(match[1]);
}

function lineCount(relativePath) {
  const text = readFileSync(`${ROOT}${relativePath}`, 'utf8');
  if (text === '') return 0;
  const newlines = (text.match(/\n/g) ?? []).length;
  return text.endsWith('\n') ? newlines : newlines + 1;
}

const gate1 = readRun('gate1-tsc.txt');
const gate2 = readRun('gate2-vitest.txt');
const gate3 = readRun('gate3-build.txt');
const measure = JSON.parse(readRun('measure-390.json'));
const screenshots = JSON.parse(readRun('screenshot-pages.json'));

const exit1 = exitOf(gate1, 'gate1-tsc.txt');
const exit2 = exitOf(gate2, 'gate2-vitest.txt');
const exit3 = exitOf(gate3, 'gate3-build.txt');

const plainGate2 = stripAnsi(gate2);
const testFiles = /Test Files\s+(\d+) passed \((\d+)\)/.exec(plainGate2);
const testCases = /Tests\s+(\d+) passed \((\d+)\)/.exec(plainGate2);

const pages = measure.pages.filter((page) => ['p07', 'p08', 'p09', 'p10'].includes(page.pageId));
const noOverflow = pages.every((page) => page.horizontalOverflow === false);
const shotPages = screenshots.shots
  .filter((shot) => ['p07', 'p08', 'p09', 'p10'].includes(shot.pageId))
  .map((shot) => `${shot.pageId}=${shot.documentElement.clientWidth}x${shot.documentElement.clientHeight}`);

const deliverables = [
  'src/ui/pages/p07.ts',
  'src/ui/pages/p08.ts',
  'src/ui/pages/p09.ts',
  'src/ui/pages/p10.ts',
  'test/ui-p07.test.ts',
  'test/ui-p08.test.ts',
  'test/ui-p09.test.ts',
  'test/ui-p10.test.ts',
];

const lines = [];
lines.push(`gate1 tsc REAL_EXIT=${exit1}`);
lines.push(`gate2 vitest REAL_EXIT=${exit2}：${testFiles?.[1] ?? '?'} files / ${testCases?.[1] ?? '?'} tests passed`);
lines.push(`gate3 build REAL_EXIT=${exit3}`);
lines.push(
  `measure-390 p07–p10：${pages
    .map((page) => `${page.pageId} scrollWidth=${page.documentElement.scrollWidth}=clientWidth=${page.documentElement.clientWidth} hOverflow=${page.horizontalOverflow}`)
    .join('；')}`,
);
lines.push(`allPagesNoHorizontalOverflow=${measure.allPagesNoHorizontalOverflow}`);
lines.push(`screenshots：${shotPages.join('、')}`);
lines.push('');
lines.push('| 交付物 | 行数 |');
lines.push('| --- | --- |');
for (const path of deliverables) {
  lines.push(`| \`${path}\` | ${lineCount(path)} |`);
}

const ok =
  exit1 === 0 &&
  exit2 === 0 &&
  exit3 === 0 &&
  noOverflow &&
  measure.allPagesNoHorizontalOverflow === true &&
  screenshots.allPagesNoHorizontalOverflow === true &&
  screenshots.allPageIdsMatch === true;

lines.push('');
lines.push(
  `判定：${ok ? '本卡证据自洽（门禁 3/3 绿；p07–p10 390×844 零横向溢出；截图 4 张）' : '存在异常，见上表'}；待 Lead G1 复验，本档不自称过审。`,
);

process.stdout.write(`${lines.join('\n')}\n`);
if (!ok) process.exitCode = 1;
