/** tolerance.ts · 偏差合成（W2-C3 实现纯公式段；IT 表值由 lookup.itToleranceMM 提供） */
import type { ToleranceInput, ToleranceResult } from './types';

export function toleranceCompose(
  input: ToleranceInput,
  itValueMM: number,
  fundamentalOffsetMM: number,
): ToleranceResult {
  void input; void itValueMM; void fundamentalOffsetMM;
  throw new Error('PANIC: not implemented (W2-C3)');
}
