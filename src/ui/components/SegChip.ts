/**
 * 车工算 LathCalc · 分段控件与胶囊筛选件
 *
 * 对应设计稿：
 * - .la-seg  → Segmented（分段控件，可 small 变体）
 * - .la-chip → Chip（胶囊筛选 / 最近使用）
 */
import { escapeHtml, ensureBaseStyles, injectStyle } from './base';

const CSS = `
/* 分段控件 */
.la-seg { display: flex; background: var(--la-well-soft); border-radius: 11px; padding: 3px; gap: 2px; flex: 0 0 auto; }
.la-seg > .rc-seg__item { flex: 1; text-align: center; font-family: inherit; font-size: 12.5px; font-weight: 600; color: var(--la-sub); padding: 9px 2px; border-radius: 8px; white-space: nowrap; border: 0; background: transparent; cursor: pointer; min-width: 0; }
.la-seg.small > .rc-seg__item { font-size: 11.5px; padding: 9px 1px; }
.la-seg > .rc-seg__item.on { background: var(--la-card); color: var(--la-ink); box-shadow: 0 1px 2px color-mix(in srgb, var(--la-ink) 10%, transparent); }
.la-seg > .rc-seg__item[disabled] { opacity: 0.45; cursor: not-allowed; }

/* 胶囊 */
.la-chip { display: inline-flex; align-items: center; padding: 7px 11px; border-radius: 999px; border: 1px solid var(--la-border); background: var(--la-card); font-family: inherit; font-size: 12px; color: var(--la-ink-body); white-space: nowrap; cursor: pointer; min-height: 30px; }
.la-chip.on { border-color: var(--la-accent); color: var(--la-accent-ink); background: var(--la-chip-on-bg); font-weight: 600; }
.la-chip[disabled] { opacity: 0.45; cursor: not-allowed; }
`;

export interface SegmentedOption {
  /** 事件回传值（稳定标识，不参与展示） */
  value: string;
  /** 展示文案 */
  label: string;
  disabled?: boolean;
}

export interface SegmentedProps {
  options: readonly SegmentedOption[];
  /** 当前选中值（渲染时的高亮项） */
  value: string;
  /** 小号变体（设计稿 .la-seg.small，用于 IT6–IT9 与速查 5 项） */
  small?: boolean;
  /** 无障碍名称，必填（如 "螺纹制式"） */
  ariaLabel: string;
  /** 点击回调；组件会先乐观更新高亮，父级应在回调中更新自身状态 */
  onChange?: (value: string) => void;
}

/**
 * 分段控件。类名：.la-seg.rc-seg[.small] / .rc-seg__item[.on]
 * 事件：点击某项 → onChange(value)；disabled 项不触发。
 */
export function Segmented(props: SegmentedProps): HTMLElement {
  ensureBaseStyles();
  injectStyle('rc-segchip-styles', CSS);

  const el = document.createElement('div');
  el.className = props.small ? 'la-seg small rc-seg' : 'la-seg rc-seg';
  el.setAttribute('role', 'tablist');
  el.setAttribute('aria-label', props.ariaLabel);

  const buttons: HTMLButtonElement[] = [];
  for (const option of props.options) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = option.value === props.value ? 'rc-seg__item on' : 'rc-seg__item';
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-selected', option.value === props.value ? 'true' : 'false');
    button.dataset.value = option.value;
    button.textContent = option.label;
    if (option.disabled) button.disabled = true;
    button.addEventListener('click', () => {
      if (option.disabled || button.classList.contains('on')) return;
      for (const other of buttons) {
        const selected = other === button;
        other.classList.toggle('on', selected);
        other.setAttribute('aria-selected', selected ? 'true' : 'false');
      }
      // 横滑页签（如 p02 七族）选中项可能停在视口外，滚入视口；非溢出场景 nearest 为 no-op（V3-A4-01）
      button.scrollIntoView({ inline: 'nearest', block: 'nearest' });
      props.onChange?.(option.value);
    });
    buttons.push(button);
    el.append(button);
  }

  return el;
}

export interface ChipProps {
  label: string;
  /** 选中态（设计稿 .la-chip.on） */
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

/**
 * 胶囊按钮。类名：.la-chip.rc-chip[.on]
 * 事件：点击 → onClick()（active 由父级控制，组件不做乐观更新）。
 */
export function Chip(props: ChipProps): HTMLElement {
  ensureBaseStyles();
  injectStyle('rc-segchip-styles', CSS);

  const el = document.createElement('button');
  el.type = 'button';
  el.className = props.active ? 'la-chip on rc-chip' : 'la-chip rc-chip';
  el.innerHTML = escapeHtml(props.label);
  if (props.active) el.setAttribute('aria-pressed', 'true');
  if (props.disabled) el.disabled = true;
  el.addEventListener('click', () => props.onClick?.());
  return el;
}
