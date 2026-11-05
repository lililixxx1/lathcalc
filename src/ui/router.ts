/**
 * 车工算 LathCalc · Hash 路由（W4-C1 冻结契约）
 *
 * 路由形态：#/<pageId>?<query>
 *   - 页面 ID：p01–p14（唯一合法集合，大小写敏感）
 *   - 非法 / 空 hash → 回退 p01
 *   - 参数：URLSearchParams；页面间传参约定见 src/ui/README.md
 *
 * 挂载生命周期：
 *   start() → 解析 hash → 懒加载页面模块 → createRouter 专用 host（.rc-route）→ module.render(ctx)
 *   navigate() / hashchange → 先执行上一页 onCleanup（逆序）→ 移除旧 host → 再挂新页
 *   stop() → 移除监听 + 清理 + 清空 root
 *
 * 页面模块契约：{ title: string; render(ctx): void | Promise<void> }
 * 页面通过 ctx.root.append(...) 自行挂载 .la-page（见 components/PageShell.ts）。
 */
import { ensureBaseStyles, injectStyle } from './components/base';

export const PAGE_IDS = [
  'p01',
  'p02',
  'p03',
  'p04',
  'p05',
  'p06',
  'p07',
  'p08',
  'p09',
  'p10',
  'p11',
  'p12',
  'p13',
  'p14',
  'p15',
  'p16',
] as const;

export type PageId = (typeof PAGE_IDS)[number];

/** 路由参数值类型；null / undefined 在 routeHash 中被忽略。 */
export type PageParams = Record<string, string | number | boolean | null | undefined>;

export interface PageContext {
  /** 本页专用挂载点（.rc-route）；页面 append 自己的 .la-page */
  root: HTMLElement;
  /** 当前页面 ID */
  pageId: PageId;
  /** 解析后的查询参数（只读使用；不要原地修改后依赖路由刷新） */
  params: URLSearchParams;
  /** 跳转到其他页面（支持参数） */
  navigate: (pageId: PageId, params?: PageParams) => Promise<void>;
  /** 注册卸载回调；路由离开本页时逆序执行，用于移除全局监听 / 定时器 */
  onCleanup: (fn: () => void) => void;
}

export interface PageModule {
  /** 页面标题（写入 document.title）。占位页与实现页都必须是稳定标题 */
  title: string;
  /** 渲染到 ctx.root；可同步或异步 */
  render(ctx: PageContext): void | Promise<void>;
}

export type PageLoader = () => Promise<PageModule>;

export interface ParsedRoute {
  pageId: PageId;
  params: URLSearchParams;
}

/** 解析 hash（接受带或不带 "#" 前缀）。非法页面 ID 回退 fallback。 */
export function parseRoute(hash: string, fallback: PageId = 'p01'): ParsedRoute {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash;
  const queryIndex = raw.indexOf('?');
  const path = (queryIndex >= 0 ? raw.slice(0, queryIndex) : raw).replace(/^\//, '');
  const query = queryIndex >= 0 ? raw.slice(queryIndex + 1) : '';
  const pageId = (PAGE_IDS as readonly string[]).includes(path) ? (path as PageId) : fallback;
  return { pageId, params: new URLSearchParams(query) };
}

/** 生成规范 hash。参数按对象键顺序序列化，空值（null/undefined）忽略。 */
export function routeHash(pageId: PageId, params?: PageParams): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value === null || value === undefined) continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  return `#/${pageId}${query ? `?${query}` : ''}`;
}

/**
 * 14 页注册表。动态 import 实现按路由懒加载（构建产物按页分 chunk）。
 * 新增页面必须先加入 PAGE_IDS；C2–C5 只替换 pages/*.ts 的实现，不改本注册表结构。
 */
export const PAGES: Readonly<Record<PageId, PageLoader>> = {
  p01: () => import('./pages/p01').then((module) => module.default),
  p02: () => import('./pages/p02').then((module) => module.default),
  p03: () => import('./pages/p03').then((module) => module.default),
  p04: () => import('./pages/p04').then((module) => module.default),
  p05: () => import('./pages/p05').then((module) => module.default),
  p06: () => import('./pages/p06').then((module) => module.default),
  p07: () => import('./pages/p07').then((module) => module.default),
  p08: () => import('./pages/p08').then((module) => module.default),
  p09: () => import('./pages/p09').then((module) => module.default),
  p10: () => import('./pages/p10').then((module) => module.default),
  p11: () => import('./pages/p11').then((module) => module.default),
  p12: () => import('./pages/p12').then((module) => module.default),
  p13: () => import('./pages/p13').then((module) => module.default),
  p14: () => import('./pages/p14').then((module) => module.default),
  p15: () => import('./pages/p15').then((module) => module.default),
  p16: () => import('./pages/p16').then((module) => module.default),
};

const RC_ROUTER_CSS = `
.rc-route-error { display: flex; flex-direction: column; gap: 8px; padding: 24px; color: var(--la-ink-body); background: var(--la-bg); min-height: 100%; font-family: var(--la-font); font-size: 13px; }
.rc-route-error strong { font-size: 15px; color: var(--la-ink); }
`;

export interface RouterOptions {
  /** 应用挂载根（#app） */
  root: HTMLElement;
  /** 非法路由回退页，默认 p01 */
  fallback?: PageId;
  /** document.title 后缀，默认 "车工算 LathCalc" */
  titleSuffix?: string;
  /** 页面加载 / 渲染异常回调（默认仅 console.error + 错误卡） */
  onError?: (error: unknown, pageId: PageId) => void;
}

export interface Router {
  /** 绑定 hashchange 并渲染当前路由；可重复调用（幂等） */
  start(): Promise<void>;
  /** 停止监听、执行清理并清空 root；可再次 start */
  stop(): void;
  /** 跳转并等待目标页渲染完成 */
  navigate(pageId: PageId, params?: PageParams): Promise<void>;
  /** 当前已渲染页面（未开始 / 加载中为 null） */
  current(): PageId | null;
  /** stop 的别名（供测试 teardown / 应用卸载） */
  destroy(): void;
}

/**
 * 创建路由实例。root 的既有子节点会在首次渲染时被替换。
 * 同 hash 的重复 navigate 会强制重新挂载（用于数据刷新场景）。
 */
export function createRouter(options: RouterOptions): Router {
  const { root } = options;
  const fallback = options.fallback ?? 'p01';
  const titleSuffix = options.titleSuffix ?? '车工算 LathCalc';

  let started = false;
  let host: HTMLElement | null = null;
  let currentPage: PageId | null = null;
  let cleanups: Array<() => void> = [];
  let lastHash: string | null = null;
  let generation = 0;
  let chain: Promise<void> = Promise.resolve();

  injectStyle('rc-router-styles', RC_ROUTER_CSS);
  ensureBaseStyles();

  function canonicalHash(raw: string): string {
    const { pageId, params } = parseRoute(raw, fallback);
    const query = params.toString();
    return `#/${pageId}${query ? `?${query}` : ''}`;
  }

  function runCleanups(): void {
    const pending = cleanups.slice().reverse();
    cleanups = [];
    for (const cleanup of pending) {
      try {
        cleanup();
      } catch (error) {
        console.error('[router] 页面清理回调失败', error);
      }
    }
  }

  function renderError(error: unknown, pageId: PageId): void {
    if (host) {
      host.remove();
      host = null;
    }
    const errorHost = document.createElement('div');
    errorHost.className = 'rc-route';
    errorHost.dataset.route = pageId;
    errorHost.innerHTML = '<div class="rc-route-error" role="alert"><strong>页面加载失败</strong><span></span></div>';
    const detail = errorHost.querySelector('span');
    if (detail) detail.textContent = error instanceof Error ? error.message : String(error);
    root.replaceChildren(errorHost);
    host = errorHost;
  }

  async function renderNow(): Promise<void> {
    const hash = canonicalHash(window.location.hash);
    if (hash === lastHash) return;
    lastHash = hash;

    const token = ++generation;
    const { pageId, params } = parseRoute(hash, fallback);

    runCleanups();
    if (host) {
      host.remove();
      host = null;
    }
    currentPage = null;

    try {
      const module = await PAGES[pageId]();
      if (token !== generation) return;

      const nextHost = document.createElement('div');
      nextHost.className = 'rc-route';
      nextHost.dataset.route = pageId;
      root.replaceChildren(nextHost);
      host = nextHost;

      const ctx: PageContext = {
        root: nextHost,
        pageId,
        params,
        navigate,
        onCleanup: (fn) => cleanups.push(fn),
      };

      await module.render(ctx);
      if (token !== generation) {
        nextHost.remove();
        return;
      }

      currentPage = pageId;
      document.title = `${module.title} · ${titleSuffix}`;
    } catch (error) {
      if (token !== generation) return;
      console.error(`[router] 页面 ${pageId} 加载/渲染失败`, error);
      options.onError?.(error, pageId);
      renderError(error, pageId);
    }
  }

  /** 串行化渲染，保证 hashchange 与 navigate 的并发调用不会交错。 */
  function scheduleRender(): Promise<void> {
    const next = chain.then(() => renderNow());
    chain = next.catch(() => undefined);
    return next;
  }

  function onHashChange(): void {
    void scheduleRender();
  }

  async function navigate(pageId: PageId, params?: PageParams): Promise<void> {
    const target = routeHash(pageId, params);
    if (window.location.hash === target) {
      // 同 hash 显式导航：强制重挂载
      lastHash = null;
    } else {
      window.location.hash = target;
    }
    await scheduleRender();
  }

  async function start(): Promise<void> {
    if (!started) {
      started = true;
      window.addEventListener('hashchange', onHashChange);
      const raw = window.location.hash;
      const canonical = canonicalHash(raw);
      if (raw !== canonical) {
        window.history.replaceState(null, '', canonical);
      }
    }
    await scheduleRender();
  }

  function stop(): void {
    if (started) {
      window.removeEventListener('hashchange', onHashChange);
      started = false;
    }
    generation += 1;
    runCleanups();
    if (host) {
      host.remove();
      host = null;
    }
    root.replaceChildren();
    currentPage = null;
    lastHash = null;
    chain = Promise.resolve();
  }

  return {
    start,
    stop,
    navigate,
    current: () => currentPage,
    destroy: stop,
  };
}
