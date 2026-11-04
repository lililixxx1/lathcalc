/**
 * speed.ts 黄金用例（W2-C1）
 * 公式来源：调研报告附录 B（报告:411-413）；黄金值来源：WAVE-PLAN §4 #5。
 */
import { describe, it, expect } from 'vitest';
import { feedRate, spindleSpeed, surfaceSpeed } from '../src/core/speed';

describe('spindleSpeed', () => {
  it('Ø50 / Vc=150：n=954.929659→955、vf=190.985932→191（WAVE-PLAN §4 #5）', () => {
    // n = 1000×Vc/(π×D) = 1000×150/(π×50) = 150000/157.07963267948966
    //   = 954.929658551372 → 6 位小数 954.929659；显示 toFixed(0) = 955
    // vf = f×n = 0.2×954.929658551372 = 190.9859317102744
    //   → 6 位小数 190.985932；显示 toFixed(0) = 191
    const r = spindleSpeed({ diameter: 50, vc: 150, feed: 0.2 });
    expect(r.rpm).toBeCloseTo(954.929659, 6);
    expect(r.feedPerMin).toBeCloseTo(190.985932, 6);
    expect(r.rpm.toFixed(0)).toBe('955');
    expect(r.feedPerMin.toFixed(0)).toBe('191');
    // 未给刀尖圆弧半径 → 理论 Ra 不可算
    expect(r.ra).toBeUndefined();
  });

  it('未给进给 f：vf=0、Ra=undefined（types.ts SpeedResult 契约）', () => {
    const r = spindleSpeed({ diameter: 50, vc: 150 });
    expect(r.feedPerMin).toBe(0);
    expect(r.ra).toBeUndefined();
  });

  it('Ra = 1000·f²/(8·r)：f=0.2、r=0.8 → 6.25 μm', () => {
    // Ra = 1000×0.2²/(8×0.8) = 1000×0.04/6.4 = 40/6.4 = 6.25 μm
    const r = spindleSpeed({ diameter: 50, vc: 150, feed: 0.2, tipRadius: 0.8 });
    expect(r.ra).toBeCloseTo(6.25, 6);
    expect(r.ra?.toFixed(2)).toBe('6.25');
  });

  it('Ra 第二组：f=0.25、r=0.4 → 19.53125 μm', () => {
    // Ra = 1000×0.25²/(8×0.4) = 1000×0.0625/3.2 = 62.5/3.2 = 19.53125 μm
    // n 取另一组参数（Ø80、Vc=120）以覆盖非 Ø50 输入：n=1000×120/(π×80)=477.464829275686
    const r = spindleSpeed({ diameter: 80, vc: 120, feed: 0.25, tipRadius: 0.4 });
    expect(r.rpm).toBeCloseTo(477.464829, 6);
    expect(r.ra).toBeCloseTo(19.53125, 6);
  });
});

// W6-C3 新增（DEFERRED #13 收账）：反向 Vc 与进给 vf 的 core 实现。
describe('surfaceSpeed（Vc = n·π·D/1000）', () => {
  it('Ø50 / n=1000 → Vc=157.079633→157.1（与 test/ui-p09.test.ts:122 金值互证）', () => {
    // Vc = n·π·D/1000；双精度求值 (1000×π)×50/1000 = 157.07963267948963 → 157.1
    expect(surfaceSpeed({ d: 50, n: 1000 })).toBeCloseTo(157.079633, 6);
    expect(surfaceSpeed({ d: 50, n: 1000 }).toFixed(1)).toBe('157.1');
  });

  it('与 spindleSpeed 互逆：Ø50 / Vc=150 的 n 回代 Vc=150', () => {
    // n = 1000×150/(π×50) = 954.929658551372；回代 Vc = 954.929658551372×π×50/1000
    const n = spindleSpeed({ diameter: 50, vc: 150 }).rpm;
    expect(surfaceSpeed({ d: 50, n })).toBeCloseTo(150, 9);
  });
});

describe('feedRate（vf = f·n）', () => {
  it('f=0.2 / n=955 → vf=191.0 mm/min（WAVE-PLAN-V2 §4 锚点）', () => {
    // vf = 0.2×955 = 191
    expect(feedRate(0.2, 955)).toBeCloseTo(191, 9);
    expect(feedRate(0.2, 955).toFixed(1)).toBe('191.0');
  });

  it('未舍入 n：f=0.2 / n=954.929659 → vf=190.985932→191（v0.1 金值同源）', () => {
    const n = spindleSpeed({ diameter: 50, vc: 150 }).rpm;
    // vf = 0.2×954.929658551372 = 190.9859317102744
    expect(feedRate(0.2, n)).toBeCloseTo(190.985932, 6);
    expect(feedRate(0.2, n).toFixed(0)).toBe('191');
  });
});
