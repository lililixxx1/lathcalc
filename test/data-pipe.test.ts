/**
 * W3-C2 · G 非密封管螺纹数据表测试（GB/T 7307—2001 / ISO 228-1）
 *
 * 数据表：src/data/threads-pipe.json（13 行，family='pipe55'，G1/8–G2）
 * 公式：src/core/thread.ts（55°：d2=d−0.6403P，H1=0.6403P，d1=d−1.2806P）
 * 口径：tpi 必填，pitch=25.4/tpi（types.ts ThreadSpec.pitch 注释）
 * 族甄别：R/Rc/Rp 锥管密封螺纹（GB/T 7306 系）一行不得混入（派工单硬规则；provenance/threads-pipe.md §3）
 */
import { describe, it, expect } from 'vitest';
import { listThreads, findThread } from '../src/core/lookup';
import { threadDimensions } from '../src/core/thread';
import type { ThreadRow, ThreadFamily, ThreadSpec } from '../src/core/types';
import pipeJson from '../src/data/threads-pipe.json';

const rows = pipeJson as ThreadRow[];

/** 按规格名取行；缺失即抛错（测试内辅助，避免 noUncheckedIndexedAccess 的 undefined 传播） */
function mustFind(family: ThreadFamily, designation: string): ThreadRow {
  const row = findThread(rows, family, designation);
  if (!row) throw new Error(`missing row: ${family} ${designation}`);
  return row;
}

function specOf(row: ThreadRow): ThreadSpec {
  return {
    family: 'pipe55',
    designation: row.designation,
    pitch: row.pitch,
    major: row.major,
    flankAngle: 55, // 55° 管螺纹牙型角（GB/T 7307—2001；types.ts FlankAngle）
  };
}

describe('W3-C2 · G 数据表形态（13 行，G1/8–G2）', () => {
  it('行数 / 族 / tpi 必填 / pitch=25.4/tpi / 来源键', () => {
    // 13 行 = GB/T 7307—2001 表 1/8、1/4、3/8、1/2、5/8、3/4、7/8、1、1 1/8、1 1/4、1 1/2、1 3/4、2
    //   来源：https://www.jlcfa.com/mcbook/5-1-26.htm（GB/T 7307—2001 表；P1）
    expect(rows).toHaveLength(13);

    expect(rows.every((r) => r.family === 'pipe55')).toBe(true);
    expect(rows.every((r) => r.designation.startsWith('G'))).toBe(true);
    expect(rows.every((r) => typeof r.tpi === 'number' && Number.isInteger(r.tpi) && r.tpi > 0)).toBe(true);
    expect(rows.every((r) => r.source.includes('GB/T 7307'))).toBe(true);

    // P = 25.4/tpi（types.ts：管螺纹按 tpi 换算；JSON 存完整双精度，测试按 12 位 closeTo）
    for (const row of rows) {
      expect(row.pitch, `${row.designation} pitch`).toBeCloseTo(25.4 / row.tpi!, 12);
    }
  });

  it('规格集合精确为 GB/T 7307 的 G1/8–G2（13 个标准尺寸）', () => {
    // 来源：GB/T 7307—2001 表尺寸代号列（1/16–6；本卡取 1/8–2）。
    // 注意：GB/T 7307—2001 无 1 3/8 尺寸代号（1 1/4 后直接 1 1/2）；厂商表额外行不录入（provenance §3.2）。
    const names = rows.map((r) => r.designation).sort();
    expect(names).toEqual([
      'G1', 'G1 1/2', 'G1 1/4', 'G1 1/8', 'G1 3/4', 'G1/2', 'G1/4', 'G1/8',
      'G2', 'G3/4', 'G3/8', 'G5/8', 'G7/8',
    ]);
    expect(new Set(names).size).toBe(names.length);
  });

  it('族甄别：无 R / Rc / Rp 开头 designation，且无 G1 3/8', () => {
    // GB/T 7306.1～7306.2—2000（55° 密封管螺纹，Rp/Rc/R1/R2）是 v0.2 待补族，不得混入；
    // 甄别依据见 provenance/threads-pipe.md §3（P1 7307 表 vs 7306 表逐行核对）。
    expect(rows.some((r) => r.designation.startsWith('R'))).toBe(false);
    expect(rows.some((r) => r.designation.startsWith('Rc'))).toBe(false);
    expect(rows.some((r) => r.designation.startsWith('Rp'))).toBe(false);
    expect(rows.every((r) => r.designation.startsWith('G'))).toBe(true);

    // G1-3/8 仅见于副源厂商表（44.323、11 tpi），GB/T 7307—2001 与 GB/T 7306—2000 均无 1 3/8 尺寸代号 → 不录入
    expect(findThread(rows, 'pipe55', 'G1 3/8')).toBeUndefined();
  });

  it('listThreads：按大径升序；最小 G1/8=9.728、最大 G2=59.614', () => {
    const listed = listThreads(rows, 'pipe55');
    expect(listed).toHaveLength(13);
    expect(listed[0]!.designation).toBe('G1/8');
    expect(listed[listed.length - 1]!.designation).toBe('G2');
    // 来源：GB/T 7307—2001 表大径列：9.728（1/8）… 59.614（2）
    expect(listed[0]!.major).toBe(9.728);
    expect(listed[listed.length - 1]!.major).toBe(59.614);
  });
});

describe('W3-C2 · G1/2 验收锚点（tpi=14，major=20.955）', () => {
  it('行值：tpi=14、pitch=25.4/14=1.8143（4 位）、major=20.955；findThread 命中', () => {
    const row = mustFind('pipe55', 'G1/2');

    // 来源：GB/T 7307—2001 表 1/2 行：14 tpi、大径 20.955 mm（中径 19.793、小径 18.631）
    expect(row.tpi).toBe(14);
    expect(row.major).toBe(20.955);

    // P = 25.4/14 = 1.814285714285714…；4 位断言 1.8143（W3-C2 验收标准）
    expect(row.pitch).toBeCloseTo(25.4 / 14, 12);
    expect(row.pitch.toFixed(4)).toBe('1.8143');
  });

  it('转 ThreadSpec(flankAngle=55) → threadDimensions：d2=19.793、d1=18.631', () => {
    const row = mustFind('pipe55', 'G1/2');
    const dims = threadDimensions(specOf(row));

    // P = 25.4/14 = 1.814285714…
    // d2 = d − 0.6403P = 20.955 − 0.6403×1.814285714… = 20.955 − 1.161687143… = 19.793312857… → 19.793
    //   来源：GB/T 7307—2001 表中径 19.793；常数 0.6403 见 types.ts / WAVE-PLAN §4 冻结集
    expect(dims.d2).toBeCloseTo(19.793312857, 9);
    expect(dims.d2.toFixed(3)).toBe('19.793');

    // d1 = d − 1.2806P = 20.955 − 1.2806×1.814285714… = 20.955 − 2.323374286… = 18.631625714…
    //   来源：GB/T 7307—2001 表小径列 18.631（表值取 3 位截断/舍入）；按 0.6403/1.2806 冻结常数公式值
    //   18.631625714 四舍五入到 3 位为 18.632（W2-C2 D1 冻结断言 18.631626 → 18.632）
    expect(dims.d1).toBeCloseTo(18.631625714, 9);
    expect(dims.d1.toFixed(3)).toBe('18.632');

    // H1 = 0.6403P = 0.6403×1.814285714… = 1.161687143… → 1.162（GB/T 7307—2001 表牙高 1.162）
    expect(dims.h1).toBeCloseTo(1.161687143, 9);
    expect(dims.h1.toFixed(3)).toBe('1.162');

    // 底孔按契约近似 d−P = 20.955 − 1.814285714… = 19.140714286…（types.ts 口径，非管螺纹实际攻丝底孔）
    expect(dims.tapDrill).toBeCloseTo(19.140714286, 9);

    // d0 = 0.56371P = 0.56371×1.814285714… = 1.022731…（types.ts 55° 契约常数）
    expect(dims.bestWire).toBeCloseTo(1.022731, 9);
  });
});

describe('W3-C2 · G1 锚点（tpi=11，major=33.249，与 W2-C2 测试同源互证）', () => {
  it('行值 + threadDimensions：pitch=25.4/11、d2=31.770、d1=30.292', () => {
    const row = mustFind('pipe55', 'G1');

    // 来源：GB/T 7307—2001 表 1 行：11 tpi、大径 33.249 mm（中径 31.770、小径 30.291）
    expect(row.tpi).toBe(11);
    expect(row.major).toBe(33.249);
    expect(row.pitch).toBeCloseTo(25.4 / 11, 12);

    const dims = threadDimensions(specOf(row));

    // P = 25.4/11 = 2.309090909…
    // d2 = 33.249 − 0.6403×2.309090909… = 33.249 − 1.478510909… = 31.770489091… → 31.770
    expect(dims.d2).toBeCloseTo(31.770489091, 9);
    expect(dims.d2.toFixed(3)).toBe('31.770');

    // d1 = 33.249 − 1.2806×2.309090909… = 33.249 − 2.957021818… = 30.291978182… → 30.292
    //   注：GB/T 7307 表列 30.291（表值舍入），W2-C2 冻结值 30.291978；本断言按公式值，显示 3 位为 30.292
    expect(dims.d1).toBeCloseTo(30.291978182, 9);
    expect(dims.d1.toFixed(3)).toBe('30.292');
  });
});

describe('W3-C2 · 全表 13 行与 55° 标准公式逐行一致', () => {
  it('每行 d2=d−0.6403P、d1=d−1.2806P、H1=0.6403P', () => {
    for (const row of rows) {
      // 期望值来源：GB/T 7307—2001 表（d/P 行值）+ 55° 冻结常数集
      //   d2=d−0.6403P；d1=d−1.2806P；H1=0.6403P（types.ts 头注 / thread.ts 55° 分支）
      const p = 25.4 / row.tpi!;
      const dims = threadDimensions(specOf(row));

      expect(dims.d2, `${row.designation} d2`).toBeCloseTo(row.major - 0.6403 * p, 9);
      expect(dims.d1, `${row.designation} d1`).toBeCloseTo(row.major - 1.2806 * p, 9);
      expect(dims.h1, `${row.designation} H1`).toBeCloseTo(0.6403 * p, 9);
    }
  });
});
