/**
 * 车工算 LathCalc · 小图标按钮（设计稿 .la-copy 的行动变体）
 *
 * 用于收藏卡片的分享 / 星标、结果行复制等 28×28 图标动作。
 * 视觉与 .la-copy 一致；独立成件以保证页面不依赖 ResultCard 的样式注入。
 */
import { ensureBaseStyles, injectStyle } from './base';
import { icon, type IconName } from './icons';

const CSS = `
.la-copy { width: 28px; height: 28px; border-radius: 8px; display: grid; place-items: center; color: var(--la-faint); align-self: center; background: transparent; border: 0; cursor: pointer; flex: 0 0 auto; }
.la-copy[disabled] { opacity: 0.45; cursor: not-allowed; }
`;

export interface IconButtonProps {
  /** 图标名（share / star / copy 等） */
  icon: IconName;
  /** 无障碍名称（必填，图标按钮无可见文本） */
  ariaLabel: string;
  onClick?: () => void;
  disabled?: boolean;
}

/**
 * 图标按钮。类名：`.la-copy.rc-iconbtn`；事件：点击 → onClick()。
 * 注意：不渲染 tooltip，ariaLabel 即语义来源。
 */
export function IconButton(props: IconButtonProps): HTMLElement {
  ensureBaseStyles();
  injectStyle('rc-iconbutton-styles', CSS);

  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'la-copy rc-iconbtn';
  el.setAttribute('aria-label', props.ariaLabel);
  el.disabled = Boolean(props.disabled);
  el.innerHTML = icon(props.icon, 15);
  el.addEventListener('click', () => props.onClick?.());
  return el;
}
