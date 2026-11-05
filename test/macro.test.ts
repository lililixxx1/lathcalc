/**
 * macro.test.ts · 宏程序库测试（WAVE-PLAN-V4.1 §1b 契约预置桩测试，W11-A 扩真断言）
 *
 * 桩期断言：MACRO_TEMPLATES 空、buildMacro 任意 id 抛 PANIC（防静默误解）。
 * W11-A 落地后本文件扩为四模板锚点断言（V4.1 §2：宏行逐字符 + 点抽验算式注释）。
 */
import { describe, expect, it } from 'vitest';
import { MACRO_TEMPLATES, buildMacro } from '../src/core/macro';

describe('macro 宏程序库（W11-A 桩期）', () => {
  it('模板元数据暂空（W11-A 填四模板：ellipse/knurl/oilslot/groove）', () => {
    expect(MACRO_TEMPLATES).toHaveLength(0);
  });

  it('buildMacro 桩：任意模板抛 PANIC（未实现防静默误解）', () => {
    expect(() => buildMacro('ellipse', {})).toThrow('PANIC: 宏程序库未实现（W11-A 待实现）');
  });
});
