/**
 * data/densities.json 入库验收（W3-C5）
 *
 * 金测锚点：
 *   - 碳钢 7.85 g/cm³：W2 weight 冻结用例（test/weight.test.ts 圆钢/六方/管用例 ρ=7.85）；
 *   - 铝 2.70 g/cm³：W2 weight 冻结用例（test/weight.test.ts 平板用例 ρ=2.70）；
 *   - 报告:174 另冻结 不锈 7.93 / 铝 2.70 / 黄铜 8.5。
 * 双源互证见 data/provenance/densities.md（手册/材料标准 + Engineering Toolbox 独立物性表）。
 */
import { describe, it, expect } from 'vitest';
import { findDensity } from '../src/core/lookup';
import type { DensityRow } from '../src/core/types';
import densitiesJson from '../data/densities.json';

const rows = densitiesJson as unknown as DensityRow[];

describe('data/densities.json（W3-C5）', () => {
  it('≥10 行；key 唯一；name/source 非空；density > 0', () => {
    expect(rows.length).toBeGreaterThanOrEqual(10);
    expect(new Set(rows.map((r) => r.key)).size).toBe(rows.length);
    for (const row of rows) {
      expect(row.density).toBeGreaterThan(0);
      expect(row.name.length).toBeGreaterThan(0);
      expect(row.source.length).toBeGreaterThan(0);
    }
  });

  it('碳钢锚点：findDensity(rows, "carbon-steel").density === 7.85（W2 weight 冻结用例）', () => {
    // 来源：test/weight.test.ts 圆钢/六方/管用例 ρ=7.85；报告:174 冻结值
    const row = findDensity(rows, 'carbon-steel');
    expect(row.name).toBe('碳钢');
    expect(row.density).toBe(7.85);
  });

  it('铝锚点：findDensity(rows, "aluminum").density === 2.7（W2 weight 冻结用例）', () => {
    // 来源：test/weight.test.ts 平板用例 ρ=2.70；报告:174 冻结值
    const row = findDensity(rows, 'aluminum');
    expect(row.name).toBe('铝');
    expect(row.density).toBe(2.7);
  });

  it('报告:174 冻结密度：304 不锈 7.93、H62 黄铜 8.5 命中', () => {
    // 来源：docs/车工计算App-调研报告.md:174（密度取 7.85/7.93/2.70/8.5）
    expect(findDensity(rows, 'stainless-304').density).toBe(7.93);
    expect(findDensity(rows, 'brass-h62').density).toBe(8.5);
  });

  it('按 key 未命中时 findDensity 抛 PANIC（既有薄层契约）', () => {
    expect(() => findDensity(rows, 'no-such-material')).toThrowError(/PANIC/);
  });
});
