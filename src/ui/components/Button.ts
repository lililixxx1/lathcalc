/**
 * 车工算 LathCalc · 主按钮（设计稿 .la-btn）
 */
import { escapeHtml, ensureBaseStyles, injectStyle } from './base';
import { icon, type IconName } from './icons';

const CSS = `
.la-btn { display: flex; align-items: center; justify-content: center; gap: 8px; height: 50px; border-radius: 13px; background: var(--la-accent); color: var(--la-card); font-family: inherit; font-size: 15.5px; font-weight: 700; letter-spacing: 0.02em; flex: 0 0 auto; cursor: pointer; border: 0; }
.la-btn.ghost { background: var(--la-card); color: var(--la-ink); border: 1px solid var(--la-border); }
.la-btn[disabled] { opacity: 0.45; cursor: not-allowed; }
`;

export interface ButtonProps {
  /** 按钮文案（文本，自动转义） */
  label: string;
  /** primary（安全橙，默认）/ ghost（白底描边） */
  variant?: 'primary' | 'ghost';
  /** 左侧图标 */
  icon?: IconName;
  onClick?: () => void;
  ariaLabel?: string;
  disabled?: boolean;
}

/** 主按钮。类名：.la-btn.rc-btn[.ghost]；事件：点击 → onClick()。 */
export function Button(props: ButtonProps): HTMLElement {
  ensureBaseStyles();
  injectStyle('rc-button-styles', CSS);

  const el = document.createElement('button');
  el.type = 'button';
  el.className = props.variant === 'ghost' ? 'la-btn ghost rc-btn' : 'la-btn rc-btn';
  if (props.ariaLabel) el.setAttribute('aria-label', props.ariaLabel);
  el.disabled = Boolean(props.disabled);
  el.innerHTML = `${props.icon ? icon(props.icon, 16) : ''}<span>${escapeHtml(props.label)}</span>`;
  el.addEventListener('click', () => props.onClick?.());
  return el;
}
