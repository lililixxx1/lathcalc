/**
 * W8-D · p13 速查数据表测试（钻头 / 硬度）
 *
 * 数据锚：
 * - src/data/drill-tap.json：M1.6–M48 常用粗牙攻丝底孔钻头（25 行）。
 *   口径 V3-7：底孔 ≈ d−P 活算后取就近标准钻头；双源 = GB/T 20330-2006 表1
 *   （MOD ISO 2306:1972）+ threadspec.org ISO 粗牙表，逐行核对见 PROVENANCE。
 *   三锚点：M6×1.0→5.0（6−1=5.0 恰合）、M10×1.5→8.5（10−1.5=8.5 恰合）、
 *   M12×1.75→10.2（12−1.75=10.25，就近标准钻头 10.2，|Δ|=0.05）。
 * - src/data/hardness-conv.json：GB/T 1172-1999 表1 精简行（HRC 20–65 步进 5）。
 *   单源披露（V3-6）；HB 低段取 HBS、高段取 HBW；GB/T 1172 布氏换算止于约
 *   650 HBW（HRC≈60.5），HRC 65 仅列 HV。
 */
import { describe, expect, it } from 'vitest';
import type { ThreadRow } from '../src/core/types';
import { listThreads } from '../src/core/lookup';
import drillJson from '../src/data/drill-tap.json';
import hardnessJson from '../src/data/hardness-conv.json';
import metricJson from '../src/data/threads-metric.json';

interface DrillTapRow {
  designation: string;
  major: number;
  pitch: number;
  drill: number;
  source: string;
}

interface HardnessConvRow {
  hrc: number;
  hb: number | null;
  hbScale: 'HBS' | 'HBW' | null;
  hbs: number | null;
  hbw: number | null;
  hv: number;
  source: string;
}

const DRILLS = drillJson as unknown as DrillTapRow[];
const HARDNESS = hardnessJson as unknown as HardnessConvRow[];
const METRIC_COARSE = listThreads(metricJson as unknown as ThreadRow[], 'metric', true);

function drillBy(designation: string): DrillTapRow | undefined {
  return DRILLS.find((row) => row.designation === designation);
}

function hardnessBy(hrc: number): HardnessConvRow | undefined {
  return HARDNESS.find((row) => row.hrc === hrc);
}

describe('drill-tap.json · M 系列攻丝底孔钻头', () => {
  it('25 行、大径升序、designation 唯一、首末行 M1.6/M48', () => {
    expect(DRILLS).toHaveLength(25);
    expect(DRILLS[0]?.designation).toBe('M1.6×0.35');
    expect(DRILLS[24]?.designation).toBe('M48×5.0');
    expect(new Set(DRILLS.map((row) => row.designation)).size).toBe(DRILLS.length);
    expect(DRILLS.map((row) => row.major)).toEqual([...DRILLS.map((row) => row.major)].sort((a, b) => a - b));
  });

  it('三锚点逐位：M6×1.0→5.0 / M10×1.5→8.5 / M12×1.75→10.2', () => {
    expect(drillBy('M6×1.0')?.drill).toBe(5);
    expect(drillBy('M10×1.5')?.drill).toBe(8.5);
    expect(drillBy('M12×1.75')?.drill).toBe(10.2);
  });

  it('M12 活算 12−1.75=10.25，表值取就近标准钻头 10.2（|Δ|=0.05）', () => {
    const m12 = drillBy('M12×1.75');
    expect(m12).toBeDefined();
    const calculated = (m12?.major ?? 0) - (m12?.pitch ?? 0);
    expect(calculated).toBeCloseTo(10.25, 10);
    expect(Math.abs((m12?.drill ?? 0) - calculated)).toBeCloseTo(0.05, 10);
  });

  it('每行 drill 为 d−P 的就近标准钻头（|drill−(major−pitch)| ≤ 0.05）', () => {
    for (const row of DRILLS) {
      const calculated = row.major - row.pitch;
      // 10.2 − 10.25 在 IEEE-754 下为 −0.05000000000000071；容差 1e-9 仅吸收浮点表示误差
      expect(Math.abs(row.drill - calculated), row.designation).toBeLessThanOrEqual(0.05 + 1e-9);
      expect(row.drill).toBeGreaterThan(0);
      expect(row.drill).toBeLessThan(row.major);
    }
  });

  it('每行 pitch 与 threads-metric.json 粗牙行一致（跨表校验）', () => {
    for (const row of DRILLS) {
      const coarse = METRIC_COARSE.filter((metric) => metric.major === row.major);
      expect(coarse, row.designation).toHaveLength(1);
      expect(coarse[0]?.pitch, row.designation).toBe(row.pitch);
      expect(row.designation).toContain(`×${String(row.pitch)}`);
    }
  });

  it('source 标注 GB/T 20330-2006 与 threadspec.org 双源', () => {
    for (const row of DRILLS) {
      expect(row.source).toContain('GB/T 20330-2006');
      expect(row.source).toContain('threadspec.org');
    }
  });
});

describe('hardness-conv.json · GB/T 1172 精简换算', () => {
  it('10 行，HRC 20–65 步进 5', () => {
    expect(HARDNESS).toHaveLength(10);
    expect(HARDNESS.map((row) => row.hrc)).toEqual([20, 25, 30, 35, 40, 45, 50, 55, 60, 65]);
  });

  it('锚点行逐值（GB/T 1172-1999 表1）', () => {
    expect(hardnessBy(20)).toMatchObject({ hb: 225, hbScale: 'HBS', hbs: 225, hbw: null, hv: 226 });
    expect(hardnessBy(40)).toMatchObject({ hb: 370, hbScale: 'HBS', hbs: 370, hbw: 370, hv: 381 });
    expect(hardnessBy(45)).toMatchObject({ hb: 424, hbScale: 'HBS', hbs: 424, hbw: 428, hv: 441 });
    expect(hardnessBy(50)).toMatchObject({ hb: 502, hbScale: 'HBW', hbs: null, hbw: 502, hv: 512 });
    expect(hardnessBy(60)).toMatchObject({ hb: 647, hbScale: 'HBW', hbs: null, hbw: 647, hv: 698 });
    expect(hardnessBy(65)).toMatchObject({ hb: null, hbScale: null, hbs: null, hbw: null, hv: 822 });
  });

  it('hb = hbs ?? hbw；HV 全行严格递增；HB 有值行严格递增', () => {
    for (const row of HARDNESS) {
      expect(row.hb, `HRC ${row.hrc}`).toBe(row.hbs ?? row.hbw);
    }
    for (let i = 1; i < HARDNESS.length; i += 1) {
      const prev = HARDNESS[i - 1];
      const curr = HARDNESS[i];
      expect(curr?.hv).toBeGreaterThan(prev?.hv ?? 0);
    }
    const hbRows = HARDNESS.map((row) => row.hb).filter((value): value is number => value != null);
    expect(hbRows).toEqual([...hbRows].sort((a, b) => a - b));
    expect(new Set(hbRows).size).toBe(hbRows.length);
  });

  it('source 为单源披露：含「单源：GB/T 1172」', () => {
    for (const row of HARDNESS) {
      expect(row.source).toContain('单源：GB/T 1172');
    }
  });
});
