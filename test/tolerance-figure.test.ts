/**
 * tolerance-figure.test.ts · V4.7 p08 公差带示意图（WAVE-PLAN-V4.7 §4 A2）
 *
 * 数据源（GB/T 1800.1，tolerance-it.json / fundamental-deviations.json
 * >30–50 行）：Ø40 IT7=25、IT6=16、g=−9、k=+2、p=+26（μm）；≤3 行 IT7=10、
 * IT6=6、k=0。期望值按计划 §1 V4.7-02/03 公式在测试内独立重算（不复用实现
 * 常量）：
 *   y(v)=88−(v−vMin)·s，s=66/(vMax−vMin)，vMin/vMax 各夹 0；
 *   带宽 36：孔 x[60,96]、轴 x[124,160]、单带 x[92,128]；
 *   值标签 x：孔 56(anchor end) / 轴 164(start) / 单带 132(start)；
 *   带码：anchor middle、基线 = 带顶 − 3（字形被零线穿过则下压至零线下方 ≥2）；
 *   值标签基线两档：带外（上 = 带顶−2.5 / 下 = 带底+10），外置字形
 *   [基线−8.8, 基线] 与零线净空 <2 → 带内（上 = 带顶+9.8 / 下 = 带底−2.5）；
 *   带高 <12.5 抛错。角标 μm (16,101.5)。
 */
import { describe, expect, it } from 'vitest';
import {
  buildToleranceFigure,
  fmtUM,
  type TolBandInput,
  type TolFigureView,
  type TolLabel,
} from '../src/core/tolerance-figure';

const Y_BOT = 88;
const SPAN = 66; // y∈[22,88]

function mappingOf(bands: readonly { lowerUM: number; upperUM: number }[]): {
  vMin: number;
  s: number;
} {
  const edges = bands.flatMap((b) => [b.lowerUM, b.upperUM]);
  const vMin = Math.min(0, ...edges);
  const vMax = Math.max(0, ...edges);
  return { vMin, s: SPAN / (vMax - vMin) };
}

function yOf(v: number, vMin: number, s: number): number {
  return Y_BOT - (v - vMin) * s;
}

function bandOf(view: TolFigureView, i: number) {
  const b = view.bands[i];
  if (!b) throw new Error(`band ${i} 不存在`);
  return b;
}

function byText(view: TolFigureView, text: string): TolLabel {
  const found = view.labels.find((l) => l.text === text);
  if (!found) {
    throw new Error(`标签不存在：${text}（实得 ${view.labels.map((l) => l.text).join('/')}）`);
  }
  return found;
}

/** 标签断言：x/anchor 精确，y 容差 1e-6（映射含除法浮点尾） */
function expectLabel(
  view: TolFigureView,
  text: string,
  x: number,
  anchor: TolLabel['anchor'],
  y: number,
): void {
  const l = byText(view, text);
  expect(l.x).toBe(x);
  expect(l.anchor).toBe(anchor);
  expect(l.y).toBeCloseTo(y, 3);
}

// 标签盒（font 11，保守 0.58em/字符；升部 0.85em / 降部 0.25em——V4.6 同法）
const FONT = 11;
const CHAR_W = 0.58 * FONT;
const ASC = 0.85 * FONT;
const DESC = 0.25 * FONT;
function boxOf(l: TolLabel): { x0: number; x1: number; y0: number; y1: number } {
  const w = l.text.length * CHAR_W;
  const x0 = l.anchor === 'middle' ? l.x - w / 2 : l.anchor === 'end' ? l.x - w : l.x;
  return { x0, x1: x0 + w, y0: l.y - ASC, y1: l.y + DESC };
}

/** 全标签两两不叠 + 值/码标签与零线净空 ≥2（字形 0.8em 口径） */
function assertLabelsClean(view: TolFigureView): void {
  const boxes = view.labels.map((l) => ({ ...boxOf(l), text: l.text }));
  for (let i = 0; i < boxes.length; i += 1) {
    const a = boxes[i];
    if (!a) continue;
    for (let j = i + 1; j < boxes.length; j += 1) {
      const b = boxes[j];
      if (!b) continue;
      const overlap = a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
      expect(overlap, `标签叠字：${a.text} ↔ ${b.text}`).toBe(false);
    }
  }
  const GLYPH = 0.8 * FONT;
  for (const l of view.labels) {
    if (l.role === 'unit') continue;
    const top = l.y - GLYPH;
    const clear = l.y <= view.zeroLine.y - 2 || top >= view.zeroLine.y + 2;
    expect(clear, `标签 ${l.text} 被零线 y=${view.zeroLine.y} 穿过（基线 ${l.y}）`).toBe(true);
  }
}

describe('tolerance-figure fmtUM', () => {
  it('带符号 μm 整数：+25 / 0 / −9（负号 U+2212）', () => {
    expect(fmtUM(25)).toBe('+25');
    expect(fmtUM(0)).toBe('0');
    expect(fmtUM(-9)).toBe('\u22129');
    expect(fmtUM(-0.4)).toBe('0'); // Math.round(-0.4) = 0
    expect(fmtUM(2.6)).toBe('+3');
  });
});

describe('tolerance-figure 单带（V4.7 §3 金锚）', () => {
  it('默认 Ø40 IT7 H：带 x[92,128] y[22,88]、零线 88、码 H7(110,19)、ES 带外 / EI 带内', () => {
    const view = buildToleranceFigure([{ code: 'H7', kind: 'single', lowerUM: 0, upperUM: 25 }]);
    // s=66/25=2.64；y(25)=22、y(0)=88
    expect(view.scale).toBeCloseTo(66 / 25, 10);
    expect(view.zeroLine).toEqual({ x1: 16, y: 88, x2: 204 });
    expect(view.bands).toHaveLength(1);
    expect(bandOf(view, 0)).toMatchObject({ code: 'H7', x0: 92, x1: 128, yTop: 22, yBot: 88 });
    expectLabel(view, 'H7', 110, 'middle', 19);
    // 上偏差带外 19.5；下偏差 0：带外 98 字形顶 89.2 距零线 88 仅 1.2 → 带内 85.5
    expectLabel(view, '+25', 132, 'start', 19.5);
    expectLabel(view, '0', 132, 'start', 85.5);
    expectLabel(view, 'μm', 16, 'start', 101.5);
    assertLabelsClean(view);
  });

  it('Ø40 h7：零线在顶 y=22、es 0 带外 19.5、ei −25 带外 98（零线远在带顶上方）', () => {
    const view = buildToleranceFigure([{ code: 'h7', kind: 'single', lowerUM: -25, upperUM: 0 }]);
    const { vMin, s } = mappingOf([{ lowerUM: -25, upperUM: 0 }]);
    expect(view.zeroLine.y).toBeCloseTo(yOf(0, vMin, s), 10); // =22
    expect(bandOf(view, 0)).toMatchObject({ code: 'h7', x0: 92, x1: 128, yTop: 22, yBot: 88 });
    expectLabel(view, 'h7', 110, 'middle', 19);
    expectLabel(view, '0', 132, 'start', 19.5);
    expectLabel(view, '\u221225', 132, 'start', 98);
    assertLabelsClean(view);
  });
});

describe('tolerance-figure 配合双带（V4.7 §3 金锚，Ø40 >30–50 段）', () => {
  const HOLE: TolBandInput = { code: 'H7', kind: 'hole', lowerUM: 0, upperUM: 25 };

  it('H7/g6：孔 y[22,55] 轴 y[66.88,88]、零线 55、孔 EI 与轴 es 收带内、轴 ei 带外', () => {
    const view = buildToleranceFigure([
      HOLE,
      { code: 'g6', kind: 'shaft', lowerUM: -25, upperUM: -9 },
    ]);
    const { vMin, s } = mappingOf([HOLE, { lowerUM: -25, upperUM: -9 }]);
    expect(s).toBeCloseTo(66 / 50, 10);
    expect(view.zeroLine.y).toBeCloseTo(yOf(0, vMin, s), 10); // 55
    expect(bandOf(view, 0)).toMatchObject({ x0: 60, x1: 96, yTop: 22 });
    expect(bandOf(view, 0).yBot).toBeCloseTo(55, 8);
    expect(bandOf(view, 1)).toMatchObject({ x0: 124, x1: 160 });
    expect(bandOf(view, 1).yTop).toBeCloseTo(66.88, 8);
    expect(bandOf(view, 1).yBot).toBeCloseTo(88, 8);
    expectLabel(view, 'H7', 78, 'middle', 19);
    // 带码零线防御：默认 63.88 字形顶 55.08 距零线 55 仅 0.08 → 下压 65.8
    expectLabel(view, 'g6', 142, 'middle', 65.8);
    // 孔：+25 带外；0 带内 52.5（带外 65 字形顶 56.2 距零线 55 仅 1.2）
    expectLabel(view, '+25', 56, 'end', 19.5);
    expectLabel(view, '0', 56, 'end', 52.5);
    // 轴：−9 带内 76.68（带外 64.38 字形顶 56.68 距零线仅 1.68）；−25 带外 98
    expectLabel(view, '\u22129', 164, 'start', 76.68);
    expectLabel(view, '\u221225', 164, 'start', 98);
    assertLabelsClean(view);
  });

  it('H7/k6：零线 88、轴 +18 带外 / +2 带内 80.22（带外被零线穿过）、孔同单带口径', () => {
    const view = buildToleranceFigure([
      HOLE,
      { code: 'k6', kind: 'shaft', lowerUM: 2, upperUM: 18 },
    ]);
    const { vMin, s } = mappingOf([HOLE, { lowerUM: 2, upperUM: 18 }]);
    expect(view.zeroLine.y).toBeCloseTo(yOf(0, vMin, s), 10); // 88
    expect(bandOf(view, 1).yTop).toBeCloseTo(40.48, 8);
    expect(bandOf(view, 1).yBot).toBeCloseTo(82.72, 8);
    expectLabel(view, 'k6', 142, 'middle', 37.48);
    expectLabel(view, '+18', 164, 'start', 37.98);
    expectLabel(view, '+2', 164, 'start', 80.22);
    expectLabel(view, '0', 56, 'end', 85.5);
    expectLabel(view, '+25', 56, 'end', 19.5);
    assertLabelsClean(view);
  });

  it('H7/p6：s=66/42、轴带顶达值域顶 22、两轴值均带外、孔码 H7 (78,45.714)', () => {
    const view = buildToleranceFigure([
      HOLE,
      { code: 'p6', kind: 'shaft', lowerUM: 26, upperUM: 42 },
    ]);
    const { vMin, s } = mappingOf([HOLE, { lowerUM: 26, upperUM: 42 }]);
    expect(bandOf(view, 0).yTop).toBeCloseTo(yOf(25, vMin, s), 10); // 48.714
    expect(bandOf(view, 1).yTop).toBeCloseTo(22, 8);
    expect(bandOf(view, 1).yBot).toBeCloseTo(47.143, 3); // 88−26·66/42=47.142857…
    expectLabel(view, 'H7', 78, 'middle', 45.714);
    expectLabel(view, 'p6', 142, 'middle', 19);
    expectLabel(view, '+42', 164, 'start', 19.5);
    expectLabel(view, '+26', 164, 'start', 57.143);
    expectLabel(view, '0', 56, 'end', 85.5);
    assertLabelsClean(view);
  });
});

describe('tolerance-figure 极限与退化', () => {
  it('k6 Ø3（ei=0）：两带底同贴零线 88，0 值标签均收带内 85.5', () => {
    const view = buildToleranceFigure([
      { code: 'H7', kind: 'hole', lowerUM: 0, upperUM: 10 },
      { code: 'k6', kind: 'shaft', lowerUM: 0, upperUM: 6 },
    ]);
    const { vMin, s } = mappingOf([
      { lowerUM: 0, upperUM: 10 },
      { lowerUM: 0, upperUM: 6 },
    ]);
    expect(s).toBeCloseTo(6.6, 10);
    expect(view.zeroLine.y).toBe(88);
    expect(bandOf(view, 1).yTop).toBeCloseTo(yOf(6, vMin, s), 10); // 48.4
    expectLabel(view, '+6', 164, 'start', 45.9);
    expectLabel(view, '+10', 56, 'end', 19.5);
    // 两带各有一个 '0'（孔 EI / 轴 ei）：按 x 锚区分，均收带内 85.5
    const zeros = view.labels.filter((l) => l.text === '0');
    expect(zeros.map((l) => l.x).sort((a, b) => a - b)).toEqual([56, 164]);
    for (const z of zeros) expect(z.y).toBeCloseTo(85.5, 3);
    assertLabelsClean(view);
  });

  it('带高不足（合成案）：孔 (0,10) + 轴 (−1,−0.5) → 抛「带高不足」', () => {
    expect(() =>
      buildToleranceFigure([
        { code: 'H7', kind: 'hole', lowerUM: 0, upperUM: 10 },
        { code: 'X', kind: 'shaft', lowerUM: -1, upperUM: -0.5 },
      ]),
    ).toThrow(/带高不足/);
  });

  it('输入校验：空带 / 三带 / lower>upper / 双带非 {hole,shaft} / 单带非 single / 值域 0', () => {
    expect(() => buildToleranceFigure([])).toThrow(/带数非法/);
    expect(() =>
      buildToleranceFigure([
        { code: 'A', kind: 'single', lowerUM: 0, upperUM: 1 },
        { code: 'B', kind: 'single', lowerUM: 0, upperUM: 1 },
        { code: 'C', kind: 'single', lowerUM: 0, upperUM: 1 },
      ]),
    ).toThrow(/带数非法/);
    expect(() =>
      buildToleranceFigure([{ code: 'A', kind: 'single', lowerUM: 5, upperUM: 1 }]),
    ).toThrow(/lowerUM > upperUM/);
    expect(() =>
      buildToleranceFigure([
        { code: 'A', kind: 'hole', lowerUM: 0, upperUM: 1 },
        { code: 'B', kind: 'hole', lowerUM: 0, upperUM: 1 },
      ]),
    ).toThrow(/\{hole, shaft\}/);
    expect(() =>
      buildToleranceFigure([{ code: 'A', kind: 'hole', lowerUM: 0, upperUM: 1 }]),
    ).toThrow(/单带必须为 single/);
    expect(() =>
      buildToleranceFigure([{ code: 'A', kind: 'single', lowerUM: 0, upperUM: 0 }]),
    ).toThrow(/值域为 0/);
  });
});
