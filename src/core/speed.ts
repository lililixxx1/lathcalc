/** speed.ts · 转速/进给/粗糙度（W2-C1 实现；反向函数 W6-C3 扩展，WAVE-PLAN-V2 §1） */
import type { SpeedInput, SpeedResult } from './types';

/**
 * 主轴转速 n = 1000·Vc/(π·D) [r/min]
 * 每分钟进给 vf = f·n [mm/min]（未给 f 时为 0）
 * 理论粗糙度 Ra ≈ 1000·f²/(8·r) [μm]（未给 f 或 r 时为 undefined）
 * 公式来源：调研报告附录 B（报告:411-413）。
 */
export function spindleSpeed(input: SpeedInput): SpeedResult {
  const rpm = (1000 * input.vc) / (Math.PI * input.diameter);
  const feedPerMin = input.feed === undefined ? 0 : input.feed * rpm;
  const ra =
    input.feed !== undefined && input.tipRadius !== undefined
      ? (1000 * input.feed * input.feed) / (8 * input.tipRadius)
      : undefined;
  return { rpm, feedPerMin, ra };
}

/**
 * 反向：Vc = n·π·D/1000 [m/min]（DEFERRED #13 core 化，WAVE-PLAN-V2 §1）。
 * 与 spindleSpeed 的正向关系互逆：n = 1000·Vc/(π·D)。
 */
export function surfaceSpeed(input: { d: number; n: number }): number {
  return (input.n * Math.PI * input.d) / 1000;
}

/** vf = f·n [mm/min]（WAVE-PLAN-V2 F6）。 */
export function feedRate(f: number, n: number): number {
  return f * n;
}
