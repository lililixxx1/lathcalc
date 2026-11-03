/**
 * 车工算 LathCalc · 参数网格（设计稿 param() 片段）
 *
 * 三步/多步页面的「带入参数」摘要，key + value 两栏。
 */
import { ensureBaseStyles, injectStyle } from './base';

const CSS = `
.rc-paramgrid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 7px; }
.rc-paramgrid--2 { grid-template-columns: repeat(2, 1fr); }
.rc-param { background: var(--la-well-soft); border-radius: 9px; padding: 7px 10px; display: flex; justify-content: space-between; align-items: baseline; gap: 6px; min-width: 0; }
.rc-param__key { font-size: 11.5px; color: var(--la-sub); flex: 0 0 auto; }
.rc-param__value { font-size: 14px; font-weight: 600; overflow-wrap: anywhere; }
`;

export interface ParamItem {
  /** 参数名，如 "牙底 X" */
  key: string;
  /** 参数值（已格式化），如 "26.211" */
  value: string;
}

export interface ParamGridProps {
  items: readonly ParamItem[];
  /** 列数，默认 3（设计稿）；2 用于双列参数 */
  columns?: 2 | 3;
  ariaLabel?: string;
}

/** 参数网格。类名：.rc-paramgrid[--2] / .rc-param / .rc-param__key / .rc-param__value */
export function ParamGrid(props: ParamGridProps): HTMLElement {
  ensureBaseStyles();
  injectStyle('rc-paramgrid-styles', CSS);

  const el = document.createElement('div');
  el.className = props.columns === 2 ? 'rc-paramgrid rc-paramgrid--2' : 'rc-paramgrid';
  if (props.ariaLabel) el.setAttribute('aria-label', props.ariaLabel);

  for (const item of props.items) {
    const cell = document.createElement('div');
    cell.className = 'rc-param';
    cell.dataset.key = item.key;

    const key = document.createElement('span');
    key.className = 'rc-param__key';
    key.textContent = item.key;

    const value = document.createElement('span');
    value.className = 'rc-param__value la-num';
    value.textContent = item.value;

    cell.append(key, value);
    el.append(cell);
  }

  return el;
}
