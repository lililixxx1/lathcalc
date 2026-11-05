/**
 * gear.test.ts · 挂轮计算测试（WAVE-PLAN-V4.1 §1b 契约预置桩测试，W11-B 扩真断言）
 *
 * 桩期断言：solveGearTrain 抛 PANIC（防静默误解）。
 * W11-B 落地后本文件扩锚点断言（V4.1 §3）：
 *   - 五倍组 {20,25,…,100}、T=6、P=1.5 → i=0.25，top1.errorPpm===0（精确解存在，如 30/60×40/80）
 *   - T=12、P=3.175（=25.4/8，8 tpi）→ i=0.26458333…，穷举最优 top1=20/55×40/55，
 *     ratio=(20/55)×(40/55)=800/3025=0.2644628099，errorPpm≈455.52（Lead 已独立穷举复算）
 *   - 域校验：P≤0 / 齿数<4 / 含非正齿数 → throw
 */
import { describe, expect, it } from 'vitest';
import { solveGearTrain } from '../src/core/gear';

describe('gear 挂轮计算（W11-B 桩期）', () => {
  it('solveGearTrain 桩：抛 PANIC（未实现防静默误解）', () => {
    expect(() =>
      solveGearTrain({ workpiecePitch: 1.5, leadscrewPitch: 6, availableTeeth: [20, 40, 60, 80] }),
    ).toThrow('PANIC: 挂轮计算未实现（W11-B 待实现）');
  });
});
