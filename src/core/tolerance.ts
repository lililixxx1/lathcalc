/** tolerance.ts · 偏差合成（W2-C3 实现纯公式段；IT 表值由 lookup.itToleranceMM 提供） */
import type { FitInput, FitResult, ToleranceInput, ToleranceResult } from './types';

/**
 * 偏差合成（GB/T 1800.1 基本偏差朝向）：
 *   孔（大写）：A–H → 基本偏差为下偏差 EI；K–ZC → 基本偏差为上偏差 ES。
 *   轴（小写）：a–h → 基本偏差为上偏差 es；j–zc → 基本偏差为下偏差 ei。
 * 给定 IT 公差 T（mm，正值）与基本偏差 δ（mm，带符号）：
 *   孔 A–H：EI=δ，ES=δ+T；孔 K–ZC：ES=δ，EI=δ−T
 *   轴 a–h：es=δ，ei=δ−T；轴 j–zc：ei=δ，es=δ+T
 * 公差带宽度 tolerance = T（= itValueMM）。本函数只做算术合成，不查任何表：
 * IT 表值与基本偏差均由调用方传入（表值段归 W3-C4）。
 */
export function toleranceCompose(
  input: ToleranceInput,
  itValueMM: number,
  fundamentalOffsetMM: number,
): ToleranceResult {
  const code = input.fundamental;
  if (typeof code !== 'string' || !/^[A-Za-z]$/.test(code)) {
    throw new Error(`PANIC: unsupported fundamental deviation code "${String(code)}"`);
  }
  if (!Number.isFinite(itValueMM) || itValueMM <= 0) {
    throw new Error(`PANIC: IT value must be a positive finite number (got ${itValueMM})`);
  }
  if (!Number.isFinite(fundamentalOffsetMM)) {
    throw new Error(`PANIC: fundamental deviation must be finite (got ${fundamentalOffsetMM})`);
  }
  const isHole = code === code.toUpperCase();
  // 基本偏差所指的界限：孔 A–H / 轴 a–h 为靠近零线的一侧（下/上）；其余代号为另一侧
  const offsetIsLower = isHole ? code <= 'H' : code > 'h';
  const lower = offsetIsLower ? fundamentalOffsetMM : fundamentalOffsetMM - itValueMM;
  const upper = offsetIsLower ? fundamentalOffsetMM + itValueMM : fundamentalOffsetMM;
  return { upper, lower, tolerance: itValueMM };
}

/**
 * 常用配合实算（WAVE-PLAN-V3 §1/V3-5，W8-C 实现；契约冻结于 types.ts，卡内禁改签名）：
 * 孔恒 H7（EI=0、ES=+IT7）；轴 g6/k6/p6 基本偏差取 fundamental-deviations.json 表值
 * （端别按 GB/T 1800.1：g=es、k/p=ei，另一端 ±IT6），Xmin=EI−es、Xmax=ES−ei。
 * 数据缺段/尺寸越界抛错。桩占位，卡内替换。
 */
export function fitTolerance(input: FitInput): FitResult {
  throw new Error(`fitTolerance: 未实现（W8-C 填充），收到 ${JSON.stringify(input)}`);
}
