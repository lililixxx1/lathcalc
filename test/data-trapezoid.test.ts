/**
 * W3-C2 · Tr 梯形螺纹数据表测试（GB/T 5796.1/.2/.3）
 *
 * 数据表：src/data/threads-trapezoid.json（41 行，family='trapezoid'）
 * 公式：src/core/thread.ts（30° Tr：d2=d−0.5P，H1=0.5P，d1=d−P−2ac）
 * ac 来源：GB/T 5796.1—2005 牙顶间隙表（P1.5→0.15；P2–5→0.25；P6–12→0.5；P14–44→1.0）
 *          双源互证见 src/data/provenance/threads-trapezoid.md §5（ac 表已转正，W2-C2 裁决②关账）
 *
 * 数值纪律：每个期望值附算式 + 来源；验收锚点与 W2-C2 冻结对拍值一致（Tr40×7：d2=36.5、d1=32.0）。
 */
import { describe, it, expect } from 'vitest';
import { listThreads, findThread } from '../src/core/lookup';
import { threadDimensions } from '../src/core/thread';
import type { ThreadRow, ThreadFamily, ThreadSpec } from '../src/core/types';
import trapezoidJson from '../src/data/threads-trapezoid.json';

const rows = trapezoidJson as ThreadRow[];

/** 按规格名取行；缺失即抛错（测试内辅助，避免 noUncheckedIndexedAccess 的 undefined 传播） */
function mustFind(family: ThreadFamily, designation: string): ThreadRow {
  const row = findThread(rows, family, designation);
  if (!row) throw new Error(`missing row: ${family} ${designation}`);
  return row;
}

/** GB/T 5796.1—2005 牙顶间隙 ac 四档（与 src/core/thread.ts 内嵌表同口径；本函数只用于期望值推导） */
function acFromStandard(pitch: number): number {
  if (pitch <= 1.5) return 0.15; // P=1.5：GB/T 5796.1—2005 表值 0.15
  if (pitch <= 5) return 0.25;   // P=2/3/4/5：表值 0.25
  if (pitch <= 12) return 0.5;   // P=6/7/8/9/10/12：表值 0.5
  return 1.0;                    // P=14/16/18/20/22/24/28/32/36/40/44：表值 1.0
}

function specOf(row: ThreadRow): ThreadSpec {
  return {
    family: 'trapezoid',
    designation: row.designation,
    pitch: row.pitch,
    major: row.major,
    flankAngle: 30, // Tr 牙型角 30°（GB/T 5796.1—2005；types.ts FlankAngle）
  };
}

describe('W3-C2 · Tr 数据表形态（41 行）', () => {
  it('行数 / 族 / designation / 唯一性 / 来源键', () => {
    // 41 行 = GB/T 5796.3—2005 表 1 中 8–44 mm 全部第一/第二直径系列、且 DIN 103 独立副源可查的 (d,P) 交集；
    // 副源与行集口径见 provenance/threads-trapezoid.md §2（12 个最大螺距档因无第二独立源未录入）。
    expect(rows).toHaveLength(41);

    expect(rows.every((r) => r.family === 'trapezoid')).toBe(true);
    expect(rows.every((r) => r.designation.startsWith('Tr'))).toBe(true);
    expect(rows.every((r) => r.pitch > 0 && r.major > 0)).toBe(true);
    expect(rows.every((r) => r.source.includes('GB/T 5796') && r.source.includes('DIN 103'))).toBe(true);

    // 规格名唯一
    const names = rows.map((r) => r.designation);
    expect(new Set(names).size).toBe(names.length);
  });

  it('直径集合：8–44 mm 标准第一/第二系列共 21 个直径', () => {
    // 来源：GB/T 5796.3—2005 表 1 直径列（第一系列 8/10/12/16/20/24/28/32/36/40/44；
    //       第二系列 9/11/14/18/22/26/30/34/38/42）。
    const majors = Array.from(new Set(rows.map((r) => r.major))).sort((a, b) => a - b);
    expect(majors).toEqual([
      8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 42, 44,
    ]);
  });

  it('listThreads：按大径升序、同径按螺距升序', () => {
    const listed = listThreads(rows, 'trapezoid');
    expect(listed).toHaveLength(41);
    for (let i = 1; i < listed.length; i += 1) {
      const prev = listed[i - 1]!;
      const cur = listed[i]!;
      expect(prev.major < cur.major || (prev.major === cur.major && prev.pitch <= cur.pitch)).toBe(true);
    }
  });
});

describe('W3-C2 · Tr40×7 验收锚点（W2-C2 冻结对拍值）', () => {
  it('行值：pitch=7、major=40；findThread 命中', () => {
    const row = mustFind('trapezoid', 'Tr40×7');
    // 来源：GB/T 5796.3—2005 表 1，d=40 行、P=7 行（“40 | 7 | 36.5 | 41 | 32 | 33”）
    expect(row.pitch).toBe(7);
    expect(row.major).toBe(40);
    expect(row.family).toBe('trapezoid');
    expect(row.source).toContain('GB/T 5796');
  });

  it('转 ThreadSpec(flankAngle=30) → threadDimensions：d2=36.5、d1=32.0', () => {
    const row = mustFind('trapezoid', 'Tr40×7');
    const dims = threadDimensions(specOf(row));

    // d2 = d − 0.5P = 40 − 0.5×7 = 40 − 3.5 = 36.5
    //   来源：GB/T 5796.1—2005 基本牙型 d2=d−2Z（Z=0.25P）；W2-C2 冻结对拍值 36.5
    expect(dims.d2).toBeCloseTo(36.5, 9);
    expect(dims.d2.toFixed(3)).toBe('36.500');

    // d1 = d − P − 2ac = 40 − 7 − 2×0.5 = 32.0
    //   ac=0.5：P=7 落在 GB/T 5796.1—2005 ac 表 P=6–12 档；W2-C2 冻结对拍值 32.0
    expect(dims.d1).toBeCloseTo(32.0, 9);
    expect(dims.d1.toFixed(3)).toBe('32.000');

    // H1 = 0.5P = 0.5×7 = 3.5（GB/T 5796.1—2005：H1=0.5P）
    expect(dims.h1).toBeCloseTo(3.5, 9);

    // 底孔按契约近似 d−P = 40−7 = 33.0（types.ts ThreadDimensions.tapDrill 注释口径）
    expect(dims.tapDrill).toBeCloseTo(33.0, 9);

    // 最佳针径 d0 = 0.51764P = 0.51764×7 = 3.62348（types.ts 契约常数）
    expect(dims.bestWire).toBeCloseTo(3.62348, 9);
  });
});

describe('W3-C2 · 其余 W2-C2 锚点行（ac 三档交叉核对）', () => {
  it('Tr20×4：d2=18.0、d1=15.5（ac=0.25）', () => {
    const dims = threadDimensions(specOf(mustFind('trapezoid', 'Tr20×4')));
    // d2 = 20 − 0.5×4 = 18.0；d1 = 20 − 4 − 2×0.25 = 15.5
    //   ac=0.25：P=4 落在 GB/T 5796.1—2005 ac 表 P=2–5 档；W2-C2 冻结值 18.0 / 15.5
    expect(dims.d2).toBeCloseTo(18.0, 9);
    expect(dims.d1).toBeCloseTo(15.5, 9);
  });

  it('Tr8×1.5：d2=7.25、d1=6.2（ac=0.15）', () => {
    const dims = threadDimensions(specOf(mustFind('trapezoid', 'Tr8×1.5')));
    // d2 = 8 − 0.5×1.5 = 7.25；d1 = 8 − 1.5 − 2×0.15 = 6.2
    //   ac=0.15：P=1.5 行；GB/T 5796.1—2005 ac 表；W2-C2 冻结值 7.25 / 6.2
    expect(dims.d2).toBeCloseTo(7.25, 9);
    expect(dims.d1).toBeCloseTo(6.2, 9);
  });

  it('Tr30×6：d1=23.0（P=6，ac=0.5 档下边界）', () => {
    const dims = threadDimensions(specOf(mustFind('trapezoid', 'Tr30×6')));
    // d2 = 30 − 0.5×6 = 27.0；d1 = 30 − 6 − 2×0.5 = 23.0
    //   ac=0.5：P=6 落在 GB/T 5796.1—2005 ac 表 P=6–12 档下边界
    expect(dims.d2).toBeCloseTo(27.0, 9);
    expect(dims.d1).toBeCloseTo(23.0, 9);
  });
});

describe('W3-C2 · 全表 41 行与标准公式逐行一致', () => {
  it('每行 d2=d−0.5P、d1=d−P−2ac（ac 按 GB/T 5796.1—2005 四档）', () => {
    for (const row of rows) {
      // 期望值来源：GB/T 5796.1—2005 基本牙型（d2=d−0.5P；d1=d−2h3=d−P−2ac）
      //   + GB/T 5796.3—2005 表 1 的 d/P 组合
      const expectedD2 = row.major - 0.5 * row.pitch;
      const expectedD1 = row.major - row.pitch - 2 * acFromStandard(row.pitch);
      const dims = threadDimensions(specOf(row));

      expect(dims.d2, `${row.designation} d2`).toBeCloseTo(expectedD2, 9);
      expect(dims.d1, `${row.designation} d1`).toBeCloseTo(expectedD1, 9);
      expect(dims.h1, `${row.designation} H1`).toBeCloseTo(0.5 * row.pitch, 9);
    }
  });
});
