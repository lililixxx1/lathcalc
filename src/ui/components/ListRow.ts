/**
 * 车工算 LathCalc · 列表行（设计稿 .la-rowlist / .la-lrow）
 *
 * 用于螺纹规格列表、G 代码速查表；支持选中态、箭头 / 复制图标。
 */
import { ensureBaseStyles, injectStyle } from './base';
import { icon } from './icons';

const CSS = `
.la-rowlist { display: flex; flex-direction: column; }
.la-lrow { display: flex; align-items: center; gap: 10px; padding: 11.5px 2px; border-top: 1px solid var(--la-border-soft); font-size: 14px; font-family: inherit; text-align: left; width: 100%; background: transparent; border-left: 0; border-right: 0; border-bottom: 0; color: var(--la-ink); cursor: pointer; }
.la-lrow:first-child { border-top: 0; }
.la-lrow .grow { flex: 1; min-width: 0; }
.la-lrow .val { flex: 0 0 auto; }
.la-lrow.sel { box-shadow: inset 3px 0 0 var(--la-accent); padding-left: 10px; margin-left: -10px; border-radius: 6px; background: var(--la-chip-on-bg); }
.la-lrow.sel .grow { font-weight: 700; }
.la-lrow.sel .rc-lrow__chev { color: var(--la-accent-ink); }
.rc-lrow__chev { color: var(--la-faint); display: grid; place-items: center; flex: 0 0 auto; }
.rc-lrow__mono { width: 60px; font-weight: 600; flex: 0 0 auto; }
.rc-lrow__desc { color: var(--la-ink-body); font-size: 13px; }
`;

export interface ListRowProps {
  /** 主文本（规格名 / G 代码） */
  name: string;
  /** 右侧数值（中径预览等），省略则不渲染 */
  value?: string;
  /** 选中态（设计稿 .la-lrow.sel） */
  selected?: boolean;
  /** 右侧图标：chev（默认）/ copy / none */
  trailing?: 'chev' | 'copy' | 'none';
  /** name 使用等宽字体（G 代码行） */
  mono?: boolean;
  /** value 右侧追加说明文本（G 代码释义） */
  description?: string;
  onClick?: () => void;
  ariaLabel?: string;
}

/**
 * 列表行。类名：.la-lrow.rc-lrow[.sel] / .grow / .val / .rc-lrow__chev / .rc-lrow__mono
 * 事件：点击 → onClick()。
 */
export function ListRow(props: ListRowProps): HTMLElement {
  ensureBaseStyles();
  injectStyle('rc-listrow-styles', CSS);

  const el = document.createElement('button');
  el.type = 'button';
  el.className = props.selected ? 'la-lrow rc-lrow sel' : 'la-lrow rc-lrow';
  if (props.selected) el.setAttribute('aria-current', 'true');
  if (props.ariaLabel) el.setAttribute('aria-label', props.ariaLabel);

  const name = document.createElement('span');
  name.className = props.mono ? 'grow rc-lrow__mono la-mono' : 'grow rc-lrow__name';
  name.textContent = props.name;
  el.append(name);

  if (props.description !== undefined) {
    const description = document.createElement('span');
    description.className = 'grow rc-lrow__desc';
    description.textContent = props.description;
    el.append(description);
  }

  if (props.value !== undefined) {
    const value = document.createElement('span');
    value.className = 'val la-num rc-lrow__value';
    value.textContent = props.value;
    el.append(value);
  }

  const trailing = props.trailing ?? 'chev';
  if (trailing !== 'none') {
    const marker = document.createElement('span');
    marker.className = 'rc-lrow__chev';
    marker.innerHTML = icon(trailing === 'copy' ? 'copy' : 'chev', 15);
    el.append(marker);
  }

  el.addEventListener('click', () => props.onClick?.());
  return el;
}

/** 行列表容器。类名：.la-rowlist.rc-rowlist */
export function RowList(rows: readonly HTMLElement[], ariaLabel?: string): HTMLElement {
  ensureBaseStyles();
  injectStyle('rc-listrow-styles', CSS);
  const el = document.createElement('div');
  el.className = 'la-rowlist rc-rowlist';
  if (ariaLabel) el.setAttribute('aria-label', ariaLabel);
  el.append(...rows);
  return el;
}
