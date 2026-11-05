/**
 * W8-A · 锥管螺纹 NPT（60° 1:16 锥）数据表测试
 *
 * 数据表：src/data/threads-npt.json（14 行，family='npt'，NPT1/16–NPT4）
 * 口径（V3-1）：行值 major = 基准平面处大径（GB/T 12716-2011 表）；
 *   d₂/d₁ 由 core/thread.threadDimensions 按 60° 常数活算（= 基准平面处直径）；
 *   底孔 = 基面小径 d₁（d − 1.0825P）。
 * 数值纪律：期望值逐个附算式 + 来源（WAVE-PLAN-V3 §4 / GB/T 12716-2011 表）。
 */
import { describe, it, expect } from 'vitest';
import { findThread, listThreads } from '../src/core/lookup';
import { threadDimensions } from '../src/core/thread';
import type { ThreadRow, ThreadSpec } from '../src/core/types';
import nptJson from '../src/data/threads-npt.json';

const rows = nptJson as ThreadRow[];

function mustFind(designation: string): ThreadRow {
  const row = findThread(rows, 'npt', designation);
  if (!row) throw new Error(`missing row: npt ${designation}`);
  return row;
}

function specOf(row: ThreadRow): ThreadSpec {
  return {
    family: 'npt',
    designation: row.designation,
    pitch: row.pitch,
    major: row.major,
    flankAngle: 60, // GB/T 12716 NPT 牙型角 60°
  };
}

describe('W8-A · NPT 数据表形态（14 行 NPT1/16–NPT4）', () => {
  it('行数 / 族 / designation / tpi / 来源键（双源）', () => {
    // 14 行 = GB/T 12716-2011 常用系列 1/16–4（含 3 1/2）；5/6 因第二源口径冲突未入库（见 PROVENANCE）
    expect(rows).toHaveLength(14);

    expect(rows.every((r) => r.family === 'npt')).toBe(true);
    expect(rows.every((r) => r.designation.startsWith('NPT'))).toBe(true);
    expect(rows.every((r) => typeof r.tpi === 'number' && r.tpi > 0)).toBe(true);
    // 双源：主源 GB/T 12716-2011 表 + 第二独立源 gewinde-normen.de NPT 表
    expect(rows.every((r) => r.source.includes('GB/T 12716'))).toBe(true);
    expect(rows.every((r) => r.source.includes('gewinde-normen'))).toBe(true);

    const names = rows.map((r) => r.designation);
    expect(new Set(names).size).toBe(names.length);
  });

  it('螺距按 tpi 换算：P = 25.4/tpi（逐行严格相等）', () => {
    for (const row of rows) {
      expect(row.pitch, `${row.designation} pitch`).toBe(25.4 / row.tpi!);
    }
  });

  it('基面大径全表（GB/T 12716-2011 表，逐行）', () => {
    // 来源：GB/T 12716-2011 表（164580 转载「大径 d=D」列）；第二源 gewinde-normen.de 同值
    const expected: Array<[string, number]> = [
      ['NPT1/16', 7.895],
      ['NPT1/8', 10.242],
      ['NPT1/4', 13.616],
      ['NPT3/8', 17.055],
      ['NPT1/2', 21.223],
      ['NPT3/4', 26.568],
      ['NPT1', 33.228],
      ['NPT1 1/4', 41.985],
      ['NPT1 1/2', 48.054],
      ['NPT2', 60.092],
      ['NPT2 1/2', 72.699],
      ['NPT3', 88.608],
      ['NPT3 1/2', 101.316],
      ['NPT4', 113.973],
    ];
    expect(rows.map((r) => r.designation)).toEqual(expected.map(([name]) => name));
    for (const [name, major] of expected) {
      expect(mustFind(name).major, name).toBe(major);
    }
  });

  it('族甄别：无 R/G 密封管行混入', () => {
    expect(rows.some((r) => /^R\d/.test(r.designation))).toBe(false);
    expect(rows.some((r) => /^G\d/.test(r.designation))).toBe(false);
  });

  it('listThreads：按大径升序', () => {
    const listed = listThreads(rows, 'npt');
    expect(listed).toHaveLength(14);
    for (let i = 1; i < listed.length; i += 1) {
      expect(listed[i - 1]!.major <= listed[i]!.major).toBe(true);
    }
  });
});

describe('W8-A · NPT1/16 金值（WAVE-PLAN-V3 §4）', () => {
  it('P=25.4/27=0.9407→0.941；基面大径 7.895；d₂/d₁ 走 60° 常数活算', () => {
    const row = mustFind('NPT1/16');
    // P = 25.4/27 = 0.940740740… → 显示 0.941
    expect(row.pitch).toBeCloseTo(0.9407407407407407, 12);
    expect(row.tpi).toBe(27);
    // 基面大径：GB/T 12716-2011 表 NPT1/16 行 = 7.895 mm
    expect(row.major).toBe(7.895);

    const dims = threadDimensions(specOf(row));
    // d₂ = 7.895 − 0.6495×0.940740740… = 7.895 − 0.611011111… = 7.283988888…
    expect(0.6495 * (25.4 / 27)).toBeCloseTo(0.6110111111111111, 12);
    expect(dims.d2).toBeCloseTo(7.283988888888889, 9);
    expect(dims.d2.toFixed(3)).toBe('7.284');
    // d₁ = 7.895 − 1.0825×0.940740740… = 7.895 − 1.018351851… = 6.876648148…
    expect(1.0825 * (25.4 / 27)).toBeCloseTo(1.018351851851852, 12);
    expect(dims.d1).toBeCloseTo(6.876648148148147, 9);
    expect(dims.d1.toFixed(3)).toBe('6.877');
    // 底孔 = 基面小径 d₁（V3-1）
    expect(dims.tapDrill).toBe(dims.d1);
    // H₁ = 0.5413P = 0.509222962…
    expect(dims.h1).toBeCloseTo(0.5092229629629629, 9);
    // d₀ = 0.57735P = 0.543136666…
    expect(dims.bestWire).toBeCloseTo(0.5431366666666666, 9);
  });
});
