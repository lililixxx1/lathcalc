/**
 * triangle-figure.ts · p12 三角示意图参数化（V4.5 / v0.6.0，WAVE-PLAN-V4.5 §2）
 *
 * 用户反馈 #3「三角 没有图形变化」→ 示意图由解算结果 TriangleResult 驱动实时重建
 * （V4.5-01 形值同源：任何模式解算成功后六值齐备，一个通用生成器覆盖
 * SSS/SAS/ASA/SSA）。本模块纯数字零 DOM；SVG 装配归 p12（零几何）。
 *
 * 几何（V4.5-03）：底边 c 水平，A=(0,0) 左、B=(c,0) 右、C=(x,y) 上（数学系 y 上），
 * x=(b²+c²−a²)/2c（余弦定理投影，triangle.ts:16 同式）、y=√(b²−x²)；钝角时 x 越
 * [0,c]，bbox 取三顶点包络。映射：viewBox 220×104 内框 [16,204]×[16,88]，
 * s=min(188/w, 72/h)，水平居中 + 贴底（底边恒在 y=88），y 翻屏。
 * SSA 双解（V4.5-04）：两解共享底 c 与 A 角（顶点同射线 y/x≡tanA），与主解共用
 * 同一映射（bbox 取双解顶点并集）→ 底边逐位重合，解₂ 虚线叠画不带标签。
 */
import type { TriangleResult } from './types';

export interface TriSeg {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface TriLabel {
  text: string;
  x: number;
  y: number;
}

/** 参数化三角视图（已映射 viewBox 220×104；样式层归 p12 装配） */
export interface TriFigureView {
  /** 解₁ 三边：A→B（c）/ B→C（a）/ C→A（b） */
  segs: readonly TriSeg[];
  /** SSA 解₂ 三边（V4.5-04；单解 / 未传 alt = 空数组） */
  altSegs: readonly TriSeg[];
  /** 直角顶点小方块两段（V4.5-05，7px 屏幕长度；非直角 = 空数组） */
  rightMarks: readonly TriSeg[];
  /** 六标签：a/b/c 边值 + A/B/C 角值（V4.5-02：空格式，边去尾零 / 角 1 位定点去尾零） */
  labels: readonly TriLabel[];
  /** 数学→viewBox 比例（测试不变量用） */
  scale: number;
}

interface P2 {
  x: number;
  y: number;
}

const IN_X0 = 16;
const IN_X1 = 204;
const IN_Y0 = 16;
const IN_Y1 = 88;
const SIDE_OFFSET = 11; // 边标签外法向偏移（V4.5-07）
const VERTEX_OFFSET = 13; // 顶点标签外角平分向偏移
const RIGHT_MARK = 7; // 直角小方块边长（屏幕 px）
/** 直角判定容差（度），与 triangle.ts RIGHT_TOLERANCE_DEG 同值（单源注释互指） */
const RIGHT_TOL = 0.01;

/** 边值标签格式：2 位定点去尾零（与结果卡 toFixed(2) 同源分工；V4.5-02——
 *  arc-figure-kit 的 fmtFigureValue 为 3 位 G 坐标规则，不适用三角图面标签） */
function fmtSide(value: number): string {
  return String(Number(value.toFixed(2)));
}

/** 角值标签格式：1 位定点去尾零（图面紧凑；结果卡保持 2 位——V4.5-02 分工） */
function fmtDeg(value: number): string {
  return String(Number(value.toFixed(1)));
}

/** 数学系三顶点（V4.5-03）；退化三边抛错（UI 保上一帧） */
function mathVertices(result: TriangleResult): { A: P2; B: P2; C: P2 } {
  const { a, b, c } = result;
  if (![a, b, c].every((v) => Number.isFinite(v) && v > 0)) {
    throw new Error('triangle-figure: 边长非法（需正有限值）');
  }
  const x = (b * b + c * c - a * a) / (2 * c);
  const y2 = b * b - x * x;
  if (!Number.isFinite(x) || !(y2 > 0)) {
    throw new Error('triangle-figure: 退化三角形（三边不构成非退化三角）');
  }
  return { A: { x: 0, y: 0 }, B: { x: c, y: 0 }, C: { x, y: Math.sqrt(y2) } };
}

/** 等比映射（贴底 + 水平居中）；bbox 点集 = 主解与 alt 解三顶点并集（V4.5-04） */
function makeMap(points: readonly P2[]): { s: number; toScreen: (p: P2) => P2 } {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const yMin = Math.min(...ys);
  const yMax = Math.max(...ys);
  const w = xMax - xMin;
  const h = yMax - yMin;
  const s = Math.min((IN_X1 - IN_X0) / w, (IN_Y1 - IN_Y0) / h);
  const x0 = IN_X0 + ((IN_X1 - IN_X0) - w * s) / 2;
  const toScreen = (p: P2): P2 => ({ x: x0 + (p.x - xMin) * s, y: IN_Y1 - (p.y - yMin) * s });
  return { s, toScreen };
}

const sub = (p: P2, q: P2): P2 => ({ x: p.x - q.x, y: p.y - q.y });
const add = (p: P2, q: P2): P2 => ({ x: p.x + q.x, y: p.y + q.y });
const mul = (p: P2, k: number): P2 => ({ x: p.x * k, y: p.y * k });
const len = (p: P2): number => Math.hypot(p.x, p.y);
const unit = (p: P2): P2 => {
  const l = len(p);
  return { x: p.x / l, y: p.y / l };
};
const perp = (p: P2): P2 => ({ x: -p.y, y: p.x });

function seg(a: P2, b: P2): TriSeg {
  return { x1: a.x, y1: a.y, x2: b.x, y2: b.y };
}

/** 边标签：中点 + 外法向 SIDE_OFFSET（外=远离对顶点，V4.5-07） */
function sideLabel(text: string, p: P2, q: P2, opposite: P2): TriLabel {
  const mid = mul(add(p, q), 0.5);
  let n = perp(unit(sub(q, p)));
  if (n.x * (mid.x - opposite.x) + n.y * (mid.y - opposite.y) < 0) n = mul(n, -1);
  const at = add(mid, mul(n, SIDE_OFFSET));
  return { text, x: at.x, y: at.y };
}

/** 顶点标签：顶点 + 外角平分向 VERTEX_OFFSET（外=背离三角形内部） */
function vertexLabel(text: string, p: P2, q1: P2, q2: P2): TriLabel {
  const inner = add(unit(sub(q1, p)), unit(sub(q2, p))); // 内角平分向（非退化三角恒非零）
  const at = add(p, mul(unit(inner), -VERTEX_OFFSET));
  return { text, x: at.x, y: at.y };
}

/** 直角小方块两段：直角顶点沿两邻边方向 RIGHT_MARK（V4.5-05） */
function rightMarks(V: P2, q1: P2, q2: P2): TriSeg[] {
  const e1 = mul(unit(sub(q1, V)), RIGHT_MARK);
  const e2 = mul(unit(sub(q2, V)), RIGHT_MARK);
  const corner = add(add(V, e1), e2);
  return [seg(add(V, e1), corner), seg(add(V, e2), corner)];
}

/**
 * 参数化三角图形入口：result=解₁（实线全标签）；alt=SSA 解₂（虚线无标签，可选）。
 * 输入须为 solver 成功输出（solveTriangleBy solutions[i]）；退化防御抛错。
 */
export function buildTriangleFigure(result: TriangleResult, alt?: TriangleResult): TriFigureView {
  const m = mathVertices(result);
  const altM = alt ? mathVertices(alt) : null;
  const map = makeMap(altM ? [m.A, m.B, m.C, altM.A, altM.B, altM.C] : [m.A, m.B, m.C]);

  const A = map.toScreen(m.A);
  const B = map.toScreen(m.B);
  const C = map.toScreen(m.C);
  const segs = [seg(A, B), seg(B, C), seg(C, A)];

  const altSegs = altM
    ? (() => {
        const a2 = map.toScreen(altM.A);
        const b2 = map.toScreen(altM.B);
        const c2 = map.toScreen(altM.C);
        return [seg(a2, b2), seg(b2, c2), seg(c2, a2)];
      })()
    : [];

  // 直角顶点判定（容差同 triangle.ts:10；right=false 时三处均不命中）
  const marks: TriSeg[] = [];
  if (result.right) {
    if (Math.abs(result.A - 90) <= RIGHT_TOL) marks.push(...rightMarks(A, B, C));
    else if (Math.abs(result.B - 90) <= RIGHT_TOL) marks.push(...rightMarks(B, A, C));
    else marks.push(...rightMarks(C, A, B));
  }

  // 基线 SVG text y=基线，顶点标签上移半字高（font-size 11 → +4 视觉居中）；
  // 标签钳位入界（A4-R1/V4.5-08，V4.6-01 按最坏字宽收紧）：高瘦/扁宽三角的外法向/
  // 外角平分向偏移可能把标签推出 viewBox（AC07 同族教训——锚法偏移必须先验边界
  // 余量）。标签格式上限 8 字符（如 `A 143.6°`），font-size 11 按 0.58em/字符保守
  // 估宽 → 半宽 ≈25.5；x∈[27,193] 保右缘 ≤218.5 / 左缘 ≥1.5（viewBox 宽 220），
  // y∈[9,101] 保字高与降部。V4.5-08 的 x∈[20,200] 只按 anchor 半宽估算，未计
  // `a 45.83` 这类 7 字符标签实长（x=200 时右缘 ≈222 越界）。
  const clamp = (l: TriLabel): TriLabel => ({
    text: l.text,
    x: Math.min(Math.max(l.x, 27), 193),
    y: Math.min(Math.max(l.y, 9), 101),
  });
  const lift = (label: TriLabel, dy: number): TriLabel => ({ ...label, y: label.y + dy });
  const labels: TriLabel[] = [
    sideLabel(`a ${fmtSide(result.a)}`, B, C, A),
    sideLabel(`b ${fmtSide(result.b)}`, C, A, B),
    sideLabel(`c ${fmtSide(result.c)}`, A, B, C),
    lift(vertexLabel(`A ${fmtDeg(result.A)}°`, A, B, C), 4),
    lift(vertexLabel(`B ${fmtDeg(result.B)}°`, B, A, C), 4),
    lift(vertexLabel(`C ${fmtDeg(result.C)}°`, C, A, B), 4),
  ].map(clamp);

  return { segs, altSegs, rightMarks: marks, labels, scale: map.s };
}
