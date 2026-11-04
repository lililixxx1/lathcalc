/** taper.ts · 锥度三值互算/半角（W2-C3 实现；莫氏查表走 lookup + W3-C5 数据） */
import type { TaperInput, TaperResult, TaperReverseInput, TaperReverseResult } from './types';
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

const RAD_TO_DEG = 180 / Math.PI;

/**
 * 锥度反推（WAVE-PLAN-V2 §1 契约，W6-C4 实现；DEFERRED #8）：
 * taperC(>0) + big/small/length 恰两值 → 解第三值 + halfDiffMM=(D−d)/2（未舍入路径，G0-I4）。
 *   D = d + C·L / d = D − C·L / L = (D − d)/C
 * 缺/多值或 taperC≤0 抛错（不臆造）；halfAngle 复用 taperCalc 同式 arctan(C/2)。
 */
export function taperReverse(input: TaperReverseInput): TaperReverseResult {
  const { taperC, big, small, length } = input;
  const provided = [big, small, length].filter((value): value is number => value !== undefined);

  if (
    !Number.isFinite(taperC) ||
    taperC <= 0 ||
    provided.length !== 2 ||
    !provided.every((value) => Number.isFinite(value) && value > 0)
  ) {
    throw new Error('taperReverse: 锥比须大于 0，且大端/小端/长度恰两值（不臆造）');
  }

  let solved: TaperReverseResult['solved'];
  let missing: number;
  let bigValue: number;
  let smallValue: number;

  if (big === undefined) {
    // 给小端 + 锥长 → 大端
    bigValue = small! + taperC * length!;
    smallValue = small!;
    solved = 'big';
    missing = bigValue;
  } else if (small === undefined) {
    // 给大端 + 锥长 → 小端
    bigValue = big;
    smallValue = big - taperC * length!;
    solved = 'small';
    missing = smallValue;
  } else {
    // 给大端 + 小端 → 锥长
    bigValue = big;
    smallValue = small;
    missing = (big - small) / taperC;
    solved = 'length';
  }

  if (!Number.isFinite(missing) || missing <= 0) {
    throw new Error('taperReverse: 输入尺寸相互矛盾，反推值非正');
  }

  // G0-I4：由未舍入值计算，禁止先舍入再算
  const halfDiffMM = (bigValue - smallValue) / 2;
  const halfAngleDeg = Math.atan(taperC / 2) * RAD_TO_DEG;

  return {
    missing,
    taperC,
    halfAngleDeg,
    halfAngleDMS: degToDMS(halfAngleDeg),
    solved,
    halfDiffMM,
  };
}
