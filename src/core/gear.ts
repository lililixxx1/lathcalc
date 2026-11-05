/**
 * gear.ts · 挂轮计算（WAVE-PLAN-V4.1 §3，W11-B 实现）
 *
 * 目标比 i_target = workpiecePitch / leadscrewPitch（工件转一转走 P，丝杠转一转走 T）。
 * 四重穷举 a/b/c/d ∈ availableTeeth，i = (a/b)×(c/d)，
 * 排序键 (errorPpm, a+b+c+d, 字典序) 取前 8（V4.1 §3 冻结——并列解排序稳定可断言）。
 * e = |i_target − i| / i_target × 10⁶（ppm）。非法输入 throw（不臆造）。
 *
 * 算法复杂度 |S|⁴：五倍组 17 枚 = 83 521 组合（V4.1 §3 已评估「毫秒级」，
 * 因此不引入连分数等近似——穷举保证在给定齿数集合内取到全局最优前 8）。
 */
import type { GearTrainFn, GearTrainInput, GearTrainSolution } from './types';

/** 结果条数（V4.1 §3：排序后取前 8）。 */
const MAX_RESULTS = 8;

/** 输入域校验：P/T > 0；齿数去重后 ≥4 且全部 > 0（集合去重排序由实现负责）。 */
function normalizeTeeth(availableTeeth: readonly number[]): number[] {
  for (const tooth of availableTeeth) {
    if (!Number.isFinite(tooth) || tooth <= 0) {
      throw new Error('挂轮：齿数必须为正数（每个可用齿数须 > 0）');
    }
  }
  const teeth = [...new Set(availableTeeth)].sort((left, right) => left - right);
  if (teeth.length < 4) {
    throw new Error('挂轮：可用齿数集合去重后至少需要 4 个（不足无法组成两级齿轮副）');
  }
  return teeth;
}

/** 挂轮求解——四重穷举（V4.1 §3 算法冻结）。 */
export const solveGearTrain: GearTrainFn = (input: GearTrainInput): GearTrainSolution[] => {
  const { workpiecePitch, leadscrewPitch } = input;

  if (!Number.isFinite(workpiecePitch) || workpiecePitch <= 0) {
    throw new Error('挂轮：工件螺距 P 必须大于 0');
  }
  if (!Number.isFinite(leadscrewPitch) || leadscrewPitch <= 0) {
    throw new Error('挂轮：丝杠导程 T 必须大于 0');
  }

  const teeth = normalizeTeeth(input.availableTeeth);
  const target = workpiecePitch / leadscrewPitch;

  const solutions: GearTrainSolution[] = [];
  for (const a of teeth) {
    for (const b of teeth) {
      const firstPair = a / b;
      for (const c of teeth) {
        for (const d of teeth) {
          const ratio = firstPair * (c / d);
          // e = |i_target − i| / i_target × 10⁶（V4.1 §3 / types.ts GearTrainSolution）
          const errorPpm = (Math.abs(target - ratio) / target) * 1e6;
          solutions.push({ a, b, c, d, ratio, errorPpm });
        }
      }
    }
  }

  solutions.sort(
    (left, right) =>
      left.errorPpm - right.errorPpm ||
      left.a + left.b + left.c + left.d - (right.a + right.b + right.c + right.d) ||
      left.a - right.a ||
      left.b - right.b ||
      left.c - right.c ||
      left.d - right.d,
  );

  return solutions.slice(0, MAX_RESULTS);
};
