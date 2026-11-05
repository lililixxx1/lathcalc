#!/usr/bin/env node
/**
 * W10-A · fitTolerance >500 段三组独立复算（双盲对拍的第二条路径）
 *
 * 不 import src/core/tolerance.ts；只读取两张数据表，按 GB/T 1800.1 端别规则独立代入：
 *   孔 H7：EI=0、ES=+IT7；轴 g6：es=g、ei=es−IT6；k6/p6：ei=k/p、es=ei+IT6；
 *   Xmin=EI−es、Xmax=ES−ei；min≥0 且 max≥0=间隙，max≤0=过盈，其余=过渡。
 * 输出每条代入算式与结果，并与手算期望常量逐字段比对；不一致退出码 1。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const treeRoot = path.resolve(here, '../../../..');
const itRows = JSON.parse(fs.readFileSync(path.join(treeRoot, 'src/data/tolerance-it.json'), 'utf8'));
const funRaw = JSON.parse(fs.readFileSync(path.join(treeRoot, 'src/data/fundamental-deviations.json'), 'utf8'));

const it = (nominal, grade) => {
  const row = itRows.find((r) => nominal > r.segment[0] && nominal <= r.segment[1]);
  if (!row) throw new Error(`no IT row for ${nominal}`);
  if (row.values[grade] === undefined) throw new Error(`no IT${grade} for ${nominal}`);
  return row.values[grade];
};

const parseBand = (band) => {
  const first = /^≤(\d+(?:\.\d+)?)$/.exec(band);
  if (first) return [0, Number(first[1])];
  const range = /^>(\d+(?:\.\d+)?)[–-](\d+(?:\.\d+)?)$/.exec(band);
  return [Number(range[1]), Number(range[2])];
};
const deviation = (nominal, code) => {
  const row = funRaw.bands.find((b) => {
    const [lo, hi] = parseBand(b.band);
    return nominal > lo && nominal <= hi;
  });
  if (!row) throw new Error(`no fundamental band for ${nominal}`);
  return row[code];
};

const cases = [
  { nominal: 600, code: 'g6', expect: { holeUpper: 70, shaftUpper: -22, shaftLower: -66, min: 22, max: 136, type: '间隙' } },
  { nominal: 1000, code: 'k6', expect: { holeUpper: 90, shaftUpper: 56, shaftLower: 0, min: -56, max: 90, type: '过渡' } },
  { nominal: 2000, code: 'p6', expect: { holeUpper: 150, shaftUpper: 262, shaftLower: 170, min: -262, max: -20, type: '过盈' } },
  { nominal: 500.001, code: 'g6', expect: { holeUpper: 70, shaftUpper: -22, shaftLower: -66, min: 22, max: 136, type: '间隙' } },
  { nominal: 3150, code: 'g6', expect: { holeUpper: 210, shaftUpper: -38, shaftLower: -173, min: 38, max: 383, type: '间隙' } },
];

let failures = 0;
console.log('W10-A · fitTolerance >500 independent recalculation');
console.log('');

for (const c of cases) {
  const it7 = it(c.nominal, 7);
  const it6 = it(c.nominal, 6);
  const code = c.code[0];
  const delta = deviation(c.nominal, code);
  const holeLower = 0;
  const holeUpper = it7;
  let shaftUpper;
  let shaftLower;
  if (code === 'g') {
    // 轴 a–h：g 是上偏差 es；ei=es−IT6。
    shaftUpper = delta;
    shaftLower = delta - it6;
  } else {
    // 轴 k–zc：k/p 是下偏差 ei；es=ei+IT6。
    shaftLower = delta;
    shaftUpper = delta + it6;
  }
  const min = holeLower - shaftUpper;
  const max = holeUpper - shaftLower;
  const type = min >= 0 && max >= 0 ? '间隙' : max <= 0 ? '过盈' : '过渡';

  console.log(`Ø${c.nominal} H7/${c.code}`);
  console.log(`  IT7=${it7}、IT6=${it6}；基本偏差 ${code}=${delta} μm`);
  console.log(`  孔：EI=0、ES=+IT7=+${it7}`);
  if (code === 'g') {
    console.log(`  轴：es=${delta}、ei=es−IT6=${delta}−${it6}=${delta - it6}`);
  } else {
    console.log(`  轴：ei=${delta}、es=ei+IT6=${delta}+${it6}=${delta + it6}`);
  }
  console.log(`  Xmin=EI−es=0−(${shaftUpper})=${min}`);
  console.log(`  Xmax=ES−ei=${holeUpper}−(${shaftLower})=${max}`);
  console.log(`  类别=${type}`);
  const actual = { holeUpper, shaftUpper, shaftLower, min, max, type };
  for (const key of Object.keys(c.expect)) {
    if (actual[key] !== c.expect[key]) {
      failures += 1;
      console.log(`  DIFF ${key}: computed=${actual[key]} expected=${c.expect[key]}`);
    }
  }
  console.log('');
}

console.log(`RESULT: ${failures === 0 ? 'PASS' : 'FAIL'} (${cases.length} cases, ${failures} diffs)`);
process.exit(failures === 0 ? 0 : 1);
