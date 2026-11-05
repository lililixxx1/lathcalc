/**
 * W8-B 金值双盲复算（独立实现，不 import src/**）
 *
 * 目的：用与 src/core/gcode.ts 不同的代码路径，从 docs/research/g76-dialects.md §1 行1/行4
 * 的公式与单位注重新代入，逐字符与冻结金值比对；全部 PASS 才允许作为验收依据。
 *
 * 数值来源（禁裸值）：
 *   M30×3.5：d1 = 30 − 1.0825×3.5 = 26.21125；牙深 = (30 − 26.21125)/2 = 1.894375
 *   M30×2  ：d1 = 30 − 1.0825×2 = 27.835  ；牙深 = (30 − 27.835)/2  = 1.0825（名义值输入）
 *   首刀 0.4 / 0.3 mm；导程 3.5 / 2 mm；精修余量 0.05（默认）/ 0.08（覆盖例）
 *   GSK 988TA：P/Q/R 均 mm 半径小数（三位）
 *   GSK 980TDc：P/Q/Δdmin ×10⁴ 取整（0.0001mm 增量 №.182.7），R 保持 mm
 *   HNC G82  ：`G82 X.. Z.. I0 R0 E0 C1 P0 F..`（§1 行4 脚注冻结模板，直螺纹）
 * 运行：node docs/evidence/W8-B/recompute.mjs
 */
const GSK_980TDC_SCALE = 10_000; // 1 / 0.0001 mm（№.182.7 增量档）
const GSK_MIN_CUT_MM = 0.1; // Q(Δdmin) 冻结示例值（988TA Q0.1 / 980TDc Q1000）

/** 轴坐标格式（独立实现）：3 位小数、去尾零、整数保留小数点 */
function axis(value) {
  const rounded = Math.round(value * 1000) / 1000;
  return (Object.is(rounded, -0) ? 0 : rounded).toFixed(3).replace(/0+$/, '');
}

/** 普通数值格式：最多 3 位小数、去尾零；minDecimals=1 时整数补一位小数 */
function num(value, minDecimals = 0) {
  const rounded = Math.round(value * 1000) / 1000;
  let text = (Object.is(rounded, -0) ? 0 : rounded).toFixed(3).replace(/0+$/, '');
  if (text.endsWith('.')) text = minDecimals > 0 ? `${text}${'0'.repeat(minDecimals)}` : text.slice(0, -1);
  return text;
}

const results = [];
function check(name, built, expected) {
  const pass = built === expected;
  results.push({ name, built, expected, pass });
  console.log(`${pass ? 'PASS' : 'FAIL'} | ${name}`);
  console.log(`  built   : ${built}`);
  console.log(`  expected: ${expected}`);
}

/** 未舍入中间值允许二进制浮点噪声（1e-9），字符串金值仍逐字符严格比对 */
function checkClose(name, built, expected, eps = 1e-9) {
  const pass = Math.abs(built - expected) <= eps;
  results.push({ name, built, expected, pass });
  console.log(`${pass ? 'PASS' : 'FAIL'} | ${name}`);
  console.log(`  built   : ${built}`);
  console.log(`  expected: ${expected} (±${eps})`);
}

// ---------- M30×3.5 ----------
const d1 = 30 - 1.0825 * 3.5; // 26.21125
const depth = (30 - d1) / 2; // 1.894375
checkClose('M30×3.5 d1（算式）', d1, 26.21125);
checkClose('M30×3.5 牙深（算式）', depth, 1.894375);

// GSK 988TA（mm 半径小数）
check(
  'GSK 988TA 行1',
  `G76 P021060 Q${num(GSK_MIN_CUT_MM)} R${num(0.05)}`,
  'G76 P021060 Q0.1 R0.05',
);
check(
  'GSK 988TA 行2',
  `G76 X${axis(d1)} Z${axis(-30)} P${num(depth)} Q${num(0.4)} F${num(3.5, 1)}`,
  'G76 X26.211 Z-30. P1.894 Q0.4 F3.5',
);
check(
  'GSK 988TA 行1（精修 0.08）',
  `G76 P021060 Q${num(GSK_MIN_CUT_MM)} R${num(0.08)}`,
  'G76 P021060 Q0.1 R0.08',
);

// GSK 980TDc（0.0001mm 增量，R 保持 mm）
const inc = (mm) => Math.round(mm * GSK_980TDC_SCALE);
check('GSK 980TDc 增量中间值 P（1.894375×10⁴）', inc(depth), 18944);
check('GSK 980TDc 增量中间值 Q（0.4×10⁴）', inc(0.4), 4000);
check('GSK 980TDc 增量中间值 Δdmin（0.1×10⁴）', inc(GSK_MIN_CUT_MM), 1000);
check(
  'GSK 980TDc 行1',
  `G76 P021060 Q${inc(GSK_MIN_CUT_MM)} R${num(0.05)}`,
  'G76 P021060 Q1000 R0.05',
);
check(
  'GSK 980TDc 行2',
  `G76 X${axis(d1)} Z${axis(-30)} P${inc(depth)} Q${inc(0.4)} F${num(3.5, 1)}`,
  'G76 X26.211 Z-30. P18944 Q4000 F3.5',
);
check(
  'GSK 980TDc 行1（精修 0.08）',
  `G76 P021060 Q${inc(GSK_MIN_CUT_MM)} R${num(0.08)}`,
  'G76 P021060 Q1000 R0.08',
);

// ---------- M30×2（名义牙深 1.0825） ----------
const d1b = 30 - 1.0825 * 2; // 27.835
const depthB = 1.0825; // (30 − 27.835)/2 的名义十进制值（避免二进制构造误差）
checkClose('M30×2 d1（算式）', d1b, 27.835);
check('M30×2 牙深三位（名义 1.0825）', num(depthB), '1.083');
check('M30×2 牙深增量（名义 1.0825）', inc(depthB), 10825);
check(
  'GSK 988TA M30×2 行2',
  `G76 X${axis(d1b)} Z${axis(-30)} P${num(depthB)} Q${num(0.3)} F${num(2, 1)}`,
  'G76 X27.835 Z-30. P1.083 Q0.3 F2.0',
);
check(
  'GSK 980TDc M30×2 行2',
  `G76 X${axis(d1b)} Z${axis(-30)} P${inc(depthB)} Q${inc(0.3)} F${num(2, 1)}`,
  'G76 X27.835 Z-30. P10825 Q3000 F2.0',
);

// ---------- HNC G82 / 向后兼容 G92 ----------
check(
  'HNC G82 单行（M30×3.5）',
  `G82 X${axis(d1)} Z${axis(-30)} I0 R0 E0 C1 P0 F${num(3.5, 1)}`,
  'G82 X26.211 Z-30. I0 R0 E0 C1 P0 F3.5',
);
check(
  'G92 向后兼容单行（M30×3.5）',
  `G92 X${axis(d1)} Z${axis(-30)} F${num(3.5, 1)}`,
  'G92 X26.211 Z-30. F3.5',
);
check(
  'GSK 988TA ≠ 980TDc（两口径输出必须不同）',
  String(`G76 P021060 Q${num(GSK_MIN_CUT_MM)} R${num(0.05)}|G76 X${axis(d1)} Z${axis(-30)} P${num(depth)} Q${num(0.4)} F${num(3.5, 1)}` ===
    `G76 P021060 Q${inc(GSK_MIN_CUT_MM)} R${num(0.05)}|G76 X${axis(d1)} Z${axis(-30)} P${inc(depth)} Q${inc(0.4)} F${num(3.5, 1)}`),
  'false',
);

// ---------- 判定行（脚本计算，不手填） ----------
const passed = results.filter((item) => item.pass).length;
const total = results.length;
console.log('');
console.log(`SUMMARY ${passed}/${total} PASS`);
console.log(passed === total ? 'VERDICT PASS' : 'VERDICT FAIL');
process.exit(passed === total ? 0 : 1);
