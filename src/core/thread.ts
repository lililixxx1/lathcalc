/** thread.ts · 螺纹公式族 60°/55°/30°Tr/40°蜗杆（W2-C2 实现；W8-A 常数集导出 + 蜗杆几何） */
import type { ThreadDimensions, ThreadSpec, WormGeometry } from './types';

/**
 * 牙型常数集（WAVE-PLAN §4 头部冻结；types.ts 头注的唯一落点，W8-A G2 消双写）：
 * 60°：d2=d−0.6495P，d1=d−1.0825P，H1=0.5413P，d0=0.57735P；
 *      M=d2+3d0−0.866P（通式 1+csc30° / cot30°/2）
 * 55°：d2=d−0.6403P，d1=d−1.2806P，H1=0.6403P，d0=0.56371P；
 *      M=d2+3.1657d0−0.9605P（通式 1+csc27.5° / cot27.5°/2）
 * 30°Tr：d2=d−0.5P，H1=0.5P，d0=0.51764P；
 *      M=d2+4.8637d0−1.866P（通式 1+csc15° / cot15°/2，手册四位常数）
 * 40°蜗杆 ZA（GB/T 10087-2018 基本齿廓）：全齿高 h1=2.2m；px=π·m 由 wormGeometry 活算。
 * 改常数集 = 改验收语义，走 L2。
 */
export const PROFILE_CONSTANTS = {
  /** 60°：普通 M（GB/T 196）/ 美制 UN（ASME B1.1）/ 锥管 NPT（GB/T 12716） */
  deg60: {
    d2Factor: 0.6495,
    d1Factor: 1.0825,
    h1Factor: 0.5413,
    wireFactor: 0.57735,
    threeWireK1: 3,
    threeWireK2: 0.866,
  },
  /** 55°：非密封管 G（GB/T 7307）/ 密封管 R（GB/T 7306） */
  deg55: {
    d2Factor: 0.6403,
    d1Factor: 1.2806,
    h1Factor: 0.6403,
    wireFactor: 0.56371,
    threeWireK1: 3.1657,
    threeWireK2: 0.9605,
  },
  /** 30°：梯形 Tr（GB/T 5796.1，ac 档位见 trapezoidClearance） */
  deg30Tr: {
    d2Factor: 0.5,
    h1Factor: 0.5,
    wireFactor: 0.51764,
    threeWireK1: 4.8637,
    threeWireK2: 1.866,
  },
  /** 40°：蜗杆 ZA（GB/T 10087-2018；模数制，不走三针） */
  deg40Worm: {
    flankAngle: 40,
    wholeDepthFactor: 2.2,
  },
} as const;

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
 * 基本尺寸（PROFILE_CONSTANTS 为唯一常数源）：
 * 60°/55° 分支按牙型角路由；锥管族（sealpipe/npt）语义 = 基准平面处直径（V3-1），
 * 底孔取基面小径 d1（GB/T 7306/12716：d−1.2806P / d−1.0825P）；
 * 30°Tr 分支 d2=d−0.5P、H1=0.5P、d1=d−P−2ac、d0=0.51764P；
 * 其余族底孔统一按契约近似 d−P（材料修正由 UI 注记）。
 */
export function threadDimensions(spec: ThreadSpec): ThreadDimensions {
  const { major: d, pitch: p, flankAngle } = spec;
  const approxTapDrill = d - p;
  /** V3-1：密封锥管族底孔 = 基准平面处小径 */
  const sealedTaper = spec.family === 'sealpipe' || spec.family === 'npt';

  if (flankAngle === 60) {
    const c = PROFILE_CONSTANTS.deg60;
    const d2 = d - c.d2Factor * p;
    const d1 = d - c.d1Factor * p;
    return {
      d2,
      d1,
      h1: c.h1Factor * p,
      tapDrill: sealedTaper ? d1 : approxTapDrill,
      bestWire: c.wireFactor * p,
    };
  }

  if (flankAngle === 55) {
    const c = PROFILE_CONSTANTS.deg55;
    const d2 = d - c.d2Factor * p;
    const d1 = d - c.d1Factor * p;
    return {
      d2,
      d1,
      h1: c.h1Factor * p,
      tapDrill: sealedTaper ? d1 : approxTapDrill,
      bestWire: c.wireFactor * p,
    };
  }

  const c = PROFILE_CONSTANTS.deg30Tr;
  const ac = trapezoidClearance(p);
  return {
    d2: d - c.d2Factor * p,
    d1: d - p - 2 * ac,
    h1: c.h1Factor * p,
    tapDrill: approxTapDrill,
    bestWire: c.wireFactor * p,
  };
}

/**
 * 三针跨距 M = d2 + k1·d0 − k2·P（types.ts 契约；k1/k2 按牙型角，常数取自 PROFILE_CONSTANTS）。
 */
export function threeWireM(spec: ThreadSpec, wireDiameter: number): number {
  const { d2 } = threadDimensions(spec);
  const p = spec.pitch;

  if (spec.flankAngle === 60) {
    const c = PROFILE_CONSTANTS.deg60;
    return d2 + c.threeWireK1 * wireDiameter - c.threeWireK2 * p;
  }
  if (spec.flankAngle === 55) {
    const c = PROFILE_CONSTANTS.deg55;
    return d2 + c.threeWireK1 * wireDiameter - c.threeWireK2 * p;
  }
  const c = PROFILE_CONSTANTS.deg30Tr;
  return d2 + c.threeWireK1 * wireDiameter - c.threeWireK2 * p;
}

/**
 * 蜗杆几何（WAVE-PLAN-V3 §1/V3-2，W8-A 实现；契约冻结于 types.ts）：
 * px=π·m 活算（单一真源，数据表只存 m）、全齿高 h1=2.2·m（GB/T 10087-2018 基本齿廓）、
 * ZA 牙型角 40°（GB/T 10087）。蜗杆不走 threadDimensions/threeWireM（模数制，三针 v0.2.1 不做）。
 * m≤0 或非有限数抛错（不臆造）。
 */
export function wormGeometry(moduleMM: number): WormGeometry {
  if (!Number.isFinite(moduleMM) || moduleMM <= 0) {
    throw new Error(`wormGeometry: 模数必须为大于 0 的有限数，收到 moduleMM=${moduleMM}`);
  }
  const c = PROFILE_CONSTANTS.deg40Worm;
  return {
    axialPitch: Math.PI * moduleMM,
    wholeDepth: c.wholeDepthFactor * moduleMM,
    flankAngle: c.flankAngle,
  };
}
