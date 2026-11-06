/**
 * test/arc-figure-b.test.ts · 参数化图形 b 组六案（AC07–AC12）
 *
 * 双盲对拍：期望值由 WAVE-PLAN-V4.4.md §4 实体表 + arc-cases-b.ts 冻结算式在测试内
 * 独立代入（mapSpec 为测试自实现的 V4.3 §2 映射式；**不从 src 引 makeMap/segView 等
 * 实现算期望**），与 buildArcFigure 输出互证。
 * 数值纪律：每个期望值附算式与来源（§4 行 / arc-cases-b.ts:行 / 冻结例题行），无裸值。
 */
import { describe, expect, it } from 'vitest';
import { buildArcFigure } from '../src/core/arc-figure';

type Fig = ReturnType<typeof buildArcFigure>;
type P2 = { x: number; y: number };

/** V4.3 §2 映射式（冻结契约，测试内独立实现）：
 *  s=min(56/w,27/h)；x0=4+(56−w·s)/2；y0=30.5−(27−h·s)/2；x=x0+(z−zMin)s；y=y0−(r−rMin)s */
function mapSpec(zMin: number, zMax: number, rMin: number, rMax: number) {
  const w = zMax - zMin;
  const h = rMax - rMin;
  const s = Math.min(56 / w, 27 / h);
  const x0 = 4 + (56 - w * s) / 2;
  const y0 = 30.5 - (27 - h * s) / 2;
  return { s, x: (z: number) => x0 + (z - zMin) * s, y: (r: number) => y0 - (r - rMin) * s };
}

/** 视图向量反算工件 (z,r) 方向：映射为相似变换 Δz=Δx/s、Δr=−Δy/s（r 上正、屏 y 下正） */
function wpVec(from: P2, to: P2, s: number): { z: number; r: number } {
  return { z: (to.x - from.x) / s, r: -(to.y - from.y) / s };
}

const arcStart = (fig: Fig): P2 => ({ x: fig.arcs[0]!.x1, y: fig.arcs[0]!.y1 });
const centerOf = (fig: Fig): P2 => fig.centerDots[0]!;
const dist = (a: P2, b: P2): number => Math.hypot(a.x - b.x, a.y - b.y);

/** 四分之一弧守恒（§4 末段）：|S−C|=|T−C|=R·s；|S−T|=R√2·s；(S−C)·(T−C)=0 */
function expectQuarter(fig: Fig, R: number): void {
  const C = centerOf(fig);
  const T = fig.point;
  const S = arcStart(fig);
  expect(dist(S, C)).toBeCloseTo(R * fig.scale, 6);
  expect(dist(T, C)).toBeCloseTo(R * fig.scale, 6);
  expect(dist(S, T)).toBeCloseTo(R * Math.SQRT2 * fig.scale, 6);
  expect((S.x - C.x) * (T.x - C.x) + (S.y - C.y) * (T.y - C.y)).toBeCloseTo(0, 8);
}

/** 一般弧守恒（§4 末段）：|S−C|=|T−C|=R·s；弦<直径；按图面逆时针方向的跨角严格 <180°
 *  （arc.ts judgeArcDirection：交叉积正=图面顺时针 G02；本组默认输入均为 G03=逆时针） */
function expectGeneral(fig: Fig, R: number): void {
  const C = centerOf(fig);
  const T = fig.point;
  const S = arcStart(fig);
  expect(dist(S, C)).toBeCloseTo(R * fig.scale, 6);
  expect(dist(T, C)).toBeCloseTo(R * fig.scale, 6);
  expect(dist(S, T)).toBeLessThan(2 * R * fig.scale);
  const a = wpVec(C, S, fig.scale);
  const b = wpVec(C, T, fig.scale);
  const cross = a.z * b.r - a.r * b.z;
  const dot = a.z * b.z + a.r * b.r;
  const TAU = 2 * Math.PI;
  // 两端半径向量的极角 + 逆时针跨角（0..2π）
  const a1 = Math.atan2(a.r, a.z);
  const a2 = Math.atan2(b.r, b.z);
  const ccwSweep = (((a2 - a1) % TAU) + TAU) % TAU;
  expect(ccwSweep).toBeGreaterThan(0);
  expect(ccwSweep).toBeLessThan(Math.PI); // 叉积对应跨角 <180°
  // 叉积/点积的 atan2 主值应等于该跨角（同向且 <180° 时无回绕）
  expect(Math.atan2(cross, dot)).toBeCloseTo(ccwSweep, 6);
  expect(cross).toBeGreaterThan(0); // 逆时针（图面）
}

/* ================================================================== AC07 */

describe('arc-figure-b · AC07 凸圆弧收尾', () => {
  // 默认输入（§4 表）：R=5、dX=30、dZ=−30
  const R = 5;
  const dX = 30;
  const dZ = -30;
  const fig = buildArcFigure('AC07', { R, dX, dZ });
  // bbox（§4 表）：z_left=dZ−2.8R=−44 → T1.z=dZ+R=−25；r∈[0,dX/2]=[0,15]（C 在界内）
  const m = mapSpec(dZ - 2.8 * R, dZ + R, 0, dX / 2);

  it('金锚：默认输入与第二组输入（R6/Ø40/Z−24）坐标独立复算', () => {
    // 默认（§4 / arc-cases-b.ts:71-85，r=X/2）：
    //   C=(dZ+R,dX/2−R)=(−25,10)、T1=(dZ+R,dX/2)=(−25,15)、T2=(dZ,dX/2−R)=(−30,10)
    expect(fig.point.x).toBeCloseTo(m.x(-30), 6); // 橙点 = T2
    expect(fig.point.y).toBeCloseTo(m.y(10), 6);
    expect(centerOf(fig).x).toBeCloseTo(m.x(-25), 6);
    expect(centerOf(fig).y).toBeCloseTo(m.y(10), 6);
    expect(fig.arcs[0]!.x1).toBeCloseTo(m.x(-25), 6); // 弧起 T1
    expect(fig.arcs[0]!.y1).toBeCloseTo(m.y(15), 6);
    expect(fig.arcs[0]!.x2).toBeCloseTo(m.x(-30), 6); // 弧止 T2
    expect(fig.arcs[0]!.y2).toBeCloseTo(m.y(10), 6);
    expect(fig.segs[0]!.x1).toBeCloseTo(m.x(-44), 6); // 圆柱起 (z_left,dX/2)
    expect(fig.segs[0]!.y1).toBeCloseTo(m.y(15), 6);
    expect(fig.segs[1]!.x2).toBeCloseTo(m.x(-30), 6); // 端面末 (dZ,0)
    expect(fig.segs[1]!.y2).toBeCloseTo(m.y(0), 6);
    expect(fig.axis.x1).toBeCloseTo(m.x(-44), 6);
    expect(fig.axis.x2).toBeCloseTo(m.x(-25), 6);
    expect(fig.axis.y1).toBeCloseTo(m.y(0), 6);
    expect(fig.scale).toBeCloseTo(m.s, 9);
    expect(fig.arcs[0]!.sweep).toBe(0); // G03（test/arc-cases-b.test.ts:82）→ 图面逆时针

    // 第二组（非等比缩放，确保形变可见）：R=6、dX=40、dZ=−24
    //   C=(−18,14)、T1=(−18,20)、T2=(−24,14)、z_left=−24−2.8·6=−40.8
    const fig2 = buildArcFigure('AC07', { R: 6, dX: 40, dZ: -24 });
    const m2 = mapSpec(-24 - 2.8 * 6, -24 + 6, 0, 40 / 2);
    expect(fig2.point.x).toBeCloseTo(m2.x(-24), 6);
    expect(fig2.point.y).toBeCloseTo(m2.y(14), 6);
    expect(centerOf(fig2).x).toBeCloseTo(m2.x(-18), 6);
    expect(centerOf(fig2).y).toBeCloseTo(m2.y(14), 6);
    expect(fig2.arcs[0]!.x1).toBeCloseTo(m2.x(-18), 6);
    expect(fig2.arcs[0]!.y1).toBeCloseTo(m2.y(20), 6);
    expect(fig2.segs[0]!.x1).toBeCloseTo(m2.x(-40.8), 6);
    expect(fig2.axis.x2).toBeCloseTo(m2.x(-18), 6);
    expect(fig2.scale).toBeCloseTo(m2.s, 9);
  });

  it('守恒：四分之一弧 |T2−C|=|T1−C|=R·s、|T1−T2|=R√2·s、两端半径向量正交', () => {
    expectQuarter(fig, R);
  });

  it('值标签集逐字：R5 / Ø30 / Z-30（§4 表；Z 为绝对位置 V4.4-02）', () => {
    expect(fig.labels.map((l) => l.text)).toEqual(['R5', 'Ø30', 'Z-30']);
    // R 锚法：mid(T2v,Cv)+3·rotScreen(unit(T2v−Cv))；T2−C 视图向 −x → 偏移 (0,−3)
    const mid = { x: (fig.point.x + centerOf(fig).x) / 2, y: (fig.point.y + centerOf(fig).y) / 2 };
    expect(fig.labels[0]!.x).toBeCloseTo(mid.x, 6);
    expect(fig.labels[0]!.y).toBeCloseTo(mid.y - 3, 6);
    // Ø 锚：圆柱中点上方 −3
    expect(fig.labels[1]!.x).toBeCloseTo(m.x((dZ - 2.8 * R + (dZ + R)) / 2), 6);
    expect(fig.labels[1]!.y).toBeCloseTo(m.y(dX / 2) - 3, 6);
    // Z 锚：(map(dZ), y_axis+3)
    expect(fig.labels[2]!.x).toBeCloseTo(m.x(dZ), 6);
    expect(fig.labels[2]!.y).toBeCloseTo(fig.axis.y1 + 3, 6);
  });

  it('参数响应：第二组输入下 scale/轮廓/标签均变化', () => {
    const fig2 = buildArcFigure('AC07', { R: 6, dX: 40, dZ: -24 });
    expect(fig2.scale).not.toBeCloseTo(fig.scale, 3); // 1.35 vs 1.8
    expect(fig2.arcs[0]!.rx).not.toBeCloseTo(fig.arcs[0]!.rx, 3); // R·s：8.1 vs 9
    expect(JSON.stringify(fig2.segs)).not.toBe(JSON.stringify(fig.segs));
    expect(JSON.stringify(fig2.arcs)).not.toBe(JSON.stringify(fig.arcs));
    expect(fig2.labels.map((l) => l.text)).toEqual(['R6', 'Ø40', 'Z-24']);
  });

  it('异常上抛：dX≤2R 原文直上抛（UI 保上一帧）', () => {
    expect(() => buildArcFigure('AC07', { R: 5, dX: 10, dZ: 0 })).toThrow(
      /AC07: dX 必须大于 2R/,
    );
  });
});

/* ================================================================== AC08 */

describe('arc-figure-b · AC08 端面切弧', () => {
  // 默认输入（§4 表）：R=6、dZ=−4
  const R = 6;
  const dZ = -4;
  const fig = buildArcFigure('AC08', { R, dZ });
  // §4：r_t=√(|dZ|(2R−|dZ|))=√(4·8)=√32；C=(sign(dZ)·R, r_t)=(−6,√32)
  const rT = Math.sqrt(Math.abs(dZ) * (2 * R - Math.abs(dZ)));
  // bbox：轮廓 z∈[dZ,0]=[−4,0]、圆心 C.z=−6 计入 bbox（V4.3 §2 圆心点）→ z∈[−6,0]；
  //       r∈[0, r_t+1.9R]（面顶 dZ+1.9R 式）
  const m = mapSpec(
    Math.min(0, dZ, Math.sign(dZ) * R),
    Math.max(0, dZ, Math.sign(dZ) * R),
    0,
    rT + 1.9 * R,
  );

  it('金锚：默认输入与第二组输入（dZ=+3 镜像）坐标独立复算', () => {
    // 默认（§4 / arc-cases-b.ts:89-104；test/arc-cases-b.test.ts:101-115 冻结例）：
    //   T=(0,r_t)=(0,√32)、E=(dZ,0)=(−4,0)、C=(−6,√32)、端面顶 (0,r_t+1.9R)
    expect(fig.point.x).toBeCloseTo(m.x(0), 6);
    expect(fig.point.y).toBeCloseTo(m.y(rT), 6);
    expect(centerOf(fig).x).toBeCloseTo(m.x(-6), 6);
    expect(centerOf(fig).y).toBeCloseTo(m.y(rT), 6);
    expect(fig.arcs[0]!.x1).toBeCloseTo(m.x(-4), 6); // 弧起 E
    expect(fig.arcs[0]!.y1).toBeCloseTo(m.y(0), 6);
    expect(fig.arcs[0]!.x2).toBeCloseTo(m.x(0), 6); // 弧止 T
    expect(fig.arcs[0]!.y2).toBeCloseTo(m.y(rT), 6);
    expect(fig.segs[0]!.x1).toBeCloseTo(m.x(0), 6); // 端面 z=0
    expect(fig.segs[0]!.y1).toBeCloseTo(m.y(0), 6);
    expect(fig.segs[0]!.y2).toBeCloseTo(m.y(rT + 1.9 * R), 6);
    expect(fig.axis.x1).toBeCloseTo(m.x(dZ), 6); // 轴线=(dZ,0)→(0,0)
    expect(fig.axis.x2).toBeCloseTo(m.x(0), 6);
    expect(fig.scale).toBeCloseTo(m.s, 9);
    expect(fig.arcs[0]!.sweep).toBe(0); // G03（test/arc-cases-b.test.ts:111）→ 图面逆时针

    // 第二组（test/arc-cases-b.test.ts:116-129 冻结例）：R=6、dZ=+3
    //   r_t=√(3·9)=√27、C=(+6,√27)、E=(3,0)、T=(0,√27)
    const dZ2 = 3;
    const rT2 = Math.sqrt(Math.abs(dZ2) * (2 * R - Math.abs(dZ2)));
    const fig2 = buildArcFigure('AC08', { R, dZ: dZ2 });
    const m2 = mapSpec(
      Math.min(0, dZ2, Math.sign(dZ2) * R),
      Math.max(0, dZ2, Math.sign(dZ2) * R),
      0,
      rT2 + 1.9 * R,
    );
    expect(fig2.point.x).toBeCloseTo(m2.x(0), 6);
    expect(fig2.point.y).toBeCloseTo(m2.y(rT2), 6);
    expect(centerOf(fig2).x).toBeCloseTo(m2.x(6), 6);
    expect(centerOf(fig2).y).toBeCloseTo(m2.y(rT2), 6);
    expect(fig2.arcs[0]!.x1).toBeCloseTo(m2.x(3), 6);
    expect(fig2.arcs[0]!.y1).toBeCloseTo(m2.y(0), 6);
    expect(fig2.arcs[0]!.sweep).toBe(1); // G02（test/arc-cases-b.test.ts:122）→ 图面顺时针
    expect(fig2.scale).toBeCloseTo(m2.s, 9);
  });

  it('守恒：一般弧 |T−C|=|E−C|=R·s、弦<直径（跨角<180°）、E→T 逆时针', () => {
    expectGeneral(fig, R);
  });

  it('值标签集逐字：R6 / dZ=-4（§4 表；多字符键等号 V4.4-02）', () => {
    expect(fig.labels.map((l) => l.text)).toEqual(['R6', 'dZ=-4']);
    expect(fig.labels[1]!.x).toBeCloseTo(m.x(dZ), 6);
    expect(fig.labels[1]!.y).toBeCloseTo(fig.axis.y1 + 3, 6);
  });

  it('参数响应：dZ=−4→+3 镜像且标签随值', () => {
    const fig2 = buildArcFigure('AC08', { R, dZ: 3 });
    expect(fig2.arcs[0]!.sweep).not.toBe(fig.arcs[0]!.sweep); // G03→G02
    expect(JSON.stringify(fig2.segs)).not.toBe(JSON.stringify(fig.segs));
    expect(fig2.labels.map((l) => l.text)).toEqual(['R6', 'dZ=3']);
  });

  it('半圆边界：|dZ|→2R⁻ 不抛、弦≈直径、跨角→180°⁻（§5 边界例）', () => {
    const dZb = -(2 * R - 1e-6); // solver 允许 (0,2R]；取 2R⁻ 极限
    const fb = buildArcFigure('AC08', { R, dZ: dZb });
    const C = centerOf(fb);
    const S = arcStart(fb);
    // 弦=|E−T|=√(dZ²+r_t²)≈2R（r_t=√((2R−ε)ε)）
    expect(Math.abs(dist(S, fb.point) - 2 * R * fb.scale)).toBeLessThan(1e-3);
    const a = wpVec(C, S, fb.scale);
    const b = wpVec(C, fb.point, fb.scale);
    const span = Math.atan2(a.z * b.r - a.r * b.z, a.z * b.z + a.r * b.r);
    expect(span).toBeGreaterThan(3.14); // 逼近 180°
    expect(span).toBeLessThan(Math.PI); // 严格 <180°
    // fmtFigureValue 3 位归整：−11.999999 → "-12"
    expect(fb.labels.map((l) => l.text)).toEqual(['R6', 'dZ=-12']);
  });

  it('异常上抛：|dZ|>2R 原文直上抛', () => {
    expect(() => buildArcFigure('AC08', { R: 5, dZ: 11 })).toThrow(
      /AC08: \|dZ\| 必须在 \(0, 2R\] 内/,
    );
  });
});

/* ================================================================== AC09 */

describe('arc-figure-b · AC09 锥面切弧', () => {
  // 默认输入（§4 表）：R=5、angle=30°
  const R = 5;
  const angle = 30;
  const fig = buildArcFigure('AC09', { R, angle });
  // §4：d=R(1+sinα)/cosα=8.660254；C=(R,d)、F=(0,d)、T=(d·cosα,d·sinα)
  const alpha = (angle * Math.PI) / 180;
  const d = (R * (1 + Math.sin(alpha))) / Math.cos(alpha);
  // bbox：face z=0；锥面末端 (d+2.4R)(cosα,sinα)；r 上界=max(面顶 d+1.9R, 锥端 r)
  const coneEndZ = (d + 2.4 * R) * Math.cos(alpha);
  const m = mapSpec(0, coneEndZ, 0, Math.max(d + 1.9 * R, (d + 2.4 * R) * Math.sin(alpha)));

  it('金锚：默认输入与第二组输入（R4/α45°）坐标独立复算', () => {
    // 默认（§4 / arc-cases-b.ts:110-125；test/arc-cases-b.test.ts:131-149）：
    //   F=(0,8.660254)、T=(7.5,4.330127)、C=(5,8.660254)、锥端 (17.892305,9.330127)
    expect(fig.point.x).toBeCloseTo(m.x(d * Math.cos(alpha)), 6);
    expect(fig.point.y).toBeCloseTo(m.y(d * Math.sin(alpha)), 6);
    expect(centerOf(fig).x).toBeCloseTo(m.x(R), 6);
    expect(centerOf(fig).y).toBeCloseTo(m.y(d), 6);
    expect(fig.arcs[0]!.x1).toBeCloseTo(m.x(0), 6); // 弧起 F
    expect(fig.arcs[0]!.y1).toBeCloseTo(m.y(d), 6);
    expect(fig.arcs[0]!.x2).toBeCloseTo(m.x(d * Math.cos(alpha)), 6);
    expect(fig.segs[0]!.y2).toBeCloseTo(m.y(d + 1.9 * R), 6); // 端面顶 d+1.9R
    expect(fig.segs[1]!.x2).toBeCloseTo(m.x(coneEndZ), 6); // 锥面末端
    expect(fig.segs[1]!.y2).toBeCloseTo(m.y((d + 2.4 * R) * Math.sin(alpha)), 6);
    expect(fig.axis.x2).toBeCloseTo(m.x(coneEndZ), 6); // 轴线到锥面末端
    expect(fig.scale).toBeCloseTo(m.s, 9);
    expect(fig.arcs[0]!.sweep).toBe(0); // G03（test/arc-cases-b.test.ts:144）

    // 第二组（test/arc-cases-b.test.ts:150-165）：R=4、α=45°
    //   d=4(1+sin45°)/cos45°=9.656854、C=(4,9.656854)、T=(6.828427,6.828427)、锥端 (13.616652,·)
    const R2 = 4;
    const angle2 = 45;
    const a2 = (angle2 * Math.PI) / 180;
    const d2 = (R2 * (1 + Math.sin(a2))) / Math.cos(a2);
    const fig2 = buildArcFigure('AC09', { R: R2, angle: angle2 });
    const m2 = mapSpec(
      0,
      (d2 + 2.4 * R2) * Math.cos(a2),
      0,
      Math.max(d2 + 1.9 * R2, (d2 + 2.4 * R2) * Math.sin(a2)),
    );
    expect(fig2.point.x).toBeCloseTo(m2.x(d2 * Math.cos(a2)), 6);
    expect(fig2.point.y).toBeCloseTo(m2.y(d2 * Math.sin(a2)), 6);
    expect(centerOf(fig2).x).toBeCloseTo(m2.x(R2), 6);
    expect(centerOf(fig2).y).toBeCloseTo(m2.y(d2), 6);
    expect(fig2.arcs[0]!.x1).toBeCloseTo(m2.x(0), 6);
    expect(fig2.arcs[0]!.y1).toBeCloseTo(m2.y(d2), 6);
    expect(fig2.scale).toBeCloseTo(m2.s, 9);
  });

  it('守恒：一般弧 |T−C|=|F−C|=R·s、弦<直径（跨角<180°）、F→T 逆时针', () => {
    expectGeneral(fig, R);
  });

  it('值标签集逐字：R5 / α30°（§4 表）', () => {
    expect(fig.labels.map((l) => l.text)).toEqual(['R5', 'α30°']);
    // α 锚：锥面段中点 − 2.2·rotScreen(u_view)，u_view=(cosα,−sinα) → rotScreen=(sinα,cosα)
    const tv = { x: m.x(d * Math.cos(alpha)), y: m.y(d * Math.sin(alpha)) };
    const ev = { x: m.x(coneEndZ), y: m.y((d + 2.4 * R) * Math.sin(alpha)) };
    expect(fig.labels[1]!.x).toBeCloseTo((tv.x + ev.x) / 2 - 2.2 * Math.sin(alpha), 6);
    expect(fig.labels[1]!.y).toBeCloseTo((tv.y + ev.y) / 2 - 2.2 * Math.cos(alpha), 6);
  });

  it('参数响应：R/α 第二组输入下 scale/轮廓/标签均变化', () => {
    const fig2 = buildArcFigure('AC09', { R: 4, angle: 45 });
    expect(fig2.scale).not.toBeCloseTo(fig.scale, 3); // 1.5646 vs 1.4868
    expect(JSON.stringify(fig2.segs)).not.toBe(JSON.stringify(fig.segs));
    expect(JSON.stringify(fig2.arcs)).not.toBe(JSON.stringify(fig.arcs));
    expect(fig2.labels.map((l) => l.text)).toEqual(['R4', 'α45°']);
  });

  it('异常上抛：angle=90° 原文直上抛', () => {
    expect(() => buildArcFigure('AC09', { R: 5, angle: 90 })).toThrow(
      /AC09: angle 必须在 \(0, 90\)° 内/,
    );
  });
});

/* ================================================================== AC10 */

describe('arc-figure-b · AC10 圆弧螺纹入口', () => {
  // 默认输入（§4 表）：R=5、lead=3.5
  const R = 5;
  const lead = 3.5;
  const fig = buildArcFigure('AC10', { R, lead });
  // §4：C=(0,0)、T=(0,R)、E=(lead,√(R²−lead²))=(3.5,√12.75)
  const eR = Math.sqrt(R * R - lead * lead);
  // bbox（§4 + §2）：轮廓 z∈[−2.4R,lead]、refCircle(C,R) 四极值 z±R/r±R → z∈[−2.4R,R]、r∈[−R,R]
  const m = mapSpec(-2.4 * R, R, -R, R);

  it('金锚：默认输入与第二组输入（R8/lead4）坐标独立复算', () => {
    // 默认（§4 / arc-cases-b.ts:129-142；test/arc-cases-b.test.ts:167-181）：
    expect(fig.point.x).toBeCloseTo(m.x(0), 6);
    expect(fig.point.y).toBeCloseTo(m.y(R), 6);
    expect(centerOf(fig).x).toBeCloseTo(m.x(0), 6);
    expect(centerOf(fig).y).toBeCloseTo(m.y(0), 6);
    expect(fig.arcs[0]!.x1).toBeCloseTo(m.x(lead), 6); // 弧起 E
    expect(fig.arcs[0]!.y1).toBeCloseTo(m.y(eR), 6);
    expect(fig.arcs[0]!.x2).toBeCloseTo(m.x(0), 6); // 弧止 T
    expect(fig.arcs[0]!.y2).toBeCloseTo(m.y(R), 6);
    expect(fig.segs[0]!.x1).toBeCloseTo(m.x(-2.4 * R), 6); // 圆柱起 (−2.4R,R)
    expect(fig.segs[0]!.y1).toBeCloseTo(m.y(R), 6);
    expect(fig.axis.x1).toBeCloseTo(m.x(-2.4 * R), 6);
    expect(fig.axis.x2).toBeCloseTo(m.x(lead), 6); // 轴线到 lead
    expect(fig.axis.y1).toBeCloseTo(m.y(0), 6);
    // refCircle(C,R) 虚线整圆（§4 参照列）
    expect(fig.refCircles).toHaveLength(1);
    expect(fig.refCircles[0]!.cx).toBeCloseTo(m.x(0), 6);
    expect(fig.refCircles[0]!.cy).toBeCloseTo(m.y(0), 6);
    expect(fig.refCircles[0]!.r).toBeCloseTo(R * m.s, 6);
    expect(fig.scale).toBeCloseTo(m.s, 9);
    expect(fig.arcs[0]!.sweep).toBe(0); // G03（test/arc-cases-b.test.ts:179）

    // 第二组（test/arc-cases-b.test.ts:183-196）：R=8、lead=4
    //   T=(0,8)、E=(4,√48)、bbox z∈[−19.2,8]、r∈[−8,8]
    const R2 = 8;
    const lead2 = 4;
    const fig2 = buildArcFigure('AC10', { R: R2, lead: lead2 });
    const m2 = mapSpec(-2.4 * R2, R2, -R2, R2);
    expect(fig2.point.x).toBeCloseTo(m2.x(0), 6);
    expect(fig2.point.y).toBeCloseTo(m2.y(R2), 6);
    expect(centerOf(fig2).x).toBeCloseTo(m2.x(0), 6);
    expect(fig2.arcs[0]!.x1).toBeCloseTo(m2.x(lead2), 6);
    expect(fig2.arcs[0]!.y1).toBeCloseTo(m2.y(Math.sqrt(R2 * R2 - lead2 * lead2)), 6);
    expect(fig2.refCircles[0]!.r).toBeCloseTo(R2 * m2.s, 6);
    expect(fig2.scale).toBeCloseTo(m2.s, 9);
  });

  it('守恒：一般弧 |T−C|=|E−C|=R·s、弦<直径（跨角<180°）、E→T 逆时针', () => {
    expectGeneral(fig, R);
  });

  it('值标签集逐字：R5 / lead=3.5（§4 表；多字符键等号 V4.4-02）', () => {
    expect(fig.labels.map((l) => l.text)).toEqual(['R5', 'lead=3.5']);
    // R 锚：Cv−(R·s+2.2)·(1,0)
    expect(fig.labels[0]!.x).toBeCloseTo(m.x(0) - (R * m.s + 2.2), 6);
    expect(fig.labels[0]!.y).toBeCloseTo(m.y(0), 6);
    // lead 锚：mid(Tv,Ev)+(0,3.5)
    expect(fig.labels[1]!.x).toBeCloseTo((m.x(0) + m.x(lead)) / 2, 6);
    expect(fig.labels[1]!.y).toBeCloseTo((m.y(R) + m.y(eR)) / 2 + 3.5, 6);
  });

  it('参数响应：R/lead 第二组输入下弧起位置/标签/scale 均变化', () => {
    const fig2 = buildArcFigure('AC10', { R: 8, lead: 4 });
    expect(fig2.scale).not.toBeCloseTo(fig.scale, 3); // 1.6875 vs 2.7
    expect(fig2.arcs[0]!.x1).not.toBeCloseTo(fig.arcs[0]!.x1, 3); // E 的 lead/R 比例 0.5 vs 0.7
    expect(JSON.stringify(fig2.arcs)).not.toBe(JSON.stringify(fig.arcs));
    expect(fig2.labels.map((l) => l.text)).toEqual(['R8', 'lead=4']);
  });

  it('异常上抛：缺 lead 键原文直上抛（负输入路径）', () => {
    expect(() => buildArcFigure('AC10', { R: 5 })).toThrow(/缺少有效输入 lead/);
  });

  it('异常上抛：lead→R⁻ 极限（lead=R）Solver 拒绝（§5 指定例）', () => {
    expect(() => buildArcFigure('AC10', { R: 5, lead: 5 })).toThrow(/AC10: lead 必须小于 R/);
  });
});

/* ================================================================== AC11 */

describe('arc-figure-b · AC11 球面收尾', () => {
  // 默认输入（§4 表）：R=10
  const R = 10;
  const fig = buildArcFigure('AC11', { R });
  // §4：C=(0,0)、P=(−R,0)、T=(0,R)；bbox：轮廓 z∈[−R,2.4R]、refCircle z±R/r±R → r∈[−R,R]
  const m = mapSpec(-R, 2.4 * R, -R, R);

  it('金锚：默认输入与第二组输入（R6.5）坐标独立复算', () => {
    // 默认（§4 / arc-cases-b.ts:146-149；test/arc-cases-b.test.ts:198-211）：
    expect(fig.point.x).toBeCloseTo(m.x(0), 6);
    expect(fig.point.y).toBeCloseTo(m.y(R), 6);
    expect(centerOf(fig).x).toBeCloseTo(m.x(0), 6);
    expect(centerOf(fig).y).toBeCloseTo(m.y(0), 6);
    expect(fig.arcs[0]!.x1).toBeCloseTo(m.x(-R), 6); // 弧起 P
    expect(fig.arcs[0]!.y1).toBeCloseTo(m.y(0), 6);
    expect(fig.arcs[0]!.x2).toBeCloseTo(m.x(0), 6); // 弧止 T
    expect(fig.arcs[0]!.y2).toBeCloseTo(m.y(R), 6);
    expect(fig.segs[0]!.x1).toBeCloseTo(m.x(0), 6); // 圆柱 (0,R)→(2.4R,R)
    expect(fig.segs[0]!.x2).toBeCloseTo(m.x(2.4 * R), 6);
    expect(fig.segs[0]!.y1).toBeCloseTo(m.y(R), 6);
    expect(fig.axis.x1).toBeCloseTo(m.x(-R), 6);
    expect(fig.axis.x2).toBeCloseTo(m.x(2.4 * R), 6);
    expect(fig.refCircles[0]!.r).toBeCloseTo(R * m.s, 6);
    expect(fig.scale).toBeCloseTo(m.s, 9);
    expect(fig.arcs[0]!.sweep).toBe(1); // G02（test/arc-cases-b.test.ts:209）

    // 第二组（test/arc-cases-b.test.ts:213-225）：R=6.5
    const R2 = 6.5;
    const fig2 = buildArcFigure('AC11', { R: R2 });
    const m2 = mapSpec(-R2, 2.4 * R2, -R2, R2);
    expect(fig2.point.x).toBeCloseTo(m2.x(0), 6);
    expect(fig2.point.y).toBeCloseTo(m2.y(R2), 6);
    expect(fig2.arcs[0]!.x1).toBeCloseTo(m2.x(-R2), 6);
    expect(fig2.arcs[0]!.y1).toBeCloseTo(m2.y(0), 6);
    expect(fig2.segs[0]!.x2).toBeCloseTo(m2.x(2.4 * R2), 6);
    expect(fig2.refCircles[0]!.r).toBeCloseTo(R2 * m2.s, 6);
    expect(fig2.scale).toBeCloseTo(m2.s, 9);
  });

  it('守恒：四分之一弧 |T−C|=|P−C|=R·s、|P−T|=R√2·s、两端半径向量正交', () => {
    expectQuarter(fig, R);
  });

  it('值标签集逐字：R10（§4 表，单标签）', () => {
    expect(fig.labels.map((l) => l.text)).toEqual(['R10']);
    // R 锚：mid(Tv,Cv)+3·rotScreen(unit(Tv−Cv))；T−C=(0,R) → 屏 Δy<0，
    //   unit=(0,−1)，rotScreen=(1,0) → 标签在右侧 +3
    expect(fig.labels[0]!.x).toBeCloseTo(m.x(0) + 3, 6);
    expect(fig.labels[0]!.y).toBeCloseTo((m.y(R) + m.y(0)) / 2, 6);
  });

  it('参数响应：R 变化时 scale/标签变，归一化视图自相似（弦=直径·s 随 R 缩放）', () => {
    const R2 = 6.5;
    const fig2 = buildArcFigure('AC11', { R: R2 });
    expect(fig2.scale).not.toBeCloseTo(fig.scale, 3); // 2.076923 vs 1.35
    expect(JSON.stringify(fig2.labels)).not.toBe(JSON.stringify(fig.labels));
    expect(fig2.labels.map((l) => l.text)).toEqual(['R6.5']);
    // 单参数案：bbox 与 R 成正比 → 视图内坐标恒定（自相似），物理尺寸随 scale 还原
    expect(fig2.arcs[0]!.rx).toBeCloseTo(fig.arcs[0]!.rx, 6); // 均为 13.5
    expect(dist(arcStart(fig), fig.point) / fig.scale).toBeCloseTo(R * Math.SQRT2, 6);
    expect(dist(arcStart(fig2), fig2.point) / fig2.scale).toBeCloseTo(R2 * Math.SQRT2, 6);
  });

  it('异常上抛：R=0 原文直上抛', () => {
    expect(() => buildArcFigure('AC11', { R: 0 })).toThrow(/R 必须为正数/);
  });
});

/* ================================================================== AC12 */

describe('arc-figure-b · AC12 内孔圆弧过渡', () => {
  // 默认输入（§4 表）：R=3、boreD=20
  const R = 3;
  const boreD = 20;
  const fig = buildArcFigure('AC12', { R, boreD });
  // §4：C=(R,boreD/2+R)=(3,13)、T1=(R,boreD/2)=(3,10)、T2=(0,boreD/2+R)=(0,13)
  const zLeft = R - 2.8 * R; // = −5.4（V4.4-04②）
  // bbox：孔壁 z∈[zLeft,R]、弧 z∈[0,R]、底面 z=0；r∈[0,boreD/2+R+1.9R]
  const m = mapSpec(zLeft, R, 0, boreD / 2 + R + 1.9 * R);

  it('金锚：默认输入与第二组输入（R2.5/Ø16）坐标独立复算', () => {
    // 默认（§4 / arc-cases-b.ts:153-163；test/arc-cases-b.test.ts:227-241）：
    expect(fig.point.x).toBeCloseTo(m.x(0), 6);
    expect(fig.point.y).toBeCloseTo(m.y(boreD / 2 + R), 6);
    expect(centerOf(fig).x).toBeCloseTo(m.x(R), 6);
    expect(centerOf(fig).y).toBeCloseTo(m.y(boreD / 2 + R), 6);
    expect(fig.arcs[0]!.x1).toBeCloseTo(m.x(R), 6); // 弧起 T1
    expect(fig.arcs[0]!.y1).toBeCloseTo(m.y(boreD / 2), 6);
    expect(fig.arcs[0]!.x2).toBeCloseTo(m.x(0), 6); // 弧止 T2
    expect(fig.arcs[0]!.y2).toBeCloseTo(m.y(boreD / 2 + R), 6);
    expect(fig.segs[0]!.x1).toBeCloseTo(m.x(zLeft), 6); // 孔壁起 (z_left,boreD/2)
    expect(fig.segs[0]!.y1).toBeCloseTo(m.y(boreD / 2), 6);
    expect(fig.segs[1]!.y2).toBeCloseTo(m.y(boreD / 2 + R + 1.9 * R), 6); // 底面上延 1.9R
    expect(fig.axis.x1).toBeCloseTo(m.x(zLeft), 6); // 轴线=轮廓 z 范围（V4.4-04④）
    expect(fig.axis.x2).toBeCloseTo(m.x(R), 6);
    expect(fig.scale).toBeCloseTo(m.s, 9);
    expect(fig.arcs[0]!.sweep).toBe(1); // G02（test/arc-cases-b.test.ts:239）

    // 第二组（test/arc-cases-b.test.ts:243-255）：R=2.5、boreD=16
    //   C=(2.5,10.5)、T1=(2.5,8)、T2=(0,10.5)、z_left=2.5−2.8·2.5=−4.5；
    //   面顶=boreD/2+R+1.9R=8+2.5+4.75=15.25
    const R2 = 2.5;
    const boreD2 = 16;
    const fig2 = buildArcFigure('AC12', { R: R2, boreD: boreD2 });
    const m2 = mapSpec(R2 - 2.8 * R2, R2, 0, boreD2 / 2 + R2 + 1.9 * R2);
    expect(fig2.point.x).toBeCloseTo(m2.x(0), 6);
    expect(fig2.point.y).toBeCloseTo(m2.y(boreD2 / 2 + R2), 6);
    expect(centerOf(fig2).x).toBeCloseTo(m2.x(R2), 6);
    expect(centerOf(fig2).y).toBeCloseTo(m2.y(boreD2 / 2 + R2), 6);
    expect(fig2.arcs[0]!.x1).toBeCloseTo(m2.x(R2), 6);
    expect(fig2.arcs[0]!.y1).toBeCloseTo(m2.y(boreD2 / 2), 6);
    expect(fig2.segs[1]!.y2).toBeCloseTo(m2.y(boreD2 / 2 + R2 + 1.9 * R2), 6);
    expect(fig2.scale).toBeCloseTo(m2.s, 9);
  });

  it('守恒：四分之一弧 |T2−C|=|T1−C|=R·s、|T1−T2|=R√2·s、两端半径向量正交', () => {
    expectQuarter(fig, R);
  });

  it('值标签集逐字：R3 / Ø20（§4 表）', () => {
    expect(fig.labels.map((l) => l.text)).toEqual(['R3', 'Ø20']);
    // R 锚：mid(T2v,Cv)+3·rotScreen(unit(T2v−Cv))；T2−C 视图向 −x → 偏移 (0,−3)
    const mid = { x: (fig.point.x + centerOf(fig).x) / 2, y: (fig.point.y + centerOf(fig).y) / 2 };
    expect(fig.labels[0]!.x).toBeCloseTo(mid.x, 6);
    expect(fig.labels[0]!.y).toBeCloseTo(mid.y - 3, 6);
    // Ø 锚：(map((z_left+R)/2), map(boreD/2)+3)
    expect(fig.labels[1]!.x).toBeCloseTo(m.x((zLeft + R) / 2), 6);
    expect(fig.labels[1]!.y).toBeCloseTo(m.y(boreD / 2) + 3, 6);
  });

  it('参数响应：R/孔径第二组输入下 scale/轮廓/标签均变化', () => {
    const fig2 = buildArcFigure('AC12', { R: 2.5, boreD: 16 });
    expect(fig2.scale).not.toBeCloseTo(fig.scale, 3); // 1.770492 vs 1.443850
    expect(fig2.arcs[0]!.rx).not.toBeCloseTo(fig.arcs[0]!.rx, 3); // 2.5·s vs 3·s
    expect(JSON.stringify(fig2.segs)).not.toBe(JSON.stringify(fig.segs));
    expect(fig2.labels.map((l) => l.text)).toEqual(['R2.5', 'Ø16']);
  });

  it('异常上抛：缺 boreD 键原文直上抛', () => {
    expect(() => buildArcFigure('AC12', { R: 3 })).toThrow(/缺少有效输入 boreD/);
  });
});
