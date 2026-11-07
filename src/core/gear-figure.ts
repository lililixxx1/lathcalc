/**
 * gear-figure.ts · 挂轮系示意图视图模型（WAVE-PLAN-V4.8 §1，v0.6.3）
 *
 * 三轴共线展开画法（教材复式挂轮图）：主轴 a —— 中间轴 b·c（同心）—— 丝杠 d，
 * 三圆心共水平轴心线，b/c 同心于中间轴。半径 = k·齿数（统一模数比例，
 * 同副啮合真实外切：O2−O1 = r_a+r_b、O3−O2 = r_c+r_d）。
 *
 * 布局（V4.8-02 冻结）：viewBox 220×152，cy=74，边距 10；
 * k = min(200/(2a+b+c+2d), 52/max(a,b,c,d))——宽度约束（展开跨距 = 左缘 10 至
 * 右缘 ≤210）与高度约束（52 封顶：上标签基线 ≥ 74−52−6=16、下标签基线
 * ≤ 74+52+10=136，与轴注基线 147 保持净空）取小；cap 生效时图不满幅，如实呈现。
 *
 * 标签规则（V4.8-03，A4-R1/R2 修订）：齿轮签 `a 20` 式——a/d 贴各自圆缘
 * （a 上 y=cy−r−6、d 下 y=cy+r+12）；b/c 同心双圆**清双缘**（均避较大圆：
 * b 上 y=cy−max(r_b,r_c)−6、c 下 y=cy+max(r_b,r_c)+12，否则 b<c 时 c 顶弧
 * 穿 b 签、b>c 时 b 底弧擦 c 签——A4-R1 实拍 1-2px@2x 擦字）；下侧基线
 * +12 系 R2 修订（10 被字高 8.8 吃掉仅余 ~1.2 净空）；同行同侧守卫：
 * |Δy|<10 且 |Δx|<两签半宽和 → b 上推 11 / c 下推 11（触发域闭合：
 * Δx=r_a+r_b<22 ⇒ r≤11 ⇒ 推后 y_b≥35、y_c≤117，上下界安全）；
 * x 夹持 [半宽+2, 218−半宽]。轴注 主轴/中间轴/丝杠 y=147。
 * 半宽估算：西文 0.58em×9.5px=5.5/字符，CJK 8.5/字符（font 8 保守）。
 * 齿数非正整数抛错（UI catch 保帧，V4.8-04）；极端比例不抛错——小圆按比例
 * 缩小仍可画，守卫与夹持兜底。
 */

/** 齿轮圆：code + 齿数 + 圆心 + 半径（屏幕系，cx 沿轴心线递增）。 */
export interface GearCircle {
  code: 'a' | 'b' | 'c' | 'd';
  teeth: number;
  cx: number;
  cy: number;
  r: number;
}

/** 图内标签：齿轮签（role=gear，`a 20` 式）或轴注（role=shaft）。 */
export interface GearFigureLabel {
  text: string;
  x: number;
  y: number;
  anchor: 'start' | 'middle' | 'end';
  role: 'gear' | 'shaft';
}

/** 轴中心线（竖直 dash-dot）。 */
export interface GearCenterline {
  x: number;
  y1: number;
  y2: number;
}

export interface GearFigureView {
  circles: readonly GearCircle[];
  centerlines: readonly GearCenterline[];
  axisLine: { x1: number; y: number; x2: number };
  meshDots: readonly { x: number; y: number }[];
  labels: readonly GearFigureLabel[];
}

export const GEAR_FIGURE_VIEW = { width: 220, height: 152 } as const;

const MARGIN = 10;
const CY = 74;
const R_CAP = 52;
const TOP_DY = 6;
const BOT_DY = 12; // A4-R2 修订：10 被字高 8.8 吃掉仅余 ~1.2 弧净空（2px@2x 紧贴），12 → 净空 3.2
const CENTERLINE_EXT = 4;
const PUSH_DY = 11;
const SAME_ROW_DY = 10;
const LATIN_CHAR_W = 5.5;
const CJK_CHAR_W = 8.5;
const CLAMP_PAD = 2;
const SHAFT_LABEL_Y = 147;

/** 保守文字半宽：CJK 8.5/字符、其余 5.5/字符（font 9.5 西文 0.58em 同 V4.7 盒法）。 */
function halfWidth(text: string): number {
  let units = 0;
  for (const char of text) units += char.charCodeAt(0) > 0x2e7f ? CJK_CHAR_W : LATIN_CHAR_W;
  return units / 2;
}

/** x 夹持 [半宽+2, W−半宽−2]，防贴缘标签出框。 */
function clampX(x: number, text: string): number {
  const half = halfWidth(text);
  return Math.min(Math.max(x, half + CLAMP_PAD), GEAR_FIGURE_VIEW.width - half - CLAMP_PAD);
}

export function buildGearTrainFigure(input: {
  a: number;
  b: number;
  c: number;
  d: number;
}): GearFigureView {
  const teethList: Array<[code: GearCircle['code'], z: number]> = [
    ['a', input.a],
    ['b', input.b],
    ['c', input.c],
    ['d', input.d],
  ];
  for (const [, z] of teethList) {
    if (!Number.isFinite(z) || z <= 0 || !Number.isInteger(z)) {
      throw new Error('挂轮示意图：齿数必须为正整数（a/b/c/d 每个 > 0 且为整数）');
    }
  }

  const zMax = Math.max(input.a, input.b, input.c, input.d);
  const spanDenom = 2 * input.a + input.b + input.c + 2 * input.d;
  const k = Math.min((GEAR_FIGURE_VIEW.width - 2 * MARGIN) / spanDenom, R_CAP / zMax);

  const ra = input.a * k;
  const rb = input.b * k;
  const rc = input.c * k;
  const rd = input.d * k;
  const x1 = MARGIN + ra;
  const x2 = x1 + ra + rb;
  const x3 = x2 + rc + rd;

  const circles: GearCircle[] = [
    { code: 'a', teeth: input.a, cx: x1, cy: CY, r: ra },
    { code: 'b', teeth: input.b, cx: x2, cy: CY, r: rb },
    { code: 'c', teeth: input.c, cx: x2, cy: CY, r: rc },
    { code: 'd', teeth: input.d, cx: x3, cy: CY, r: rd },
  ];

  const rStud = Math.max(rb, rc);
  const centerlines: GearCenterline[] = [
    { x: x1, y1: CY - ra - CENTERLINE_EXT, y2: CY + ra + CENTERLINE_EXT },
    { x: x2, y1: CY - rStud - CENTERLINE_EXT, y2: CY + rStud + CENTERLINE_EXT },
    { x: x3, y1: CY - rd - CENTERLINE_EXT, y2: CY + rd + CENTERLINE_EXT },
  ];

  const axisLine = {
    x1: Math.max(2, x1 - ra - CENTERLINE_EXT),
    y: CY,
    x2: Math.min(GEAR_FIGURE_VIEW.width - 2, x3 + rd + CENTERLINE_EXT),
  };

  const meshDots = [
    { x: x1 + ra, y: CY },
    { x: x2 + rc, y: CY },
  ];

  const gearText = (code: string, z: number): string => `${code} ${z}`;

  // b/c 同心双圆：标签清双缘——上/下均避开较大圆弧线（A4-R1 修复：仅贴自身
  // 缘时 b<c 顶弧穿 b 签、b>c 底弧擦 c 签，清 max(r_b,r_c) 后净空 ≥6/10）。
  const rStudRim = Math.max(rb, rc);

  // 上侧 a/b：同行守卫（同高且横向过近 → b 上推 11）
  const aTop = { text: gearText('a', input.a), x: x1, y: CY - ra - TOP_DY };
  const bTop = { text: gearText('b', input.b), x: x2, y: CY - rStudRim - TOP_DY };
  if (
    Math.abs(aTop.y - bTop.y) < SAME_ROW_DY &&
    Math.abs(aTop.x - bTop.x) < halfWidth(aTop.text) + halfWidth(bTop.text)
  ) {
    bTop.y = aTop.y - PUSH_DY;
  }

  // 下侧 c/d：同行守卫 → c 下推 11
  const cBot = { text: gearText('c', input.c), x: x2, y: CY + rStudRim + BOT_DY };
  const dBot = { text: gearText('d', input.d), x: x3, y: CY + rd + BOT_DY };
  if (
    Math.abs(cBot.y - dBot.y) < SAME_ROW_DY &&
    Math.abs(cBot.x - dBot.x) < halfWidth(cBot.text) + halfWidth(dBot.text)
  ) {
    cBot.y = dBot.y + PUSH_DY;
  }

  const gearLabels: GearFigureLabel[] = [aTop, bTop, cBot, dBot].map((label) => ({
    text: label.text,
    x: clampX(label.x, label.text),
    y: label.y,
    anchor: 'middle' as const,
    role: 'gear' as const,
  }));

  const shaftLabels: GearFigureLabel[] = (
    [
      ['主轴', x1],
      ['中间轴', x2],
      ['丝杠', x3],
    ] as const
  ).map(([text, x]) => ({
    text,
    x: clampX(x, text),
    y: SHAFT_LABEL_Y,
    anchor: 'middle' as const,
    role: 'shaft' as const,
  }));

  return { circles, centerlines, axisLine, meshDots, labels: [...gearLabels, ...shaftLabels] };
}
