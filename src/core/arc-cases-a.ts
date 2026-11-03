/** arc-cases-a.ts · 圆弧切点工况 01–06（W2-C4 实现；几何助手见 arc.ts）
 *  工况命名与设计稿 p05 图库一一对应。 */
import type { ArcCaseSolver } from './types';

export const arcCasesA: readonly ArcCaseSolver[] = [
  { id: 'AC01', name: '直线—圆弧相切', inputs: ['R', 'angle', 'stepD'], solve: (i) => { void i; throw new Error('PANIC: not implemented (W2-C4 AC01)'); } },
  { id: 'AC02', name: '两圆弧外切', inputs: ['R1', 'R2', 'dZ'], solve: (i) => { void i; throw new Error('PANIC: not implemented (W2-C4 AC02)'); } },
  { id: 'AC03', name: '两圆弧内切', inputs: ['R1', 'R2', 'dZ'], solve: (i) => { void i; throw new Error('PANIC: not implemented (W2-C4 AC03)'); } },
  { id: 'AC04', name: '圆弧—斜线—圆弧', inputs: ['R1', 'R2', 'angle'], solve: (i) => { void i; throw new Error('PANIC: not implemented (W2-C4 AC04)'); } },
  { id: 'AC05', name: '台阶倒圆', inputs: ['R', 'stepX', 'stepZ'], solve: (i) => { void i; throw new Error('PANIC: not implemented (W2-C4 AC05)'); } },
  { id: 'AC06', name: '凹圆弧切入', inputs: ['R', 'dX', 'dZ'], solve: (i) => { void i; throw new Error('PANIC: not implemented (W2-C4 AC06)'); } },
];
