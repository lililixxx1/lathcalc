/** W2-C5 桩接线（实现后本文件删除，替换为 test/arc-cases-b.test.ts / test/gcode.test.ts） */
import { describe, it, expect } from 'vitest';
import { arcCasesB } from '../src/core/arc-cases-b';
import { fanucG76 } from '../src/core/gcode';

describe('W2-C5 桩接线（PANIC 契约）', () => {
  it('工况 07–12 注册且未实现时抛 PANIC', () => {
    expect(arcCasesB).toHaveLength(6);
    for (const c of arcCasesB) {
      expect(() => c.solve({ R: 5, angle: 45, dX: 10, dZ: 10, lead: 3.5, boreD: 30 })).toThrowError(/PANIC/);
    }
  });

  it('gcode 未实现时抛 PANIC', () => {
    expect(() => fanucG76({ minorDiameter: 26.211, endZ: -30, threadDepthMM: 1.894375, firstCutDepthMM: 0.4, lead: 3.5 })).toThrowError(/PANIC/);
  });
});
