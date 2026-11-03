// @vitest-environment happy-dom
/**
 * W4-C3 · p05 圆弧切点工况图库
 *
 * 断言：12 工况卡顺序 / 名称 / 锚点参数 / SVG；点击进入 p06 并带 case 参数；
 * 空参数与返回链路。期望名称取自 core（arc-cases-a/b），非设计稿 mock 数值。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRouter, type Router } from '../src/ui/router';

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
