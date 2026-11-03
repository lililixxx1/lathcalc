/**
 * 车工算 LathCalc · 大数字结果块
 *
 * - StatBlock：居中大数字 + 单位 + 脚注（p09 主轴转速 / p11 单件重量 / p08 偏差三联）
 * - StatTriple：三等分统计卡（p08 上偏差 / 下偏差 / 公差）
 */
import { appendChildren, type Child, ensureBaseStyles, injectStyle } from './base';

const CSS = `
.rc-stat { text-align: center; padding: 11px 8px 9px; }
.rc-stat__value { font-size: 38px; font-weight: 700; line-height: 1.05; }
.rc-stat__unit { font-size: 15px; font-weight: 500; color: var(--la-sub); margin-left: 6px; }
.rc-stat__foot { font-size: 12px; color: var(--la-sub); margin-top: 5px; }
.rc-stattriple { display: flex; justify-content: space-around; text-align: center; padding: 13px 8px; }
.rc-stattriple__cell { min-width: 0; }
.rc-stattriple__value { font-size: 23px; font-weight: 700; }
.rc-stattriple__value--accent { color: var(--la-accent-ink); }
.rc-stattriple__label { font-size: 12px; color: var(--la-sub); margin-top: 2px; }
`;

export interface StatBlockProps {
  /** 顶部眉标，如 "主轴转速 n" */
  eyebrow: string;
  /** 主数值（已格式化），如 "955" */
  value: string;
  /** 单位，如 "r/min" */
  unit?: string;
  /** 脚注（字符串按文本；也可传节点，如带 <b> 的进给说明） */
  footnote?: Child;
  /** 卡片无障碍名称 */
  ariaLabel?: string;
}

/** 大数字结果卡。类名：.la-card.rc-stat / .rc-stat__value / .rc-stat__unit / .rc-stat__foot */
export function StatBlock(props: StatBlockProps): HTMLElement {
  ensureBaseStyles();
  injectStyle('rc-statblock-styles', CSS);

  const el = document.createElement('div');
  el.className = 'la-card rc-stat';
  if (props.ariaLabel) el.setAttribute('aria-label', props.ariaLabel);

  const eyebrow = document.createElement('div');
  eyebrow.className = 'la-eyebrow rc-stat__eyebrow';
  eyebrow.textContent = props.eyebrow;

  const value = document.createElement('div');
  value.className = 'rc-stat__value la-num';
  value.textContent = props.value;
  if (props.unit) {
    const unit = document.createElement('span');
    unit.className = 'rc-stat__unit';
    unit.textContent = props.unit;
    value.append(unit);
  }

  el.append(eyebrow, value);

  if (props.footnote !== undefined && props.footnote !== null && props.footnote !== false) {
    const foot = document.createElement('div');
    foot.className = 'rc-stat__foot';
    appendChildren(foot, [props.footnote]);
    el.append(foot);
  }

  return el;
}

export interface StatTripleItem {
  value: string;
  label: string;
  /** 强调色（设计稿公差 T 的橙墨） */
  accent?: boolean;
}

export interface StatTripleProps {
  items: readonly StatTripleItem[];
  ariaLabel?: string;
}

/** 三联统计卡。类名：.la-card.rc-stattriple / .rc-stattriple__cell / __value[--accent] / __label */
export function StatTriple(props: StatTripleProps): HTMLElement {
  ensureBaseStyles();
  injectStyle('rc-statblock-styles', CSS);

  const el = document.createElement('div');
  el.className = 'la-card rc-stattriple';
  if (props.ariaLabel) el.setAttribute('aria-label', props.ariaLabel);

  for (const item of props.items) {
    const cell = document.createElement('div');
    cell.className = 'rc-stattriple__cell';

    const value = document.createElement('div');
    value.className = item.accent
      ? 'rc-stattriple__value rc-stattriple__value--accent la-num'
      : 'rc-stattriple__value la-num';
    value.textContent = item.value;

    const label = document.createElement('div');
    label.className = 'rc-stattriple__label';
    label.textContent = item.label;

    cell.append(value, label);
    el.append(cell);
  }

  return el;
}
