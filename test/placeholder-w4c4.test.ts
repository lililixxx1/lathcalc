// @vitest-environment happy-dom
/**
 * W4-C4 · p07–p10 占位断言（Lead 转红拆分，2026-11-03）
 *
 * 本卡实现 p07/p08/p09/p10 后此文件必红——**随卡删除**（B.2：转红测试按卡归属拆分，可删可改）。
 * 断言语义原样取自 ui-router.test.ts 原「p02–p14 占位页」用例。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRouter, type Router } from '../src/ui/router';

const CARD_PAGES = ['p07', 'p08', 'p09', 'p10'] as const;

let app: HTMLElement;
let router: Router | undefined;

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  window.location.hash = '';
  app = document.querySelector<HTMLElement>('#app') as HTMLElement;
});

afterEach(() => {
  router?.destroy();
  router = undefined;
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

describe('W4-C4 占位页（实现后删本文件）', () => {
  it('p07–p10 占位页渲染「建设中」与页面标题', async () => {
    router = createRouter({ root: app });
    await router.start();

    for (const pageId of CARD_PAGES) {
      await router.navigate(pageId);
      const page = app.querySelector<HTMLElement>(`.la-page[data-page="${pageId}"]`);
      expect(page).not.toBeNull();
      expect(page?.querySelector('.rc-placeholder')?.textContent).toContain('建设中');
      const bodyTitle = page?.querySelector('.rc-placeholder__title')?.textContent ?? '';
      const barTitle = page?.querySelector('.rc-topbar__title')?.textContent ?? '';
      expect(bodyTitle.length).toBeGreaterThan(0);
      expect(barTitle).toContain(bodyTitle);
      expect(page?.querySelector('.rc-placeholder')?.textContent).toContain(`#/${pageId}`);
    }
    expect(CARD_PAGES).toHaveLength(4);
  });
});
