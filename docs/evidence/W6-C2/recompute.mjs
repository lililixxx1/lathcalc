// W6-C2 双盲复算（独立实现，不 import src/**）：M30×3.5 全部金值
// 输入：d=30, P=3.5；设计稿 p04 冻结示例 endZ=-30、首刀 0.4mm、默认精修 0.05mm。
// 格式化规则按 gcode.ts 现有 helper 的口径复述：轴坐标 ≤3 位小数、去尾零、整数保留小数点；
// 普通数值 ≤3 位小数、去尾零、整数不带点（F 至少 1 位小数）。

const axis = (v) => {
  const r = Math.round(v * 1000) / 1000;
  return (Object.is(r, -0) ? 0 : r).toFixed(3).replace(/0+$/, '');
};
const num = (v, min = 0) => {
  const r = Math.round(v * 1000) / 1000;
  let t = (Object.is(r, -0) ? 0 : r).toFixed(3).replace(/0+$/, '');
  if (t.endsWith('.')) t = min > 0 ? t + '0'.repeat(min) : t.slice(0, -1);
  return t;
};

const d = 30;
const P = 3.5;
const d1 = d - 1.0825 * P; // 26.21125
const depth = (d - d1) / 2; // 1.894375
const first = 0.4;
const finish = 0.05;
const endZ = -30;

const actual = {
  d1,
  depthMM: depth,
  depthUM: Math.round(depth * 1000),
  depth3: num(depth),
  firstUM: Math.round(first * 1000),
  first3: num(first),
  finishKND: Math.round(finish * 1000),
  finish3: num(finish),
};

const expected = {
  fanucLine1: 'G76 P021060 Q100 R0.05',
  fanucLine2: 'G76 X26.211 Z-30. P1894 Q400 F3.5',
  kndLine1: 'G76 P021060 Q100 R50',
  kndLine2: 'G76 X26.211 Z-30. P1894 Q400 F3.5',
  hnc: 'G76 C2 R0 E0 A60 X26.211 Z-30. I0 K1.894 U0.05 V0.1 Q0.4 P0 F3.5',
  g92: 'G92 X26.211 Z-30. F3.5',
};

const built = {
  fanucLine1: `G76 P021060 Q100 R${num(finish)}`,
  fanucLine2: `G76 X${axis(d1)} Z${axis(endZ)} P${Math.round(depth * 1000)} Q${Math.round(first * 1000)} F${num(P, 1)}`,
  kndLine1: `G76 P021060 Q100 R${Math.round(finish * 1000)}`,
  kndLine2: `G76 X${axis(d1)} Z${axis(endZ)} P${Math.round(depth * 1000)} Q${Math.round(first * 1000)} F${num(P, 1)}`,
  hnc: `G76 C2 R0 E0 A60 X${axis(d1)} Z${axis(endZ)} I0 K${num(depth)} U${num(finish)} V${num(0.1)} Q${num(first)} P0 F${num(P, 1)}`,
  g92: `G92 X${axis(d1)} Z${axis(endZ)} F${num(P, 1)}`,
};

console.log('== 未舍入中间值 ==');
for (const [k, v] of Object.entries(actual)) console.log(`${k} = ${v}`);
console.log('== 逐字符对拍（built vs expected） ==');
let failed = 0;
for (const key of Object.keys(expected)) {
  const ok = built[key] === expected[key];
  if (!ok) failed += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${key}: ${built[key]}`);
  if (!ok) console.log(`  expected: ${expected[key]}`);
}
console.log(`== 汇总：${Object.keys(expected).length - failed}/${Object.keys(expected).length} PASS ==`);
if (failed > 0) process.exitCode = 1;
