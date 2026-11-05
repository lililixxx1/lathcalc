/**
 * core/tolerance.ts · fitTolerance 常用配合实算（W8-C）
 *
 * 口径（WAVE-PLAN-V3 §1/V3-5）：
 *   孔恒 H7：EI=0、ES=+IT7；
 *   轴 g6：es=表值（负）、ei=es−IT6；k6/p6：ei=表值（正）、es=ei+IT6；
 *   Xmin=EI−es、Xmax=ES−ei（间隙为正 / 过盈为负）。
 *   fitType：Xmin≥0 且 Xmax≥0=clearance；Xmax≤0=interference；其余=transition。
 * IT 值来自 src/data/tolerance-it.json（>18–30 段 IT6=13、IT7=21 μm）；
 * 基本偏差来自 src/data/fundamental-deviations.json（>18–30 段 g=−7、k=+2、p=+22 μm）。
 * 逐值算式见各 it() 注释；与派工单金值逐位对照。
 */
import { describe, it, expect } from 'vitest';
import { fitTolerance } from '../src/core/tolerance';
import type { FitInput } from '../src/core/types';

function expectFit(
  nominal: number,
  shaftBand: FitInput['shaftBand'],
  expected: {
    holeLower: number;
    holeUpper: number;
    shaftUpper: number;
    shaftLower: number;
    min: number;
    max: number;
    type: 'clearance' | 'transition' | 'interference';
  },
): void {
  const result = fitTolerance({ nominal, shaftBand });
  expect(result).toEqual({
    hole: { lowerUM: expected.holeLower, upperUM: expected.holeUpper },
    shaft: { upperUM: expected.shaftUpper, lowerUM: expected.shaftLower },
    fitType: expected.type,
    minUM: expected.min,
    maxUM: expected.max,
  });
}

describe('fitTolerance：H7/g6·k6·p6 常用配合实算（μm）', () => {
  it('H7/g6 Ø30：es=−7→ei=−20；孔 0/+21；Xmin=+7、Xmax=+41；clearance（逐字段 toBe）', () => {
    // Ø30 落 (18,30]：IT6=13、IT7=21（tolerance-it.json）。
    // g：es=表值 −7；ei=es−IT6=−7−13=−20。
    // Xmin=EI−es=0−(−7)=+7；Xmax=ES−ei=21−(−20)=+41。
    const r = fitTolerance({ nominal: 30, shaftBand: 'g6' });
    expect(r.hole.lowerUM).toBe(0);
    expect(r.hole.upperUM).toBe(21);
    expect(r.shaft.upperUM).toBe(-7);
    expect(r.shaft.lowerUM).toBe(-20);
    expect(r.minUM).toBe(7);
    expect(r.maxUM).toBe(41);
    expect(r.fitType).toBe('clearance');
  });

  it('H7/k6 Ø30：ei=+2→es=+15；Xmin=−15、Xmax=+19；transition（逐字段 toBe）', () => {
    // k：ei=表值 +2；es=ei+IT6=2+13=+15。
    // Xmin=0−15=−15；Xmax=21−2=+19。
    const r = fitTolerance({ nominal: 30, shaftBand: 'k6' });
    expect(r.hole.lowerUM).toBe(0);
    expect(r.hole.upperUM).toBe(21);
    expect(r.shaft.upperUM).toBe(15);
    expect(r.shaft.lowerUM).toBe(2);
    expect(r.minUM).toBe(-15);
    expect(r.maxUM).toBe(19);
    expect(r.fitType).toBe('transition');
  });

  it('H7/p6 Ø30：ei=+22→es=+35；Xmin=−35、Xmax=−1；interference（逐字段 toBe）', () => {
    // p：ei=表值 +22；es=ei+IT6=22+13=+35。
    // Xmin=0−35=−35；Xmax=21−22=−1（≤0 → 过盈，与 p08 静态标签「H7/p6 过盈」互证）。
    const r = fitTolerance({ nominal: 30, shaftBand: 'p6' });
    expect(r.hole.lowerUM).toBe(0);
    expect(r.hole.upperUM).toBe(21);
    expect(r.shaft.upperUM).toBe(35);
    expect(r.shaft.lowerUM).toBe(22);
    expect(r.minUM).toBe(-35);
    expect(r.maxUM).toBe(-1);
    expect(r.fitType).toBe('interference');
  });

  it('Ø10（>6–10 段）：IT6=9 / IT7=15；g6 −5/−14、k6 +10/+1、p6 +24/+15；p6 的 Xmax=0 判过盈', () => {
    // 表值：g=−5、k=+1、p=+15（fundamental-deviations.json >6–10 段）。
    // g6：ei=−5−9=−14；Xmin=0−(−5)=+5；Xmax=15−(−14)=+29。
    expectFit(10, 'g6', {
      holeLower: 0, holeUpper: 15,
      shaftUpper: -5, shaftLower: -14,
      min: 5, max: 29, type: 'clearance',
    });
    // k6：es=1+9=+10；Xmin=0−10=−10；Xmax=15−1=+14。
    expectFit(10, 'k6', {
      holeLower: 0, holeUpper: 15,
      shaftUpper: 10, shaftLower: 1,
      min: -10, max: 14, type: 'transition',
    });
    // p6：es=15+9=+24；Xmin=0−24=−24；Xmax=15−15=0 → 边界判过盈（≤0）。
    expectFit(10, 'p6', {
      holeLower: 0, holeUpper: 15,
      shaftUpper: 24, shaftLower: 15,
      min: -24, max: 0, type: 'interference',
    });
  });

  it('Ø100（>80–120 段）：IT6=22 / IT7=35；g6 −12/−34、k6 +25/+3、p6 +59/+37', () => {
    // 表值：g=−12、k=+3、p=+37（fundamental-deviations.json >80–120 段）。
    // g6：ei=−12−22=−34；Xmin=+12；Xmax=35−(−34)=+69。
    expectFit(100, 'g6', {
      holeLower: 0, holeUpper: 35,
      shaftUpper: -12, shaftLower: -34,
      min: 12, max: 69, type: 'clearance',
    });
    // k6：es=3+22=+25；Xmin=0−25=−25；Xmax=35−3=+32。
    expectFit(100, 'k6', {
      holeLower: 0, holeUpper: 35,
      shaftUpper: 25, shaftLower: 3,
      min: -25, max: 32, type: 'transition',
    });
    // p6：es=37+22=+59；Xmin=−59；Xmax=35−37=−2。
    expectFit(100, 'p6', {
      holeLower: 0, holeUpper: 35,
      shaftUpper: 59, shaftLower: 37,
      min: -59, max: -2, type: 'interference',
    });
  });

  it('分段边界（左开右闭）：Ø18→(10,18]、Ø18.001/Ø30→(18,30]、Ø30.001→(30,50]', () => {
    // Ø18 落 (10,18]：g=−6、IT6=11、IT7=18 → Xmin=+6、Xmax=18−(−17)=+35。
    expectFit(18, 'g6', {
      holeLower: 0, holeUpper: 18,
      shaftUpper: -6, shaftLower: -17,
      min: 6, max: 35, type: 'clearance',
    });
    // 18.001 与 30 均落 (18,30]：g=−7 → Xmin=+7、Xmax=+41。
    for (const nominal of [18.001, 30]) {
      const r = fitTolerance({ nominal, shaftBand: 'g6' });
      expect(r.shaft.upperUM).toBe(-7);
      expect(r.minUM).toBe(7);
      expect(r.maxUM).toBe(41);
    }
    // 30.001 落 (30,50]：g=−9、IT6=16 → ei=−25、Xmin=+9。
    expectFit(30.001, 'g6', {
      holeLower: 0, holeUpper: 25,
      shaftUpper: -9, shaftLower: -25,
      min: 9, max: 50, type: 'clearance',
    });
  });

  it('首段 ≤3：Ø3 落 (0,3]：g=−2、IT6=6、IT7=10 → g6 −2/−8、Xmin=+2、Xmax=+18', () => {
    expectFit(3, 'g6', {
      holeLower: 0, holeUpper: 10,
      shaftUpper: -2, shaftLower: -8,
      min: 2, max: 18, type: 'clearance',
    });
  });

  it('缺段 / 越界 / 非法输入抛错（不臆造）', () => {
    for (const nominal of [0, -5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => fitTolerance({ nominal, shaftBand: 'g6' })).toThrowError(/PANIC/);
    }
    // IT 表仅到 ≤500；基本偏差表虽到 3150，但无 IT 值不可实算。
    for (const nominal of [500.001, 600, 3150]) {
      expect(() => fitTolerance({ nominal, shaftBand: 'g6' })).toThrowError(/PANIC/);
    }
    // 运行时非法轴代号（类型层外调用）。
    expect(() =>
      fitTolerance({ nominal: 30, shaftBand: 'x6' as unknown as FitInput['shaftBand'] }),
    ).toThrowError(/PANIC/);
  });

  it('全部返回字段为 μm 整数（无浮点尾差）', () => {
    for (const shaftBand of ['g6', 'k6', 'p6'] as const) {
      const r = fitTolerance({ nominal: 30, shaftBand });
      for (const value of [
        r.hole.lowerUM, r.hole.upperUM,
        r.shaft.upperUM, r.shaft.lowerUM,
        r.minUM, r.maxUM,
      ]) {
        expect(Number.isInteger(value)).toBe(true);
      }
    }
  });
});
