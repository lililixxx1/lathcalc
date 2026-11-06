// @vitest-environment happy-dom
/**
 * W4-C3 · p05 圆弧切点工况图库
 *
 * 断言：12 工况卡顺序 / 名称 / 锚点参数 / SVG；点击进入 p06 并带 case 参数；
 * 空参数与返回链路。期望名称取自 core（arc-cases-a/b），非设计稿 mock 数值。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRouter, type Router } from '../src/ui/router';
import { arcCaseGraphic } from '../src/ui/pages/p05';
import type { ArcCaseId } from '../src/core/types';

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

const CASES: readonly { id: string; name: string; anchor: string }[] = [
  { id: 'AC01', name: '直线—圆弧相切', anchor: 'R · α · 台阶Ø' },
  { id: 'AC02', name: '两圆弧外切', anchor: 'R1 · R2 · dZ · X0基准' },
  { id: 'AC03', name: '两圆弧内切', anchor: 'R1 > R2 · dZ · X0基准' },
  { id: 'AC04', name: '圆弧—斜线—圆弧', anchor: 'R1 · R2 · α · L=R1+R2' },
  { id: 'AC05', name: '台阶倒圆', anchor: 'R · stepX · stepZ' },
  { id: 'AC06', name: '凹圆弧切入', anchor: 'R · dX · dZ · X0基准' },
  { id: 'AC07', name: '凸圆弧收尾', anchor: 'R · dX · dZ' },
  { id: 'AC08', name: '端面切弧', anchor: 'R · dZ' },
  { id: 'AC09', name: '锥面切弧', anchor: 'R · 半角α' },
  { id: 'AC10', name: '圆弧螺纹入口', anchor: 'R · lead' },
  { id: 'AC11', name: '球面收尾', anchor: 'R' },
  { id: 'AC12', name: '内孔圆弧过渡', anchor: 'R · 孔径' },
];

function p05Page(): HTMLElement | null {
  return app.querySelector<HTMLElement>('.la-page[data-page="p05"]');
}

describe('p05 工况图库', () => {
  it('按 AC01–AC12 顺序渲染 12 卡：名称 / 锚点参数 / SVG / 无障碍名齐全', async () => {
    await router.navigate('p05');

    const page = p05Page();
    expect(page).not.toBeNull();
    expect(page?.querySelector('.rc-topbar__title')?.textContent).toBe('圆弧切点');
    expect(page?.querySelectorAll('.rc-grid2 .rc-tile--compact')).toHaveLength(12);

    const tiles = Array.from(page?.querySelectorAll<HTMLElement>('.rc-tile--compact') ?? []);
    CASES.forEach((entry, index) => {
      const tile = tiles[index];
      expect(tile).toBeDefined();
      expect(tile?.tagName).toBe('BUTTON');
      expect(tile?.dataset.case).toBe(entry.id);
      expect(tile?.querySelector('.rc-tile__name')?.textContent).toBe(entry.name);
      expect(tile?.querySelector('.rc-p05__anchor')?.textContent).toBe(entry.anchor);
      expect(tile?.querySelector('.rc-tile__graphic svg')?.getAttribute('viewBox')).toBe(
        '0 0 64 34',
      );
      expect(tile?.querySelector('circle[fill="var(--la-accent)"]')).not.toBeNull();
      expect(tile?.getAttribute('aria-label')).toBe(`${entry.id} · ${entry.name} · ${entry.anchor}`);
    });
  });

  it('副标提示与 12 种计数按设计稿 p05 呈现', async () => {
    await router.navigate('p05');

    const page = p05Page();
    expect(page?.querySelector('.rc-p05__subrow')?.textContent).toContain(
      '按加工情境选择工况，橙点即切点',
    );
    expect(page?.querySelector('.rc-p05__count')?.textContent).toBe('12 种 · 持续补充');
  });

  it('点击 AC01 卡 → p06?case=AC01，标题 / 徽标 / 程序行正确', async () => {
    await router.navigate('p05');

    const tile = p05Page()?.querySelector<HTMLElement>('.rc-tile--compact[data-case="AC01"]');
    expect(tile).not.toBeNull();
    tile?.click();

    await vi.waitFor(() => expect(router.current()).toBe('p06'));
    expect(window.location.hash).toBe('#/p06?case=AC01');

    const p06 = app.querySelector<HTMLElement>('.la-page[data-page="p06"]');
    expect(p06).not.toBeNull();
    expect(p06?.querySelector('.rc-topbar__title')?.textContent).toContain('直线—圆弧相切');
    expect(p06?.querySelector('.la-badge')?.textContent).toBe('工况 01');
    expect(p06?.querySelector('.rc-codecard__line')?.textContent).toBe('G02 X36 Z0 R5.0');
  });

  it('点击 AC04 卡 → p06 三参数表单（R1/R2/α）与 L=R1+R2 公式可见', async () => {
    await router.navigate('p05');

    const tile = p05Page()?.querySelector<HTMLElement>('.rc-tile--compact[data-case="AC04"]');
    expect(tile).not.toBeNull();
    tile?.click();

    await vi.waitFor(() => expect(router.current()).toBe('p06'));
    expect(window.location.hash).toBe('#/p06?case=AC04');

    const p06 = app.querySelector<HTMLElement>('.la-page[data-page="p06"]');
    const inputNames = Array.from(
      p06?.querySelectorAll<HTMLInputElement>('.rc-p06__form input') ?? [],
    ).map((input) => input.name);
    expect(inputNames).toEqual(['R1', 'R2', 'angle']);
    expect(p06?.querySelector('.rc-codecard__line')?.textContent).toBe(
      'G03 X11.314 Z5.657 R3.0',
    );
    expect(p06?.querySelector('.rc-acc__body')?.textContent).toContain('L = R1 + R2');
  });

  it('顶栏返回回到首页 p01', async () => {
    await router.navigate('p05');

    p05Page()?.querySelector<HTMLElement>('.rc-topbar__back')?.click();
    await vi.waitFor(() => expect(router.current()).toBe('p01'));
    expect(app.querySelector('.la-page[data-page="p01"]')).not.toBeNull();
  });
});

/**
 * v0.3.1 · WAVE-PLAN-V4.2 §3 冻结标注表（用户反馈「图形没有标注」）：
 * hero 变体 = 圆心灰点 + 圆心↔橙点虚线 + 尺寸线 + 符号文字；thumb 维持纯线稿。
 * 文字为符号不带数值（设计稿 mock 数值维持不采用）。
 */
const HERO_LABELS: Record<ArcCaseId, readonly string[]> = {
  AC01: ['R', 'α', 'Ø'],
  AC02: ['R1', 'R2', 'dZ'],
  AC03: ['R1', 'R2', 'dZ'],
  AC04: ['R1', 'R2', 'α', 'L'],
  AC05: ['R', 'stepX', 'stepZ'],
  AC06: ['R', 'dX', 'dZ'],
  AC07: ['R', 'dX', 'dZ'],
  AC08: ['R', 'dZ'],
  AC09: ['R', 'α'],
  AC10: ['R', 'lead'],
  AC11: ['R'],
  AC12: ['R', '孔径'],
};

describe('p05 hero 标注层（v0.3.1 · V4.2）', () => {
  it('12/12 案 hero：文字键集 = §3 冻结表，含圆心灰点与虚线半径', () => {
    for (const entry of CASES) {
      const id = entry.id as ArcCaseId;
      const svg = arcCaseGraphic(id, 'hero');
      const container = document.createElement('div');
      container.innerHTML = svg;
      const el = container.querySelector('svg');
      expect(el, id).not.toBeNull();

      const texts = Array.from(el?.querySelectorAll('text') ?? []).map((node) => node.textContent);
      expect(texts, id).toEqual([...HERO_LABELS[id]]);

      // 圆心灰点（token 色）与虚线半径（dasharray）齐备
      expect(el?.querySelector('circle[fill="var(--la-sub)"]'), id).not.toBeNull();
      expect(svg, id).toContain('stroke-dasharray="1.6 1.2"');
    }
  });

  it('thumb 回归：纯线稿零 text、零虚线（64×34 放不下标注，锚点行在卡上）', () => {
    for (const entry of CASES) {
      const svg = arcCaseGraphic(entry.id as ArcCaseId);
      expect(svg, entry.id).not.toContain('<text');
      expect(svg, entry.id).not.toContain('stroke-dasharray');
      expect(svg, entry.id).not.toContain('var(--la-sub)');
    }
  });

  it('hero 色值契约：零内联十六进制，全部 var()/currentColor/none（契约 §4.2）', () => {
    for (const entry of CASES) {
      const svg = arcCaseGraphic(entry.id as ArcCaseId, 'hero');
      expect(svg, entry.id).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    }
  });

  it('p06 集成：AC01 大图入页为参数化值标签（V4.3-01：R5/α45°/Ø36，缺省黄金输入）', async () => {
    await router.navigate('p06', { case: 'AC01' });
    const p06 = app.querySelector<HTMLElement>('.la-page[data-page="p06"]');
    const texts = Array.from(p06?.querySelectorAll('.rc-p06__diagram svg text') ?? []).map(
      (node) => node.textContent,
    );
    // V4.3 试点：AC01 参数化图形回显求解器真值（缺省 R5/α45/Ø36），非 v0.3.1 符号层
    expect(texts).toEqual(['R5', 'α45°', 'Ø36']);
  });
});
