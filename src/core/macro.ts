/**
 * macro.ts · 宏程序库（WAVE-PLAN-V4 §3 / V4.1 §1a 契约预置 panic 桩，W11-A 填实现）
 *
 * 四模板（调研报告:380）：ellipse 椭圆 / knurl 网纹 / oilslot 油槽 / groove 切槽。
 * FANUC B 类宏变量语义（#1–#33 局部变量，SIN/COS 角度单位=度）；
 * 输出 lines = WHILE/END 循环体（非展开点列），disclaimer 复用 G76_DISCLAIMER。
 * 无外部数据依赖——PROVENANCE 披露口径「自研参数化模板」（V4 §3 风险条款）。
 */
import type { G76Program, MacroBuildFn, MacroTemplateId, MacroTemplateSpec } from './types';

/** 模板元数据（参数规格+算式说明）——W11-A 实现 */
export const MACRO_TEMPLATES: readonly MacroTemplateSpec[] = [];

/** 生成宏程序行——W11-A 实现（桩：未实现即抛，防静默误解） */
export const buildMacro: MacroBuildFn = (id: MacroTemplateId): G76Program => {
  void id;
  throw new Error('PANIC: 宏程序库未实现（W11-A 待实现）');
};
