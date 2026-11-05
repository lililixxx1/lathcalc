/**
 * W8-A · 密封管螺纹 R（55° 1:16 锥）数据表测试
 *
 * 数据表：src/data/threads-sealpipe.json（15 行，family='sealpipe'，R1/16–R6）
 * 口径（V3-1）：行值 major = 基准平面处大径（GB/T 7306.1-2000 表）；
 *   d₂/d₁ 由 core/thread.threadDimensions 按 55° 常数活算（= 基准平面处直径）；
 *   底孔 = 基面小径 d₁（d − 1.2806P）。
 * 数值纪律：期望值逐个附算式 + 来源（WAVE-PLAN-V3 §4 / GB/T 7306.1-2000 表）。
 */
import { describe, it, expect } from 'vitest';
import { findThread, listThreads } from '../src/core/lookup';
import { threadDimensions } from '../src/core/thread';
import type { ThreadRow, ThreadSpec } from '../src/core/types';
import sealpipeJson from '../src/data/threads-sealpipe.json';

const rows = sealpipeJson as ThreadRow[];

function mustFind(designation: string): ThreadRow {
  const row = findThread(rows, 'sealpipe', designation);
  if (!row) throw new Error(`missing row: sealpipe ${designation}`);
  return row;
}

function specOf(row: ThreadRow): ThreadSpec {
  return {
    family: 'sealpipe',
    designation: row.designation,
    pitch: row.pitch,
    major: row.major,
    flankAngle: 55, // GB/T 7306 密封管螺纹牙型角 55°
  };
}

describe('W8-A · sealpipe 数据表形态（15 行 R1/16–R6）', () => {
  it('行数 / 族 / designation / tpi / 来源键（双源）', () => {
    // 15 行 = GB/T 7306.1-2000 尺寸代号 1/16–6（与 GB/T 7307 G 系列同尺寸代号区间）
    expect(rows).toHaveLength(15);

    expect(rows.every((r) => r.family === 'sealpipe')).toBe(true);
    expect(rows.every((r) => r.designation.startsWith('R'))).toBe(true);
    expect(rows.every((r) => typeof r.tpi === 'number' && r.tpi > 0)).toBe(true);
    expect(rows.every((r) => r.pitch > 0 && r.major > 0)).toBe(true);
    // 双源：主源 GB/T 7306.1-2000 + 第二独立源 BSPT 厂商表
    expect(rows.every((r) => r.source.includes('GB/T 7306'))).toBe(true);
    expect(rows.every((r) => r.source.includes('supergaging'))).toBe(true);

    const names = rows.map((r) => r.designation);
    expect(new Set(names).size).toBe(names.length);
  });

  it('螺距按 tpi 换算：P = 25.4/tpi（逐行严格相等）', () => {
    // types.ts：管螺纹按 tpi 换算；存完整双精度商值（与本文件算式同一双精度结果）
    for (const row of rows) {
      expect(row.pitch, `${row.designation} pitch`).toBe(25.4 / row.tpi!);
    }
  });

  it('基面大径全表（GB/T 7306.1-2000 表1，逐行）', () => {
    // 来源：GB/T 7306.1-2000 表 1「基准平面处大径 d」；第二源 BSPT 厂商表同值
    //   （R3/4 第二源排版为 26.411，主源/GB/T 7307 G3/4 均为 26.441，按副源笔误登记，见 PROVENANCE）。
    const expected: Array<[string, number]> = [
      ['R1/16', 7.723],
      ['R1/8', 9.728],
      ['R1/4', 13.157],
      ['R3/8', 16.662],
      ['R1/2', 20.955],
      ['R3/4', 26.441],
      ['R1', 33.249],
      ['R1 1/4', 41.91],
      ['R1 1/2', 47.803],
      ['R2', 59.614],
      ['R2 1/2', 75.184],
      ['R3', 87.884],
      ['R4', 113.03],
      ['R5', 138.43],
      ['R6', 163.83],
    ];
    expect(rows.map((r) => r.designation)).toEqual(expected.map(([name]) => name));
    for (const [name, major] of expected) {
      expect(mustFind(name).major, name).toBe(major);
    }
  });

  it('族甄别：无 G 圆柱管 / NPT 行混入', () => {
    expect(rows.some((r) => r.designation.startsWith('G'))).toBe(false);
    expect(rows.some((r) => r.designation.startsWith('NPT'))).toBe(false);
  });

  it('listThreads：按大径升序', () => {
    const listed = listThreads(rows, 'sealpipe');
    expect(listed).toHaveLength(15);
    for (let i = 1; i < listed.length; i += 1) {
      expect(listed[i - 1]!.major <= listed[i]!.major).toBe(true);
    }
  });
});

describe('W8-A · R1/16 金值（WAVE-PLAN-V3 §4）', () => {
  it('P=25.4/28=0.9071→0.907；d₂=7.723−0.6403×0.907=7.142；d₁=6.561（55° 常数活算）', () => {
    const row = mustFind('R1/16');
    // P = 25.4/28 = 0.907142857… → 显示 0.907
    expect(row.pitch).toBeCloseTo(0.9071428571428571, 12);
    expect(row.tpi).toBe(28);
    // 基面大径：GB/T 7306.1-2000 表1 R1/16 行 = 7.723 mm
    expect(row.major).toBe(7.723);

    const dims = threadDimensions(specOf(row));
    // d₂ = 7.723 − 0.6403×0.907142857… = 7.723 − 0.580843571… = 7.142156428…
    expect(0.6403 * (25.4 / 28)).toBeCloseTo(0.5808435714285715, 12);
    expect(dims.d2).toBeCloseTo(7.142156428571428, 9);
    expect(dims.d2.toFixed(3)).toBe('7.142');
    // d₁ = 7.723 − 1.2806×0.907142857… = 7.723 − 1.161687143… = 6.561312857…
    expect(dims.d1).toBeCloseTo(6.561312857142857, 9);
    expect(dims.d1.toFixed(3)).toBe('6.561');
    // 底孔 = 基面小径 d₁（V3-1）
    expect(dims.tapDrill).toBe(dims.d1);
    // H₁ = 0.6403P = 0.580843571…
    expect(dims.h1).toBeCloseTo(0.5808435714285715, 9);
    // d₀ = 0.56371P = 0.5113655
    expect(dims.bestWire).toBeCloseTo(0.5113655, 9);
  });

  it('其余规格螺距按 tpi 换算（R 系列全表）', () => {
    for (const name of ['R1/8', 'R1/4', 'R3/8', 'R1/2', 'R3/4', 'R1', 'R1 1/4', 'R1 1/2', 'R2']) {
      const row = mustFind(name);
      expect(row.pitch, name).toBe(25.4 / row.tpi!);
    }
  });
});
