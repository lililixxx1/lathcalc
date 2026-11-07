/**
 * WAVE-PLAN-V4.8 §4 A2 · 挂轮系示意图视图模型测试
 *
 * 布局公式（V4.8-02/03，测试按公式独立复算，不复用实现常量）：
 *   k = min(200/(2a+b+c+2d), 52/max(a,b,c,d))；r = k·z；
 *   O1 = 10+r_a；O2 = O1+r_a+r_b；O3 = O2+r_c+r_d；cy = 74；
 *   标签基线：a 上 74−r_a−6、d 下 74+r_d+10；b/c 清双缘（b 上 74−max(r_b,r_c)−6、
 *   c 下 74+max(r_b,r_c)+12，A4-R1/R2 修订）；同行守卫（|Δy|<10 且 |Δx|<半宽和）
 *   → b 上推 11 / c 下推 11；x 夹持 [半宽+2, 218−半宽]
 *   （半宽：西文 5.5/字符）；轴注 y=147。
 * 默认表 top1 排序键 (errorPpm, Σz, 字典序)（gear.ts 冻结）独立穷举复算：
 *   P=1.5/T=6 → 20/40×20/40（Σ=120 最小）；20/20×20/80 为第 6 行（cap 案）。
 */
import { describe, expect, it } from 'vitest';
import {
  GEAR_FIGURE_VIEW,
  buildGearTrainFigure,
  type GearFigureLabel,
  type GearFigureView,
} from '../src/core/gear-figure';

const W = 220;
const CY = 74;
const MARGIN = 10;
const R_CAP = 52;

function kOf(a: number, b: number, c: number, d: number): number {
  return Math.min((W - 2 * MARGIN) / (2 * a + b + c + 2 * d), R_CAP / Math.max(a, b, c, d));
}

function halfWidth(text: string): number {
  return (text.length * 5.5) / 2;
}

function circleOf(view: GearFigureView, code: string) {
  const found = view.circles.find((circle) => circle.code === code);
  if (!found) throw new Error(`圆 ${code} 不存在`);
  return found;
}

function labelOf(view: GearFigureView, text: string): GearFigureLabel {
  const found = view.labels.find((label) => label.text === text);
  if (!found) throw new Error(`标签 ${text} 不存在`);
  return found;
}

function expectClose(actual: number, expected: number, digits = 2): void {
  expect(actual).toBeCloseTo(expected, digits);
}

describe('gear-figure 挂轮系视图模型', () => {
  it('校验防御：齿数 0 / 20.5 / NaN 抛错（V4.8-04）', () => {
    expect(() => buildGearTrainFigure({ a: 20, b: 40, c: 0, d: 40 })).toThrow();
    expect(() => buildGearTrainFigure({ a: 20, b: 40, c: 20.5, d: 40 })).toThrow();
    expect(() => buildGearTrainFigure({ a: Number.NaN, b: 40, c: 20, d: 40 })).toThrow();
  });

  it('默认 top1 20/40×20/40：k=1.1111，r/O/啮合点/标签基线逐值（§3 金锚）', () => {
    const view = buildGearTrainFigure({ a: 20, b: 40, c: 20, d: 40 });
    expect(GEAR_FIGURE_VIEW).toEqual({ width: 220, height: 152 });

    const k = kOf(20, 40, 20, 40); // = 200/180 = 1.1111（宽度约束）
    expectClose(k, 1.1111, 4);
    expectClose(circleOf(view, 'a').r, 20 * k);
    expectClose(circleOf(view, 'b').r, 40 * k);
    expectClose(circleOf(view, 'd').r, 40 * k);

    const x1 = MARGIN + 20 * k; // 32.22
    const x2 = x1 + 60 * k; // 98.89
    const x3 = x2 + 60 * k; // 165.56
    expectClose(circleOf(view, 'a').cx, x1);
    expectClose(circleOf(view, 'b').cx, x2);
    expectClose(circleOf(view, 'c').cx, x2); // b/c 同心（V4.8-02）
    expectClose(circleOf(view, 'd').cx, x3);
    expectClose(circleOf(view, 'a').cy, CY);
    // 右缘恰满幅：O3 + r_d = 210
    expectClose(x3 + 40 * k, 210);

    // 啮合点：a–b 切点 O1+r_a；c–d 切点 O2+r_c
    expect(view.meshDots).toHaveLength(2);
    expectClose(view.meshDots[0]?.x ?? 0, x1 + 20 * k); // 54.44
    expectClose(view.meshDots[1]?.x ?? 0, x2 + 20 * k); // 121.11
    expectClose(view.meshDots[0]?.y ?? 0, CY);

    // 标签基线（守卫不触发：|y_a−y_b| = 22.2 > 10；b/c 清双缘 A4-R1 修订）
    expectClose(labelOf(view, 'a 20').y, CY - 20 * k - 6); // 45.78
    expectClose(labelOf(view, 'b 40').y, CY - 40 * k - 6); // 23.56
    expectClose(labelOf(view, 'c 20').y, CY + Math.max(40 * k, 20 * k) + 12); // 130.44（清 b 外缘）
    expectClose(labelOf(view, 'd 40').y, CY + 40 * k + 12); // 130.44
  });

  it('相切代数：七组四元组均满足 O2−O1=r_a+r_b、O3−O2=r_c+r_d、r∝齿数', () => {
    const cases = [
      [20, 40, 20, 40],
      [20, 20, 20, 80],
      [20, 20, 20, 150],
      [150, 20, 20, 20],
      [20, 20, 20, 700],
      [1000, 1000, 1000, 20],
      [20, 30, 20, 40],
    ] as const;
    for (const [a, b, c, d] of cases) {
      const view = buildGearTrainFigure({ a, b, c, d });
      const { ra, rb, rc, rd } = {
        ra: circleOf(view, 'a').r,
        rb: circleOf(view, 'b').r,
        rc: circleOf(view, 'c').r,
        rd: circleOf(view, 'd').r,
      };
      // 半径 ∝ 齿数（统一模数比例）
      expectClose(ra / a, rb / b, 5);
      expectClose(rc / c, rd / d, 5);
      // 同副啮合真实外切
      expectClose(circleOf(view, 'b').cx - circleOf(view, 'a').cx, ra + rb);
      expectClose(circleOf(view, 'd').cx - circleOf(view, 'c').cx, rc + rd);
      // 左缘 = 10
      expectClose(circleOf(view, 'a').cx - ra, MARGIN);
    }
  });

  it('cap 案 20/20×20/80（默认表第 6 行）：k=0.65 高度约束，右缘 166 不满幅', () => {
    const view = buildGearTrainFigure({ a: 20, b: 20, c: 20, d: 80 });
    const k = kOf(20, 20, 20, 80); // = 52/80 = 0.65（cap 生效）
    expectClose(k, 0.65, 4);
    expectClose(circleOf(view, 'd').r, 80 * k); // 52 封顶
    const x3 = MARGIN + k * (2 * 20 + 20 + 20 + 2 * 80) - 80 * k; // 右缘−r_d
    expectClose(circleOf(view, 'd').cx, x3); // 114
    expectClose(circleOf(view, 'd').cx + 80 * k, 166); // 右缘 166 ≠ 210
    // a/b 同高（r 相等）但 Δx = 26 > 半宽和 22 → 不上推
    expectClose(labelOf(view, 'a 20').y, CY - 20 * k - 6); // 55
    expectClose(labelOf(view, 'b 20').y, CY - 20 * k - 6); // 55（守卫不触发）
  });

  it('上推守卫 20/20×20/150（合成）：b 签上推 11（y_b = y_a − 11）', () => {
    const view = buildGearTrainFigure({ a: 20, b: 20, c: 20, d: 150 });
    const k = kOf(20, 20, 20, 150); // = 52/150 = 0.3467（cap）
    const yA = CY - 20 * k - 6; // 61.07
    // Δx = 2·20k = 13.87 < 22 且 Δy = 0 → 触发
    expectClose(labelOf(view, 'a 20').y, yA);
    expectClose(labelOf(view, 'b 20').y, yA - 11); // 50.07
  });

  it('下推守卫 150/20×20/20（合成）：c 签下推 11（y_c = y_d + 11）', () => {
    const view = buildGearTrainFigure({ a: 150, b: 20, c: 20, d: 20 });
    const k = kOf(150, 20, 20, 20); // = 52/150 = 0.3467（cap）
    const yD = CY + 20 * k + 12; // 92.93
    expectClose(labelOf(view, 'd 20').y, yD);
    expectClose(labelOf(view, 'c 20').y, yD + 11); // 103.93
    // 上侧 a/b 高度悬殊不触发
    expectClose(labelOf(view, 'a 150').y, CY - 150 * k - 6); // 16
    expectClose(labelOf(view, 'b 20').y, CY - 20 * k - 6); // 61.07（未推）
  });

  it('左夹持 20/20×20/700（合成）：O1=11.49 → a 签 x 夹持至 13', () => {
    const view = buildGearTrainFigure({ a: 20, b: 20, c: 20, d: 700 });
    const k = kOf(20, 20, 20, 700); // = 52/700 = 0.0743（cap）
    const x1 = MARGIN + 20 * k; // 11.49
    expectClose(circleOf(view, 'a').cx, x1);
    // 'a 20' 半宽 11 → 夹持下界 13 > O1
    expectClose(labelOf(view, 'a 20').x, halfWidth('a 20') + 2); // 13
  });

  it('右夹持 1000/1000×1000/20（合成）：k 宽度约束 0.0495，d 签 x 夹持至 207', () => {
    const view = buildGearTrainFigure({ a: 1000, b: 1000, c: 1000, d: 20 });
    const k = kOf(1000, 1000, 1000, 20); // = 200/4040 = 0.0495（宽度约束）
    expectClose(k, 0.0495, 4);
    const x3 = MARGIN + k * (2 * 1000 + 1000 + 1000 + 2 * 20) - 20 * k; // 209.01
    expectClose(circleOf(view, 'd').cx, x3);
    // 'd 20' 半宽 11 → 夹持上界 218−11 = 207
    expectClose(labelOf(view, 'd 20').x, W - halfWidth('d 20') - 2); // 207
    // b/c 签不受夹持（远离缘；O2 = 10+2r_a+r_b）
    expectClose(labelOf(view, 'b 1000').x, MARGIN + 3 * 1000 * k); // 158.51
  });

  it('中心线与轴心线（默认）：三竖一横 dash-dot，中间轴跨最大半径+4', () => {
    const view = buildGearTrainFigure({ a: 20, b: 40, c: 20, d: 40 });
    const k = kOf(20, 40, 20, 40);
    expect(view.centerlines).toHaveLength(3);
    const stud = view.centerlines[1];
    if (!stud) throw new Error('中间轴中心线不存在');
    expectClose(stud.x, MARGIN + k * (2 * 20 + 40)); // 98.89（O2 = 10+2r_a+r_b）
    expectClose(stud.y1, CY - (40 * k + 4)); // 25.56（r_b 为中间轴最大半径）
    expectClose(stud.y2, CY + 40 * k + 4); // 122.44
    // 轴心线：左 6（=10−4）至右 214（=210+4），y=74
    expectClose(view.axisLine.x1, 6);
    expectClose(view.axisLine.x2, 210 + 4);
    expectClose(view.axisLine.y, CY);
  });

  it('标签集完整性：4 齿轮签 anchor middle + 3 轴注 y=147（默认）', () => {
    const view = buildGearTrainFigure({ a: 20, b: 40, c: 20, d: 40 });
    // 默认字符串序：拉丁签在前，CJK 按码元 丝(U+4E1D) < 中(U+4E2D) < 主(U+4E3B)
    expect(view.labels.map((label) => label.text).sort()).toEqual([
      'a 20',
      'b 40',
      'c 20',
      'd 40',
      '丝杠',
      '中间轴',
      '主轴',
    ]);
    for (const label of view.labels) {
      expect(label.anchor).toBe('middle');
    }
    for (const label of view.labels.filter((item) => item.role === 'shaft')) {
      expectClose(label.y, 147, 6);
    }
    expect(view.labels.filter((item) => item.role === 'gear')).toHaveLength(4);
  });
});
