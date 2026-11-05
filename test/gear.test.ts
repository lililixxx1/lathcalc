/**
 * gear.test.ts · 挂轮计算测试（W11-B 实现锚点，WAVE-PLAN-V4.1 §3）
 *
 * 锚点（V4.1 §3，Lead 已独立穷举复算）：
 *   - 五倍组 {20,25,…,100}（17 枚）、T=6、P=1.5 → i_target = 1.5/6 = 0.25：
 *     精确解存在（如 30/60×40/80 = 0.5×0.5 = 0.25），只断 top1.errorPpm === 0 与排序键
 *     稳定性，不断言并列组唯一（并列多组，V4.1 §3 原文）。
 *   - T=12、P=3.175（=25.4/8，8 tpi 英制螺纹走公制丝杠）→ i_target = 3.175/12
 *     = 0.264583333…；穷举最优 top1 = a20/b55 × c40/d55：
 *       ratio = (20/55)×(40/55) = 800/3025 = 0.264462809917…
 *       e = |0.264583333… − 0.264462809917…| / 0.264583333… × 10⁶ = 455.5215722 ppm
 *     次优同值并列 40/55×20/55（排序键字典序 (20,…) < (40,…) 在前）。
 *   - 域校验：P≤0 / T≤0、齿数去重后 <4、含 ≤0 齿数 → throw（文案含「挂轮」）。
 */
import { describe, expect, it } from 'vitest';
import { solveGearTrain } from '../src/core/gear';
import type { GearTrainSolution } from '../src/core/types';

/** 五倍组 {20,25,…,100}：20 + 5k（k=0…16），共 17 枚（V4.1 §3 锚点集合）。 */
const FIVEFOLD: number[] = Array.from({ length: 17 }, (_, index) => 20 + index * 5);

/** 排序键 a+b+c+d（V4.1 §3 第二排序键）。 */
function toothSum(solution: GearTrainSolution): number {
  return solution.a + solution.b + solution.c + solution.d;
}

/** 字典序比较 (a,b,c,d)（V4.1 §3 第三排序键）。 */
function compareTuple(left: GearTrainSolution, right: GearTrainSolution): number {
  return (
    left.a - right.a || left.b - right.b || left.c - right.c || left.d - right.d
  );
}

/** 排序键全序比较：<0 表示 left 应排在 right 前（V4.1 §3）。 */
function compareKey(left: GearTrainSolution, right: GearTrainSolution): number {
  return (
    left.errorPpm - right.errorPpm ||
    toothSum(left) - toothSum(right) ||
    compareTuple(left, right)
  );
}

describe('gear 挂轮计算（W11-B 实现）', () => {
  it('五倍组 T=6 P=1.5：i=1.5/6=0.25，top1.errorPpm===0（精确解存在）', () => {
    const solutions = solveGearTrain({
      workpiecePitch: 1.5,
      leadscrewPitch: 6,
      availableTeeth: FIVEFOLD,
    });

    expect(solutions).toHaveLength(8);
    expect(solutions[0]?.errorPpm).toBe(0);
    expect(solutions[0]?.ratio).toBe(0.25);
    // 算式自证：30/60×40/80 = 0.5×0.5 = 0.25 → e = |0.25−0.25|/0.25×10⁶ = 0。
    expect((30 / 60) * (40 / 80)).toBe(0.25);

    for (const solution of solutions) {
      expect(FIVEFOLD).toContain(solution.a);
      expect(FIVEFOLD).toContain(solution.b);
      expect(FIVEFOLD).toContain(solution.c);
      expect(FIVEFOLD).toContain(solution.d);
    }
  });

  it('T=12 P=3.175（25.4/8，8 tpi）：top1=20/55×40/55，errorPpm≈455.52', () => {
    const solutions = solveGearTrain({
      workpiecePitch: 3.175,
      leadscrewPitch: 12,
      availableTeeth: FIVEFOLD,
    });

    expect(solutions).toHaveLength(8);
    const top1 = solutions[0];
    expect(top1).toMatchObject({ a: 20, b: 55, c: 40, d: 55 });
    // ratio = (20/55)×(40/55) = 800/3025 = 0.264462809917…
    expect(top1?.ratio).toBeCloseTo(800 / 3025, 12);
    // i_target = 3.175/12 = 0.264583333…；e = |0.264583333… − 0.2644628099…|/0.264583333…×10⁶
    // = 455.5215722… ppm（V4.1 §3 锚点）。
    expect(top1?.errorPpm).toBeCloseTo(455.52, 1);
    expect(top1?.errorPpm).toBeCloseTo(455.5215722, 3);

    // 次优同值并列：40/55×20/55 = 同上；字典序 (20,…) < (40,…) 决定了 top1/top2 次序。
    expect(solutions[1]).toMatchObject({ a: 40, b: 55, c: 20, d: 55 });
    expect(solutions[1]?.ratio).toBe(top1?.ratio);
    expect(solutions[1]?.errorPpm).toBe(top1?.errorPpm);
  });

  it('排序键稳定：(errorPpm, a+b+c+d, 字典序) 单调不减', () => {
    const solutions = solveGearTrain({
      workpiecePitch: 3.175,
      leadscrewPitch: 12,
      availableTeeth: FIVEFOLD,
    });
    for (let index = 1; index < solutions.length; index += 1) {
      const previous = solutions[index - 1] as GearTrainSolution;
      const current = solutions[index] as GearTrainSolution;
      expect(compareKey(previous, current)).toBeLessThanOrEqual(0);
    }
  });

  it('选取结果逐条满足 ratio/errorPpm 公式（V4.1 §3）', () => {
    const target = 3.175 / 12;
    const solutions = solveGearTrain({
      workpiecePitch: 3.175,
      leadscrewPitch: 12,
      availableTeeth: FIVEFOLD,
    });
    for (const solution of solutions) {
      expect(solution.ratio).toBeCloseTo(
        (solution.a / solution.b) * (solution.c / solution.d),
        12,
      );
      expect(solution.errorPpm).toBeCloseTo(
        (Math.abs(target - solution.ratio) / target) * 1e6,
        6,
      );
    }
  });

  it('域校验：P≤0 或 T≤0 → throw（文案含「挂轮」）', () => {
    expect(() =>
      solveGearTrain({ workpiecePitch: 0, leadscrewPitch: 6, availableTeeth: FIVEFOLD }),
    ).toThrow(/挂轮/);
    expect(() =>
      solveGearTrain({ workpiecePitch: -1.5, leadscrewPitch: 6, availableTeeth: FIVEFOLD }),
    ).toThrow(/挂轮/);
    expect(() =>
      solveGearTrain({ workpiecePitch: 1.5, leadscrewPitch: 0, availableTeeth: FIVEFOLD }),
    ).toThrow(/挂轮/);
    expect(() =>
      solveGearTrain({ workpiecePitch: 1.5, leadscrewPitch: -6, availableTeeth: FIVEFOLD }),
    ).toThrow(/挂轮/);
  });

  it('域校验：齿数去重后 <4 → throw（含重复齿数去重场景）', () => {
    expect(() =>
      solveGearTrain({ workpiecePitch: 1.5, leadscrewPitch: 6, availableTeeth: [20, 40, 60] }),
    ).toThrow(/挂轮/);
    // [20,20,40,60] 去重后 = {20,40,60} 共 3 枚 → 不足 4。
    expect(() =>
      solveGearTrain({ workpiecePitch: 1.5, leadscrewPitch: 6, availableTeeth: [20, 20, 40, 60] }),
    ).toThrow(/挂轮/);
  });

  it('域校验：含 ≤0 齿数 → throw', () => {
    expect(() =>
      solveGearTrain({ workpiecePitch: 1.5, leadscrewPitch: 6, availableTeeth: [0, 20, 40, 60] }),
    ).toThrow(/挂轮/);
    expect(() =>
      solveGearTrain({ workpiecePitch: 1.5, leadscrewPitch: 6, availableTeeth: [-5, 20, 40, 60] }),
    ).toThrow(/挂轮/);
  });

  it('域校验：非整数齿数（如 20.5）→ throw（G2-W11 Minor-1：齿轮无半齿）', () => {
    expect(() =>
      solveGearTrain({ workpiecePitch: 1.5, leadscrewPitch: 6, availableTeeth: [20.5, 20, 40, 60] }),
    ).toThrow('挂轮：齿数必须为正整数（每个可用齿数须 > 0 且为整数）');
  });

  it('重复齿数去重后 ≥4：正常穷举（去重由实现负责）', () => {
    const solutions = solveGearTrain({
      workpiecePitch: 1.5,
      leadscrewPitch: 6,
      availableTeeth: [20, 20, 40, 60, 80],
    });
    expect(solutions).toHaveLength(8);
    for (const solution of solutions) {
      for (const tooth of [solution.a, solution.b, solution.c, solution.d]) {
        expect([20, 40, 60, 80]).toContain(tooth);
      }
    }
  });
});
