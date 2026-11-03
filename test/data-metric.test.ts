/**
 * W3-C1 · M 普通螺纹数据表（GB/T 193-2003 螺距系列 + GB/T 196-2003 基本尺寸）
 *
 * 数据口径：
 *   - 粗牙 = GB/T 193-2003 表1 粗牙列，M1–M64 全系列（39 档，含第2/3系列直径，如 M1.1、M9、M11）
 *   - 细牙 = GB/T 193-2003 表1 细牙列，按优先序每大径取 1–3 档；
 *     排除括号内“尽量避免”档、注①/②限定用途档、与粗牙同值档
 *   - major = GB/T 196-2003 基本尺寸表的大径 D、d = 公称直径
 *   - d2/d1 不落表，由 src/core/thread.ts 按 WAVE-PLAN §4 冻结常数计算
 *
 * 双源：GB/T 193-2003 / GB/T 196-2003（主源）+ DIN 13-1/-2…-11（独立副源，gewinde-normen.de）。
 * 逐行核对与分歧处置见 data/provenance/threads-metric.md。
 */
import { describe, it, expect } from 'vitest';
import { findThread, listThreads } from '../src/core/lookup';
import { threadDimensions } from '../src/core/thread';
import type { ThreadRow, ThreadSpec } from '../src/core/types';
import metricRows from '../src/data/threads-metric.json';

const rows = metricRows as unknown as ThreadRow[];

describe('W3-C1 · M 普通螺纹数据表', () => {
  it('行数 ≥100；粗牙覆盖 M1…M64（首尾行）', () => {
    // 行数：GB/T 193-2003 表1 粗牙 39 档 + 细牙 110 档（每大径 1–3 档）= 149 ≥ 100
    expect(rows.length).toBeGreaterThanOrEqual(100);

    const coarse = rows.filter((r) => r.coarse === true);
    // 粗牙 39 档：GB/T 193-2003 表1 粗牙列非“-”项，M1…M64（含第2/3系列直径，如 M1.1、M9、M11）
    expect(coarse).toHaveLength(39);
    // 首尾行：粗牙序列按大径升序，首 = M1，尾 = M64
    expect(coarse[0]?.designation).toBe('M1');
    expect(coarse[coarse.length - 1]?.designation).toBe('M64');
    // 数据文件整体首行 = M1 粗牙（同大径内粗牙行在前）
    expect(rows[0]?.designation).toBe('M1');
  });

  it('粗牙螺距金测锚点 + major=公称直径（GB/T 193-2003 表1 / GB/T 196-2003 基本尺寸表）', () => {
    // 锚点：designation → P（GB/T 193-2003 表1 粗牙列；GB/T 196-2003 表1 同步给出 P）
    const anchors: ReadonlyArray<readonly [string, number]> = [
      ['M6', 1.0], // 查表：M6 粗牙 P=1.0（GB/T 193-2003 表1；GB/T 196-2003 表1 M6 行）
      ['M10', 1.5], // 查表：M10 粗牙 P=1.5（同上）
      ['M12', 1.75], // 查表：M12 粗牙 P=1.75（同上）
      ['M20', 2.5], // 查表：M20 粗牙 P=2.5（同上）
      ['M30', 3.5], // 查表：M30 粗牙 P=3.5（同上；WAVE-PLAN §4 #7）
      ['M64', 6.0], // 查表：M64 粗牙 P=6.0（GB/T 193-2003 表1 粗牙列末档）
    ];
    for (const [designation, pitch] of anchors) {
      const row = findThread(rows, 'metric', designation);
      expect(row, designation).toBeDefined();
      if (!row) continue; // 类型收窄；断言失败时上一行已抛出
      // major = 公称直径：GB/T 196-2003 基本尺寸表 D、d = 公称直径
      expect(row.major, designation).toBe(Number(designation.slice(1)));
      // P：GB/T 193-2003 表1 粗牙列（逐值见上方锚点注释）
      expect(row.pitch, designation).toBe(pitch);
      // 粗牙行必须标 coarse=true（细牙行省略该字段）
      expect(row.coarse, designation).toBe(true);
    }
  });

  it('交叉层：findThread(M30) → ThreadSpec → threadDimensions d2=27.727（WAVE-PLAN §4 #7）', () => {
    const row = findThread(rows, 'metric', 'M30');
    expect(row).toBeDefined();
    if (!row) return;

    // 行值：M30 粗牙 P=3.5（GB/T 193-2003 表1 粗牙列）；大径 d=30（GB/T 196-2003 表1）
    expect(row.pitch).toBe(3.5);
    expect(row.major).toBe(30);
    expect(row.coarse).toBe(true);

    const spec: ThreadSpec = {
      family: 'metric',
      designation: row.designation,
      pitch: row.pitch,
      major: row.major,
      flankAngle: 60,
    };
    const dims = threadDimensions(spec);

    // d2 = d − 0.6495P = 30 − 0.6495×3.5 = 30 − 2.27325 = 27.72675
    // 显示值 27.727（WAVE-PLAN §4 #7 冻结值；GB/T 196-2003 表1 M30 粗牙 d2=27.727）
    expect(dims.d2).toBeCloseTo(27.72675, 6);
    expect(dims.d2.toFixed(3)).toBe('27.727');

    // d1 = d − 1.0825P = 30 − 1.0825×3.5 = 30 − 3.78875 = 26.21125 → 26.211
    // GB/T 196-2003 表1 M30 粗牙 d1=26.211（表值 3 位舍入）
    expect(dims.d1).toBeCloseTo(26.21125, 6);
    expect(dims.d1.toFixed(3)).toBe('26.211');
  });

  it('细牙：含 M30×2（P=2）；细牙行省略 coarse；每大径 1–3 档', () => {
    const fine = rows.filter((r) => r.coarse === undefined);
    // 细牙 110 档 ≥ 61（39 粗牙 + 61 = 100 的下限）
    expect(fine.length).toBeGreaterThanOrEqual(61);

    // M30×2：GB/T 193-2003 表1 细牙列 M30 行 P=2；GB/T 196-2003 表1 M30 行 d2=28.701、d1=27.835
    const m30x2 = findThread(rows, 'metric', 'M30×2');
    expect(m30x2).toBeDefined();
    if (!m30x2) return;
    expect(m30x2.pitch).toBe(2); // 查表：GB/T 193-2003 表1 细牙列 M30×2
    expect(m30x2.major).toBe(30); // GB/T 196-2003 表1：大径 = 公称直径 30
    expect(m30x2.coarse).toBeUndefined(); // 细牙行按派工单省略 coarse

    // 每大径细牙档数 1–3：GB/T 193-2003 表1 细牙列按优先序取常用值口径
    const counts = new Map<number, number>();
    for (const r of fine) counts.set(r.major, (counts.get(r.major) ?? 0) + 1);
    for (const [major, count] of counts) {
      expect(count, `M${major} 细牙档数`).toBeGreaterThanOrEqual(1);
      expect(count, `M${major} 细牙档数`).toBeLessThanOrEqual(3);
    }
  });

  it('数据完整性：族/来源/正数/唯一性；listThreads 粗牙过滤 M1…M64', () => {
    // 全行 family='metric'（ThreadRow.family 契约）
    expect(rows.every((r) => r.family === 'metric')).toBe(true);
    // 每行 source 非空：PROVENANCE 来源键（标准号 + 表）
    expect(rows.every((r) => typeof r.source === 'string' && r.source.length > 0)).toBe(true);
    // 螺距/大径为正数 mm
    expect(rows.every((r) => r.pitch > 0 && r.major > 0)).toBe(true);
    // designation 唯一（同一规格不重复）
    expect(new Set(rows.map((r) => r.designation)).size).toBe(rows.length);
    // metric 族不填 tpi（ThreadRow.tpi 注释：pipe55/unified 原始口径）
    expect(rows.every((r) => r.tpi === undefined)).toBe(true);

    // lookup 层：粗牙过滤 39 行，按大径升序 M1…M64
    const listed = listThreads(rows, 'metric', true);
    expect(listed).toHaveLength(39);
    expect(listed[0]?.designation).toBe('M1');
    expect(listed[listed.length - 1]?.designation).toBe('M64');
  });
});
