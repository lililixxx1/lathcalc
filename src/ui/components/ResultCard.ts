/**
 * 车工算 LathCalc · 结果卡（设计稿 .la-card.tight + .la-resrow）
 *
 * 一行 = 标签 + 数值 + 单位 + 复制按钮；big 变体用于主结果（26px）。
 */
import { ensureBaseStyles, injectStyle } from './base';
import { icon } from './icons';

const CSS = `
.la-resrow { display: flex; align-items: baseline; gap: 8px; padding: 9.5px 0; border-top: 1px solid var(--la-border-soft); }
.la-resrow:first-child { border-top: 0; }
.la-reslab { font-size: 13px; color: var(--la-sub); flex: 1; }
.la-resval { font-size: 18px; font-weight: 600; }
.la-resval.big { font-size: 26px; font-weight: 700; }
.la-unit { font-size: 11.5px; color: var(--la-faint); }
.la-copy { width: 28px; height: 28px; border-radius: 8px; display: grid; place-items: center; color: var(--la-faint); align-self: center; background: transparent; border: 0; cursor: pointer; }
.rc-resultcard__mono { font-size: 12px; overflow-wrap: anywhere; }
`;

export interface ResultItem {
  /** 左侧标签，如 "中径 d₂" */
  label: string;
  /** 右侧显示值（已格式化的字符串；数值格式化由页面/core 负责） */
  value: string;
  /** 单位，如 "mm"；缺省不渲染 */
  unit?: string;
  /** 主结果大字号（设计稿 .la-resval.big） */
  big?: boolean;
  /** 等宽字体行（程序行等），与 big 互斥 */
  mono?: boolean;
  /** 是否显示复制按钮，默认 true */
  copy?: boolean;
  /** 复制内容；缺省为 "value unit" */
  copyValue?: string;
}

export interface ResultCardProps {
  items: readonly ResultItem[];
  /** 卡片无障碍名称，默认 "计算结果" */
  ariaLabel?: string;
  /** 复制回调；缺省写剪贴板（navigator.clipboard 可用时） */
  onCopy?: (item: ResultItem, text: string) => void;
}

/** 复制内容拼接规则（供测试与页面复用）。 */
export function resultCopyText(item: ResultItem): string {
  if (item.copyValue !== undefined) return item.copyValue;
  return item.unit ? `${item.value} ${item.unit}` : item.value;
}

/**
 * 结果卡。类名：.la-card.tight.rc-resultcard / .la-resrow / .la-reslab / .la-resval[.big] / .la-unit / .la-copy
 * 事件：点击复制按钮 → onCopy(item, text)；缺省行为 navigator.clipboard.writeText(text)。
 */
export function ResultCard(props: ResultCardProps): HTMLElement {
  ensureBaseStyles();
  injectStyle('rc-resultcard-styles', CSS);

  const el = document.createElement('div');
  el.className = 'la-card tight rc-resultcard';
  el.setAttribute('aria-label', props.ariaLabel ?? '计算结果');

  for (const item of props.items) {
    const row = document.createElement('div');
    row.className = 'la-resrow rc-resultcard__row';
    row.dataset.label = item.label;

    const label = document.createElement('span');
    label.className = 'la-reslab rc-resultcard__label';
    label.textContent = item.label;
    row.append(label);

    const value = document.createElement('span');
    value.className = item.mono
      ? 'la-mono rc-resultcard__mono'
      : item.big
        ? 'la-resval big la-num rc-resultcard__value'
        : 'la-resval la-num rc-resultcard__value';
    value.textContent = item.value;
    row.append(value);

    if (item.unit) {
      const unit = document.createElement('span');
      unit.className = 'la-unit rc-resultcard__unit';
      unit.textContent = item.unit;
      row.append(unit);
    }

    if (item.copy !== false) {
      const text = resultCopyText(item);
      const copy = document.createElement('button');
      copy.type = 'button';
      copy.className = 'la-copy rc-copy rc-resultcard__copy';
      copy.setAttribute('aria-label', `复制 ${item.label}`);
      copy.innerHTML = icon('copy', 15);
      copy.addEventListener('click', () => {
        if (props.onCopy) {
          props.onCopy(item, text);
          return;
        }
        void navigator.clipboard?.writeText(text).catch(() => {
          /* 剪贴板不可用时静默失败；页面可传 onCopy 自行处理 */
        });
      });
      row.append(copy);
    }

    el.append(row);
  }

  return el;
}
