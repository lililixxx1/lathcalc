/** gcode.ts · G76 两行式模板 + 方言分支 + G92 单行（W2-C5 实现；方言/G92 由 W6-C2 扩展完成，WAVE-PLAN-V2 §1） */
import type { CncSystem, G76Params, G76Program, GskModel } from './types';

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
 * 锥度位取值（WAVE-PLAN-V4 §2 W10-C 实现）：taperRadiusMM 缺省 / 0 = 直螺纹 → null；
 * 显式非 0 → 原值（起点半径 − 终点半径，常规锥螺纹为负，V4 §2 方向约定）。
 */
function taperValue(p: G76Params): number | null {
  const taper = p.taperRadiusMM;
  if (taper === undefined || taper === 0) return null;
  return taper;
}

/**
 * mm 口径锥度位（两行式行2 / G92 的 R(i)，HNC 用 I 另处理）：
 * 直螺纹返回空串（拼接后行内容与 v0.2 逐字符一致）；锥螺纹返回 ` R-0.3`（最多三位小数）。
 */
function taperWordMM(p: G76Params): string {
  const taper = taperValue(p);
  return taper === null ? '' : ` R${formatNumber(taper)}`;
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
    // 锥螺纹：X Z 后插 R(i)（mm 三位小数，WAVE-PLAN-V4 §2 W10-C；直螺纹不输出，逐字符不变）
    `G76 X${formatAxis(p.minorDiameter)} Z${formatAxis(p.endZ)}${taperWordMM(p)} P${depthUM} Q${firstCutUM} F${formatNumber(p.lead, 1)}`,
  ];
  return { lines, disclaimer: G76_DISCLAIMER };
}

/**
 * GSK G76 最小切深 Q(Δdmin) = 0.1 mm（冻结示例值：988TA `Q0.1` / 980TDc `Q1000`）。
 * 来源：docs/research/g76-dialects.md §1 行1 示例；与 FANUC 行1 `Q100`（0.1 mm）同值。
 */
const GSK_MIN_CUT_MM = 0.1;

/**
 * GSK 980TDc 最小输入增量 0.0001 mm（状态参数 №.182.7 的增量档）。
 * 1 / 0.0001 = 10⁴；mm → 整数增量时乘该系数后 Math.round。
 * 来源：docs/research/g76-dialects.md §1 行1 单位注（980TDc 手册 `P36800` = 3.68 mm）。
 */
const GSK_980TDC_SCALE = 10_000;

/** 0.0001 mm 增量口径换算：1.894375 → 18944；0.4 → 4000；0.1 → 1000（§1 行1 单位注） */
function toGskIncrement(valueMM: number): number {
  return Math.round(valueMM * GSK_980TDC_SCALE);
}

/**
 * G76 方言分支（WAVE-PLAN-V2 §1 契约，W6-C2 实现；DEFERRED #1）。
 * 语义由 W6-C1 双源调研冻结（docs/research/g76-dialects.md 结论表）：
 *   - FANUC：恒等式 g76Dialect(p, 'fanuc') ≡ fanucG76(p)，直接复用调用；
 *   - KND：两行式，P/Q/R 按 KND-1000T 的 0.001 mm 口径（§1 行5），行2 与 FANUC 同串；
 *   - HNC：单行式，mm 半径口径（§1 行3），字序 C R E A X Z I K U V Q P F；
 *   - GSK：W6-C1 裁决 R1 的「未限定型号」前提由 WAVE-PLAN-V3 V3-3 型号细分消除
 *     （DEFERRED #16），两口径分支（§1 行1）：
 *       988TA：P/Q/R 均 mm 半径小数 → `P1.894 Q0.4`、`Q0.1`、`R0.05`；
 *       980TDc：P(k)/Q(Δd)/Q(Δdmin) 为 0.0001 mm 增量（№.182.7 默认档），R(d) 保持 mm
 *       → `P18944 Q4000`、`Q1000`、`R0.05`。缺 gskModel 即 throw（防 10⁴ 倍静默误解）。
 * 免责文案随程序一起返回（报告 §7.4）。
 */
export function g76Dialect(p: G76Params, system: CncSystem, gskModel?: GskModel): G76Program {
  switch (system) {
    case 'fanuc':
      return fanucG76(p);
    case 'knd': {
      // KND-1000T 0.001 mm 口径：R50 = 0.05×1000；P1894 = 1894.375→Math.round；
      // Q400 = 0.4×1000。直螺纹行2 与 FANUC 同串（g76-dialects.md §1 行5）。
      // 锥度 R(i)：手册源 [8] 参数表未逐字标单位，示例 R200=0.2mm 与 0.001mm 自洽；
      // 按「KND 全 P/Q/R 0.001mm」口径推定输出整数 μ（−0.3 → R-300），双源摘录见
      // docs/evidence/W10-C/knd-ri-sources.md 并上报。
      const finishAllowance = p.finishAllowanceMM ?? 0.05;
      const taper = taperValue(p);
      const taperWord = taper === null ? '' : ` R${Math.round(taper * 1000)}`;
      const lines = [
        `G76 P021060 Q100 R${Math.round(finishAllowance * 1000)}`,
        `G76 X${formatAxis(p.minorDiameter)} Z${formatAxis(p.endZ)}${taperWord} P${Math.round(p.threadDepthMM * 1000)} Q${Math.round(p.firstCutDepthMM * 1000)} F${formatNumber(p.lead, 1)}`,
      ];
      return { lines, disclaimer: G76_DISCLAIMER };
    }
    case 'hnc': {
      // HNC 单行式（g76-dialects.md §1 行3 冻结示例逐字）：
      // C2 R0 E0 A60 / V0.1 / P0 为模板常量（直螺纹、冻结示例参数，禁跨方言等效改写）；
      // I 为起点相对终点半径差（直螺纹 I0，常规锥螺纹为负——V4 §2 方向约定同值）；
      // K/U/Q 为 mm 半径口径三位小数（K1.894、U0.05、Q0.4）。
      const finishAllowance = p.finishAllowanceMM ?? 0.05;
      const taper = taperValue(p);
      const taperText = taper === null ? '0' : formatNumber(taper);
      const lines = [
        `G76 C2 R0 E0 A60 X${formatAxis(p.minorDiameter)} Z${formatAxis(p.endZ)} I${taperText} K${formatNumber(p.threadDepthMM)} U${formatNumber(finishAllowance)} V0.1 Q${formatNumber(p.firstCutDepthMM)} P0 F${formatNumber(p.lead, 1)}`,
      ];
      return { lines, disclaimer: G76_DISCLAIMER };
    }
    case 'gsk': {
      // WAVE-PLAN-V3 §1/V3-3（DEFERRED #16）：988TA mm 小数 / 980TDc 0.0001mm 增量
      // （№.182.7），两行格式与示例逐字取 g76-dialects.md §1 行1；J/K 退尾两型号行位置
      // 不同（§4.2 第 2 条），本实现不输出 J/K，避免跨型号行位歧义。
      if (!gskModel) {
        // 防静默误解：同一段 P1.894 Q0.4 在 980TDc 增量档会差 10⁴ 倍。
        throw new Error('GSK 需先选型号（988TA mm / 980TDc 增量）');
      }
      const finishAllowance = p.finishAllowanceMM ?? 0.05;
      const minCut = formatNumber(GSK_MIN_CUT_MM); // 988TA：mm 小数 0.1
      const minCutInc = toGskIncrement(GSK_MIN_CUT_MM); // 980TDc：增量 1000
      const lines =
        gskModel === '980tdc'
          ? [
              // R(d) 精修余量两型号均保持 mm（§1 行1 单位注）。
              `G76 P021060 Q${minCutInc} R${formatNumber(finishAllowance)}`,
              // P(k)=1.894375×10⁴→18944；Q(Δd)=0.4×10⁴→4000；X/Z/F 写法同 FANUC。
              // 锥度 R(i) 亦保持 mm（§1 行1：980TDc 增量只作用 P/Q，V4 §2 W10-C 已冻）。
              `G76 X${formatAxis(p.minorDiameter)} Z${formatAxis(p.endZ)}${taperWordMM(p)} P${toGskIncrement(p.threadDepthMM)} Q${toGskIncrement(p.firstCutDepthMM)} F${formatNumber(p.lead, 1)}`,
            ]
          : [
              // P/Q 为 mm 半径小数（非 μm 整数）：P(k)=1.894375→1.894（三位）、Q(Δd)=0.4。
              `G76 P021060 Q${minCut} R${formatNumber(finishAllowance)}`,
              `G76 X${formatAxis(p.minorDiameter)} Z${formatAxis(p.endZ)}${taperWordMM(p)} P${formatNumber(p.threadDepthMM)} Q${formatNumber(p.firstCutDepthMM)} F${formatNumber(p.lead, 1)}`,
            ];
      return { lines, disclaimer: G76_DISCLAIMER };
    }
  }
}

/**
 * G92 车螺纹单行程循环（WAVE-PLAN-V2 §1 契约，W6-C2 实现；DEFERRED #2b）。
 * FANUC 基线单行 G92 X(U)_ Z(W)_ F_；行数冻结 = 1（G0-B2）。
 * FANUC / GSK / KND 三系统同串（g76-dialects.md §1 行2/行6），core 层对三者不做分支；
 * 单行仅为循环首行，完整螺纹需后续 X 递减分刀（调研档 §4.2 第 7 条，UI 注记）。
 * WAVE-PLAN-V3 §1/V3-4（DEFERRED #17）：HNC 的 G92 是工件坐标系设定（负结论 §1 行4），
 * 螺纹单循环生成 G82 单行 `G82 X26.211 Z-30. I0 R0 E0 C1 P0 F3.5`——模板逐字取
 * g76-dialects.md §1 行4 脚注（HNC-8 手册 + 21ic 双源），I 锥度半径差 / R·E 退尾 /
 * C 头数 / P 起始角为直螺纹模板值；其余/缺省保持 FANUC 格式（v0.2 既有测试零改）。
 */
export function g92Cycle(p: G76Params, system?: CncSystem): G76Program {
  const taper = taperValue(p);
  if (system === 'hnc') {
    const lines = [
      // 直螺纹模板：I0（无锥度）、R0/E0（无退尾）、C1（单头）、P0（起始角 0）。
      // 锥螺纹：I0 处替换为锥度值（起点相对终点半径差，V4 §2 W10-C）。
      `G82 X${formatAxis(p.minorDiameter)} Z${formatAxis(p.endZ)} I${taper === null ? '0' : formatNumber(taper)} R0 E0 C1 P0 F${formatNumber(p.lead, 1)}`,
    ];
    return { lines, disclaimer: G76_DISCLAIMER };
  }
  // FANUC / GSK / KND 同串（§1 行2/行6）；锥螺纹在 Z 后插 R(i)（mm）。FANUC 的 R 位
  // 系「W6 三系统同串」先例外推（G0-v0.3 复核观察 1），口径注由 p04 披露。
  const lines = [
    `G92 X${formatAxis(p.minorDiameter)} Z${formatAxis(p.endZ)}${taperWordMM(p)} F${formatNumber(p.lead, 1)}`,
  ];
  return { lines, disclaimer: G76_DISCLAIMER };
}
