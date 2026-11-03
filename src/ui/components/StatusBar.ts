/**
 * 车工算 LathCalc · 手机状态栏（设计稿 SB 片段）
 *
 * 纯装饰（aria-hidden），用于 390×844 设计稿逐区块还原。
 */
import { ensureBaseStyles, injectStyle } from './base';

const CSS = `
.la-status { flex: 0 0 42px; display: flex; align-items: flex-end; justify-content: space-between; padding: 0 24px 5px; color: var(--la-ink); }
.rc-status__time { font-size: 13px; font-weight: 600; }
.rc-status__icons { display: block; flex: 0 0 auto; }
`;

const STATUS_SVG = `<svg class="rc-status__icons" width="60" height="12" viewBox="0 0 62 12" fill="currentColor" aria-hidden="true"><rect x="0" y="7" width="3" height="4" rx="0.8"/><rect x="4.5" y="5" width="3" height="6" rx="0.8"/><rect x="9" y="3" width="3" height="8" rx="0.8"/><rect x="13.5" y="1" width="3" height="10" rx="0.8"/><path d="M27.5 3.4a9.2 9.2 0 0 0-6.3 2.4l1.3 1.4a7.4 7.4 0 0 1 10 0l1.3-1.4a9.2 9.2 0 0 0-6.3-2.4z"/><path d="M27.5 7.2a5.5 5.5 0 0 0-3.7 1.4l3.7 3.4 3.7-3.4a5.5 5.5 0 0 0-3.7-1.4z"/><rect x="40" y="1.5" width="17.5" height="9" rx="2.5" fill="none" stroke="currentColor" stroke-opacity="0.4"/><rect x="42" y="3.5" width="11" height="5" rx="1"/><rect x="58.8" y="4.4" width="1.8" height="3.2" rx="0.8" fill-opacity="0.4"/></svg>`;

/** 渲染设计稿状态栏（9:41 + 信号/WiFi/电量）。 */
export function StatusBar(): HTMLElement {
  ensureBaseStyles();
  injectStyle('rc-status-styles', CSS);
  const el = document.createElement('div');
  el.className = 'la-status rc-status';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = `<span class="la-num rc-status__time">9:41</span>${STATUS_SVG}`;
  return el;
}
