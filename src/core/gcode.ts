/** gcode.ts · G76 两行式模板 + 方言分支 + G92 单行（W2-C5 实现；方言/G92 由 W6-C2 扩展完成，WAVE-PLAN-V2 §1） */
import type { CncSystem, G76Params, G76Program } from './types';

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

/**
 * G76 方言分支（WAVE-PLAN-V2 §1 契约，W6-C2 实现；DEFERRED #1）。
 * 语义由 W6-C1 双源调研冻结（docs/research/g76-dialects.md 结论表）：
 *   - FANUC：恒等式 g76Dialect(p, 'fanuc') ≡ fanucG76(p)，直接复用调用；
 *   - KND：两行式，P/Q/R 按 KND-1000T 的 0.001 mm 口径（§1 行5），行2 与 FANUC 同串；
 *   - HNC：单行式，mm 半径口径（§1 行3），字序 C R E A X Z I K U V Q P F；
 *   - GSK：W6-C1 裁决 R1 / V2-4 宁缺毋滥——980TDc 与 988TA 两代系统 P/Q 单位冲突，
 *     置灰不生成（静默误解达 10⁴ 倍），错误文案冻结。
 * 免责文案随程序一起返回（报告 §7.4）。
 */
export function g76Dialect(p: G76Params, system: CncSystem): G76Program {
  switch (system) {
    case 'fanuc':
      return fanucG76(p);
    case 'knd': {
      // KND-1000T 0.001 mm 口径：R50 = 0.05×1000；P1894 = 1894.375→Math.round；
      // Q400 = 0.4×1000。行2 与 FANUC 同串（g76-dialects.md §1 行5）。
      const finishAllowance = p.finishAllowanceMM ?? 0.05;
      const lines = [
        `G76 P021060 Q100 R${Math.round(finishAllowance * 1000)}`,
        `G76 X${formatAxis(p.minorDiameter)} Z${formatAxis(p.endZ)} P${Math.round(p.threadDepthMM * 1000)} Q${Math.round(p.firstCutDepthMM * 1000)} F${formatNumber(p.lead, 1)}`,
      ];
      return { lines, disclaimer: G76_DISCLAIMER };
    }
    case 'hnc': {
      // HNC 单行式（g76-dialects.md §1 行3 冻结示例逐字）：
      // C2 R0 E0 A60 / I0 / V0.1 / P0 为模板常量（直螺纹、冻结示例参数，禁跨方言等效改写）；
      // K/U/Q 为 mm 半径口径三位小数（K1.894、U0.05、Q0.4）。
      const finishAllowance = p.finishAllowanceMM ?? 0.05;
      const lines = [
        `G76 C2 R0 E0 A60 X${formatAxis(p.minorDiameter)} Z${formatAxis(p.endZ)} I0 K${formatNumber(p.threadDepthMM)} U${formatNumber(finishAllowance)} V0.1 Q${formatNumber(p.firstCutDepthMM)} P0 F${formatNumber(p.lead, 1)}`,
      ];
      return { lines, disclaimer: G76_DISCLAIMER };
    }
    case 'gsk':
      throw new Error(
        'g76Dialect: GSK G76 两代系统 P/Q 单位口径不同，暂不生成（W6-C1 R1 置灰）',
      );
  }
}

/**
 * G92 车螺纹单行程循环（WAVE-PLAN-V2 §1 契约，W6-C2 实现；DEFERRED #2b）。
 * FANUC 基线单行 G92 X(U)_ Z(W)_ F_；行数冻结 = 1（G0-B2）。
 * FANUC / GSK / KND 三系统同串（g76-dialects.md §1 行2/行6），core 层不做 system 分支；
 * 单行仅为循环首行，完整螺纹需后续 X 递减分刀（调研档 §4.2 第 7 条，UI 注记）。
 */
export function g92Cycle(p: G76Params): G76Program {
  const lines = [
    `G92 X${formatAxis(p.minorDiameter)} Z${formatAxis(p.endZ)} F${formatNumber(p.lead, 1)}`,
  ];
  return { lines, disclaimer: G76_DISCLAIMER };
}
