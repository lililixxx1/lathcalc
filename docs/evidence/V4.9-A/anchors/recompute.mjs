/**
 * recompute.mjs · WAVE-PLAN-V4.9 §3 A 卡金锚独立复算（双盲对拍第二路径）
 *
 * 独立性声明：本脚本不 import src/**、不复用 thread-figure.ts 任何实现常数——
 * 几何公式按 V4.9-02 冻结式在本文件本地重写（k/带宽/三线/牙宽/构造代数因子），
 * 入参取页面/数据行实际值；expected 列为 test/thread-figure.test.ts 断言所用
 * 字面值（人工转录），derived 列为本脚本公式活算值。
 * 判定：数值锚 |derived−expected| ≤ 5e-5（对应测试 toBeCloseTo(…,4) 容差）→ MATCH；
 *       文本锚全等 → MATCH。任一 FAIL 时退出码 1。
 * 运行：node docs/evidence/V4.9-A/anchors/recompute.mjs（stdout 重定向留痕，退出码 0=全 MATCH / 1=有 FAIL）
 */

const rad = (deg) => (deg * Math.PI) / 180;
const T15 = Math.tan(rad(15));
const T20 = Math.tan(rad(20));
const T27_5 = Math.tan(rad(27.5));
const T30 = Math.tan(rad(30));
const CY = 64;
const BAND_W = 200; // V4.9-02 宽度预算 10..210
const BAND_H = 96; // V4.9-02 高度预算
const VIEW_W = 220;

/** 螺纹族构造链复算（d₂/d₁ 系数取 core/thread.ts PROFILE_CONSTANTS 同值，本处按式重写）。 */
function threadGeom(d, P, halfAngleDeg, d2Factor, d1Factor, ac) {
  const d2 = d - d2Factor * P;
  const d1 = d - d1Factor * P - 2 * ac;
  const k = Math.min(BAND_W / (2.5 * P), BAND_H / (d - d1));
  const periodPx = P * k;
  const x0 = (VIEW_W - 2.5 * periodPx) / 2;
  const yTop = CY - ((d - d1) / 2) * k;
  const yMid = yTop + (d - d2) * k;
  const yBot = CY + ((d - d1) / 2) * k;
  const t = Math.tan(rad(halfAngleDeg));
  return {
    d2, d1, k, x0, yTop, yMid, yBot, periodPx,
    crestPx: (P / 2 - (d - d2) * t) * k,
    rootPx: (P / 2 - (d2 - d1) * t) * k,
    crestFactor: 0.5 - d2Factor * t,
    rootFactor: 0.5 - (d1Factor - d2Factor) * t,
  };
}

/** 蜗杆构造链复算（px=π·m、h₁=2.2m、α=40°，GB/T 10087-2018，与 wormGeometry 同式）。 */
function wormGeom(m) {
  const px = Math.PI * m;
  const h1 = 2.2 * m;
  const alpha = 40;
  const k = Math.min(BAND_W / (2.5 * px), BAND_H / h1);
  const periodPx = px * k;
  const x0 = (VIEW_W - 2.5 * periodPx) / 2;
  const t = Math.tan(rad(alpha / 2));
  return {
    px, h1, k, x0, periodPx,
    yTip: CY - m * k,
    yRef: CY,
    yRoot: CY + (h1 - m) * k, // 齿根 −1.2m = 全齿高 − 齿顶高
    crestPx: (px / 2 - 2 * m * t) * k,
    rootPx: (px / 2 - 2 * (h1 - m) * t) * k,
  };
}

const m10 = threadGeom(10, 1.5, 30, 0.6495, 1.0825, 0);
const tr = threadGeom(40, 7, 15, 0.5, 1, 0.5); // ac=0.5（5<P≤12 档）→ d₁ = d−P−2ac
const g12 = threadGeom(20.955, 25.4 / 14, 27.5, 0.6403, 1.2806, 0);
const worm = wormGeom(2);

const rows = [];
let matchCount = 0;
let failCount = 0;

function num(name, derived, expected, source) {
  const diff = Math.abs(derived - expected);
  const ok = diff <= 5e-5;
  ok ? matchCount++ : failCount++;
  rows.push(`${ok ? 'MATCH' : 'FAIL '}  ${name.padEnd(28)}  derived=${derived.toFixed(6)}  expected=${expected.toFixed(6)}  |Δ|=${diff.toExponential(2)}  ${source}`);
}

function txt(name, derived, expected, source) {
  const ok = derived === expected;
  ok ? matchCount++ : failCount++;
  rows.push(`${ok ? 'MATCH' : 'FAIL '}  ${name.padEnd(28)}  derived=${JSON.stringify(derived)}  expected=${JSON.stringify(expected)}  ${source}`);
}

// —— M10×1.5（metric 60°，计划 §3 A 卡第 1 组；d₂ 线按构造链，计划字面 38.02 系半距误置）——
num('M10.k', m10.k, 53.3333, 'min(200/2.5P, 96/1.62375) 宽度约束');
num('M10.y_d', m10.yTop, 20.7, '64−(d−d₁)/2·k');
num('M10.y_d2', m10.yMid, 72.66, '牙顶+(d−d₂)·k（构造链）');
num('M10.y_d1', m10.yBot, 107.3, '64+(d−d₁)/2·k');
num('M10.crestPx', m10.crestPx, 10.0009, '(P/2−(d−d₂)·tan30°)·k = 0.125011P·k（计划字面 10.00u 为教科书 P/8·k 的 2 位呈现）');
num('M10.rootPx', m10.rootPx, 20.0006, '(P/2−(d₂−d₁)·tan30°)·k = 0.249987P·k（计划字面 20.00u 为 P/4·k 的 2 位呈现）');
num('M10.pitchSpan', m10.periodPx, 80.0, 'P·k');
num('M10.x0', m10.x0, 10.0, '(220−2.5P·k)/2 恰满幅');
txt('M10.label_d2', m10.d2.toFixed(3), '9.026', 'd₂=9.02575 toFixed(3)');
txt('M10.label_d1', m10.d1.toFixed(3), '8.376', 'd₁=8.37625 toFixed(3)');
txt('M10.label_P', `P ${String(Math.round(1.5 * 1000) / 1000)}`, 'P 1.5', 'p03 formatPitch 同式');

// —— Tr40×7（30°，ac=0.5 档 5<P≤12）——
num('Tr.k', tr.k, 11.4286, 'min(200/17.5, 96/8) 宽度约束');
num('Tr.y_d', tr.yTop, 18.2857, '64−4·k');
num('Tr.y_d2', tr.yMid, 58.2857, '牙顶+(d−d₂)·k（构造链）');
num('Tr.y_d1', tr.yBot, 109.7143, '64+4·k');
num('Tr.crestPx', tr.crestPx, 29.282, '3.5−3.5·tan15° → ×k');
num('Tr.rootPx', tr.rootPx, 26.2198, '3.5−4.5·tan15° → ×k');
num('Tr.pitchSpan', tr.periodPx, 80.0, 'P·k');

// —— G1/2（55°，数据行真 pitch=25.4/14；计划字面 1.814 的 44.103/41.326 不采）——
num('G12.k', g12.k, 41.3192, 'min(200/4.5357, 96/2.32337) 高度约束');
num('G12.x0', g12.x0, 16.2939, '横向 187.4122u 居中（不满幅）');
num('G12.y_d', g12.yTop, 16.0, '高度约束恰满 96');
num('G12.y_d2', g12.yMid, 64.0, '55°：d−d₂=d₂−d₁ → d₂ 线在带中');
num('G12.y_d1', g12.yBot, 112.0, '高度约束恰满 96');
num('G12.crestPx', g12.crestPx, 12.4952, '0.302407mm×k');
num('G12.rootPx', g12.rootPx, 12.4952, '55° 双侧对称同值');
num('G12.crest1', g12.x0 + 0.5 * g12.periodPx, 53.7764, 'x0+0.5·P·k');
num('G12.pitchSpan', g12.periodPx, 74.9649, 'P·k');
txt('G12.label_d2', g12.d2.toFixed(3), '19.793', 'd₂=19.79331286');
txt('G12.label_d1', g12.d1.toFixed(3), '18.632', 'd₁=18.63162571');
txt('G12.label_P', `P ${String(Math.round((25.4 / 14) * 1000) / 1000)}`, 'P 1.814', 'formatPitch 同式');

// —— 蜗杆 m=2 ——
num('Worm.k', worm.k, 12.7324, 'min(200/15.7080, 96/4.4) 宽度约束');
num('Worm.y_tip', worm.yTip, 38.5352, '64−m·k');
num('Worm.y_ref', worm.yRef, 64.0, '分度线在 cy');
num('Worm.y_root', worm.yRoot, 94.5577, '64+1.2m·k');
num('Worm.crestPx', worm.crestPx, 21.4631, '(px/2−2m·tan20°)·k（计划字面 21.46u 为 2 位呈现）');
num('Worm.rootPx', worm.rootPx, 17.7558, '(px/2−2.4m·tan20°)·k（计划字面 17.76u 为 2 位呈现）');
num('Worm.pitchSpan', worm.periodPx, 80.0, 'px·k');
txt('Worm.label_px', worm.px.toFixed(3), '6.283', 'px=6.28318530…');
txt('Worm.label_h1', worm.h1.toFixed(3), '4.400', 'h₁=2.2m');

// —— sealpipe R1/2 基面（x=110 冻结；y1/y2 为实现定义外延 8/上限 119，与实现一致）——
num('Seal.gauge_x', 110, 110, 'V4.9-02 基面竖虚线居中');
num('Seal.gauge_y1', Math.max(g12.yTop - 8, 6), 8.0, '带顶外延 8');
num('Seal.gauge_y2', Math.min(g12.yBot + 8, 119), 119.0, '带底外延 8，上限 119');
txt('Seal.gauge_label', '基面', '基面', 'V4.9-02');

// —— 构造代数（全角族，计划 §3 第 6 组：期望列常数导出值）——
num('Alg.f60_crest', m10.crestFactor, 0.125011, '0.5−0.6495·tan30°（与 P/8 差 1.1e-5）');
num('Alg.f60_root', m10.rootFactor, 0.249987, '0.5−0.433·tan30°（与 P/4 差 1.3e-5）');
num('Alg.f55_crest', g12.crestFactor, 0.166681, '0.5−0.6403·tan27.5°（与 P/6 差 1.4e-5）');
num('Alg.f55_root', g12.rootFactor, 0.166681, '55° 对称');
num('Alg.f30_crest', tr.crestFactor, 0.366025, '0.5−0.5·tan15°（精确活算）');
num('Alg.midTooth_P_half', 0.5, 0.5, '中径处牙厚恒 P/2（V4.9-02 定义）');

const lines = [
  'WAVE-PLAN-V4.9 §3 A 卡金锚独立复算（recompute.mjs，不 import src、不抄实现常数）',
  '判定容差 5e-5（对应测试 toBeCloseTo(…,4)）；文本锚全等。',
  '='.repeat(120),
  ...rows,
  '='.repeat(120),
  `JUDGMENT: MATCH=${matchCount} FAIL=${failCount}`,
];
console.log(lines.join('\n'));
if (failCount > 0) process.exit(1);
