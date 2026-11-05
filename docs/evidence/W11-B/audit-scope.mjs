#!/usr/bin/env node
/**
 * W11-B 写范围审计：以主仓基线 commit c138d76（W11 契约预置，510 tests）的 tracked
 * 文件清单为全集，逐文件与隔离树比对；同时扫描 src/test/docs 下基线外的「新文件」，
 * 断言除派工单写范围（4 个既有文件 + test/ui-p16.test.ts + docs/evidence/W11-B/）外零改动。
 *
 * 用法：node docs/evidence/W11-B/audit-scope.mjs [baseline]
 * 默认 baseline=c138d76；主仓路径按树根同级目录 `CNC Machinist Calculator` 推导。
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const treeRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const mainRoot = resolve(treeRoot, '..', 'CNC Machinist Calculator');
const baseline = process.argv[2] ?? 'c138d76';

const allowedChanged = new Set([
  'src/core/gear.ts',
  'src/ui/pages/p16.ts',
  'src/ui/README.md',
  'test/gear.test.ts',
]);
const allowedNew = new Set(['test/ui-p16.test.ts']);
const allowedNewPrefixes = ['docs/evidence/W11-B/'];

const tracked = execFileSync('git', ['-C', mainRoot, 'ls-tree', '-r', '--name-only', baseline], {
  encoding: 'utf8',
})
  .split(/\r?\n/)
  .filter(Boolean);
const trackedSet = new Set(tracked);

// 主仓工作区为 LF、隔离树为 CRLF（建树/工具侧换行差异，非内容差异）：比对前统一为 LF。
const sha = (buffer) =>
  createHash('sha256').update(buffer.toString('utf8').replace(/\r\n/g, '\n')).digest('hex');

const changed = [];
const missing = [];
for (const file of tracked) {
  let treeText;
  try {
    treeText = readFileSync(join(treeRoot, file));
  } catch {
    missing.push(file);
    continue;
  }
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

const unexpected = changed.filter((file) => !allowedChanged.has(file));
const touchedAllowed = changed.filter((file) => allowedChanged.has(file));

function walk(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else files.push(full);
  }
  return files;
}

const newFiles = [];
for (const dir of ['src', 'test', 'docs']) {
  const absolute = join(treeRoot, dir);
  let files;
  try {
    files = walk(absolute);
  } catch {
    continue;
  }
  for (const full of files) {
    const rel = relative(treeRoot, full).replace(/\\/g, '/');
    if (trackedSet.has(rel)) continue;
    const allowed =
      allowedNew.has(rel) || allowedNewPrefixes.some((prefix) => rel.startsWith(prefix));
    if (!allowed) newFiles.push(rel);
  }
}

const untouched =
  touchedAllowed.length === allowedChanged.size &&
  unexpected.length === 0 &&
  missing.length === 0 &&
  newFiles.length === 0;

console.log(`baseline=${baseline}`);
console.log(`tracked_files=${tracked.length}`);
console.log(`allowed_changed=${allowedChanged.size}`);
console.log(`changed_in_scope=${touchedAllowed.length}`);
for (const file of touchedAllowed.sort()) console.log(`  M ${file}`);
console.log(`changed_out_of_scope=${unexpected.length}`);
for (const file of unexpected.sort()) console.log(`  ! ${file}`);
console.log(`new_files_out_of_scope=${newFiles.length}`);
for (const file of newFiles.sort()) console.log(`  + ${file}`);
console.log(`missing_in_tree=${missing.length}`);
for (const file of missing.sort()) console.log(`  ? ${file}`);
console.log(`VERDICT=${untouched ? 'PASS' : 'FAIL'}`);
process.exit(untouched ? 0 : 1);
