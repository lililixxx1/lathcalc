/** W2-C3 桩接线（实现后本文件删除，替换为 test/taper.test.ts / test/tolerance.test.ts） */
import { describe, it, expect } from 'vitest';
import { taperCalc } from '../src/core/taper';
import { toleranceCompose } from '../src/core/tolerance';

describe('W2-C3 桩接线（PANIC 契约）', () => {
  it.each([
    ['taperCalc', () => taperCalc({ big: 32, small: 27, length: 50 })],
    ['toleranceCompose', () => toleranceCompose({ nominal: 40, grade: 7, fundamental: 'H' }, 0.025, 0)],
  ])('%s 未实现时抛 PANIC', (_name, fn) => {
    expect(fn).toThrowError(/PANIC/);
  });
});
