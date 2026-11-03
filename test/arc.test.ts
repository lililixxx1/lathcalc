/** Lead 预置几何助手回归（真实断言，W2 全程零漂移；不属于任何 W2 卡写范围） */
import { describe, it, expect } from 'vitest';
import { degToDMS, judgeArcDirection } from '../src/core/arc';

describe('Lead 几何助手', () => {
  it('degToDMS：2.862405° → 2°51′45″（WAVE-PLAN §4 #3）', () => {
    expect(degToDMS(2.862405)).toBe('2°51′45″');
  });

  it('judgeArcDirection：绝对方向金测（C-02）——12 点→3 点顺时针，前刀架 G02、后刀架 G03', () => {
    const center = { x: 0, z: 0 };
    const start = { x: 10, z: 0 }; // X 朝上 = 12 点
    const end = { x: 0, z: 10 };   // Z 朝右 = 3 点
    expect(judgeArcDirection(center, start, end, false)).toBe('G02');
    expect(judgeArcDirection(center, start, end, true)).toBe('G03');
  });

  it('judgeArcDirection：反向弧（3 点→12 点）前刀架 G03', () => {
    expect(judgeArcDirection({ x: 0, z: 0 }, { x: 0, z: 10 }, { x: 10, z: 0 }, false)).toBe('G03');
  });
});
