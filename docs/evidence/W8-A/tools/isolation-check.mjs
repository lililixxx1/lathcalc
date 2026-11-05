/**
 * W8-A 隔离检查：对比隔离树与基线 commit 的 src/ + test/ 文件集。
 *
 * 用法（在隔离树根目录执行）：
 *   node docs/evidence/W8-A/tools/isolation-check.mjs "../CNC Machinist Calculator" b9f6b3a .
 *
 * 判定：与基线不同的文件必须全部落在本卡写范围内（白名单见 ALLOWED），否则 ISOLATION_FAIL。
 * 文本比较前统一 LF（Windows 检出/归档的 CRLF 差异不视为内容变更）。
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const [repo, baseline, tree = '.'] = process.argv.slice(2);
if (!repo || !baseline) {
  console.error('usage: node isolation-check.mjs <repo> <baseline-commit> [tree]');
  process.exit(2);
}

const ALLOWED = new Set([
  'src/core/thread.ts',
  'src/data/COVERAGE.md',
  'src/data/PROVENANCE.md',
  'src/data/threads-npt.json',
  'src/data/threads-sealpipe.json',
  'src/data/threads-trapezoid.json',
  'src/data/threads-worm.json',
  'src/ui/pages/p02.ts',
  'src/ui/pages/p03.ts',
  'test/data-npt.test.ts',
  'test/data-sealpipe.test.ts',
  'test/data-trapezoid.test.ts',
  'test/data-worm.test.ts',
  'test/thread.test.ts',
  'test/ui-p02.test.ts',
  'test/ui-p03.test.ts',
]);

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

function show(rel) {
  try {
    return execFileSync('git', ['-C', repo, 'show', `${baseline}:${rel}`], {
      encoding: 'buffer',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {
    return null;
  }
}

const changed = [];
for (const dir of ['src', 'test']) {
  for (const file of walk(join(tree, dir))) {
    const rel = relative(tree, file).split('\\').join('/');
    const base = show(rel);
    if (base === null) {
      changed.push(`${rel} | NEW`);
      continue;
    }
    const cur = readFileSync(file);
    const norm = (b) => b.toString('utf8').replace(/\r\n/g, '\n');
    if (norm(cur) !== norm(base)) changed.push(`${rel} | MODIFIED`);
  }
}

const outside = changed.filter((line) => !ALLOWED.has(line.split(' | ')[0]));
const missing = [...ALLOWED].filter((rel) => !changed.some((line) => line.startsWith(`${rel} |`)));

console.log('ISOLATION CHECK · tree vs baseline');
console.log(`repo=${repo}  baseline=${baseline}`);
console.log(`changed=${changed.length}  allowed=${ALLOWED.size}`);
for (const line of changed) console.log(`  ${line}`);
if (missing.length) console.log('EXPECTED_BUT_UNCHANGED:', missing.join(', '));
if (outside.length) console.log('OUTSIDE_ALLOWED:', outside.join(', '));
console.log(`ISOLATION_JUDGMENT: ${outside.length === 0 ? 'PASS' : 'FAIL'}`);
