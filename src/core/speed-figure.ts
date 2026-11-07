/**
 * speed-figure.ts · p09 切速示意图视图模型（WAVE-PLAN-V4.9 §1 V4.9-04）
 *
 * viewBox 220×120，工件正圆 r = min(40, 36·(50/D))——D=50 为页面默认锚（p09.ts
 * state 默认 '50'）→ r=36；40 = 圆区高度预算（圆心 y=56、上下标注带各 10+）；
 * D 增大如实缩小（D=200 → r=9），D≤45 封顶 40 防溢出。圆心 (110,56) + 中心线
 * 十字（dash-dot 造型由装配渲染）。
 *
 * 标注：D 水平双箭头穿圆心（y=56，110±r）标 `⌀50` 式，标签置圆外左上
 * （anchor=end，避让竖直中心线与右上 Vc 箭头）；Vc 切向箭头起点在圆右上 45°
 * （(110+r·cos45°, 56−r·sin45°)），方向 −45°（数学系；屏幕系 (cos45°, +sin45°)
 * 右下向，与半径垂直——顺时针切削速度方向），长 22u 单箭头（箭头造型由装配
 * 渲染）；n 文字标签置圆下方 y = 56+r+14（中心线延伸 4，字形净空 ≥1.2）。
 *
 * 形值同源（V4.9-01）：vcLabel/nLabel 文本由页面计算传入，图不重算业务值；
 * 几何唯一驱动 = d，rpm/vc 模式切换只改文本不改几何。校验（V4.9-05）：
 * d 非正 / 非有限抛错（UI catch 保帧）。
 */

export interface SpeedFigureInput {
  /** 工件直径 mm（几何唯一驱动） */
  d: number;
  /** Vc 标注全文（形值同源：页面计算传入，如 `Vc 150`） */
  vcLabel: string;
  /** n 标注全文（形值同源：页面计算传入，如 `n 955 r/min`） */
  nLabel: string;
}

export interface SpeedLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface SpeedFigureView {
  circle: { cx: number; cy: number; r: number };
  /** 中心线十字（dash-dot 造型由装配渲染）——契约派生字段（证据 README 披露） */
  centerlines: { horizontal: SpeedLine; vertical: SpeedLine };
  /** D 双箭头（水平穿圆心）；labelX/labelY/anchor 为契约派生字段（披露） */
  diameterMark: {
    x1: number;
    x2: number;
    y: number;
    label: string;
    labelX: number;
    labelY: number;
    anchor: 'start' | 'middle' | 'end';
  };
  /** Vc 切向箭头（起点在圆上 45°、终点沿 −45° 切向 22u 外）；labelX/labelY 为派生字段（披露） */
  vcArrow: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    labelX: number;
    labelY: number;
  };
  /** n 标签锚点（圆下方居中） */
  nLabel: { x: number; y: number };
}

export const SPEED_FIGURE_VIEW = { width: 220, height: 120 } as const;

/** 圆心（V4.9-04 冻结布局）。 */
const CX = 110;
const CY = 56;
/** r 封顶（圆区高度预算）与默认锚半径：r = min(R_CAP, R_BASE·(50/D))。 */
const R_CAP = 40;
const R_BASE = 36;
/** 中心线延伸量（gear-figure CENTERLINE_EXT 同款）。 */
const CENTERLINE_EXT = 4;
/** Vc 箭头长度（u）。 */
const VC_ARROW_LEN = 22;
/** Vc 标签相对箭头端的锚点偏移。 */
const VC_LABEL_DX = 4;
const VC_LABEL_DY = 2.5;
/** ⌀ 标签：圆外左上（anchor=end），距圆缘 6、基线高于圆心 4。 */
const D_LABEL_GAP = 6;
const D_LABEL_RISE = 4;
/** n 标签基线距圆底的间隙。 */
const N_LABEL_GAP = 14;
/** 保守文字半宽（gear-figure 同款估算）。 */
const LATIN_CHAR_W = 5.5;
const CJK_CHAR_W = 8.5;
const CLAMP_PAD = 2;

function halfWidth(text: string): number {
  let units = 0;
  for (const char of text) units += char.charCodeAt(0) > 0x2e7f ? CJK_CHAR_W : LATIN_CHAR_W;
  return units / 2;
}

/** 尺寸显示：整数不带小数，非整数最多 3 位小数（与 p11 formatDimension 同口径）。 */
function fmtDim(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(3)));
}

export function buildSpeedFigure(input: SpeedFigureInput): SpeedFigureView {
  const { d } = input;
  if (!Number.isFinite(d) || d <= 0) {
    throw new Error('speed-figure: 工件直径 D 必须为正有限数');
  }
  const r = Math.min(R_CAP, R_BASE * (50 / d));
  const diag = r * Math.SQRT1_2;

  // Vc 切向箭头：起点圆右上 45°，方向 −45°（数学系）→ 屏幕系 (cos45°, +sin45°)，
  // 与半径方向 (cos45°, −sin45°)（屏幕系）点积为 0（切向）。
  const vcX1 = CX + diag;
  const vcY1 = CY - diag;
  const vcX2 = vcX1 + VC_ARROW_LEN * Math.SQRT1_2;
  const vcY2 = vcY1 + VC_ARROW_LEN * Math.SQRT1_2;
  const vcLabelText = input.vcLabel;

  const dLabel = `⌀${fmtDim(d)}`;
  const dLabelAnchor = 'end' as const;
  const dLabelX = Math.max(
    CX - r - D_LABEL_GAP,
    halfWidth(dLabel) + CLAMP_PAD,
  );

  return {
    circle: { cx: CX, cy: CY, r },
    centerlines: {
      horizontal: { x1: CX - r - CENTERLINE_EXT, y1: CY, x2: CX + r + CENTERLINE_EXT, y2: CY },
      vertical: { x1: CX, y1: CY - r - CENTERLINE_EXT, x2: CX, y2: CY + r + CENTERLINE_EXT },
    },
    diameterMark: {
      x1: CX - r,
      x2: CX + r,
      y: CY,
      label: dLabel,
      labelX: dLabelX,
      labelY: CY - D_LABEL_RISE,
      anchor: dLabelAnchor,
    },
    vcArrow: {
      x1: vcX1,
      y1: vcY1,
      x2: vcX2,
      y2: vcY2,
      labelX: Math.min(vcX2 + VC_LABEL_DX, SPEED_FIGURE_VIEW.width - halfWidth(vcLabelText) - CLAMP_PAD),
      labelY: vcY2 + VC_LABEL_DY,
    },
    nLabel: { x: CX, y: CY + r + N_LABEL_GAP },
  };
}
