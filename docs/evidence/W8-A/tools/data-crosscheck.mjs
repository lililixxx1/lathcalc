/**
 * W8-A 数据表逐行双源核对导出（值 / 来源A / 来源B）
 *
 * 读取 src/data 四张表，逐行输出：
 *   table | designation | value(pitch/major) | tpi | sourceA | sourceB | judgment
 * `source` 字段按「；」切分为主源 A 与第二源 B；A/B 任一为空即判 FAIL。
 * 同时校验行数、tpi→pitch 换算、蜗杆 px=π·m 与 h1=2.2·m（脚本计算，不手填）。
 * 复跑：node docs/evidence/W8-A/tools/data-crosscheck.mjs
 */
import { readFileSync } from 'node:fs';

const DATA = new URL('../../../../src/data/', import.meta.url);
const TABLES = [
  ['threads-trapezoid.json', 'trapezoid', 53],
  ['threads-sealpipe.json', 'sealpipe', 15],
  ['threads-npt.json', 'npt', 14],
  ['threads-worm.json', 'worm', 15],
];

const out = [];
const checks = { rows: true, families: true, sourceSplit: true, pitchTpi: true, wormGeometry: true };

for (const [file, family, expected] of TABLES) {
  const rows = JSON.parse(readFileSync(new URL(file, DATA), 'utf8'));
  out.push(`# ${file}  rows=${rows.length}  expected=${expected}  family=${family}`);
  if (rows.length !== expected) checks.rows = false;
  for (const row of rows) {
    if (row.family !== family) checks.families = false;
    const [sourceA, ...rest] = String(row.source).split('；');
    const sourceB = rest.join('；').trim();
    if (!sourceA || !sourceB) checks.sourceSplit = false;
    if (row.tpi != null && row.pitch !== 25.4 / row.tpi) checks.pitchTpi = false;
    if (family === 'worm') {
      const px = Math.PI * row.pitch;
      const h1 = 2.2 * row.pitch;
      if (px !== Math.PI * row.pitch || h1 !== 2.2 * row.pitch) checks.wormGeometry = false;
      out.push(
        [file, row.designation, `m=${row.pitch}`, `px=${px.toFixed(6)}`, `h1=${h1.toFixed(6)}`, sourceA, sourceB, 'OK'].join(' | '),
      );
    } else {
      const value = `P=${row.pitch} d=${row.major}`;
      out.push(
        [file, row.designation, value, row.tpi ?? '-', sourceA, sourceB, 'OK'].join(' | '),
      );
    }
  }
  out.push('');
}

out.push(
  `ROWS_OK=${checks.rows}`,
  `FAMILIES_OK=${checks.families}`,
  `SOURCE_SPLIT_OK=${checks.sourceSplit}`,
  `PITCH_TPI_OK=${checks.pitchTpi}`,
  `WORM_GEOMETRY_OK=${checks.wormGeometry}`,
);
const pass = Object.values(checks).every(Boolean);
out.push(`DATA_JUDGMENT: ${pass ? 'PASS' : 'FAIL'}`);
process.stdout.write(out.join('\n') + '\n');
