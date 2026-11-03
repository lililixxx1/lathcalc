/**
 * data/materials.json 入库验收（W3-C5）
 *
 * 性质：切削参数「示例库」，不是标准值（WAVE-PLAN §3 裁决 3；data/COVERAGE.md:27）。
 * 每行 source 必须含 "示例·待复核"，UI 固定警示 + 试切为准。
 * 字段契约：src/core/types.ts MaterialRow（key/name/group/carbideVc/hssVc/
 * carbideFeed/hssFeed/note?/source）。
 */
import { describe, it, expect } from 'vitest';
import { findMaterial } from '../src/core/lookup';
import type { MaterialRow } from '../src/core/types';
import materialsJson from '../src/data/materials.json';

const rows = materialsJson as unknown as MaterialRow[];

describe('data/materials.json（示例库，W3-C5）', () => {
  it('≥12 行', () => {
    expect(rows.length).toBeGreaterThanOrEqual(12);
  });

  it("每行 source 含 '示例·待复核'（WAVE-PLAN §3 裁决 3，全表 every 断言）", () => {
    for (const row of rows) {
      expect(row.source).toContain('示例·待复核');
    }
    expect(rows.every((r) => r.source.includes('示例·待复核'))).toBe(true);
  });

  it('findMaterial 以表内实际 key 命中一行', () => {
    // 来源：data/provenance/materials.md 行清单（steel45 = 45 钢 / 碳钢）
    const row = findMaterial(rows, 'steel45');
    expect(row.name).toBe('45 钢');
    expect(row.group).toBe('碳钢');
  });

  it('字段完整：key/name/group 非空，四组区间均为 [min,max] 且 0 < min ≤ max', () => {
    // 来源：src/core/types.ts MaterialRow 全字段契约
    expect(new Set(rows.map((r) => r.key)).size).toBe(rows.length);
    for (const row of rows) {
      expect(row.key.length).toBeGreaterThan(0);
      expect(row.name.length).toBeGreaterThan(0);
      expect(row.group.length).toBeGreaterThan(0);
      for (const range of [row.carbideVc, row.hssVc, row.carbideFeed, row.hssFeed]) {
        expect(range).toHaveLength(2);
        expect(range[0]).toBeGreaterThan(0);
        expect(range[1]).toBeGreaterThanOrEqual(range[0]);
      }
    }
  });

  it('分组覆盖 ≥3 组，且含碳钢 / 铸铁 / 有色金属', () => {
    const groups = new Set(rows.map((r) => r.group));
    expect(groups.size).toBeGreaterThanOrEqual(3);
    expect(groups.has('碳钢')).toBe(true);
    expect(groups.has('铸铁')).toBe(true);
    expect(groups.has('有色金属')).toBe(true);
  });

  it('按 key 未命中时 findMaterial 抛 PANIC（既有薄层契约）', () => {
    expect(() => findMaterial(rows, 'no-such-material')).toThrowError(/PANIC/);
  });
});
