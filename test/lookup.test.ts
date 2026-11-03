/** lookup 薄层测试（Lead 预置实现 + fixtures；W3 各卡用真实 JSON 在自己 test 文件里加断言，不改本文件） */
import { describe, it, expect } from 'vitest';
import { listThreads, findThread, itToleranceMM, findMorse, findDensity } from '../src/core/lookup';
import metric from './fixtures/threads-metric.json';
import itTable from './fixtures/tolerance-it.json';
import morse from './fixtures/morse.json';
import densities from './fixtures/densities.json';
import type { ThreadRow, ITTableRow, MorseRow, DensityRow } from '../src/core/types';

const rows = metric as ThreadRow[];
const table = itTable as unknown as ITTableRow[];

describe('lookup（夹具）', () => {
  it('findThread：M30×3.5 命中且忽略空白', () => {
    expect(findThread(rows, 'metric', 'M30×3.5')?.pitch).toBe(3.5);
    expect(findThread(rows, 'metric', 'M30 × 3.5')?.major).toBe(30);
    expect(findThread(rows, 'metric', 'M8×1')).toBeUndefined();
  });

  it('listThreads：按大径升序，粗牙过滤', () => {
    expect(listThreads(rows, 'metric').map((r) => r.designation)).toEqual(['M20×2.5', 'M30×2.0', 'M30×3.5']);
    expect(listThreads(rows, 'metric', true).map((r) => r.designation)).toEqual(['M20×2.5', 'M30×3.5']);
  });

  it('itToleranceMM：Ø40 → 30–50 段 IT7 = 0.025mm（WAVE-PLAN §4 #4 查表段口径）', () => {
    expect(itToleranceMM(table, 40, 7)).toBe(0.025);
    expect(itToleranceMM(table, 40, 6)).toBe(0.016);
    expect(() => itToleranceMM(table, 40, 9)).toThrowError(/PANIC/);
  });

  it('findMorse / findDensity：命中与缺错', () => {
    expect(findMorse(morse as MorseRow[], 4).taper).toBe('1:19.254');
    expect(findDensity(densities as DensityRow[], 'al6061').density).toBe(2.7);
    expect(() => findDensity(densities as DensityRow[], 'nope')).toThrowError(/PANIC/);
  });
});
