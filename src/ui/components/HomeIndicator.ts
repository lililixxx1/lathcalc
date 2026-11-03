/**
 * 车工算 LathCalc · 底部 Home 指示条（设计稿 HOME 片段）
 *
 * 纯装饰（aria-hidden），仅用于 390×844 设计稿还原。
 */
import { ensureBaseStyles, injectStyle } from './base';

const CSS = `
.la-home { flex: 0 0 20px; position: relative; }
.la-home::after { content: ''; position: absolute; left: 50%; bottom: 6px; transform: translateX(-50%); width: 118px; height: 4px; border-radius: 999px; background: var(--la-ink); opacity: 0.8; }
.rc-homebar { flex: 0 0 20px; position: relative; }
`;

/** 渲染底部 Home 指示条。 */
export function HomeIndicator(): HTMLElement {
  ensureBaseStyles();
  injectStyle('rc-homebar-styles', CSS);
  const el = document.createElement('div');
  el.className = 'la-home rc-homebar';
  el.setAttribute('aria-hidden', 'true');
  return el;
}
