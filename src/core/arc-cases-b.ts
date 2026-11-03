/** arc-cases-b.ts · 圆弧切点工况 07–12（W2-C5 实现；几何助手见 arc.ts） */
import type { ArcCaseSolver } from './types';

export const arcCasesB: readonly ArcCaseSolver[] = [
  { id: 'AC07', name: '凸圆弧收尾', inputs: ['R', 'dX', 'dZ'], solve: (i) => { void i; throw new Error('PANIC: not implemented (W2-C5 AC07)'); } },
  { id: 'AC08', name: '端面切弧', inputs: ['R', 'dZ'], solve: (i) => { void i; throw new Error('PANIC: not implemented (W2-C5 AC08)'); } },
  { id: 'AC09', name: '锥面切弧', inputs: ['R', 'angle'], solve: (i) => { void i; throw new Error('PANIC: not implemented (W2-C5 AC09)'); } },
  { id: 'AC10', name: '圆弧螺纹入口', inputs: ['R', 'lead'], solve: (i) => { void i; throw new Error('PANIC: not implemented (W2-C5 AC10)'); } },
  { id: 'AC11', name: '球面收尾', inputs: ['R'], solve: (i) => { void i; throw new Error('PANIC: not implemented (W2-C5 AC11)'); } },
  { id: 'AC12', name: '内孔圆弧过渡', inputs: ['R', 'boreD'], solve: (i) => { void i; throw new Error('PANIC: not implemented (W2-C5 AC12)'); } },
];
