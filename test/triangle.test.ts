/**
 * triangle.ts SSS 黄金用例（W2-C1）
 * 公式：余弦定理 + 海伦公式（报告附录 B / 设计稿 p12 例题）。
 */
import { describe, it, expect } from 'vitest';
import { solveTriangle } from '../src/core/triangle';

describe('solveTriangle（SSS）', () => {
  it('30/40/50：∠C=90°、∠A=36.87°、面积 600（设计稿 p12 例题）', () => {
    // cos C = (a²+b²−c²)/(2ab) = (30²+40²−50²)/(2×30×40) = 0 → C = 90°
    // cos A = (b²+c²−a²)/(2bc) = (40²+50²−30²)/(2×40×50) = 3200/4000 = 0.8
    //   → A = 36.869897645844° → 6 位小数 36.869898
    // B = 180° − 90° − 36.869897645844° = 53.130102354156° → 6 位小数 53.130102
    // 面积（海伦）：s = (30+40+50)/2 = 60；√(60×30×20×10) = √360000 = 600
    const r = solveTriangle({ a: 30, b: 40, c: 50 });
    expect(r.a).toBe(30);
    expect(r.b).toBe(40);
    expect(r.c).toBe(50);
    expect(r.A).toBeCloseTo(36.869898, 6);
    expect(r.B).toBeCloseTo(53.130102, 6);
    expect(r.C).toBeCloseTo(90, 6);
    expect(r.area).toBeCloseTo(600, 6);
    expect(r.right).toBe(true);
    // 显示层（设计稿 p12）：36.87° / 53.13° / 90.00°
    expect(r.A.toFixed(2)).toBe('36.87');
    expect(r.B.toFixed(2)).toBe('53.13');
    expect(r.C.toFixed(2)).toBe('90.00');
  });

  it('13/14/15：∠A=53.130102°、∠B=59.489763°、∠C=67.380135°、面积 84（自选例 1）', () => {
    // cos A = (b²+c²−a²)/(2bc) = (14²+15²−13²)/(2×14×15) = 252/420 = 0.6
    //   → A = 53.130102354156° → 6 位小数 53.130102
    // cos B = (a²+c²−b²)/(2ac) = (13²+15²−14²)/(2×13×15) = 198/390
    //   → B = 59.489762593884° → 6 位小数 59.489763
    // cos C = (a²+b²−c²)/(2ab) = (13²+14²−15²)/(2×13×14) = 140/364
    //   → C = 67.380135051960° → 6 位小数 67.380135
    // 面积（海伦）：s = 21；√(21×8×7×6) = √7056 = 84
    const r = solveTriangle({ a: 13, b: 14, c: 15 });
    expect(r.A).toBeCloseTo(53.130102, 6);
    expect(r.B).toBeCloseTo(59.489763, 6);
    expect(r.C).toBeCloseTo(67.380135, 6);
    expect(r.area).toBeCloseTo(84, 6);
    expect(r.right).toBe(false);
    expect(r.A.toFixed(2)).toBe('53.13');
    expect(r.B.toFixed(2)).toBe('59.49');
    expect(r.C.toFixed(2)).toBe('67.38');
  });

  it('10/10/10：等边三角形三角均 60°、面积 25√3=43.301270（自选例 2）', () => {
    // cos A = (10²+10²−10²)/(2×10×10) = 100/200 = 0.5 → A = 60°
    // 等边三角形三内角均 60°；面积 = (√3/4)×10² = 25√3 = 43.301270189222
    //   → 6 位小数 43.301270
    const r = solveTriangle({ a: 10, b: 10, c: 10 });
    expect(r.A).toBeCloseTo(60, 6);
    expect(r.B).toBeCloseTo(60, 6);
    expect(r.C).toBeCloseTo(60, 6);
    expect(r.area).toBeCloseTo(43.30127, 6);
    expect(r.right).toBe(false);
    expect(r.A.toFixed(2)).toBe('60.00');
    expect(r.C.toFixed(2)).toBe('60.00');
  });
});
