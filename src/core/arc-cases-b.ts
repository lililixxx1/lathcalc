/** arc-cases-b.ts · 圆弧切点工况 07–12（W2-C5 实现；几何助手见 arc.ts）
 *  工况命名与设计稿 p05 图库一一对应。
 *
 *  坐标契约（冻结）：X = 直径值（mm）、Z = 线性值（mm），自 +Y 看；图面顺时针 =
 *  前刀架 G02、后刀架 G03。判向一律调 arc.ts 的 judgeArcDirection，本文件不自创。
 *  rearToolPost: 0 | 1，默认 0 = 前刀架；1 = 后刀架，方向由 judgeArcDirection 翻转
 *  （W4-C3 R-1 补位：与 arc-cases-a 同口径，此前 b 组未透传）。
 *
 *  桩输入键集不变；各工况的几何锚点约定（输入语义在派工单未逐键冻结，按下列
 *  标准车削构造实现，坐标手推见 test/arc-cases-b.test.ts 各例注释）：
 *  - AC07 凸圆弧收尾  { R, dX, dZ }：外圆 X=dX 与端面 Z=dZ 的凸角圆角，材料在 +Z 侧。
 *  - AC08 端面切弧    { R, dZ }：端面 Z=0 上的切弧，内端落在轴线 (0,dZ)，dZ 符号侧为材料侧。
 *  - AC09 锥面切弧    { R, angle }：半角 angle(°) 的锥面（母线过原点）与端面 Z=0 的相切圆角。
 *  - AC10 圆弧螺纹入口 { R, lead }：螺纹顶圆柱 X=2R 上的入口弧，轴向跨度取一个导程 lead。
 *  - AC11 球面收尾    { R }：半径 R 半球，赤道切点 X=2R。
 *  - AC12 内孔圆弧过渡 { R, boreD }：孔壁 X=boreD 与孔底面 Z=0 的内圆角，材料在 +Z 侧。
 */
import { judgeArcDirection } from './arc';
import type { ArcCaseSolver, ArcSolution, Vec2 } from './types';

/** 读取并校验数值输入（solve 的契约是 Record<string, number>） */
function inputNumber(input: Record<string, number>, key: string): number {
  const value = input[key];
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`缺少有效输入 ${key}`);
  }
  return value;
}

/** 正数校验（半径/直径类不允许 0 或负值） */
function positive(value: number, key: string): number {
  if (!(value > 0)) throw new Error(`${key} 必须为正数`);
  return value;
}

/** 后刀架可选键（与 arc-cases-a 同口径）：rearToolPost=1 时判向翻转 */
const rearOf = (input: Record<string, number>): boolean => input.rearToolPost === 1;

/**
 * 数值格式化：最多 3 位小数，去掉无意义的尾零。
 * minDecimals=0 时整数不带小数点（X20/Z-30）；minDecimals=1 时补一位（R5.0，与设计稿一致）。
 */
function formatNum(value: number, minDecimals = 0): string {
  const rounded = Math.round(value * 1000) / 1000;
  let text = (Object.is(rounded, -0) ? 0 : rounded).toFixed(3).replace(/0+$/, '');
  if (text.endsWith('.')) {
    text = minDecimals > 0 ? `${text}${'0'.repeat(minDecimals)}` : text.slice(0, -1);
  }
  return text;
}

/** 统一出口：切点/圆心 + arc.ts 判向（后刀架翻转）+ 可复制程序行 */
function makeSolution(
  center: Vec2,
  start: Vec2,
  tangent: Vec2,
  radius: number,
  rear: boolean,
): ArcSolution {
  const direction = judgeArcDirection(center, start, tangent, rear);
  return {
    tangent,
    center,
    direction,
    gcodeLine: `${direction} X${formatNum(tangent.x)} Z${formatNum(tangent.z)} R${formatNum(radius, 1)}`,
  };
}

/** AC07 凸圆弧收尾：外圆 X=dX 与端面 Z=dZ 的凸圆角 R，材料在 +Z 侧。
 *  C=(dX−2R, dZ+R)；外圆切点 T1=(dX, dZ+R)；端面切点 T2=(dX−2R, dZ)；弧 T1→T2。 */
function solveAC07(input: Record<string, number>): ArcSolution {
  const R = positive(inputNumber(input, 'R'), 'R');
  const dX = positive(inputNumber(input, 'dX'), 'dX');
  const dZ = inputNumber(input, 'dZ');
  if (dX <= 2 * R) {
    throw new Error(`AC07: dX 必须大于 2R（凸圆角无解），当前 dX=${dX}、2R=${2 * R}`);
  }
  return makeSolution(
    { x: dX - 2 * R, z: dZ + R },
    { x: dX, z: dZ + R },
    { x: dX - 2 * R, z: dZ },
    R,
    rearOf(input),
  );
}

/** AC08 端面切弧：端面 Z=0，切点 T=(2r_t,0)，内端 E=(0,dZ)，圆心在材料侧 C=(2r_t, sign(dZ)·R)。
 *  由 |C−E|=R 得 r_t²+(|dZ|−R)²=R² → r_t=√(|dZ|(2R−|dZ|))；弧 E→T。 */
function solveAC08(input: Record<string, number>): ArcSolution {
  const R = positive(inputNumber(input, 'R'), 'R');
  const dZ = inputNumber(input, 'dZ');
  const span = Math.abs(dZ);
  if (!(span > 0) || span > 2 * R) {
    throw new Error(`AC08: |dZ| 必须在 (0, 2R] 内，当前 |dZ|=${span}、2R=${2 * R}`);
  }
  const tangentX = 2 * Math.sqrt(span * (2 * R - span));
  return makeSolution(
    { x: tangentX, z: Math.sign(dZ) * R },
    { x: 0, z: dZ },
    { x: tangentX, z: 0 },
    R,
    rearOf(input),
  );
}

/** AC09 锥面切弧：半角 α 的锥面（母线过原点、方向 u=(sinα, cosα)）与端面 Z=0 的相切圆角 R。
 *  圆心在端面材料侧上方 R：C=(d, R)（d 为端面切点半径）；与锥面相切条件
 *  d·cosα−R·sinα=R → d=R(1+sinα)/cosα=R/tan((90°−α)/2)。
 *  端面切点 F=(d,0)，锥面切点 T=(d·sinα, d·cosα)；弧 F→T。 */
function solveAC09(input: Record<string, number>): ArcSolution {
  const R = positive(inputNumber(input, 'R'), 'R');
  const angle = inputNumber(input, 'angle');
  if (!(angle > 0 && angle < 90)) {
    throw new Error(`AC09: angle 必须在 (0, 90)° 内，当前 angle=${angle}`);
  }
  const alpha = (angle * Math.PI) / 180;
  const tangentRadius = (R * (1 + Math.sin(alpha))) / Math.cos(alpha);
  return makeSolution(
    { x: 2 * tangentRadius, z: R },
    { x: 2 * tangentRadius, z: 0 },
    { x: 2 * tangentRadius * Math.sin(alpha), z: tangentRadius * Math.cos(alpha) },
    R,
    rearOf(input),
  );
}

/** AC10 圆弧螺纹入口：切点 T=(2R,0) 在螺纹顶圆柱（X=2R）上、圆心 C=(0,0)；
 *  入口段轴向跨度取一个导程 lead，内端 E=(2√(R²−lead²), lead)；弧 E→T。 */
function solveAC10(input: Record<string, number>): ArcSolution {
  const R = positive(inputNumber(input, 'R'), 'R');
  const lead = positive(inputNumber(input, 'lead'), 'lead');
  if (lead >= R) {
    throw new Error(`AC10: lead 必须小于 R（入口弧无解），当前 lead=${lead}、R=${R}`);
  }
  return makeSolution(
    { x: 0, z: 0 },
    { x: 2 * Math.sqrt(R * R - lead * lead), z: lead },
    { x: 2 * R, z: 0 },
    R,
    rearOf(input),
  );
}

/** AC11 球面收尾：半球心 C=(0,0)、半径 R；极点 P=(0,−R)，赤道切点 T=(2R,0)；
 *  弧 P→T（T 处与外圆 X=2R 相切）。 */
function solveAC11(input: Record<string, number>): ArcSolution {
  const R = positive(inputNumber(input, 'R'), 'R');
  return makeSolution({ x: 0, z: 0 }, { x: 0, z: -R }, { x: 2 * R, z: 0 }, R, rearOf(input));
}

/** AC12 内孔圆弧过渡：孔壁 X=boreD、孔底面 Z=0，材料在 +Z 侧。
 *  内圆角：C=(boreD+2R, R)；孔壁切点 T1=(boreD, R)；底面切点 T2=(boreD+2R, 0)；弧 T1→T2。 */
function solveAC12(input: Record<string, number>): ArcSolution {
  const R = positive(inputNumber(input, 'R'), 'R');
  const boreD = positive(inputNumber(input, 'boreD'), 'boreD');
  return makeSolution(
    { x: boreD + 2 * R, z: R },
    { x: boreD, z: R },
    { x: boreD + 2 * R, z: 0 },
    R,
    rearOf(input),
  );
}

export const arcCasesB: readonly ArcCaseSolver[] = [
  { id: 'AC07', name: '凸圆弧收尾', inputs: ['R', 'dX', 'dZ'], solve: solveAC07 },
  { id: 'AC08', name: '端面切弧', inputs: ['R', 'dZ'], solve: solveAC08 },
  { id: 'AC09', name: '锥面切弧', inputs: ['R', 'angle'], solve: solveAC09 },
  { id: 'AC10', name: '圆弧螺纹入口', inputs: ['R', 'lead'], solve: solveAC10 },
  { id: 'AC11', name: '球面收尾', inputs: ['R'], solve: solveAC11 },
  { id: 'AC12', name: '内孔圆弧过渡', inputs: ['R', 'boreD'], solve: solveAC12 },
];
