/**
 * test/data-unified.test.ts · UNC/UNF 统一螺纹常用表（W3-C3）
 *
 * 数据：data/threads-unified.json（1/4″–1″ 常用档，UNC 10 + UNF 10 = 20 行）
 * 主源：ASME B1.1《Unified Inch Screw Threads》；互证源见
 *       data/provenance/threads-unified.md（gewinde-normen.de + eFunda，2026-11-03）
 *
 * 换算口径（定义性知识，测试按同一算式复算）：
 *   pitch = 25.4 / tpi（mm）——25.4 为 1 英寸的毫米定义值
 *   major = 英寸分数 × 25.4（mm）
 * 示例：1/4-20 UNC → tpi=20 → pitch=25.4/20=1.27；
 *       5/16-18 UNC → major=0.3125×25.4=7.9375
 *       （源表 mm 列按 3 位小数显示为 7.938，属显示取整，见 provenance §4）
 */
import { describe, it, expect } from 'vitest';
import rowsJson from '../src/data/threads-unified.json';
import { findThread, listThreads } from '../src/core/lookup';
import { threadDimensions } from '../src/core/thread';
import type { ThreadRow, ThreadSpec } from '../src/core/types';

const rows = rowsJson as ThreadRow[];

/**
 * 1/4″–1″ 常用档（TPI 为定义性数据：UNC/UNF 系列值，来源 ASME B1.1；
 * 两源逐行对拍记录见 data/provenance/threads-unified.md §3）。
 * major 单位 mm，按英寸分数 × 25.4 精确换算。
 */
const EXPECTED: ReadonlyArray<readonly [designation: string, tpi: number, major: number]> = [
  // UNC：20,18,16,14,13,12,11,10,9,8 tpi；1/4,5/16,3/8,7/16,1/2,9/16,5/8,3/4,7/8,1 in
  ['1/4-20 UNC', 20, 6.35], // 0.25×25.4
  ['5/16-18 UNC', 18, 7.9375], // 0.3125×25.4
  ['3/8-16 UNC', 16, 9.525], // 0.375×25.4
  ['7/16-14 UNC', 14, 11.1125], // 0.4375×25.4
  ['1/2-13 UNC', 13, 12.7], // 0.5×25.4
  ['9/16-12 UNC', 12, 14.2875], // 0.5625×25.4
  ['5/8-11 UNC', 11, 15.875], // 0.625×25.4
  ['3/4-10 UNC', 10, 19.05], // 0.75×25.4
  ['7/8-9 UNC', 9, 22.225], // 0.875×25.4
  ['1-8 UNC', 8, 25.4], // 1×25.4（设计稿/源表写作 1″-8 UNC，数据去掉英寸引号）
  // UNF：28,24,24,20,20,18,18,16,14,12 tpi；尺寸同上
  ['1/4-28 UNF', 28, 6.35], // 0.25×25.4
  ['5/16-24 UNF', 24, 7.9375], // 0.3125×25.4
  ['3/8-24 UNF', 24, 9.525], // 0.375×25.4
  ['7/16-20 UNF', 20, 11.1125], // 0.4375×25.4
  ['1/2-20 UNF', 20, 12.7], // 0.5×25.4
  ['9/16-18 UNF', 18, 14.2875], // 0.5625×25.4
  ['5/8-18 UNF', 18, 15.875], // 0.625×25.4
  ['3/4-16 UNF', 16, 19.05], // 0.75×25.4
  ['7/8-14 UNF', 14, 22.225], // 0.875×25.4
  ['1-12 UNF', 12, 25.4], // 1×25.4
];

/** 英寸分数 → 英寸值（定义性：1/4=0.25、5/16=0.3125 … 1=1.0） */
const INCH_MAJOR: Readonly<Record<string, number>> = {
  '1/4': 0.25,
  '5/16': 0.3125,
  '3/8': 0.375,
  '7/16': 0.4375,
  '1/2': 0.5,
  '9/16': 0.5625,
  '5/8': 0.625,
  '3/4': 0.75,
  '7/8': 0.875,
  '1': 1.0,
};

describe('W3-C3 · threads-unified.json 行集', () => {
  it('20 行：UNC 10 + UNF 10，覆盖 1/4″–1″，designation 无重复', () => {
    // 行集来源：ASME B1.1 UNC/UNF 常用系列 1/4″–1″；两源逐行对拍见 provenance §3
    expect(rows).toHaveLength(20);
    expect(rows.filter((r) => r.designation.endsWith(' UNC'))).toHaveLength(10);
    expect(rows.filter((r) => r.designation.endsWith(' UNF'))).toHaveLength(10);
    expect(new Set(rows.map((r) => r.designation)).size).toBe(20);
    expect(rows.every((r) => r.family === 'unified')).toBe(true);
    expect(rows.every((r) => r.source.length > 0)).toBe(true);
  });

  it('大径范围 6.35–25.4 mm（= 1/4×25.4 至 1×25.4）', () => {
    const majors = rows.map((r) => r.major);
    expect(Math.min(...majors)).toBe(6.35); // 0.25 in × 25.4
    expect(Math.max(...majors)).toBe(25.4); // 1 in × 25.4
  });

  it('每行 tpi 为正整数，且 pitch === 25.4 / tpi（严格相等，禁预估舍入）', () => {
    for (const row of rows) {
      expect(Number.isInteger(row.tpi)).toBe(true);
      expect(row.tpi).toBeGreaterThan(0);
      // 例：25.4/20=1.27；25.4/13=1.9538461538461538；25.4/18=1.411111111111111
      expect(row.pitch).toBe(25.4 / (row.tpi as number));
    }
  });

  it('designation 内数字即每英寸牙数（逐行自洽；含验收锚点 4 行）', () => {
    for (const row of rows) {
      const match = /^(\d+(?:\/\d+)?)-(\d+) (UNC|UNF)$/.exec(row.designation);
      if (!match) throw new Error(`designation 格式不符：${row.designation}`);
      // 例：1/4-20 UNC → 牙数 20；1-8 UNC → 牙数 8
      expect(Number(match[2] ?? NaN)).toBe(row.tpi);
    }

    // 验收锚点（designation 内数字即每英寸牙数，属定义性知识）：
    // 1/4-20 UNC：pitch = 25.4/20 = 1.27
    const quarter20 = findThread(rows, 'unified', '1/4-20 UNC');
    expect(quarter20).toBeDefined();
    expect(quarter20?.tpi).toBe(20);
    expect(quarter20?.pitch).toBe(1.27);

    // 1/2-13 UNC：tpi = 13（pitch = 25.4/13 = 1.9538461538461538）
    expect(findThread(rows, 'unified', '1/2-13 UNC')?.tpi).toBe(13);

    // 1″-8 UNC（数据记作 1-8 UNC）：tpi = 8（pitch = 25.4/8 = 3.175）
    const one8 = findThread(rows, 'unified', '1-8 UNC');
    expect(one8).toBeDefined();
    expect(one8?.tpi).toBe(8);
    expect(one8?.pitch).toBe(3.175);

    // 1/4-28 UNF：tpi = 28（pitch = 25.4/28 = 0.9071428571428571）
    const quarter28 = findThread(rows, 'unified', '1/4-28 UNF');
    expect(quarter28).toBeDefined();
    expect(quarter28?.tpi).toBe(28);
    expect(quarter28?.pitch).toBe(25.4 / 28);
  });

  it('大径 = 英寸分数 × 25.4（逐行复算，4 位小数对拍）', () => {
    for (const row of rows) {
      const size = row.designation.slice(0, row.designation.lastIndexOf('-'));
      const inch = INCH_MAJOR[size];
      if (inch === undefined) throw new Error(`未登记尺寸：${size}`);

      // 例：5/16 → 0.3125×25.4 = 7.9375；9/16 → 0.5625×25.4 = 14.2875
      expect(row.major).toBeCloseTo(inch * 25.4, 12);
      expect(row.major.toFixed(4)).toBe((inch * 25.4).toFixed(4));
    }
  });

  it('与标准行集逐行命中：findThread(rows, "unified", designation) 返回同 tpi/大径', () => {
    for (const [designation, tpi, major] of EXPECTED) {
      const row = findThread(rows, 'unified', designation);
      expect(row, designation).toBeDefined();
      expect(row?.tpi, designation).toBe(tpi);
      // major 按英寸分数精确换算（如 5/16=7.9375、9/16=14.2875）
      expect(row?.major, designation).toBe(major);
    }
  });

  it('listThreads：unified 20 行、按大径升序（同大径再按 pitch 升序）', () => {
    const listed = listThreads(rows, 'unified');
    expect(listed).toHaveLength(20);
    expect(listed[0]?.major).toBe(6.35); // 1/4 in × 25.4
    expect(listed[19]?.major).toBe(25.4); // 1 in × 25.4
    for (let i = 1; i < listed.length; i += 1) {
      const prev = listed[i - 1];
      const cur = listed[i];
      if (!prev || !cur) throw new Error('listThreads 行缺失');
      expect(cur.major).toBeGreaterThanOrEqual(prev.major);
      if (cur.major === prev.major) expect(cur.pitch).toBeGreaterThanOrEqual(prev.pitch);
    }
  });
});

describe('W3-C3 · 交叉层验证（数据行 → ThreadSpec → threadDimensions）', () => {
  it('1/4-20 UNC → 60° ThreadSpec → d2 = 6.35 − 0.6495×1.27 = 5.525（3 位）', () => {
    const row = findThread(rows, 'unified', '1/4-20 UNC');
    if (!row) throw new Error('1/4-20 UNC 未命中');

    // 行 → 契约：unified 牙型角 60°，major=6.35 mm（0.25 in×25.4），pitch=1.27 mm（25.4/20）
    const spec: ThreadSpec = {
      family: 'unified',
      designation: row.designation,
      pitch: row.pitch,
      major: row.major,
      flankAngle: 60,
    };
    expect(spec.family).toBe('unified');
    expect(spec.flankAngle).toBe(60);
    expect(spec.major).toBe(6.35);
    expect(spec.pitch).toBe(1.27);

    const dims = threadDimensions(spec);

    // 冻结 60° 常数集（WAVE-PLAN §4 头部）：d2 = d − 0.6495P
    // = 6.35 − 0.6495×1.27 = 6.35 − 0.824865 = 5.525135 mm
    const expectedD2 = 6.35 - 0.6495 * 1.27;
    expect(expectedD2).toBeCloseTo(5.525135, 9);
    expect(dims.d2).toBeCloseTo(expectedD2, 12);
    // 3 位显示断言：5.525135 → 5.525
    expect(dims.d2.toFixed(3)).toBe('5.525');
    // toBeCloseTo(5.525, 3)：|5.525135 − 5.525| = 0.000135 < 0.0005
    expect(dims.d2).toBeCloseTo(5.525, 3);
  });
});
