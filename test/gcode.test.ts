/**
 * test/gcode.test.ts · FANUC 两行式 G76 模板与免责常量（W2-C5）；
 * G76 方言分支 / G92 单行（W6-C2）
 *
 * 数值锚点：M30×3.5（设计稿 p03/p04 + WAVE-PLAN §4 #7）
 *   d1 = 30 − 1.0825×3.5 = 26.21125 mm
 *   牙高（单边） = (30 − 26.21125)/2 = 1.894375 mm → ×1000 = 1894.375 μm → 取整 1894
 *   （设计稿 p04 的 1895 是工作牙高路径 H1=0.5413×3.5→1894.55→1895，DEVIATIONS #4；本卡禁 1895）
 *   Q = 0.4 mm ×1000 = 400；F = 3.5；R = 0.05（默认精修余量）
 *
 * 第二例 M30×2 用于验证取整与参数化：P = (30−27.835)/2×1000 = 1082.5 → 1083
 * （与报告:234 的 G76 参考程序 P1083 Q300 F2.0 对拍；Z 的尾点按设计稿 p04 冻结格式）。
 *
 * 方言金值来源：docs/research/g76-dialects.md §1（W6-C1 双源调研，Lead 裁决 R1/R2/R3）。
 */
import { describe, it, expect } from 'vitest';
import { fanucG76, g76Dialect, g92Cycle, G76_DISCLAIMER } from '../src/core/gcode';
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

describe('g76Dialect · FANUC 恒等式（WAVE-PLAN-V2 §1 冻结）', () => {
  it("g76Dialect(p,'fanuc') ≡ fanucG76(p)：两行与免责逐字符一致", () => {
    const dialect = g76Dialect(M30X35, 'fanuc');
    const baseline = fanucG76(M30X35);
    // 恒等式：直接复用 fanucG76，禁复制粘贴实现
    expect(dialect.lines).toEqual(baseline.lines);
    expect(dialect.disclaimer).toBe(baseline.disclaimer);
    expect(dialect.lines).toEqual([
      'G76 P021060 Q100 R0.05',
      'G76 X26.211 Z-30. P1894 Q400 F3.5',
    ]);
  });

  it('恒等式覆盖自定义精修余量与第二例参数（非单点巧合）', () => {
    const custom: G76Params = { ...M30X35, finishAllowanceMM: 0.08 };
    expect(g76Dialect(custom, 'fanuc').lines).toEqual(fanucG76(custom).lines);

    const second: G76Params = {
      minorDiameter: 30 - 1.0825 * 2, // 27.835
      endZ: -30,
      threadDepthMM: 1.0825, // (30−27.835)/2
      firstCutDepthMM: 0.3,
      lead: 2,
    };
    expect(g76Dialect(second, 'fanuc').lines).toEqual(fanucG76(second).lines);
  });
});

describe('g76Dialect · KND 两行式（0.001 mm 口径，g76-dialects.md §1 行5）', () => {
  it('M30×3.5 两行金值逐字符：R50 = 0.05×1000；P1894 = 1894.375→Math.round；Q400 = 0.4×1000', () => {
    const program = g76Dialect(M30X35, 'knd');
    expect(program.lines).toHaveLength(2);
    expect(program.lines).toEqual([
      // R(d) 精修余量 0.05 mm × 1000 = 50（KND-1000T 0.001 mm 口径）
      'G76 P021060 Q100 R50',
      // 行2 与 FANUC 同串：X=26.21125→26.211；P=1894.375→1894；Q=0.4×1000=400；F=3.5
      'G76 X26.211 Z-30. P1894 Q400 F3.5',
    ]);
    expect(program.disclaimer).toBe(G76_DISCLAIMER);
  });

  it('精修余量显式覆盖：0.08 mm × 1000 = 80（换算路径非硬编码）', () => {
    const custom = g76Dialect({ ...M30X35, finishAllowanceMM: 0.08 }, 'knd');
    expect(custom.lines[0]).toBe('G76 P021060 Q100 R80');
  });

  it('第二例 M30×2：P=(30−27.835)/2×1000=1082.5→1083、Q300、F2.0', () => {
    const second: G76Params = {
      minorDiameter: 30 - 1.0825 * 2, // 27.835
      endZ: -30,
      threadDepthMM: 1.0825, // (30−27.835)/2 = 1.0825
      firstCutDepthMM: 0.3,
      lead: 2,
    };
    expect(g76Dialect(second, 'knd').lines).toEqual([
      'G76 P021060 Q100 R50',
      'G76 X27.835 Z-30. P1083 Q300 F2.0',
    ]);
  });
});

describe('g76Dialect · HNC 单行式（mm 半径口径，g76-dialects.md §1 行3）', () => {
  it('M30×3.5 单行金值逐字符：K1.894 / U0.05 / V0.1 / Q0.4 / I0 / C2 R0 E0 A60 / P0', () => {
    const program = g76Dialect(M30X35, 'hnc');
    expect(program.lines).toHaveLength(1);
    expect(program.lines).toEqual([
      // K = (30−26.21125)/2 = 1.894375 → 三位 1.894；U = 0.05；V = 0.1（冻结示例最小切深）；
      // Q = 0.4；X = 26.21125→26.211；Z = −30；F = 3.5；C2 R0 E0 A60 / I0 / P0 为模板常量
      'G76 C2 R0 E0 A60 X26.211 Z-30. I0 K1.894 U0.05 V0.1 Q0.4 P0 F3.5',
    ]);
    expect(program.disclaimer).toBe(G76_DISCLAIMER);
  });

  it('精修余量显式覆盖：0.1 mm 直接按 mm 三位输出 U0.1（非 ×1000）', () => {
    const custom = g76Dialect({ ...M30X35, finishAllowanceMM: 0.1 }, 'hnc');
    expect(custom.lines[0]).toBe(
      'G76 C2 R0 E0 A60 X26.211 Z-30. I0 K1.894 U0.1 V0.1 Q0.4 P0 F3.5',
    );
  });

  it('第二例 M30×2：K=(30−27.835)/2=1.0825→1.083（三位）、Q0.3、F2.0', () => {
    const second: G76Params = {
      minorDiameter: 30 - 1.0825 * 2, // 27.835
      endZ: -30,
      threadDepthMM: 1.0825, // 1.0825 mm
      firstCutDepthMM: 0.3,
      lead: 2,
    };
    expect(g76Dialect(second, 'hnc').lines).toEqual([
      'G76 C2 R0 E0 A60 X27.835 Z-30. I0 K1.083 U0.05 V0.1 Q0.3 P0 F2.0',
    ]);
  });
});

describe('g76Dialect · GSK 置灰（W6-C1 裁决 R1 / V2-4 宁缺毋滥）', () => {
  it('gsk 调用即 throw，错误文案逐字冻结', () => {
    expect(() => g76Dialect(M30X35, 'gsk')).toThrow(
      'g76Dialect: GSK G76 两代系统 P/Q 单位口径不同，暂不生成（W6-C1 R1 置灰）',
    );
  });

  it('GSK throw 不产生程序行（from 调用方视角零输出）', () => {
    let lines: string[] | null = null;
    try {
      lines = g76Dialect(M30X35, 'gsk').lines;
    } catch {
      lines = null;
    }
    expect(lines).toBeNull();
  });
});

describe('g92Cycle · 单行直进循环（WAVE-PLAN-V2 §4 G92 锚，G0-B2 行数=1）', () => {
  it('M30×3.5 单行金值逐字符：X=26.21125→26.211；Z=−30；F=3.5', () => {
    const program = g92Cycle(M30X35);
    expect(program.lines).toHaveLength(1);
    expect(program.lines).toEqual(['G92 X26.211 Z-30. F3.5']);
  });

  it('免责字段照常返回（报告 §7.4 原句）', () => {
    const program = g92Cycle(M30X35);
    expect(program.disclaimer).toBe(G76_DISCLAIMER);
    expect(program.disclaimer).toBe('代码为参考模板，上机前请核对系统、刀具、材料与安全间距。');
  });

  it('第二例 M30×2：X=27.835、F2.0（导程整数至少一位小数）', () => {
    const second: G76Params = {
      minorDiameter: 30 - 1.0825 * 2, // 27.835
      endZ: -30,
      threadDepthMM: 1.0825,
      firstCutDepthMM: 0.3,
      lead: 2,
    };
    expect(g92Cycle(second).lines).toEqual(['G92 X27.835 Z-30. F2.0']);
  });
});
