/**
 * 车工算 LathCalc · 自绘数字键盘（设计稿 .la-key）
 *
 * V4.12-B 全站统一布局（用户指令 2026-11-10「有的页面有数字九宫格有的没有，统一一下」）：
 *   3 列数字九宫（7 8 9 / 4 5 6 / 1 2 3）+ 底部功能行 4 等宽键（± . 0 ⌫）。
 *   设计稿本仅 p09 有键盘；九宫推广与底行 3→4 键为用户指令背书的设计偏离（Lead 登记台账）。
 */
import { ensureBaseStyles, injectStyle } from './base';
import { icon } from './icons';

const CSS = `
/* V4.12-B 补位：键盘现挂页级 footer 槽（.la-body 之外，7 页统一），根自带侧垫与
 * 顶分隔线（原侧垫靠 .la-body padding:16px，槽位下不再继承）；p09 旧 body 内挂载已全部迁移 */
.la-key { display: grid; grid-template-columns: repeat(12, 1fr); gap: 7px; flex: 0 0 auto; padding: 6px 16px 8px; border-top: 1px solid var(--la-border); }
/* 数字九宫 3 键均分 12 列（各跨 4）；底部功能行 4 键均分 12 列（各跨 3）→ 两行键等宽 */
.la-key > .rc-keypad__key:nth-child(-n + 9) { grid-column: span 4; }
.la-key > .rc-keypad__key:nth-child(n + 10) { grid-column: span 3; }
.la-key > .rc-keypad__key { height: 44px; border-radius: 10px; background: var(--la-card); border: 1px solid var(--la-border); display: grid; place-items: center; font-family: inherit; font-size: 17px; font-weight: 600; color: var(--la-ink); cursor: pointer; }
.la-key > .rc-keypad__key[disabled] { opacity: 0.45; cursor: not-allowed; }
/* V4.12-B 键盘当前高亮输入行（p09 旧类 .rc-p09__input--active 迁移至此，全站共用） */
.la-input--active { border-color: var(--la-accent); }
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
  | 'sign'
  | 'del';

/**
 * 键序（测试共用）：V4.12-B 起 13 键——九宫 7 8 9 / 4 5 6 / 1 2 3 + 功能行 ± . 0 ⌫；
 * 新序与 sign 键为用户指令背书（2026-11-10 数字键盘全站统一，V4.12-B），
 * 原设计稿 12 键序（. 0 ⌫）废止。
 */
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
  'sign',
  '.',
  '0',
  'del',
];

export interface KeypadProps {
  /** 按键回调；'del' 为退格，'sign' 为正负切换 */
  onKey?: (key: KeypadKey) => void;
  /** 无障碍名称，默认 "数字键盘" */
  ariaLabel?: string;
  disabled?: boolean;
  /** 仅禁用 sign 键（±），其余键不受影响（V4.12-B：signed 字段才可键入负号） */
  signDisabled?: boolean;
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
    button.setAttribute('aria-label', key === 'del' ? '退格' : key === 'sign' ? '正负号' : key);
    if (key === 'del') button.innerHTML = icon('del', 18);
    else button.textContent = key === 'sign' ? '±' : key;
    button.disabled =
      Boolean(props.disabled) || (key === 'sign' && Boolean(props.signDisabled));
    button.addEventListener('click', () => props.onKey?.(key));
    el.append(button);
  }

  return el;
}

/** 键盘控制器 · 页面接入契约（V4.12-B 预置签名，语义禁改）。 */
export interface KeypadController {
  /** 登记可编辑字段；opts.signed = 允许 sign 键（±）。页面重建输入区后重新 register 即可。 */
  register(field: string, el: HTMLElement, opts?: { signed?: boolean }): void;
  /** 切换当前高亮字段（el 挂 .la-input--active，其余摘除），sign 键 disabled 态随 signed 刷新。 */
  setActive(field: string): void;
  /** 键盘击键入口：按编辑规则改写 texts[field]，同步 input.value 并回调 onChange。 */
  onKey(key: KeypadKey): void;
  /** 持有的 Keypad 元素（幂等返回同一元素）；页面负责 append 到 body 末尾。 */
  keypadEl(): HTMLElement;
  /** 当前高亮字段；未设置时为 null。 */
  active(): string | null;
}

export interface KeypadControllerOptions {
  /** 值字典，controller 直接读写（页面其它读写路径须与它保持同一份值）。 */
  texts: Record<string, string>;
  /** 值变化后回调（页面重算 / 重画）。 */
  onChange: (field: string) => void;
  /** 白名单，缺省 = 全部已注册字段。 */
  allowed?: (field: string) => boolean;
  /** 单字段最大长度（'-' 计入长度），默认 10（源 p09.ts:420 现行手感）。 */
  maxLen?: number;
}

/**
 * 键盘控制器工厂（V4.12-B）。
 *
 * 编辑规则 = p09.ts:405-427 现行语义 + sign 扩展：
 *   - del：截尾一位（'-10' → '-1'；'-' → ''）
 *   - '.'：已含 '.' 跳过；'' → '0.'；否则追加
 *   - 数字：length ≥ maxLen 跳过；'0' → 键值；否则追加
 *   - sign：仅 register 时标 signed 的字段（且过 allowed）——'' → '-'；'-' → ''；
 *     '-x…' → 'x…'；'x…' → '-x…'；非 signed 字段 no-op
 * 副作用：命中 el.querySelector('input') 则同步 input.value（el 本身是 input 亦同步）+
 * onChange(field)。register 后 el 的 focusin / click → setActive(field)。
 */
export function createKeypadController(options: KeypadControllerOptions): KeypadController {
  const maxLen = options.maxLen ?? 10;
  const els = new Map<string, HTMLElement>();
  const signedFields = new Set<string>();
  let activeField: string | null = null;

  /** sign 键 disabled 态随 active 字段 signed 刷新；无 active / 非 signed 一律置灰。 */
  const refreshSignKey = (): void => {
    const signKey = keypad.querySelector<HTMLButtonElement>('.rc-keypad__key[data-key="sign"]');
    if (signKey) signKey.disabled = activeField === null || !signedFields.has(activeField);
  };

  const keypad = Keypad({
    ariaLabel: '数字键盘：输入当前高亮字段',
    signDisabled: true,
    onKey: (key) => controller.onKey(key),
  });

  function setActive(field: string): void {
    activeField = field;
    for (const [key, el] of els) el.classList.toggle('la-input--active', key === field);
    refreshSignKey();
  }

  function register(field: string, el: HTMLElement, opts?: { signed?: boolean }): void {
    els.set(field, el);
    if (opts?.signed === true) signedFields.add(field);
    else signedFields.delete(field);
    const activate = (): void => setActive(field);
    el.addEventListener('focusin', activate);
    el.addEventListener('click', activate);
  }

  function onKey(key: KeypadKey): void {
    const field = activeField;
    if (field === null) return;
    if (options.allowed && !options.allowed(field)) return;
    if (key === 'sign' && !signedFields.has(field)) return;
    const current = options.texts[field] ?? '';
    let next: string;
    if (key === 'del') {
      next = current.slice(0, -1);
    } else if (key === '.') {
      if (current.includes('.')) return;
      next = current === '' ? '0.' : `${current}.`;
    } else if (key === 'sign') {
      if (current === '') next = '-';
      else if (current === '-') next = '';
      else if (current.startsWith('-')) next = current.slice(1);
      else next = `-${current}`;
    } else {
      if (current.length >= maxLen) return;
      next = current === '0' ? key : `${current}${key}`;
    }
    options.texts[field] = next;
    const el = els.get(field);
    if (el) {
      const input =
        el instanceof HTMLInputElement ? el : el.querySelector<HTMLInputElement>('input');
      if (input) input.value = next;
    }
    options.onChange(field);
  }

  const controller: KeypadController = {
    register,
    setActive,
    onKey,
    keypadEl: () => keypad,
    active: () => activeField,
  };
  return controller;
}
