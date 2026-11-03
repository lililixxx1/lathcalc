/** W2-C1 桩接线（实现后本文件删除，替换为 test/speed.test.ts / test/triangle.test.ts / test/weight.test.ts） */
import { describe, it, expect } from 'vitest';
import { spindleSpeed } from '../src/core/speed';
import { solveTriangle } from '../src/core/triangle';
import { barWeight } from '../src/core/weight';

describe('W2-C1 桩接线（PANIC 契约）', () => {
  it.each([
    ['speed', () => spindleSpeed({ diameter: 50, vc: 150 })],
    ['triangle', () => solveTriangle({ a: 30, b: 40, c: 50 })],
    ['weight', () => barWeight({ shape: 'round', dims: { D: 50, L: 100 }, density: 7.85 })],
  ])('%s 未实现时抛 PANIC', (_name, fn) => {
    expect(fn).toThrowError(/PANIC/);
  });
});
