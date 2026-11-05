// @vitest-environment happy-dom
/**
 * W4-C1 · Hash 路由契约测试
 *
 * 覆盖：解析 / 生成、16 页可达（W11 预置扩 p15/p16）、参数传递、清理回调逆序、非法路由回退、错误卡、stop 清空。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  PAGES,
  PAGE_IDS,
  createRouter,
  parseRoute,
  routeHash,
  type PageId,
  type PageLoader,
  type Router,
} from '../src/ui/router';

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

describe('parseRoute / routeHash', () => {
  it('解析合法页面与查询参数', () => {
    const route = parseRoute('#/p03?family=metric&d=30&p=3.5');
    expect(route.pageId).toBe('p03');
    expect(route.params.get('family')).toBe('metric');
    expect(route.params.get('d')).toBe('30');
    expect(route.params.get('p')).toBe('3.5');
  });

  it('接受无斜杠 hash，非法页面回退 p01', () => {
    expect(parseRoute('#p05').pageId).toBe('p05');
    expect(parseRoute('#/p99').pageId).toBe('p01');
    expect(parseRoute('').pageId).toBe('p01');
  });

  it('routeHash 序列化参数并忽略 null/undefined', () => {
    expect(routeHash('p03', { d: 30, p: 3.5 })).toBe('#/p03?d=30&p=3.5');
    expect(routeHash('p02')).toBe('#/p02');
    expect(routeHash('p09', { d: 50, vc: null, junk: undefined })).toBe('#/p09?d=50');
  });
});

describe('createRouter', () => {
  it('默认渲染 p01 并写入标题', async () => {
    router = createRouter({ root: app });
    await router.start();

    expect(router.current()).toBe('p01');
    expect(window.location.hash).toBe('#/p01');
    expect(app.querySelector('.la-page')?.getAttribute('data-page')).toBe('p01');
    expect(document.title).toBe('首页 · 车工算 LathCalc');
  });

  it('可导航全部 16 页（占位页可达，p15/p16 为 W11 stub）', async () => {
    router = createRouter({ root: app });
    await router.start();

    for (const pageId of PAGE_IDS) {
      await router.navigate(pageId);
      expect(window.location.hash).toBe(routeHash(pageId));
      expect(router.current()).toBe(pageId);
      expect(app.querySelector('.la-page')?.getAttribute('data-page')).toBe(pageId);
      expect(app.querySelector('.la-page')).not.toBeNull();
    }
    expect(PAGE_IDS).toHaveLength(16); // W11 预置扩 p15/p16（V4.1 §1b）
  });

  // 占位页断言已按卡拆分至 test/placeholder-w4c2..c5.test.ts（Lead 转红拆分，2026-11-03）：
  // 各卡实现对应页面后删除自己的占位文件（B.2 规则），本文件不再断言占位内容。

  it('navigate 携带参数并落在 hash + 解析结果中', async () => {    router = createRouter({ root: app });
    await router.start();
    await router.navigate('p03', { family: 'metric', spec: 'M30 × 3.5', d: 30, p: 3.5 });

    const parsed = parseRoute(window.location.hash);
    expect(parsed.pageId).toBe('p03');
    expect(parsed.params.get('family')).toBe('metric');
    expect(parsed.params.get('spec')).toBe('M30 × 3.5');
    expect(parsed.params.get('d')).toBe('30');
    expect(parsed.params.get('p')).toBe('3.5');
    expect(router.current()).toBe('p03');
  });

  it('非法 hash 回退 p01 并规范化地址', async () => {
    window.location.hash = '#/nope?x=1';
    router = createRouter({ root: app });
    await router.start();

    expect(router.current()).toBe('p01');
    expect(window.location.hash).toBe('#/p01?x=1');
    expect(app.querySelector('.la-page')?.getAttribute('data-page')).toBe('p01');
  });

  it('页面收到 params，离开时按注册逆序执行 cleanup', async () => {
    const original: PageLoader = PAGES.p12;
    const events: string[] = [];
    (PAGES as Record<PageId, PageLoader>).p12 = async () => ({
      title: '参数测试页',
      render(ctx) {
        events.push(`render:${ctx.params.get('d')}`);
        ctx.onCleanup(() => events.push('cleanup-1'));
        ctx.onCleanup(() => events.push('cleanup-2'));
        ctx.root.append(document.createTextNode('临时页'));
      },
    });

    try {
      router = createRouter({ root: app });
      await router.start();
      await router.navigate('p12', { d: 50 });
      expect(events).toEqual(['render:50']);
      expect(router.current()).toBe('p12');
      expect(document.title).toBe('参数测试页 · 车工算 LathCalc');

      await router.navigate('p13');
      expect(events).toEqual(['render:50', 'cleanup-2', 'cleanup-1']);
      expect(router.current()).toBe('p13');
    } finally {
      (PAGES as Record<PageId, PageLoader>).p12 = original;
    }
  });

  it('加载失败时渲染错误卡并回调 onError', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const original: PageLoader = PAGES.p12;
    const errors: unknown[] = [];
    (PAGES as Record<PageId, PageLoader>).p12 = async () => {
      throw new Error('boom');
    };

    try {
      router = createRouter({ root: app, onError: (error) => errors.push(error) });
      await router.start();
      await router.navigate('p12');

      expect(errors).toHaveLength(1);
      expect(app.querySelector('.rc-route-error')?.textContent).toContain('boom');
      expect(router.current()).toBeNull();
    } finally {
      (PAGES as Record<PageId, PageLoader>).p12 = original;
    }
  });

  it('stop 执行清理并清空挂载点', async () => {
    router = createRouter({ root: app });
    await router.start();
    expect(app.querySelector('.la-page')).not.toBeNull();

    router.stop();
    expect(app.childElementCount).toBe(0);
    expect(router.current()).toBeNull();
  });

  it('同 hash 重复 navigate 会重新挂载（旧节点被替换）', async () => {
    router = createRouter({ root: app });
    await router.start();
    const first = app.querySelector('.la-page');
    expect(first).not.toBeNull();

    await router.navigate('p01');
    const second = app.querySelector('.la-page');
    expect(second).not.toBeNull();
    expect(second).not.toBe(first);
  });
});
