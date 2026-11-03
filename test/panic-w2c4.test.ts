/** W2-C4 桩接线（实现后本文件删除，替换为 test/arc-cases-a.test.ts） */
import { describe, it, expect } from 'vitest';
import { arcCasesA } from '../src/core/arc-cases-a';

describe('W2-C4 桩接线（PANIC 契约）', () => {
  it('工况 01–06 注册且未实现时抛 PANIC', () => {
    expect(arcCasesA).toHaveLength(6);
    for (const c of arcCasesA) {
      expect(() => c.solve({ R: 5, angle: 45, dX: 10, dZ: 10, stepD: 36, stepX: 10, stepZ: 10, R1: 10, R2: 6 })).toThrowError(/PANIC/);
    }
  });
});
