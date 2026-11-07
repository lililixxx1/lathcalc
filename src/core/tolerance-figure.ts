/**
 * tolerance-figure.ts · p08 公差带示意图参数化（V4.7 / v0.6.2，WAVE-PLAN-V4.7 §2）
 *
 * 用户反馈 #4「公差配合没有示意图」→ 公差带图由 solver 真值驱动实时重建
 * （V4.7-01 形值同源，V4.3-01 血统第四案）：单带画当前 toleranceCompose 结果
 * （H{grade}/h{grade}），选中配合 chip 画 H7 孔带 + g6/k6/p6 轴带。本模块纯数字
 * 零 DOM；SVG 装配归 p08（零几何）。
 *
 * 布局（V4.7-02，GB/T 1800.1 公差带图惯例：零线水平、上正下负、孔左轴右）：
 * viewBox 220×104；值域线性映射 y∈[Y_TOP=22,Y_BOT=88]（跨 66），vMin/vMax 各夹 0
 * （零线恒在框内）；零线 x∈[16,204]；带宽 36——孔 x[60,96]、轴 x[124,160]、
 * 单带居中 x[92,128]；s=66/(vMax−vMin)，y(v)=Y_BOT−(v−vMin)·s。
 * 标签（V4.7-03）：带码 anchor=middle 居带中、基线=带顶−3；值标签孔左 x=56
 * （end）/ 轴右 x=164、单带右 x=132（start）。值标签默认带外（上偏差基线=带顶
 * −2.5、下偏差=带底+10），**零线穿字防御**：外置字形 [基线−8.8, 基线] 与零线
 * 净空 <2 时收入带内（上偏差基线=带顶+9.8、下偏差=带底−2.5，需带高 ≥12.5；
 * 实测触发案 g6 轴 es：带顶距零线 11.88<13.3 放不下；k6 轴 ei：带底距零线
 * 5.28<12；H/h 单带 0 端 1.2<2 也入内）；带高 <12.5 连带内也放不下 → 抛错
 * 保帧（真实 IT 数据带高 ≥15.7 不触发）。负号 U+2212（与 p08 signedUM 同
 * 口径）；角标「μm」(16,101.5) 由本模块固定产出（role='unit'，font 8）。
 */
export interface TolBandInput {
  /** 带代号显示文本（H7 / g6 / h8…，轴小写沿 GB/T 1800.1 口径） */
  code: string;
  /** hole=孔带（配合模式左位）/ shaft=轴带（右位）/ single=单带（居中） */
  kind: 'hole' | 'shaft' | 'single';
  /** 下偏差（μm，带符号，≤ upperUM） */
  lowerUM: number;
  /** 上偏差（μm，带符号） */
  upperUM: number;
}

/** 公差带矩形（屏幕系，yTop < yBot；x0 < x1） */
export interface TolBandRect {
  kind: TolBandInput['kind'];
  code: string;
  x0: number;
  x1: number;
  yTop: number;
  yBot: number;
}

/** 图面标签（坐标为基线点；anchor 即 SVG text-anchor） */
export interface TolLabel {
  text: string;
  x: number;
  y: number;
  anchor: 'start' | 'middle' | 'end';
  role: 'code' | 'value' | 'unit';
}

/** 公差带图视图（已映射 viewBox 220×104；样式层归 p08 装配） */
export interface TolFigureView {
  /** 零线（水平，x 跨全内框） */
  zeroLine: { x1: number; y: number; x2: number };
  bands: readonly TolBandRect[];
  labels: readonly TolLabel[];
  /** μm → viewBox 单位比例（测试不变量用） */
  scale: number;
}

const VIEW_W = 220;
const VIEW_H = 104;
const FRAME_X0 = 16;
const FRAME_X1 = 204;
const Y_TOP = 22;
const Y_BOT = 88;
const BAND_W = 36;
/** 各 kind 带左边 x（V4.7-02：孔左 / 轴右 / 单带居中） */
const BAND_X0: Record<TolBandInput['kind'], number> = {
  hole: 60,
  shaft: 124,
  single: 92,
};
/** 值标签 x（V4.7-03：孔左 end / 轴右 start / 单带右 start） */
const VALUE_X: Record<TolBandInput['kind'], number> = {
  hole: 56,
  shaft: 164,
  single: 132,
};
const CODE_DY = 3; // 带码基线 = 带顶 − 3
/** 值标签字形高度（font 11，升部 0.8em——与 p05/p06/p12 标签同字号） */
const GLYPH_ASC = 8.8;
/** 字形与零线最小净空（单位） */
const LINE_CLEAR = 2;
const TOP_OUT_DY = 2.5; // 上偏差带外基线 = 带顶 − 2.5
const BOT_OUT_DY = 10; // 下偏差带外基线 = 带底 + 10
const TOP_IN_DY = 9.8; // 上偏差带内基线 = 带顶 + 9.8（字形 [带顶+1, 带顶+9.8]）
const BOT_IN_DY = 2.5; // 下偏差带内基线 = 带底 − 2.5（字形 [带底−11.3, 带底−2.5]）
/** 带内放置所需最小带高（字形 8.8 + 上下余量） */
const SHORT_BAND = 12.5;

/** 外置字形是否被零线穿过（净空 < LINE_CLEAR 即算） */
function lineStrike(baseline: number, zeroY: number): boolean {
  const glyphTop = baseline - GLYPH_ASC;
  return !(baseline <= zeroY - LINE_CLEAR || glyphTop >= zeroY + LINE_CLEAR);
}

/**
 * 边缘值标签基线：默认带外；被零线穿过时收带内；带高不足 12.5 连带内也放不下
 * → 抛错（UI 保上一帧）。真实 IT 数据带高 ≥15.7（fit 轴带高 = 66·IT6/值域，
 * 值域 ≤ 4.2·IT6），仅合成输入触发（V4.7-03 零线穿字防御，两档序 + 不可画抛错）。
 */
function edgeBaseline(
  outBaseline: number,
  zeroY: number,
  inBaseline: number,
  bandHeight: number,
  code: string,
): number {
  if (!lineStrike(outBaseline, zeroY)) return outBaseline;
  if (bandHeight >= SHORT_BAND) return inBaseline;
  throw new Error(`tolerance-figure: 带高不足（${code}，${bandHeight.toFixed(2)} < ${SHORT_BAND}）`);
}

/** 带符号 μm 整数：+25 / 0 / −9（负号 U+2212，与 p08 signedUM 同口径） */
export function fmtUM(value: number): string {
  const rounded = Math.round(value);
  if (rounded === 0) return '0';
  return `${rounded > 0 ? '+' : '−'}${Math.abs(rounded)}`;
}

/**
 * 公差带图生成（1 带 = single，2 带 = {hole, shaft}；其余组合 / 非法值抛错，
 * UI catch 保上一帧——V4.7-04）。
 */
export function buildToleranceFigure(bands: readonly TolBandInput[]): TolFigureView {
  if (bands.length === 0 || bands.length > 2) {
    throw new Error(`tolerance-figure: 带数非法（1 或 2，得 ${bands.length}）`);
  }
  for (const band of bands) {
    if (![band.lowerUM, band.upperUM].every((v) => Number.isFinite(v))) {
      throw new Error(`tolerance-figure: 偏差非有限数（${band.code}）`);
    }
    if (band.lowerUM > band.upperUM) {
      throw new Error(`tolerance-figure: lowerUM > upperUM（${band.code}）`);
    }
  }
  if (bands.length === 2) {
    const kinds = bands.map((b) => b.kind).sort();
    if (kinds[0] !== 'hole' || kinds[1] !== 'shaft') {
      throw new Error('tolerance-figure: 双带必须为 {hole, shaft} 组合');
    }
  }
  const only = bands.length === 1 ? bands[0] : undefined;
  if (bands.length === 1 && (!only || only.kind !== 'single')) {
    throw new Error('tolerance-figure: 单带必须为 single');
  }

  // 值域夹 0（零线恒在框内）：vMin ≤ 0 ≤ vMax，span > 0（IT ≥ 1 μm 且夹 0）。
  const edges = bands.flatMap((b) => [b.lowerUM, b.upperUM]);
  const vMin = Math.min(0, ...edges);
  const vMax = Math.max(0, ...edges);
  const span = vMax - vMin;
  if (!(span > 0)) {
    throw new Error('tolerance-figure: 值域为 0（上下偏差与 0 全等）');
  }
  const s = (Y_BOT - Y_TOP) / span;
  const yOf = (v: number): number => Y_BOT - (v - vMin) * s;
  const zeroY = yOf(0);

  const rects: TolBandRect[] = [];
  const labels: TolLabel[] = [
    // 角标 μm（font 8）：左下角——顶部会与孔侧上偏差长值标签（如 +1550）
    // 保守盒相叠，底部 x<26 无任何标签锚区
    { text: 'μm', x: FRAME_X0, y: 101.5, anchor: 'start', role: 'unit' },
  ];
  for (const band of bands) {
    const x0 = BAND_X0[band.kind];
    const rect: TolBandRect = {
      kind: band.kind,
      code: band.code,
      x0,
      x1: x0 + BAND_W,
      yTop: yOf(band.upperUM),
      yBot: yOf(band.lowerUM),
    };
    rects.push(rect);

    const centerX = (rect.x0 + rect.x1) / 2;
    const bandH = rect.yBot - rect.yTop;
    // 带码零线防御：默认带顶上方（基线=带顶−3）；字形被零线穿过则下压到
    // 零线下方 ≥2（g6 实测 63.88 → 65.8，字形顶 55.08 距零线 55 仅 0.08）。
    let codeY = rect.yTop - CODE_DY;
    if (lineStrike(codeY, zeroY)) {
      codeY = Math.max(codeY, zeroY + GLYPH_ASC + LINE_CLEAR);
    }
    labels.push({
      text: band.code,
      x: centerX,
      y: codeY,
      anchor: 'middle',
      role: 'code',
    });
    const anchor = band.kind === 'hole' ? 'end' : 'start';
    labels.push({
      text: fmtUM(band.upperUM),
      x: VALUE_X[band.kind],
      y: edgeBaseline(rect.yTop - TOP_OUT_DY, zeroY, rect.yTop + TOP_IN_DY, bandH, band.code),
      anchor,
      role: 'value',
    });
    labels.push({
      text: fmtUM(band.lowerUM),
      x: VALUE_X[band.kind],
      y: edgeBaseline(rect.yBot + BOT_OUT_DY, zeroY, rect.yBot - BOT_IN_DY, bandH, band.code),
      anchor,
      role: 'value',
    });
  }

  return {
    zeroLine: { x1: FRAME_X0, y: zeroY, x2: FRAME_X1 },
    bands: rects,
    labels,
    scale: s,
  };
}

/** viewBox 常量导出（p08 装配与测试共用，防两处漂移） */
export const TOL_FIGURE_VIEW = { width: VIEW_W, height: VIEW_H } as const;
