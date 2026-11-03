/**
 * 车工算 LathCalc · 自绘数字键盘（设计稿 .la-key）
 *
 * 布局固定为 4 行 × 3 列：7 8 9 / 4 5 6 / 1 2 3 / . 0 ⌫
 */
import { ensureBaseStyles, injectStyle } from './base';
import { icon } from './icons';

const CSS = `
.la-key { display: grid; grid-template-columns: repeat(3, 1fr); gap: 7px; flex: 0 0 auto; }
.la-key > .rc-keypad__key { height: 44px; border-radius: 10px; background: var(--la-card); border: 1px solid var(--la-border); display: grid; place-items: center; font-family: inherit; font-size: 17px; font-weight: 600; color: var(--la-ink); cursor: pointer; }
.la-key > .rc-keypad__key[disabled] { opacity: 0.45; cursor: not-allowed; }
`;

export type KeypadKey =
  | '0'
  | '1'
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | '.'
  | 'del';

/** 键序（设计稿 + 测试共用，勿改顺序）。 */
export const KEYPAD_KEYS: readonly KeypadKey[] = [
  '7',
  '8',
  '9',
  '4',
  '5',
  '6',
  '1',
  '2',
  '3',
  '.',
  '0',
  'del',
];

export interface KeypadProps {
  /** 按键回调；'del' 为退格 */
  onKey?: (key: KeypadKey) => void;
  /** 无障碍名称，默认 "数字键盘" */
  ariaLabel?: string;
  disabled?: boolean;
}

/**
 * 数字键盘。类名：.la-key.rc-keypad / .rc-keypad__key（数字键额外带 .la-num）
 * 事件：点击按键 → onKey(key)。
 */
export function Keypad(props: KeypadProps = {}): HTMLElement {
  ensureBaseStyles();
  injectStyle('rc-keypad-styles', CSS);

  const el = document.createElement('div');
  el.className = 'la-key rc-keypad';
  el.setAttribute('role', 'group');
  el.setAttribute('aria-label', props.ariaLabel ?? '数字键盘');

  for (const key of KEYPAD_KEYS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = key === 'del' ? 'rc-keypad__key rc-keypad__key--del' : 'rc-keypad__key la-num';
    button.dataset.key = key;
    button.setAttribute('aria-label', key === 'del' ? '退格' : key);
    if (key === 'del') button.innerHTML = icon('del', 18);
    else button.textContent = key;
    button.disabled = Boolean(props.disabled);
    button.addEventListener('click', () => props.onKey?.(key));
    el.append(button);
  }

  return el;
}
