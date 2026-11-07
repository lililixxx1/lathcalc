/**
 * WAVE-PLAN-V4.9 §3 A 卡金锚 · thread-figure 牙型剖面视图模型测试
 *
 * 期望值全部按公式代入实际入参独立复算（测试本地重写 k/宽度公式，不 import 实现
 * 内部常数、不锚计划字面数）。构造链（V4.9-02 冻结）与本地复算式：
 *   d₂/d₁ 内联复算（与 core/thread.ts PROFILE_CONSTANTS 同式）：60° d−0.6495P / d−1.0825P；
 *   55° d−0.6403P / d−1.2806P；30°Tr d−0.5P / d−P−2ac（ac=0.5，5<P≤12 档）；
 *   k = min(200/(2.5P), 96/(d−d₁))；蜗杆 k = min(200/(2.5px), 96/h₁)，px=π·m、h₁=2.2m；
 *   x0 = (220−2.5P·k)/2；牙顶线 y = 64−(d−d₁)/2·k（蜗杆 = 64−m·k）；
 *   d₂ 线 y = 牙顶 + (d−d₂)·k（构造链，蜗杆分度线 = 64）；牙底线 y = 64+(d−d₁)/2·k
 *   （蜗杆 = 64+1.2m·k）；
 *   w_crest = P/2−(d−d₂)·tan(α/2)、w_root = P/2−(d₂−d₁)·tan(α/2)；蜗杆 px/2−2m·tan20°、
 *   px/2−2.4m·tan20°（tan 值由测试本地活算）。
 *
 * 与计划 §3 字面锚的两处既知出入（派工单明示按实际入参/公式复算，证据档披露上报）：
 *   ① G1/2、sealpipe 入参取数据行真 pitch=25.4/14=1.8142857…（≠计划字面 1.814），
 *      k=41.3192（高度约束）、x0=16.2939、横向 187.4122u；
 *   ② 计划 M10「d₂ 线 38.02」/ Tr「d₂ 线 44.00」与其自身牙顶/牙根值及构造链矛盾
 *      （半距误置）：构造链自洽值 M10=72.66、Tr=58.29（=牙顶+(d−d₂)·k，
 *      与计划自身牙顶 20.70/18.29、牙根 107.30/109.71 链内一致）。
 */
import { describe, expect, it } from 'vitest';
import {
  THREAD_FIGURE_VIEW,
  buildThreadFigure,
  type ThreadFigureInput,
  type ThreadFigureView,
} from '../src/core/thread-figure';

const CY = 64; // 牙型带竖向居中 / 蜗杆分度线（V4.9-02）
const W = 220;
const BAND_W = 200; // 宽度预算 10..210
const BAND_H = 96; // 高度预算
const T30 = Math.tan((30 * Math.PI) / 180);
const T27_5 = Math.tan((27.5 * Math.PI) / 180);
const T15 = Math.tan((15 * Math.PI) / 180);
const T20 = Math.tan((20 * Math.PI) / 180);

function pt(view: ThreadFigureView, index: number): { x: number; y: number } {
  const point = view.profile[index];
  if (!point) throw new Error(`profile[${index}] 不存在`);
  return point;
}

function expectClose(actual: number | undefined, expected: number, digits = 4): void {
  expect(actual).toBeDefined();
  expect(actual).toBeCloseTo(expected, digits);
}

/** 非法字段的测试构造（绕开编译期字面量类型检查，运行期校验由实现负责）。 */
function malformed(value: Record<string, unknown>): ThreadFigureInput {
  return value as unknown as ThreadFigureInput;
}

// ===== 本地复算：M10×1.5（metric 60°）=====
// d₂ = 10−0.6495×1.5 = 9.02575；d₁ = 10−1.0825×1.5 = 8.37625
const M10_D2 = 10 - 0.6495 * 1.5;
const M10_D1 = 10 - 1.0825 * 1.5;
// k = min(200/3.75, 96/1.62375) = min(53.3333, 59.1172) = 53.3333（宽度约束，恰满幅 10→210）
const M10_K = Math.min(BAND_W / (2.5 * 1.5), BAND_H / (10 - M10_D1));
const M10_X0 = (W - 2.5 * 1.5 * M10_K) / 2; // 10
const M10_Y_TOP = CY - ((10 - M10_D1) / 2) * M10_K; // 20.70
const M10_Y_MID = M10_Y_TOP + (10 - M10_D2) * M10_K; // 72.66（构造链）
const M10_Y_BOT = CY + ((10 - M10_D1) / 2) * M10_K; // 107.30
const M10_CREST_PX = (1.5 / 2 - (10 - M10_D2) * T30) * M10_K; // P/8·k = 10.00u
const M10_ROOT_PX = (1.5 / 2 - (M10_D2 - M10_D1) * T30) * M10_K; // P/4·k = 20.00u

// ===== 本地复算：Tr40×7（30°，ac=0.5 档 5<P≤12）=====
// d₂ = 40−0.5×7 = 36.5；d₁ = 40−7−2×0.5 = 32
const TR_D2 = 40 - 0.5 * 7;
const TR_D1 = 40 - 7 - 2 * 0.5;
// k = min(200/17.5, 96/8) = min(11.4286, 12) = 11.4286（宽度约束）
const TR_K = Math.min(BAND_W / (2.5 * 7), BAND_H / (40 - TR_D1));
const TR_X0 = (W - 2.5 * 7 * TR_K) / 2; // 10
const TR_Y_TOP = CY - ((40 - TR_D1) / 2) * TR_K; // 18.2857
const TR_Y_MID = TR_Y_TOP + (40 - TR_D2) * TR_K; // 58.2857（构造链）
const TR_Y_BOT = CY + ((40 - TR_D1) / 2) * TR_K; // 109.7143
const TR_CREST_PX = (7 / 2 - (40 - TR_D2) * T15) * TR_K; // 2.56218mm → 29.2820u
const TR_ROOT_PX = (7 / 2 - (TR_D2 - TR_D1) * T15) * TR_K; // 2.29423mm → 26.2198u

// ===== 本地复算：G1/2（pipe55，数据行真 pitch = 25.4/14）=====
// d₂ = 20.955−0.6403P = 19.79331286；d₁ = 20.955−1.2806P = 18.63162571
const G_P = 25.4 / 14;
const G_D2 = 20.955 - 0.6403 * G_P;
const G_D1 = 20.955 - 1.2806 * G_P;
// k = min(200/4.5357, 96/2.32337) = min(44.0945, 41.3192) = 41.3192（高度约束，横向不满幅）
const G_K = Math.min(BAND_W / (2.5 * G_P), BAND_H / (20.955 - G_D1));
const G_X0 = (W - 2.5 * G_P * G_K) / 2; // 16.2939
const G_Y_TOP = CY - ((20.955 - G_D1) / 2) * G_K; // 16.0000（高度约束恰满 96）
const G_Y_MID = G_Y_TOP + (20.955 - G_D2) * G_K; // 64.0000（55°：d−d₂ = d₂−d₁ → d₂ 线恰在带中）
const G_Y_BOT = CY + ((20.955 - G_D1) / 2) * G_K; // 112.0000
const G_CREST_PX = (G_P / 2 - (20.955 - G_D2) * T27_5) * G_K; // 0.302407mm → 12.4952u
const G_ROOT_PX = (G_P / 2 - (G_D2 - G_D1) * T27_5) * G_K; // 55° 对称同值 12.4952u

// ===== 本地复算：蜗杆 m=2（px=π·m、h₁=2.2m、α=40°，core/thread.wormGeometry 同式）=====
const WM = 2;
const W_PX = Math.PI * WM; // 6.2831853
const W_H1 = 2.2 * WM; // 4.4
// k = min(200/15.7080, 96/4.4) = min(12.7324, 21.8182) = 12.7324（宽度约束）
const W_K = Math.min(BAND_W / (2.5 * W_PX), BAND_H / W_H1);
const W_X0 = (W - 2.5 * W_PX * W_K) / 2; // 10
const W_Y_TIP = CY - WM * W_K; // 38.5352
const W_Y_ROOT = CY + 1.2 * WM * W_K; // 94.5578（= 64+(h₁−m)·k 派生同值）
const W_CREST_PX = (W_PX / 2 - 2 * WM * T20) * W_K; // 1.68571mm → 21.4631u
const W_ROOT_PX = (W_PX / 2 - 2.4 * WM * T20) * W_K; // 1.39454mm → 17.7558u

describe('thread-figure §3 A 卡金锚', () => {
  it('M10×1.5（60°）：k=53.3333 宽度约束，三线/轮廓/宽度/标注逐值', () => {
    const view = buildThreadFigure({ kind: 'thread', major: 10, pitch: 1.5, flankAngle: 60 });
    expect(THREAD_FIGURE_VIEW).toEqual({ width: 220, height: 140 });
    expect(view.profile).toHaveLength(12);

    // 三条直径线（d₂ 线按构造链 = 牙顶+(d−d₂)·k；计划字面 38.02 系半距误置，见头注②）
    expectClose(view.diameterLines[0]?.y, M10_Y_TOP);
    expectClose(view.diameterLines[1]?.y, M10_Y_MID);
    expectClose(view.diameterLines[2]?.y, M10_Y_BOT);
    expect(view.diameterLines.map((line) => line.label)).toEqual([
      'd 10.000',
      'd₂ 9.026',
      'd₁ 8.376',
    ]);

    // 轮廓：左缘半槽根平 → 三牙顶平交替 → 右缘半牙收于牙顶线
    expectClose(pt(view, 0).x, M10_X0);
    expectClose(pt(view, 0).y, M10_Y_BOT);
    expectClose(pt(view, 1).x, M10_X0 + M10_ROOT_PX / 2);
    expectClose(pt(view, 1).y, M10_Y_BOT);
    expectClose(pt(view, 2).x, M10_X0 + 0.5 * 1.5 * M10_K - M10_CREST_PX / 2);
    expectClose(pt(view, 2).y, M10_Y_TOP);
    expectClose(pt(view, 3).x, M10_X0 + 0.5 * 1.5 * M10_K + M10_CREST_PX / 2);
    expectClose(pt(view, 3).y, M10_Y_TOP);
    // 牙顶中心 x=50/130/210、槽中心 x=10/90/170（计划 §3；P·k=80.00）
    expectClose((pt(view, 2).x + pt(view, 3).x) / 2, M10_X0 + 0.5 * 1.5 * M10_K);
    expectClose((pt(view, 6).x + pt(view, 7).x) / 2, M10_X0 + 1.5 * 1.5 * M10_K);
    // 末牙牙顶中心在右缘 210，平半被带缘裁去：p10 = 中心−半宽、p11 = 右缘
    expectClose(pt(view, 10).x, M10_X0 + 2.5 * 1.5 * M10_K - M10_CREST_PX / 2);
    expectClose(pt(view, 11).x, M10_X0 + 2.5 * 1.5 * M10_K);
    // 牙顶宽 10.00u（0.125011P·k，计划字面 10.00u 为教科书 P/8·k 的 2 位呈现）、牙底宽 20.00u（0.249987P·k）
    expectClose(pt(view, 3).x - pt(view, 2).x, M10_CREST_PX);
    expectClose(pt(view, 5).x - pt(view, 4).x, M10_ROOT_PX);
    expectClose(pt(view, 4).x, M10_X0 + 1 * 1.5 * M10_K - M10_ROOT_PX / 2);
    expectClose(pt(view, 4).y, M10_Y_BOT);
    expectClose(pt(view, 10).y, M10_Y_TOP);

    // P 双箭头：首两相邻牙顶间，跨距 80.00u；α 文字标签
    expectClose(view.pitchMark.x1, M10_X0 + 0.5 * 1.5 * M10_K);
    expectClose(view.pitchMark.x2, M10_X0 + 1.5 * 1.5 * M10_K);
    expectClose(view.pitchMark.x2 - view.pitchMark.x1, 80, 4);
    expect(view.pitchMark.label).toBe('P 1.5');
    expect(view.flankMark.label).toBe('α 60°');
    expect(view.gaugeLine).toBeNull();
  });

  it('Tr40×7（30°，ac=0.5）：k=11.4286 宽度约束，牙顶 29.28u/牙底 26.22u', () => {
    const view = buildThreadFigure({ kind: 'thread', major: 40, pitch: 7, flankAngle: 30 });
    expectClose(view.diameterLines[0]?.y, TR_Y_TOP);
    expectClose(view.diameterLines[1]?.y, TR_Y_MID);
    expectClose(view.diameterLines[2]?.y, TR_Y_BOT);
    expect(view.diameterLines.map((line) => line.label)).toEqual([
      'd 40.000',
      'd₂ 36.500',
      'd₁ 32.000',
    ]);
    // 牙顶宽 =3.5−3.5·tan15° = 2.56218mm → 29.2820u；牙底宽 =3.5−4.5·tan15° → 26.2198u
    expectClose(pt(view, 3).x - pt(view, 2).x, TR_CREST_PX);
    expectClose(pt(view, 5).x - pt(view, 4).x, TR_ROOT_PX);
    expect(view.profile).toHaveLength(12);
    expectClose(pt(view, 0).x, TR_X0);
    expectClose(pt(view, 11).x, TR_X0 + 2.5 * 7 * TR_K);
    expectClose(view.pitchMark.x2 - view.pitchMark.x1, 7 * TR_K, 4); // 80.00u
    expect(view.pitchMark.label).toBe('P 7');
    expect(view.flankMark.label).toBe('α 30°');
  });

  it('G1/2（55°，数据行真 pitch=25.4/14）：k=41.3192 高度约束不满幅，x0=16.2940', () => {
    const view = buildThreadFigure({
      kind: 'thread',
      major: 20.955,
      pitch: 25.4 / 14,
      flankAngle: 55,
    });
    expectClose(view.diameterLines[0]?.y, G_Y_TOP);
    expectClose(view.diameterLines[1]?.y, G_Y_MID);
    expectClose(view.diameterLines[2]?.y, G_Y_BOT);
    expect(view.diameterLines.map((line) => line.label)).toEqual([
      'd 20.955',
      'd₂ 19.793',
      'd₁ 18.632',
    ]);
    // 高度约束生效：横向 187.4122u < 200，左缘 x0=16.2939 居中（如实呈现，V4.8-02 同规）
    expectClose(G_K, 41.3192, 4);
    expectClose(pt(view, 0).x, G_X0);
    expectClose(pt(view, 0).y, G_Y_BOT);
    expectClose(pt(view, 11).x, G_X0 + 2.5 * G_P * G_K);
    // 55° 双侧对称：牙顶宽 = 牙底宽 = P/6 构造值 → 12.4952u
    expectClose(pt(view, 3).x - pt(view, 2).x, G_CREST_PX);
    expectClose(G_CREST_PX, G_ROOT_PX);
    expectClose(view.pitchMark.x1, G_X0 + 0.5 * G_P * G_K);
    expectClose(view.pitchMark.x2, G_X0 + 1.5 * G_P * G_K);
    expect(view.pitchMark.label).toBe('P 1.814');
    expect(view.flankMark.label).toBe('α 55°');
  });

  it('蜗杆 m=2：k=12.7324 宽度约束，分度线 y=64、齿顶 38.54、齿根 94.56', () => {
    const view = buildThreadFigure({ kind: 'worm', moduleMM: 2 });
    expectClose(view.diameterLines[0]?.y, W_Y_TIP);
    expectClose(view.diameterLines[1]?.y, CY); // 分度线在 cy（V4.9-02）
    expectClose(view.diameterLines[2]?.y, W_Y_ROOT);
    expect(view.diameterLines.map((line) => line.label)).toEqual([
      '齿顶 +m',
      '分度线',
      'h₁ 4.400',
    ]);
    // 齿顶宽 =px/2−2m·tan20° → 21.4631u（计划字面 21.46u 为 2 位呈现）；齿根宽 → 17.7558u
    expectClose(pt(view, 3).x - pt(view, 2).x, W_CREST_PX);
    expectClose(pt(view, 5).x - pt(view, 4).x, W_ROOT_PX);
    expect(view.profile).toHaveLength(12);
    expectClose(pt(view, 0).x, W_X0);
    expectClose(pt(view, 2).x, W_X0 + 0.5 * W_PX * W_K - W_CREST_PX / 2);
    expectClose(pt(view, 2).y, W_Y_TIP);
    expectClose(pt(view, 11).x, W_X0 + 2.5 * W_PX * W_K);
    // px 双箭头跨距 = px·k = 80.00u；分度线处齿宽 px/2 = 40.00u（构造代数组内插断言）
    expectClose(view.pitchMark.x2 - view.pitchMark.x1, W_PX * W_K, 4);
    expect(view.pitchMark.label).toBe('px 6.283');
    expect(view.flankMark.label).toBe('α 40°');
    expect(view.gaugeLine).toBeNull();
  });

  it('sealpipe R1/2（55°+基面）：剖面同 55° 构造不画锥度，基面竖虚线 x=110 居中', () => {
    const view = buildThreadFigure({
      kind: 'thread',
      major: 20.955,
      pitch: 25.4 / 14,
      flankAngle: 55,
      gaugeLine: true,
    });
    // 剖面与 G1/2 同构造（55°）：三线逐值一致
    expectClose(view.diameterLines[0]?.y, G_Y_TOP);
    expectClose(view.diameterLines[1]?.y, G_Y_MID);
    expectClose(view.diameterLines[2]?.y, G_Y_BOT);
    expectClose(pt(view, 3).x - pt(view, 2).x, G_CREST_PX);
    // 基面竖虚线：x=110（V4.9-02 冻结），带上下外延（实现定义：外延 8、y2 上限 119）
    const gauge = view.gaugeLine;
    expect(gauge).not.toBeNull();
    expectClose(gauge?.x, 110);
    expectClose(gauge?.y1, Math.max(G_Y_TOP - 8, 6));
    expectClose(gauge?.y2, Math.min(G_Y_BOT + 8, 119));
    expect(gauge?.label).toBe('基面');
  });

  it('构造代数 60°：w_crest/P = 0.5−0.6495·tan30° = 0.125011（与精确 P/8=0.125 舍入差 1.1e-5，超 5 位容差故断言列 4 位）', () => {
    const view = buildThreadFigure({ kind: 'thread', major: 10, pitch: 1.5, flankAngle: 60 });
    const crestFactor = (pt(view, 3).x - pt(view, 2).x) / M10_K / 1.5;
    const rootFactor = (pt(view, 5).x - pt(view, 4).x) / M10_K / 1.5;
    // 四位常数 0.6495/1.0825 导出值（非新常数：PROFILE_CONSTANTS 同源复算）
    expectClose(crestFactor, 0.5 - 0.6495 * T30, 4); // 0.12501098…
    expectClose(rootFactor, 0.5 - (1.0825 - 0.6495) * T30, 4); // 0.24998732…
    // 与教科书精确值 P/8、P/4 的差 = 四位常数舍入差（1.1e-5 / 1.3e-5，4 位断言可容纳）
    expectClose(crestFactor, 0.125, 4);
    expectClose(rootFactor, 0.25, 4);
  });

  it('构造代数 55°：w_crest/P = w_root/P = 0.5−0.6403·tan27.5° = 0.166681（与精确 P/6 舍入差 1.4e-5）', () => {
    const view = buildThreadFigure({
      kind: 'thread',
      major: 20.955,
      pitch: 25.4 / 14,
      flankAngle: 55,
    });
    const crestFactor = (pt(view, 3).x - pt(view, 2).x) / G_K / G_P;
    const rootFactor = (pt(view, 5).x - pt(view, 4).x) / G_K / G_P;
    expectClose(crestFactor, 0.5 - 0.6403 * T27_5, 4); // 0.16668074…
    expectClose(crestFactor, rootFactor); // 55° 双侧对称（d−d₂ = d₂−d₁ = 0.6403P）
    expectClose(crestFactor, 1 / 6, 4); // 精确 P/6 = 0.16667（差 1.4e-5）
  });

  it('构造代数 30°：w_crest/P = 0.5−0.5·tan15° = 0.366025（tan15° 精确活算，无舍入差）', () => {
    const view = buildThreadFigure({ kind: 'thread', major: 40, pitch: 7, flankAngle: 30 });
    const crestFactor = (pt(view, 3).x - pt(view, 2).x) / TR_K / 7;
    expectClose(crestFactor, 0.5 - 0.5 * T15, 4); // 0.36602540…（GB/T 5796.1 基本牙型方向）
    expectClose(crestFactor, 0.366025, 4);
  });

  it('构造代数：牙侧过 (d₂, ±P/4)——中径处牙厚 = 槽宽 = P/2（M10 像素 40.00u）', () => {
    const view = buildThreadFigure({ kind: 'thread', major: 10, pitch: 1.5, flankAngle: 60 });
    // 首牙右牙侧 p3(牙顶) → p4(牙底) 在 yMid 处线性内插；左牙侧 p1 → p2 同理
    const fracRight = (M10_Y_MID - M10_Y_TOP) / (M10_Y_BOT - M10_Y_TOP);
    const xRight = pt(view, 3).x + (pt(view, 4).x - pt(view, 3).x) * fracRight;
    const xLeft =
      pt(view, 1).x + (pt(view, 2).x - pt(view, 1).x) * (1 - fracRight);
    const crestCenter = M10_X0 + 0.5 * 1.5 * M10_K; // 50
    expectClose(xRight - crestCenter, (1.5 / 4) * M10_K, 4); // +P/4·k = 20.00u
    expectClose(crestCenter - xLeft, (1.5 / 4) * M10_K, 4);
    // 蜗杆同构：分度线处齿宽 px/2 = 40.00u
    const worm = buildThreadFigure({ kind: 'worm', moduleMM: 2 });
    const fracW = (CY - W_Y_TIP) / (W_Y_ROOT - W_Y_TIP);
    const xWorm =
      pt(worm, 3).x + (pt(worm, 4).x - pt(worm, 3).x) * fracW;
    expectClose(xWorm - (W_X0 + 0.5 * W_PX * W_K), (W_PX / 2 / 2) * W_K, 4); // px/4·k = 20.00u
  });

  it('校验①：非有限入参抛错（NaN / Infinity）', () => {
    expect(() =>
      buildThreadFigure(malformed({ kind: 'thread', major: Number.NaN, pitch: 1.5, flankAngle: 60 })),
    ).toThrow();
    expect(() =>
      buildThreadFigure(
        malformed({ kind: 'thread', major: 10, pitch: Number.POSITIVE_INFINITY, flankAngle: 60 }),
      ),
    ).toThrow();
    expect(() => buildThreadFigure(malformed({ kind: 'worm', moduleMM: Number.NaN }))).toThrow();
  });

  it('校验②：非正入参抛错（0 / 负值）', () => {
    expect(() =>
      buildThreadFigure(malformed({ kind: 'thread', major: 0, pitch: 1.5, flankAngle: 60 })),
    ).toThrow();
    expect(() =>
      buildThreadFigure(malformed({ kind: 'thread', major: 10, pitch: -1.5, flankAngle: 60 })),
    ).toThrow();
    expect(() => buildThreadFigure(malformed({ kind: 'worm', moduleMM: 0 }))).toThrow();
    expect(() => buildThreadFigure(malformed({ kind: 'worm', moduleMM: -2 }))).toThrow();
  });

  it('校验③：缺 kind 必填字段 / 非法 kind / 牙型角越界抛错', () => {
    expect(() => buildThreadFigure(malformed({ kind: 'thread' }))).toThrow(); // 缺 major/pitch/flankAngle
    expect(() => buildThreadFigure(malformed({ kind: 'worm' }))).toThrow(); // 缺 moduleMM
    expect(() => buildThreadFigure(malformed({ major: 10, pitch: 1.5 }))).toThrow(); // 缺 kind
    expect(() => buildThreadFigure(malformed({ kind: 'bolt', major: 10, pitch: 1.5 }))).toThrow();
    expect(() =>
      buildThreadFigure(malformed({ kind: 'thread', major: 10, pitch: 1.5, flankAngle: 40 })),
    ).toThrow(); // 40 仅属蜗杆，thread 拒收
    expect(() =>
      buildThreadFigure(malformed({ kind: 'thread', major: 10, pitch: 1.5, flankAngle: '60' })),
    ).toThrow(); // 角度须为数值
  });
});
