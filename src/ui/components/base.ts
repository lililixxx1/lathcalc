/**
 * 车工算 LathCalc · UI 组件层基础工具（W4-C1 冻结）
 *
 * 约定：
 * - 所有组件为「工厂函数」，入参 props，返回 HTMLElement；不使用框架、不使用虚拟 DOM。
 * - 组件样式与组件同文件（本文件为公共基础样式 + 注入工具）。
 * - 颜色 / 字体一律走 var(--la-*)，组件代码禁止出现十六进制色值或字体栈字面量。
 */

export type Child = Node | string | null | undefined | false;

const BASE_CSS = `
#app { height: 100vh; height: 100dvh; }
.rc-route { width: 100%; height: 100%; }

/* 数字（DIN 风格）与等宽字体工具类，对应设计稿 la-num / la-mono */
.la-num { font-family: var(--la-font-num); font-variant-numeric: tabular-nums; letter-spacing: 0.015em; }
.la-mono { font-family: var(--la-font-mono); }

/* 排版原子件：跨组件共用，故放基础层（Card.ts 同值重复定义，幂等） */
.la-eyebrow { font-size: 10.5px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--la-sub); }
.la-sub { font-size: 12px; color: var(--la-sub); }
.la-badge { display: inline-flex; align-items: center; font-size: 10.5px; font-weight: 600; letter-spacing: 0.03em; color: var(--la-accent-ink); background: var(--la-chip-on-bg); border-radius: 999px; padding: 3px 9px; white-space: nowrap; }
.la-badge.gray { color: var(--la-sub); background: var(--la-border-soft); }

/* 仅在未指定字体时继承；:where 降低特异性，避免覆盖组件的字体声明 */
:where(.la-page) button { font-family: inherit; }
:where(.la-page) input { font-family: inherit; }

/* 键盘可达性：统一焦点环 */
:where(.la-page) :focus-visible { outline: 2px solid var(--la-accent); outline-offset: 2px; }
`;

/** 向 document.head 注入一次性样式（同 id 只注入一次）。Node 环境（无 document）静默跳过。 */
export function injectStyle(id: string, css: string): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById(id)) return;
  const tag = document.createElement('style');
  tag.id = id;
  tag.textContent = css;
  document.head.append(tag);
}

/** 公共基础样式（#app 尺寸、la-num/la-mono、焦点环）。所有组件工厂都会调用，幂等。 */
export function ensureBaseStyles(): void {
  injectStyle('rc-base-styles', BASE_CSS);
}

/** 把单根 HTML 模板解析为 HTMLElement。模板必须恰有一个根元素。 */
export function html(markup: string): HTMLElement {
  if (typeof document === 'undefined') {
    throw new Error('rc: DOM 不可用（组件必须在浏览器 / happy-dom 环境渲染）');
  }
  const template = document.createElement('template');
  template.innerHTML = markup.trim();
  const node = template.content.firstElementChild;
  if (!(node instanceof HTMLElement)) {
    throw new Error('rc: 模板必须包含且仅包含一个根元素');
  }
  return node;
}

/** 转义动态文本，用于拼接 innerHTML 时防注入。 */
export function escapeHtml(value: unknown): string {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/** 拼接 className（过滤 false / null / undefined）。 */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter((part): part is string => Boolean(part)).join(' ');
}

/** 追加子节点；字符串按文本节点插入（不解析 HTML）。 */
export function appendChildren(parent: HTMLElement, children: readonly Child[]): void {
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    parent.append(child instanceof Node ? child : document.createTextNode(child));
  }
}

/** 创建带文本与类名的 span（组件内部高频小工具）。 */
export function span(className: string, text: string): HTMLSpanElement {
  const el = document.createElement('span');
  if (className) el.className = className;
  el.textContent = text;
  return el;
}
