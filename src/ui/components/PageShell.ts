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
 * p02–p14 曾用「建设中」占位骨架（W4-C1）；16 页已全部实现，
 * 占位渲染与独占参数接口已随 V4.15-W2 退役，页面骨架约定不变。
 */
import { ensureBaseStyles, injectStyle } from './base';
import { HomeIndicator } from './HomeIndicator';
import { StatusBar } from './StatusBar';

const CSS = `
.la-page { width: 100%; height: 100%; background: var(--la-bg); color: var(--la-ink); font-family: var(--la-font); font-size: 15px; line-height: 1.5; display: flex; flex-direction: column; overflow: hidden; }
.la-page b { font-weight: 700; }
.la-body { flex: 1 1 auto; min-height: 0; padding: 4px 16px 10px; display: flex; flex-direction: column; gap: 9px; overflow: hidden; }
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
