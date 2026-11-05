#!/usr/bin/env node
/**
 * W10-C 金值独立复算（不 import src/**；只按 WAVE-PLAN-V4 §2 W10-C 算式重算）。
 *
 * 算例（禁裸值，逐项附来源）：
 *   d = 7.723（src/data/threads-sealpipe.json row0「R1/16」基面大径）
 *   P = 25.4/28 = 0.907142857…（28 tpi）
 *   d1 = d − 1.2806×P = 7.723 − 1.2806×0.907142857… = 6.561312857… → X6.561
 *        （1.2806 = 0.6403×2；thread.ts:28 V3-1 基面语义）
 *   牙深 = 0.6403×P = 0.580843571… mm → 581 μm / 5808（0.0001mm）/ 0.581 mm
 *   锥度 = −L/32 = −9.6/32 = −0.3（GB/T 7306.1/12716 锥比 1:16 → 半径差 = L×(1/16)/2）
 *   首刀 = 0.2 mm（冻结测试输入）→ Q200 / Q2000
 *   导程 F = P = 0.907142857… → 0.907
 */
const D = 7.723;
const P = 25.4 / 28;
const D1_FACTOR = 1.2806; // 0.6403 × 2（55° 密封管）
const H1_FACTOR = 0.6403;
const L = 9.6;
const FIRST_CUT = 0.2;

const d1 = D - D1_FACTOR * P;
const depth = H1_FACTOR * P;
const taper = -L / 32;

/** mm 数值：三位小数去尾零（G76 轴坐标整数保留小数点） */
function formatNumber(value) {
  const rounded = Math.round(value * 1000) / 1000;
  let text = (Object.is(rounded, -0) ? 0 : rounded).toFixed(3).replace(/0+$/, '');
  if (text.endsWith('.')) text = text.slice(0, -1);
  return text;
}

/** FANUC 轴写法：整数保留小数点（Z-9.6 / Z-30.） */
function formatAxis(value) {
  const rounded = Math.round(value * 1000) / 1000;
  return (Object.is(rounded, -0) ? 0 : rounded).toFixed(3).replace(/0+$/, '');
}

const um = (value) => Math.round(value * 1000);
const u4 = (value) => Math.round(value * 10000);

const lines = {
  fanuc: `G76 X${formatAxis(d1)} Z${formatAxis(-L)} R${formatNumber(taper)} P${um(depth)} Q${um(FIRST_CUT)} F${formatNumber(P)}`,
  gsk980tdc: `G76 X${formatAxis(d1)} Z${formatAxis(-L)} R${formatNumber(taper)} P${u4(depth)} Q${u4(FIRST_CUT)} F${formatNumber(P)}`,
  hncG82: `G82 X${formatAxis(d1)} Z${formatAxis(-L)} I${formatNumber(taper)} R0 E0 C1 P0 F${formatNumber(P)}`,
  g92: `G92 X${formatAxis(d1)} Z${formatAxis(-L)} R${formatNumber(taper)} F${formatNumber(P)}`,
  kndG76: `G76 X${formatAxis(d1)} Z${formatAxis(-L)} R${um(taper)} P${um(depth)} Q${um(FIRST_CUT)} F${formatNumber(P)}`,
};

const expected = {
  fanuc: 'G76 X6.561 Z-9.6 R-0.3 P581 Q200 F0.907',
  gsk980tdc: 'G76 X6.561 Z-9.6 R-0.3 P5808 Q2000 F0.907',
  hncG82: 'G82 X6.561 Z-9.6 I-0.3 R0 E0 C1 P0 F0.907',
  g92: 'G92 X6.561 Z-9.6 R-0.3 F0.907',
  kndG76: 'G76 X6.561 Z-9.6 R-300 P581 Q200 F0.907',
};

console.log('输入：d=7.723 / P=25.4÷28 / L=9.6 / 首刀=0.2 / 锥比 1:16');
console.log(`d1 = ${D} − ${D1_FACTOR}×${P} = ${d1}`);
console.log(`牙深 = ${H1_FACTOR}×${P} = ${depth} mm → ${um(depth)} μm / ${u4(depth)}（0.0001mm）/ ${formatNumber(depth)} mm`);
console.log(`锥度 = −${L}/32 = ${taper} mm → KND 0.001mm 整数 ${um(taper)}`);

let failed = 0;
for (const key of Object.keys(expected)) {
  const actual = lines[key];
  const ok = actual === expected[key];
  if (!ok) failed += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${key}: ${actual}${ok ? '' : `  (期望 ${expected[key]})`}`);
}

console.log(`VERDICT=${failed === 0 ? 'PASS' : 'FAIL'} (${Object.keys(expected).length - failed}/${Object.keys(expected).length} 锚点行)`);
process.exit(failed === 0 ? 0 : 1);
