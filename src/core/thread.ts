/** thread.ts · 螺纹公式族 60°/55°/30°Tr（W2-C2 实现；常数集见 types.ts 头注） */
import type { ThreadSpec, ThreadDimensions } from './types';

export function threadDimensions(spec: ThreadSpec): ThreadDimensions {
  void spec;
  throw new Error('PANIC: not implemented (W2-C2)');
}

export function threeWireM(spec: ThreadSpec, wireDiameter: number): number {
  void spec; void wireDiameter;
  throw new Error('PANIC: not implemented (W2-C2)');
}
