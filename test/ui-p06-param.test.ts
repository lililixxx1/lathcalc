// @vitest-environment happy-dom
/**
 * ui-p06-param.test.ts · p06 参数化大图集成（V4.3 试点：AC01/AC05）
 *
 * 断言：入页即参数化值标签 → 改输入图动（path d 变 + 标签变）→ 非法输入保上一帧
 * + WarnCard → AC05 同 → AC02 静态回归（10 案维持 v0.3.1 符号层）→ 装配色值契约。
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRouter, type Router } from '../src/ui/router';
import { arcCaseParametricSVG } from '../src/ui/pages/p05';
import { buildArcFigure } from '../src/core/arc-figure';

let app: HTMLElement;
let router: Router;

beforeEach(async () => {
  document.body.innerHTML = '<div id="app"></div>';
  window.location.hash = '';
  app = document.querySelector<HTMLElement>('#app') as HTMLElement;
  router = createRouter({ root: app });
  await router.start();
});

afterEach(() => {
  router.destroy();
  document.body.replaceChildren();
});

function diagramTexts(): string[] {
  return Array.from(app.querySelectorAll('.rc-p06__diagram svg text')).map((n) => n.textContent);
}

function diagramPaths(): (string | null)[] {
  return Array.from(app.querySelectorAll('.rc-p06__diagram svg path')).map((n) => n.getAttribute('d'));
}

function setInput(name: string, value: string): void {
  const el = app.querySelector<HTMLInputElement>(`input[name="${name}"]`);
  if (!el) throw new Error(`input ${name} 未找到`);
  el.value = value;
  el.dispatchEvent(new Event('input'));
}

describe('p06 参数化大图（V4.3 试点）', () => {
  it('AC01 入页即参数化：R5/α45°/Ø36 值标签 + 弧 A 命令 + 橙点 token', async () => {
    await router.navigate('p06', { case: 'AC01' });
    expect(diagramTexts()).toEqual(['R5', 'α45°', 'Ø36']);
    const svg = app.querySelector('.rc-p06__diagram svg');
    expect(svg?.innerHTML).toMatch(/A\d/); // 轮廓弧用 A 命令（等比保圆）
    expect(app.querySelector('.rc-p06__diagram circle[fill="var(--la-accent)"]')).not.toBeNull();
  });

  it('AC01 改 R 5→20：path d 集变化（图动）且标签 R20', async () => {
    await router.navigate('p06', { case: 'AC01' });
    const before = diagramPaths();
    setInput('R', '20');
    expect(diagramTexts()).toEqual(['R20', 'α45°', 'Ø36']);
    expect(diagramPaths()).not.toEqual(before);
  });

  it('AC01 非法输入：保上一帧图形 + 结果区呈 WarnCard', async () => {
    await router.navigate('p06', { case: 'AC01' });
    setInput('R', '20');
    const good = diagramPaths();
    setInput('R', '');
    expect(diagramPaths()).toEqual(good); // 图形保上一帧（V4.3 §5）
    const warn = app.querySelector('.rc-p06__result .rc-warn');
    expect(warn?.textContent).toContain('请输入有效参数');
  });

  it('AC05 改 stepZ −10→−40：标签 Z-40 且 path d 集（轴向拉长）变化', async () => {
    await router.navigate('p06', { case: 'AC05' });
    expect(diagramTexts()).toEqual(['R4', 'Ø20', 'Z-10']);
    const before = diagramPaths();
    setInput('stepZ', '-40');
    expect(diagramTexts()).toEqual(['R4', 'Ø20', 'Z-40']);
    expect(diagramPaths()).not.toEqual(before);
  });

  it('AC02 静态回归：非试点案维持 v0.3.1 符号层，改输入图不动', async () => {
    await router.navigate('p06', { case: 'AC02' });
    expect(diagramTexts()).toEqual(['R1', 'R2', 'dZ']);
    const before = diagramPaths();
    setInput('R1', '12');
    expect(diagramPaths()).toEqual(before); // 静态 hero 不随输入重绘
  });

  it('装配色值契约：参数化 SVG 零内联十六进制，token 色 + currentColor（契约 §4.2）', () => {
    const svg = arcCaseParametricSVG(buildArcFigure('AC01', { R: 5, angle: 45, stepD: 36 }));
    expect(svg).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(svg).toContain('var(--la-sub)');
    expect(svg).toContain('var(--la-accent)');
    expect(svg).toContain('stroke="currentColor"');
  });
});
