/**
 * test/arc-cases-b.test.ts · 工况 07–12 例题与几何不变量（W2-C5）
 *
 * 断言口径：
 *  - |圆心−切点| = R 在物理 r-z 平面计算（r = X/2，见 arc.ts dist 注释）；
 *  - 半径向量 · 切点处相切要素方向 = 0（dot 在物理 r-z 平面）；
 *  - 判向：解值由 arc.ts judgeArcDirection(前刀架) 给出；每例再用同一几何独立复判，
 *    并断言 rearToolPost=true 时逐例翻转（后刀架用例）。
 *  - 期望坐标全部手推，算式见各例题注释。
 */
import { describe, it, expect } from 'vitest';
import { arcCasesB } from '../src/core/arc-cases-b';
import { judgeArcDirection } from '../src/core/arc';
import type { ArcCaseId, ArcSolution, Vec2 } from '../src/core/types';

interface ArcExample {
  readonly caseId: ArcCaseId;
  readonly title: string;
  readonly input: Record<string, number>;
  readonly center: Vec2;
  readonly start: Vec2;
  readonly tangent: Vec2;
  readonly radius: number;
  readonly direction: 'G02' | 'G03';
  readonly line: string;
  /** 切点处相切要素的方向（物理 r-z 平面单位向量） */
  readonly lineDir: readonly [number, number];
}

function solver(id: ArcCaseId) {
  const found = arcCasesB.find((c) => c.id === id);
  if (!found) throw new Error(`未注册工况 ${id}`);
  return found;
}

/** 物理 r-z 平面内圆心到切点的距离（X 为直径制，半径向除以 2） */
function physicalRadius(solution: ArcSolution): number {
  return Math.hypot((solution.tangent.x - solution.center.x) / 2, solution.tangent.z - solution.center.z);
}

/** 物理 r-z 平面内「半径向量 · 切点切线方向」 */
function radiusDotLine(solution: ArcSolution, lineDir: readonly [number, number]): number {
  const dr = (solution.tangent.x - solution.center.x) / 2;
  const dz = solution.tangent.z - solution.center.z;
  return dr * lineDir[0] + dz * lineDir[1];
}

function verify(ex: ArcExample): void {
  const solution = solver(ex.caseId).solve(ex.input);

  // 手推坐标对齐
  expect(solution.center.x).toBeCloseTo(ex.center.x, 9);
  expect(solution.center.z).toBeCloseTo(ex.center.z, 9);
  expect(solution.tangent.x).toBeCloseTo(ex.tangent.x, 9);
  expect(solution.tangent.z).toBeCloseTo(ex.tangent.z, 9);
  expect(solution.direction).toBe(ex.direction);
  expect(solution.gcodeLine).toBe(ex.line);

  // 几何不变量：|圆心−切点|=R；半径·切线 dot=0（容差 1e-9）
  expect(Math.abs(physicalRadius(solution) - ex.radius)).toBeLessThan(1e-9);
  expect(Math.abs(radiusDotLine(solution, ex.lineDir))).toBeLessThan(1e-9);

  // 判向独立复判（arc.ts 金测约定）：前刀架 = 解值；后刀架逐例翻转
  expect(judgeArcDirection(ex.center, ex.start, ex.tangent, false)).toBe(ex.direction);
  expect(judgeArcDirection(ex.center, ex.start, ex.tangent, true)).toBe(ex.direction === 'G02' ? 'G03' : 'G02');
}

const EXAMPLES: readonly ArcExample[] = [
  // ---------- AC07 凸圆弧收尾（外圆 X=dX 与端面 Z=dZ 的凸圆角，材料在 +Z 侧） ----------
  {
    caseId: 'AC07',
    title: 'R5 凸圆角收尾（Ø30 外圆，端面 Z−30）',
    input: { R: 5, dX: 30, dZ: -30 },
    // 手推：C=(dX−2R, dZ+R)=(30−10, −30+5)=(20,−25)
    //       T1=(dX, dZ+R)=(30,−25)（外圆切点）；T2=(dX−2R, dZ)=(20,−30)（端面切点）
    //       |C−T2|=√(0²+5²)=5；端面方向 (1,0)，半径 (0,−5)·(1,0)=0
    center: { x: 20, z: -25 },
    start: { x: 30, z: -25 },
    tangent: { x: 20, z: -30 },
    radius: 5,
    direction: 'G03',
    line: 'G03 X20 Z-30 R5.0',
    lineDir: [1, 0],
  },
  {
    caseId: 'AC07',
    title: 'R4 凸圆角收尾（Ø24 外圆，端面 Z−12）',
    input: { R: 4, dX: 24, dZ: -12 },
    // 手推：C=(24−8, −12+4)=(16,−8)；T1=(24,−8)；T2=(16,−12)
    //       |C−T2|=4；半径 (0,−4)·(1,0)=0
    center: { x: 16, z: -8 },
    start: { x: 24, z: -8 },
    tangent: { x: 16, z: -12 },
    radius: 4,
    direction: 'G03',
    line: 'G03 X16 Z-12 R4.0',
    lineDir: [1, 0],
  },

  // ---------- AC08 端面切弧（端面 Z=0，内端落轴线，dZ 符号侧为材料侧） ----------
  {
    caseId: 'AC08',
    title: 'R6 端面切弧（内端 Z−4，材料在 −Z 侧）',
    input: { R: 6, dZ: -4 },
    // 手推：r_t=√(|dZ|(2R−|dZ|))=√(4×8)=√32=5.656854249492381
    //       X_T=2r_t=11.313708498984761；C=(X_T, sign(dZ)·R)=(11.313708498984761,−6)
    //       E=(0,dZ)=(0,−4)；|C−T|=|0−(−6)|=6；端面方向 (1,0)，半径 (0,6)·(1,0)=0
    center: { x: 11.313708498984761, z: -6 },
    start: { x: 0, z: -4 },
    tangent: { x: 11.313708498984761, z: 0 },
    radius: 6,
    direction: 'G03',
    line: 'G03 X11.314 Z0 R6.0',
    lineDir: [1, 0],
  },
  {
    caseId: 'AC08',
    title: 'R6 端面切弧镜像（内端 Z+3，材料在 +Z 侧）',
    input: { R: 6, dZ: 3 },
    // 手推：r_t=√(3×9)=√27=5.196152422706632；X_T=2r_t=10.392304845413264
    //       C=(10.392304845413264, +6)；E=(0,3)；|C−T|=6；半径 (0,−6)·(1,0)=0
    center: { x: 10.392304845413264, z: 6 },
    start: { x: 0, z: 3 },
    tangent: { x: 10.392304845413264, z: 0 },
    radius: 6,
    direction: 'G02',
    line: 'G02 X10.392 Z0 R6.0',
    lineDir: [1, 0],
  },

  // ---------- AC09 锥面切弧（半角 angle 的锥面与端面 Z=0 的相切圆角） ----------
  {
    caseId: 'AC09',
    title: 'R5 锥面切弧（半角 30°）',
    input: { R: 5, angle: 30 },
    // 手推：d=R(1+sinα)/cosα=5×1.5/0.8660254037844386=8.660254037844386
    //       C=(2d, R)=(17.32050807568877, 5)；F=(2d, 0)=(17.32050807568877, 0)
    //       T=(2d·sinα, d·cosα)=(8.660254037844384, 7.5)
    //       |C−T|=√(4.330127018922193²+2.5²)=5
    //       锥面母线方向 u=(sinα,cosα)=(0.5,0.8660254037844386)
    //       半径物理向量=(−4.330127018922193, 2.5)，u·半径≈0
    center: { x: 17.32050807568877, z: 5 },
    start: { x: 17.32050807568877, z: 0 },
    tangent: { x: 8.660254037844384, z: 7.5 },
    radius: 5,
    direction: 'G03',
    line: 'G03 X8.66 Z7.5 R5.0',
    lineDir: [0.5, 0.8660254037844386],
  },
  {
    caseId: 'AC09',
    title: 'R4 锥面切弧（半角 45°）',
    input: { R: 4, angle: 45 },
    // 手推：d=4(1+sin45°)/cos45°=4×1.7071067811865475/0.7071067811865476=9.65685424949238
    //       C=(19.31370849898476, 4)；F=(19.31370849898476, 0)
    //       T=(2d·sin45°, d·cos45°)=(13.656854249492378, 6.82842712474619)
    //       |C−T|=4；u=(√2/2,√2/2)；半径 (−2.82842712474619,2.82842712474619)，u·半径=0
    center: { x: 19.31370849898476, z: 4 },
    start: { x: 19.31370849898476, z: 0 },
    tangent: { x: 13.656854249492378, z: 6.82842712474619 },
    radius: 4,
    direction: 'G03',
    line: 'G03 X13.657 Z6.828 R4.0',
    lineDir: [0.7071067811865476, 0.7071067811865476],
  },

  // ---------- AC10 圆弧螺纹入口（顶圆柱 X=2R 上的入口弧，轴向跨一个导程） ----------
  {
    caseId: 'AC10',
    title: 'R5 螺纹入口弧（导程 3.5）',
    input: { R: 5, lead: 3.5 },
    // 手推：C=(0,0)；T=(2R,0)=(10,0)（顶圆柱 X=10 上，切线沿 Z）
    //       E=(2√(R²−lead²), lead)=(2√12.75, 3.5)=(7.14142842854285, 3.5)
    //       |C−T|=5；半径 (5,0)·(0,1)=0
    center: { x: 0, z: 0 },
    start: { x: 7.14142842854285, z: 3.5 },
    tangent: { x: 10, z: 0 },
    radius: 5,
    direction: 'G03',
    line: 'G03 X10 Z0 R5.0',
    lineDir: [0, 1],
  },
  {
    caseId: 'AC10',
    title: 'R8 螺纹入口弧（导程 4）',
    input: { R: 8, lead: 4 },
    // 手推：C=(0,0)；T=(16,0)；E=(2√(64−16), 4)=(2√48,4)=(13.856406460551018,4)
    //       |C−T|=8；半径 (8,0)·(0,1)=0
    center: { x: 0, z: 0 },
    start: { x: 13.856406460551018, z: 4 },
    tangent: { x: 16, z: 0 },
    radius: 8,
    direction: 'G03',
    line: 'G03 X16 Z0 R8.0',
    lineDir: [0, 1],
  },

  // ---------- AC11 球面收尾（半球心原点，赤道切点 X=2R） ----------
  {
    caseId: 'AC11',
    title: 'R10 球面收尾',
    input: { R: 10 },
    // 手推：C=(0,0)；极点 P=(0,−R)=(0,−10)；赤道切点 T=(2R,0)=(20,0)
    //       |C−T|=10；半径 (10,0)·(0,1)=0
    center: { x: 0, z: 0 },
    start: { x: 0, z: -10 },
    tangent: { x: 20, z: 0 },
    radius: 10,
    direction: 'G02',
    line: 'G02 X20 Z0 R10.0',
    lineDir: [0, 1],
  },
  {
    caseId: 'AC11',
    title: 'R6.5 球面收尾',
    input: { R: 6.5 },
    // 手推：C=(0,0)；P=(0,−6.5)；T=(13,0)；|C−T|=6.5；半径 (6.5,0)·(0,1)=0
    center: { x: 0, z: 0 },
    start: { x: 0, z: -6.5 },
    tangent: { x: 13, z: 0 },
    radius: 6.5,
    direction: 'G02',
    line: 'G02 X13 Z0 R6.5',
    lineDir: [0, 1],
  },

  // ---------- AC12 内孔圆弧过渡（孔壁 X=boreD 与孔底面 Z=0 的内圆角） ----------
  {
    caseId: 'AC12',
    title: 'R3 内孔圆弧过渡（孔径 20）',
    input: { R: 3, boreD: 20 },
    // 手推：C=(boreD+2R, R)=(20+6, 3)=(26,3)；T1=(boreD,R)=(20,3)（孔壁切点）
    //       T2=(boreD+2R,0)=(26,0)（底面切点）；|C−T2|=3；半径 (0,−3)·(1,0)=0
    center: { x: 26, z: 3 },
    start: { x: 20, z: 3 },
    tangent: { x: 26, z: 0 },
    radius: 3,
    direction: 'G02',
    line: 'G02 X26 Z0 R3.0',
    lineDir: [1, 0],
  },
  {
    caseId: 'AC12',
    title: 'R2.5 内孔圆弧过渡（孔径 16）',
    input: { R: 2.5, boreD: 16 },
    // 手推：C=(16+5, 2.5)=(21,2.5)；T1=(16,2.5)；T2=(21,0)
    //       |C−T2|=2.5；半径 (0,−2.5)·(1,0)=0
    center: { x: 21, z: 2.5 },
    start: { x: 16, z: 2.5 },
    tangent: { x: 21, z: 0 },
    radius: 2.5,
    direction: 'G02',
    line: 'G02 X21 Z0 R2.5',
    lineDir: [1, 0],
  },
];

describe('工况 07：凸圆弧收尾', () => {
  it(EXAMPLES[0]!.title, () => verify(EXAMPLES[0]!));
  it(EXAMPLES[1]!.title, () => verify(EXAMPLES[1]!));
});

describe('工况 08：端面切弧', () => {
  it(EXAMPLES[2]!.title, () => verify(EXAMPLES[2]!));
  it(EXAMPLES[3]!.title, () => verify(EXAMPLES[3]!));
});

describe('工况 09：锥面切弧', () => {
  it(EXAMPLES[4]!.title, () => verify(EXAMPLES[4]!));
  it(EXAMPLES[5]!.title, () => verify(EXAMPLES[5]!));
});

describe('工况 10：圆弧螺纹入口', () => {
  it(EXAMPLES[6]!.title, () => verify(EXAMPLES[6]!));
  it(EXAMPLES[7]!.title, () => verify(EXAMPLES[7]!));
});

describe('工况 11：球面收尾', () => {
  it(EXAMPLES[8]!.title, () => verify(EXAMPLES[8]!));
  it(EXAMPLES[9]!.title, () => verify(EXAMPLES[9]!));
});

describe('工况 12：内孔圆弧过渡', () => {
  it(EXAMPLES[10]!.title, () => verify(EXAMPLES[10]!));
  it(EXAMPLES[11]!.title, () => verify(EXAMPLES[11]!));
});

describe('工况注册与判向覆盖', () => {
  it('6 工况注册序与输入键集保持桩定义不变', () => {
    expect(arcCasesB.map((c) => c.id)).toEqual(['AC07', 'AC08', 'AC09', 'AC10', 'AC11', 'AC12']);
    expect(arcCasesB.map((c) => c.name)).toEqual([
      '凸圆弧收尾',
      '端面切弧',
      '锥面切弧',
      '圆弧螺纹入口',
      '球面收尾',
      '内孔圆弧过渡',
    ]);
    expect(solver('AC07').inputs).toEqual(['R', 'dX', 'dZ']);
    expect(solver('AC08').inputs).toEqual(['R', 'dZ']);
    expect(solver('AC09').inputs).toEqual(['R', 'angle']);
    expect(solver('AC10').inputs).toEqual(['R', 'lead']);
    expect(solver('AC11').inputs).toEqual(['R']);
    expect(solver('AC12').inputs).toEqual(['R', 'boreD']);
  });

  it('判向覆盖：G02/G03 均出现，后刀架逐例翻转', () => {
    const solved = EXAMPLES.map((ex) => solver(ex.caseId).solve(ex.input));
    expect(solved.some((s) => s.direction === 'G02')).toBe(true);
    expect(solved.some((s) => s.direction === 'G03')).toBe(true);
    for (const ex of EXAMPLES) {
      expect(judgeArcDirection(ex.center, ex.start, ex.tangent, true)).toBe(
        ex.direction === 'G02' ? 'G03' : 'G02',
      );
    }
  });

  it('solve 级后刀架翻转（W4-C3 R-1 补位）：AC07–AC12 逐例 rearToolPost=1 对调', () => {
    for (const ex of EXAMPLES) {
      const front = solver(ex.caseId).solve(ex.input);
      const rear = solver(ex.caseId).solve({ ...ex.input, rearToolPost: 1 });
      expect(rear.direction).toBe(front.direction === 'G02' ? 'G03' : 'G02');
      expect(rear.gcodeLine.startsWith(rear.direction)).toBe(true);
      // 几何不变：仅判向与程序行方向字对调
      expect(rear.tangent).toEqual(front.tangent);
      expect(rear.center).toEqual(front.center);
    }
  });

  it('越界/无解输入抛出明确错误（不返回 NaN 几何）', () => {
    expect(() => solver('AC07').solve({ R: 5, dX: 10, dZ: 0 })).toThrow(/2R/);
    expect(() => solver('AC08').solve({ R: 5, dZ: 11 })).toThrow(/dZ/);
    expect(() => solver('AC09').solve({ R: 5, angle: 90 })).toThrow(/angle/);
    expect(() => solver('AC10').solve({ R: 5, lead: 5 })).toThrow(/lead/);
    expect(() => solver('AC12').solve({ R: 3 })).toThrow(/boreD/);
  });
});
