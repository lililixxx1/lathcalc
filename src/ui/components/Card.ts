/**
 * 车工算 LathCalc · 卡片与排版原子件
 *
 * Card / Eyebrow / SubText / Badge 均对应设计稿 .la-card / .la-eyebrow / .la-sub / .la-badge。
 */
import { appendChildren, type Child, ensureBaseStyles, injectStyle } from './base';

const CSS = `
.la-card { background: var(--la-card); border: 1px solid var(--la-border); border-radius: var(--la-r-card); padding: 12px 14px; }
.la-card.tight { padding: 3px 14px; }
.la-sub { font-size: 12px; color: var(--la-sub); }
.la-eyebrow { font-size: 10.5px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--la-sub); }
.la-badge { display: inline-flex; align-items: center; font-size: 10.5px; font-weight: 600; letter-spacing: 0.03em; color: var(--la-accent-ink); background: var(--la-chip-on-bg); border-radius: 999px; padding: 3px 9px; white-space: nowrap; }
.la-badge.gray { color: var(--la-sub); background: var(--la-border-soft); }
.rc-sub--center { text-align: center; display: block; }
`;

export interface CardProps {
  /** 卡片内子节点；字符串按文本插入 */
  children?: readonly Child[];
  /** 紧凑内边距（设计稿 .la-card.tight，用于结果行列表） */
  tight?: boolean;
  /** 追加自定义类名（供页面局部布局用，不得覆盖 token） */
  className?: string;
  ariaLabel?: string;
}

/** 白色卡片容器。类名：.la-card.rc-card（tight 时追加 .tight） */
export function Card(props: CardProps = {}): HTMLElement {
  ensureBaseStyles();
  injectStyle('rc-card-styles', CSS);
  const el = document.createElement('div');
  el.className = props.tight ? 'la-card tight rc-card' : 'la-card rc-card';
  if (props.className) el.classList.add(...props.className.split(/\s+/).filter(Boolean));
  if (props.ariaLabel) el.setAttribute('aria-label', props.ariaLabel);
  appendChildren(el, props.children ?? []);
  return el;
}

/** 小号大写眉标。类名：.la-eyebrow.rc-eyebrow */
export function Eyebrow(text: string): HTMLElement {
  ensureBaseStyles();
  injectStyle('rc-card-styles', CSS);
  const el = document.createElement('div');
  el.className = 'la-eyebrow rc-eyebrow';
  el.textContent = text;
  return el;
}

export interface SubTextOptions {
  center?: boolean;
  className?: string;
}

/** 说明灰文字。类名：.la-sub.rc-sub（center=true 时追加 .rc-sub--center） */
export function SubText(text: string, options: SubTextOptions = {}): HTMLElement {
  ensureBaseStyles();
  injectStyle('rc-card-styles', CSS);
  const el = document.createElement('div');
  el.className = options.center ? 'la-sub rc-sub rc-sub--center' : 'la-sub rc-sub';
  if (options.className) el.classList.add(...options.className.split(/\s+/).filter(Boolean));
  el.textContent = text;
  return el;
}

export interface BadgeOptions {
  /** 灰底徽标（示例数据 / 待补） */
  gray?: boolean;
}

/** 胶囊徽标。类名：.la-badge.rc-badge（gray 时追加 .gray） */
export function Badge(text: string, options: BadgeOptions = {}): HTMLElement {
  ensureBaseStyles();
  injectStyle('rc-card-styles', CSS);
  const el = document.createElement('span');
  el.className = options.gray ? 'la-badge rc-badge gray' : 'la-badge rc-badge';
  el.textContent = text;
  return el;
}
