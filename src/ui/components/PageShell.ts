/**
 * 车工算 LathCalc · 页面骨架
 *
 * 页面结构（自上而下）固定为：
 *   .la-page[data-page]
 *     ├─ StatusBar（可选，默认渲染）
 *     ├─ TopBar / HomeHeader（页面自建，作为 top 传入）
 *     ├─ .la-body（createBody；页面内容填充点）
 *     ├─ footer（可选）
 *     └─ HomeIndicator（可选，默认渲染）
 *
 * p02–p14 占位骨架使用 renderPlaceholder；后续卡整段替换 render() 即可，骨架约定不变。
 */
import { ensureBaseStyles, injectStyle } from './base';
import { Card, Eyebrow, SubText } from './Card';
import { HomeIndicator } from './HomeIndicator';
import { StatusBar } from './StatusBar';
import { TopBar } from './TopBar';

const CSS = `
.la-page { width: 100%; height: 100%; background: var(--la-bg); color: var(--la-ink); font-family: var(--la-font); font-size: 15px; line-height: 1.5; display: flex; flex-direction: column; overflow: hidden; }
.la-page b { font-weight: 700; }
.la-body { flex: 1 1 auto; min-height: 0; padding: 4px 16px 10px; display: flex; flex-direction: column; gap: 9px; overflow: hidden; }
.rc-placeholder { display: flex; flex-direction: column; gap: 6px; }
.rc-placeholder__title { font-size: 18px; font-weight: 700; letter-spacing: -0.01em; }
.rc-placeholder__route { color: var(--la-faint); }
`;

export interface PageShellProps {
  /** 页面 ID（p01–p14），写入 data-page 供测试 / 对拍定位 */
  id: string;
  /** 顶栏节点（TopBar 或 HomeHeader） */
  top: HTMLElement;
  /** 顶栏与 body 之间的附加块（如 p01 搜索栏 / 最近使用行）；顺序即传入顺序 */
  beforeBody?: readonly HTMLElement[];
  /** 内容容器（createBody 产物） */
  body: HTMLElement;
  /** 可选页脚（p01 的离线声明等） */
  footer?: HTMLElement;
  /** 是否渲染状态栏，默认 true */
  statusBar?: boolean;
  /** 是否渲染底部 Home 指示条，默认 true */
  homeIndicator?: boolean;
  className?: string;
}

/** 组装页面骨架。类名：.la-page.rc-page[data-page="pXX"] */
export function createPage(props: PageShellProps): HTMLElement {
  ensureBaseStyles();
  injectStyle('rc-pageshell-styles', CSS);

  const page = document.createElement('div');
  page.className = props.className ? `la-page rc-page ${props.className}` : 'la-page rc-page';
  page.dataset.page = props.id;

  if (props.statusBar !== false) page.append(StatusBar());
  page.append(props.top);
  for (const block of props.beforeBody ?? []) page.append(block);
  page.append(props.body);
  if (props.footer) page.append(props.footer);
  if (props.homeIndicator !== false) page.append(HomeIndicator());

  return page;
}

export interface BodyOptions {
  className?: string;
  ariaLabel?: string;
}

/** 内容容器。类名：.la-body.rc-body（页面填充点） */
export function createBody(options: BodyOptions = {}): HTMLElement {
  ensureBaseStyles();
  injectStyle('rc-pageshell-styles', CSS);

  const el = document.createElement('div');
  el.className = options.className ? `la-body rc-body ${options.className}` : 'la-body rc-body';
  if (options.ariaLabel) el.setAttribute('aria-label', options.ariaLabel);
  return el;
}

export interface PlaceholderOptions {
  /** 页面 ID（p02–p14） */
  id: string;
  /** 页面标题,同时用于顶栏与占位卡 */
  title: string;
  badge?: string;
  badgeGray?: boolean;
  /** 后续实现卡号，如 "W4-C2" */
  plannedBy?: string;
}

/**
 * 渲染「建设中」占位页（p02–p14 的 W4-C1 骨架）。
 * 后续卡实现时：保留本文件导出与页面 title，替换 render() 内部为真实 createPage 组合即可。
 */
export function renderPlaceholder(
  ctx: { root: HTMLElement },
  options: PlaceholderOptions,
): void {
  const body = createBody();
  const card = Card({
    className: 'rc-placeholder',
    children: [
      Eyebrow(`建设中 · ${options.plannedBy ?? 'W4 后续卡'}`),
      (() => {
        const title = document.createElement('div');
        title.className = 'rc-placeholder__title';
        title.textContent = options.title;
        return title;
      })(),
      SubText('本页为 W4-C1 冻结骨架，render() 内容由后续卡整段替换。'),
      SubText(`路由：#/${options.id}`, { className: 'rc-placeholder__route' }),
    ],
  });
  body.append(card);

  ctx.root.append(
    createPage({
      id: options.id,
      top: TopBar({
        title: options.title,
        ...(options.badge ? { badge: options.badge } : {}),
        ...(options.badgeGray ? { badgeGray: true } : {}),
      }),
      body,
    }),
  );
}
