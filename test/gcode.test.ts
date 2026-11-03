/**
 * test/gcode.test.ts · FANUC 两行式 G76 模板与免责常量（W2-C5）
 *
 * 数值锚点：M30×3.5（设计稿 p03/p04 + WAVE-PLAN §4 #7）
 *   d1 = 30 − 1.0825×3.5 = 26.21125 mm
 *   牙高（单边） = (30 − 26.21125)/2 = 1.894375 mm → ×1000 = 1894.375 μm → 取整 1894
 *   （设计稿 p04 的 1895 是工作牙高路径 H1=0.5413×3.5→1894.55→1895，DEVIATIONS #4；本卡禁 1895）
 *   Q = 0.4 mm ×1000 = 400；F = 3.5；R = 0.05（默认精修余量）
 *
 * 第二例 M30×2 用于验证取整与参数化：P = (30−27.835)/2×1000 = 1082.5 → 1083
 * （与报告:234 的 G76 参考程序 P1083 Q300 F2.0 对拍；Z 的尾点按设计稿 p04 冻结格式）。
 */
import { describe, it, expect } from 'vitest';
import { fanucG76, G76_DISCLAIMER } from '../src/core/gcode';
import type { G76Params } from '../src/core/types';

const M30X35: G76Params = {
  minorDiameter: 30 - 1.0825 * 3.5, // 26.21125
  endZ: -30,
  threadDepthMM: (30 - (30 - 1.0825 * 3.5)) / 2, // 1.894375
  firstCutDepthMM: 0.4,
  lead: 3.5,
};

describe('FANUC 两行式 G76 · M30×3.5', () => {
  it('牙高锚点：1894.375 μm → 取整 1894（显式禁止 1895）', () => {
    const rawMicron = ((30 - (30 - 1.0825 * 3.5)) / 2) * 1000;
    expect(rawMicron).toBeCloseTo(1894.375, 9);
    expect(Math.round(rawMicron)).toBe(1894);

    const program = fanucG76(M30X35);
    const line2 = program.lines[1] ?? '';
    expect(line2).toContain('P1894');
    expect(line2).not.toContain('1895');
  });

  it('行1 逐词：G76 P021060 Q100 R0.05（P/Q/R 逐位）', () => {
    const line1 = fanucG76(M30X35).lines[0] ?? '';
    expect(line1).toBe('G76 P021060 Q100 R0.05');

    const tokens = line1.split(' ');
    expect(tokens).toEqual(['G76', 'P021060', 'Q100', 'R0.05']);

    const pWord = tokens[1] ?? '';
    expect(pWord).toHaveLength(7); // P + 6 位
    expect(pWord.slice(1)).toBe('021060');
    expect(pWord.slice(1, 3)).toBe('02'); // 精车次数
    expect(pWord.slice(3, 5)).toBe('10'); // 模板冻结位
    expect(pWord.slice(5, 7)).toBe('60'); // 模板冻结位
    expect(tokens[2]).toBe('Q100'); // 最小切深 0.1mm×1000
    expect(tokens[3]).toBe('R0.05'); // 精修余量
  });

  it('行2 逐词：G76 X26.211 Z-30. P1894 Q400 F3.5', () => {
    const line2 = fanucG76(M30X35).lines[1] ?? '';
    expect(line2).toBe('G76 X26.211 Z-30. P1894 Q400 F3.5');
    expect(line2.split(' ')).toEqual(['G76', 'X26.211', 'Z-30.', 'P1894', 'Q400', 'F3.5']);

    // 参数来源复算
    expect(M30X35.minorDiameter).toBeCloseTo(26.21125, 9);
    expect(Math.round(M30X35.threadDepthMM * 1000)).toBe(1894);
    expect(Math.round(M30X35.firstCutDepthMM * 1000)).toBe(400);
    expect(M30X35.lead).toBe(3.5);
  });

  it('只返回两行 FANUC G76，R 缺省时取 0.05、显式值可覆盖', () => {
    const program = fanucG76(M30X35);
    expect(program.lines).toHaveLength(2);
    expect(program.lines.every((line) => line.startsWith('G76 '))).toBe(true);

    const defaultFinish = fanucG76(M30X35).lines[0] ?? '';
    expect(defaultFinish).toBe('G76 P021060 Q100 R0.05');

    const customFinish = fanucG76({ ...M30X35, finishAllowanceMM: 0.08 }).lines[0] ?? '';
    expect(customFinish).toBe('G76 P021060 Q100 R0.08');
  });
});

describe('FANUC 两行式 G76 · 第二例 M30×2（报告:234 对拍）', () => {
  const M30X2: G76Params = {
    minorDiameter: 30 - 1.0825 * 2, // 27.835
    endZ: -30,
    threadDepthMM: 1.0825, // (30−27.835)/2，取名义值避免浮点构造误差
    firstCutDepthMM: 0.3,
    lead: 2,
  };

  it('P=(30−27.835)/2×1000=1082.5→1083；Q300；F2.0', () => {
    expect(Math.round(M30X2.threadDepthMM * 1000)).toBe(1083);
    const line2 = fanucG76(M30X2).lines[1] ?? '';
    expect(line2).toBe('G76 X27.835 Z-30. P1083 Q300 F2.0');
  });
});

describe('免责常量（报告 §7.4 原句，报告:330）', () => {
  it('常量与程序返回值均 === §7.4 原句，一字不差', () => {
    // 原文：docs/车工计算App-调研报告.md:330
    // - 所有出程序的页面固定提示：**"代码为参考模板，上机前请核对系统、刀具、材料与安全间距。"**
    expect(G76_DISCLAIMER).toBe('代码为参考模板，上机前请核对系统、刀具、材料与安全间距。');
    expect(fanucG76(M30X35).disclaimer).toBe(G76_DISCLAIMER);
  });
});
