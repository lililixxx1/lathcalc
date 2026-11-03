/** tolerance.ts 单测（W2-C3 纯公式段）：IT 公差 + 基本偏差 → 上下偏差（不查表） */
import { describe, it, expect } from 'vitest';
import { toleranceCompose } from '../src/core/tolerance';

/**
 * 合成例题（T=0.025；基本偏差取假设输入，本档不引用任何标准表值）：
 * 孔 H（基孔制）：EI=0 → ES=EI+T=+0.025（WAVE-PLAN §4 #4 前半）
 * 轴 h（基轴制）：es=0 → ei=es−T=−0.025
 * 孔 G：EI=+0.010 → ES=+0.010+0.025=+0.035
 * 轴 g：es=−0.010 → ei=−0.010−0.025=−0.035
 * 孔 P：ES=−0.030 → EI=−0.030−0.025=−0.055
 * 轴 k：ei=+0.010 → es=+0.010+0.025=+0.035
 */
describe('toleranceCompose：偏差合成（纯公式段）', () => {
  it('孔 H（基孔制）：EI=0，ES=EI+T=+0.025，T=0.025（WAVE-PLAN §4 #4 前半）', () => {
    const r = toleranceCompose({ nominal: 40, grade: 7, fundamental: 'H' }, 0.025, 0);
    expect(r.lower).toBe(0);
    expect(r.upper).toBe(0.025);
    expect(r.tolerance).toBe(0.025);
    expect(r.upper - r.lower).toBeCloseTo(0.025, 12);
  });

  it('轴 h（基轴制）：es=0，ei=es−T=−0.025，T=0.025', () => {
    const r = toleranceCompose({ nominal: 40, grade: 7, fundamental: 'h' }, 0.025, 0);
    expect(r.upper).toBe(0);
    expect(r.lower).toBe(-0.025);
    expect(r.tolerance).toBe(0.025);
    expect(r.upper - r.lower).toBeCloseTo(0.025, 12);
  });

  it('孔 G（A–H 基本偏差为 EI）：EI=+0.010，ES=EI+T=+0.035', () => {
    const r = toleranceCompose({ nominal: 40, grade: 7, fundamental: 'G' }, 0.025, 0.010);
    expect(r.lower).toBeCloseTo(0.010, 12);
    expect(r.upper).toBeCloseTo(0.035, 12);
    expect(r.tolerance).toBe(0.025);
  });

  it('轴 g（a–h 基本偏差为 es）：es=−0.010，ei=es−T=−0.035', () => {
    const r = toleranceCompose({ nominal: 40, grade: 7, fundamental: 'g' }, 0.025, -0.010);
    expect(r.upper).toBeCloseTo(-0.010, 12);
    expect(r.lower).toBeCloseTo(-0.035, 12);
    expect(r.tolerance).toBe(0.025);
  });

  it('孔 P（K–ZC 基本偏差为 ES）：ES=−0.030，EI=ES−T=−0.055', () => {
    const r = toleranceCompose({ nominal: 40, grade: 7, fundamental: 'P' }, 0.025, -0.030);
    expect(r.upper).toBeCloseTo(-0.030, 12);
    expect(r.lower).toBeCloseTo(-0.055, 12);
    expect(r.tolerance).toBe(0.025);
  });

  it('轴 k（j–zc 基本偏差为 ei）：ei=+0.010，es=ei+T=+0.035', () => {
    const r = toleranceCompose({ nominal: 40, grade: 7, fundamental: 'k' }, 0.025, 0.010);
    expect(r.lower).toBeCloseTo(0.010, 12);
    expect(r.upper).toBeCloseTo(0.035, 12);
    expect(r.tolerance).toBe(0.025);
  });

  it('非法输入：代号 / IT 值 / 基本偏差非法时抛 PANIC', () => {
    expect(() => toleranceCompose({ nominal: 40, grade: 7, fundamental: 'H7' }, 0.025, 0)).toThrowError(/PANIC/);
    expect(() => toleranceCompose({ nominal: 40, grade: 7, fundamental: 'H' }, 0, 0)).toThrowError(/PANIC/);
    expect(() => toleranceCompose({ nominal: 40, grade: 7, fundamental: 'H' }, 0.025, Number.NaN)).toThrowError(/PANIC/);
  });
});
