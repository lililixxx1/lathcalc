/** taper.ts · 锥度三值互算/半角（W2-C3 实现；莫氏查表走 lookup + W3-C5 数据） */
import type { TaperInput, TaperResult } from './types';
import { degToDMS } from './arc';

/**
 * 锥度计算（调研报告 §4.1 #5 / §6.4 #3）：
 *   C = (D − d) / L
 *   α/2 = arctan(C / 2) = arctan((D − d) / (2L))
 *
 * 契约口径：big/small/length 三值齐全（types.ts TaperInput）。三值仅由
 * C=(D−d)/L 一条关系约束（未知量 3、独立方程 1），任缺一值均不可解；缺项直接
 * 抛错，不臆造锥比。`missing`（TaperResult「补全后的第四值」）在三值齐全时即
 * 锥度 C，与 taperC 同值。反向锥（d>D）保留 C 与半角的符号。
 */
export function taperCalc(input: TaperInput): TaperResult {
  const { big, small, length } = input;
  if (
    big === undefined || small === undefined || length === undefined ||
    !Number.isFinite(big) || !Number.isFinite(small) || !Number.isFinite(length)
  ) {
    throw new Error('PANIC: taperCalc requires finite big, small and length');
  }
  if (length <= 0) {
    throw new Error('PANIC: taper length must be > 0');
  }
  const taperC = (big - small) / length;
  const halfAngleDeg = (Math.atan(taperC / 2) * 180) / Math.PI;
  return {
    missing: taperC,
    taperC,
    halfAngleDeg,
    halfAngleDMS: degToDMS(halfAngleDeg),
  };
}
