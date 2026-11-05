/**
 * data/fundamental-deviations.json 数据表测试（W8-C）
 *
 * 表：GB/T 1800.1 轴基本偏差 g/k/p（μm），21 个尺寸段（≤3 … >2500–3150）
 * 端别（GB/T 1800.1）：轴 a–h 基本偏差 = 上偏差 es；k–zc = 下偏差 ei。
 *   本表 g 列 = es（负值）；k/p 列 = ei（k 非负、p 正值）。
 * 分段口径：左开右闭 (lo,hi]，与 src/data/tolerance-it.json 同口径（首段 (0,3]）。
 * 双源核对：来源 A = GB/T 1800.3-1998 轴的基本偏差数值表（mechtool.cn 可读转写）；
 *   来源 B = ISO 286-1:2010 表值实现（thefhiter/tolerance-handbook js/engine/iso286.js）。
 *   21 段 × 3 列逐值一致，另以 4 个独立副源对 ≤500 段/全段抽核；详见
 *   src/data/PROVENANCE.md 与 docs/evidence/W8-C/。
 */
import { describe, it, expect } from 'vitest';
import raw from '../src/data/fundamental-deviations.json';
import itRaw from '../src/data/tolerance-it.json';
import type { ITTableRow } from '../src/core/types';

interface Band {
  band: string;
  g: number;
  k: number;
  p: number;
}

const table = raw as unknown as { source: string; bands: Band[] };
const bands = table.bands;
const IT_ROWS = itRaw as unknown as ITTableRow[];

/** 期望分段（GB/T 1800.1 基本尺寸段，左开右闭）。 */
const EXPECTED_BANDS = [
  '≤3',
  '>3–6',
  '>6–10',
  '>10–18',
  '>18–30',
  '>30–50',
  '>50–80',
  '>80–120',
  '>120–180',
  '>180–250',
  '>250–315',
  '>315–400',
  '>400–500',
  '>500–630',
  '>630–800',
  '>800–1000',
  '>1000–1250',
  '>1250–1600',
  '>1600–2000',
  '>2000–2500',
  '>2500–3150',
] as const;

/**
 * 期望表值（μm），逐值双源核对后冻结：
 * A：GB/T 1800.3-1998 轴的基本偏差数值表（g=es 列 / k=IT4–IT7 列 / p=ei 列）；
 * B：ISO 286-1:2010 轴基本偏差表（thefhiter/tolerance-handbook）。
 * 来源 A 与 B 的 63 个单元格逐位一致（见 docs/evidence/W8-C/runs/dual-source-verify.txt）。
 */
const EXPECTED_G = [-2, -4, -5, -6, -7, -9, -10, -12, -14, -15, -17, -18, -20, -22, -24, -26, -28, -30, -32, -34, -38];
const EXPECTED_K = [0, 1, 1, 1, 2, 2, 2, 3, 3, 4, 4, 4, 5, 0, 0, 0, 0, 0, 0, 0, 0];
const EXPECTED_P = [6, 12, 15, 18, 22, 26, 32, 37, 43, 50, 56, 62, 68, 78, 88, 100, 120, 140, 170, 195, 240];

/** 解析段字符串为 (lo,hi]；与 core/tolerance.ts 的 parseBand 同口径。 */
function segmentOf(band: string): [number, number] {
  const first = /^≤(\d+(?:\.\d+)?)$/.exec(band);
  if (first) return [0, Number(first[1])];
  const range = /^>(\d+(?:\.\d+)?)[–-](\d+(?:\.\d+)?)$/.exec(band);
  if (!range) throw new Error(`无法解析分段：${band}`);
  return [Number(range[1]), Number(range[2])];
}

describe('data/fundamental-deviations.json（GB/T 1800.1 轴基本偏差 g/k/p）', () => {
  it('全表规模：21 段 × g/k/p 三列，source 标注 GB/T 1800.1', () => {
    expect(table.source).toMatch(/GB\/T 1800\.1/);
    expect(bands).toHaveLength(21);
    expect(bands.map((row) => row.band)).toEqual([...EXPECTED_BANDS]);
  });

  it('21 段 × 3 列逐值对拍（来源 A GB/T 1800.3-1998 表 / 来源 B ISO 286-1:2010）', () => {
    expect(bands.map((row) => row.g)).toEqual(EXPECTED_G);
    expect(bands.map((row) => row.k)).toEqual(EXPECTED_K);
    expect(bands.map((row) => row.p)).toEqual(EXPECTED_P);
  });

  it('端别纪律：g=es 恒为负；k=ei 非负；p=ei 为正；全部为 μm 整数', () => {
    for (const row of bands) {
      expect(Number.isInteger(row.g)).toBe(true);
      expect(Number.isInteger(row.k)).toBe(true);
      expect(Number.isInteger(row.p)).toBe(true);
      expect(row.g).toBeLessThan(0);
      expect(row.k).toBeGreaterThanOrEqual(0);
      expect(row.p).toBeGreaterThan(0);
    }
  });

  it('分段口径与 tolerance-it.json 一致：21 段边界逐段相同（左开右闭，首段 (0,3]）', () => {
    expect(IT_ROWS).toHaveLength(21);
    for (let i = 0; i < IT_ROWS.length; i += 1) {
      expect(segmentOf(bands[i]!.band)).toEqual(IT_ROWS[i]!.segment);
    }
    // 后 8 段继续向右延伸至 3150，且段界连续。
    for (let i = 1; i < bands.length; i += 1) {
      expect(segmentOf(bands[i]!.band)[0]).toBe(segmentOf(bands[i - 1]!.band)[1]);
    }
    expect(segmentOf(bands[bands.length - 1]!.band)[1]).toBe(3150);
  });

  it('金测段 >18–30：g=−7（es）、k=+2（ei）、p=+22（ei）——与派工单冻结值一致', () => {
    const row = bands.find((item) => item.band === '>18–30');
    if (!row) throw new Error('缺少 >18–30 段');
    expect(row.g).toBe(-7);
    expect(row.k).toBe(2);
    expect(row.p).toBe(22);
  });

  it('其他尺寸段锚点：>6–10 / >80–120 / >400–500 / >2500–3150', () => {
    const anchors: Array<{ band: string; g: number; k: number; p: number }> = [
      // Ø10 落 >6–10：g=−5、k=+1、p=+15。
      { band: '>6–10', g: -5, k: 1, p: 15 },
      // Ø100 落 >80–120：g=−12、k=+3、p=+37。
      { band: '>80–120', g: -12, k: 3, p: 37 },
      // >400–500：g=−20、k=+5、p=+68。
      { band: '>400–500', g: -20, k: 5, p: 68 },
      // >2500–3150：g=−38（非 −36）、k=0、p=+240（两源一致，见 PROVENANCE）。
      { band: '>2500–3150', g: -38, k: 0, p: 240 },
    ];
    for (const anchor of anchors) {
      const row = bands.find((item) => item.band === anchor.band);
      if (!row) throw new Error(`缺少 ${anchor.band} 段`);
      expect({ band: anchor.band, g: row.g, k: row.k, p: row.p }).toEqual(anchor);
    }
  });
});
