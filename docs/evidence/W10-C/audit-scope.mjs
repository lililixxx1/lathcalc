#!/usr/bin/env node
/**
 * W10-C 写范围审计：以主仓基线 commit 的 tracked 文件清单为全集，逐文件与隔离树比对，
 * 断言除写范围内六文件 + docs/evidence/W10-C/ 外零差异（树内无 .git，故以主仓 ls-tree 为清单）。
 *
 * 用法：node docs/evidence/W10-C/audit-scope.mjs [baseline]
 * 默认 baseline=bd1d74d；主仓路径按树根同级目录 `CNC Machinist Calculator` 推导。
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const treeRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const mainRoot = resolve(treeRoot, '..', 'CNC Machinist Calculator');
const baseline = process.argv[2] ?? 'bd1d74d';

const allowed = new Set([
  'src/core/gcode.ts',
  'src/ui/pages/p04.ts',
  'src/ui/pages/p03.ts',
  'src/ui/README.md',
  'test/gcode.test.ts',
  'test/ui-p04.test.ts',
]);

const tracked = execFileSync('git', ['-C', mainRoot, 'ls-tree', '-r', '--name-only', baseline], {
  encoding: 'utf8',
})
  .split(/\r?\n/)
  .filter(Boolean);

// 主仓工作区为 LF、隔离树为 CRLF（建树/工具侧换行差异，非内容差异）：比对前统一为 LF
const sha = (buffer) =>
  createHash('sha256').update(buffer.toString('utf8').replace(/\r\n/g, '\n')).digest('hex');

const changed = [];
const missing = [];
for (const file of tracked) {
  if (file.startsWith('docs/evidence/W10-C/')) continue;
  let treeText;
  try {
    treeText = readFileSync(join(treeRoot, file));
  } catch {
    missing.push(file);
    continue;
  }
  // 主仓可能已被并行波次收获推进：一律取基线 commit 的 blob，不受工作区 HEAD 漂移影响
  let baselineText;
  try {
    baselineText = execFileSync('git', ['-C', mainRoot, 'show', `${baseline}:${file}`], {
      maxBuffer: 16 * 1024 * 1024,
    });
  } catch {
    missing.push(`${file} (baseline)`);
    continue;
  }
  if (sha(baselineText) !== sha(treeText)) changed.push(file);
}

const unexpected = changed.filter((file) => !allowed.has(file));
const allowedChanged = changed.filter((file) => allowed.has(file));
const untouched = allowedChanged.length === allowed.size;

console.log(`baseline=${baseline}`);
console.log(`tracked_files=${tracked.length}`);
console.log(`allowed_write_scope=${allowed.size}`);
console.log(`changed_in_scope=${allowedChanged.length}`);
for (const file of allowedChanged.sort()) console.log(`  M ${file}`);
console.log(`changed_out_of_scope=${unexpected.length}`);
for (const file of unexpected.sort()) console.log(`  ! ${file}`);
console.log(`missing_in_tree=${missing.length}`);
for (const file of missing.sort()) console.log(`  ? ${file}`);
console.log(
  `VERDICT=${untouched && unexpected.length === 0 && missing.length === 0 ? 'PASS' : 'FAIL'}`,
);
process.exit(untouched && unexpected.length === 0 && missing.length === 0 ? 0 : 1);
