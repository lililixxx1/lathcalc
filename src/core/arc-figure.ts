/**
 * arc-figure.ts · 参数化工况图形（V4.3 试点 AC01/AC05 + V4.4 推广分发）
 *
 * 用户反馈「展示的图形能否随着数值的变化而变化」→ v0.4.0 试点两案；用户裁决推广
 * 全 12 案（v0.5.0，WAVE-PLAN-V4.4）。规格：docs/plan/WAVE-PLAN-V4.4.md（§2 契约
 * 增量 / §3·§4 各案几何）；V4.3 §2/§3.1 映射、裁线、格式化规则沿用不改。
 *
 *  ===== 本文件结构（V4.4 契约提交起）=====
 *  - 共享几何工具与冻结约定 → arc-figure-kit.ts（实现文件只从 kit 取工具，
 *    避免与本分发器循环依赖）。
 *  - AC02/03/04/06 → arc-figure-a2.ts；AC07–AC12 → arc-figure-b.ts。
 *  - 本文件：FigureView 契约 + AC01/AC05 试点实现 + buildArcFigure 分发。
 *  - PARAMETRIC_CASES 在 Lead 集成提交前保持 ['AC01','AC05']（V4.4-05：
 *    p06 门控用它，避免主仓出现半参数化中间态）。
 */
import type {
  ParametricCaseId,
  ViewArc,
  ViewCircle,
  ViewLabel,
  ViewPoint,
  ViewSeg,
  WP,
  WSeg,
} from './arc-figure-kit';
import {
  addP,
  arcView,
  clipSegAtAxis,
  deg2rad,
  fmtFigureValue,
  makeMap,
  midView,
  mulP,
  rotCcw,
  rotCw,
  rotScreen,
  sampleArc,
  segView,
  solveFor,
  subP,
  unitView,
} from './arc-figure-kit';
import { figureAC02, figureAC03, figureAC04, figureAC06 } from './arc-figure-a2';
import { figureAC07, figureAC08, figureAC09, figureAC10, figureAC11, figureAC12 } from './arc-figure-b';

export type { ParametricCaseId, ViewCircle } from './arc-figure-kit';
export { fmtFigureValue } from './arc-figure-kit';

/** p06 大图参数化门控：试点翻转时机见 V4.4-05（Lead 集成提交一次翻全 12 案） */
export const PARAMETRIC_CASES: readonly ParametricCaseId[] = ['AC01', 'AC05'];

/** 参数化图形规格（全部已映射到 viewBox 64×34；样式层归 p05 装配） */
export interface FigureView {
  /** 零件轮廓线段（currentColor） */
  segs: readonly ViewSeg[];
  /** 零件轮廓圆弧（currentColor）；实线整圆 = 2 条互补半圆（kit circleArcs） */
  arcs: readonly ViewArc[];
  /** 回转轴线（细线）；纯相切案（AC02/03/04）无轴线——seg 置零长退化段 */
  axis: ViewSeg;
  /** 参考虚线（角点残料、连心线等） */
  refDashes: readonly ViewSeg[];
  /** 虚线整圆参照（la-sub，V4.4 契约增量） */
  refCircles: readonly ViewCircle[];
  /** 圆心灰点 */
  centerDots: readonly ViewPoint[];
  /** 圆心↔切点虚半径 */
  radiusDashes: readonly ViewSeg[];
  /** 值标签（回显求解器真值，V4.3-01 裁决；多字符键等号防误读，V4.4-02） */
  labels: readonly ViewLabel[];
  /** 橙点 = 切点（solution.tangent） */
  point: ViewPoint;
  /** 工件→viewBox 比例（测试不变量用） */
  scale: number;
}

/** 四分之一弧起点导出（V4.3 §2；AC01/AC05 专用——推广案的起点按 V4.4 §3/§4 各自构造） */
function quarterArc(id: 'AC01' | 'AC05', input: Record<string, number>): {
  P: WP;
  C: WP;
  S: WP;
  cw: boolean;
} {
  const solution = solveFor(id, input);
  const P: WP = { z: solution.tangent.z, r: solution.tangent.x / 2 };
  const C: WP = { z: solution.center.z, r: solution.center.x / 2 };
  // 前刀架冻结契约（arc-cases-a.ts 文件头）：AC01 图面顺时针 G02、AC05 逆时针 G03
  const cw = id === 'AC01';
  const S = addP(C, cw ? rotCcw(subP(P, C)) : rotCw(subP(P, C)));
  // 四分之一弧守恒：|S−C| = |P−C| = R，|S−P| = R√2（防非四分之一案误用本导出式）
  const dSC = Math.hypot(S.z - C.z, S.r - C.r);
  const dPC = Math.hypot(P.z - C.z, P.r - C.r);
  const dSP = Math.hypot(S.z - P.z, S.r - P.r);
  const eps = 1e-6 * Math.max(1, dPC);
  if (Math.abs(dSC - dPC) > eps || Math.abs(dSP - dPC * Math.SQRT2) > eps) {
    throw new Error('arc-figure: 非 四分之一弧，导出式不适用（见文件头约定）');
  }
  return { P, C, S, cw };
}

/* ------------------------------------------------------------------ AC01 */

/** AC01 直线—圆弧相切（V4.3 §3）：切线 ±Ld·u、弧 S→P、S 处切入直腿、轴线、R/α/Ø 值标签 */
function figureAC01(input: Record<string, number>): FigureView {
  const R = input.R ?? Number.NaN;
  const alpha = deg2rad(input.angle ?? Number.NaN);
  const stepD = input.stepD ?? Number.NaN;
  const { P, C, S, cw } = quarterArc('AC01', input);

  const u: WP = { z: Math.cos(alpha), r: Math.sin(alpha) };
  const n = rotCcw(u);
  const Ld = 2.4 * R + 0.25 * Math.abs(stepD); // §1 显示长度约定
  const A = subP(P, mulP(u, Ld)); // 切线两端
  const B = addP(P, mulP(u, Ld));
  const E = subP(S, mulP(n, 2.4 * R)); // 切入直腿（S 处弧切向 = n）

  // A4-R1：切线/直腿为显示长度段，裁至轴线 r≥0（见 clipSegAtAxis 注）
  const segs: WSeg[] = [
    { from: A, to: B },
    { from: E, to: S },
  ]
    .map(clipSegAtAxis)
    .filter((s): s is WSeg => s !== null);
  const arc = { from: S, to: P, center: C, radius: R, cw };
  const centerDots: WP[] = [C];
  const radiusDashes: WSeg[] = [{ from: C, to: P }];

  // bbox 点集 = 全部被绘制实体（§2，R1 后=裁剪后线段端点）；轴线 z 取其余实体范围
  const others: WP[] = [...segs.flatMap((s) => [s.from, s.to]), P, C, ...sampleArc(arc)];
  const zMin = Math.min(...others.map((p) => p.z));
  const zMax = Math.max(...others.map((p) => p.z));
  const axis: WSeg = { from: { z: zMin, r: 0 }, to: { z: zMax, r: 0 } };
  const map = makeMap([...others, axis.from, axis.to]);

  const Pv = map.toView(P);
  const Cv = map.toView(C);
  const axisY = map.toView({ z: zMin, r: 0 }).y;

  // 标签（§3 表 + R1：R 避让 2.2→3.0；α 用切线屏幕方向 (cosα,−sinα)；
  // Ø 在轴线下方切点 z 处）
  const rDir = rotScreen(unitView({ x: Pv.x - Cv.x, y: Pv.y - Cv.y }));
  const aDir = rotScreen({ x: Math.cos(alpha), y: -Math.sin(alpha) });
  const labels: ViewLabel[] = [
    {
      text: `R${fmtFigureValue(R)}`,
      x: midView(Pv, Cv).x + 3 * rDir.x,
      y: midView(Pv, Cv).y + 3 * rDir.y,
      anchor: 'middle',
    },
    {
      text: `α${fmtFigureValue(input.angle ?? Number.NaN)}°`,
      x: Pv.x - 2.2 * aDir.x,
      y: Pv.y - 2.2 * aDir.y,
      anchor: 'middle',
    },
    {
      text: `Ø${fmtFigureValue(stepD)}`,
      x: Pv.x,
      y: axisY + 3,
      anchor: 'middle',
    },
  ];

  return {
    segs: segs.map((s) => segView(map, s)),
    arcs: [arcView(map, arc)],
    axis: segView(map, axis),
    refDashes: [],
    refCircles: [],
    centerDots: centerDots.map((p) => map.toView(p)),
    radiusDashes: radiusDashes.map((s) => segView(map, s)),
    labels,
    point: Pv,
    scale: map.scale,
  };
}

/* ------------------------------------------------------------------ AC05 */

/** AC05 台阶倒圆（V4.3 §4）：端面/小径/弧/台阶面/大径显示段 + 角点残料虚线 + R/Ø/Z 值标签 */
function figureAC05(input: Record<string, number>): FigureView {
  const R = input.R ?? Number.NaN;
  const stepX = input.stepX ?? Number.NaN;
  const stepZ = input.stepZ ?? Number.NaN;
  const { P, C, S: Q, cw } = quarterArc('AC05', input);

  const zLeft = stepZ - 2.8 * R; // §1 显示长度约定
  const rTop = stepX / 2 + 1.9 * R;

  const faceTop: WP = { z: 0, r: rTop };
  const shoulderTop: WP = { z: stepZ, r: rTop };
  const smallEnd: WP = { z: zLeft, r: stepX / 2 };
  const K: WP = { z: stepZ, r: stepX / 2 }; // 尖角（残料虚线拐点）

  const segs: WSeg[] = [
    { from: { z: 0, r: 0 }, to: faceTop }, // 端面 z=0
    { from: smallEnd, to: Q }, // 小径外圆
    { from: P, to: shoulderTop }, // 台阶面
    { from: shoulderTop, to: faceTop }, // 大径显示段（§1 约定）
  ];
  const arc = { from: Q, to: P, center: C, radius: R, cw };
  const refDashes: WSeg[] = [
    { from: Q, to: K }, // 被圆角去除的尖角棱（仅触弧于 Q/P，§4 算式注）
    { from: K, to: P },
  ];
  const centerDots: WP[] = [C];
  const radiusDashes: WSeg[] = [{ from: C, to: P }];

  const others: WP[] = [
    { z: 0, r: 0 },
    faceTop,
    shoulderTop,
    smallEnd,
    P,
    Q,
    K,
    C,
    ...sampleArc(arc),
  ];
  const axis: WSeg = { from: { z: zLeft, r: 0 }, to: { z: 0, r: 0 } };
  const map = makeMap([...others, axis.from, axis.to]);

  const Pv = map.toView(P);
  const Cv = map.toView(C);
  const axisY = map.toView({ z: 0, r: 0 }).y;

  // 标签（§4 表）：R 在虚半径上方、Ø 在小径下方、Z 在轴线下方 [stepZ,0] 中点
  const labels: ViewLabel[] = [
    {
      text: `R${fmtFigureValue(R)}`,
      x: midView(Pv, Cv).x,
      y: midView(Pv, Cv).y - 2.4,
      anchor: 'middle',
    },
    {
      text: `Ø${fmtFigureValue(stepX)}`,
      x: map.toView({ z: (zLeft + (stepZ - R)) / 2, r: stepX / 2 }).x,
      y: map.toView({ z: 0, r: stepX / 2 }).y + 3,
      anchor: 'middle',
    },
    {
      text: `Z${fmtFigureValue(stepZ)}`,
      x: map.toView({ z: stepZ / 2, r: 0 }).x,
      y: axisY + 3,
      anchor: 'middle',
    },
  ];

  return {
    segs: segs.map((s) => segView(map, s)),
    arcs: [arcView(map, arc)],
    axis: segView(map, axis),
    refDashes: refDashes.map((s) => segView(map, s)),
    refCircles: [],
    centerDots: centerDots.map((p) => map.toView(p)),
    radiusDashes: radiusDashes.map((s) => segView(map, s)),
    labels,
    point: Pv,
    scale: map.scale,
  };
}

/** 参数化工况图形入口：全 12 案分发（V4.4 §2）；未实现案由桩上抛 */
export function buildArcFigure(id: ParametricCaseId, input: Record<string, number>): FigureView {
  switch (id) {
    case 'AC01':
      return figureAC01(input);
    case 'AC02':
      return figureAC02(input);
    case 'AC03':
      return figureAC03(input);
    case 'AC04':
      return figureAC04(input);
    case 'AC05':
      return figureAC05(input);
    case 'AC06':
      return figureAC06(input);
    case 'AC07':
      return figureAC07(input);
    case 'AC08':
      return figureAC08(input);
    case 'AC09':
      return figureAC09(input);
    case 'AC10':
      return figureAC10(input);
    case 'AC11':
      return figureAC11(input);
    case 'AC12':
      return figureAC12(input);
  }
}
