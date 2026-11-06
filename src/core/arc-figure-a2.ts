/**
 * arc-figure-a2.ts · 参数化图形 a 组四案：AC02 两圆外切 / AC03 两圆内切 /
 * AC04 圆弧—斜线—圆弧 / AC06 凹圆弧切入（V4.4，worker-1 实现位）
 *
 * 规格：docs/plan/WAVE-PLAN-V4.4.md §3（实体表 + 公式源 arc-cases-a.ts /
 * test/arc-cases-a.test.ts）+ §1 显示约定 + §2 契约（工具全部取自 arc-figure-kit）。
 *
 *  ===== 实现约定（与 §3 实体表逐条对应）=====
 *  - AC02/03：两整圆轮廓各 = 2 条互补半圆（kit circleArcs，cw 同取 true → sweep=1）；
 *    圆心灰点 + 连心虚线 + 橙点切点；无轴线（V4.4-03，axis 置零长段）。
 *  - AC04：弧1 S1→P1（V4.4-01 伴弧）+ 线 P1↔P2 + 弧2 S2→P2（solver 冻结式）；
 *    refCircles 虚线整圆 ×2 + 圆心点 + C↔P 虚半径 ×2；无轴线。
 *  - AC06：入口段（裁轴）/ 弧 S→E / 出口段 + 圆心点 + C↔E 虚半径；轴线 = 其余
 *    轮廓实体（segs+arcs）z 范围（V4.4-04④）。
 *  - 标签=输入回显（V4.4-02）：多字符键加等号（R1=/R2=/dX=/dZ=），单字符键
 *    直接拼接（R）；小数同 fmtFigureValue。
 *  - 求解单源 = kit solveFor；缺失 / 非有限 / 越界参数由 solver 原文上抛。
 */
import type { FigureView } from './arc-figure';
import type { ViewCircle, ViewLabel, ViewPoint, ViewSeg, WArc, WSeg, WP } from './arc-figure-kit';
import {
  addP,
  arcView,
  circleArcs,
  circleExtremes,
  clipSegAtAxis,
  deg2rad,
  fmtFigureValue,
  makeMap,
  midView,
  mulP,
  rotCcw,
  rotScreen,
  sampleArc,
  segView,
  solveFor,
  subP,
  unitView,
} from './arc-figure-kit';

/** solver 输出（X=直径）→ 半径空间 (z, r = X/2) */
const toWP = (p: { x: number; z: number }): WP => ({ z: p.z, r: p.x / 2 });

/** viewBox 内向量差（仅本文件标签 / 方向计算用） */
const subView = (a: ViewPoint, b: ViewPoint): ViewPoint => ({ x: a.x - b.x, y: a.y - b.y });

/** 无轴线案（AC02/03/04，V4.4-03）：零长退化段，装配层 p05 已跳过渲染 */
const NO_AXIS: ViewSeg = { x1: 0, y1: 0, x2: 0, y2: 0 };

/* ------------------------------------------------------------------ AC02 */

/** AC02 两圆弧外切（§3）：整圆1(C1,R1)、整圆2(C2,R2) 各 2 半圆 + 圆心点 + 连心虚线 +
 *  橙点外切点 + R1=/R2=/dZ= 标签 */
export function figureAC02(input: Record<string, number>): FigureView {
  const R1 = input.R1 ?? Number.NaN;
  const R2 = input.R2 ?? Number.NaN;
  const dZ = input.dZ ?? Number.NaN;
  // 求解单源：缺键 / 非有限 / 越界（0 < dZ < R1+R2、R>0）原文上抛
  const solution = solveFor('AC02', input);

  // §3 表：C1 为坐标基准；C2=(dZ, √((R1+R2)²−dZ²))（arc-cases-a.ts 文件头 AC02）
  const C1: WP = { z: 0, r: 0 };
  const sum = R1 + R2;
  const C2: WP = { z: dZ, r: Math.sqrt(sum * sum - dZ * dZ) };
  const T = toWP(solution.tangent); // 橙点 = solver.tangent 映射

  const arcs: WArc[] = [...circleArcs(C1, R1), ...circleArcs(C2, R2)];
  const centerDots: WP[] = [C1, C2];
  const refDashes: WSeg[] = [{ from: C1, to: C2 }]; // 连心线

  // bbox 点集 = 全部被绘制实体：实线整圆走 circleExtremes（2 半圆拼圆自含四极值）；
  // 圆心 / 切点 / 连心线均落在圆内，不扩界
  const others: WP[] = [
    ...circleExtremes(C1, R1),
    ...circleExtremes(C2, R2),
    C1,
    C2,
    T,
  ];
  const map = makeMap(others);
  const C1v = map.toView(C1);
  const C2v = map.toView(C2);
  const Tv = map.toView(T);
  const e = unitView(subView(C2v, C1v)); // 连心线屏幕单位向量
  const s = map.scale;

  // §3 标签锚法：R1 在 C1 外侧沿 −e；R2 在 C2 外侧沿 +e；dZ 在圆心中点下方
  // （圆底屏幕 y = Cv.y + R·s，取两圆较大者 +3）
  const labels: ViewLabel[] = [
    {
      text: `R1=${fmtFigureValue(R1)}`,
      x: C1v.x - (R1 * s + 2.2) * e.x,
      y: C1v.y - (R1 * s + 2.2) * e.y,
      anchor: 'middle',
    },
    {
      text: `R2=${fmtFigureValue(R2)}`,
      x: C2v.x + (R2 * s + 2.2) * e.x,
      y: C2v.y + (R2 * s + 2.2) * e.y,
      anchor: 'middle',
    },
    {
      text: `dZ=${fmtFigureValue(dZ)}`,
      x: (C1v.x + C2v.x) / 2,
      y: Math.max(C1v.y + R1 * s, C2v.y + R2 * s) + 3,
      anchor: 'middle',
    },
  ];

  return {
    segs: [],
    arcs: arcs.map((a) => arcView(map, a)),
    axis: NO_AXIS,
    refDashes: refDashes.map((d) => segView(map, d)),
    refCircles: [],
    centerDots: centerDots.map((p) => map.toView(p)),
    radiusDashes: [],
    labels,
    point: Tv,
    scale: map.scale,
  };
}

/* ------------------------------------------------------------------ AC03 */

/** AC03 两圆弧内切（§3）：同 AC02 双整圆轮廓；圆2 恒在圆1 内；R2 标签置圆2 内（A4 仲裁） */
export function figureAC03(input: Record<string, number>): FigureView {
  const R1 = input.R1 ?? Number.NaN;
  const R2 = input.R2 ?? Number.NaN;
  const dZ = input.dZ ?? Number.NaN;
  // 求解单源：缺键 / 非有限 / 越界（R1>R2>0、0 < dZ < R1−R2）原文上抛
  const solution = solveFor('AC03', input);

  // §3 表：C2=(dZ, √((R1−R2)²−dZ²))（arc-cases-a.ts 文件头 AC03）
  const C1: WP = { z: 0, r: 0 };
  const diff = R1 - R2;
  const C2: WP = { z: dZ, r: Math.sqrt(diff * diff - dZ * dZ) };
  const T = toWP(solution.tangent); // 橙点 = solver.tangent 映射

  const arcs: WArc[] = [...circleArcs(C1, R1), ...circleArcs(C2, R2)];
  const centerDots: WP[] = [C1, C2];
  const refDashes: WSeg[] = [{ from: C1, to: C2 }]; // 连心线

  const others: WP[] = [
    ...circleExtremes(C1, R1),
    ...circleExtremes(C2, R2),
    C1,
    C2,
    T,
  ];
  const map = makeMap(others);
  const C1v = map.toView(C1);
  const C2v = map.toView(C2);
  const Tv = map.toView(T);
  const e = unitView(subView(C2v, C1v));
  const s = map.scale;

  // §3 标签锚法：R1 在 C1 外侧沿 −e；R2 在 C2 圆内 (0,+2.8)（A4 仲裁，避免压圆1）；
  // dZ 在圆心中点下方（圆1 底 +3）
  const labels: ViewLabel[] = [
    {
      text: `R1=${fmtFigureValue(R1)}`,
      x: C1v.x - (R1 * s + 2.2) * e.x,
      y: C1v.y - (R1 * s + 2.2) * e.y,
      anchor: 'middle',
    },
    {
      text: `R2=${fmtFigureValue(R2)}`,
      x: C2v.x,
      y: C2v.y + 2.8,
      anchor: 'middle',
    },
    {
      text: `dZ=${fmtFigureValue(dZ)}`,
      x: (C1v.x + C2v.x) / 2,
      y: C1v.y + R1 * s + 3,
      anchor: 'middle',
    },
  ];

  return {
    segs: [],
    arcs: arcs.map((a) => arcView(map, a)),
    axis: NO_AXIS,
    refDashes: refDashes.map((d) => segView(map, d)),
    refCircles: [],
    centerDots: centerDots.map((p) => map.toView(p)),
    radiusDashes: [],
    labels,
    point: Tv,
    scale: map.scale,
  };
}

/* ------------------------------------------------------------------ AC04 */

/** AC04 圆弧—斜线—圆弧（§3）：弧1 S1→P1（V4.4-01 伴弧）+ 线 P1↔P2 + 弧2 S2→P2
 *  （solver 冻结式）+ 两虚线整圆 + 圆心点 + C↔P 虚半径 ×2 + R1=/R2=/α 标签 */
export function figureAC04(input: Record<string, number>): FigureView {
  const R1 = input.R1 ?? Number.NaN;
  const R2 = input.R2 ?? Number.NaN;
  const alphaDeg = input.angle ?? Number.NaN;
  // 求解单源：缺键 / 非有限 / R≤0 原文上抛
  const solution = solveFor('AC04', input);

  // §3 冻结算式（arc-cases-a.ts 文件头 AC04 + test:180-206）：
  //   u=(cosα,sinα)，n=rot90ccw(u)，P1=(0,0)，P2=(R1+R2)·u，
  //   C1=P1+R1·n，C2=P2+R2·n，S2=C2−R2·u；V4.4-01 伴弧 S1=C1−R1·u
  const alpha = deg2rad(alphaDeg);
  const u: WP = { z: Math.cos(alpha), r: Math.sin(alpha) };
  const n = rotCcw(u);
  const L = R1 + R2; // 冻结约定：斜线段长 = R1+R2
  const P1: WP = { z: 0, r: 0 };
  const P2 = addP(P1, mulP(u, L));
  const C1 = addP(P1, mulP(n, R1));
  const C2 = addP(P2, mulP(n, R2));
  const S2 = subP(C2, mulP(u, R2));
  const S1 = subP(C1, mulP(u, R1));
  const T = toWP(solution.tangent); // = P2（橙点 = solver.tangent 映射，单源）

  // 弧1 S1→P1：S1−C1=−R1·u（角 θ+180°），P1−C1=−R1·n（角 θ+270°）→ 逆时针 90° → cw=false；
  // 弧2 S2→P2：S2−C2=−R2·u，P2−C2=−R2·n → 逆时针 90°（solver 冻结 G03）→ cw=false
  const arcs: WArc[] = [
    { from: S1, to: P1, center: C1, radius: R1, cw: false },
    { from: S2, to: P2, center: C2, radius: R2, cw: false },
  ];
  const segs: WSeg[] = [{ from: P1, to: P2 }];
  const centerDots: WP[] = [C1, C2];
  const radiusDashes: WSeg[] = [
    { from: C1, to: P1 },
    { from: C2, to: P2 },
  ];

  // bbox：虚线整圆计四极值点（§2）；线段 / 弧 / 圆心 / 虚半径均在圆内
  const others: WP[] = [
    ...circleExtremes(C1, R1),
    ...circleExtremes(C2, R2),
    P1,
    P2,
    T,
    C1,
    C2,
    S1,
    S2,
  ];
  const map = makeMap(others);
  const P1v = map.toView(P1);
  const P2v = map.toView(P2);
  const C1v = map.toView(C1);
  const C2v = map.toView(C2);
  const s = map.scale;

  // §3 标签锚法：R1/R2 在虚半径中点 +2.6·rotScreen(单位半径向量)；
  // α 用 V4.3 α 式（斜线屏幕方向 u_view=(cosα,−sinα)，标签在 P1 反向 −2.2）
  const r1Dir = rotScreen(unitView(subView(P1v, C1v)));
  const r2Dir = rotScreen(unitView(subView(P2v, C2v)));
  const uView = rotScreen({ x: Math.cos(alpha), y: -Math.sin(alpha) });
  const labels: ViewLabel[] = [
    {
      text: `R1=${fmtFigureValue(R1)}`,
      x: midView(C1v, P1v).x + 2.6 * r1Dir.x,
      y: midView(C1v, P1v).y + 2.6 * r1Dir.y,
      anchor: 'middle',
    },
    {
      text: `R2=${fmtFigureValue(R2)}`,
      x: midView(C2v, P2v).x + 2.6 * r2Dir.x,
      y: midView(C2v, P2v).y + 2.6 * r2Dir.y,
      anchor: 'middle',
    },
    {
      text: `α${fmtFigureValue(alphaDeg)}°`,
      x: P1v.x - 2.2 * uView.x,
      y: P1v.y - 2.2 * uView.y,
      anchor: 'middle',
    },
  ];

  const refCircles: ViewCircle[] = [
    { cx: C1v.x, cy: C1v.y, r: R1 * s },
    { cx: C2v.x, cy: C2v.y, r: R2 * s },
  ];

  return {
    segs: segs.map((seg) => segView(map, seg)),
    arcs: arcs.map((a) => arcView(map, a)),
    axis: NO_AXIS,
    refDashes: [],
    refCircles,
    centerDots: centerDots.map((p) => map.toView(p)),
    radiusDashes: radiusDashes.map((seg) => segView(map, seg)),
    labels,
    point: map.toView(T),
    scale: map.scale,
  };
}

/* ------------------------------------------------------------------ AC06 */

/** AC06 凹圆弧切入（§3）：入口段（裁轴）/ 弧 S→E / 出口段 + 圆心点 + C↔E 虚半径 +
 *  R/dX=/dZ= 标签；轴线 = 轮廓实体 z 范围（V4.4-04④） */
export function figureAC06(input: Record<string, number>): FigureView {
  const R = input.R ?? Number.NaN;
  const dX = input.dX ?? Number.NaN;
  const dZ = input.dZ ?? Number.NaN;
  // 求解单源：缺键 / 非有限 / R≤0 / 0 < |chord| < 2R 原文上抛
  const solution = solveFor('AC06', input);

  // §3 冻结算式（arc-cases-a.ts:220-230）：S=(0,0)，E=S+c=(dZ,dX/2)，C=M+q·n；
  // tS/tE = rot90ccw(S−C)/R、rot90ccw(E−C)/R（G03 前刀架逆时针）
  const S: WP = { z: 0, r: 0 };
  const E = toWP(solution.tangent); // = 弦终点（橙点）
  const C = toWP(solution.center);
  const tS = mulP(rotCcw(subP(S, C)), 1 / R);
  const tE = mulP(rotCcw(subP(E, C)), 1 / R);
  const entry: WSeg = { from: subP(S, mulP(tS, 2.4 * R)), to: S }; // 2.4R 显示长度（V4.4-04①）
  const exit: WSeg = { from: E, to: addP(E, mulP(tE, 2.4 * R)) };

  // A4-R1：显示段裁至轴线 r≥0（两端均 <0 → 弃段）；裁后零长段（默认入口段与轴交于
  // S，t=1）同样弃段——§3「弃段或退化」两合规，取弃段避免圆帽线端渲染成伪点
  const segs: WSeg[] = [entry, exit]
    .map(clipSegAtAxis)
    .filter((seg): seg is WSeg => seg !== null)
    .filter((seg) => !(seg.from.z === seg.to.z && seg.from.r === seg.to.r));
  // 弧 = 求解实体不裁；S→E 逆时针（solver G03）→ cw=false
  const arc: WArc = { from: S, to: E, center: C, radius: R, cw: false };
  const arcPts = sampleArc(arc);

  // V4.4-04④：轴线 z 范围 = 其余轮廓实体（segs+arcs）z 范围，无额外延伸；
  // 标注类点 / 虚线（圆心点、C↔E 虚半径）不计入轴线跨度
  const contourPts: WP[] = [...segs.flatMap((seg) => [seg.from, seg.to]), ...arcPts];
  const zMin = Math.min(...contourPts.map((p) => p.z));
  const zMax = Math.max(...contourPts.map((p) => p.z));
  const axis: WSeg = { from: { z: zMin, r: 0 }, to: { z: zMax, r: 0 } };

  const others: WP[] = [...contourPts, C, E, axis.from, axis.to];
  const map = makeMap(others);
  const Sv = map.toView(S);
  const Ev = map.toView(E);
  const Cv = map.toView(C);
  const axisY = map.toView({ z: zMin, r: 0 }).y;
  const exitEndV = map.toView(exit.to);

  // §3 标签锚法：R 在 C↔E 虚半径中点 +3·rotScreen(单位半径向量)；
  // dX 在出口段末端 +(0,3)；dZ 在轴线下方 [S,E] 中点
  const rDir = rotScreen(unitView(subView(Ev, Cv)));
  const labels: ViewLabel[] = [
    {
      text: `R${fmtFigureValue(R)}`,
      x: midView(Ev, Cv).x + 3 * rDir.x,
      y: midView(Ev, Cv).y + 3 * rDir.y,
      anchor: 'middle',
    },
    {
      text: `dX=${fmtFigureValue(dX)}`,
      x: exitEndV.x,
      y: exitEndV.y + 3,
      anchor: 'middle',
    },
    {
      text: `dZ=${fmtFigureValue(dZ)}`,
      x: midView(Sv, Ev).x,
      y: axisY + 3,
      anchor: 'middle',
    },
  ];

  return {
    segs: segs.map((seg) => segView(map, seg)),
    arcs: [arcView(map, arc)],
    axis: segView(map, axis),
    refDashes: [],
    refCircles: [],
    centerDots: [Cv],
    radiusDashes: [{ from: C, to: E }].map((seg) => segView(map, seg)),
    labels,
    point: Ev,
    scale: map.scale,
  };
}
