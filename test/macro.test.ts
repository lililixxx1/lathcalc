/**
 * macro.test.ts · 宏程序库测试（W11-A；桩期 2 用例改造 + 扩真断言）
 *
 * 锚点来源：docs/plan/WAVE-PLAN-V4.1.md §2（冻结四模板结构 + 椭圆锚点 + 切槽层数算例）；
 * 调研报告:380（宏程序库 椭圆/网纹/油槽/切槽）。
 * 数值纪律：期望值旁附算式；点抽验为「复算表达式」（宏输出是 WHILE 循环体，非展开点列）。
 * 口径注：油槽为自研近似结构（检索未达多源一致门槛），notes 内含披露。
 */
import { describe, expect, it } from 'vitest';
import { MACRO_TEMPLATES, buildMacro } from '../src/core/macro';
import { G76_DISCLAIMER } from '../src/core/gcode';
import type { MacroTemplateId } from '../src/core/types';

const IDS: readonly MacroTemplateId[] = ['ellipse', 'knurl', 'oilslot', 'groove'];

function specOf(id: MacroTemplateId) {
  const spec = MACRO_TEMPLATES.find((item) => item.id === id);
  if (!spec) throw new Error(`测试夹具缺少模板 ${id}`);
  return spec;
}

/** 缺省参数（来自 MacroParamSpec.defaultValue）+ 用例覆盖 */
function defaults(
  id: MacroTemplateId,
  overrides: Record<string, number> = {},
): Record<string, number> {
  const values: Record<string, number> = {};
  for (const param of specOf(id).params) values[param.key] = param.defaultValue;
  return { ...values, ...overrides };
}

describe('macro 宏程序库（W11-A）', () => {
  it('模板元数据：四模板齐套（ellipse/knurl/oilslot/groove）', () => {
    // V4.1 §2：四模板 id 顺序 = 椭圆 / 网纹 / 油槽 / 切槽
    expect(MACRO_TEMPLATES.map((template) => template.id)).toEqual([
      'ellipse',
      'knurl',
      'oilslot',
      'groove',
    ]);
    for (const template of MACRO_TEMPLATES) {
      expect(template.name.length).toBeGreaterThan(0);
      expect(template.params.length).toBeGreaterThan(0);
      expect(template.notes.length).toBeGreaterThan(0);
      for (const param of template.params) {
        expect(param.max).toBeGreaterThan(param.min);
        expect(param.defaultValue).toBeGreaterThanOrEqual(param.min);
        expect(param.defaultValue).toBeLessThanOrEqual(param.max);
      }
    }
  });

  it('buildMacro 四模板均返回 WHILE 循环体 + G76_DISCLAIMER（不再抛 PANIC）', () => {
    for (const id of IDS) {
      const program = buildMacro(id, defaults(id));
      expect(program.lines.length).toBeGreaterThan(0);
      expect(program.lines.some((line) => line.includes('WHILE'))).toBe(true);
      // V4.1 §1a：disclaimer 复用 G76_DISCLAIMER（报告 §7.4 原句）
      expect(program.disclaimer).toBe(G76_DISCLAIMER);
    }
  });

  it('参数缺失 / 非数值 → throw 且文案含「参数」（桩期 PANIC 断言改造）', () => {
    // 原桩期用例 `buildMacro('ellipse', {})` 抛 PANIC；填实现后改为域校验抛参数错误
    expect(() => buildMacro('ellipse', {})).toThrow(/参数/);
    expect(() => buildMacro('ellipse', defaults('ellipse', { a: Number.NaN }))).toThrow(/参数/);
  });

  describe('椭圆 ellipse（V4.1 §2 冻结变量分配与宏行锚点）', () => {
    it('缺省锚点：四条宏行逐字符存在（a=15 / b=25 / Δt=15°）', () => {
      const lines = buildMacro('ellipse', defaults('ellipse')).lines;
      // V4.1 §2 锚点行（逐字符）
      for (const anchor of [
        '#6=2*#1*COS[#4]',
        'WHILE [#4 LT #5] DO1',
        'END1',
        'G01 X#6 Z#7',
      ]) {
        expect(lines).toContain(anchor);
      }
      // 变量分配冻结：#1=a=15 / #2=b=25 / #3=Δt=15°（V4.1 §2 缺省算例）
      expect(lines).toContain('#1=15');
      expect(lines).toContain('#2=25');
      expect(lines).toContain('#3=15');
    });

    it('点抽验（复算表达式）：t=15° → X=28.978 / Z=6.470', () => {
      const a = 15;
      const b = 25;
      const t = 15;
      const rad = (t * Math.PI) / 180;
      // X = 2×15×cos15° = 30×0.96592583 = 28.9777748 → 28.978（V4.1 §2）
      const x = 2 * a * Math.cos(rad);
      expect(x).toBeCloseTo(28.9777748, 6);
      expect(x.toFixed(3)).toBe('28.978');
      // Z = 25×sin15° = 25×0.25881905 = 6.4704761 → 6.470（V4.1 §2）
      const z = b * Math.sin(rad);
      expect(z).toBeCloseTo(6.4704761, 6);
      expect(z.toFixed(3)).toBe('6.470');
    });

    it('参数域：a 低于 min / t₁ ≤ t₀ → throw 且文案含「参数」', () => {
      expect(() => buildMacro('ellipse', defaults('ellipse', { a: 0 }))).toThrow(/参数/);
      expect(() => buildMacro('ellipse', defaults('ellipse', { t1: 0 }))).toThrow(/参数/);
    });
  });

  describe('网纹 knurl（外层 X 逐层压入 + 内层 Z 往复，双 WHILE）', () => {
    it('双 WHILE 循环 + GB/T 6403.3 选型提示 + 层数算式', () => {
      const program = buildMacro('knurl', defaults('knurl'));
      expect(program.lines.filter((line) => line.startsWith('WHILE'))).toHaveLength(2);
      expect(program.lines).toContain('WHILE [#5 GT #9] DO1'); // 外层 X
      expect(program.lines).toContain('WHILE [#10 NE 0] DO2'); // 内层 Z 往复
      expect(program.lines).toContain('G01 Z#11 F#8');
      expect(program.lines).toContain('END2');
      expect(program.lines).toContain('END1');

      const notes = specOf('knurl').notes.join('\n');
      // V4.1 §2：注释提示滚花模数按 GB/T 6403.3 选型（不录标准表）
      expect(notes).toContain('GB/T 6403.3');
      // 层数 = ⌈H/ΔX⌉ = ⌈0.6/0.2⌉ = 3（缺省示例输入，非标准表值）
      expect(notes).toContain('⌈0.6/0.2⌉ = 3');
    });

    it('参数域：H ≥ D / ΔX 低于 min → throw 且文案含「参数」', () => {
      expect(() => buildMacro('knurl', defaults('knurl', { h: 50 }))).toThrow(/参数/);
      expect(() => buildMacro('knurl', defaults('knurl', { dx: 0 }))).toThrow(/参数/);
    });
  });

  describe('油槽 oilslot（正弦摆动 + 八字两遍，自研近似结构）', () => {
    it('正弦摆动行 + 第二遍相位偏移 P/2 + 自研口径注', () => {
      const program = buildMacro('oilslot', defaults('oilslot'));
      // X = X0 + A·SIN[360·(Z−Zφ)/P]；第二遍 Zφ=P/2 → 相位差 −180°
      expect(program.lines).toContain('#12=#1+#2*SIN[360*[#11-#9]/#3]');
      expect(program.lines).toContain('#9=#3/2');
      expect(program.lines).toContain('WHILE [#10 LE #7] DO1');
      expect(program.lines).toContain('#7=2'); // 缺省 passes=2（八字两遍）

      // 相位差 = 360×(P/2)/P = 180°（缺省 P=20 mm，示例输入）
      const p = 20;
      expect((360 * (p / 2)) / p).toBe(180);

      const notes = specOf('oilslot').notes.join('\n');
      // 派工单上报条件：检索不足 → 自研结构 + 口径注披露
      expect(notes).toContain('自研近似结构，非标准工艺文件');
      expect(notes).toContain('−180°');
    });

    it('参数域：P 低于 min / A ≥ X₀ / Z 终点 ≥ 起点 / 遍数非整数 → throw 且文案含「参数」', () => {
      expect(() => buildMacro('oilslot', defaults('oilslot', { p: 0 }))).toThrow(/参数/);
      expect(() => buildMacro('oilslot', defaults('oilslot', { a: 40 }))).toThrow(/参数/);
      expect(() => buildMacro('oilslot', defaults('oilslot', { z1: 0 }))).toThrow(/参数/);
      expect(() => buildMacro('oilslot', defaults('oilslot', { passes: 1.5 }))).toThrow(/参数/);
    });
  });

  describe('切槽 groove（矩形槽分层 + Z 向搭接平移，双 WHILE）', () => {
    it('双 WHILE + 层数算例 ⌈2/0.5⌉=4 + 步距=刀宽−搭接量', () => {
      const program = buildMacro('groove', defaults('groove'));
      expect(program.lines.filter((line) => line.startsWith('WHILE'))).toHaveLength(2);
      expect(program.lines).toContain('WHILE [#12 GT #9] DO1'); // 外层分层
      expect(program.lines).toContain('WHILE [#13*#11 LT #10] DO2'); // 内层 Z 搭接平移
      expect(program.lines).toContain('#11=#5-#6'); // 步距 = 刀宽 b − 搭接量 e
      expect(program.lines).toContain('END2');
      expect(program.lines).toContain('END1');

      // 层数 = ⌈深度/Δd⌉ = ⌈2/0.5⌉ = 4（V4.1 §2 算例）
      const depth = 2;
      const dd = 0.5;
      expect(Math.ceil(depth / dd)).toBe(4);
      expect(specOf('groove').notes.join('\n')).toContain('⌈2/0.5⌉ = 4');
    });

    it('参数域：Δd 低于 min / 2H ≥ D / 刀宽 ≥ 槽宽 / 搭接量 ≥ 刀宽 → throw 且文案含「参数」', () => {
      expect(() => buildMacro('groove', defaults('groove', { dd: 0 }))).toThrow(/参数/);
      expect(() => buildMacro('groove', defaults('groove', { h: 25 }))).toThrow(/参数/);
      expect(() => buildMacro('groove', defaults('groove', { toolW: 10 }))).toThrow(/参数/);
      expect(() => buildMacro('groove', defaults('groove', { overlap: 3 }))).toThrow(/参数/);
    });
  });
});
