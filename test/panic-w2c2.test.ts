/** W2-C2 桩接线（实现后本文件删除，替换为 test/thread.test.ts） */
import { describe, it, expect } from 'vitest';
import { threadDimensions, threeWireM } from '../src/core/thread';

describe('W2-C2 桩接线（PANIC 契约）', () => {
  it.each([
    ['threadDimensions', () => threadDimensions({ family: 'metric', designation: 'M30×3.5', pitch: 3.5, major: 30, flankAngle: 60 })],
    ['threeWireM', () => threeWireM({ family: 'metric', designation: 'M30×2', pitch: 2, major: 30, flankAngle: 60 }, 1.1547)],
  ])('%s 未实现时抛 PANIC', (_name, fn) => {
    expect(fn).toThrowError(/PANIC/);
  });
});
