/**
 * speed.ts 黄金用例（W2-C1）
 * 公式来源：调研报告附录 B（报告:411-413）；黄金值来源：WAVE-PLAN §4 #5。
 */
import { describe, it, expect } from 'vitest';
import { spindleSpeed } from '../src/core/speed';

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
