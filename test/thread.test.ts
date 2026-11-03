/**
 * W2-C2 螺纹公式族测试（60° 普通 / 55° 管 / 30° Tr 梯形）
 *
 * 常数集 = WAVE-PLAN §4 头部冻结集（不使用无理数精确式）：
 *   60°：d2=d−0.6495P，d1=d−1.0825P，H1=0.5413P，d0=0.57735P，
 *        M=d2+3d0−0.866P
 *   55°：d2=d−0.6403P，d1=d−1.2806P，H1=0.6403P，
 *        d0=0.56371P（types.ts 契约值），M=d2+3.1657d0−0.9605P
 *   30°Tr：d2=d−0.5P，H1=0.5P，d0=0.51764P，M=d2+4.8637d0−1.866P；
 *        外螺纹小径 d1=d−P−2ac（GB/T 5796.1 牙顶间隙 ac）
 *
 * 三针公式通式（牙型角 α，半角 β=α/2）：
 *   M = d2 + d0(1+cscβ) − (P/2)cotβ
 *   60°：1+csc30°=3，cot30°/2=0.866025…→0.866（冻结）
 *   55°：1+csc27.5°=3.165680…→3.1657，cot27.5°/2=0.960500…→0.9605（冻结）
 *   30°：1+csc15°=4.863703…→4.8637，cot15°/2=1.866025…→1.866（手册四位常数）
 * 最佳针径通式 d0=P/(2cosβ)：60°→0.57735P，55°→0.563692P（契约取 0.56371P），
 *   30°→0.517638P（取 0.51764P）。
 */
import { describe, it, expect } from 'vitest';
import { threadDimensions, threeWireM } from '../src/core/thread';
import type { ThreadSpec } from '../src/core/types';

const metric = (designation: string, major: number, pitch: number): ThreadSpec => ({
  family: 'metric',
  designation,
  pitch,
  major,
  flankAngle: 60,
});

const pipe55 = (designation: string, major: number, pitch: number): ThreadSpec => ({
  family: 'pipe55',
  designation,
  pitch,
  major,
  flankAngle: 55,
});

const trapezoid = (designation: string, major: number, pitch: number): ThreadSpec => ({
  family: 'trapezoid',
  designation,
  pitch,
  major,
  flankAngle: 30,
});

describe('W2-C2 · 60° 普通螺纹（冻结常数集）', () => {
  it('A. M30×2：d2/d1/底孔（WAVE-PLAN §4 #1）', () => {
    const spec = metric('M30×2', 30, 2);
    const dims = threadDimensions(spec);

    // d2 = d − 0.6495P = 30 − 0.6495×2 = 30 − 1.299 = 28.701
    expect(dims.d2).toBeCloseTo(28.701, 6);
    expect(dims.d2.toFixed(6)).toBe('28.701000');
    expect(dims.d2.toFixed(3)).toBe('28.701');

    // d1 = d − 1.0825P = 30 − 1.0825×2 = 30 − 2.165 = 27.835
    expect(dims.d1).toBeCloseTo(27.835, 6);
    expect(dims.d1.toFixed(6)).toBe('27.835000');
    expect(dims.d1.toFixed(3)).toBe('27.835');

    // 底孔 = d − P = 30 − 2 = 28.0（契约近似口径，材料修正由 UI 注记）
    expect(dims.tapDrill).toBeCloseTo(28.0, 6);
    expect(dims.tapDrill.toFixed(1)).toBe('28.0');

    // H1 = 0.5413P = 0.5413×2 = 1.0826；d0 = 0.57735P = 0.57735×2 = 1.1547
    expect(dims.h1).toBeCloseTo(1.0826, 6);
    expect(dims.bestWire).toBeCloseTo(1.1547, 6);
  });

  it('B. 三针 M30×2（d0=1.1547）：M=30.4331 → 30.433（WAVE-PLAN §4 #2 勘误冻结值）', () => {
    const spec = metric('M30×2', 30, 2);

    // d2 = 28.701（A 已证）
    // M = d2 + 3d0 − 0.866P = 28.701 + 3×1.1547 − 0.866×2
    //   = 28.701 + 3.4641 − 1.732 = 30.4331
    // 报告 §6.4 原值为舍入误，WAVE-PLAN §4 #2 已勘误冻结 30.433；本测试只断言冻结值。
    const m = threeWireM(spec, 1.1547);
    expect(m).toBeCloseTo(30.4331, 6);
    expect(m.toFixed(6)).toBe('30.433100');
    expect(m.toFixed(3)).toBe('30.433');

    // 非最佳针径校验 wireDiameter 参数确实生效：
    // d0=1.0 → M = 28.701 + 3×1 − 0.866×2 = 28.701 + 3 − 1.732 = 29.969
    expect(threeWireM(spec, 1.0)).toBeCloseTo(29.969, 6);
  });

  it('C. M30×3.5：d2/d1/最佳针/三针 M（WAVE-PLAN §4 #7）', () => {
    const spec = metric('M30×3.5', 30, 3.5);
    const dims = threadDimensions(spec);

    // d2 = 30 − 0.6495×3.5 = 30 − 2.27325 = 27.72675
    expect(dims.d2).toBeCloseTo(27.72675, 6);
    expect(dims.d2.toFixed(6)).toBe('27.726750');
    expect(dims.d2.toFixed(3)).toBe('27.727');

    // d1 = 30 − 1.0825×3.5 = 30 − 3.78875 = 26.21125
    expect(dims.d1).toBeCloseTo(26.21125, 6);
    expect(dims.d1.toFixed(6)).toBe('26.211250');
    expect(dims.d1.toFixed(3)).toBe('26.211');

    // 底孔 = 30 − 3.5 = 26.5
    expect(dims.tapDrill).toBeCloseTo(26.5, 6);
    expect(dims.tapDrill.toFixed(1)).toBe('26.5');

    // H1 = 0.5413P = 0.5413×3.5 = 1.89455
    expect(dims.h1).toBeCloseTo(1.89455, 6);

    // d0 = 0.57735×3.5 = 2.020725
    expect(dims.bestWire).toBeCloseTo(2.020725, 6);
    expect(dims.bestWire.toFixed(3)).toBe('2.021');

    // M = 27.72675 + 3×2.020725 − 0.866×3.5
    //   = 27.72675 + 6.062175 − 3.031 = 30.757925
    const m = threeWireM(spec, dims.bestWire);
    expect(m).toBeCloseTo(30.757925, 6);
    expect(m.toFixed(3)).toBe('30.758');
  });
});

describe('W2-C2 · 55° 管螺纹（GB/T 7306；冻结常数 0.6403/1.2806/3.1657/0.9605）', () => {
  it('D1. G1/2（14 tpi → P=25.4/14；d=20.955）', () => {
    // GB/T 7306（ISO 7-1）G1/2 基本尺寸：大径 d=20.955 mm，14 tpi。
    // P = 25.4/14 = 1.814285714…（types.ts：管螺纹按 tpi 换算）
    const spec = pipe55('G1/2', 20.955, 25.4 / 14);
    const dims = threadDimensions(spec);

    // d2 = d − 0.6403P = 20.955 − 0.6403×1.814285714… = 19.793312857… → 19.793
    expect(dims.d2).toBeCloseTo(19.793312857, 6);
    expect(dims.d2.toFixed(6)).toBe('19.793313');
    expect(dims.d2.toFixed(3)).toBe('19.793');

    // d1 = d − 1.2806P = 20.955 − 1.2806×1.814285714… = 18.631625714… → 18.632
    expect(dims.d1).toBeCloseTo(18.631625714, 6);
    expect(dims.d1.toFixed(6)).toBe('18.631626');
    expect(dims.d1.toFixed(3)).toBe('18.632');

    // H1 = 0.6403P = 0.6403×1.814285714… = 1.161687143… → 1.162
    expect(dims.h1).toBeCloseTo(1.161687143, 6);
    expect(dims.h1.toFixed(3)).toBe('1.162');

    // 底孔按契约近似 d−P = 20.955 − 1.814285714… = 19.140714286…
    // （非管螺纹实际攻丝底孔；实际值按密封管螺纹标准另表，UI 注记，不在本卡范围）
    expect(dims.tapDrill).toBeCloseTo(19.140714286, 6);
    expect(dims.tapDrill.toFixed(3)).toBe('19.141');

    // d0 = 0.56371P = 0.56371×1.814285714… = 1.022731 → 1.023
    expect(dims.bestWire).toBeCloseTo(1.022731, 6);
    expect(dims.bestWire.toFixed(3)).toBe('1.023');

    // M = d2 + 3.1657d0 − 0.9605P
    //   = 19.793312857… + 3.1657×1.022731 − 0.9605×1.814285714…
    //   = 19.793312857… + 3.237659527… − 1.742621429…
    //   = 21.288350955… → 21.288
    const m = threeWireM(spec, dims.bestWire);
    expect(m).toBeCloseTo(21.288350955, 6);
    expect(m.toFixed(6)).toBe('21.288351');
    expect(m.toFixed(3)).toBe('21.288');

    // 非最佳针径校验 wireDiameter 参数确实生效：
    // d0=1.0 → 19.793312857… + 3.1657×1 − 0.9605×1.814285714…
    //        = 19.793312857… + 3.1657 − 1.742621429… = 21.216391429…
    expect(threeWireM(spec, 1.0)).toBeCloseTo(21.216391429, 6);
  });

  it('D2. G1（11 tpi → P=25.4/11；d=33.249）', () => {
    // GB/T 7306（ISO 7-1）G1 基本尺寸：大径 d=33.249 mm，11 tpi。
    // P = 25.4/11 = 2.309090909…
    const spec = pipe55('G1', 33.249, 25.4 / 11);
    const dims = threadDimensions(spec);

    // d2 = 33.249 − 0.6403×2.309090909… = 31.770489091… → 31.770
    expect(dims.d2).toBeCloseTo(31.770489091, 6);
    expect(dims.d2.toFixed(6)).toBe('31.770489');
    expect(dims.d2.toFixed(3)).toBe('31.770');

    // d1 = 33.249 − 1.2806×2.309090909… = 30.291978182… → 30.292
    expect(dims.d1).toBeCloseTo(30.291978182, 6);
    expect(dims.d1.toFixed(6)).toBe('30.291978');
    expect(dims.d1.toFixed(3)).toBe('30.292');

    // H1 = 0.6403×2.309090909… = 1.478510909… → 1.479
    expect(dims.h1).toBeCloseTo(1.478510909, 6);
    expect(dims.h1.toFixed(3)).toBe('1.479');

    // 底孔按契约近似 d−P = 33.249 − 2.309090909… = 30.939909091…
    expect(dims.tapDrill).toBeCloseTo(30.939909091, 6);
    expect(dims.tapDrill.toFixed(3)).toBe('30.940');

    // d0 = 0.56371×2.309090909… = 1.301657636… → 1.302
    expect(dims.bestWire).toBeCloseTo(1.301657636, 6);
    expect(dims.bestWire.toFixed(3)).toBe('1.302');

    // M = 31.770489091… + 3.1657×1.301657636… − 0.9605×2.309090909…
    //   = 31.770489091… + 4.120657579… − 2.217881818…
    //   = 33.673264852… → 33.673
    const m = threeWireM(spec, dims.bestWire);
    expect(m).toBeCloseTo(33.673264852, 6);
    expect(m.toFixed(6)).toBe('33.673265');
    expect(m.toFixed(3)).toBe('33.673');
  });
});

describe('W2-C2 · 30° Tr 梯形螺纹（GB/T 5796）', () => {
  it('D3. Tr40×7（P=7，ac=0.5）：d2/d1/H1/底孔/三针', () => {
    // GB/T 5796.1：H1=0.5P=3.5；牙顶间隙 ac=0.5（P=6–12 行）。
    const spec = trapezoid('Tr40×7', 40, 7);
    const dims = threadDimensions(spec);

    // d2 = d − 0.5P = 40 − 3.5 = 36.5
    expect(dims.d2).toBeCloseTo(36.5, 6);
    expect(dims.d2.toFixed(3)).toBe('36.500');

    // 外螺纹小径 d1 = d − P − 2ac = 40 − 7 − 2×0.5 = 32.0
    expect(dims.d1).toBeCloseTo(32.0, 6);
    expect(dims.d1.toFixed(3)).toBe('32.000');

    // H1 = 0.5P = 3.5
    expect(dims.h1).toBeCloseTo(3.5, 6);

    // 攻丝底孔按契约近似 d−P = 33.0；与 GB/T 5796 内螺纹小径 D1=d−P 一致
    expect(dims.tapDrill).toBeCloseTo(33.0, 6);
    expect(dims.tapDrill.toFixed(3)).toBe('33.000');

    // d0 = 0.51764P = 0.51764×7 = 3.62348
    expect(dims.bestWire).toBeCloseTo(3.62348, 6);
    expect(dims.bestWire.toFixed(3)).toBe('3.623');

    // M = d2 + 4.8637d0 − 1.866P
    //   = 36.5 + 4.8637×3.62348 − 1.866×7
    //   = 36.5 + 17.623519676 − 13.062 = 41.061519676 → 41.062
    const m = threeWireM(spec, dims.bestWire);
    expect(m).toBeCloseTo(41.061519676, 6);
    expect(m.toFixed(6)).toBe('41.061520');
    expect(m.toFixed(3)).toBe('41.062');

    // 非最佳针径校验 wireDiameter 参数确实生效：
    // d0=3.0 → M = 36.5 + 4.8637×3 − 1.866×7 = 36.5 + 14.5911 − 13.062 = 38.0291
    expect(threeWireM(spec, 3.0)).toBeCloseTo(38.0291, 6);
  });

  it('D4. Tr20×4（P=4，ac=0.25）：d2/d1/H1/底孔/三针', () => {
    // GB/T 5796.1：H1=0.5P=2；牙顶间隙 ac=0.25（P=2–5 行）。
    const spec = trapezoid('Tr20×4', 20, 4);
    const dims = threadDimensions(spec);

    // d2 = 20 − 0.5×4 = 18.0
    expect(dims.d2).toBeCloseTo(18.0, 6);
    expect(dims.d2.toFixed(3)).toBe('18.000');

    // d1 = 20 − 4 − 2×0.25 = 15.5
    expect(dims.d1).toBeCloseTo(15.5, 6);
    expect(dims.d1.toFixed(3)).toBe('15.500');

    // H1 = 0.5×4 = 2.0
    expect(dims.h1).toBeCloseTo(2.0, 6);

    // 底孔 = d−P = 16.0（= 内螺纹小径 D1）
    expect(dims.tapDrill).toBeCloseTo(16.0, 6);
    expect(dims.tapDrill.toFixed(3)).toBe('16.000');

    // d0 = 0.51764×4 = 2.07056
    expect(dims.bestWire).toBeCloseTo(2.07056, 6);
    expect(dims.bestWire.toFixed(3)).toBe('2.071');

    // M = 18.0 + 4.8637×2.07056 − 1.866×4
    //   = 18.0 + 10.070582672 − 7.464 = 20.606582672 → 20.607
    const m = threeWireM(spec, dims.bestWire);
    expect(m).toBeCloseTo(20.606582672, 6);
    expect(m.toFixed(6)).toBe('20.606583');
    expect(m.toFixed(3)).toBe('20.607');
  });

  it('D5. Tr8×1.5（P=1.5，ac=0.15）：d2/d1/H1/底孔/三针', () => {
    // GB/T 5796.1：H1=0.5P=0.75；牙顶间隙 ac=0.15（P=1.5 行）。
    const spec = trapezoid('Tr8×1.5', 8, 1.5);
    const dims = threadDimensions(spec);

    // d2 = 8 − 0.5×1.5 = 7.25
    expect(dims.d2).toBeCloseTo(7.25, 6);
    expect(dims.d2.toFixed(3)).toBe('7.250');

    // d1 = 8 − 1.5 − 2×0.15 = 6.2
    expect(dims.d1).toBeCloseTo(6.2, 6);
    expect(dims.d1.toFixed(3)).toBe('6.200');

    // H1 = 0.5×1.5 = 0.75
    expect(dims.h1).toBeCloseTo(0.75, 6);

    // 底孔 = 8 − 1.5 = 6.5（= 内螺纹小径 D1）
    expect(dims.tapDrill).toBeCloseTo(6.5, 6);
    expect(dims.tapDrill.toFixed(3)).toBe('6.500');

    // d0 = 0.51764×1.5 = 0.77646
    expect(dims.bestWire).toBeCloseTo(0.77646, 6);
    expect(dims.bestWire.toFixed(3)).toBe('0.776');

    // M = 7.25 + 4.8637×0.77646 − 1.866×1.5
    //   = 7.25 + 3.776468502 − 2.799 = 8.227468502 → 8.227
    const m = threeWireM(spec, dims.bestWire);
    expect(m).toBeCloseTo(8.227468502, 6);
    expect(m.toFixed(6)).toBe('8.227469');
    expect(m.toFixed(3)).toBe('8.227');
  });
});
