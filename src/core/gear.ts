/**
 * gear.ts · 挂轮计算（WAVE-PLAN-V4 §3 / V4.1 §1a 契约预置 panic 桩，W11-B 填实现）
 *
 * 目标比 i_target = workpiecePitch / leadscrewPitch（工件转一转走 P，丝杠转一转走 T）。
 * 四重穷举 a/b/c/d ∈ availableTeeth，i = (a/b)×(c/d)，
 * 排序键 (errorPpm, a+b+c+d, 字典序) 取前 8（V4.1 §3 冻结——并列解排序稳定可断言）。
 * e = |i_target − i| / i_target × 10⁶（ppm）。非法输入 throw（不臆造）。
 */
import type { GearTrainFn, GearTrainInput, GearTrainSolution } from './types';

/** 挂轮求解——W11-B 实现（桩：未实现即抛，防静默误解） */
export const solveGearTrain: GearTrainFn = (input: GearTrainInput): GearTrainSolution[] => {
  void input;
  throw new Error('PANIC: 挂轮计算未实现（W11-B 待实现）');
};
