/**
 * triangle.ts · 解三角形（W2-C1 实现：SSS——三边已知求三角/面积）
 * 公式：余弦定理 cos A = (b²+c²−a²)/(2bc)；海伦公式 S = √(s(s−a)(s−b)(s−c))。
 * 角度单位度（°），边长单位与输入一致。
 */
import type { TriangleInput, TriangleResult } from './types';

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
