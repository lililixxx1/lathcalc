// @vitest-environment happy-dom
/**
 * V4.14-A · 宽窗舞台列 CSS 断言（冻结计划 docs/plan/WAVE-PLAN-V4.14.md §1.1 / §3）
 *
 * 仿 ui-p01.test.ts 的 V4.13 style-断言先例（注入后读 style 元素文本断言）：
 *   a. BASE_CSS 注入含 @media (min-width: 560px) + max-width: 540px + var(--la-well)
 *      （html,body 同改一并断言——G0 M-03 overscroll 橡皮筋）。
 *   b. p01 网格 scoped 升 3 列下限（G0 C-01 算式 163）。
 *   c. 回归网（G0 C-02）：p05 与 p01 共享 .la-grid2 类（p05.ts:384 经 TileGrid()），
 *      p05 挂载后的样式文本不得含 auto-fill——scoped 改动不得波及共享类。
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
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

describe('V4.14-A 宽窗舞台列', () => {
  it('BASE_CSS 注入含 @media (min-width: 560px) / max-width: 540px / var(--la-well)（html,body 同改）', async () => {
    await router.navigate('p01');
    const css = document.getElementById('rc-base-styles')?.textContent ?? '';
    expect(css).toContain('@media (min-width: 560px)');
    expect(css).toContain('max-width: 540px');
    expect(css).toContain('var(--la-well)');
    expect(css).toContain('html, body { background: var(--la-well); }');
  });

  it('rc-p01-styles 含 scoped 网格规则 .la-page[data-page="p01"] .la-grid2 + minmax(163px, 1fr)', async () => {
    await router.navigate('p01');
    const css = document.getElementById('rc-p01-styles')?.textContent ?? '';
    expect(css).toContain('.la-page[data-page="p01"] .la-grid2');
    expect(css).toContain('minmax(163px, 1fr)');
  });

  it('回归网（C-02）：p05 挂载后的样式文本不含 auto-fill（共享类 .la-grid2 未被波及）', async () => {
    // 清空 head 内已注入样式（前面用例可能已挂 p01），只看 p05 本次挂载注入的样式集
    document.querySelectorAll('style').forEach((style) => style.remove());
    await router.navigate('p05');
    const css = [...document.querySelectorAll('style')]
      .map((style) => style.textContent ?? '')
      .join('\n');
    expect(css).not.toContain('auto-fill');
    // scoped：p05 的样式集也不得混入 p01 专属规则
    expect(css).not.toContain('[data-page="p01"]');
  });
});
