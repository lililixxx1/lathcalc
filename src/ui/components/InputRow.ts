/**
 * 车工算 LathCalc · 输入行（设计稿 .la-input）
 *
 * 左侧标签 / 右侧数字输入 / 单位；输入即算页面用它承载数值。
 */
import { escapeHtml, ensureBaseStyles, injectStyle } from './base';

const CSS = `
.la-input { display: flex; align-items: center; gap: 8px; background: var(--la-card); border: 1px solid var(--la-border); border-radius: 12px; padding: 0 13px; height: 50px; flex: 0 0 auto; }
.la-input .lab { font-size: 12.5px; color: var(--la-sub); flex: 0 0 auto; }
.la-input .field { flex: 1; width: 100%; min-width: 0; text-align: right; font-family: var(--la-font-num); font-size: 19px; font-weight: 600; background: transparent; border: 0; outline: none; color: var(--la-ink); padding: 0; }
.la-input .unit { font-size: 11.5px; color: var(--la-faint); width: 46px; flex: 0 0 auto; text-align: left; }
.la-input .field::-webkit-outer-spin-button, .la-input .field::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
`;

export type InputMode = 'decimal' | 'numeric' | 'text';

export interface InputRowProps {
  /** 左侧标签，如 "工件直径 D" */
  label: string;
  /** 初始值（字符串，避免格式化误差） */
  value: string;
  /** 右侧单位，如 "mm"；缺省不占位 */
  unit?: string;
  /** 软键盘类型，默认 decimal */
  inputMode?: InputMode;
  /** 输入框 name（表单语义 / 测试定位） */
  name?: string;
  /** 无障碍名称；缺省使用 label */
  ariaLabel?: string;
  placeholder?: string;
  disabled?: boolean;
  readonly?: boolean;
  /** 每次击键触发（input 事件） */
  onInput?: (value: string) => void;
  /** 失焦 / 提交触发（change 事件） */
  onChange?: (value: string) => void;
}

/**
 * 输入行。类名：.la-input.rc-input / .lab / .field / .unit
 * 事件：input → onInput(value)；change → onChange(value)。
 * 注意：组件不校验数值，数值解析与实时计算由页面负责。
 */
export function InputRow(props: InputRowProps): HTMLElement {
  ensureBaseStyles();
  injectStyle('rc-inputrow-styles', CSS);

  const el = document.createElement('label');
  el.className = 'la-input rc-input';
  const unit = props.unit ? `<span class="unit rc-input__unit">${escapeHtml(props.unit)}</span>` : '';
  el.innerHTML = `
    <span class="lab rc-input__label">${escapeHtml(props.label)}</span>
    <input class="field la-num rc-input__field" type="text" inputmode="${props.inputMode ?? 'decimal'}"
      ${props.name ? `name="${escapeHtml(props.name)}"` : ''}
      aria-label="${escapeHtml(props.ariaLabel ?? props.label)}"
      ${props.placeholder ? `placeholder="${escapeHtml(props.placeholder)}"` : ''} />
    ${unit}
  `;

  const input = el.querySelector<HTMLInputElement>('.rc-input__field');
  if (!input) throw new Error('rc-input: 输入框创建失败');
  input.value = props.value;
  input.disabled = Boolean(props.disabled);
  input.readOnly = Boolean(props.readonly);
  input.addEventListener('input', () => props.onInput?.(input.value));
  input.addEventListener('change', () => props.onChange?.(input.value));

  return el;
}
