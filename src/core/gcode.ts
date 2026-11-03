/** gcode.ts · FANUC 两行式 G76 模板（W2-C5 实现；仅 FANUC，其余系统 v0.2 延期） */
import type { G76Params, G76Program } from './types';

/**
 * 固定免责文案：逐字导出自 docs/车工计算App-调研报告.md:330 §7.4 原句，禁止改写。
 * （设计稿 p04 的警示条是另一句「程序为参考模板。…」，按派工单要求以报告 §7.4 为准。）
 */
export const G76_DISCLAIMER = '代码为参考模板，上机前请核对系统、刀具、材料与安全间距。';

/** G76 轴坐标：3 位小数，整数保留小数点（FANUC 常写 X26.211 / Z-30.） */
function formatAxis(value: number): string {
  const rounded = Math.round(value * 1000) / 1000;
  return (Object.is(rounded, -0) ? 0 : rounded).toFixed(3).replace(/0+$/, '');
}

/** 普通数值：最多 3 位小数；minDecimals=1 时整数补一位小数（F2.0 / F3.5） */
function formatNumber(value: number, minDecimals = 0): string {
  const rounded = Math.round(value * 1000) / 1000;
  let text = (Object.is(rounded, -0) ? 0 : rounded).toFixed(3).replace(/0+$/, '');
  if (text.endsWith('.')) {
    text = minDecimals > 0 ? `${text}${'0'.repeat(minDecimals)}` : text.slice(0, -1);
  }
  return text;
}

/**
 * FANUC 两行式 G76（模板冻结，逐词输出，不做方言分支）：
 *   行1：G76 P021060 Q100 R{精修余量}
 *        P 前六位按设计稿 p04 冻结原样输出；Q100 = 最小切深 0.1 mm × 1000。
 *   行2：G76 X{小径} Z{终点} P{牙高 μm} Q{首刀切深 μm} F{导程}
 *        牙高/首刀切深均取整（Math.round），单位 μm。
 * 免责文案随程序一起返回（报告 §7.4）。
 */
export function fanucG76(p: G76Params): G76Program {
  const finishAllowance = p.finishAllowanceMM ?? 0.05;
  const depthUM = Math.round(p.threadDepthMM * 1000);
  const firstCutUM = Math.round(p.firstCutDepthMM * 1000);
  const lines = [
    `G76 P021060 Q100 R${formatNumber(finishAllowance)}`,
    `G76 X${formatAxis(p.minorDiameter)} Z${formatAxis(p.endZ)} P${depthUM} Q${firstCutUM} F${formatNumber(p.lead, 1)}`,
  ];
  return { lines, disclaimer: G76_DISCLAIMER };
}
