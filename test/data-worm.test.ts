/**
 * W8-A · 蜗杆（GB/T 10088 模数制，ZA 40°）数据表测试
 *
 * 数据表：src/data/threads-worm.json（15 行，family='worm'，m1–m25）
 * 口径（V3-2）：表只存模数 m（ThreadRow.pitch 字段承载 m；major 镜像同值仅满足
 *   ThreadRow 契约与升序排序，不参与计算）；px=π·m 与 h₁=2.2·m 由
 *   core/thread.wormGeometry 活算（单一真源），数据表不存 px/h。
 * 数值纪律：期望值逐个附算式 + 来源（GB/T 10088-2018 / GB/T 10087-2018）。
 */
import { describe, it, expect } from 'vitest';
import { findThread, listThreads } from '../src/core/lookup';
import { wormGeometry } from '../src/core/thread';
import type { ThreadRow } from '../src/core/types';
import wormJson from '../src/data/threads-worm.json';

const rows = wormJson as ThreadRow[];

/** GB/T 10088-2018 标准模数系列（jlcfa GB/T 10085-1988 表 + mechtool 匹配表双源核对） */
const MODULE_SERIES = [
  1, 1.25, 1.6, 2, 2.5, 3.15, 4, 5, 6.3, 8, 10, 12.5, 16, 20, 25,
];

function mustFind(designation: string): ThreadRow {
  const row = findThread(rows, 'worm', designation);
  if (!row) throw new Error(`missing row: worm ${designation}`);
  return row;
}

describe('W8-A · 蜗杆数据表形态（15 行模数系列）', () => {
  it('行数 / 族 / designation / 来源键（双源）', () => {
    expect(rows).toHaveLength(15);
    expect(rows.every((r) => r.family === 'worm')).toBe(true);
    expect(rows.every((r) => r.designation === `m${r.pitch}`)).toBe(true);
    expect(rows.every((r) => r.pitch > 0)).toBe(true);
    // 双源：GB/T 10088-2018 模数系列 + GB/T 10085-1988 表（jlcfa）+ mechtool 匹配表
    expect(rows.every((r) => r.source.includes('GB/T 10088'))).toBe(true);
    expect(rows.every((r) => r.source.includes('GB/T 10085'))).toBe(true);
    expect(rows.every((r) => r.source.includes('mechtool'))).toBe(true);
  });

  it('模数系列逐值：1/1.25/1.6/2/2.5/3.15/4/5/6.3/8/10/12.5/16/20/25', () => {
    expect(rows.map((r) => r.pitch)).toEqual(MODULE_SERIES);
    expect(rows.map((r) => r.designation)).toEqual(MODULE_SERIES.map((m) => `m${m}`));
    // major 为契约占位镜像，不承载第二真源（见文件头注）
    expect(rows.every((r) => r.major === r.pitch)).toBe(true);
  });

  it('listThreads：按大径（= 模数）升序', () => {
    const listed = listThreads(rows, 'worm');
    expect(listed).toHaveLength(15);
    for (let i = 1; i < listed.length; i += 1) {
      expect(listed[i - 1]!.major < listed[i]!.major).toBe(true);
    }
  });
});

describe('W8-A · 蜗杆几何活算（逐行 px=π·m、h₁=2.2·m、40°）', () => {
  it('m=2：px=π×2=6.28319→6.283；h=2.2×2=4.4；flankAngle=40', () => {
    const row = mustFind('m2');
    expect(row.pitch).toBe(2);
    const g = wormGeometry(row.pitch);
    // px = π×2 = 6.283185307…
    expect(g.axialPitch).toBeCloseTo(6.283185307179586, 12);
    expect(g.axialPitch.toFixed(3)).toBe('6.283');
    // h₁ = 2.2×2 = 4.4（GB/T 10087-2018 基本齿廓）
    expect(g.wholeDepth).toBeCloseTo(4.4, 12);
    // ZA 牙型角 40°（GB/T 10087）
    expect(g.flankAngle).toBe(40);
  });

  it('全表逐行：px=π·m、h₁=2.2·m（模数制唯一真源）', () => {
    for (const row of rows) {
      const g = wormGeometry(row.pitch);
      expect(g.axialPitch, `${row.designation} px`).toBeCloseTo(Math.PI * row.pitch, 12);
      expect(g.wholeDepth, `${row.designation} h1`).toBeCloseTo(2.2 * row.pitch, 12);
      expect(g.flankAngle).toBe(40);
    }
  });
});
