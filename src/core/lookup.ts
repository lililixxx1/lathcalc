/**
 * lookup.ts · 数据表查询薄层（Lead 预置实现；纯函数 + 依赖注入行数据，便于 fixtures 测试）
 * W3 数据卡只替换 src/data/*.json，不改本文件。
 */
import type {
  ThreadRow, ThreadFamily, ITTableRow, MorseRow, MaterialRow, DensityRow, GcodeRefRow,
} from './types';

/** 列出一族螺纹（按大径升序；可只看粗牙） */
export function listThreads(rows: ThreadRow[], family: ThreadFamily, coarseOnly = false): ThreadRow[] {
  return rows
    .filter((r) => r.family === family && (!coarseOnly || r.coarse))
    .sort((a, b) => a.major - b.major || a.pitch - b.pitch);
}

/** 按规格名找一行（找不到返回 undefined） */
export function findThread(rows: ThreadRow[], family: ThreadFamily, designation: string): ThreadRow | undefined {
  return rows.find(
    (r) => r.family === family && r.designation.replace(/\s+/g, '') === designation.replace(/\s+/g, ''),
  );
}

/** 按基本尺寸与 IT 等级查公差值（mm）。跨段取 ≤ 直径的最大段；查不到抛错 */
export function itToleranceMM(table: ITTableRow[], nominal: number, grade: number): number {
  for (const row of table) {
    const [lo, hi] = row.segment;
    if (nominal >= lo && nominal < hi) {
      const v = row.values[grade];
      if (v == null) break;
      return v / 1000; // μm → mm
    }
  }
  throw new Error(`PANIC: IT value not found for ${nominal}mm IT${grade}`);
}

/** 莫氏号查询 */
export function findMorse(rows: MorseRow[], number: number): MorseRow {
  const hit = rows.find((r) => r.number === number);
  if (!hit) throw new Error(`PANIC: Morse ${number} not found`);
  return hit;
}

/** 材料按 key 查询 */
export function findMaterial(rows: MaterialRow[], key: string): MaterialRow {
  const hit = rows.find((r) => r.key === key);
  if (!hit) throw new Error(`PANIC: material ${key} not found`);
  return hit;
}

/** 密度按 key 查询 */
export function findDensity(rows: DensityRow[], key: string): DensityRow {
  const hit = rows.find((r) => r.key === key);
  if (!hit) throw new Error(`PANIC: density ${key} not found`);
  return hit;
}

/** G 代码速查（按 code 排序） */
export function gcodeRef(rows: GcodeRefRow[]): GcodeRefRow[] {
  return [...rows].sort((a, b) => a.code.localeCompare(b.code));
}
