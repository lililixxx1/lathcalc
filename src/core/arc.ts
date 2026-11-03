/**
 * arc.ts · 切点共享几何助手（Lead 预置；W2-C4/C5 只用不改）
 * 坐标：X 直径制、Z 线性。判向：前刀架为默认，后刀架翻转 G02↔G03。
 */
import type { Vec2, ArcCaseId, ArcCaseSolver } from './types';

/** 两点距离（Z 与 X 半径混合空间内使用时，调用方先除 2——本函数只做欧氏距离） */
export function dist(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

/** 点 P 到直线（过点 L、方向单位向量 d）的垂足 */
export function perpendicularFoot(p: Vec2, linePoint: Vec2, dirUnit: Vec2): Vec2 {
  const t = (p.x - linePoint.x) * dirUnit.x + (p.z - linePoint.z) * dirUnit.z;
  return { x: linePoint.x + t * dirUnit.x, z: linePoint.z + t * dirUnit.z };
}

/** 单位向量 */
export function unit(dx: number, dz: number): Vec2 {
  const len = Math.hypot(dx, dz);
  if (len === 0) throw new Error('PANIC: zero-length direction vector');
  return { x: dx / len, z: dz / len };
}

/**
 * 判向：给定圆心、圆弧起点、终点与刀架方位，返回 G02/G03。
 * 视图约定（FANUC G18，车床标准图）：X 朝上（直径）、Z 朝右，自 +Y（操作者一侧）看——
 * 该图相对数学系（x 右 z 上）是转置系，定向翻转，故数学正叉积 = 车床顺时针。
 * 前刀架：顺时针 = G02；rearToolPost = true（后刀架）时翻转。
 * （C-02 修复：G2 见证 12 点→3 点前刀架必为 G02，绝对方向金测见 test/skeleton.test.ts）
 */
export function judgeArcDirection(
  center: Vec2,
  start: Vec2,
  end: Vec2,
  rearToolPost = false,
): 'G02' | 'G03' {
  const cross =
    (start.x - center.x) * (end.z - center.z) -
    (start.z - center.z) * (end.x - center.x);
  const cw = cross > 0; // 车床转置系：数学正叉积 = 图面顺时针
  const g02 = rearToolPost ? !cw : cw;
  return g02 ? 'G02' : 'G03';
}

/** 度 → 度分秒（秒四舍五入；进位借位处理） */
export function degToDMS(deg: number): string {
  const sign = deg < 0 ? '-' : '';
  const abs = Math.abs(deg);
  let d = Math.floor(abs);
  let m = Math.floor((abs - d) * 60);
  let s = Math.round(((abs - d) * 60 - m) * 60);
  if (s === 60) { s = 0; m += 1; }
  if (m === 60) { m = 0; d += 1; }
  return `${sign}${d}°${m}′${s}″`;
}

/** 工况注册表（W2-C4/C5 落实现后由各自文件填充导出；此处仅类型中枢） */
export type { ArcCaseId, ArcCaseSolver };
