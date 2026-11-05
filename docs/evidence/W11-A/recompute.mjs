#!/usr/bin/env node
/**
 * W11-A 锚点独立复算（不 import src/**；只按 docs/plan/WAVE-PLAN-V4.1.md §2 算式重算）。
 *
 * 复算项（禁裸值，逐项附算式 + 来源）：
 *   1. 椭圆点抽验（V4.1 §2 缺省算例 a=15、b=25、Δt=15°）：
 *      t=15° → X=2×15×cos15°=30×0.96592583=28.9777748→28.978；
 *               Z=25×sin15°=25×0.25881905=6.4704761→6.470
 *   2. 椭圆整周闭合：t=0° 与 t=360° 同位（COS/SIN 周期 360°）
 *   3. 切槽层数（V4.1 §2 算例）：⌈深 2 / Δd 0.5⌉ = 4
 *   4. 切槽 Z 搭接平移：步距 = 刀宽 3 − 搭接 0.5 = 2.5；槽宽 10 → 覆盖至 Z0−10
 *   5. 网纹层数（缺省示例）：⌈H 0.6 / ΔX 0.2⌉ = 3
 *   6. 油槽八字相位：第二遍起点偏 P/2 → 相位差 360×(P/2)/P = 180°
 *
 * 口径：本脚本只用 Math/算术，不 import src/**，用于与实现侧（vitest 断言）双盲对拍。
 */
const checks = [];
let pass = 0;
let total = 0;

function check(name, actual, expected, tolerance = 1e-9) {
  total += 1;
  const actualNumber = Number(actual);
  const expectedNumber = Number(expected);
  const ok =
    Number.isFinite(actualNumber) &&
    Number.isFinite(expectedNumber) &&
    Math.abs(actualNumber - expectedNumber) <= tolerance;
  if (ok) pass += 1;
  checks.push({ name, actual, expected, ok });
  console.log(`[${ok ? 'PASS' : 'FAIL'}] ${name}: actual=${actual} expected=${expected}`);
}

/** 三位小数（与 core/gcode 的 formatNumber 同口径：四舍五入去尾零，整数保留） */
function fixed3(value) {
  return (Math.round(value * 1000) / 1000).toFixed(3);
}

// ── 1/2. 椭圆（V4.1 §2） ─────────────────────────────────────────────
const A = 15; // 长半轴 a，V4.1 §2 锚点算例
const B = 25; // 短半轴 b，V4.1 §2 锚点算例
const T = 15; // t=15°，V4.1 §2 锚点算例
const rad = (T * Math.PI) / 180;
const ellipseX = 2 * A * Math.cos(rad); // 2×15×cos15° = 30×0.96592583 = 28.9777748
const ellipseZ = B * Math.sin(rad); // 25×sin15° = 25×0.25881905 = 6.4704761
console.log(`ellipse(a=15,b=25,t=15°): X=${ellipseX} → ${fixed3(ellipseX)}; Z=${ellipseZ} → ${fixed3(ellipseZ)}`);
check('ellipse X(t=15°) to 3dp', fixed3(ellipseX), '28.978', 0);
check('ellipse Z(t=15°) to 3dp', fixed3(ellipseZ), '6.470', 0);
// t=0 与 t=360 闭合（COS/SIN 周期 360°）
check('ellipse X(t=0°)', 2 * A * Math.cos(0), 30);
check('ellipse Z(t=0°)', B * Math.sin(0), 0);
check('ellipse closure X(t=360°)', 2 * A * Math.cos((360 * Math.PI) / 180), 30, 1e-9);
check('ellipse closure Z(t=360°)', B * Math.sin((360 * Math.PI) / 180), 0, 1e-9);

// ── 3/4. 切槽（V4.1 §2 算例） ───────────────────────────────────────
const grooveDepth = 2; // 槽深 H=2 mm（V4.1 §2）
const grooveDD = 0.5; // Δd=0.5 mm（V4.1 §2）
const grooveLayers = Math.ceil(grooveDepth / grooveDD); // ⌈2/0.5⌉ = 4
console.log(`groove layers: ⌈${grooveDepth}/${grooveDD}⌉ = ${grooveLayers}`);
check('groove layers', grooveLayers, 4, 0);

const grooveW = 10; // 槽宽 W=10 mm（示例输入）
const toolW = 3; // 刀宽 b=3 mm（示例输入）
const overlap = 0.5; // 搭接量 e=0.5 mm（示例输入）
const span = grooveW - toolW; // 10−3 = 7
const stepZ = toolW - overlap; // 3−0.5 = 2.5
const z0 = 0; // 槽起点（示例输入）
const positions = [];
for (let i = 0; i * stepZ < span; i += 1) positions.push(z0 - i * stepZ);
positions.push(z0 - span); // 末尾补刀至 W 末端
console.log(
  `groove Z positions: ${positions.join(', ')} (span=${span}, step=${stepZ}, W=${grooveW}, toolW=${toolW}, overlap=${overlap})`,
);
check('groove step = toolW − overlap', stepZ, 2.5);
check('groove last position = z0 − (W − toolW)', positions[positions.length - 1], z0 - span);
check('groove coverage end = last − toolW = z0 − W', positions[positions.length - 1] - toolW, z0 - grooveW);
check('groove position count = ⌈span/step⌉ + 1', positions.length, Math.ceil(span / stepZ) + 1);
// 相邻两刀搭接量 = toolW − step = 0.5（>0 保证无残留凸环）
check('groove adjacent overlap = toolW − step', toolW - stepZ, overlap);

// ── 5. 网纹（缺省示例输入） ────────────────────────────────────────
const knurlD = 50; // 工件外圆 D=50 mm（示例输入）
const knurlH = 0.6; // 总压深 H=0.6 mm（示例输入）
const knurlDX = 0.2; // 每层压入 ΔX=0.2 mm（示例输入）
const knurlLayers = Math.ceil(knurlH / knurlDX); // ⌈0.6/0.2⌉ = 3
const knurlXs = [];
let currentX = knurlD;
while (currentX > knurlD - knurlH) {
  currentX -= knurlDX;
  if (currentX < knurlD - knurlH) currentX = knurlD - knurlH;
  knurlXs.push(currentX);
}
console.log(`knurl layers: ⌈${knurlH}/${knurlDX}⌉ = ${knurlLayers}; X=${knurlXs.join(', ')}`);
check('knurl layers', knurlLayers, 3, 0);
check('knurl layer count from path', knurlXs.length, 3, 0);
check('knurl last X = D − H', knurlXs[knurlXs.length - 1], knurlD - knurlH);
check('knurl first X = D − ΔX', knurlXs[0], knurlD - knurlDX);

// ── 6. 油槽八字相位（V4.1 §2） ─────────────────────────────────────
const slotX0 = 40; // 基圆直径 X0=40 mm（示例输入）
const slotA = 3; // 摆幅 A=3 mm（示例输入）
const slotP = 20; // 槽距 P=20 mm（示例输入）
const phaseShift = 360 * (slotP / 2) / slotP; // 360×(−P/2)/P 的绝对相位差 = 180
const baseX = (z) => slotX0 + slotA * Math.sin((360 * z) / slotP * (Math.PI / 180));
const shiftedX = (z) =>
  slotX0 + slotA * Math.sin((360 * (z - slotP / 2)) / slotP * (Math.PI / 180));
console.log(`oilslot phase diff: 360×(${slotP}/2)/${slotP} = ${phaseShift}°`);
check('oilslot phase diff', phaseShift, 180);
for (const z of [0, slotP / 4, slotP / 2]) {
  console.log(`  Z=${z}: base X=${baseX(z).toFixed(3)}, shifted X=${shiftedX(z).toFixed(3)}`);
}
// 相位差 180° ⇒ shifted(z) = 2X0 − base(z)（sin(θ−π) = −sinθ）
check(
  'oilslot shifted = 2X0 − base at Z=P/4',
  shiftedX(slotP / 4),
  2 * slotX0 - baseX(slotP / 4),
  1e-9,
);

console.log('');
console.log(`RESULT: ${pass}/${total} checks passed`);
console.log(`VERDICT=${pass === total ? 'PASS' : 'FAIL'}`);
process.exit(pass === total ? 0 : 1);
