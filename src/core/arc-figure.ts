/**
 * arc-figure.ts · 参数化工况图形（V4.3 试点：AC01 + AC05）
 *
 * 用户反馈「展示的图形能否随着数值的变化而变化」→ 试点两案：图形随输入实时重建。
 * 规格：docs/plan/WAVE-PLAN-V4.3.md（§2 契约 / §3 AC01 / §4 AC05，金锚 Lead 预复算）。
 *
 *  ===== 冻结约定（V4.3 §1/§2）=====
 *  - 求解单源：只调 core solve()（按 solver.inputs 择键），本模块不另写几何公式；
 *    异常原样上抛（UI 保上一帧）。不传 rearToolPost——几何与前/后刀架无关
 *    （翻转的是判向标签，arc-cases-a.ts 文件头契约）。
 *  - 坐标：工件半径空间 (z, r)，r = X/2（solve 出直径制，此处 /2 还原）；
 *    映射 viewBox 64×34：x = x0+(z−zmin)·s，y = y0−(r−rmin)·s，等比 s（保圆），
 *    内框 [4,60]×[3.5,30.5] 后居中。
 *  - 弧起点导出：ArcSolution 无起点，四分之一弧恒等式——顺时针 S→P 时
 *    S = C + rot90ccw(P−C)，逆时针 S→C + rot90cw(P−C)；rot90ccw(z,r)=(−r,z)。
 *    仅对四分之一弧成立（两试点案满足，arc-cases-a.ts 文件头「顺/逆时针 90°」），
 *    推广非四分之一案时须另立导出式。
 *  - SVG sweep 换算：(z,r) 平面顺时针 → 屏幕（y 向下）sweep=1；large-arc 恒 0。
 *  - 显示长度约定（§1，同 AC04 L=R1+R2 先例）：AC01 Ld=2.4R+0.25|stepD|、
 *    直腿 2.4R；AC05 z_left=stepZ−2.8R、r_top=stepX/2+1.9R。
 */
import type { ArcCaseSolver, ArcSolution } from './types';
import { arcCasesA } from './arc-cases-a';

export type ParametricCaseId = 'AC01' | 'AC05';

export const PARAMETRIC_CASES: readonly ParametricCaseId[] = ['AC01', 'AC05'];

/** viewBox 64×34 内一个映射后的点 / 线段 */
export interface ViewPoint {
  x: number;
  y: number;
}

export interface ViewSeg {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface ViewArc {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  /** rx = ry（等比映射保圆），viewBox 单位 */
  rx: number;
  sweep: 0 | 1;
}

export interface ViewLabel {
  text: string;
  x: number;
  y: number;
  anchor: 'start' | 'middle' | 'end';
}

/** 参数化图形规格（全部已映射到 viewBox 64×34；样式层归 p05 装配） */
export interface FigureView {
  /** 零件轮廓线段（currentColor） */
  segs: readonly ViewSeg[];
  /** 零件轮廓圆弧（currentColor） */
  arcs: readonly ViewArc[];
  /** 回转轴线（细线） */
  axis: ViewSeg;
  /** 参考虚线（角点残料等） */
  refDashes: readonly ViewSeg[];
  /** 圆心灰点 */
  centerDots: readonly ViewPoint[];
  /** 圆心↔切点虚半径 */
  radiusDashes: readonly ViewSeg[];
  /** 值标签（回显求解器真值，V4.3-01 裁决） */
  labels: readonly ViewLabel[];
  /** 橙点 = 切点（solution.tangent） */
  point: ViewPoint;
  /** 工件→viewBox 比例（测试不变量用） */
  scale: number;
}

/** 工件半径空间 (z, r) */
interface WP {
  z: number;
  r: number;
}

interface WSeg {
  from: WP;
  to: WP;
}

interface WArc {
  from: WP;
  to: WP;
  center: WP;
  radius: number;
  /** (z,r) 平面内顺时针（前刀架冻结契约，非 solution.direction） */
  cw: boolean;
}

const deg2rad = (deg: number): number => (deg * Math.PI) / 180;
const addP = (a: WP, b: WP): WP => ({ z: a.z + b.z, r: a.r + b.r });
const subP = (a: WP, b: WP): WP => ({ z: a.z - b.z, r: a.r - b.r });
const mulP = (a: WP, k: number): WP => ({ z: a.z * k, r: a.r * k });
/** (z,r) 平面逆时针 90°（z 右、r 上）：rot90ccw(z,r) = (−r, z) */
const rotCcw = (v: WP): WP => ({ z: -v.r, r: v.z });
/** (z,r) 平面顺时针 90° */
const rotCw = (v: WP): WP => ({ z: v.r, r: -v.z });

/** 值格式：≤3 位小数、去尾零、整数不带点、−0 归 0（与 arc-cases-a fmtCoord 同规则） */
export function fmtFigureValue(v: number): string {
  const rounded = Math.round(v * 1000) / 1000;
  let text = (Object.is(rounded, -0) ? 0 : rounded).toFixed(3).replace(/0+$/, '');
  if (text.endsWith('.')) text = text.slice(0, -1);
  return text;
}

function solverOf(id: ParametricCaseId): ArcCaseSolver {
  const found = arcCasesA.find((solver) => solver.id === id);
  if (!found) throw new Error(`arc-figure: unknown case ${id}`);
  return found;
}

/** 求解单源：择 solver.inputs 键调用 solve()；不传 rearToolPost（§1） */
function solveFor(id: ParametricCaseId, input: Record<string, number>): ArcSolution {
  const solver = solverOf(id);
  const picked: Record<string, number> = {};
  for (const key of solver.inputs) {
    const v = input[key];
    if (typeof v === 'number' && Number.isFinite(v)) picked[key] = v;
    // 缺键留给 solve() 的 req() 报错（原文上抛）
  }
  return solver.solve(picked);
}

/** solution（直径制）→ 半径空间；起点按四分之一弧恒等式导出 */
function quarterArc(id: ParametricCaseId, input: Record<string, number>): {
  P: WP;
  C: WP;
  S: WP;
  cw: boolean;
  solution: ArcSolution;
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
  return { P, C, S, cw, solution };
}

/** 弧采样（bbox 用）：四分之一弧每 22.5° 共 5 点（§2） */
function sampleArc(arc: WArc): WP[] {
  const a1 = Math.atan2(arc.from.r - arc.center.r, arc.from.z - arc.center.z);
  const a2 = Math.atan2(arc.to.r - arc.center.r, arc.to.z - arc.center.z);
  let sweep = a2 - a1;
  if (arc.cw && sweep > 0) sweep -= 2 * Math.PI;
  if (!arc.cw && sweep < 0) sweep += 2 * Math.PI;
  const points: WP[] = [];
  for (let t = 0; t <= 4; t += 1) {
    const a = a1 + (sweep * t) / 4;
    points.push(addP(arc.center, { z: arc.radius * Math.cos(a), r: arc.radius * Math.sin(a) }));
  }
  return points;
}

/** 等比映射：内框 [4,60]×[3.5,30.5] 居中；返回换算器与比例 */
function makeMap(pts: readonly WP[]): {
  scale: number;
  toView: (p: WP) => ViewPoint;
} {
  let z0 = Infinity;
  let z1 = -Infinity;
  let r0 = Infinity;
  let r1 = -Infinity;
  for (const p of pts) {
    z0 = Math.min(z0, p.z);
    z1 = Math.max(z1, p.z);
    r0 = Math.min(r0, p.r);
    r1 = Math.max(r1, p.r);
  }
  const w = z1 - z0;
  const h = r1 - r0;
  if (!(w > 0) || !(h > 0)) throw new Error('arc-figure: 退化包围盒（宽或高为 0）');
  const scale = Math.min(56 / w, 27 / h);
  const x0 = 4 + (56 - w * scale) / 2;
  const y0 = 30.5 - (27 - h * scale) / 2;
  return {
    scale,
    toView: (p: WP): ViewPoint => ({ x: x0 + (p.z - z0) * scale, y: y0 - (p.r - r0) * scale }),
  };
}

/** 显示段裁至轴线 r=0（A4-R1：显示长度段 α 小/ R 大时沿 −n 伸到 r<0 穿轴压 Ø 标签；
 *  车工图 r≥0 半平面惯例。两端均 <0 → 弃段；求解实体（弧）不裁——保几何真值） */
function clipSegAtAxis(s: WSeg): WSeg | null {
  if (s.from.r >= 0 && s.to.r >= 0) return s;
  if (s.from.r < 0 && s.to.r < 0) return null;
  const below = s.from.r < 0 ? s.from : s.to;
  const above = s.from.r < 0 ? s.to : s.from;
  const t = below.r / (below.r - above.r); // r=0 交点参数（below.r<0<above.r）
  return {
    from: above,
    to: { z: below.z + (above.z - below.z) * t, r: 0 },
  };
}

const segView = (map: { toView: (p: WP) => ViewPoint }, s: WSeg): ViewSeg => {
  const a = map.toView(s.from);
  const b = map.toView(s.to);
  return { x1: a.x, y1: a.y, x2: b.x, y2: b.y };
};

/** 屏幕向量 90° 旋转（y 向下）：rotScreen(x,y) = (−y,x) */
const rotScreen = (v: ViewPoint): ViewPoint => ({ x: -v.y, y: v.x });

const unitView = (v: ViewPoint): ViewPoint => {
  const len = Math.hypot(v.x, v.y);
  if (len === 0) throw new Error('arc-figure: 零长向量');
  return { x: v.x / len, y: v.y / len };
};

const midView = (a: ViewPoint, b: ViewPoint): ViewPoint => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

/* ------------------------------------------------------------------ AC01 */

/** AC01 直线—圆弧相切（§3）：切线 ±Ld·u、弧 S→P、S 处切入直腿、轴线、R/α/Ø 值标签 */
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
  const arc: WArc = { from: S, to: P, center: C, radius: R, cw };
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
    arcs: [
      {
        x1: map.toView(arc.from).x,
        y1: map.toView(arc.from).y,
        x2: map.toView(arc.to).x,
        y2: map.toView(arc.to).y,
        rx: R * map.scale,
        sweep: cw ? 1 : 0,
      },
    ],
    axis: segView(map, axis),
    refDashes: [],
    centerDots: centerDots.map((p) => map.toView(p)),
    radiusDashes: radiusDashes.map((s) => segView(map, s)),
    labels,
    point: Pv,
    scale: map.scale,
  };
}

/* ------------------------------------------------------------------ AC05 */

/** AC05 台阶倒圆（§4）：端面/小径/弧/台阶面/大径显示段 + 角点残料虚线 + R/Ø/Z 值标签 */
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
  const arc: WArc = { from: Q, to: P, center: C, radius: R, cw };
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
    arcs: [
      {
        x1: map.toView(arc.from).x,
        y1: map.toView(arc.from).y,
        x2: map.toView(arc.to).x,
        y2: map.toView(arc.to).y,
        rx: R * map.scale,
        sweep: cw ? 1 : 0,
      },
    ],
    axis: segView(map, axis),
    refDashes: refDashes.map((s) => segView(map, s)),
    centerDots: centerDots.map((p) => map.toView(p)),
    radiusDashes: radiusDashes.map((s) => segView(map, s)),
    labels,
    point: Pv,
    scale: map.scale,
  };
}

/** 参数化工况图形（V4.3 试点入口；推广其余案另立计划） */
export function buildArcFigure(id: ParametricCaseId, input: Record<string, number>): FigureView {
  return id === 'AC01' ? figureAC01(input) : figureAC05(input);
}
