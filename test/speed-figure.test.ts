/**
 * WAVE-PLAN-V4.9 §3 B 卡 · 切速示意图视图模型测试
 *
 * 布局公式（V4.9-04，测试按公式独立复算，不复用实现常量）：
 *   r = min(40, 36·(50/D))（D=50 默认锚 → r=36；40=圆区高度预算封顶；D=200 → r=9）；
 *   圆心 (110,56)；D 双箭头 110±r、y=56，标 `⌀50` 式；
 *   Vc 起点 (110+r·cos45°, 56−r·sin45°)，方向 −45°（数学系）长 22u（与半径垂直）；
 *   n 标签 y = 56+r+14；中心线十字延伸 r+4。
 * 形值同源（V4.9-01）：vcLabel/nLabel 由页面传入，几何唯一驱动 = d——同 d 异标签
 *   几何恒等（模式切换只改文本不改几何）。
 */
import { describe, expect, it } from 'vitest';
import { SPEED_FIGURE_VIEW, buildSpeedFigure, type SpeedFigureView } from '../src/core/speed-figure';

// —— 计划 §1 V4.9-04 布局公式（独立复算路径，不 import 实现常量）——
const CX = 110;
const CY = 56;
const rOf = (d: number): number => Math.min(40, 36 * (50 / d));

function geometryOf(view: SpeedFigureView): string {
  return JSON.stringify({
    circle: view.circle,
    centerlines: view.centerlines,
    diameterMark: { x1: view.diameterMark.x1, x2: view.diameterMark.x2, y: view.diameterMark.y },
    vcArrow: view.vcArrow,
    nLabel: view.nLabel,
  });
}

describe('speed-figure 切速示意图视图模型', () => {
  it('校验防御：D 非正 / 非有限抛错（V4.9-05）', () => {
    expect(() => buildSpeedFigure({ d: 0, vcLabel: 'Vc 150', nLabel: 'n 955 r/min' })).toThrow();
    expect(() => buildSpeedFigure({ d: -50, vcLabel: 'Vc 150', nLabel: 'n 955 r/min' })).toThrow();
    expect(() => buildSpeedFigure({ d: Number.NaN, vcLabel: 'Vc 150', nLabel: 'n 955 r/min' })).toThrow();
    expect(() => buildSpeedFigure({ d: Number.POSITIVE_INFINITY, vcLabel: 'Vc 150', nLabel: 'n 955 r/min' })).toThrow();
  });

  it('D=50（§3 金锚）：r=36，D 双箭头 110±36 y=56 标 ⌀50，Vc 起点 (135.4558, 30.5442)', () => {
    const view = buildSpeedFigure({ d: 50, vcLabel: 'Vc 150', nLabel: 'n 955 r/min' });
    expect(SPEED_FIGURE_VIEW).toEqual({ width: 220, height: 120 });
    const r = rOf(50); // min(40, 36×1) = 36
    expect(r).toBeCloseTo(36, 6);
    expect(view.circle).toEqual({ cx: CX, cy: CY, r: 36 });

    // D 水平双箭头穿圆心
    expect(view.diameterMark.x1).toBeCloseTo(CX - r, 6); // 74
    expect(view.diameterMark.x2).toBeCloseTo(CX + r, 6); // 146
    expect(view.diameterMark.y).toBeCloseTo(CY, 6);
    expect(view.diameterMark.label).toBe('⌀50');
    // 中心线十字（延伸 r+4）
    expect(view.centerlines.horizontal).toEqual({ x1: CX - 40, y1: CY, x2: CX + 40, y2: CY });
    expect(view.centerlines.vertical.y2).toBeCloseTo(CY + r + 4, 6);

    // Vc 切向箭头：起点在圆上 45°，长 22、与半径垂直、指向圆外
    const diag = r * Math.cos(Math.PI / 4);
    expect(view.vcArrow.x1).toBeCloseTo(CX + diag, 6); // 135.4558…
    expect(view.vcArrow.y1).toBeCloseTo(CY - diag, 6); // 30.5442…
    const len = Math.hypot(view.vcArrow.x2 - view.vcArrow.x1, view.vcArrow.y2 - view.vcArrow.y1);
    expect(len).toBeCloseTo(22, 6);
    const radiusDot = (view.vcArrow.x1 - CX) * (view.vcArrow.x2 - view.vcArrow.x1)
      + (view.vcArrow.y1 - CY) * (view.vcArrow.y2 - view.vcArrow.y1);
    expect(radiusDot).toBeCloseTo(0, 6); // 切向：箭头向量 ⊥ 半径向量
    const endDist = Math.hypot(view.vcArrow.x2 - CX, view.vcArrow.y2 - CY);
    expect(endDist).toBeGreaterThan(r); // 终点在圆外
    // n 标签置圆下方
    expect(view.nLabel).toEqual({ x: CX, y: CY + r + 14 }); // (110, 106)
  });

  it('D=80（派工锚）：r = min(40, 36×50/80) = 22.5，图随 D 重绘', () => {
    const view = buildSpeedFigure({ d: 80, vcLabel: 'Vc 150', nLabel: 'n 597 r/min' });
    const r = rOf(80);
    expect(r).toBeCloseTo(22.5, 6);
    expect(view.circle.r).toBeCloseTo(22.5, 6);
    expect(view.diameterMark.x1).toBeCloseTo(CX - 22.5, 6);
    expect(view.diameterMark.label).toBe('⌀80');
    expect(view.nLabel.y).toBeCloseTo(CY + 22.5 + 14, 6);
  });

  it('封顶与缩放（V4.9-04）：D=30 封顶 r=40（36×50/30=60>40），D=200 如实缩小 r=9', () => {
    expect(rOf(30)).toBeCloseTo(40, 6);
    expect(buildSpeedFigure({ d: 30, vcLabel: 'Vc 150', nLabel: 'n 1592 r/min' }).circle.r).toBeCloseTo(40, 6);
    expect(rOf(45)).toBeCloseTo(40, 6); // 恰在封顶边界
    expect(rOf(200)).toBeCloseTo(9, 6);
    expect(buildSpeedFigure({ d: 200, vcLabel: 'Vc 150', nLabel: 'n 239 r/min' }).circle.r).toBeCloseTo(9, 6);
  });

  it('几何只随 d 变（V4.9-01 形值同源）：同 d 异标签几何恒等（模式切换语义）', () => {
    const rpmMode = buildSpeedFigure({ d: 50, vcLabel: 'Vc 150', nLabel: 'n 955 r/min' });
    const vcMode = buildSpeedFigure({ d: 50, vcLabel: 'Vc 150.0', nLabel: 'n 955 r/min' });
    expect(geometryOf(rpmMode)).toBe(geometryOf(vcMode));
    expect(rpmMode.diameterMark.label).toBe(vcMode.diameterMark.label);
    // 不同 d → 几何必变
    const d80 = buildSpeedFigure({ d: 80, vcLabel: 'Vc 150', nLabel: 'n 955 r/min' });
    expect(geometryOf(rpmMode)).not.toBe(geometryOf(d80));
  });

  it('Vc 切向不变量（多组 D）：起点恒在圆上、箭长 22、与半径垂直、终点在圆外', () => {
    for (const d of [20, 45, 50, 80, 120, 200]) {
      const view = buildSpeedFigure({ d, vcLabel: 'Vc 150', nLabel: 'n 955 r/min' });
      const r = rOf(d);
      const startDist = Math.hypot(view.vcArrow.x1 - CX, view.vcArrow.y1 - CY);
      expect(startDist).toBeCloseTo(r, 6); // 起点在圆上
      const len = Math.hypot(view.vcArrow.x2 - view.vcArrow.x1, view.vcArrow.y2 - view.vcArrow.y1);
      expect(len).toBeCloseTo(22, 6);
      const radiusDot = (view.vcArrow.x1 - CX) * (view.vcArrow.x2 - view.vcArrow.x1)
        + (view.vcArrow.y1 - CY) * (view.vcArrow.y2 - view.vcArrow.y1);
      expect(radiusDot).toBeCloseTo(0, 6);
      expect(Math.hypot(view.vcArrow.x2 - CX, view.vcArrow.y2 - CY)).toBeGreaterThan(r);
      // 标签位在箭头端侧且不出右框
      expect(view.vcArrow.labelX).toBeGreaterThan(view.vcArrow.x2 - 1e-9);
      expect(view.vcArrow.labelX).toBeLessThanOrEqual(SPEED_FIGURE_VIEW.width);
    }
  });
});
