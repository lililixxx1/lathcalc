/** taper.ts 单测（W2-C3）：三值 → 锥度 C / 半角 / DMS（调研报告 §4.1 #5、§6.4 #3） */
import { describe, it, expect } from 'vitest';
import { taperCalc, taperReverse } from '../src/core/taper';
import { findMorse } from '../src/core/lookup';
import type { MorseRow } from '../src/core/types';
import morse from './fixtures/morse.json';

/** degToDMS 输出 → 十进制度（用于「秒位 ±0.5″」容差断言） */
function dmsToDeg(dms: string): number {
  const m = /^(-?)(\d+)°(\d+)′(\d+)″$/.exec(dms);
  if (!m) throw new Error(`unexpected DMS: ${dms}`);
  const sign = m[1] === '-' ? -1 : 1;
  return sign * (Number(m[2]) + Number(m[3]) / 60 + Number(m[4]) / 3600);
}

/**
 * 黄金值（独立手推 + Node/Python 双路复算，见交付报告对拍表）：
 * 1) D=32, d=27, L=50 → C=(32−27)/50=0.1；α/2=atan(0.05)=2.8624052261°→2°51′45″
 * 2) D=32, d=24, L=40 → C=8/40=0.2；α/2=atan(0.1)=5.7105931375°→5°42′38″
 * 3) D=50, d=45, L=100 → C=5/100=0.05；α/2=atan(0.025)=1.4320961842°→1°25′56″
 */
describe('taperCalc：锥度三值互算 + 半角', () => {
  it('1:10（WAVE-PLAN §4 #3）：D=32,d=27,L=50 → C=0.1，半角 2.862405°→2°51′45″', () => {
    const r = taperCalc({ big: 32, small: 27, length: 50 });
    expect(r.taperC).toBeCloseTo(0.1, 12);
    expect(r.halfAngleDeg).toBeCloseTo(2.862405226112, 9);
    expect(r.halfAngleDMS).toBe('2°51′45″');
    // 秒位容差 ±0.5″：DMS 还原角与原始半角之差 ≤ 0.5″
    expect(Math.abs(dmsToDeg(r.halfAngleDMS) - r.halfAngleDeg) * 3600).toBeLessThanOrEqual(0.5);
  });

  it('三值例 2：D=32,d=24,L=40 → C=0.2，半角 5.710593°→5°42′38″', () => {
    const r = taperCalc({ big: 32, small: 24, length: 40 });
    expect(r.taperC).toBeCloseTo(0.2, 12);
    expect(r.halfAngleDeg).toBeCloseTo(5.7105931375, 9);
    expect(r.halfAngleDMS).toBe('5°42′38″');
    expect(Math.abs(dmsToDeg(r.halfAngleDMS) - r.halfAngleDeg) * 3600).toBeLessThanOrEqual(0.5);
  });

  it('三值例 3：D=50,d=45,L=100 → C=0.05，半角 1.432096°→1°25′56″', () => {
    const r = taperCalc({ big: 50, small: 45, length: 100 });
    expect(r.taperC).toBeCloseTo(0.05, 12);
    expect(r.halfAngleDeg).toBeCloseTo(1.432096184165, 9);
    expect(r.halfAngleDMS).toBe('1°25′56″');
    expect(Math.abs(dmsToDeg(r.halfAngleDMS) - r.halfAngleDeg) * 3600).toBeLessThanOrEqual(0.5);
  });

  it('反向锥（d>D）：C 与半角带符号，方向不丢失', () => {
    const r = taperCalc({ big: 27, small: 32, length: 50 });
    expect(r.taperC).toBeCloseTo(-0.1, 12);
    expect(r.halfAngleDeg).toBeCloseTo(-2.862405226112, 9);
    expect(r.halfAngleDMS).toBe('-2°51′45″');
  });

  it('契约 missing 字段：三值齐全时返回补全的第四值（锥度 C）', () => {
    const r = taperCalc({ big: 32, small: 27, length: 50 });
    expect(r.missing).toBe(r.taperC);
  });

  it('缺值 / 非正锥长：抛 PANIC（三值缺一不可解）', () => {
    expect(() => taperCalc({ big: 32, small: 27 })).toThrowError(/PANIC/);
    expect(() => taperCalc({ big: 32, length: 50 })).toThrowError(/PANIC/);
    expect(() => taperCalc({ big: 32, small: 27, length: 0 })).toThrowError(/PANIC/);
  });
});

describe('莫氏接口桩（数据表归 W3-C5，本卡不查表）', () => {
  it('findMorse 按 fixtures 行可调用且不崩', () => {
    const row = findMorse(morse as MorseRow[], 4);
    expect(row.number).toBe(4);
    expect(row.taper).toBe('1:19.254');
    expect(row.halfAngleDMS).toBe('1°29′16″');
  });
});

/**
 * W6-C4 · 锥度反推（WAVE-PLAN-V2 §1 / §4 黄金用例；G0-I4 未舍入路径）。
 * 期望值独立代入：D = d + C·L；halfDiff = (D−d)/2；α/2 = arctan(C/2)。
 */
describe('taperReverse（锥比 + 恰两值 → 第三值）', () => {
  it('MT4 反推大端：{taperC:1/19.254, small:30, length:50} → big=32.596863→32.597', () => {
    // C = 1/19.254 = 0.05193726；D = 30 + 50/19.254 = 32.59686299
    // halfDiff = (D−30)/2 = 1.29843149（未舍入路径）；α/2 = arctan(C/2) = 1.4875586° → 1°29′15″
    const r = taperReverse({ taperC: 1 / 19.254, small: 30, length: 50 });
    expect(r.solved).toBe('big');
    expect(r.taperC).toBeCloseTo(1 / 19.254, 12);
    expect(r.missing).toBeCloseTo(32.596863, 6);
    expect(Number(r.missing.toFixed(3))).toBe(32.597);
    // G0-I4 钉路径：halfDiffMM 必须由未舍入 missing 直接算，不能先舍入
    expect(r.halfDiffMM).toBe((r.missing - 30) / 2);
    expect(r.halfDiffMM).toBeCloseTo(1.298431, 5);
    expect(Number(r.halfDiffMM.toFixed(3))).toBe(1.298);
    expect(r.halfAngleDeg).toBeCloseTo(1.4875586, 6);
    expect(r.halfAngleDMS).toBe('1°29′15″');
    // 半角与莫氏表 number=4 行一致（GB/T 1443-2016）
    expect(dmsToDeg(r.halfAngleDMS)).toBeCloseTo(1.4875, 3);
  });

  it('反推锥长：{taperC:1/20, big:32, small:30} → length=(32−30)/(1/20)=40（整锚）', () => {
    const r = taperReverse({ taperC: 1 / 20, big: 32, small: 30 });
    expect(r.solved).toBe('length');
    expect(r.missing).toBe(40);
    expect(r.halfDiffMM).toBe(1);
    expect(r.halfAngleDMS).toBe('1°25′56″');
  });

  it('反推小端：{taperC:0.1, big:32, length:50} → small=32−0.1×50=27', () => {
    const r = taperReverse({ taperC: 0.1, big: 32, length: 50 });
    expect(r.solved).toBe('small');
    expect(r.missing).toBeCloseTo(27, 12);
    expect(r.halfDiffMM).toBeCloseTo(2.5, 12);
    expect(r.halfAngleDMS).toBe('2°51′45″');
  });

  it('非法输入：taperC≤0 / 给值 1 或 3 个 → 抛错（文案含「恰两值」）', () => {
    expect(() => taperReverse({ taperC: 0, big: 32, small: 30 })).toThrow(/恰两值/);
    expect(() => taperReverse({ taperC: -0.1, big: 32, small: 30 })).toThrow(/恰两值/);
    expect(() => taperReverse({ taperC: 1 / 20, big: 32 })).toThrow(/恰两值/);
    expect(() =>
      taperReverse({ taperC: 1 / 19.254, big: 32, small: 30, length: 50 }),
    ).toThrow(/恰两值/);
    expect(() => taperReverse({ taperC: Number.NaN, big: 32, small: 30 })).toThrow(/恰两值/);
  });

  it('尺寸矛盾（大端≤小端）反推锥长非正 → 抛错、不臆造', () => {
    expect(() => taperReverse({ taperC: 0.1, big: 27, small: 32 })).toThrow(/非正/);
  });
});
