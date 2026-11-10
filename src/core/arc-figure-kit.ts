/**
 * arc-figure-kit.ts · 参数化图形共享几何工具（V4.4 契约预置，Lead 冻结）
 *
 * 自 arc-figure.ts 原样迁出（搬迁部分零逻辑改动，18 条既有测试即回归）；V4.4 起
 * 本模块含一处**受控增量**：sampleArc 补跨度内四向 cardinal 极值（一般弧 <180° 时
 * 弧极值可落在均匀采样点之间，bbox 必须含极值才紧；四分之一弧行为与 V4.3 一致，
 * 详见 sampleArc 注）。arc-figure-a2/b 两个实现文件只从本模块取工具，避免与
 * dispatcher 循环依赖。
 *
 *  ===== 冻结约定（V4.3 §1/§2 + V4.4 §2 增量，全文见 docs/plan/WAVE-PLAN-V4.4.md）=====
 *  - 求解单源：solveFor 按 solver.inputs 择键调 core solve()，不传 rearToolPost；
 *    异常原样上抛（UI 保上一帧）。
 *  - 坐标：工件半径空间 (z, r)，r = X/2；映射 viewBox 64×34 等比居中（保圆），
 *    内框 [4,60]×[3.5,30.5]。
 *  - sweep：ViewArc.sweep = 工件面 cw ? 1 : 0（V4.3 已上线口径；等价于视图坐标
 *    cross = (x2−x1)(cy−y1) − (y2−y1)(cx−x1) > 0 → 1，pinned AC01=1/AC05=0）。
 *    ⚠️ 仅用于 <180° 弧；整圆半圆见 circleArcs（180° 弦上 cross 恒 0 退化）。
 *  - 整圆装配（V4.4 §2）：2 条半圆 WArc（左极点→右极点、右极点→左极点），
 *    cw 同取 true（同旋转向 + 反向弦必拼互补整圆，形状与取向选择无关）。
 *  - 显示段裁至轴线 r≥0（V4.3 A4-R1）；弧=求解实体不裁。
 */
import type { ArcCaseSolver, ArcSolution } from './types';
import { arcCasesA } from './arc-cases-a';
import { arcCasesB } from './arc-cases-b';

export type ParametricCaseId =
  | 'AC01'
  | 'AC02'
  | 'AC03'
  | 'AC04'
  | 'AC05'
  | 'AC06'
  | 'AC07'
  | 'AC08'
  | 'AC09'
  | 'AC10'
  | 'AC11'
  | 'AC12';

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

/** 虚线整圆参照（viewBox 坐标） */
export interface ViewCircle {
  cx: number;
  cy: number;
  r: number;
}

export interface ViewLabel {
  text: string;
  x: number;
  y: number;
  anchor: 'start' | 'middle' | 'end';
}

/** 工件半径空间 (z, r) */
export interface WP {
  z: number;
  r: number;
}

export interface WSeg {
  from: WP;
  to: WP;
}

export interface WArc {
  from: WP;
  to: WP;
  center: WP;
  radius: number;
  /** (z,r) 平面内顺时针（前刀架冻结契约，非 solution.direction） */
  cw: boolean;
}

export const deg2rad = (deg: number): number => (deg * Math.PI) / 180;
export const addP = (a: WP, b: WP): WP => ({ z: a.z + b.z, r: a.r + b.r });
export const subP = (a: WP, b: WP): WP => ({ z: a.z - b.z, r: a.r - b.r });
export const mulP = (a: WP, k: number): WP => ({ z: a.z * k, r: a.r * k });
/** (z,r) 平面逆时针 90°（z 右、r 上）：rot90ccw(z,r) = (−r, z) */
export const rotCcw = (v: WP): WP => ({ z: -v.r, r: v.z });
/** (z,r) 平面顺时针 90° */
export const rotCw = (v: WP): WP => ({ z: v.r, r: -v.z });

/** 值格式：≤3 位小数、去尾零、整数不带点、−0 归 0（与 arc-cases-a fmtCoord 同规则） */
export function fmtFigureValue(v: number): string {
  const rounded = Math.round(v * 1000) / 1000;
  let text = (Object.is(rounded, -0) ? 0 : rounded).toFixed(3).replace(/0+$/, '');
  if (text.endsWith('.')) text = text.slice(0, -1);
  return text;
}

function solverOf(id: ParametricCaseId): ArcCaseSolver {
  const found = [...arcCasesA, ...arcCasesB].find((solver) => solver.id === id);
  if (!found) throw new Error(`arc-figure: unknown case ${id}`);
  return found;
}

/** 求解单源：择 solver.inputs 键调用 solve()；不传 rearToolPost（§1） */
export function solveFor(id: ParametricCaseId, input: Record<string, number>): ArcSolution {
  const solver = solverOf(id);
  const picked: Record<string, number> = {};
  for (const key of solver.inputs) {
    const v = input[key];
    if (typeof v === 'number' && Number.isFinite(v)) picked[key] = v;
    // 缺键留给 solve() 的 req() 报错（原文上抛）
  }
  return solver.solve(picked);
}

/** 弧采样（bbox 用）：均匀 5 点（0/25/50/75/100%）+ 跨度内的四向极值点
 *  （0°/90°/180°/270°——V4.4 增量：一般弧 <180° 时弧极值可落在采样点之间，
 *  bbox 必须含跨度内 cardinal 极值才紧；四分之一弧行为与 V4.3 一致不变） */
export function sampleArc(arc: WArc): WP[] {
  const TAU = 2 * Math.PI;
  const a1 = Math.atan2(arc.from.r - arc.center.r, arc.from.z - arc.center.z);
  const a2 = Math.atan2(arc.to.r - arc.center.r, arc.to.z - arc.center.z);
  let sweep = a2 - a1;
  if (arc.cw && sweep > 0) sweep -= TAU;
  if (!arc.cw && sweep < 0) sweep += TAU;
  const points: WP[] = [];
  for (let t = 0; t <= 4; t += 1) {
    const a = a1 + (sweep * t) / 4;
    points.push(addP(arc.center, { z: arc.radius * Math.cos(a), r: arc.radius * Math.sin(a) }));
  }
  const span = Math.abs(sweep);
  for (let k = 0; k < 4; k += 1) {
    const theta = (k * Math.PI) / 2;
    const ahead = ((theta - a1) % TAU + TAU) % TAU; // 自 a1 逆时针走到 θ 的角距
    const dist = sweep >= 0 ? ahead : TAU - ahead; // 沿实际旋向走到 θ 的角距
    if (dist > 0 && dist < span) {
      points.push({
        z: arc.center.z + arc.radius * Math.cos(theta),
        r: arc.center.r + arc.radius * Math.sin(theta),
      });
    }
  }
  return points;
}

/** 等比映射：内框 [4,60]×[3.5,30.5] 居中；返回换算器与比例 */
export function makeMap(pts: readonly WP[]): {
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
export function clipSegAtAxis(s: WSeg): WSeg | null {
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

export const segView = (map: { toView: (p: WP) => ViewPoint }, s: WSeg): ViewSeg => {
  const a = map.toView(s.from);
  const b = map.toView(s.to);
  return { x1: a.x, y1: a.y, x2: b.x, y2: b.y };
};

/** 工件弧 → ViewArc（sweep = cw ? 1 : 0，V4.3 口径；rx=R·s 保圆） */
export const arcView = (
  map: { scale: number; toView: (p: WP) => ViewPoint },
  arc: WArc,
): ViewArc => {
  const a = map.toView(arc.from);
  const b = map.toView(arc.to);
  return {
    x1: a.x,
    y1: a.y,
    x2: b.x,
    y2: b.y,
    rx: arc.radius * map.scale,
    sweep: arc.cw ? 1 : 0,
  };
};

/** 实线整圆 = 2 条互补半圆 WArc（V4.4 §2：cw 同取 true——同旋转向+反向弦拼整圆；
 *  180° 弦上 sweep cross 判定式退化，禁用 cross 定整圆半圆 sweep，直接走 cw?1:0=1） */
export function circleArcs(center: WP, radius: number): [WArc, WArc] {
  const L: WP = { z: center.z - radius, r: center.r };
  const R: WP = { z: center.z + radius, r: center.r };
  return [
    { from: L, to: R, center, radius, cw: true },
    { from: R, to: L, center, radius, cw: true },
  ];
}

/** 屏幕向量 90° 旋转（y 向下）：rotScreen(x,y) = (−y,x) */
export const rotScreen = (v: ViewPoint): ViewPoint => ({ x: -v.y, y: v.x });

export const unitView = (v: ViewPoint): ViewPoint => {
  const len = Math.hypot(v.x, v.y);
  if (len === 0) throw new Error('arc-figure: 零长向量');
  return { x: v.x / len, y: v.y / len };
};

export const midView = (a: ViewPoint, b: ViewPoint): ViewPoint => ({
  x: (a.x + b.x) / 2,
  y: (a.y + b.y) / 2,
});

/** 圆的 bbox 四极值点（V4.4 §2：refCircles/整圆计 bbox 用） */
export function circleExtremes(center: WP, radius: number): WP[] {
  return [
    { z: center.z - radius, r: center.r },
    { z: center.z + radius, r: center.r },
    { z: center.z, r: center.r - radius },
    { z: center.z, r: center.r + radius },
  ];
}

/* ============ 标签防碰撞后处理（V4.12-A，Lead 定向修法） ============
 * 修法（派工单 V4.12-A，禁改架构）：按 labels 数组序为优先级（先者不动），对每个与
 * 前面任一标签 est. bbox 相交（含净距不足）的标签，沿预设候选偏移方向序列逐步 nudge
 * 直至消解，最后按 viewBox 边界钳位；buildArcFigure 出口统一应用于全部 12 参数化案。
 * 硬约束：① 输出保持数组顺序与 text 不变（test/ui-p06-param.test.ts:77-88 有序断言）；
 *         ② 零 DOM（纯数字，与映射几何无关）。
 * 判定口径（派工单预置，禁自选他套估宽）：
 *  - 字号 3.2 view-unit（src/ui/pages/p05.ts:336 font-size="3.2" 渲染真值，同
 *    arc-figure-a2.ts:53 现行推导）
 *  - 估宽 1.856 u/西文字符（= 0.58×3.2，arc-figure-a2.ts:50-58）；CJK 字符 3.2 u（1em）
 *  - 字高框 [y−2.56, y+0.8]（0.8em+0.25em 基线框，同源 a2:50-58）
 *  - 净距 = 两框 axis-gap max（V4.6-02 boxesOverlap pad 同式，arc-figure-a2.ts:59-63）；
 *    验收阈值 1.5 view-unit（1.5/1.856≈0.81 字符宽；较 V4.6 0.4u 净空先例收紧）
 * 先例锚（G0 勘正版）：两两避让 = arc-figure-a2.ts:292/315（0.64/步对角避让、0.4 净空）；
 * viewBox 钳位 = triangle-figure.ts:181-185（V4.6-01）。
 * 实现细化（对修法「nudge→钳位」次序的保守化）：候选位 = 偏移后立即钳位再判冲突——
 * 保证被钳回边界的候选不会重新引入相交；未冲突标签仅钳位（最小位移）。
 */

/** 标签字号（view-unit；p05.ts:336 font-size="3.2"） */
const RESOLVE_FONT = 3.2;
/** 西文字符估宽 u（0.58em，a2:50-58 现行推导） */
const RESOLVE_CHAR_W = 0.58 * RESOLVE_FONT;
/** CJK 字符估宽 u（1em；现 12 案标签实测 Latin/符号，防未来 CJK 静默错算） */
const RESOLVE_CJK_W = RESOLVE_FONT;
/** 基线上方字高（0.8em → 2.56）与下方（0.25em → 0.8），a2:50-58 */
const RESOLVE_ASCENT = 0.8 * RESOLVE_FONT;
const RESOLVE_DESCENT = 0.25 * RESOLVE_FONT;

/** CJK 判定：CJK 部首/统一表意/兼容表意/全角形声（U+2E80–9FFF、F900–FAFF、FF00–FFEF） */
const isCjkChar = (ch: string): boolean => {
  const c = ch.codePointAt(0) ?? 0;
  return (
    (c >= 0x2e80 && c <= 0x9fff) || (c >= 0xf900 && c <= 0xfaff) || (c >= 0xff00 && c <= 0xffef)
  );
};

/** est. 文本宽：逐码点累计（西文 1.856 / CJK 3.2） */
const resolveTextWidth = (text: string): number =>
  [...text].reduce((sum, ch) => sum + (isCjkChar(ch) ? RESOLVE_CJK_W : RESOLVE_CHAR_W), 0);

/** est. bbox（口径：middle=中心、start=左缘起；anchor='end' 无估宽口径 → 立即上抛
 *  防静默错算，现 12 案无 end 用例） */
function resolveLabelBox(l: ViewLabel): { x0: number; x1: number; y0: number; y1: number } {
  if (l.anchor === 'end') {
    throw new Error(`arc-figure-kit: anchor="end" 标签估宽口径未定义（"${l.text}"）`);
  }
  const w = resolveTextWidth(l.text);
  const x0 = l.anchor === 'middle' ? l.x - w / 2 : l.x;
  return { x0, x1: x0 + w, y0: l.y - RESOLVE_ASCENT, y1: l.y + RESOLVE_DESCENT };
}

/** 两框净距（axis-gap max，负值 = 相交；V4.6-02 先例式 arc-figure-a2.ts:59-63） */
function resolveBoxGap(
  a: { x0: number; x1: number; y0: number; y1: number },
  b: { x0: number; x1: number; y0: number; y1: number },
): number {
  return Math.max(b.x0 - a.x1, a.x0 - b.x1, b.y0 - a.y1, a.y0 - b.y1);
}

export interface ResolveLabelOverlapsOpts {
  /** 验收净距阈值（view-unit，默认 1.5——派工单判定口径） */
  minGap?: number;
  /** 每步偏移量（view-unit，默认 0.64——先例 arc-figure-a2.ts:315 步长） */
  step?: number;
  /** 每方向最大步数（默认 8——先例 arc-figure-a2.ts:325 上限） */
  maxSteps?: number;
  /** viewBox 宽（默认 64） */
  width?: number;
  /** viewBox 高（默认 34） */
  height?: number;
}

/** 预设候选偏移方向序列（确定性；首方向 = V4.6-02 先例对角右上，其后右/上/左上/左/下；
 *  对角步长按先例取每分量 ±step（合 0.905），不归一化） */
const RESOLVE_DIRS: readonly ViewPoint[] = [
  { x: 1, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: -1 },
  { x: -1, y: -1 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
];

/** 按 viewBox 边界钳位（est. bbox 整体落入 [0,width]×[0,height]；先例
 *  triangle-figure.ts:181-185 按字宽收钳的推广：middle 保中心语义、start 保左缘语义） */
function clampLabelIntoView(l: ViewLabel, width: number, height: number): ViewLabel {
  const w = resolveTextWidth(l.text);
  const xMin = l.anchor === 'middle' ? w / 2 : 0;
  const xMax = width - (l.anchor === 'middle' ? w / 2 : w);
  return {
    text: l.text,
    anchor: l.anchor,
    x: Math.min(Math.max(l.x, xMin), Math.max(xMin, xMax)),
    y: Math.min(Math.max(l.y, RESOLVE_ASCENT), height - RESOLVE_DESCENT),
  };
}

/**
 * 确定性标签防碰撞后处理：数组序 = 优先级（labels[0] 永不参与避让，仅钳位）；i>0 逐个
 * 与前面已定标签判净距（< minGap 即冲突），冲突者沿 RESOLVE_DIRS×maxSteps 候选格
 * （偏移后钳位）取首个无冲突位；全耗尽则落钳位兜底位（由扫查测试披露）。输出保序保文，
 * 零 DOM，不改动其它 FigureView 实体。
 */
export function resolveLabelOverlaps(
  labels: readonly ViewLabel[],
  opts: ResolveLabelOverlapsOpts = {},
): ViewLabel[] {
  const { minGap = 1.5, step = 0.64, maxSteps = 8, width = 64, height = 34 } = opts;
  // anchor='end' 估宽口径未定义 → 入口统一上抛（防未来静默错算；现 12 案无 end 用例）
  for (const l of labels) {
    if (l.anchor === 'end') {
      throw new Error(`arc-figure-kit: anchor="end" 标签估宽口径未定义（"${l.text}"）`);
    }
  }
  const resolved: ViewLabel[] = [];
  const conflictsWith = (cand: ViewLabel): boolean => {
    const cb = resolveLabelBox(cand);
    return resolved.some((r) => resolveBoxGap(cb, resolveLabelBox(r)) < minGap);
  };
  for (let i = 0; i < labels.length; i += 1) {
    const src = labels[i]!;
    let chosen = clampLabelIntoView(src, width, height); // 未冲突 / 兜底：仅钳位
    if (i > 0 && conflictsWith(chosen)) {
      let settled = false;
      for (const d of RESOLVE_DIRS) {
        for (let k = 1; k <= maxSteps; k += 1) {
          const cand = clampLabelIntoView(
            { text: src.text, anchor: src.anchor, x: src.x + d.x * step * k, y: src.y + d.y * step * k },
            width,
            height,
          );
          if (!conflictsWith(cand)) {
            chosen = cand;
            settled = true;
            break;
          }
        }
        if (settled) break;
      }
    }
    resolved.push(chosen);
  }
  return resolved;
}
