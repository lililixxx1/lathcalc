/**
 * triangle.ts SSS 黄金用例（W2-C1）
 * 公式：余弦定理 + 海伦公式（报告附录 B / 设计稿 p12 例题）。
 */
import { describe, it, expect } from 'vitest';
import { solveTriangle, solveTriangleBy } from '../src/core/triangle';

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

/**
 * W6-C4 · 多模式解算（WAVE-PLAN-V2 §1 / §4 黄金用例，V2-3 取解规则）。
 * 期望值均为独立代入复算（余弦/正弦定理 + Node 双精度），算式随断言注明。
 */
describe('solveTriangleBy（SSS/SAS/ASA/SSA）', () => {
  it('恰三边 → SSS，结果与 v0.1 solveTriangle 逐位一致', () => {
    const out = solveTriangleBy({ a: 30, b: 40, c: 50 });
    expect(out.mode).toBe('SSS');
    expect(out.solutions).toHaveLength(1);
    expect(out.solutions[0]).toEqual(solveTriangle({ a: 30, b: 40, c: 50 }));
  });

  it('SAS {b:40,c:50,A:36.87} → a=30.000071→30.00（金三角 30/40/50，锚 1）', () => {
    const out = solveTriangleBy({ b: 40, c: 50, A: 36.87 });
    expect(out.mode).toBe('SAS');
    expect(out.solutions).toHaveLength(1);
    const r = out.solutions[0];
    expect(r).toBeDefined();
    if (!r) return;
    // 余弦定理：a = √(b²+c²−2bc·cosA) = √(1600+2500−4000×0.7999989) = 30.000071
    expect(r.a).toBeCloseTo(30.0001, 3);
    expect(r.a.toFixed(2)).toBe('30.00');
    expect(r.A.toFixed(2)).toBe('36.87');
    expect(r.C.toFixed(2)).toBe('90.00');
    expect(r.right).toBe(true);
    // 面积 = ½·b·c·sinA = 0.5×40×50×0.6000014 = 600.001429（与海伦同值）
    expect(r.area).toBeCloseTo(600.0014, 3);
  });

  it('ASA {A:36.87,B:53.13,c:50} → a=30.000071→30.00、b=39.999946→40.00（锚 2）', () => {
    const out = solveTriangleBy({ A: 36.87, B: 53.13, c: 50 });
    expect(out.mode).toBe('ASA');
    expect(out.solutions).toHaveLength(1);
    const r = out.solutions[0];
    expect(r).toBeDefined();
    if (!r) return;
    // C = 180°−36.87°−53.13° = 90°；正弦定理 a = 50×sin36.87°/sin90° = 30.000071
    //   b = 50×sin53.13°/sin90° = 39.999946
    expect(r.a).toBeCloseTo(30.0001, 3);
    expect(r.a.toFixed(2)).toBe('30.00');
    expect(r.b).toBeCloseTo(39.9999, 3);
    expect(r.b.toFixed(2)).toBe('40.00');
    expect(r.C).toBeCloseTo(90, 6);
    expect(r.right).toBe(true);
  });

  it('SSA {a:40,c:50,A:36.87} → 双解，锐角解在前（锚 3，V2-3）', () => {
    const out = solveTriangleBy({ a: 40, c: 50, A: 36.87 });
    expect(out.mode).toBe('SSA');
    expect(out.solutions).toHaveLength(2);
    const [acute, obtuse] = out.solutions;
    expect(acute).toBeDefined();
    expect(obtuse).toBeDefined();
    if (!acute || !obtuse) return;
    // sinC = c·sinA/a = 50×0.6000014/40 = 0.7500018（<1 且 a<c 且 A 锐角 → 双解）
    // 锐角分支：C₁ = asin(0.7500018) = 48.590533°；B₁ = 180°−36.87°−C₁ = 94.539467°
    //   b₁ = a·sinB₁/sinA = 40×0.996866/0.6000014 = 66.457378（显示 66.46）
    expect(acute.C).toBeCloseTo(48.590533, 5);
    expect(acute.B).toBeCloseTo(94.539467, 5);
    expect(acute.b).toBeCloseTo(66.4574, 3);
    expect(acute.b.toFixed(2)).toBe('66.46');
    expect(acute.C).toBeLessThan(90);
    // 钝角分支：C₂ = 180°−C₁ = 131.409467°；B₂ = 180°−36.87°−C₂ = 11.720533°
    //   b₂ = 40×sinB₂/sinA = 13.542514（显示 13.54）
    expect(obtuse.C).toBeCloseTo(131.409467, 5);
    expect(obtuse.B).toBeCloseTo(11.720533, 5);
    expect(obtuse.b).toBeCloseTo(13.5425, 3);
    expect(obtuse.b.toFixed(2)).toBe('13.54');
  });

  it('SSA 边界：A≥90° 且 a≤c → 构不成三角形（否则退化解 B=−14.21°，G0-I1）', () => {
    // sinC = 50×sin120°/45 = 0.962250 < 1，但 A=120° 且 a=45 < c=50 → 无解
    expect(() => solveTriangleBy({ A: 120, a: 45, c: 50 })).toThrow('构不成三角形');
  });

  it('SSA sinC>1 → 构不成三角形（V2-3）', () => {
    // sinC = 50×sin36.87°/20 = 1.500004 > 1
    expect(() => solveTriangleBy({ A: 36.87, a: 20, c: 50 })).toThrow('构不成三角形');
  });

  it('SSA 单解对照：{A:36.87,a:55,c:50} → a>c 且 sinC<1，仅锐角解', () => {
    // sinC = 50×0.6000014/55 = 0.545456 → C = 33.055820°；B = 110.074180°
    const out = solveTriangleBy({ A: 36.87, a: 55, c: 50 });
    expect(out.mode).toBe('SSA');
    expect(out.solutions).toHaveLength(1);
    const r = out.solutions[0];
    expect(r).toBeDefined();
    if (!r) return;
    expect(r.C).toBeCloseTo(33.05582, 4);
    expect(r.B).toBeCloseTo(110.07418, 4);
  });

  it('模式判定错误路径：AAA / 缺值 / AAS / 零值 / 负值 / 多值 → 无法判定解算模式或输入非法', () => {
    const invalid = [
      { A: 60, B: 70, C: 50 }, // AAA：无边长不可定标
      { a: 3, b: 4 }, // 缺值
      { A: 60, B: 70, a: 5 }, // AAS：边为已知角的对边（非 ASA 夹边）
      { a: 0, b: 4, c: 5 }, // 零值
      { a: -1, b: 4, c: 5 }, // 负值
      { a: 3, b: 4, c: 5, A: 36.87 }, // 多值
      { A: 200, b: 4, c: 5 },
    ];
    for (const input of invalid) {
      expect(() => solveTriangleBy(input)).toThrow('无法判定解算模式或输入非法');
    }
  });

  it('SSS 退化（1/2/10）→ 构不成三角形（模式合法但几何无解）', () => {
    expect(() => solveTriangleBy({ a: 1, b: 2, c: 10 })).toThrow('构不成三角形');
  });
});
