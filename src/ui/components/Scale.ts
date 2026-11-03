/**
 * 车工算 LathCalc · 刻度标尺（设计稿 .la-scale，p09 转速页）
 */
import { ensureBaseStyles, injectStyle } from './base';

const CSS = `
.la-scale { height: 14px; flex: 0 0 auto; border-radius: 3px; background: repeating-linear-gradient(90deg, var(--la-border) 0 1px, transparent 1px 8px), repeating-linear-gradient(90deg, var(--la-faint) 0 1px, transparent 1px 40px); position: relative; }
.la-scale i { position: absolute; top: -3px; width: 2.5px; height: 20px; background: var(--la-accent); border-radius: 2px; }
`;

export interface ScaleProps {
  /** 指示位置，0–100（超出会被夹取） */
  value: number;
  /** 无障碍名称，如 "转速区间 0–2000 r/min，当前 955" */
  ariaLabel?: string;
}

/** 标尺。类名：.la-scale.rc-scale；标记为内联 <i>（left 百分比）。 */
export function Scale(props: ScaleProps): HTMLElement {
  ensureBaseStyles();
  injectStyle('rc-scale-styles', CSS);

  const clamped = Math.min(100, Math.max(0, Number.isFinite(props.value) ? props.value : 0));
  const el = document.createElement('div');
  el.className = 'la-scale rc-scale';
  el.setAttribute('role', 'img');
  if (props.ariaLabel) el.setAttribute('aria-label', props.ariaLabel);

  const marker = document.createElement('i');
  marker.className = 'rc-scale__marker';
  marker.style.left = `${clamped}%`;
  el.append(marker);

  return el;
}
