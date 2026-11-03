/** 骨架冒烟：全部 panic 桩接线正确（W2 各卡替换后本文件期望逐卡改为真实断言——由各卡自带 test 文件承担，本文件保留为桩期回归） */
import { describe, it, expect } from 'vitest';
import { spindleSpeed } from '../src/core/speed';
import { threadDimensions, threeWireM } from '../src/core/thread';
import { taperCalc } from '../src/core/taper';
import { toleranceCompose } from '../src/core/tolerance';
import { solveTriangle } from '../src/core/triangle';
import { barWeight } from '../src/core/weight';
import { fanucG76 } from '../src/core/gcode';
import { arcCasesA } from '../src/core/arc-cases-a';
import { arcCasesB } from '../src/core/arc-cases-b';
import { degToDMS, judgeArcDirection } from '../src/core/arc';

describe('W2 桩接线（PANIC 契约）', () => {
  it.each([
    ['speed', () => spindleSpeed({ diameter: 50, vc: 150 })],
    ['thread', () => threadDimensions({ family: 'metric', designation: 'M30×3.5', pitch: 3.5, major: 30, flankAngle: 60 })],
    ['threeWire', () => threeWireM({ family: 'metric', designation: 'M30×2', pitch: 2, major: 30, flankAngle: 60 }, 1.1547)],
    ['taper', () => taperCalc({ big: 32, small: 27, length: 50 })],
    ['tolerance', () => toleranceCompose({ nominal: 40, grade: 7, fundamental: 'H' }, 0.025, 0)],
    ['triangle', () => solveTriangle({ a: 30, b: 40, c: 50 })],
    ['weight', () => barWeight({ shape: 'round', dims: { D: 50, L: 100 }, density: 7.85 })],
    ['gcode', () => fanucG76({ minorDiameter: 26.211, endZ: -30, threadDepthMM: 1.894375, firstCutDepthMM: 0.4, lead: 3.5 })],
  ])('%s 未实现时抛 PANIC', (_name, fn) => {
    expect(fn).toThrowError(/PANIC/);
  });

  it('arc 工况 12 个注册且未实现时抛 PANIC', () => {
    const all = [...arcCasesA, ...arcCasesB];
    expect(all).toHaveLength(12);
    for (const c of all) {
      expect(() => c.solve({ R: 5, angle: 45, dX: 10, dZ: 10, stepD: 36, stepX: 10, stepZ: 10, R1: 10, R2: 6, lead: 3.5, boreD: 30 })).toThrowError(/PANIC/);
    }
  });
});

describe('Lead 预置几何助手（真实断言，W2 全程零漂移）', () => {
  it('degToDMS：2.862405° → 2°51′45″（WAVE-PLAN §4 #3）', () => {
    expect(degToDMS(2.862405)).toBe('2°51′45″');
  });

  it('judgeArcDirection：前/后刀架翻转', () => {
    const center = { x: 0, z: 0 };
    const start = { x: 10, z: 0 };
    const end = { x: 0, z: 10 };
    const front = judgeArcDirection(center, start, end, false);
    const rear = judgeArcDirection(center, start, end, true);
    expect(['G02', 'G03']).toContain(front);
    expect(rear).toBe(front === 'G02' ? 'G03' : 'G02');
  });
});
