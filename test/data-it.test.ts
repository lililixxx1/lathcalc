/**
 * data/tolerance-it.json 数据表测试（W3-C4；W10-A 扩至 >500–3150）
 *
 * 表：GB/T 1800.1 标准公差数值
 *   ≤500 mm：IT5–IT12（13 段 × 8 级 = 104 值，μm）——W3-C4 冻结范围，本次不改
 *   >500–3150 mm：IT1–IT18（8 段 × 18 级 = 144 值，μm）——W10-A 双源录入
 * 主源：≤500 见 provenance/tolerance-it.md；>500 见 docs/evidence/W10-A/ 双源核对表
 *   源 A = GB/T 1800.3-1998《标准公差数值》公开转写（mechtool.cn）
 *   源 B = ISO 286-1:2010 Table 1 表值实现（thefhiter/tolerance-handbook iso286.js）
 *   两源 >500 段 144 格逐格一致（0 差异，见 runs/dual-source-verify.txt）
 * 分段口径：左开右闭 (lo,hi]，即 GB/T 1800.1「大于 lo 至 hi」；首段 (0,3]（C-03 冻结口径）
 * 查询契约：itToleranceMM(rows, nominal, grade) 返回 mm（μm /1000），lookup.ts 只读禁改
 */
import { describe, it, expect } from 'vitest';
import { itToleranceMM } from '../src/core/lookup';
import type { ITTableRow } from '../src/core/types';
import raw from '../src/data/tolerance-it.json';

const rows = raw as unknown as ITTableRow[];

/** ≤500 段（W3-C4 冻结）的 8 个等级。 */
const LOW_GRADES = [5, 6, 7, 8, 9, 10, 11, 12] as const;
/** >500 段两源共同覆盖的 18 个等级（IT1–IT18；GB 表注 >500 的 IT1–IT5 为试行）。 */
const HIGH_GRADES = Array.from({ length: 18 }, (_, i) => i + 1);

const EXPECTED_SEGMENTS: Array<[number, number]> = [
  [0, 3], [3, 6], [6, 10], [10, 18], [18, 30], [30, 50], [50, 80],
  [80, 120], [120, 180], [180, 250], [250, 315], [315, 400], [400, 500],
  [500, 630], [630, 800], [800, 1000], [1000, 1250], [1250, 1600],
  [1600, 2000], [2000, 2500], [2500, 3150],
];

/** 按段取行（段不存在直接抛错，避免断言悄悄落空） */
function rowOf(lo: number, hi: number): ITTableRow {
  const row = rows.find((r) => r.segment[0] === lo && r.segment[1] === hi);
  if (!row) throw new Error(`missing segment (${lo},${hi}]`);
  return row;
}

describe('data/tolerance-it.json（GB/T 1800.1 IT 表）', () => {
  it('全表规模：21 段；≤500 为 13 段 × 8 级 = 104 值，>500 为 8 段 × 18 级 = 144 值，共 248 值全部非空', () => {
    // W10-A：段数 13→21（+8 粗段，与 fundamental-deviations.json 的 >500 段逐段对齐）。
    // 等级范围：>500 段以两源交集为准 = IT1–IT18（见 docs/evidence/W10-A/runs/dual-source-verify.txt）。
    expect(rows).toHaveLength(21);
    expect(rows.map((r) => r.segment)).toEqual(EXPECTED_SEGMENTS);

    // 段界连续覆盖 (0,3150]：首段 lo=0，相邻段 lo=hi，末段 hi=3150。
    const first = rows[0]!;
    expect(first.segment[0]).toBe(0);
    for (let i = 1; i < rows.length; i += 1) {
      expect(rows[i]!.segment[0]).toBe(rows[i - 1]!.segment[1]);
    }
    expect(rows[rows.length - 1]!.segment[1]).toBe(3150);

    let lowValues = 0;
    let highValues = 0;
    for (const row of rows) {
      const isLow = row.segment[1] <= 500;
      const expectedGrades = isLow ? LOW_GRADES : HIGH_GRADES;
      expect(Object.keys(row.values).map(Number).sort((a, b) => a - b)).toEqual([
        ...expectedGrades,
      ]);
      expect(row.source).toMatch(/GB\/T 1800\.1/);
      for (const grade of expectedGrades) {
        const value = row.values[grade];
        expect(value).not.toBeUndefined();
        expect(Number.isInteger(value)).toBe(true);
        expect(value!).toBeGreaterThan(0);
        if (isLow) lowValues += 1;
        else highValues += 1;
      }
    }
    expect(lowValues).toBe(104);
    expect(highValues).toBe(144);
    expect(lowValues + highValues).toBe(248);
  });

  it('金测段 (30,50]：IT7=25、IT6=16、IT8=39 μm；itToleranceMM(40,7)=0.025 mm（来源：WAVE-PLAN §4 #4 冻结 + GB/T 1800.1 表1）', () => {
    const row = rowOf(30, 50);
    expect(row.values[7]).toBe(25);
    expect(row.values[6]).toBe(16);
    expect(row.values[8]).toBe(39);

    expect(itToleranceMM(rows, 40, 7)).toBe(0.025);
    expect(itToleranceMM(rows, 40, 6)).toBe(0.016);
    expect(itToleranceMM(rows, 40, 8)).toBe(0.039);
  });

  it('C-03 锚点：>10–18 段 IT7=18 μm；>50–80 段 IT7=30 μm（来源：C-03 分歧裁决值 + GB/T 1800.1 表1）', () => {
    expect(rowOf(10, 18).values[7]).toBe(18);
    expect(rowOf(50, 80).values[7]).toBe(30);
  });

  it('分段边界左开右闭（C-03）：Ø18→(10,18]、Ø30→(18,30]、Ø50→(30,50]（来源：GB/T 1800.1「大于…至…」+ lookup.ts C-03 注释）', () => {
    expect(itToleranceMM(rows, 18, 7)).toBe(0.018);
    expect(itToleranceMM(rows, 30, 7)).toBe(0.021);
    expect(itToleranceMM(rows, 50, 7)).toBe(0.025);
    // 右端点为闭：50.001 落入下一段 (50,80] IT7=30 μm。
    expect(itToleranceMM(rows, 50.001, 7)).toBe(0.03);
  });

  it('>500 段分段边界左开右闭：Ø500→(400,500]、Ø500.001/Ø630→(500,630]、Ø630.001→(630,800]、Ø3150→(2500,3150]、Ø3150.001 抛错', () => {
    // 表值来源：docs/evidence/W10-A/runs/dual-source-verify.txt（A/B/data 逐格一致）。
    // Ø500 落 (400,500]：IT7=63 μm（既有 ≤500 末段，不因扩段改变）。
    expect(itToleranceMM(rows, 500, 7)).toBe(0.063);
    // Ø500.001 与 Ø630 均落 (500,630]：IT7=70 μm。
    expect(itToleranceMM(rows, 500.001, 7)).toBe(0.07);
    expect(itToleranceMM(rows, 630, 7)).toBe(0.07);
    // Ø630.001 落 (630,800]：IT7=80 μm。
    expect(itToleranceMM(rows, 630.001, 7)).toBe(0.08);
    // Ø3150 落 (2500,3150]：IT7=210 μm；>3150 无表值，不臆造。
    expect(itToleranceMM(rows, 3150, 7)).toBe(0.21);
    expect(() => itToleranceMM(rows, 3150.001, 7)).toThrowError(/PANIC/);
  });

  it('>500 段 IT6 / IT7 / IT8 全 8 段逐值（来源：W10-A 双源核对，GB/T 1800.3-1998 转写 + ISO 286-1:2010 一致）', () => {
    const expected: Array<{ lo: number; hi: number; it6: number; it7: number; it8: number }> = [
      // (500,630] … (2500,3150]：两源逐格一致值（μm）。
      { lo: 500, hi: 630, it6: 44, it7: 70, it8: 110 },
      { lo: 630, hi: 800, it6: 50, it7: 80, it8: 125 },
      { lo: 800, hi: 1000, it6: 56, it7: 90, it8: 140 },
      { lo: 1000, hi: 1250, it6: 66, it7: 105, it8: 165 },
      { lo: 1250, hi: 1600, it6: 78, it7: 125, it8: 195 },
      { lo: 1600, hi: 2000, it6: 92, it7: 150, it8: 230 },
      { lo: 2000, hi: 2500, it6: 110, it7: 175, it8: 280 },
      { lo: 2500, hi: 3150, it6: 135, it7: 210, it8: 330 },
    ];
    for (const item of expected) {
      const row = rowOf(item.lo, item.hi);
      expect(row.values[6]).toBe(item.it6);
      expect(row.values[7]).toBe(item.it7);
      expect(row.values[8]).toBe(item.it8);
    }
  });

  it('>500 段交集等级锚点：IT1/IT5/IT12/IT18（首末段，来源：两源交集 IT1–IT18）', () => {
    // 首段 (500,630]：IT1=9、IT5=32、IT12=700、IT18=11000 μm。
    const firstHigh = rowOf(500, 630);
    expect(firstHigh.values[1]).toBe(9);
    expect(firstHigh.values[5]).toBe(32);
    expect(firstHigh.values[12]).toBe(700);
    expect(firstHigh.values[18]).toBe(11000);
    // 末段 (2500,3150]：IT1=26、IT5=96、IT12=2100、IT18=33000 μm。
    const lastHigh = rowOf(2500, 3150);
    expect(lastHigh.values[1]).toBe(26);
    expect(lastHigh.values[5]).toBe(96);
    expect(lastHigh.values[12]).toBe(2100);
    expect(lastHigh.values[18]).toBe(33000);
  });

  it('>500 段 itToleranceMM 换算（μm→mm）：Ø600 IT7=0.070、Ø1000 IT7=0.090、Ø2000 IT7=0.150', () => {
    // 与 test/fit-tolerance.test.ts 的 >500 三组实算共用同一批表值锚点。
    expect(itToleranceMM(rows, 600, 7)).toBe(0.07);
    expect(itToleranceMM(rows, 1000, 7)).toBe(0.09);
    expect(itToleranceMM(rows, 2000, 7)).toBe(0.15);
  });

  it('三段独立交叉复验（一）：(30,50] 8 级逐值（来源：GB/T 1800.1 表1；S2 教材/S3 手册/S4 Shigley/S5 ISO 286 四点互证，见 provenance §3.1）', () => {
    const row = rowOf(30, 50);
    const expected: Record<number, number> = {
      5: 11, 6: 16, 7: 25, 8: 39, 9: 62, 10: 100, 11: 160, 12: 250,
    };
    for (const grade of LOW_GRADES) {
      expect(row.values[grade]).toBe(expected[grade]);
    }
  });

  it('三段独立交叉复验（二）：(10,18] 8 级逐值（来源：GB/T 1800.1 表1；S2 教材/S4 Shigley/S5 ISO 286 互证，见 provenance §3.2）', () => {
    const row = rowOf(10, 18);
    const expected: Record<number, number> = {
      5: 8, 6: 11, 7: 18, 8: 27, 9: 43, 10: 70, 11: 110, 12: 180,
    };
    for (const grade of LOW_GRADES) {
      expect(row.values[grade]).toBe(expected[grade]);
    }
  });

  it('三段独立交叉复验（三）：(400,500] 8 级逐值（来源：GB/T 1800.1 表1；S2 教材/S5 ISO 286/S6 ISO 286 互证，见 provenance §3.3）', () => {
    const row = rowOf(400, 500);
    const expected: Record<number, number> = {
      5: 27, 6: 40, 7: 63, 8: 97, 9: 155, 10: 250, 11: 400, 12: 630,
    };
    for (const grade of LOW_GRADES) {
      expect(row.values[grade]).toBe(expected[grade]);
    }
  });

  it('分歧值处置：IT9 (400,500]=155 μm（Lead 裁决 2，2026-11-03；MechBox 孤值 160 判转抄错误）', () => {
    expect(rowOf(400, 500).values[9]).toBe(155);
    expect(itToleranceMM(rows, 450, 9)).toBe(0.155);
  });
});
