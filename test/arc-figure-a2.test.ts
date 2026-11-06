/**
 * arc-figure-a2.test.ts · 参数化图形 a 组四案（V4.4：AC02/03/04/06）
 *
 * 双盲对拍：期望值由**文件头冻结公式 + WAVE-PLAN-V4.4 §3 实体表**独立代入推导，
 * 映射式 mapSpec 在测试内自实现（同 V4.3 test/arc-figure.test.ts:20-40 规格，
 * 不 import src 的 makeMap/segView 等实现来算期望）；实现侧走 solver + kit 装配，
 * 两条路径互证。数值纪律：期望值全部附算式与来源，无裸值。
 *
 * 来源约定：
 *  - AC02/03 几何：arc-cases-a.ts:148-155 / :170-177；例题 test/arc-cases-a.test.ts:92-176
 *  - AC04 几何：arc-cases-a.ts:187-194；冻结算式 test/arc-cases-a.test.ts:180-226；
 *    伴弧 V4.4-01（WAVE-PLAN-V4.4 §1）
 *  - AC06 几何：arc-cases-a.ts:220-230；例题 test/arc-cases-a.test.ts:271-328
 *  - 显示约定：WAVE-PLAN-V4.4 §1（V4.4-01/02/03/04）+ §2（整圆装配 / bbox）
 */
import { describe, expect, it } from 'vitest';
import { buildArcFigure } from '../src/core/arc-figure';

/** 半径空间点（r = X/2） */
interface RP {
  z: number;
  r: number;
}

/** V4.3/V4.4 §2 映射式（冻结契约，测试独立实现） */
function mapSpec(zMin: number, zMax: number, rMin: number, rMax: number) {
  const w = zMax - zMin;
  const h = rMax - rMin;
  const s = Math.min(56 / w, 27 / h);
  const x0 = 4 + (56 - w * s) / 2;
  const y0 = 30.5 - (27 - h * s) / 2;
  return { s, x: (z: number) => x0 + (z - zMin) * s, y: (r: number) => y0 - (r - rMin) * s };
}

/** 弧采样点（按 kit sampleArc 文档规则独立实现：5 均分点 + 跨度内 cardinal 极值；
 *  仅用于 bbox 复算，不 import 实现） */
function arcSpanPoints(center: RP, radius: number, from: RP, to: RP, cw: boolean): RP[] {
  const TAU = 2 * Math.PI;
  const a1 = Math.atan2(from.r - center.r, from.z - center.z);
  const a2 = Math.atan2(to.r - center.r, to.z - center.z);
  let sweep = a2 - a1;
  if (cw && sweep > 0) sweep -= TAU;
  if (!cw && sweep < 0) sweep += TAU;
  const points: RP[] = [];
  for (let t = 0; t <= 4; t += 1) {
    const a = a1 + (sweep * t) / 4;
    points.push({
      z: center.z + radius * Math.cos(a),
      r: center.r + radius * Math.sin(a),
    });
  }
  const span = Math.abs(sweep);
  for (let k = 0; k < 4; k += 1) {
    const theta = (k * Math.PI) / 2;
    const ahead = (((theta - a1) % TAU) + TAU) % TAU;
    const dist = sweep >= 0 ? ahead : TAU - ahead;
    if (dist > 0 && dist < span) {
      points.push({
        z: center.z + radius * Math.cos(theta),
        r: center.r + radius * Math.sin(theta),
      });
    }
  }
  return points;
}

/** SVG 小弧（large-arc=0）端点参数化反解圆心（F.6.5；测试独立实现）。
 *  用于校验 sweep 旗标与实现弧装配方向一致——若 sweep 反了，反解圆心会落到镜像侧。 */
function svgArcCenter(a: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  rx: number;
  sweep: 0 | 1;
}): { x: number; y: number } {
  const dx = (a.x1 - a.x2) / 2;
  const dy = (a.y1 - a.y2) / 2;
  const d2 = dx * dx + dy * dy;
  const coef = (a.sweep === 0 ? -1 : 1) * Math.sqrt(Math.max(0, (a.rx * a.rx - d2) / d2));
  return { x: coef * dy + (a.x1 + a.x2) / 2, y: coef * -dx + (a.y1 + a.y2) / 2 };
}

/* ------------------------------------------------------------------ AC02 */

describe('arc-figure-a2 · AC02 两圆弧外切', () => {
  // 冻结式（arc-cases-a.ts:148-155）：
  //   C1=(0,0)；L=R1+R2；C2=(dZ, √(L²−dZ²))；e=(C2−C1)/L；T=C1+R1·e；
  //   首弧 S=C1+R1·rot90ccw(e)（rot90ccw(z,r)=(−r,z)）。
  // bbox（§2）：两整圆四极值点并集
  //   z∈[min(−R1, dZ−R2), max(R1, dZ+R2)]，r∈[min(−R1, C2r−R2), max(R1, C2r+R2)]。
  function ac02Geom(R1: number, R2: number, dZ: number) {
    const L = R1 + R2;
    const C2: RP = { z: dZ, r: Math.sqrt(L * L - dZ * dZ) };
    const e: RP = { z: dZ / L, r: C2.r / L };
    return {
      C1: { z: 0, r: 0 } as RP,
      C2,
      T: { z: R1 * e.z, r: R1 * e.r } as RP,
      S: { z: -R1 * e.r, r: R1 * e.z } as RP, // = R1·rot90ccw(e)
    };
  }
  function ac02Map(R1: number, R2: number, dZ: number) {
    const { C2 } = ac02Geom(R1, R2, dZ);
    return mapSpec(
      Math.min(-R1, dZ - R2),
      Math.max(R1, dZ + R2),
      Math.min(-R1, C2.r - R2),
      Math.max(R1, C2.r + R2),
    );
  }

  it('金锚：默认(10,15,15) 与第二组(6,10,8) 的切点/圆心/整圆极点 viewBox 坐标逐位对拍', () => {
    // 第二组 = test/arc-cases-a.test.ts:118-134 冻结例题（8√3 勾股）
    const inputs = [
      { R1: 10, R2: 15, dZ: 15 },
      { R1: 6, R2: 10, dZ: 8 },
    ];
    for (const { R1, R2, dZ } of inputs) {
      const fig = buildArcFigure('AC02', { R1, R2, dZ });
      const { C2, T } = ac02Geom(R1, R2, dZ);
      const m = ac02Map(R1, R2, dZ);

      expect(fig.point.x).toBeCloseTo(m.x(T.z), 5);
      expect(fig.point.y).toBeCloseTo(m.y(T.r), 5);
      expect(fig.centerDots[0]!.x).toBeCloseTo(m.x(0), 5);
      expect(fig.centerDots[0]!.y).toBeCloseTo(m.y(0), 5);
      expect(fig.centerDots[1]!.x).toBeCloseTo(m.x(C2.z), 5);
      expect(fig.centerDots[1]!.y).toBeCloseTo(m.y(C2.r), 5);

      // 整圆1 = arcs[0] L→R + arcs[1] R→L（§2 整圆装配：同 sweep 反向弦拼圆）
      expect(fig.arcs[0]!.x1).toBeCloseTo(m.x(-R1), 5);
      expect(fig.arcs[0]!.y1).toBeCloseTo(m.y(0), 5);
      expect(fig.arcs[0]!.x2).toBeCloseTo(m.x(R1), 5);
      expect(fig.arcs[1]!.x1).toBeCloseTo(m.x(R1), 5);
      expect(fig.arcs[1]!.x2).toBeCloseTo(m.x(-R1), 5);
      // 整圆2
      expect(fig.arcs[2]!.x1).toBeCloseTo(m.x(dZ - R2), 5);
      expect(fig.arcs[2]!.y1).toBeCloseTo(m.y(C2.r), 5);
      expect(fig.arcs[2]!.x2).toBeCloseTo(m.x(dZ + R2), 5);
      expect(fig.arcs[3]!.x1).toBeCloseTo(m.x(dZ + R2), 5);
      expect(fig.arcs[3]!.x2).toBeCloseTo(m.x(dZ - R2), 5);
      // 等比保圆：rx = R·s
      expect(fig.arcs[0]!.rx).toBeCloseTo(R1 * m.s, 5);
      expect(fig.arcs[2]!.rx).toBeCloseTo(R2 * m.s, 5);
      expect(fig.scale).toBeCloseTo(m.s, 9);
    }
  });

  it('守恒：|T−C1|=R1、|T−C2|=R2；首弧 |S−T|=R1√2 且 (S−C1)·(T−C1)=0', () => {
    // 默认 (10,15,15)：e=(15,20)/25=(0.6,0.8)，T=(6,8)，S=10·(−0.8,0.6)=(−8,6)
    const R1 = 10;
    const R2 = 15;
    const dZ = 15;
    const fig = buildArcFigure('AC02', { R1, R2, dZ });
    const { S, T } = ac02Geom(R1, R2, dZ);
    const m = ac02Map(R1, R2, dZ);
    const C1v = fig.centerDots[0]!;
    const C2v = fig.centerDots[1]!;
    const Tv = fig.point;
    const Sv = { x: m.x(S.z), y: m.y(S.r) };

    expect(Math.hypot(Tv.x - C1v.x, Tv.y - C1v.y)).toBeCloseTo(R1 * fig.scale, 5);
    expect(Math.hypot(Tv.x - C2v.x, Tv.y - C2v.y)).toBeCloseTo(R2 * fig.scale, 5);
    expect(Math.hypot(Sv.x - Tv.x, Sv.y - Tv.y)).toBeCloseTo(R1 * Math.SQRT2 * fig.scale, 5);
    expect(
      (Sv.x - C1v.x) * (Tv.x - C1v.x) + (Sv.y - C1v.y) * (Tv.y - C1v.y),
    ).toBeCloseTo(0, 5);
    // 整圆半圆 sweep 取常量 1（§2：180° 弦 cross 退化禁用）
    expect(fig.arcs.map((a) => a.sweep)).toEqual([1, 1, 1, 1]);
    // 橙点即 solver.tangent（T）映射
    expect(Tv.x).toBeCloseTo(m.x(T.z), 5);
  });

  it('值标签集逐字断言（V4.4-02 多字符键加等号）：R1=10 / R2=15 / dZ=15', () => {
    const fig = buildArcFigure('AC02', { R1: 10, R2: 15, dZ: 15 });
    expect(fig.labels.map((l) => l.text)).toEqual(['R1=10', 'R2=15', 'dZ=15']);
    expect(fig.labels.every((l) => l.anchor === 'middle')).toBe(true);
    expect(fig.refDashes).toHaveLength(1); // 连心虚线 C1↔C2
  });

  it('参数响应：第二组输入(6,10,8) 图变（比例/弧坐标/圆心）且标签随值', () => {
    const base = buildArcFigure('AC02', { R1: 10, R2: 15, dZ: 15 });
    const fig2 = buildArcFigure('AC02', { R1: 6, R2: 10, dZ: 8 });
    expect(fig2.scale).not.toBe(base.scale);
    expect(fig2.arcs.map((a) => [a.x1, a.y1, a.x2, a.y2, a.rx])).not.toEqual(
      base.arcs.map((a) => [a.x1, a.y1, a.x2, a.y2, a.rx]),
    );
    expect(fig2.centerDots).not.toEqual(base.centerDots);
    expect(fig2.labels.map((l) => l.text)).toEqual(['R1=6', 'R2=10', 'dZ=8']);
    expect(fig2.arcs).toHaveLength(4); // 装配拓扑不变
  });

  it('整圆装配：4 半圆弧（每圆 2 条）拼圆，四极值点均在 viewBox 界内', () => {
    // 默认 (10,15,15)：C2=(15,20)；极值 z∈[−10,30]、r∈[−10,35]
    const fig = buildArcFigure('AC02', { R1: 10, R2: 15, dZ: 15 });
    const m = ac02Map(10, 15, 15);
    const c2r = Math.sqrt(25 * 25 - 15 * 15); // = 20
    expect(fig.arcs).toHaveLength(4);
    expect(fig.arcs.map((a) => a.sweep)).toEqual([1, 1, 1, 1]);
    // 每圆两极闭环：L→R + R→L
    expect(fig.arcs[0]!.x1).toBeCloseTo(fig.arcs[1]!.x2, 9);
    expect(fig.arcs[0]!.x2).toBeCloseTo(fig.arcs[1]!.x1, 9);
    expect(fig.arcs[2]!.x1).toBeCloseTo(fig.arcs[3]!.x2, 9);
    expect(fig.arcs[2]!.x2).toBeCloseTo(fig.arcs[3]!.x1, 9);
    const extremes: RP[] = [
      { z: -10, r: 0 },
      { z: 10, r: 0 },
      { z: 0, r: -10 },
      { z: 0, r: 10 },
      { z: 15 - 15, r: c2r },
      { z: 15 + 15, r: c2r },
      { z: 15, r: c2r - 15 },
      { z: 15, r: c2r + 15 },
    ];
    for (const p of extremes) {
      expect(m.x(p.z)).toBeGreaterThanOrEqual(0);
      expect(m.x(p.z)).toBeLessThanOrEqual(64);
      expect(m.y(p.r)).toBeGreaterThanOrEqual(0);
      expect(m.y(p.r)).toBeLessThanOrEqual(34);
    }
    // 无轴线案（V4.4-03）：axis 为零长退化段
    expect(fig.axis).toEqual({ x1: 0, y1: 0, x2: 0, y2: 0 });
    // 实体集：双整圆轮廓 + 2 圆心点 + 1 连心虚线；无 segs / refCircles / 虚半径
    expect(fig.segs).toHaveLength(0);
    expect(fig.centerDots).toHaveLength(2);
    expect(fig.refCircles).toHaveLength(0);
    expect(fig.radiusDashes).toHaveLength(0);
  });

  it('异常上抛：R≤0 / dZ 越界 / 缺键（solver 原文，UI 保上一帧）', () => {
    expect(() => buildArcFigure('AC02', { R1: 0, R2: 15, dZ: 15 })).toThrow(
      /AC02: R1,R2 must be > 0/,
    );
    expect(() => buildArcFigure('AC02', { R1: 10, R2: 15, dZ: 30 })).toThrow(
      /AC02: need 0 < dZ < R1\+R2/,
    );
    expect(() => buildArcFigure('AC02', { R1: 10, R2: 15 })).toThrow(
      /missing or non-finite: dZ/,
    );
  });
});

/* ------------------------------------------------------------------ AC03 */

describe('arc-figure-a2 · AC03 两圆弧内切', () => {
  // 冻结式（arc-cases-a.ts:170-177）：
  //   C1=(0,0)；D=R1−R2；C2=(dZ, √(D²−dZ²))；e=(C2−C1)/D；T=C1+R1·e；
  //   首弧 S=C1+R1·rot90ccw(e)。
  // bbox 同 AC02 双整圆四极值点并集。
  function ac03Geom(R1: number, R2: number, dZ: number) {
    const D = R1 - R2;
    const C2: RP = { z: dZ, r: Math.sqrt(D * D - dZ * dZ) };
    const e: RP = { z: dZ / D, r: C2.r / D };
    return {
      C1: { z: 0, r: 0 } as RP,
      C2,
      T: { z: R1 * e.z, r: R1 * e.r } as RP,
      S: { z: -R1 * e.r, r: R1 * e.z } as RP,
    };
  }
  function ac03Map(R1: number, R2: number, dZ: number) {
    const { C2 } = ac03Geom(R1, R2, dZ);
    return mapSpec(
      Math.min(-R1, dZ - R2),
      Math.max(R1, dZ + R2),
      Math.min(-R1, C2.r - R2),
      Math.max(R1, C2.r + R2),
    );
  }

  it('金锚：默认(25,10,9) 与第二组(20,8,6) 的切点/圆心/整圆极点 viewBox 坐标逐位对拍', () => {
    // 第二组 = test/arc-cases-a.test.ts:161-176 冻结例题（6√3 勾股）
    const inputs = [
      { R1: 25, R2: 10, dZ: 9 },
      { R1: 20, R2: 8, dZ: 6 },
    ];
    for (const { R1, R2, dZ } of inputs) {
      const fig = buildArcFigure('AC03', { R1, R2, dZ });
      const { C2, T } = ac03Geom(R1, R2, dZ);
      const m = ac03Map(R1, R2, dZ);

      expect(fig.point.x).toBeCloseTo(m.x(T.z), 5);
      expect(fig.point.y).toBeCloseTo(m.y(T.r), 5);
      expect(fig.centerDots[0]!.x).toBeCloseTo(m.x(0), 5);
      expect(fig.centerDots[0]!.y).toBeCloseTo(m.y(0), 5);
      expect(fig.centerDots[1]!.x).toBeCloseTo(m.x(C2.z), 5);
      expect(fig.centerDots[1]!.y).toBeCloseTo(m.y(C2.r), 5);

      expect(fig.arcs[0]!.x1).toBeCloseTo(m.x(-R1), 5);
      expect(fig.arcs[0]!.x2).toBeCloseTo(m.x(R1), 5);
      expect(fig.arcs[1]!.x1).toBeCloseTo(m.x(R1), 5);
      expect(fig.arcs[1]!.x2).toBeCloseTo(m.x(-R1), 5);
      expect(fig.arcs[2]!.x1).toBeCloseTo(m.x(dZ - R2), 5);
      expect(fig.arcs[2]!.y1).toBeCloseTo(m.y(C2.r), 5);
      expect(fig.arcs[2]!.x2).toBeCloseTo(m.x(dZ + R2), 5);
      expect(fig.arcs[3]!.x1).toBeCloseTo(m.x(dZ + R2), 5);
      expect(fig.arcs[3]!.x2).toBeCloseTo(m.x(dZ - R2), 5);
      expect(fig.arcs[0]!.rx).toBeCloseTo(R1 * m.s, 5);
      expect(fig.arcs[2]!.rx).toBeCloseTo(R2 * m.s, 5);
      expect(fig.scale).toBeCloseTo(m.s, 9);
    }
  });

  it('守恒：内切点 |T−C1|=R1、|T−C2|=R2；首弧 |S−T|=R1√2 且 (S−C1)·(T−C1)=0', () => {
    // 默认 (25,10,9)：D=15，e=(9,12)/15=(0.6,0.8)，T=(15,20)，S=25·(−0.8,0.6)=(−20,15)
    const R1 = 25;
    const R2 = 10;
    const dZ = 9;
    const fig = buildArcFigure('AC03', { R1, R2, dZ });
    const { S } = ac03Geom(R1, R2, dZ);
    const m = ac03Map(R1, R2, dZ);
    const C1v = fig.centerDots[0]!;
    const C2v = fig.centerDots[1]!;
    const Tv = fig.point;
    const Sv = { x: m.x(S.z), y: m.y(S.r) };

    expect(Math.hypot(Tv.x - C1v.x, Tv.y - C1v.y)).toBeCloseTo(R1 * fig.scale, 5);
    expect(Math.hypot(Tv.x - C2v.x, Tv.y - C2v.y)).toBeCloseTo(R2 * fig.scale, 5);
    expect(Math.hypot(Sv.x - Tv.x, Sv.y - Tv.y)).toBeCloseTo(R1 * Math.SQRT2 * fig.scale, 5);
    expect(
      (Sv.x - C1v.x) * (Tv.x - C1v.x) + (Sv.y - C1v.y) * (Tv.y - C1v.y),
    ).toBeCloseTo(0, 5);
    expect(fig.arcs.map((a) => a.sweep)).toEqual([1, 1, 1, 1]);
  });

  it('值标签集逐字断言：R1=25 / R2=10 / dZ=9（R2 置圆2内，A4 仲裁）', () => {
    const fig = buildArcFigure('AC03', { R1: 25, R2: 10, dZ: 9 });
    expect(fig.labels.map((l) => l.text)).toEqual(['R1=25', 'R2=10', 'dZ=9']);
    expect(fig.labels.every((l) => l.anchor === 'middle')).toBe(true);
    expect(fig.refDashes).toHaveLength(1);
  });

  it('参数响应：第二组输入(20,8,6) 图变且标签随值', () => {
    const base = buildArcFigure('AC03', { R1: 25, R2: 10, dZ: 9 });
    const fig2 = buildArcFigure('AC03', { R1: 20, R2: 8, dZ: 6 });
    expect(fig2.scale).not.toBe(base.scale);
    expect(fig2.arcs.map((a) => [a.x1, a.y1, a.x2, a.y2, a.rx])).not.toEqual(
      base.arcs.map((a) => [a.x1, a.y1, a.x2, a.y2, a.rx]),
    );
    expect(fig2.centerDots).not.toEqual(base.centerDots);
    expect(fig2.labels.map((l) => l.text)).toEqual(['R1=20', 'R2=8', 'dZ=6']);
    expect(fig2.arcs).toHaveLength(4);
  });

  it('整圆装配：4 半圆弧拼两圆（圆2 恒在圆1 内），四极值点均在 viewBox 界内', () => {
    // 默认 (25,10,9)：C2=(9,12)；|C1C2|+R2 = 15+10 = 25 = R1（内切约束）
    const fig = buildArcFigure('AC03', { R1: 25, R2: 10, dZ: 9 });
    const m = ac03Map(25, 10, 9);
    const c2r = Math.sqrt(15 * 15 - 9 * 9); // = 12
    expect(fig.arcs).toHaveLength(4);
    expect(fig.arcs.map((a) => a.sweep)).toEqual([1, 1, 1, 1]);
    expect(fig.arcs[0]!.x1).toBeCloseTo(fig.arcs[1]!.x2, 9);
    expect(fig.arcs[0]!.x2).toBeCloseTo(fig.arcs[1]!.x1, 9);
    expect(fig.arcs[2]!.x1).toBeCloseTo(fig.arcs[3]!.x2, 9);
    expect(fig.arcs[2]!.x2).toBeCloseTo(fig.arcs[3]!.x1, 9);
    const extremes: RP[] = [
      { z: -25, r: 0 },
      { z: 25, r: 0 },
      { z: 0, r: -25 },
      { z: 0, r: 25 },
      { z: 9 - 10, r: c2r },
      { z: 9 + 10, r: c2r },
      { z: 9, r: c2r - 10 },
      { z: 9, r: c2r + 10 },
    ];
    for (const p of extremes) {
      expect(m.x(p.z)).toBeGreaterThanOrEqual(0);
      expect(m.x(p.z)).toBeLessThanOrEqual(64);
      expect(m.y(p.r)).toBeGreaterThanOrEqual(0);
      expect(m.y(p.r)).toBeLessThanOrEqual(34);
    }
    expect(fig.axis).toEqual({ x1: 0, y1: 0, x2: 0, y2: 0 });
    // 实体集：双整圆轮廓 + 2 圆心点 + 1 连心虚线；无 segs / refCircles / 虚半径
    expect(fig.segs).toHaveLength(0);
    expect(fig.centerDots).toHaveLength(2);
    expect(fig.refCircles).toHaveLength(0);
    expect(fig.radiusDashes).toHaveLength(0);
  });

  it('异常上抛：R1≤R2 / dZ 越界 / 缺键（solver 原文）', () => {
    expect(() => buildArcFigure('AC03', { R1: 10, R2: 10, dZ: 5 })).toThrow(
      /AC03: need R1 > R2/,
    );
    expect(() => buildArcFigure('AC03', { R1: 25, R2: 10, dZ: 15 })).toThrow(
      /AC03: need 0 < dZ < R1/,
    );
    expect(() => buildArcFigure('AC03', { R1: 25, R2: 10 })).toThrow(
      /missing or non-finite: dZ/,
    );
  });
});

/* ------------------------------------------------------------------ AC04 */

describe('arc-figure-a2 · AC04 圆弧—斜线—圆弧', () => {
  // 冻结算式（arc-cases-a.ts:187-194 + V4.4-01 伴弧）：
  //   u=(cosα,sinα)；n=rot90ccw(u)=(−sinα,cosα)；L=R1+R2；P1=(0,0)；P2=L·u；
  //   C1=P1+R1·n；C2=P2+R2·n；S2=C2−R2·u；S1=C1−R1·u。
  // bbox：两虚线整圆四极值点并集（线/弧/圆心/虚半径均在圆内）。
  function ac04Geom(R1: number, R2: number, angleDeg: number) {
    const a = (angleDeg * Math.PI) / 180;
    const u: RP = { z: Math.cos(a), r: Math.sin(a) };
    const n: RP = { z: -Math.sin(a), r: Math.cos(a) };
    const L = R1 + R2;
    const P1: RP = { z: 0, r: 0 };
    const P2: RP = { z: L * u.z, r: L * u.r };
    const C1: RP = { z: P1.z + R1 * n.z, r: P1.r + R1 * n.r };
    const C2: RP = { z: P2.z + R2 * n.z, r: P2.r + R2 * n.r };
    const S2: RP = { z: C2.z - R2 * u.z, r: C2.r - R2 * u.r };
    const S1: RP = { z: C1.z - R1 * u.z, r: C1.r - R1 * u.r };
    return { u, n, L, P1, P2, C1, C2, S1, S2 };
  }
  function ac04Map(R1: number, R2: number, angleDeg: number) {
    const { C1, C2 } = ac04Geom(R1, R2, angleDeg);
    return mapSpec(
      Math.min(C1.z - R1, C2.z - R2),
      Math.max(C1.z + R1, C2.z + R2),
      Math.min(C1.r - R1, C2.r - R2),
      Math.max(C1.r + R1, C2.r + R2),
    );
  }

  it('金锚：默认(5,3,45°) 与第二组(4,6,30°) 的切点/圆心/弧端点 viewBox 坐标逐位对拍', () => {
    // 第二组 = test/arc-cases-a.test.ts:209-226 冻结例题
    const inputs = [
      { R1: 5, R2: 3, angle: 45 },
      { R1: 4, R2: 6, angle: 30 },
    ];
    for (const { R1, R2, angle } of inputs) {
      const fig = buildArcFigure('AC04', { R1, R2, angle });
      const { P1, P2, C1, C2, S1, S2 } = ac04Geom(R1, R2, angle);
      const m = ac04Map(R1, R2, angle);

      // 橙点 = solver.tangent = P2
      expect(fig.point.x).toBeCloseTo(m.x(P2.z), 5);
      expect(fig.point.y).toBeCloseTo(m.y(P2.r), 5);
      expect(fig.centerDots[0]!.x).toBeCloseTo(m.x(C1.z), 5);
      expect(fig.centerDots[0]!.y).toBeCloseTo(m.y(C1.r), 5);
      expect(fig.centerDots[1]!.x).toBeCloseTo(m.x(C2.z), 5);
      expect(fig.centerDots[1]!.y).toBeCloseTo(m.y(C2.r), 5);

      // 弧1 S1→P1（V4.4-01 伴弧）；弧2 S2→P2（solver 冻结）
      expect(fig.arcs[0]!.x1).toBeCloseTo(m.x(S1.z), 5);
      expect(fig.arcs[0]!.y1).toBeCloseTo(m.y(S1.r), 5);
      expect(fig.arcs[0]!.x2).toBeCloseTo(m.x(P1.z), 5);
      expect(fig.arcs[0]!.y2).toBeCloseTo(m.y(P1.r), 5);
      expect(fig.arcs[1]!.x1).toBeCloseTo(m.x(S2.z), 5);
      expect(fig.arcs[1]!.y1).toBeCloseTo(m.y(S2.r), 5);
      expect(fig.arcs[1]!.x2).toBeCloseTo(m.x(P2.z), 5);
      expect(fig.arcs[1]!.y2).toBeCloseTo(m.y(P2.r), 5);
      expect(fig.arcs[0]!.rx).toBeCloseTo(R1 * m.s, 5);
      expect(fig.arcs[1]!.rx).toBeCloseTo(R2 * m.s, 5);
      expect(fig.scale).toBeCloseTo(m.s, 9);

      // 线段 P1↔P2（L=R1+R2）
      const line = fig.segs[0]!;
      expect(line.x1).toBeCloseTo(m.x(P1.z), 5);
      expect(line.y1).toBeCloseTo(m.y(P1.r), 5);
      expect(line.x2).toBeCloseTo(m.x(P2.z), 5);
      expect(line.y2).toBeCloseTo(m.y(P2.r), 5);
    }
  });

  it('守恒：两弧 |P−C|=R、|S−C|=R、|S−P|=R√2 且 (S−C)·(P−C)=0', () => {
    // 默认 R1=5/R2=3/α45°：弧1 C1=(−5/√2,5/√2)，P1=(0,0)，S1=(−5√2,0)
    const fig = buildArcFigure('AC04', { R1: 5, R2: 3, angle: 45 });
    const arc1 = fig.arcs[0]!;
    const arc2 = fig.arcs[1]!;
    const C1 = fig.centerDots[0]!;
    const C2 = fig.centerDots[1]!;
    const P1 = { x: arc1.x2, y: arc1.y2 };
    const S1 = { x: arc1.x1, y: arc1.y1 };
    const P2 = fig.point;
    const S2 = { x: arc2.x1, y: arc2.y1 };
    const s = fig.scale;

    expect(Math.hypot(P1.x - C1.x, P1.y - C1.y)).toBeCloseTo(5 * s, 5);
    expect(Math.hypot(S1.x - C1.x, S1.y - C1.y)).toBeCloseTo(5 * s, 5);
    expect(Math.hypot(S1.x - P1.x, S1.y - P1.y)).toBeCloseTo(5 * Math.SQRT2 * s, 5);
    expect((S1.x - C1.x) * (P1.x - C1.x) + (S1.y - C1.y) * (P1.y - C1.y)).toBeCloseTo(0, 5);

    expect(Math.hypot(P2.x - C2.x, P2.y - C2.y)).toBeCloseTo(3 * s, 5);
    expect(Math.hypot(S2.x - C2.x, S2.y - C2.y)).toBeCloseTo(3 * s, 5);
    expect(Math.hypot(S2.x - P2.x, S2.y - P2.y)).toBeCloseTo(3 * Math.SQRT2 * s, 5);
    expect((S2.x - C2.x) * (P2.x - C2.x) + (S2.y - C2.y) * (P2.y - C2.y)).toBeCloseTo(0, 5);

    // 两弧均为逆时针 90°：S−C 角 θ+180° → P−C 角 θ+270°（伴弧与 solver 冻结 G03 同构）
    // → sweep=0
    expect(fig.arcs.map((a) => a.sweep)).toEqual([0, 0]);
    // 方向交叉校验：按 SVG 端点参数化反解圆心，应回到规格圆心（sweep 反了会落镜像侧）
    expect(svgArcCenter(arc1).x).toBeCloseTo(C1.x, 5);
    expect(svgArcCenter(arc1).y).toBeCloseTo(C1.y, 5);
    expect(svgArcCenter(arc2).x).toBeCloseTo(C2.x, 5);
    expect(svgArcCenter(arc2).y).toBeCloseTo(C2.y, 5);
  });

  it('值标签集逐字断言：R1=5 / R2=3 / α45°（α 单字符键不加等号）', () => {
    const fig = buildArcFigure('AC04', { R1: 5, R2: 3, angle: 45 });
    expect(fig.labels.map((l) => l.text)).toEqual(['R1=5', 'R2=3', 'α45°']);
    expect(fig.labels.every((l) => l.anchor === 'middle')).toBe(true);
  });

  it('参数响应：第二组输入(4,6,30°) 图变（弧/圆心/整圆参照）且标签随值', () => {
    const base = buildArcFigure('AC04', { R1: 5, R2: 3, angle: 45 });
    const fig2 = buildArcFigure('AC04', { R1: 4, R2: 6, angle: 30 });
    expect(fig2.scale).not.toBe(base.scale);
    expect(fig2.arcs.map((a) => [a.x1, a.y1, a.x2, a.y2, a.rx])).not.toEqual(
      base.arcs.map((a) => [a.x1, a.y1, a.x2, a.y2, a.rx]),
    );
    expect(fig2.refCircles.map((c) => [c.cx, c.cy, c.r])).not.toEqual(
      base.refCircles.map((c) => [c.cx, c.cy, c.r]),
    );
    expect(fig2.labels.map((l) => l.text)).toEqual(['R1=4', 'R2=6', 'α30°']);
    expect(fig2.arcs).toHaveLength(2);
  });

  it('参照层与方向：两虚线整圆 + 两虚半径 + 线段 P1↔P2；轴零长（V4.4-03）', () => {
    const fig = buildArcFigure('AC04', { R1: 5, R2: 3, angle: 45 });
    expect(fig.segs).toHaveLength(1);
    expect(fig.refCircles).toHaveLength(2);
    expect(fig.radiusDashes).toHaveLength(2);
    expect(fig.arcs).toHaveLength(2);
    expect(fig.refDashes).toHaveLength(0);
    expect(fig.axis).toEqual({ x1: 0, y1: 0, x2: 0, y2: 0 });
    // refCircles 圆心 = centerDots，r = R·s（虚线整圆参照）
    expect(fig.refCircles[0]!.cx).toBeCloseTo(fig.centerDots[0]!.x, 9);
    expect(fig.refCircles[0]!.cy).toBeCloseTo(fig.centerDots[0]!.y, 9);
    expect(fig.refCircles[0]!.r).toBeCloseTo(5 * fig.scale, 9);
    expect(fig.refCircles[1]!.cx).toBeCloseTo(fig.centerDots[1]!.x, 9);
    expect(fig.refCircles[1]!.cy).toBeCloseTo(fig.centerDots[1]!.y, 9);
    expect(fig.refCircles[1]!.r).toBeCloseTo(3 * fig.scale, 9);
    // 虚半径 C1↔P1 / C2↔P2 长度 = R·s
    expect(
      Math.hypot(
        fig.radiusDashes[0]!.x2 - fig.radiusDashes[0]!.x1,
        fig.radiusDashes[0]!.y2 - fig.radiusDashes[0]!.y1,
      ),
    ).toBeCloseTo(5 * fig.scale, 5);
    expect(
      Math.hypot(
        fig.radiusDashes[1]!.x2 - fig.radiusDashes[1]!.x1,
        fig.radiusDashes[1]!.y2 - fig.radiusDashes[1]!.y1,
      ),
    ).toBeCloseTo(3 * fig.scale, 5);
  });

  it('异常上抛：R≤0 / 缺 angle（solver 原文）', () => {
    expect(() => buildArcFigure('AC04', { R1: 0, R2: 3, angle: 45 })).toThrow(
      /AC04: R1,R2 must be > 0/,
    );
    expect(() => buildArcFigure('AC04', { R1: 5, R2: 3 })).toThrow(
      /missing or non-finite: angle/,
    );
  });
});

/* ------------------------------------------------------------------ AC06 */

describe('arc-figure-a2 · AC06 凹圆弧切入', () => {
  // 冻结式（arc-cases-a.ts:220-230）：
  //   S=(0,0)；c=(dZ,dX/2)；cL=|c|；u=c/cL；M=c/2；q=√(R²−cL²/4)；
  //   C=M+q·rot90ccw(u)；E=c；tS=rot90ccw(S−C)/R；tE=rot90ccw(E−C)/R。
  // 显示段（§3 + V4.4-04①）：入口 S−2.4R·tS→S（裁轴）、出口 E→E+2.4R·tE。
  // 轴线 z 范围 = 轮廓实体（segs+arcs）z 范围（V4.4-04④）。
  function ac06Geom(R: number, dX: number, dZ: number) {
    const c: RP = { z: dZ, r: dX / 2 };
    const cL = Math.hypot(c.z, c.r);
    const u: RP = { z: c.z / cL, r: c.r / cL };
    const M: RP = { z: c.z / 2, r: c.r / 2 };
    const q = Math.sqrt(R * R - (cL / 2) * (cL / 2));
    const n: RP = { z: -u.r, r: u.z }; // rot90ccw(u)
    const C: RP = { z: M.z + q * n.z, r: M.r + q * n.r };
    const S: RP = { z: 0, r: 0 };
    const E: RP = { z: c.z, r: c.r };
    const tS: RP = { z: -(S.r - C.r) / R, r: (S.z - C.z) / R };
    const tE: RP = { z: -(E.r - C.r) / R, r: (E.z - C.z) / R };
    const entryStart: RP = { z: S.z - 2.4 * R * tS.z, r: S.r - 2.4 * R * tS.r };
    const exitEnd: RP = { z: E.z + 2.4 * R * tE.z, r: E.r + 2.4 * R * tE.r };
    const span = 2 * Math.asin(cL / (2 * R)); // < π（一般弧验收）
    return { c, cL, u, n, C, S, E, tS, tE, entryStart, exitEnd, span };
  }
  /** 按 §2/V4.4-04④ 复算 bbox 与轴线 z 范围（测试独立实现） */
  function ac06BBox(R: number, dX: number, dZ: number) {
    const g = ac06Geom(R, dX, dZ);
    // A4-R1 裁轴：S.r=0；入口起点 r<0 → 交于 S（退化零长），否则整段保留
    const entryPts: RP[] = g.entryStart.r < 0 ? [g.S] : [g.entryStart, g.S];
    const exitPts: RP[] = [g.E, g.exitEnd];
    const arcPts = arcSpanPoints(g.C, R, g.S, g.E, false);
    const contour = [...entryPts, ...exitPts, ...arcPts];
    const axisZMin = Math.min(...contour.map((p) => p.z));
    const axisZMax = Math.max(...contour.map((p) => p.z));
    const pts: RP[] = [...contour, g.C, { z: axisZMin, r: 0 }, { z: axisZMax, r: 0 }];
    return {
      g,
      axisZMin,
      axisZMax,
      m: mapSpec(
        Math.min(...pts.map((p) => p.z)),
        Math.max(...pts.map((p) => p.z)),
        Math.min(...pts.map((p) => p.r)),
        Math.max(...pts.map((p) => p.r)),
      ),
    };
  }

  it('金锚：默认(10,12,8) 与第二组(13,10,12) 的切点/圆心/弧端点/轴线 viewBox 坐标逐位对拍', () => {
    // 第二组 = test/arc-cases-a.test.ts:303-328 冻结例题（5-12-13 勾股）
    const inputs = [
      { R: 10, dX: 12, dZ: 8 },
      { R: 13, dX: 10, dZ: 12 },
    ];
    for (const { R, dX, dZ } of inputs) {
      const fig = buildArcFigure('AC06', { R, dX, dZ });
      const { g, m, axisZMin, axisZMax } = ac06BBox(R, dX, dZ);

      // 橙点 = solver.tangent = E；圆心灰点 = C
      expect(fig.point.x).toBeCloseTo(m.x(g.E.z), 5);
      expect(fig.point.y).toBeCloseTo(m.y(g.E.r), 5);
      expect(fig.centerDots[0]!.x).toBeCloseTo(m.x(g.C.z), 5);
      expect(fig.centerDots[0]!.y).toBeCloseTo(m.y(g.C.r), 5);
      // 弧 S→E（求解实体不裁）
      expect(fig.arcs[0]!.x1).toBeCloseTo(m.x(g.S.z), 5);
      expect(fig.arcs[0]!.y1).toBeCloseTo(m.y(g.S.r), 5);
      expect(fig.arcs[0]!.x2).toBeCloseTo(m.x(g.E.z), 5);
      expect(fig.arcs[0]!.y2).toBeCloseTo(m.y(g.E.r), 5);
      expect(fig.arcs[0]!.rx).toBeCloseTo(R * m.s, 5);
      // 轴线：r=0，z 范围 = 轮廓实体 z 范围（V4.4-04④）
      expect(fig.axis.y1).toBeCloseTo(m.y(0), 5);
      expect(fig.axis.y2).toBeCloseTo(m.y(0), 5);
      expect(fig.axis.x1).toBeCloseTo(m.x(axisZMin), 5);
      expect(fig.axis.x2).toBeCloseTo(m.x(axisZMax), 5);
      expect(fig.scale).toBeCloseTo(m.s, 9);
      if (g.entryStart.r >= 0) {
        // 入口段完整可见：S−2.4R·tS → S
        const entry = fig.segs[0]!;
        expect(entry.x1).toBeCloseTo(m.x(g.entryStart.z), 5);
        expect(entry.y1).toBeCloseTo(m.y(g.entryStart.r), 5);
        expect(entry.x2).toBeCloseTo(m.x(g.S.z), 5);
        expect(entry.y2).toBeCloseTo(m.y(g.S.r), 5);
      } else {
        // 裁轴后退化/弃段（默认组）：不得保留轴下端点（裁轴专测另见）
        for (const seg of fig.segs) {
          expect(seg.y1).toBeLessThanOrEqual(m.y(0) + 1e-9);
          expect(seg.y2).toBeLessThanOrEqual(m.y(0) + 1e-9);
        }
      }
      // 出口段末端 = E + 2.4R·tE（显示长度 2.4R）
      const exit = fig.segs[fig.segs.length - 1]!;
      expect(exit.x2).toBeCloseTo(m.x(g.exitEnd.z), 5);
      expect(exit.y2).toBeCloseTo(m.y(g.exitEnd.r), 5);
    }
  });

  it('守恒：|E−C|=|S−C|=R；跨角 2·asin(cL/2R)<180° 且与视图形角一致', () => {
    // 默认 (10,12,8)：cL=√(8²+6²)=10，跨角 2·asin(10/20)=60°
    const R = 10;
    const dX = 12;
    const dZ = 8;
    const fig = buildArcFigure('AC06', { R, dX, dZ });
    const { g } = ac06BBox(R, dX, dZ);
    const C = fig.centerDots[0]!;
    const Sv = { x: fig.arcs[0]!.x1, y: fig.arcs[0]!.y1 };
    const Ev = fig.point;
    const s = fig.scale;

    expect(Math.hypot(Ev.x - C.x, Ev.y - C.y)).toBeCloseTo(R * s, 5);
    expect(Math.hypot(Sv.x - C.x, Sv.y - C.y)).toBeCloseTo(R * s, 5);
    expect(g.span).toBeLessThan(Math.PI); // 一般弧 < 180°
    // 视图形角（两半径向量夹角）与解析跨角一致
    const v1 = { x: Sv.x - C.x, y: Sv.y - C.y };
    const v2 = { x: Ev.x - C.x, y: Ev.y - C.y };
    const cosTheta =
      (v1.x * v2.x + v1.y * v2.y) / (Math.hypot(v1.x, v1.y) * Math.hypot(v2.x, v2.y));
    expect(Math.acos(Math.min(1, Math.max(-1, cosTheta)))).toBeCloseTo(g.span, 5);
    expect(fig.arcs[0]!.sweep).toBe(0); // 前刀架 G03 逆时针 → sweep=0
    // 方向交叉校验：SVG 反解圆心 = 规格圆心 C（sweep 反了会落镜像侧）
    expect(svgArcCenter(fig.arcs[0]!).x).toBeCloseTo(C.x, 5);
    expect(svgArcCenter(fig.arcs[0]!).y).toBeCloseTo(C.y, 5);
  });

  it('值标签集逐字断言：R10（单字符不加等号）/ dX=12 / dZ=8（V4.4-02）', () => {
    const fig = buildArcFigure('AC06', { R: 10, dX: 12, dZ: 8 });
    expect(fig.labels.map((l) => l.text)).toEqual(['R10', 'dX=12', 'dZ=8']);
    expect(fig.labels.every((l) => l.anchor === 'middle')).toBe(true);
    expect(fig.radiusDashes).toHaveLength(1); // C↔E 虚半径
  });

  it('参数响应：第二组输入(13,10,12) 图变（段/弧/轴线）且标签随值', () => {
    const base = buildArcFigure('AC06', { R: 10, dX: 12, dZ: 8 });
    const fig2 = buildArcFigure('AC06', { R: 13, dX: 10, dZ: 12 });
    expect(fig2.scale).not.toBe(base.scale);
    expect(fig2.segs.map((s) => [s.x1, s.y1, s.x2, s.y2])).not.toEqual(
      base.segs.map((s) => [s.x1, s.y1, s.x2, s.y2]),
    );
    expect(fig2.arcs.map((a) => [a.x1, a.y1, a.x2, a.y2, a.rx])).not.toEqual(
      base.arcs.map((a) => [a.x1, a.y1, a.x2, a.y2, a.rx]),
    );
    expect([fig2.axis.x1, fig2.axis.x2]).not.toEqual([base.axis.x1, base.axis.x2]);
    expect(fig2.labels.map((l) => l.text)).toEqual(['R13', 'dX=10', 'dZ=12']);
  });

  it('A4-R1 裁轴：非默认 R10/dX16/dZ6 入口起点 r<0，裁后段端点全在轴线 r≥0 侧', () => {
    // 算式：c=(z=6,r=8)，cL=10，u=(0.6,0.8)，M=(3,4)，q=√75=8.660254，
    //   n=(−0.8,0.6)，C=(−3.928203,9.196152)；
    //   tS=rot90ccw(S−C)/R=(9.196152,−3.928203)/10 → entryStart=(−22.0708,−9.4277)
    const R = 10;
    const dX = 16;
    const dZ = 6;
    const fig = buildArcFigure('AC06', { R, dX, dZ });
    const { g } = ac06BBox(R, dX, dZ);
    expect(g.entryStart.r).toBeLessThan(0); // 场景可达：入口起点在轴下
    const axisY = fig.axis.y1;
    expect(fig.axis.y2).toBeCloseTo(axisY, 9);
    for (const seg of fig.segs) {
      // r≥0 ⇔ view y ≤ 轴线 y（等比映射 r 向上）
      expect(seg.y1).toBeLessThanOrEqual(axisY + 1e-9);
      expect(seg.y2).toBeLessThanOrEqual(axisY + 1e-9);
    }
    // 裁后入口段：零长退化（保留）或整段弃（§3「弃段或退化」两合规）
    expect(fig.segs.length).toBeGreaterThanOrEqual(1);
    expect(fig.segs.length).toBeLessThanOrEqual(2);
    // 出口段仍完整显示（2.4R，r>0）
    const exit = fig.segs[fig.segs.length - 1]!;
    expect(exit.y2).toBeLessThan(axisY - 1);
    expect(fig.arcs).toHaveLength(1); // 弧为求解实体不裁
  });

  it('异常上抛：R≤0 / 弦长越界 / 缺键（solver 原文）', () => {
    expect(() => buildArcFigure('AC06', { R: 0, dX: 12, dZ: 8 })).toThrow(
      /AC06: R must be > 0/,
    );
    expect(() => buildArcFigure('AC06', { R: 5, dX: 12, dZ: 8 })).toThrow(
      /AC06: need 0 < \|chord\| < 2R/,
    );
    expect(() => buildArcFigure('AC06', { R: 10, dX: 12 })).toThrow(
      /missing or non-finite: dZ/,
    );
  });
});
