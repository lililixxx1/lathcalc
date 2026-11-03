/** thread.ts · 螺纹公式族 60°/55°/30°Tr（W2-C2 实现；常数集见 types.ts 头注） */
import type { ThreadSpec, ThreadDimensions } from './types';

/**
 * GB/T 5796.1（ISO 2901 同值）梯形螺纹牙顶间隙 ac：
 * P=1.5 → 0.15；P=2–5 → 0.25；P=6–12 → 0.5；P=14–44 → 1.0。
 * 外螺纹牙高 h3 = H1 + ac = 0.5P + ac，故外螺纹小径 d1 = d − 2h3 = d − P − 2ac。
 */
function trapezoidClearance(pitch: number): number {
  if (pitch <= 1.5) return 0.15;
  if (pitch <= 5) return 0.25;
  if (pitch <= 12) return 0.5;
  return 1.0;
}

/**
 * 基本尺寸（WAVE-PLAN §4 头部冻结常数集）：
 * 60°：d2=d−0.6495P，d1=d−1.0825P，H1=0.5413P，d0=0.57735P
 * 55°：d2=d−0.6403P，d1=d−1.2806P，H1=0.6403P，d0=0.56371P（types.ts 契约值）
 * 30°Tr：d2=d−0.5P，H1=0.5P，d1=d−P−2ac，d0=0.51764P
 * 底孔统一按契约近似 d−P（材料修正由 UI 注记）。
 */
export function threadDimensions(spec: ThreadSpec): ThreadDimensions {
  const { major: d, pitch: p, flankAngle } = spec;
  const tapDrill = d - p;

  if (flankAngle === 60) {
    return {
      d2: d - 0.6495 * p,
      d1: d - 1.0825 * p,
      h1: 0.5413 * p,
      tapDrill,
      bestWire: 0.57735 * p,
    };
  }

  if (flankAngle === 55) {
    return {
      d2: d - 0.6403 * p,
      d1: d - 1.2806 * p,
      h1: 0.6403 * p,
      tapDrill,
      bestWire: 0.56371 * p,
    };
  }

  const ac = trapezoidClearance(p);
  return {
    d2: d - 0.5 * p,
    d1: d - p - 2 * ac,
    h1: 0.5 * p,
    tapDrill,
    bestWire: 0.51764 * p,
  };
}

/**
 * 三针跨距 M = d2 + k1·d0 − k2·P（types.ts 契约；k1/k2 按牙型角）：
 * 60°：k1=3，k2=0.866（通式 1+csc30° / cot30°/2）
 * 55°：k1=3.1657，k2=0.9605（通式 1+csc27.5° / cot27.5°/2）
 * 30°Tr：k1=4.8637，k2=1.866（通式 1+csc15° / cot15°/2，手册四位常数）
 */
export function threeWireM(spec: ThreadSpec, wireDiameter: number): number {
  const { d2 } = threadDimensions(spec);
  const p = spec.pitch;

  if (spec.flankAngle === 60) return d2 + 3 * wireDiameter - 0.866 * p;
  if (spec.flankAngle === 55) return d2 + 3.1657 * wireDiameter - 0.9605 * p;
  return d2 + 4.8637 * wireDiameter - 1.866 * p;
}
