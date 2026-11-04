/**
 * triangle.ts · 解三角形（W2-C1 实现：SSS——三边已知求三角/面积）
 * 公式：余弦定理 cos A = (b²+c²−a²)/(2bc)；海伦公式 S = √(s(s−a)(s−b)(s−c))。
 * 角度单位度（°），边长单位与输入一致。
 */
import type { TriangleInput, TriangleResult, TriangleSolveOutput } from './types';

const RAD_TO_DEG = 180 / Math.PI;
/** 直角判定容差（度）：任一角 ±0.01° 内视为 90°（types.ts TriangleResult.right） */
const RIGHT_TOLERANCE_DEG = 0.01;

/** 余弦定理求角：opposite 为角所对边，s1/s2 为夹该角的两边 */
function angleFromSides(opposite: number, s1: number, s2: number): number {
  const cosValue = (s1 * s1 + s2 * s2 - opposite * opposite) / (2 * s1 * s2);
  // 浮点误差可能让余弦略越界，夹紧到 [-1, 1]
  return Math.acos(Math.min(1, Math.max(-1, cosValue))) * RAD_TO_DEG;
}

export function solveTriangle(input: TriangleInput): TriangleResult {
  const { a, b, c } = input;
  if (a === undefined || b === undefined || c === undefined) {
    throw new Error('solveTriangle: 仅支持 SSS，需同时给出 a、b、c 三边');
  }
  if (a <= 0 || b <= 0 || c <= 0 || a + b <= c || a + c <= b || b + c <= a) {
    throw new Error('solveTriangle: 三边不能构成三角形');
  }

  const A = angleFromSides(a, b, c);
  const B = angleFromSides(b, a, c);
  const C = 180 - A - B;

  const s = (a + b + c) / 2;
  const area = Math.sqrt(Math.max(0, s * (s - a) * (s - b) * (s - c)));
  const right = [A, B, C].some((angle) => Math.abs(angle - 90) <= RIGHT_TOLERANCE_DEG);

  return { a, b, c, A, B, C, area, right };
}

/** 模式判定 / 输入非法文案（types.ts SolveTriangleByFn 注释，G0-I2 冻结） */
const MODE_ERROR = '无法判定解算模式或输入非法';
/** 无解文案（V2-3 / G0-I1 冻结） */
const NO_SOLUTION = '构不成三角形';
const DEG_TO_RAD = Math.PI / 180;

type SideKey = 'a' | 'b' | 'c';
type AngleKey = 'A' | 'B' | 'C';
type TriangleKey = SideKey | AngleKey;

const SIDE_KEYS: readonly SideKey[] = ['a', 'b', 'c'];
const ANGLE_KEYS: readonly AngleKey[] = ['A', 'B', 'C'];
const ALL_KEYS: readonly TriangleKey[] = [...SIDE_KEYS, ...ANGLE_KEYS];

/** 由三边构造 TriangleResult；三边退化统一转无解文案（SSS 复用既有 solveTriangle）。 */
function fromSides(sides: Record<SideKey, number>): TriangleResult {
  try {
    return solveTriangle(sides);
  } catch {
    throw new Error(NO_SOLUTION);
  }
}

/**
 * 多模式解算（WAVE-PLAN-V2 §1 契约，W6-C4 实现）：SSS/SAS/ASA/SSA。
 * SSA 双解并列、锐角解在前；边界（A≥90° 且 a≤c、sinC>1、解出 B≤0/C≤0 退化）判无解（V2-3）。
 * 模式判定与其余组合抛错文案见 types.ts SolveTriangleByFn 注释（G0-I2）。
 */
export function solveTriangleBy(input: TriangleInput): TriangleSolveOutput {
  const values: Record<TriangleKey, number | undefined> = {
    a: input.a,
    b: input.b,
    c: input.c,
    A: input.A,
    B: input.B,
    C: input.C,
  };

  // 零值 / 负值 / 非有限值 / 角 ≥ 180° 一律非法（与缺值 / 多值同文案）
  const provided: TriangleKey[] = [];
  for (const key of ALL_KEYS) {
    const value = values[key];
    if (value === undefined) continue;
    if (!Number.isFinite(value) || value <= 0) throw new Error(MODE_ERROR);
    if (key === key.toUpperCase() && value >= 180) throw new Error(MODE_ERROR);
    provided.push(key);
  }

  const sides = SIDE_KEYS.filter((key) => values[key] !== undefined);
  const angles = ANGLE_KEYS.filter((key) => values[key] !== undefined);

  const sideValue = (key: SideKey): number => {
    const value = values[key];
    if (value === undefined) throw new Error(MODE_ERROR);
    return value;
  };
  const angleValue = (key: AngleKey): number => {
    const value = values[key];
    if (value === undefined) throw new Error(MODE_ERROR);
    return value;
  };

  // 恰三边 = SSS
  if (provided.length === 3 && sides.length === 3 && angles.length === 0) {
    return { mode: 'SSS', solutions: [fromSides({ a: sideValue('a'), b: sideValue('b'), c: sideValue('c') })] };
  }

  // 恰两边 + 恰一角 = SAS（角为夹角）或 SSA（角与对边同给）
  if (provided.length === 3 && sides.length === 2 && angles.length === 1) {
    const [angleKey] = angles;
    if (!angleKey) throw new Error(MODE_ERROR);
    const opposite = angleKey.toLowerCase() as SideKey;

    if (sides.includes(opposite)) {
      // SSA：对边 x 与角 X 同给，另一已知边 y（对另一角 Y）
      const otherSide = sides.find((key) => key !== opposite);
      if (!otherSide) throw new Error(MODE_ERROR);
      const x = sideValue(opposite);
      const y = sideValue(otherSide);
      const X = angleValue(angleKey);
      const sinOther = (y * Math.sin(X * DEG_TO_RAD)) / x;

      // V2-3：sin>1 无解；A≥90° 且对边≤邻边无解
      if (sinOther > 1) throw new Error(NO_SOLUTION);
      if (X >= 90 && x <= y) throw new Error(NO_SOLUTION);

      const candidates: number[] = [];
      if (x < y && X < 90 && sinOther < 1) {
        // 双解：锐角 C 解在前
        const acute = Math.asin(sinOther) * RAD_TO_DEG;
        candidates.push(acute, 180 - acute);
      } else {
        candidates.push(Math.asin(Math.min(1, sinOther)) * RAD_TO_DEG);
      }

      const thirdSide = SIDE_KEYS.find((key) => key !== opposite && key !== otherSide);
      if (!thirdSide) throw new Error(MODE_ERROR);

      const solutions: TriangleResult[] = [];
      for (const otherAngle of candidates) {
        const thirdAngle = 180 - X - otherAngle;
        // 解出后任一角 ≤ 0 的退化解一律无解
        if (thirdAngle <= 0) continue;
        const thirdSideLength =
          (x * Math.sin(thirdAngle * DEG_TO_RAD)) / Math.sin(X * DEG_TO_RAD);
        if (!Number.isFinite(thirdSideLength) || thirdSideLength <= 0) continue;
        const sideValues: Record<SideKey, number> = { a: 0, b: 0, c: 0 };
        sideValues[opposite] = x;
        sideValues[otherSide] = y;
        sideValues[thirdSide] = thirdSideLength;
        try {
          solutions.push(fromSides(sideValues));
        } catch {
          // 该候选解退化：丢弃（全部候选退化时下方统一抛无解）
        }
      }
      if (solutions.length === 0) throw new Error(NO_SOLUTION);
      return { mode: 'SSA', solutions };
    }

    // SAS：角 X 的两邻边已知（如 {b,c,A}）→ 余弦定理求对边 x，再转 SSS
    const [s1, s2] = sides;
    if (!s1 || !s2) throw new Error(MODE_ERROR);
    const v1 = sideValue(s1);
    const v2 = sideValue(s2);
    const angle = angleValue(angleKey);
    const computed = Math.sqrt(
      v1 * v1 + v2 * v2 - 2 * v1 * v2 * Math.cos(angle * DEG_TO_RAD),
    );
    if (!Number.isFinite(computed) || computed <= 0) throw new Error(NO_SOLUTION);
    const sideValues: Record<SideKey, number> = { a: 0, b: 0, c: 0 };
    sideValues[opposite] = computed;
    sideValues[s1] = v1;
    sideValues[s2] = v2;
    return { mode: 'SAS', solutions: [fromSides(sideValues)] };
  }

  // 恰两角 + 恰一边 = ASA（边为夹角边）；边若为某已知角的对边则是 AAS → 非法
  if (provided.length === 3 && sides.length === 1 && angles.length === 2) {
    const [sideKey] = sides;
    const [angle1, angle2] = angles;
    if (!sideKey || !angle1 || !angle2) throw new Error(MODE_ERROR);
    if (sideKey.toUpperCase() === angle1 || sideKey.toUpperCase() === angle2) {
      throw new Error(MODE_ERROR);
    }
    const thirdAngle = 180 - angleValue(angle1) - angleValue(angle2);
    if (thirdAngle <= 0) throw new Error(NO_SOLUTION);
    const sinThird = Math.sin(thirdAngle * DEG_TO_RAD);
    const sideValues: Record<SideKey, number> = { a: 0, b: 0, c: 0 };
    for (const key of SIDE_KEYS) {
      if (key === sideKey) {
        sideValues[key] = sideValue(sideKey);
        continue;
      }
      const value =
        (sideValue(sideKey) * Math.sin(angleValue(key.toUpperCase() as AngleKey) * DEG_TO_RAD)) /
        sinThird;
      if (!Number.isFinite(value) || value <= 0) throw new Error(NO_SOLUTION);
      sideValues[key] = value;
    }
    return { mode: 'ASA', solutions: [fromSides(sideValues)] };
  }

  throw new Error(MODE_ERROR);
}
