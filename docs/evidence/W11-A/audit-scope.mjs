#!/usr/bin/env node
/**
 * W11-A 写范围审计（树内无 .git，故以主仓基线 commit 的 tracked 清单为全集）。
 *
 * 断言：
 *   1. 基线 tracked 文件中，除写范围五文件外零差异 / 零缺失；
 *   2. 树内新增文件只允许 test/ui-p15.test.ts 与 docs/evidence/W11-A/ 下证据档。
 *
 * 用法：node docs/evidence/W11-A/audit-scope.mjs [baseline]
 * 默认 baseline=c138d76（W11 契约预置，510 tests）；主仓路径按树根同级目录推导。
 * 输出只含仓库相对路径，无机器绝对路径（附录 G 可公开态）。
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const treeRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const mainRoot = resolve(treeRoot, '..', 'CNC Machinist Calculator');
const baseline = process.argv[2] ?? 'c138d76';

const allowedChanged = new Set([
  'src/core/macro.ts',
  'src/ui/pages/p15.ts',
  'src/ui/README.md',
  'test/macro.test.ts',
]);
const allowedNewPrefixes = ['docs/evidence/W11-A/'];
const allowedNewFiles = new Set(['test/ui-p15.test.ts']);

const excludedPrefixes = ['node_modules/', 'dist/', '.git/', 'team-prompt/', '.zcode-site/'];

const tracked = execFileSync('git', ['-C', mainRoot, 'ls-tree', '-r', '--name-only', baseline], {
  encoding: 'utf8',
})
  .split(/\r?\n/)
  .filter(Boolean);
const trackedSet = new Set(tracked);

// 主仓工作区为 LF、隔离树可能为 CRLF：比对前统一 LF（建树/工具侧换行差异，非内容差异）
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

/** 遍历树内文件（排除 node_modules/dist/team-prompt 等非交付目录） */
function walk(dir, prefix = '') {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    const normalized = rel.split(sep).join('/');
    if (entry.isDirectory()) {
      if (excludedPrefixes.some((ex) => `${normalized}/`.startsWith(ex))) continue;
      files.push(...walk(join(dir, entry.name), normalized));
    } else {
      files.push(normalized);
    }
  }
  return files;
}

const newFiles = walk(treeRoot).filter((file) => !trackedSet.has(file));
const newInScope = newFiles.filter(
  (file) =>
    allowedNewFiles.has(file) || allowedNewPrefixes.some((prefix) => file.startsWith(prefix)),
);
const changedInScope = changed.filter((file) => allowedChanged.has(file));
const changedOutOfScope = changed.filter((file) => !allowedChanged.has(file));
const newOutOfScope = newFiles.filter((file) => !newInScope.includes(file));
const untouchedAllowed = changedInScope.length === allowedChanged.size;

console.log(`baseline=${baseline}`);
console.log(`tracked_files=${tracked.length}`);
console.log(`allowed_changed=${allowedChanged.size}`);
console.log(`changed_in_scope=${changedInScope.length}`);
for (const file of changedInScope.sort()) console.log(`  M ${file}`);
console.log(`changed_out_of_scope=${changedOutOfScope.length}`);
for (const file of changedOutOfScope.sort()) console.log(`  ! ${file}`);
console.log(`new_in_scope=${newInScope.length}`);
for (const file of newInScope.sort()) console.log(`  A ${file}`);
console.log(`new_out_of_scope=${newOutOfScope.length}`);
for (const file of newOutOfScope.sort()) console.log(`  ! ${file}`);
console.log(`missing_in_tree=${missing.length}`);
for (const file of missing.sort()) console.log(`  ? ${file}`);

const ok =
  untouchedAllowed &&
  changedOutOfScope.length === 0 &&
  newOutOfScope.length === 0 &&
  missing.length === 0;
console.log(
  `VERDICT=${ok ? 'PASS' : 'FAIL'}（changed_in_scope=${changedInScope.length}/${allowedChanged.size}；new_in_scope=${newInScope.length}；越界改动=${changedOutOfScope.length}；越界新增=${newOutOfScope.length}；缺失=${missing.length}）`,
);
process.exit(ok ? 0 : 1);
