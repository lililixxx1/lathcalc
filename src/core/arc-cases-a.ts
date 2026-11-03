/** arc-cases-a.ts · 圆弧切点工况 01–06（W2-C4 实现；几何助手见 arc.ts）
 *  工况命名与设计稿 p05 图库一一对应。
 *
 *  ===== 坐标与判向契约（冻结）=====
 *  对外坐标：X = 直径值（图面朝上），Z = 线性 mm（图面朝右），自 +Y 方向看；
 *  图面顺时针 = 前刀架 G02、后刀架 G03。判向一律调用 arc.ts 的 judgeArcDirection，
 *  本文件不另写判向逻辑。
 *
 *  ===== 计算空间 =====
 *  内部几何一律在半径空间 (z, r) 内计算，r = X/2，输出时再换算 X = 2r。
 *  依据：arc.ts dist 注释「Z 与 X 半径混合空间内使用时，调用方先除 2——本函数只做
 *  欧氏距离」；不变量 |圆心−切点| = R 只在该空间成立（G0 复算口径同此）。
 *
 *  ===== 角度 =====
 *  α（deg）自 +Z 轴起、朝 +X 方向为正；半径空间内
 *    u(α) = (z=cosα, r=sinα)，n(α) = rot90(u) = (z=−sinα, r=cosα)。
 *
 *  ===== 可选输入键（六工况通用，不列入各工况 inputs 必填清单）=====
 *    rearToolPost: 0 | 1，默认 0 = 前刀架；1 = 后刀架，方向由 judgeArcDirection 翻转。
 *    T3 刀尖方位 = 外圆车刀前刀架标准方位，默认路径（rearToolPost=0）即 T3；
 *    判向例题见 test/arc-cases-a.test.ts（T3 例 + rearToolPost=1 例）。
 *
 *  ===== 各工况冻结模型（例题参数自选，见 test/arc-cases-a.test.ts 的算式注释）=====
 *  AC01 直线—圆弧相切：
 *    直线过 P=(Z=0, X=stepD)，方向 u(α)；半径 R 的圆在直线 −n 侧相切，切点 P：
 *      C = P − R·n = (Z=R sinα, X=stepD − 2R cosα)
 *      |C−P| = R；(P−C)·u = 0
 *    圆弧自 S=C−R·u 顺时针 90° 至 P（前刀架 G02）。
 *  AC02 两圆弧外切：
 *    C1=(Z=0,X=0) 为坐标基准（本工况无 X 绝对定位输入）；|C1−C2| = R1+R2，
 *    圆心轴向差 dZ，故 C2=(Z=dZ, r=√((R1+R2)²−dZ²))。
 *    e=(C2−C1)/|C1−C2|，切点 T=C1+R1·e（|T−C2|=R2）。
 *    首弧 S=C1+R1·rot90(e) 顺时针 90° 至 T（T 处公切线 ⟂ 连心线；前刀架 G02）。
 *  AC03 两圆弧内切：
 *    R1>R2；C1=(Z=0,X=0) 为坐标基准；|C1−C2| = R1−R2，圆心轴向差 dZ，
 *    故 C2=(Z=dZ, r=√((R1−R2)²−dZ²))；e 同上单位向量，
 *    切点 T=C1+R1·e（|T−C2|=R2）。首弧 S=C1+R1·rot90(e) 顺时针 90° 至 T（G02）。
 *  AC04 圆弧—斜线—圆弧：
 *    斜线过 P1=(Z=0,X=0)（坐标基准），方向 u(α)；两圆弧圆心均在斜线 +n 侧，
 *    分别与斜线相切：C1=P1+R1·n、C2=P2+R2·n。
 *    线段长冻结约定 L=R1+R2（设计稿无线段长度输入；约定登记于 W2-C4 上报项）：
 *      P2=P1+L·u；输出第二段弧：圆心 C2、切点 P2、R=R2；
 *      S2=C2−R2·u，S2→P2 逆时针 90°，P2 处切线方向 = +u（前刀架 G03）。
 *  AC05 台阶倒圆：
 *    台阶尖角 (X=stepX, Z=stepZ)，相邻面 = 外圆 X=stepX（Z 向）与台阶面 Z=stepZ（X 向）。
 *    圆角圆心 C=(X=stepX+2R, Z=stepZ−R)，与外圆切点 Q=(X=stepX, Z=stepZ−R)，
 *    与台阶面切点 P=(X=stepX+2R, Z=stepZ)；输出 P，圆弧 Q→P 逆时针 90°（G03）。
 *  AC06 凹圆弧切入：
 *    已知 R、终点相对起点 S=(Z=0,X=0) 的偏移 (dX 直径, dZ 轴向)。
 *    弦半径空间向量 c=(z=dZ, r=dX/2)，长 cL；中点 M=S+c/2；
 *    圆心在弦的 +n 侧：C=M+q·n，n=rot90(c/cL)，q=√(R²−(cL/2)²)（须 cL<2R）。
 *    输出终点 E=S+c 为切点；|C−S|=|C−E|=R；S→E 逆时针（前刀架 G03）。
 */
import type { ArcCaseSolver, ArcSolution, Vec2 } from './types';
import { judgeArcDirection } from './arc';

/** 半径空间点（r = X/2） */
interface RP {
  z: number;
  r: number;
}

const add = (a: RP, b: RP): RP => ({ z: a.z + b.z, r: a.r + b.r });
const sub = (a: RP, b: RP): RP => ({ z: a.z - b.z, r: a.r - b.r });
const mul = (a: RP, k: number): RP => ({ z: a.z * k, r: a.r * k });
/** (z,r) 平面内逆时针 90°：rot90(z,r) = (−r, z) */
const rot90 = (a: RP): RP => ({ z: -a.r, r: a.z });
const toRadius = (v: Vec2): RP => ({ z: v.z, r: v.x / 2 });
const toDia = (p: RP): Vec2 => ({ x: p.r * 2, z: p.z });
const deg2rad = (deg: number): number => (deg * Math.PI) / 180;

function unitVec(p: RP): RP {
  const len = Math.hypot(p.z, p.r);
  if (len === 0) throw new Error('ARC: zero-length direction vector');
  return { z: p.z / len, r: p.r / len };
}

/** 必填数值键（noUncheckedIndexedAccess 下收窄；缺键/非有限值即报错） */
function req(input: Record<string, number>, key: string): number {
  const v = input[key];
  if (typeof v !== 'number' || !Number.isFinite(v)) {
    throw new Error(`ARC input missing or non-finite: ${key}`);
  }
  return v;
}

/** 可选后刀架标记：仅 1 视为后刀架，其余（含缺省）为前刀架 */
const rearOf = (input: Record<string, number>): boolean => input.rearToolPost === 1;

/** 坐标格式：X/Z 固定 3 位小数（与 types.ts 契约示例同格式），-0 归一为 0 */
function fmtCoord(v: number): string {
  // I-1 统一（W2-G2 复审建议）：去尾零、整数不带点，与 arc-cases-b formatNum(minDecimals=0) 一致
  const rounded = Math.round(v * 1000) / 1000;
  let text = (Object.is(rounded, -0) ? 0 : rounded).toFixed(3).replace(/0+$/, '');
  if (text.endsWith('.')) text = text.slice(0, -1);
  return text;
}

/** R 格式：≤3 位小数、去尾零并保留至少 1 位小数（契约示例 R5.0） */
function fmtRadius(v: number): string {
  const rounded = Math.round(v * 1000) / 1000;
  const s = (Object.is(rounded, -0) ? 0 : rounded).toFixed(3);
  let t = s.replace(/0+$/, '');
  if (t.endsWith('.')) t += '0';
  return t;
}

/** 统一装配：判向经 judgeArcDirection；程序行终点 = 切点（契约示例口径） */
function build(center: RP, start: RP, tangent: RP, radius: number, rear: boolean): ArcSolution {
  const c = toDia(center);
  const t = toDia(tangent);
  const s = toDia(start);
  const direction = judgeArcDirection(c, s, t, rear);
  return {
    tangent: t,
    center: c,
    direction,
    gcodeLine: `${direction} X${fmtCoord(t.x)} Z${fmtCoord(t.z)} R${fmtRadius(radius)}`,
  };
}

export const arcCasesA: readonly ArcCaseSolver[] = [
  {
    id: 'AC01',
    name: '直线—圆弧相切',
    inputs: ['R', 'angle', 'stepD'],
    solve: (i) => {
      const R = req(i, 'R');
      const alpha = deg2rad(req(i, 'angle'));
      const stepD = req(i, 'stepD');
      if (R <= 0) throw new Error('AC01: R must be > 0');
      const u: RP = { z: Math.cos(alpha), r: Math.sin(alpha) };
      const n = rot90(u);
      const P: RP = { z: 0, r: stepD / 2 };
      const C = sub(P, mul(n, R)); // C = P − R·n
      const S = sub(C, mul(u, R)); // = C + rot90(P−C)，顺时针 90° 至 P
      return build(C, S, P, R, rearOf(i));
    },
  },
  {
    id: 'AC02',
    name: '两圆弧外切',
    inputs: ['R1', 'R2', 'dZ'],
    solve: (i) => {
      const R1 = req(i, 'R1');
      const R2 = req(i, 'R2');
      const dZ = req(i, 'dZ');
      const sum = R1 + R2;
      if (R1 <= 0 || R2 <= 0) throw new Error('AC02: R1,R2 must be > 0');
      if (!(dZ > 0 && dZ < sum)) throw new Error('AC02: need 0 < dZ < R1+R2');
      const C1: RP = { z: 0, r: 0 };
      const C2: RP = { z: dZ, r: Math.sqrt(sum * sum - dZ * dZ) };
      const e = unitVec(sub(C2, C1));
      const T = add(C1, mul(e, R1)); // 外切点：C1 + R1·e，|T−C2| = R2
      const S = add(C1, mul(rot90(e), R1)); // 顺时针 90° 至 T
      return build(C1, S, T, R1, rearOf(i));
    },
  },
  {
    id: 'AC03',
    name: '两圆弧内切',
    inputs: ['R1', 'R2', 'dZ'],
    solve: (i) => {
      const R1 = req(i, 'R1');
      const R2 = req(i, 'R2');
      const dZ = req(i, 'dZ');
      if (R1 <= 0 || R2 <= 0) throw new Error('AC03: R1,R2 must be > 0');
      if (R1 <= R2) throw new Error('AC03: need R1 > R2');
      const diff = R1 - R2;
      if (!(dZ > 0 && dZ < diff)) throw new Error('AC03: need 0 < dZ < R1−R2');
      const C1: RP = { z: 0, r: 0 };
      const C2: RP = { z: dZ, r: Math.sqrt(diff * diff - dZ * dZ) };
      const e = unitVec(sub(C2, C1));
      const T = add(C1, mul(e, R1)); // 内切点：C1 + R1·e，|T−C2| = R2
      const S = add(C1, mul(rot90(e), R1)); // 顺时针 90° 至 T
      return build(C1, S, T, R1, rearOf(i));
    },
  },
  {
    id: 'AC04',
    name: '圆弧—斜线—圆弧',
    inputs: ['R1', 'R2', 'angle'],
    solve: (i) => {
      const R1 = req(i, 'R1');
      const R2 = req(i, 'R2');
      const alpha = deg2rad(req(i, 'angle'));
      if (R1 <= 0 || R2 <= 0) throw new Error('AC04: R1,R2 must be > 0');
      const u: RP = { z: Math.cos(alpha), r: Math.sin(alpha) };
      const n = rot90(u);
      const P1: RP = { z: 0, r: 0 };
      const L = R1 + R2; // 冻结约定：斜线段长 = R1+R2
      const P2 = add(P1, mul(u, L));
      const C2 = add(P2, mul(n, R2)); // 圆心在斜线 +n 侧
      const S2 = sub(C2, mul(u, R2)); // = C2 + rot90(P2−C2)，逆时针 90° 至 P2
      return build(C2, S2, P2, R2, rearOf(i));
    },
  },
  {
    id: 'AC05',
    name: '台阶倒圆',
    inputs: ['R', 'stepX', 'stepZ'],
    solve: (i) => {
      const R = req(i, 'R');
      const stepX = req(i, 'stepX');
      const stepZ = req(i, 'stepZ');
      if (R <= 0) throw new Error('AC05: R must be > 0');
      const C: RP = { z: stepZ - R, r: stepX / 2 + R };
      const P: RP = { z: stepZ, r: stepX / 2 + R }; // 与台阶面切点（输出）
      const Q: RP = { z: stepZ - R, r: stepX / 2 }; // 与外圆切点（圆弧起点）
      return build(C, Q, P, R, rearOf(i));
    },
  },
  {
    id: 'AC06',
    name: '凹圆弧切入',
    inputs: ['R', 'dX', 'dZ'],
    solve: (i) => {
      const R = req(i, 'R');
      const dX = req(i, 'dX');
      const dZ = req(i, 'dZ');
      if (R <= 0) throw new Error('AC06: R must be > 0');
      const S: RP = { z: 0, r: 0 };
      const chord: RP = { z: dZ, r: dX / 2 };
      const cL = Math.hypot(chord.z, chord.r);
      if (!(cL > 0 && cL < 2 * R)) throw new Error('AC06: need 0 < |chord| < 2R');
      const u = unitVec(chord);
      const M = add(S, mul(chord, 0.5));
      const q = Math.sqrt(R * R - (cL / 2) * (cL / 2));
      const E = add(S, chord);
      const C = add(M, mul(rot90(u), q)); // 圆心取弦的 +n 侧（凹侧）
      return build(C, S, E, R, rearOf(i));
    },
  },
];
