/**
 * 车工算 LathCalc · 暗色代码卡（设计稿 .la-code）
 *
 * 用于 G76 参考程序；复制按钮由页面用 Button(ghost) 单独放置。
 */
import { ensureBaseStyles, injectStyle } from './base';

const CSS = `
.la-code { background: var(--la-code-bg); border-radius: var(--la-r-card); padding: 13px 14px; color: var(--la-bg); flex: 0 0 auto; }
.la-code .ln { color: var(--la-code-green); font-size: 13px; line-height: 1.8; overflow-wrap: anywhere; }
.la-code .cm { color: var(--la-faint); font-size: 10.5px; margin-top: 5px; line-height: 1.5; }
`;

export interface CodeCardProps {
  /** 代码行（按行渲染，逐行转义） */
  lines: readonly string[];
  /** 底部注释（单行或多行文本，按 textContent 渲染） */
  comment?: string;
  ariaLabel?: string;
}

/**
 * 代码卡。类名：.la-code.la-mono.rc-codecard / .ln / .cm
 * 纯展示；需要复制时由页面组合 Button。
 */
export function CodeCard(props: CodeCardProps): HTMLElement {
  ensureBaseStyles();
  injectStyle('rc-codecard-styles', CSS);

  const el = document.createElement('div');
  el.className = 'la-code la-mono rc-codecard';
  if (props.ariaLabel) el.setAttribute('aria-label', props.ariaLabel);

  for (const line of props.lines) {
    const row = document.createElement('div');
    row.className = 'ln rc-codecard__line';
    row.textContent = line;
    el.append(row);
  }

  if (props.comment) {
    const comment = document.createElement('div');
    comment.className = 'cm rc-codecard__comment';
    comment.textContent = props.comment;
    el.append(comment);
  }

  return el;
}

/** 供页面对拍 / 复制使用的纯文本（行以 \n 连接）。 */
export function codeCardText(props: Pick<CodeCardProps, 'lines'>): string {
  return props.lines.join('\n');
}
