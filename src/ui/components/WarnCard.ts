/**
 * 车工算 LathCalc · 警示条（设计稿 .la-warn）
 */
import { ensureBaseStyles, injectStyle } from './base';
import { icon } from './icons';

const CSS = `
.la-warn { display: flex; gap: 8px; background: var(--la-warn-bg); border: 1px solid var(--la-warn-border); color: var(--la-warn-ink); border-radius: 12px; padding: 9px 12px; font-size: 11.5px; line-height: 1.55; align-items: flex-start; flex: 0 0 auto; }
.rc-warn__icon { flex: 0 0 auto; display: grid; place-items: center; }
.rc-warn__text { flex: 1; min-width: 0; }
`;

export interface WarnCardProps {
  /** 警示文案（纯文本） */
  text: string;
  ariaLabel?: string;
}

/** 警示条。类名：.la-warn.rc-warn / .rc-warn__icon / .rc-warn__text */
export function WarnCard(props: WarnCardProps): HTMLElement {
  ensureBaseStyles();
  injectStyle('rc-warncard-styles', CSS);

  const el = document.createElement('div');
  el.className = 'la-warn rc-warn';
  el.setAttribute('role', 'note');
  if (props.ariaLabel) el.setAttribute('aria-label', props.ariaLabel);

  const iconEl = document.createElement('span');
  iconEl.className = 'rc-warn__icon';
  iconEl.innerHTML = icon('warn', 15, 1.9);

  const text = document.createElement('span');
  text.className = 'rc-warn__text';
  text.textContent = props.text;

  el.append(iconEl, text);
  return el;
}
