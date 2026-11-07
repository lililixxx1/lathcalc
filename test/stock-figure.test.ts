/**
 * WAVE-PLAN-V4.9 §3 B 卡 · 料型截面图视图模型测试
 *
 * 布局公式（V4.9-03，测试按公式独立复算，不复用实现常量）：
 *   截面比例 ka = min(68/截面宽, 70/截面高)（包围盒预算 68×70，cy=42）；
 *   侧视比例 kb = min(200/L, 40/截面高)（条区 y 96..140 顶对齐，水平居中 x=110）；
 *   六方 R=S/√3，顶点 (±R,0)、(±R/2,±S/2)；钢管内径 D−2t；平板 W×T 矩形。
 * 金锚（§3 B 卡）：圆钢 ka=1.36 → r=34、kb=0.8 → 条 80×40（y 96..136）；
 *   六方 ka=2.944 → 顶视 68×58.9、kb=2 → 条 200×40；钢管 rI=28.33、kb=2/3 → 条
 *   66.67×40；平板 ka=0.68 → 68×6.8、kb=1 → 200×10。
 */
import { describe, expect, it } from 'vitest';
import {
  STOCK_FIGURE_VIEW,
  buildStockFigure,
  type StockFigureView,
  type StockMark,
  type StockSectionPolygon,
  type StockShape,
} from '../src/core/stock-figure';

// —— 计划 §1 V4.9-03 布局公式（独立复算路径，不 import 实现常量）——
const CX = 110;
const CY = 42;
const BUDGET_W = 68;
const BUDGET_H = 70;
const STRIP_TOP = 96;
const STRIP_MAX_W = 200;
const STRIP_MAX_H = 40;

const kaOf = (secW: number, secH: number): number => Math.min(BUDGET_W / secW, BUDGET_H / secH);
const kbOf = (L: number, secH: number): number => Math.min(STRIP_MAX_W / L, STRIP_MAX_H / secH);

function markOf(view: StockFigureView, label: string): StockMark {
  const found = view.marks.find((mark) => mark.label === label);
  if (!found) throw new Error(`标注 ${label} 不存在`);
  return found;
}

function polygonOf(view: StockFigureView): StockSectionPolygon {
  if (view.section.kind !== 'polygon') throw new Error(`截面非多边形：${view.section.kind}`);
  return view.section;
}

function pointOf(poly: StockSectionPolygon, index: number): { x: number; y: number } {
  const point = poly.points[index];
  if (!point) throw new Error(`顶点 ${index} 不存在`);
  return point;
}

describe('stock-figure 料型截面视图模型', () => {
  it('校验防御：缺项 / 非有限 / 非正 / 钢管 t≥D/2 抛错（V4.9-05）', () => {
    expect(() => buildStockFigure({ shape: 'round', dims: { D: 50 } })).toThrow();
    expect(() => buildStockFigure({ shape: 'round', dims: { D: Number.NaN, L: 100 } })).toThrow();
    expect(() => buildStockFigure({ shape: 'round', dims: { D: 0, L: 100 } })).toThrow();
    expect(() => buildStockFigure({ shape: 'round', dims: { D: -50, L: 100 } })).toThrow();
    expect(() => buildStockFigure({ shape: 'hex', dims: { S: 20, L: Number.POSITIVE_INFINITY } })).toThrow();
    expect(() => buildStockFigure({ shape: 'pipe', dims: { D: 60, t: 30, L: 100 } })).toThrow();
    expect(() => buildStockFigure({ shape: 'pipe', dims: { D: 60, t: 31, L: 100 } })).toThrow();
    expect(() => buildStockFigure({ shape: 'plate', dims: { W: 100, T: 10 } })).toThrow();
  });

  it('圆钢 D=50 L=100（§3 金锚）：ka=1.36 → r=34，kb=0.8 → 条 80×40（y 96..136）', () => {
    const view = buildStockFigure({ shape: 'round', dims: { D: 50, L: 100 } });
    expect(STOCK_FIGURE_VIEW).toEqual({ width: 220, height: 150 });

    const kSec = kaOf(50, 50); // min(68/50, 70/50) = 1.36（宽度约束）
    expect(kSec).toBeCloseTo(1.36, 6);
    expect(view.section.kind).toBe('circle');
    if (view.section.kind !== 'circle') throw new Error('截面应为圆');
    expect(view.section.r).toBeCloseTo((50 / 2) * kSec, 6); // 25×1.36 = 34
    expect(view.section.r).toBeCloseTo(34, 6);
    expect(view.section.cx).toBeCloseTo(CX, 6);
    expect(view.section.cy).toBeCloseTo(CY, 6);

    const kSide = kbOf(100, 50); // min(200/100, 40/50) = 0.8（高度约束）
    expect(kSide).toBeCloseTo(0.8, 6);
    expect(view.sideView.width).toBeCloseTo(100 * kSide, 6); // 80
    expect(view.sideView.height).toBeCloseTo(50 * kSide, 6); // 40
    expect(view.sideView.x).toBeCloseTo(CX - 40, 6); // 水平居中 → 70
    expect(view.sideView.y).toBeCloseTo(STRIP_TOP, 6); // 顶对齐 96
    expect(view.sideView.y + view.sideView.height).toBeCloseTo(136, 6); // 条 96..136

    // 中心线十字：延伸 r+5
    if (!view.centerlines) throw new Error('圆钢应有中心线');
    expect(view.centerlines.horizontal.x1).toBeCloseTo(CX - 39, 6);
    expect(view.centerlines.vertical.y2).toBeCloseTo(CY + 39, 6);

    // 标注：D 截面引线（起点在圆上 45°，圆方程独立验证）+ L 条下双箭头（跨=条宽）
    const dMark = markOf(view, 'D 50');
    expect(dMark.kind).toBe('leader');
    const diag = 34 * Math.SQRT1_2;
    expect(dMark.x1).toBeCloseTo(CX + diag, 6);
    expect(dMark.y1).toBeCloseTo(CY - diag, 6);
    expect(dMark.x1 ** 2 - 2 * CX * dMark.x1 + dMark.y1 ** 2 - 2 * CY * dMark.y1)
      .toBeCloseTo(34 ** 2 - CX ** 2 - CY ** 2, 4); // 起点在圆上（展开圆方程）
    const lMark = markOf(view, 'L 100');
    expect(lMark.kind).toBe('linear');
    expect(lMark.x1).toBeCloseTo(view.sideView.x, 6);
    expect(lMark.x2).toBeCloseTo(view.sideView.x + view.sideView.width, 6);
    expect(lMark.y1).toBeCloseTo(136 + 3, 6);
    expect(lMark.anchor).toBe('middle');
    expect(view.marks.map((mark) => mark.label)).toEqual(['D 50', 'L 100']);
  });

  it('六方 S=20 L=100（§3 金锚）：R=S/√3，顶点 (±34,0)/(±17,±29.4449)，条 200×40', () => {
    const S = 20;
    const R = S / Math.sqrt(3); // 11.547005383792517
    expect(R).toBeCloseTo(11.547, 3);
    const kSec = kaOf(2 * R, S); // min(68/23.094, 70/20) = 2.94449（宽度约束）
    expect(kSec).toBeCloseTo(2.944, 3);
    const halfH = (S / 2) * kSec; // 29.44486…（=17√3）
    expect(halfH).toBeCloseTo(17 * Math.sqrt(3), 6);

    const view = buildStockFigure({ shape: 'hex', dims: { S, L: 100 } });
    const poly = polygonOf(view);
    expect(poly.points).toHaveLength(6);
    // 顶点（相对截面中心 (110,42)）：(±R·ka, 0)、(±R/2·ka, ±S/2·ka)
    expect(pointOf(poly, 0).y).toBeCloseTo(CY, 9); // (±R·ka, 0)
    expect(pointOf(poly, 0).x).toBeCloseTo(CX + R * kSec, 6); // +34
    expect(pointOf(poly, 3).x).toBeCloseTo(CX - R * kSec, 6); // −34
    expect(pointOf(poly, 1).x).toBeCloseTo(CX + (R / 2) * kSec, 6); // +17
    expect(pointOf(poly, 1).y).toBeCloseTo(CY + halfH, 6);
    expect(pointOf(poly, 4).y).toBeCloseTo(CY - halfH, 6);
    // 平顶方向：最小 y 恰有两点（顶平边水平），对边距 = S·ka = 58.8897（金锚 58.9）
    const ys = poly.points.map((point) => point.y);
    expect(Math.min(...ys)).toBeCloseTo(CY - halfH, 6);
    expect(ys.filter((y) => Math.abs(y - (CY - halfH)) < 1e-9)).toHaveLength(2);
    expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(S * kSec, 6);
    expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(58.9, 1);

    const kSide = kbOf(100, S); // min(2, 2) = 2
    expect(kSide).toBeCloseTo(2, 6);
    expect(view.sideView.width).toBeCloseTo(200, 6);
    expect(view.sideView.height).toBeCloseTo(40, 6);
    expect(view.sideView.x).toBeCloseTo(10, 6);
    expect(view.marks.map((mark) => mark.label)).toEqual(['S 20', 'L 100']);
    // S 引线自底平贴缘（y = 42+29.4449）右段外引
    const sMark = markOf(view, 'S 20');
    expect(sMark.kind).toBe('leader');
    expect(sMark.y1).toBeCloseTo(CY + halfH, 6);
    expect(sMark.x1).toBeGreaterThan(CX);
  });

  it('钢管 D=60 t=5 L=100（§3 金锚）：rO=34、rI=28.33，kb=2/3 → 条 66.67×40', () => {
    const D = 60;
    const kSec = kaOf(D, D); // min(68/60, 70/60) = 1.1333（宽度约束）
    expect(kSec).toBeCloseTo(34 / 30, 6);
    const view = buildStockFigure({ shape: 'pipe', dims: { D, t: 5, L: 100 } });
    expect(view.section.kind).toBe('ring');
    if (view.section.kind !== 'ring') throw new Error('截面应为同心双圆');
    expect(view.section.rOuter).toBeCloseTo((D / 2) * kSec, 6); // 34
    expect(view.section.rInner).toBeCloseTo(((D - 2 * 5) / 2) * kSec, 6); // 25×1.1333 = 28.3333
    expect(view.section.rInner).toBeCloseTo(28.33, 2);

    const kSide = kbOf(100, D); // min(2, 40/60) = 2/3
    expect(kSide).toBeCloseTo(2 / 3, 6);
    expect(view.sideView.width).toBeCloseTo(100 * (2 / 3), 6); // 66.6667
    expect(view.sideView.width).toBeCloseTo(66.67, 2);
    expect(view.sideView.height).toBeCloseTo(60 * (2 / 3), 6); // 40
    expect(view.marks.map((mark) => mark.label)).toEqual(['D 60', 't 5', 'L 100']);
    // t 引线指向管壁中点（|P1−C| ∈ (rI, rO)）
    const tMark = markOf(view, 't 5');
    const dist = Math.hypot(tMark.x1 - CX, tMark.y1 - CY);
    expect(dist).toBeGreaterThan(view.section.rInner);
    expect(dist).toBeLessThan(view.section.rOuter);
  });

  it('平板 W=100 T=10 L=200（§3 金锚）：ka=0.68 → 68×6.8，kb=1 → 200×10，无中心线', () => {
    const view = buildStockFigure({ shape: 'plate', dims: { W: 100, T: 10, L: 200 } });
    const kSec = kaOf(100, 10); // min(68/100, 70/10) = 0.68（宽度约束）
    expect(kSec).toBeCloseTo(0.68, 6);
    const poly = polygonOf(view);
    expect(poly.points).toHaveLength(4);
    expect(pointOf(poly, 0).x).toBeCloseTo(CX - 34, 6);
    expect(pointOf(poly, 0).y).toBeCloseTo(CY - 3.4, 6);
    expect(pointOf(poly, 2).x).toBeCloseTo(CX + 34, 6);
    expect(pointOf(poly, 2).y).toBeCloseTo(CY + 3.4, 6); // 68×6.8 居中
    expect(view.centerlines).toBeNull(); // 平板无中心线十字

    const kSide = kbOf(200, 10); // min(200/200, 40/10) = 1
    expect(kSide).toBeCloseTo(1, 6);
    expect(view.sideView.width).toBeCloseTo(200, 6);
    expect(view.sideView.height).toBeCloseTo(10, 6);
    expect(view.sideView.y).toBeCloseTo(96, 6);
    expect(view.marks.map((mark) => mark.label)).toEqual(['W 100', 'T 10', 'L 200']);
  });

  it('极端比例不抛错、按 kb 如实呈现（V4.9-05）：细长圆钢与高瘦平板', () => {
    // D=200 L=5：kb = min(40, 0.2) = 0.2 → 条 1×40
    const slim = buildStockFigure({ shape: 'round', dims: { D: 200, L: 5 } });
    expect(kbOf(5, 200)).toBeCloseTo(0.2, 6);
    expect(slim.sideView.width).toBeCloseTo(1, 6);
    expect(slim.sideView.height).toBeCloseTo(40, 6);
    // W=10 T=100 L=50（高瘦板）：ka = min(6.8, 0.7) = 0.7 → 截面 7×70；kb = 0.4 → 条 20×40
    const tall = buildStockFigure({ shape: 'plate', dims: { W: 10, T: 100, L: 50 } });
    expect(kaOf(10, 100)).toBeCloseTo(0.7, 6);
    const poly = polygonOf(tall);
    expect(pointOf(poly, 2).x).toBeCloseTo(CX + 3.5, 6);
    expect(pointOf(poly, 2).y).toBeCloseTo(CY + 35, 6);
    expect(tall.sideView.width).toBeCloseTo(20, 6);
    expect(tall.sideView.height).toBeCloseTo(40, 6);
  });

  it('标注不变量（四形状）：L 双箭头恒跨条宽且位于条下；标签集随形状逐字', () => {
    const cases: Array<{
      shape: StockShape;
      dims: Record<string, number>;
      labels: string[];
      hasCenter: boolean;
    }> = [
      { shape: 'round' as const, dims: { D: 50, L: 100 }, labels: ['D 50', 'L 100'], hasCenter: true },
      { shape: 'hex' as const, dims: { S: 20, L: 100 }, labels: ['S 20', 'L 100'], hasCenter: true },
      { shape: 'pipe' as const, dims: { D: 60, t: 5, L: 100 }, labels: ['D 60', 't 5', 'L 100'], hasCenter: true },
      { shape: 'plate' as const, dims: { W: 100, T: 10, L: 200 }, labels: ['W 100', 'T 10', 'L 200'], hasCenter: false },
    ];
    for (const testCase of cases) {
      const view = buildStockFigure({ shape: testCase.shape, dims: testCase.dims });
      expect(view.marks.map((mark) => mark.label)).toEqual(testCase.labels);
      expect(view.centerlines !== null).toBe(testCase.hasCenter);
      const lMark = markOf(view, `L ${testCase.dims.L}`);
      expect(lMark.kind).toBe('linear');
      expect(lMark.x1).toBeCloseTo(view.sideView.x, 6);
      expect(lMark.x2).toBeCloseTo(view.sideView.x + view.sideView.width, 6);
      expect(lMark.y1).toBeGreaterThan(view.sideView.y + view.sideView.height);
    }
    // 尺寸显示逐字：非整数尺寸最多 3 位小数
    const fractional = buildStockFigure({ shape: 'round', dims: { D: 45.5, L: 100 } });
    expect(fractional.marks[0]?.label).toBe('D 45.5');
  });
});
