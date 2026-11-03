/**
 * data/tolerance-it.json 数据表测试（W3-C4）
 *
 * 表：GB/T 1800.1 标准公差数值 IT5–IT12（13 段 × 8 级 = 104 值，μm）
 * 主源：GB/T 1800.1 表1（降级批准：2009 全文不可得，用 2020 版同值表；IT 数值沿袭 ISO 286，两版同值）
 * 副源与逐值对拍：见 data/provenance/tolerance-it.md（6 副源 483 格，唯一分歧 IT9 (400,500] 已按 Lead 裁决 2 采用 155）
 * 分段口径：左开右闭 (lo,hi]，即 GB/T 1800.1「大于 lo 至 hi」；首段 (0,3]（C-03 冻结口径）
 * 查询契约：itToleranceMM(rows, nominal, grade) 返回 mm（μm /1000），lookup.ts 只读禁改
 */
import { describe, it, expect } from 'vitest';
import { itToleranceMM } from '../src/core/lookup';
import type { ITTableRow } from '../src/core/types';
import raw from '../src/data/tolerance-it.json';

const rows = raw as unknown as ITTableRow[];

const GRADES = [5, 6, 7, 8, 9, 10, 11, 12] as const;
const EXPECTED_SEGMENTS: Array<[number, number]> = [
  [0, 3], [3, 6], [6, 10], [10, 18], [18, 30], [30, 50], [50, 80],
  [80, 120], [120, 180], [180, 250], [250, 315], [315, 400], [400, 500],
];

/** 按段取行（段不存在直接抛错，避免断言悄悄落空） */
function rowOf(lo: number, hi: number): ITTableRow {
  const row = rows.find((r) => r.segment[0] === lo && r.segment[1] === hi);
  if (!row) throw new Error(`missing segment (${lo},${hi}]`);
  return row;
}

describe('data/tolerance-it.json（GB/T 1800.1 IT5–IT12）', () => {
  it('全表规模：13 段 × 8 级 = 104 值全部非空（派工单修正 1；来源：GB/T 1800.1 表1）', () => {
    // 派工单修正 1（2026-11-03 Lead 裁决）：≤500 mm 主表为 13 段，非 20 段；104 值非 160 值。
    expect(rows).toHaveLength(13);
    expect(rows.map((r) => r.segment)).toEqual(EXPECTED_SEGMENTS);

    // 段界连续覆盖 (0,500]：首段 lo=0，相邻段 lo=hi，末段 hi=500。
    const first = rows[0]!;
    expect(first.segment[0]).toBe(0);
    for (let i = 1; i < rows.length; i += 1) {
      expect(rows[i]!.segment[0]).toBe(rows[i - 1]!.segment[1]);
    }
    expect(rows[rows.length - 1]!.segment[1]).toBe(500);

    let nonEmpty = 0;
    for (const row of rows) {
      expect(Object.keys(row.values)).toHaveLength(GRADES.length);
      expect(row.source).toMatch(/GB\/T 1800\.1/);
      for (const grade of GRADES) {
        const value = row.values[grade];
        expect(value).not.toBeUndefined();
        expect(Number.isInteger(value)).toBe(true);
        expect(value!).toBeGreaterThan(0);
        nonEmpty += 1;
      }
    }
    expect(nonEmpty).toBe(104);
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

  it('三段独立交叉复验（一）：(30,50] 8 级逐值（来源：GB/T 1800.1 表1；S2 教材/S3 手册/S4 Shigley/S5 ISO 286 四点互证，见 provenance §3.1）', () => {
    const row = rowOf(30, 50);
    const expected: Record<number, number> = {
      5: 11, 6: 16, 7: 25, 8: 39, 9: 62, 10: 100, 11: 160, 12: 250,
    };
    for (const grade of GRADES) {
      expect(row.values[grade]).toBe(expected[grade]);
    }
  });

  it('三段独立交叉复验（二）：(10,18] 8 级逐值（来源：GB/T 1800.1 表1；S2 教材/S4 Shigley/S5 ISO 286 互证，见 provenance §3.2）', () => {
    const row = rowOf(10, 18);
    const expected: Record<number, number> = {
      5: 8, 6: 11, 7: 18, 8: 27, 9: 43, 10: 70, 11: 110, 12: 180,
    };
    for (const grade of GRADES) {
      expect(row.values[grade]).toBe(expected[grade]);
    }
  });

  it('三段独立交叉复验（三）：(400,500] 8 级逐值（来源：GB/T 1800.1 表1；S2 教材/S5 ISO 286/S6 ISO 286 互证，见 provenance §3.3）', () => {
    const row = rowOf(400, 500);
    const expected: Record<number, number> = {
      5: 27, 6: 40, 7: 63, 8: 97, 9: 155, 10: 250, 11: 400, 12: 630,
    };
    for (const grade of GRADES) {
      expect(row.values[grade]).toBe(expected[grade]);
    }
  });

  it('分歧值处置：IT9 (400,500]=155 μm（Lead 裁决 2，2026-11-03；MechBox 孤值 160 判转抄错误）', () => {
    expect(rowOf(400, 500).values[9]).toBe(155);
    expect(itToleranceMM(rows, 450, 9)).toBe(0.155);
  });
});
