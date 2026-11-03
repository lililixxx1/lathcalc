/**
 * 车工算 LathCalc · 顶栏组件
 *
 * - TopBar：内页顶栏（返回 + 标题 + 可选徽标 + 可选收藏）
 * - HomeHeader：首页顶栏（logo + 品牌名 + 副标 + 收藏）
 */
import { ensureBaseStyles, escapeHtml, injectStyle } from './base';
import { icon } from './icons';

const CSS = `
.la-top { flex: 0 0 auto; display: flex; align-items: center; gap: 10px; padding: 8px 16px 6px; }
.la-top h1, .la-top .rc-topbar__title { font-size: 19px; font-weight: 700; letter-spacing: -0.01em; flex: 1; display: flex; align-items: center; gap: 8px; min-width: 0; margin: 0; }
.la-back, .la-iconbtn { width: 36px; height: 36px; border-radius: 11px; background: var(--la-card); border: 1px solid var(--la-border); display: grid; place-items: center; flex: 0 0 auto; cursor: pointer; }
.la-back { color: var(--la-ink); }
.la-iconbtn { color: var(--la-sub); }
.la-logo { width: 38px; height: 38px; border-radius: 11px; background: var(--la-ink); color: var(--la-accent-bright); display: grid; place-items: center; flex: 0 0 auto; }

/* 首页顶栏 */
.rc-home__head { padding-top: 4px; }
.rc-home__brand { flex: 1; min-width: 0; }
.la-top .rc-home__title { font-size: 20px; font-weight: 800; letter-spacing: -0.01em; line-height: 1.15; display: block; margin: 0; }
.rc-home__tagline { letter-spacing: 0.14em; }
`;

export interface TopBarProps {
  /** 页面标题（文本，自动转义） */
  title: string;
  /** 标题右侧徽标，如 "GB/T 193" */
  badge?: string;
  /** 徽标灰底样式（示例数据类） */
  badgeGray?: boolean;
  /** 是否显示右侧收藏按钮 */
  star?: boolean;
  /** 返回按钮回调；缺省 = 浏览器后退，无历史时回首页 */
  onBack?: () => void;
  /** 收藏按钮回调（仅 star=true 时渲染） */
  onStar?: () => void;
}

/** 内页顶栏。类名：.la-top.rc-topbar / .rc-topbar__back / .rc-topbar__title / .rc-topbar__star */
export function TopBar(props: TopBarProps): HTMLElement {
  ensureBaseStyles();
  injectStyle('rc-topbar-styles', CSS);

  const badge = props.badge
    ? `<span class="la-badge${props.badgeGray ? ' gray' : ''}">${escapeHtml(props.badge)}</span>`
    : '';
  const star = props.star
    ? `<button type="button" class="la-iconbtn rc-topbar__star" aria-label="收藏">${icon('star', 18)}</button>`
    : '';

  const el = document.createElement('div');
  el.className = 'la-top rc-topbar';
  el.innerHTML = `
    <button type="button" class="la-back rc-topbar__back" aria-label="返回">${icon('back', 18, 2)}</button>
    <h1 class="rc-topbar__title">${escapeHtml(props.title)}${badge}</h1>
    ${star}
  `;

  const back = el.querySelector<HTMLButtonElement>('.rc-topbar__back');
  back?.addEventListener('click', () => {
    if (props.onBack) {
      props.onBack();
      return;
    }
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.hash = '#/p01';
    }
  });

  const starButton = el.querySelector<HTMLButtonElement>('.rc-topbar__star');
  starButton?.addEventListener('click', () => props.onStar?.());

  return el;
}

export interface HomeHeaderProps {
  /** 品牌名，如 "车工算" */
  title: string;
  /** 副标，如 "LATHCALC · 离线车工计算器" */
  eyebrow: string;
  /** 右侧收藏按钮回调 */
  onStar?: () => void;
}

/** 首页顶栏。类名：.la-top.rc-home__head / .la-logo / .rc-home__title / .rc-home__tagline / .rc-home__star */
export function HomeHeader(props: HomeHeaderProps): HTMLElement {
  ensureBaseStyles();
  injectStyle('rc-topbar-styles', CSS);

  const el = document.createElement('div');
  el.className = 'la-top rc-home__head';
  el.innerHTML = `
    <span class="la-logo rc-home__logo">${icon('ruler', 19, 1.8)}</span>
    <div class="rc-home__brand">
      <h1 class="rc-home__title">${escapeHtml(props.title)}</h1>
      <div class="la-eyebrow rc-home__tagline">${escapeHtml(props.eyebrow)}</div>
    </div>
    <button type="button" class="la-iconbtn rc-home__star" aria-label="收藏">${icon('star', 18)}</button>
  `;

  el.querySelector<HTMLButtonElement>('.rc-home__star')?.addEventListener('click', () =>
    props.onStar?.(),
  );

  return el;
}
