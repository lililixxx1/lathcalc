/**
 * data/morse.json 入库验收（W3-C5）
 *
 * 半角算式（派工单指定口径）：
 *   α/2 = atan( (D − d) / (2L) ) = atan( 1 / (2 × 锥度比值) )
 *   例 MT4：1:19.254 → atan(1 / (2×19.254)) = atan(1/38.508)
 *          = 1.487558565° → degToDMS = "1°29′15″"
 *   例 MT3：1:19.922 → atan(1 / (2×19.922)) = atan(1/39.844)
 *          = 1.437700878° → degToDMS = "1°26′16″"
 * DMS 格式复用树内 src/core/arc.ts 的 degToDMS（秒四舍五入）。
 *
 * 金测锚点来源：
 *   - 4 号 "1:19.254"：src/core/types.ts MorseRow 契约注释冻结示例；
 *   - 3 号 "1:19.922"：GB/T 1443-2016 莫氏自夹圆锥经典值（派工单锚点）；
 *   - 双源互证见 data/provenance/morse.md（GB/T 1443 + LittleMachineShop 参考表）。
 */
import { describe, it, expect } from 'vitest';
import { degToDMS } from '../src/core/arc';
import { findMorse } from '../src/core/lookup';
import type { MorseRow } from '../src/core/types';
import morseJson from '../data/morse.json';

const rows = morseJson as unknown as MorseRow[];

/** "1:19.254" → 19.254 */
function ratioOf(taper: string): number {
  const m = /^1:(\d+(?:\.\d+)?)$/.exec(taper);
  if (!m) throw new Error(`unexpected taper: ${taper}`);
  return Number(m[1]);
}

/** 按派工单算式由锥度比值推半角 DMS */
function halfAngleDMSFromTaper(taper: string): string {
  const halfAngleDeg = (Math.atan(1 / (2 * ratioOf(taper))) * 180) / Math.PI;
  return degToDMS(halfAngleDeg);
}

describe('data/morse.json（W3-C5）', () => {
  it('莫氏 0–6 号共 7 行，号数连续且唯一', () => {
    // 来源：GB/T 1443-2016 莫氏自夹圆锥系列（0–6 号共 7 种）
    expect(rows).toHaveLength(7);
    expect(rows.map((r) => r.number).sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(new Set(rows.map((r) => r.number)).size).toBe(7);
  });

  it("4 号锥度金测 = '1:19.254'（types.ts MorseRow 冻结示例）", () => {
    expect(findMorse(rows, 4).taper).toBe('1:19.254');
  });

  it("3 号锥度金测 = '1:19.922'（GB/T 1443 经典值）", () => {
    expect(findMorse(rows, 3).taper).toBe('1:19.922');
  });

  it('MT4 半角：atan(1/(2×19.254)) = atan(1/38.508) = 1.487558565° → 1°29′15″', () => {
    // 1/38.508 = 0.025968744…；atan = 1.487558565°；degToDMS → 1°29′15″
    const expected = halfAngleDMSFromTaper('1:19.254');
    expect(expected).toBe('1°29′15″');
    expect(findMorse(rows, 4).halfAngleDMS).toBe(expected);
  });

  it('MT3 半角：atan(1/(2×19.922)) = atan(1/39.844) = 1.437700878° → 1°26′16″', () => {
    // 1/39.844 = 0.025097883…；atan = 1.437700878°；degToDMS → 1°26′16″
    const expected = halfAngleDMSFromTaper('1:19.922');
    expect(expected).toBe('1°26′16″');
    expect(findMorse(rows, 3).halfAngleDMS).toBe(expected);
  });

  it('每行 halfAngleDMS 均由本行 taper 按同一算式推出（全表自洽）', () => {
    for (const row of rows) {
      expect(row.halfAngleDMS).toBe(halfAngleDMSFromTaper(row.taper));
    }
  });

  it('全表 taper 与标准莫氏系列一致；source 非空且 taper 格式为 1:x.xxx', () => {
    // 来源：GB/T 1443-2016 莫氏系列；副证 LittleMachineShop Taper Reference（见 provenance）
    expect(rows.map((r) => [r.number, r.taper])).toEqual([
      [0, '1:19.212'],
      [1, '1:20.047'],
      [2, '1:20.020'],
      [3, '1:19.922'],
      [4, '1:19.254'],
      [5, '1:19.002'],
      [6, '1:19.180'],
    ]);
    for (const row of rows) {
      expect(row.source.length).toBeGreaterThan(0);
      expect(row.taper).toMatch(/^1:\d+\.\d{3}$/);
    }
  });
});
