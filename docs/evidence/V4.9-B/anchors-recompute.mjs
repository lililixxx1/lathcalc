/**
 * anchors-recompute.mjs · V4.9-B 金锚双盲复算（WAVE-PLAN-V4.9 §3 B 卡）
 *
 * 独立复算路径：本脚本按计划 §1 冻结公式从零代入（不 import 实现模块、
 * 不读实现常量），与派工单/计划 §3 登记的期望值逐项对拍；判定行由本脚本
 * 计算生成（附录 G：人工只解读不计算）。
 * 校验类锚（非正/非有限/钢管 t≥D/2 抛错）由 test/stock-figure.test.ts 与
 * test/speed-figure.test.ts 断言，此处不重复执行。
 */

const PI = Math.PI;
const results = [];

function check(anchorId, formula, computed, expected, tolerance) {
  const pass = Math.abs(computed - expected) <= tolerance;
  results.push({ anchorId, formula, computed, expected, tolerance, pass });
}

function checkText(anchorId, formula, computed, expected) {
  const pass = computed === expected;
  results.push({ anchorId, formula, computed, expected, tolerance: 'exact', pass });
}

// —— 布局常量（计划 §1 V4.9-03/04 冻结口径，独立转录）——
const SECTION_CY = 42; // 截面中心 y
const CX = 110; // 水平中心
const SECTION_BUDGET_W = 68; // 截面包围盒宽预算
const SECTION_BUDGET_H = 70; // 截面包围盒高预算
const STRIP_TOP = 96; // 侧视条区顶
const STRIP_MAX_W = 200; // 侧视条长上限
const STRIP_MAX_H = 40; // 侧视条高上限
const SPEED_CY = 56; // p09 圆心 y
const R_BASE = 36; // p09 基准半径（D=50 锚）
const R_CAP = 40; // p09 半径封顶
const VC_LEN = 22; // Vc 箭头长

const ka = (secW, secH) => Math.min(SECTION_BUDGET_W / secW, SECTION_BUDGET_H / secH);
const kb = (L, secH) => Math.min(STRIP_MAX_W / L, STRIP_MAX_H / secH);

// —— §3 B 卡锚逐项独立代入 ——

// p11 圆钢 D=50 L=100：ka=34/25=1.36 → r=34；kb=min(2, 40/50)=0.8 → 条 80×40（y 96..136）
{
  const D = 50, L = 100;
  const k1 = ka(D, D);
  check('round.ka', 'min(68/50, 70/50)', k1, 1.36, 1e-9);
  check('round.r', '(D/2)·ka = 25×1.36', (D / 2) * k1, 34, 1e-9);
  const k2 = kb(L, D);
  check('round.kb', 'min(200/100, 40/50)', k2, 0.8, 1e-9);
  check('round.stripW', 'L·kb = 100×0.8', L * k2, 80, 1e-9);
  check('round.stripH', 'D·kb = 50×0.8', D * k2, 40, 1e-9);
  check('round.stripBottom', 'STRIP_TOP + 条高', STRIP_TOP + D * k2, 136, 1e-9);
}

// p11 六方 S=20（L=100）：R=S/√3=11.547；ka=min(2.944, 3.5)=2.944；顶视 68×58.9；kb=2 → 200×40
{
  const S = 20, L = 100;
  const R = S / Math.sqrt(3);
  check('hex.R', 'S/√3 = 20/√3', R, 11.547, 5e-4);
  const k1 = ka(2 * R, S);
  check('hex.ka', 'min(68/(2R), 70/20)', k1, 2.944, 5e-4);
  check('hex.secW', '2R·ka', 2 * R * k1, 68, 1e-6);
  // 金锚 58.9 系计划按 1 位小数登记（实算 58.889727…，1 位小数舍入 = 58.9），
  // 容差按登记精度 0.05 取（期望值不改）。
  check('hex.secH', 'S·ka（金锚 58.9，1 位小数登记）', S * k1, 58.9, 5e-2);
  check('hex.vertexX', 'R·ka（顶点 ±R·ka）', R * k1, 34, 1e-9);
  check('hex.vertexY', '(S/2)·ka = 17√3（顶点 ±S/2·ka）', (S / 2) * k1, 17 * Math.sqrt(3), 1e-9);
  const k2 = kb(L, S);
  check('hex.kb', 'min(200/100, 40/20)', k2, 2, 1e-9);
  check('hex.stripW', 'L·kb', L * k2, 200, 1e-9);
  check('hex.stripH', 'S·kb', S * k2, 40, 1e-9);
}

// p11 钢管 D=60 t=5（L=100）：ka=34/30 → rO=34、rI=(25/30)×34=28.33；kb=min(2, 2/3)=2/3 → 66.67×40
{
  const D = 60, t = 5, L = 100;
  const k1 = ka(D, D);
  check('pipe.ka', 'min(68/60, 70/60) = 34/30', k1, 34 / 30, 1e-9);
  check('pipe.rOuter', '(D/2)·ka = 30×34/30', (D / 2) * k1, 34, 1e-9);
  check('pipe.rInner', '((D−2t)/2)·ka = (25/30)×34', ((D - 2 * t) / 2) * k1, 28.33, 5e-3);
  const k2 = kb(L, D);
  check('pipe.kb', 'min(200/100, 40/60) = 2/3', k2, 2 / 3, 1e-9);
  check('pipe.stripW', 'L·kb（金锚 66.67）', L * k2, 66.67, 5e-3);
  check('pipe.stripH', 'D·kb', D * k2, 40, 1e-9);
}

// p11 平板 W=100 T=10 L=200：ka=min(68/100, 70/10)=0.68 → 68×6.8；kb=min(1, 4)=1 → 200×10
{
  const W = 100, T = 10, L = 200;
  const k1 = ka(W, T);
  check('plate.ka', 'min(68/100, 70/10)', k1, 0.68, 1e-9);
  check('plate.secW', 'W·ka', W * k1, 68, 1e-9);
  check('plate.secH', 'T·ka（金锚 6.8）', T * k1, 6.8, 1e-6);
  const k2 = kb(L, T);
  check('plate.kb', 'min(200/200, 40/10)', k2, 1, 1e-9);
  check('plate.stripW', 'L·kb', L * k2, 200, 1e-9);
  check('plate.stripH', 'T·kb', T * k2, 10, 1e-9);
}

// p09 D=50：r=min(40, 36×50/50)=36；Vc 起点 (110+36·cos45°, 56−36·sin45°)=(135.46, 30.54)；
// n = 1000×150/(π×50) = 954.93 → toFixed(0) = '955'；D 双箭头 110±36
{
  const D = 50, vc = 150;
  const r = Math.min(R_CAP, R_BASE * (50 / D));
  check('speed.r', 'min(40, 36×50/50)', r, 36, 1e-9);
  check('speed.vcStartX', '110 + r·cos45°（金锚 135.46）', CX + r * Math.cos(PI / 4), 135.46, 5e-3);
  check('speed.vcStartY', '56 − r·sin45°（金锚 30.54）', SPEED_CY - r * Math.sin(PI / 4), 30.54, 5e-3);
  check('speed.vcLen', '切向箭头长', VC_LEN, 22, 0);
  check('speed.arrowheadTangency', '起点在圆上：|(start−C)| − r', Math.hypot(r * Math.cos(PI / 4), r * Math.sin(PI / 4)) - r, 0, 1e-9);
  check('speed.dimX1', '110 − r', CX - r, 74, 1e-9);
  check('speed.dimX2', '110 + r', CX + r, 146, 1e-9);
  const n = (1000 * vc) / (PI * D);
  check('speed.n', '1000×150/(π×50)', n, 954.93, 5e-3);
  checkText('speed.nLabel', 'n.toFixed(0)（页面真值）', n.toFixed(0), '955');
  checkText('speed.vcLabel', 'Vc 输入规格化文本', String(vc), '150');
}

// p09 D=80（派工锚）：r = min(40, 36×50/80) = 22.5
{
  const D = 80;
  check('speed80.r', 'min(40, 36×50/80)', Math.min(R_CAP, R_BASE * (50 / D)), 22.5, 1e-9);
}

// p09 退化锚：D=200 → r=9；D=30 封顶 40
{
  check('speed200.r', 'min(40, 36×50/200)', Math.min(R_CAP, R_BASE * (50 / 200)), 9, 1e-9);
  check('speed30.r', 'min(40, 36×50/30)（封顶生效）', Math.min(R_CAP, R_BASE * (50 / 30)), 40, 1e-9);
}

// —— 汇总判定行（脚本计算生成）——
const passed = results.filter((r) => r.pass).length;
const failed = results.length - passed;
console.log('V4.9-B 金锚双盲复算（WAVE-PLAN-V4.9 §3 B 卡）');
console.log('复算路径：冻结公式独立代入，与计划登记期望值对拍；不读实现模块。');
console.log('');
for (const r of results) {
  const verdict = r.pass ? 'MATCH' : 'FAIL';
  const tol = r.tolerance === 'exact' ? 'exact' : `±${r.tolerance}`;
  console.log(
    `[${verdict}] ${r.anchorId}  ${r.formula} = ${r.computed}  期望 ${r.expected}  (${tol})`,
  );
}
console.log('');
console.log(`判定行：TOTAL=${results.length} MATCH=${passed} FAIL=${failed} → ${failed === 0 ? '全部一致，锚可作验收依据' : '存在不一致，停并上报'}`);
if (failed > 0) process.exitCode = 1;
