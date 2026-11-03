/**
 * 车工算 LathCalc · 「怎么算的」折叠面板（设计稿 .la-acc / .la-acchead / .la-formula）
 */
import { ensureBaseStyles, injectStyle } from './base';
import { icon } from './icons';

const CSS = `
.la-acc { border-top: 1px solid var(--la-border-soft); padding-top: 8px; flex: 0 0 auto; }
.la-acchead { display: flex; align-items: center; gap: 6px; width: 100%; font-family: inherit; font-size: 13px; font-weight: 600; color: var(--la-ink-body); border: 0; background: transparent; cursor: pointer; text-align: left; padding: 0; }
.la-acchead .chev { margin-left: auto; color: var(--la-faint); display: grid; place-items: center; }
.la-formula { margin-top: 8px; background: var(--la-well-soft); border-radius: 10px; padding: 9px 12px; font-size: 12px; line-height: 1.75; color: var(--la-ink-body); }
`;

export interface AccordionProps {
  /** 标题，默认 "怎么算的" */
  title?: string;
  /** 展开内容：字符串按受信 HTML 插入（设计稿公式含 <br>）；也可传 HTMLElement */
  content: string | HTMLElement;
  /** 初始是否展开，默认 false */
  open?: boolean;
  /** 折叠状态变化回调 */
  onToggle?: (open: boolean) => void;
}

/**
 * 折叠面板。类名：.la-acc.rc-acc / .la-acchead.rc-acc__head / .la-formula.rc-acc__body
 * 事件：点击标题 → 切换展开态并触发 onToggle(open)。
 * 无障碍：head 为 button，aria-expanded 与 aria-controls 同步。
 */
export function Accordion(props: AccordionProps): HTMLElement {
  ensureBaseStyles();
  injectStyle('rc-accordion-styles', CSS);

  const bodyId = `rc-acc-body-${Math.random().toString(36).slice(2, 10)}`;
  const el = document.createElement('div');
  el.className = 'la-acc rc-acc';

  let open = props.open ?? false;
  el.innerHTML = `
    <button type="button" class="la-acchead rc-acc__head" aria-expanded="${open}" aria-controls="${bodyId}">
      <span class="rc-acc__icon">${icon('calc', 15)}</span>
      <span class="rc-acc__title"></span>
      <span class="chev rc-acc__chev">${icon(open ? 'chevd' : 'chev', 14, 2)}</span>
    </button>
    <div class="la-formula la-mono rc-acc__body" id="${bodyId}"${open ? '' : ' hidden'}></div>
  `;

  const head = el.querySelector<HTMLButtonElement>('.rc-acc__head');
  const title = el.querySelector<HTMLElement>('.rc-acc__title');
  const chev = el.querySelector<HTMLElement>('.rc-acc__chev');
  const body = el.querySelector<HTMLElement>('.rc-acc__body');
  if (!head || !title || !chev || !body) throw new Error('rc-acc: 结构创建失败');

  title.textContent = props.title ?? '怎么算的';
  if (typeof props.content === 'string') {
    body.innerHTML = props.content;
  } else {
    body.append(props.content);
  }

  head.addEventListener('click', () => {
    open = !open;
    head.setAttribute('aria-expanded', String(open));
    body.hidden = !open;
    chev.innerHTML = icon(open ? 'chevd' : 'chev', 14, 2);
    props.onToggle?.(open);
  });

  return el;
}
