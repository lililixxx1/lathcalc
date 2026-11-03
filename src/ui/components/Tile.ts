/**
 * 车工算 LathCalc · 功能入口磁贴（设计稿 .la-tile / .la-grid2）
 *
 * - 默认（首页）：图标 + 名称 + 副标，纵向。
 * - compact（工况图库）：自定义示意图 + 名称，横向。
 */
import { ensureBaseStyles, injectStyle } from './base';
import { icon, type IconName } from './icons';

const CSS = `
.la-tile { background: var(--la-card); border: 1px solid var(--la-border); border-radius: var(--la-r-card); padding: 11px 12px 9px; display: flex; flex-direction: column; gap: 5px; min-height: 86px; text-align: left; font-family: inherit; color: var(--la-ink); cursor: pointer; }
.la-tile .ticon { width: 34px; height: 34px; border-radius: 10px; background: var(--la-well-soft); color: var(--la-ink-body); display: grid; place-items: center; }
.la-tile .tname { font-size: 13.5px; font-weight: 600; line-height: 1.25; }
.la-tile .tsub { font-size: 10.5px; color: var(--la-faint); line-height: 1.3; }
.la-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; }

/* 工况图库紧凑变体 */
.rc-tile--compact { flex-direction: row; align-items: center; gap: 10px; min-height: 0; padding: 9px 10px 8px; }
.rc-tile--compact .tname { font-size: 12px; line-height: 1.35; }
.rc-tile__graphic { flex: 0 0 auto; display: block; color: var(--la-sub); }
`;

export interface TileProps {
  /** 名称（如 "螺纹" / "直线—圆弧相切"） */
  name: string;
  /** 副标（首页磁贴必填，图库可省） */
  sub?: string;
  /** 图标名；与 graphic 二选一（首页用 icon） */
  icon?: IconName;
  /** 受信 SVG 标记（图库示意图；由页面/组件内部生成） */
  graphic?: string;
  /** compact 变体：图库横向磁贴 */
  compact?: boolean;
  /** 点击回调 */
  onClick?: () => void;
  /** 无障碍名称，缺省为 name */
  ariaLabel?: string;
}

/**
 * 磁贴。类名：.la-tile.rc-tile[.rc-tile--compact] / .ticon / .tname / .tsub
 * 事件：点击 → onClick()。
 */
export function Tile(props: TileProps): HTMLElement {
  ensureBaseStyles();
  injectStyle('rc-tile-styles', CSS);

  const el = document.createElement('button');
  el.type = 'button';
  el.className = props.compact ? 'la-tile rc-tile rc-tile--compact' : 'la-tile rc-tile';
  el.setAttribute('aria-label', props.ariaLabel ?? props.name);

  if (props.compact) {
    const graphic = document.createElement('span');
    graphic.className = 'rc-tile__graphic';
    graphic.innerHTML = props.graphic ?? '';
    const name = document.createElement('span');
    name.className = 'tname rc-tile__name';
    name.textContent = props.name;
    el.append(graphic, name);
  } else {
    const iconEl = document.createElement('span');
    iconEl.className = 'ticon rc-tile__icon';
    iconEl.innerHTML = props.icon ? icon(props.icon, 19) : (props.graphic ?? '');
    const name = document.createElement('span');
    name.className = 'tname rc-tile__name';
    name.textContent = props.name;
    const sub = document.createElement('span');
    sub.className = 'tsub rc-tile__sub';
    sub.textContent = props.sub ?? '';
    el.append(iconEl, name, sub);
  }

  el.addEventListener('click', () => props.onClick?.());
  return el;
}

/** 两列磁贴网格容器。类名：.la-grid2.rc-grid2 */
export function TileGrid(tiles: readonly HTMLElement[], ariaLabel?: string): HTMLElement {
  ensureBaseStyles();
  injectStyle('rc-tile-styles', CSS);
  const el = document.createElement('div');
  el.className = 'la-grid2 rc-grid2';
  if (ariaLabel) el.setAttribute('aria-label', ariaLabel);
  el.append(...tiles);
  return el;
}
