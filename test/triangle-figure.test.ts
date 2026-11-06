/**
 * triangle-figure.test.ts · p12 三角示意图参数化（V4.5 / WAVE-PLAN-V4.5 §3·§5）
 *
 * 期望值一律本地独立复算（mapSpec 本文件重实现，公式=计划 §3；不 import 实现侧
 * 映射——G2-V4.3 C-1 教训）。金锚：SSS 30/40/50 精确坐标；SAS/ASA 经 solver 取解
 * 后按公式独立验边；SSA 双解共享底边 + 顶点同射线（屏幕共线）。
 */
import { describe, expect, it } from 'vitest';
import { buildTriangleFigure } from '../src/core/triangle-figure';
import { solveTriangleBy } from '../src/core/triangle';

/* ---------------- 本地独立映射（计划 §3：内框 [16,204]×[16,88] 贴底居中） */

function mapSpec(a: number, b: number, c: number, extra?: { x: number; y: number }[]) {
  const x = (b * b + c * c - a * a) / (2 * c);
  const y = Math.sqrt(b * b - x * x);
  const pts = [{ x: 0, y: 0 }, { x: c, y: 0 }, { x, y }, ...(extra ?? [])];
  const xs = pts.map((p) => p.x);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const h = y;
  const w = xMax - xMin;
  const s = Math.min(188 / w, 72 / h);
  const x0 = 16 + (188 - w * s) / 2;
  const toScreen = (p: { x: number; y: number }) => ({ x: x0 + (p.x - xMin) * s, y: 88 - p.y * s });
  return { s, toScreen, apex: { x, y } };
}

const BASE_Y = 88;

/* ================================================================= SSS */

describe('triangle-figure · SSS 金锚（默认 30/40/50）', () => {
  // 计划 §3：x=32、y=24、s=3、x0=35 → A=(35,88) B=(185,88) C=(131,16)（全精确值）
  const fig = buildTriangleFigure({ a: 30, b: 40, c: 50, A: 36.87, B: 53.13, C: 90, area: 600, right: true });

  it('三边屏幕坐标=独立复算（A→B / B→C / C→A）', () => {
    const m = mapSpec(30, 40, 50);
    const A = m.toScreen({ x: 0, y: 0 });
    const B = m.toScreen({ x: 50, y: 0 });
    const C = m.toScreen(m.apex);
    expect(fig.segs[0]).toEqual({ x1: A.x, y1: A.y, x2: B.x, y2: B.y });
    expect(fig.segs[1]!.x1).toBeCloseTo(B.x, 9);
    expect(fig.segs[1]!.y1).toBeCloseTo(B.y, 9);
    expect(fig.segs[1]!.x2).toBeCloseTo(C.x, 9);
    expect(fig.segs[1]!.y2).toBeCloseTo(C.y, 9);
    expect(fig.segs[2]!.x2).toBeCloseTo(A.x, 9);
    expect(fig.scale).toBeCloseTo(3, 9); // s=min(188/50, 72/24)=3（h 限制维）
  });

  it('守恒：屏幕边长/s = 真实三边（a=BC b=CA c=AB）', () => {
    const d = (s: { x1: number; y1: number; x2: number; y2: number }) =>
      Math.hypot(s.x2 - s.x1, s.y2 - s.y1);
    expect(d(fig.segs[0]!) / fig.scale).toBeCloseTo(50, 9);
    expect(d(fig.segs[1]!) / fig.scale).toBeCloseTo(30, 9);
    expect(d(fig.segs[2]!) / fig.scale).toBeCloseTo(40, 9);
  });

  it('六标签=真值（V4.5-02 空格式：边去尾零 / 角 1 位定点去尾零）', () => {
    expect(fig.labels.map((l) => l.text)).toEqual([
      'a 30', 'b 40', 'c 50', 'A 36.9°', 'B 53.1°', 'C 90°',
    ]);
  });

  it('标签锚位：c 在基线下方 / C 在顶点上方 / 全部界内（V4.5-07）', () => {
    const by = (t: string) => fig.labels.find((l) => l.text.startsWith(t))!;
    expect(by('c').y).toBeGreaterThan(BASE_Y);
    expect(by('C').y).toBeLessThan(16);
    for (const l of fig.labels) {
      expect(l.x).toBeGreaterThan(0);
      expect(l.x).toBeLessThan(220);
      expect(l.y).toBeGreaterThan(0);
      expect(l.y).toBeLessThan(104);
    }
  });

  it('直角方块：C 顶点两段各 7px（V4.5-05）；13/14/15 非直角为空', () => {
    expect(fig.rightMarks).toHaveLength(2);
    for (const mark of fig.rightMarks) {
      expect(Math.hypot(mark.x2 - mark.x1, mark.y2 - mark.y1)).toBeCloseTo(7, 9);
    }
    const obtuse = buildTriangleFigure({ a: 13, b: 14, c: 15, A: 53.13, B: 59.49, C: 67.38, area: 84, right: false });
    expect(obtuse.rightMarks).toHaveLength(0);
  });

  it('参数响应：30/40/50 vs 等边 40/40/40 vs 13/14/15——segs 与标签均变', () => {
    const eq = buildTriangleFigure({ a: 40, b: 40, c: 40, A: 60, B: 60, C: 60, area: 692.82, right: false });
    const other = buildTriangleFigure({ a: 13, b: 14, c: 15, A: 53.13, B: 59.49, C: 67.38, area: 84, right: false });
    expect(JSON.stringify(eq.segs)).not.toBe(JSON.stringify(fig.segs));
    expect(JSON.stringify(other.segs)).not.toBe(JSON.stringify(fig.segs));
    expect(other.labels.map((l) => l.text)).toContain('a 13');
    expect(eq.labels.map((l) => l.text)).toContain('C 60°');
  });
});

/* ===================================================== SAS / ASA（经 solver） */

describe('triangle-figure · SAS / ASA（solver 解 + 公式独立验边）', () => {
  it('SAS b40 c50 A36.87°：a=√(1600+2500−4000·cos36.87°)=30.000071 → 标签 a 30 / C 90°', () => {
    const output = solveTriangleBy({ b: 40, c: 50, A: 36.87 });
    const independent = Math.sqrt(1600 + 2500 - 4000 * Math.cos((36.87 * Math.PI) / 180));
    expect(independent).toBeCloseTo(30.000071, 5); // cos36.87°=0.7999989（I3 勘正值）
    expect(output.solutions[0]!.a).toBeCloseTo(independent, 9);
    const fig = buildTriangleFigure(output.solutions[0]!);
    const texts = fig.labels.map((l) => l.text);
    expect(texts).toContain('a 30'); // fmt 去尾零
    expect(texts).toContain('b 40');
    expect(texts).toContain('c 50');
    expect(texts).toContain('C 90°');
  });

  it('ASA A36.87 B53.13 c50：正弦定理 a≈30.000071、b≈39.999946 → 标签 a 30 / b 40', () => {
    const output = solveTriangleBy({ A: 36.87, B: 53.13, c: 50 });
    const C = 90;
    const a = (50 * Math.sin((36.87 * Math.PI) / 180)) / Math.sin((C * Math.PI) / 180);
    const b = (50 * Math.sin((53.13 * Math.PI) / 180)) / Math.sin((C * Math.PI) / 180);
    expect(output.solutions[0]!.a).toBeCloseTo(a, 9);
    expect(output.solutions[0]!.b).toBeCloseTo(b, 9);
    const fig = buildTriangleFigure(output.solutions[0]!);
    const texts = fig.labels.map((l) => l.text);
    expect(texts).toContain('a 30');
    expect(texts).toContain('b 40');
  });

  it('SAS b40 c50 A60°：a=√2100=45.825757 → 标签 a 45.83（去尾零保留两位）', () => {
    const output = solveTriangleBy({ b: 40, c: 50, A: 60 });
    expect(output.solutions[0]!.a).toBeCloseTo(Math.sqrt(2100), 9);
    const fig = buildTriangleFigure(output.solutions[0]!);
    expect(fig.labels.map((l) => l.text)).toContain('a 45.83');
  });
});

/* ================================================================= SSA */

describe('triangle-figure · SSA 双解叠画（V4.5-04）', () => {
  // ui-p12.test.ts:229-236 冻结输入：解₁ C=48.59°（b=66.457）、解₂ C=131.41°（b=13.543）
  const output = solveTriangleBy({ a: 40, c: 50, A: 36.87 });
  const [s1, s2] = output.solutions;

  it('solver 双解前提成立（锐角解在前）', () => {
    expect(output.solutions).toHaveLength(2);
    expect(s1!.C).toBeCloseTo(48.590533, 4);
    expect(s2!.C).toBeCloseTo(131.409467, 4);
  });

  it('altSegs 三段且底边与主解逐位相同（共享底 c 与 A/B 顶点）', () => {
    const fig = buildTriangleFigure(s1!, s2!);
    expect(fig.altSegs).toHaveLength(3);
    expect(fig.altSegs[0]).toEqual(fig.segs[0]);
    expect(fig.altSegs[1]).not.toEqual(fig.segs[1]); // 顶点 C 各异
  });

  it('两解顶点同射线：A、C₁、C₂ 屏幕三点共线（y/x≡tanA）', () => {
    const fig = buildTriangleFigure(s1!, s2!);
    const A = { x: fig.segs[0]!.x1, y: fig.segs[0]!.y1 };
    const c1 = { x: fig.segs[1]!.x2, y: fig.segs[1]!.y2 };
    const c2 = { x: fig.altSegs[1]!.x2, y: fig.altSegs[1]!.y2 };
    const cross =
      (c1.x - A.x) * (c2.y - A.y) - (c1.y - A.y) * (c2.x - A.x);
    expect(Math.abs(cross)).toBeLessThan(1e-6);
  });

  it('标签取解₁ 真值（B 94.5° / b 66.46）；双解并入同一映射不越界', () => {
    const fig = buildTriangleFigure(s1!, s2!);
    const texts = fig.labels.map((l) => l.text);
    expect(texts).toContain('B 94.5°');
    expect(texts).toContain('b 66.46');
    expect(texts).toContain('a 40');
    for (const s of [...fig.segs, ...fig.altSegs]) {
      expect(s.x1).toBeGreaterThan(0);
      expect(s.x1).toBeLessThan(220);
      expect(s.y1).toBeGreaterThan(0);
      expect(s.y1).toBeLessThan(104);
    }
  });

  it('单解 SSA（a=60 c=50 A=40°：sinC<1 且 a≥c）不画虚线', () => {
    const single = solveTriangleBy({ a: 60, c: 50, A: 40 });
    expect(single.solutions).toHaveLength(1);
    const fig = buildTriangleFigure(single.solutions[0]!);
    expect(fig.altSegs).toHaveLength(0);
  });
});

/* ================================================================= 防御 */

describe('triangle-figure · 防御', () => {
  it('退化三边（1/2/3）直抛——UI 保上一帧（V4.5-06）', () => {
    expect(() =>
      buildTriangleFigure({ a: 1, b: 2, c: 3, A: 0, B: 0, C: 180, area: 0, right: false }),
    ).toThrow(/退化三角形/);
  });
});
