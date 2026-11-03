/** W2-C4 例题与几何不变量回归 · 工况 01–06
 *
 *  坐标：对外 X = 直径（图面朝上）、Z = 线性 mm（图面朝右）；几何不变量一律在
 *  半径空间 (z, r) 内校验，r = X/2（与 arc.ts dist 注释、G0 复算口径一致）。
 *  角度 α 自 +Z 轴起朝 +X 为正；u(α)=(z=cosα, r=sinα)，n=rot90(u)。
 *
 *  每个例题的期望坐标均为手推（勾股 / 相似 / 三角函数），算式写在注释里；
 *  程序输出与手推值对拍容差 ≤1e-9。判向一律以 judgeArcDirection 独立复核。
 *
 *  设计稿 p06 的 mock 切点值几何不可能（|圆心−切点|≠R，DEVIATIONS #5），
 *  本文件任何期望值均不采用该组值。
 */
import { describe, it, expect } from 'vitest';
import type { Vec2 } from '../src/core/types';
import { arcCasesA } from '../src/core/arc-cases-a';
import { judgeArcDirection } from '../src/core/arc';

const EPS = 1e-9;

/** 半径空间点 */
interface RP {
  z: number;
  r: number;
}

const rad = (v: Vec2): RP => ({ z: v.z, r: v.x / 2 });
const dia = (p: RP): Vec2 => ({ x: p.r * 2, z: p.z });
const sub = (a: RP, b: RP): RP => ({ z: a.z - b.z, r: a.r - b.r });
const dot = (a: RP, b: RP): number => a.z * b.z + a.r * b.r;
const len = (a: RP): number => Math.hypot(a.z, a.r);
const rot90 = (a: RP): RP => ({ z: -a.r, r: a.z });

function expectNear(actual: number, expected: number): void {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(EPS);
}

function expectVec(actual: Vec2, expectedX: number, expectedZ: number): void {
  expectNear(actual.x, expectedX);
  expectNear(actual.z, expectedZ);
}

function solver(id: string) {
  const s = arcCasesA.find((c) => c.id === id);
  if (!s) throw new Error(`missing arc case ${id}`);
  return s;
}

describe('AC01 直线—圆弧相切（R, angle, stepD）', () => {
  it('例 1：R5 · α45° · 台阶 X36（切点 P 在 X36/Z0；T3 前刀架 G02）', () => {
    // 手推（半径空间）：
    //   P  = (z=0, r=36/2=18) → X=36, Z=0
    //   C  = P − R·n = (R sin45, 18 − R cos45)
    //      = (5·0.7071067812, 18 − 3.5355339059) = (3.5355339059, 14.4644660941)
    //      → X = 28.9289321881, Z = 3.5355339059
    //   圆弧起点 S = C − R·u = (0, 14.4644660941 − 3.5355339059) = (0, 10.9289321881)
    //   S→P：相对圆心角 225°→135°，顺时针 90° ⇒ 前刀架 G02
    const out = solver('AC01').solve({ R: 5, angle: 45, stepD: 36 });
    expectVec(out.tangent, 36, 0);
    expectVec(out.center, 28.928932188134524, 3.5355339059327378);
    expect(out.direction).toBe('G02');
    expect(out.gcodeLine).toBe('G02 X36.000 Z0.000 R5.0');

    const c = rad(out.center);
    const t = rad(out.tangent);
    // 不变量 ①：|圆心−切点| = R
    expectNear(len(sub(t, c)), 5);
    // 不变量 ②：半径向量 · 直线方向 u(45°) = 0
    expectNear(dot(sub(t, c), { z: Math.SQRT1_2, r: Math.SQRT1_2 }), 0);

    const start = dia({ z: 0, r: 10.928932188134524 });
    expect(out.direction).toBe(judgeArcDirection(out.center, start, out.tangent, false));
  });

  it('例 2：R3 · α30° · 台阶 X20（判向 G02）', () => {
    // 手推（半径空间）：
    //   P = (0, 10) → X=20, Z=0
    //   C = (R sin30, 10 − R cos30) = (1.5, 10 − 2.5980762114)
    //     = (1.5, 7.4019237886) → X = 14.8038475773, Z = 1.5
    const out = solver('AC01').solve({ R: 3, angle: 30, stepD: 20 });
    expectVec(out.tangent, 20, 0);
    expectVec(out.center, 14.803847577293368, 1.5);
    expect(out.direction).toBe('G02');
    expect(out.gcodeLine).toBe('G02 X20.000 Z0.000 R3.0');

    const c = rad(out.center);
    const t = rad(out.tangent);
    expectNear(len(sub(t, c)), 3);
    expectNear(dot(sub(t, c), { z: Math.cos(Math.PI / 6), r: Math.sin(Math.PI / 6) }), 0);
  });
});

describe('AC02 两圆弧外切（R1, R2, dZ）', () => {
  it('例 1：R1=10 · R2=15 · dZ=15（15-20-25 勾股；外切点 X16/Z6）', () => {
    // 手推（半径空间）：C1=(0,0)；|C1−C2| = R1+R2 = 25，轴向差 15 ⇒
    //   C2 = (15, √(25²−15²)=20) → X=40, Z=15
    //   e = (15/25, 20/25) = (0.6, 0.8)
    //   T = C1 + R1·e = (6, 8) → X=16, Z=6；|T−C2| = |(−9,−12)| = 15 = R2
    //   S = C1 + R1·rot90(e) = 10·(−0.8, 0.6) = (−8, 6)
    //   S→T 顺时针 90° ⇒ 前刀架 G02
    const out = solver('AC02').solve({ R1: 10, R2: 15, dZ: 15 });
    expectVec(out.tangent, 16, 6);
    expectVec(out.center, 0, 0);
    expect(out.direction).toBe('G02');
    expect(out.gcodeLine).toBe('G02 X16.000 Z6.000 R10.0');

    const c1 = rad(out.center);
    const t = rad(out.tangent);
    const c2: RP = { z: 15, r: 20 };
    const e: RP = { z: 0.6, r: 0.8 };
    expectNear(len(sub(t, c1)), 10); // |C1−T| = R1
    expectNear(len(sub(t, c2)), 15); // |C2−T| = R2
    expectNear(dot(sub(t, c1), rot90(e)), 0); // 公切线 ⟂ 连心线

    const start = dia({ z: -8, r: 6 });
    expect(out.direction).toBe(judgeArcDirection(out.center, start, out.tangent, false));
  });

  it('例 2：R1=6 · R2=10 · dZ=8（8√3 勾股；切点 X10.392/Z3）', () => {
    // 手推（半径空间）：|C1−C2| = 16，轴向差 8 ⇒ dX = √(16²−8²) = 8√3 = 13.8564064606
    //   e = (0.5, √3/2 = 0.8660254038)
    //   T = 6·e = (3, 5.1961524227) → X = 10.3923048454, Z = 3
    //   |T−C2| = |(−5, −8.6602540378)| = 10 = R2
    const out = solver('AC02').solve({ R1: 6, R2: 10, dZ: 8 });
    expectVec(out.tangent, 10.392304845413264, 3);
    expectVec(out.center, 0, 0);
    expect(out.direction).toBe('G02');
    expect(out.gcodeLine).toBe('G02 X10.392 Z3.000 R6.0');

    const t = rad(out.tangent);
    const c2: RP = { z: 8, r: Math.sqrt(3) * 8 };
    expectNear(len(sub(t, rad(out.center))), 6);
    expectNear(len(sub(t, c2)), 10);
    expectNear(dot(sub(t, rad(out.center)), { z: -Math.sqrt(3) / 2, r: 0.5 }), 0);
  });
});

describe('AC03 两圆弧内切（R1, R2, dZ）', () => {
  it('例 1：R1=25 · R2=10 · dZ=9（9-12-15 与 15-20-25 勾股；内切点 X40/Z15）', () => {
    // 手推（半径空间）：|C1−C2| = R1−R2 = 15，轴向差 9 ⇒ dX = √(15²−9²) = 12
    //   C2 = (z=9, r=12)；e = (0.6, 0.8)
    //   T = C1 + 25·e = (z=15, r=20) → X = 2×20 = 40, Z = 15
    //   |T−C2| = |(6,8)| = 10 = R2
    //   S = 25·rot90(e) = (z=−20, r=15)；S→T 顺时针 90° ⇒ 前刀架 G02
    const out = solver('AC03').solve({ R1: 25, R2: 10, dZ: 9 });
    expectVec(out.tangent, 40, 15);
    expectVec(out.center, 0, 0);
    expect(out.direction).toBe('G02');
    expect(out.gcodeLine).toBe('G02 X40.000 Z15.000 R25.0');

    const c1 = rad(out.center);
    const t = rad(out.tangent);
    const c2: RP = { z: 9, r: 12 };
    expectNear(len(sub(t, c1)), 25);
    expectNear(len(sub(t, c2)), 10);
    expectNear(dot(sub(t, c1), rot90({ z: 0.6, r: 0.8 })), 0);

    const start = dia({ z: -20, r: 15 });
    expect(out.direction).toBe(judgeArcDirection(out.center, start, out.tangent, false));
  });

  it('例 2：R1=20 · R2=8 · dZ=6（6√3 勾股；切点 X34.641/Z10）', () => {
    // 手推（半径空间）：|C1−C2| = 12，轴向差 6 ⇒ dX = √(12²−6²) = 6√3 = 10.3923048454
    //   e = (0.5, √3/2)；T = 20·e = (10, 17.3205080757) → X = 34.6410161514, Z = 10
    //   |T−C2| = |(4, 6.9282032303)| = 8 = R2
    const out = solver('AC03').solve({ R1: 20, R2: 8, dZ: 6 });
    expectVec(out.tangent, 34.64101615137755, 10);
    expectVec(out.center, 0, 0);
    expect(out.direction).toBe('G02');
    expect(out.gcodeLine).toBe('G02 X34.641 Z10.000 R20.0');

    const t = rad(out.tangent);
    const c2: RP = { z: 6, r: 6 * Math.sqrt(3) };
    expectNear(len(sub(t, rad(out.center))), 20);
    expectNear(len(sub(t, c2)), 8);
    expectNear(dot(sub(t, rad(out.center)), { z: -Math.sqrt(3) / 2, r: 0.5 }), 0);
  });
});

describe('AC04 圆弧—斜线—圆弧（R1, R2, angle）', () => {
  it('例 1：R1=5 · R2=3 · α45°（斜线段长 L=R1+R2=8；输出 R2 弧切点 X11.314/Z5.657；G03）', () => {
    // 手推（半径空间，冻结约定 L=R1+R2=8）：
    //   u = (0.7071067812, 0.7071067812)，n = (−0.7071067812, 0.7071067812)
    //   P2 = L·u = (z=5.6568542495, r=5.6568542495) → X = 11.3137084990, Z = 5.6568542495
    //   C2 = P2 + R2·n = (5.6568542495 − 2.1213203436, 5.6568542495 + 2.1213203436)
    //      = (z=3.5355339059, r=7.7781745931) → X = 15.5563491861, Z = 3.5355339059
    //   S2 = C2 − R2·u = (z=1.4142135624, r=5.6568542495)
    //   S2→P2 逆时针 90°，P2 处切线 = +u ⇒ 前刀架 G03
    const out = solver('AC04').solve({ R1: 5, R2: 3, angle: 45 });
    expectVec(out.tangent, 11.313708498984761, 5.656854249492381);
    expectVec(out.center, 15.556349186104045, 3.535533905932738);
    expect(out.direction).toBe('G03');
    expect(out.gcodeLine).toBe('G03 X11.314 Z5.657 R3.0');

    const c2 = rad(out.center);
    const t = rad(out.tangent);
    const u: RP = { z: Math.SQRT1_2, r: Math.SQRT1_2 };
    expectNear(len(sub(t, c2)), 3);
    expectNear(dot(sub(t, c2), u), 0); // 半径 ⟂ 斜线

    // 第一段弧同样与斜线相切：C1 = P1 + R1·n，|C1−P1| = 5
    const c1: RP = { z: -5 * Math.SQRT1_2, r: 5 * Math.SQRT1_2 };
    expectNear(len(c1), 5);
    expectNear(dot(c1, u), 0);

    const start = dia({ z: 1.414213562373095, r: 5.656854249492381 });
    expect(out.direction).toBe(judgeArcDirection(out.center, start, out.tangent, false));
  });

  it('例 2：R1=4 · R2=6 · α30°（L=10；切点 X10/Z8.660；G03）', () => {
    // 手推（半径空间，L=R1+R2=10）：
    //   u = (cos30, sin30) = (0.8660254038, 0.5)；n = (−0.5, 0.8660254038)
    //   P2 = 10·u = (z=8.6602540378, r=5) → X = 10, Z = 8.6602540378
    //   C2 = P2 + 6·n = (z=5.6602540378, r=10.1961524227) → X = 20.3923048454, Z = 5.6602540378
    //   S2 = C2 − 6·u = (z=0.4641016151, r=7.1961524227) → X = 14.3923048454, Z = 0.4641016151
    const out = solver('AC04').solve({ R1: 4, R2: 6, angle: 30 });
    expectVec(out.tangent, 10, 8.660254037844386);
    expectVec(out.center, 20.392304845413264, 5.660254037844386);
    expect(out.direction).toBe('G03');
    expect(out.gcodeLine).toBe('G03 X10.000 Z8.660 R6.0');

    const c2 = rad(out.center);
    const t = rad(out.tangent);
    const u: RP = { z: Math.cos(Math.PI / 6), r: Math.sin(Math.PI / 6) };
    expectNear(len(sub(t, c2)), 6);
    expectNear(dot(sub(t, c2), u), 0);
  });
});

describe('AC05 台阶倒圆（R, stepX, stepZ）', () => {
  it('例 1：R4 · 台阶 X20/Z−10（圆角心 X28/Z−14，切点 X28/Z−10；G03）', () => {
    // 手推（半径空间）：尖角 (r=10, z=−10)；圆心 C=(r=10+4, z=−10−4)=(14,−14)
    //   台阶面切点 P=(r=14, z=−10) → X=28, Z=−10
    //   外圆切点 Q=(r=10, z=−14) → X=20, Z=−14
    //   Q→P：Q−C=(0,−4)（下）→ P−C=(4,0)（右），逆时针 90° ⇒ 前刀架 G03
    const out = solver('AC05').solve({ R: 4, stepX: 20, stepZ: -10 });
    expectVec(out.tangent, 28, -10);
    expectVec(out.center, 28, -14);
    expect(out.direction).toBe('G03');
    expect(out.gcodeLine).toBe('G03 X28.000 Z-10.000 R4.0');

    const c = rad(out.center);
    const t = rad(out.tangent);
    const q: RP = { z: -14, r: 10 };
    expectNear(len(sub(t, c)), 4); // |C−P| = R
    expectNear(len(sub(q, c)), 4); // |C−Q| = R
    expectNear(dot(sub(t, c), { z: 0, r: 1 }), 0); // 半径 ⟂ 台阶面（X 向）
    expectNear(dot(sub(q, c), { z: 1, r: 0 }), 0); // 半径 ⟂ 外圆（Z 向）

    expect(out.direction).toBe(judgeArcDirection(out.center, dia(q), out.tangent, false));
  });

  it('例 2：R6 · 台阶 X40/Z−25（圆角心 X52/Z−31，切点 X52/Z−25；G03）', () => {
    // 手推（半径空间）：尖角 (r=20, z=−25)；C=(r=20+6, z=−25−6)=(26,−31)
    //   P=(r=26, z=−25) → X=52, Z=−25；Q=(r=20, z=−31) → X=40, Z=−31
    const out = solver('AC05').solve({ R: 6, stepX: 40, stepZ: -25 });
    expectVec(out.tangent, 52, -25);
    expectVec(out.center, 52, -31);
    expect(out.direction).toBe('G03');
    expect(out.gcodeLine).toBe('G03 X52.000 Z-25.000 R6.0');

    const c = rad(out.center);
    const t = rad(out.tangent);
    const q: RP = { z: -31, r: 20 };
    expectNear(len(sub(t, c)), 6);
    expectNear(len(sub(q, c)), 6);
    expectNear(dot(sub(t, c), { z: 0, r: 1 }), 0);
    expectNear(dot(sub(q, c), { z: 1, r: 0 }), 0);
  });
});

describe('AC06 凹圆弧切入（R, dX, dZ）', () => {
  it('例 1：R10 · dX12 · dZ8（弦 6-8-10；圆心 X19.856/Z−1.196，切点 X12/Z8；G03）', () => {
    // 手推（半径空间）：S=(0,0)；弦 c=(z=8, r=12/2=6)，|c|=10
    //   u=(0.8,0.6)；M=(4,3)；n=rot90(u)=(−0.6,0.8)
    //   q=√(10²−5²)=√75=8.6602540378
    //   C=M+q·n=(4−5.1961524227, 3+6.9282032303)=(−1.1961524227, 9.9282032303)
    //     → X=19.8564064606, Z=−1.1961524227
    //   E=S+c=(8,6) → X=12, Z=8；|C−E|=|(9.1961524227, −3.9282032303)|=10
    //   S→E 逆时针（圆心 −83.13°→−23.13°）⇒ 前刀架 G03
    const out = solver('AC06').solve({ R: 10, dX: 12, dZ: 8 });
    expectVec(out.tangent, 12, 8);
    expectVec(out.center, 19.856406460551020, -1.196152422706632);
    expect(out.direction).toBe('G03');
    expect(out.gcodeLine).toBe('G03 X12.000 Z8.000 R10.0');

    const s: RP = { z: 0, r: 0 };
    const e = rad(out.tangent);
    const c = rad(out.center);
    expectNear(len(sub(e, c)), 10);
    expectNear(len(sub(s, c)), 10);
    // 弦切向：u 旋转 θ/2（θ=2·asin(cL/2R)=60°）⇒ 半径 ⟂ 切向
    const half = Math.asin(10 / (2 * 10)); // =30°
    const u: RP = { z: 0.8, r: 0.6 };
    const tangentDir: RP = {
      z: u.z * Math.cos(half) - u.r * Math.sin(half),
      r: u.z * Math.sin(half) + u.r * Math.cos(half),
    };
    expectNear(dot(sub(e, c), tangentDir), 0);

    expect(out.direction).toBe(judgeArcDirection(out.center, dia(s), out.tangent, false));
  });

  it('例 2：R13 · dX10 · dZ12（弦 5-12-13；圆心 X25.785/Z1.670，切点 X10/Z12；G03）', () => {
    // 手推（半径空间）：S=(0,0)；弦 c=(z=12, r=5)，|c|=13
    //   u=(12/13, 5/13)；M=(6, 2.5)；n=(−5/13, 12/13)
    //   q=√(13²−6.5²)=√126.75=11.2583302492
    //   C=M+q·n=(6−4.3301270189, 2.5+10.3923048454)=(1.6698729811, 12.8923048454)
    //     → X=25.7846096908, Z=1.6698729811
    //   E=S+c=(12,5) → X=10, Z=12
    const out = solver('AC06').solve({ R: 13, dX: 10, dZ: 12 });
    expectVec(out.tangent, 10, 12);
    expectVec(out.center, 25.784609690826528, 1.669872981077807);
    expect(out.direction).toBe('G03');
    expect(out.gcodeLine).toBe('G03 X10.000 Z12.000 R13.0');

    const s: RP = { z: 0, r: 0 };
    const e = rad(out.tangent);
    const c = rad(out.center);
    expectNear(len(sub(e, c)), 13);
    expectNear(len(sub(s, c)), 13);
    const half = Math.asin(13 / (2 * 13)); // =30°
    const u: RP = { z: 12 / 13, r: 5 / 13 };
    const tangentDir: RP = {
      z: u.z * Math.cos(half) - u.r * Math.sin(half),
      r: u.z * Math.sin(half) + u.r * Math.cos(half),
    };
    expectNear(dot(sub(e, c), tangentDir), 0);
  });
});

describe('判向覆盖（G02/G03 · 后刀架 · T3）', () => {
  it('G02 与 G03 在前刀架例题中各 ≥1 例', () => {
    const dirs = new Set<string>();
    dirs.add(solver('AC01').solve({ R: 5, angle: 45, stepD: 36 }).direction);
    dirs.add(solver('AC02').solve({ R1: 10, R2: 15, dZ: 15 }).direction);
    dirs.add(solver('AC03').solve({ R1: 25, R2: 10, dZ: 9 }).direction);
    dirs.add(solver('AC04').solve({ R1: 5, R2: 3, angle: 45 }).direction);
    dirs.add(solver('AC05').solve({ R: 4, stepX: 20, stepZ: -10 }).direction);
    dirs.add(solver('AC06').solve({ R: 10, dX: 12, dZ: 8 }).direction);
    expect(dirs.has('G02')).toBe(true);
    expect(dirs.has('G03')).toBe(true);
  });

  it('AC01 T3 刀尖方位（外圆车刀 · 前刀架）：G02，与 judgeArcDirection(rear=false) 一致', () => {
    // T3 = 外圆车刀标准刀尖方位；前刀架（rearToolPost 缺省 = 0）
    const out = solver('AC01').solve({ R: 5, angle: 45, stepD: 36 });
    const start = { x: 2 * 10.928932188134524, z: 0 };
    expect(out.direction).toBe('G02');
    expect(out.direction).toBe(judgeArcDirection(out.center, start, out.tangent, false));
  });

  it('AC01 后刀架 rearToolPost=1：方向翻转 G02→G03，与 judgeArcDirection(rear=true) 一致', () => {
    const out = solver('AC01').solve({ R: 5, angle: 45, stepD: 36, rearToolPost: 1 });
    const start = { x: 2 * 10.928932188134524, z: 0 };
    // 几何与切点不随后刀架改变
    expectVec(out.tangent, 36, 0);
    expectVec(out.center, 28.928932188134524, 3.5355339059327378);
    expect(out.direction).toBe('G03');
    expect(out.direction).toBe(judgeArcDirection(out.center, start, out.tangent, true));
  });
});
