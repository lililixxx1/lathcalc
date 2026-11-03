/** gcode.ts · FANUC 两行式 G76 模板（W2-C5 实现；仅 FANUC，其余系统置灰） */
import type { G76Params, G76Program } from './types';

export function fanucG76(p: G76Params): G76Program {
  void p;
  throw new Error('PANIC: not implemented (W2-C5)');
}
