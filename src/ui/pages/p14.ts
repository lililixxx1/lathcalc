/**
 * p14 · 收藏 · 历史 · 分享长图（W4-C5 实现）
 *
 * 设计稿区块（docs/车工计算App-无限画布.html 的 pFav，自上而下）：
 *   状态栏 → 顶栏「收藏」→ 分段「收藏 N / 历史」→ 条目卡列表
 *   （标题 + 参数摘要 + 相对时间 + 分享/星标）→「生成分享长图」→ 说明 → Home 指示条
 *
 * 数据：src/ui/store.ts（localStorage，前缀 lathcalc.）。
 * 分享长图：canvas 2D 本机绘制（WAVE-PLAN §3 裁决 5：零联网），
 *   生成 dataURL 展示 + <a download> 下载。布局与绘制纯函数已抽取
 *   src/core/share-image.ts（V4.15-W3，对齐 core/*-figure 惯例便于 canvas 桩断言）；
 *   本文件保留页面装配与 resolveSharePalette（读设计 token，页面层职责）。
 */
import type { StoredEntry } from '../store';
import {
  SAVE_EVENT,
  installSaveListener,
  isFavorited,
  listFavorites,
  listHistory,
  removeFavorite,
  removeHistory,
  toggleFavorite,
} from '../store';
import type { PageContext, PageModule } from '../router';
import {
  buildShareLayout,
  formatTimestamp,
  paintShareImage,
  relativeDayLabel,
  shareFileName,
  type SharePalette,
} from '../../core/share-image';
import {
  Button,
  Card,
  Eyebrow,
  IconButton,
  ParamGrid,
  Segmented,
  SubText,
  TopBar,
  createBody,
  createPage,
  injectStyle,
} from '../components';

const CSS = `
.rc-p14__list { flex: 1 1 auto; min-height: 0; overflow-y: auto; display: flex; flex-direction: column; gap: 9px; padding-bottom: 2px; }
.rc-p14__item { display: flex; align-items: center; gap: 10px; }
.rc-p14__item-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; background: transparent; border: 0; padding: 0; text-align: left; font-family: inherit; color: inherit; cursor: pointer; }
.rc-p14__item-title { font-size: 14.5px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rc-p14__item-meta { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rc-p14__item-side { flex: 0 0 auto; text-align: right; }
.rc-p14__item-time { font-size: 11px; }
.rc-p14__item-actions { display: flex; gap: 6px; margin-top: 5px; justify-content: flex-end; }
.rc-p14__star-on { color: var(--la-accent-ink); }
.rc-p14__empty { text-align: center; }
.rc-p14__detail { display: flex; flex-direction: column; gap: 8px; }
.rc-p14__detail-head { display: flex; align-items: center; justify-content: space-between; }
.rc-p14__close { background: transparent; border: 0; color: var(--la-sub); font-family: inherit; font-size: 12px; cursor: pointer; padding: 0; }
.rc-p14__detail-title { font-size: 15px; font-weight: 700; }
.rc-p14__detail-actions { display: flex; gap: 6px; justify-content: flex-end; }
.rc-p14__action .la-btn { width: 100%; }
.rc-p14__sharecard { display: flex; flex-direction: column; gap: 8px; }
.rc-p14__shareimg { width: 100%; height: 220px; object-fit: cover; object-position: top; border-radius: 8px; background: var(--la-well-soft); }
.rc-p14__download { text-decoration: none; height: 44px; }
.rc-p14__share-msg { padding: 4px 0; }
`;

type RefTab = 'favorites' | 'history';

/** 从设计 token 读取 canvas 调色板（浏览器环境）。 */
function resolveSharePalette(root?: Element | null): SharePalette {
  const element = root ?? (typeof document !== 'undefined' ? document.documentElement : null);
  const style = element ? getComputedStyle(element) : null;
  const read = (name: string): string => (style ? style.getPropertyValue(name).trim() : '');
  return {
    background: read('--la-bg'),
    card: read('--la-card'),
    ink: read('--la-ink'),
    inkBody: read('--la-ink-body'),
    sub: read('--la-sub'),
    accent: read('--la-accent'),
    accentInk: read('--la-accent-ink'),
    border: read('--la-border'),
    codeBg: read('--la-code-bg'),
    codeGreen: read('--la-code-green'),
    fontFamily: read('--la-font'),
    monoFamily: read('--la-font-mono'),
  };
}

function paramsMeta(params: Record<string, string | number>): string {
  const pairs = Object.entries(params);
  if (pairs.length === 0) return '无参数';
  return pairs.map(([key, value]) => `${key} ${value}`).join(' · ');
}

export const title = '收藏 · 历史 · 分享';

const page: PageModule = {
  title,
  render(ctx: PageContext): void {
    injectStyle('rc-p14-styles', CSS);
    installSaveListener();

    const state: {
      tab: RefTab;
      detailId: string | null;
      share: { dataUrl: string; fileName: string } | null;
      shareMessage: string | null;
    } = {
      tab: 'favorites',
      detailId: null,
      share: null,
      shareMessage: null,
    };

    const segWrap = document.createElement('div');
    const listWrap = document.createElement('div');
    listWrap.className = 'rc-p14__list';
    const actionWrap = document.createElement('div');
    actionWrap.className = 'rc-p14__action';
    const shareWrap = document.createElement('div');
    shareWrap.className = 'rc-p14__share';
    const footWrap = document.createElement('div');
    footWrap.className = 'rc-p14__foot';

    function currentEntries(): StoredEntry[] {
      return state.tab === 'favorites' ? listFavorites() : listHistory();
    }

    function renderSeg(): void {
      segWrap.replaceChildren(
        Segmented({
          options: [
            { value: 'favorites', label: `收藏 ${listFavorites().length}` },
            { value: 'history', label: '历史' },
          ],
          value: state.tab,
          ariaLabel: '收藏与历史',
          onChange: (value) => {
            if ((value !== 'favorites' && value !== 'history') || value === state.tab) return;
            state.tab = value;
            state.detailId = null;
            state.share = null;
            state.shareMessage = null;
            renderSeg();
            renderList();
            renderActions();
            renderShare();
          },
        }),
      );
    }

    function refresh(): void {
      renderSeg();
      renderList();
      renderActions();
    }

    function toggleEntryFavorite(entry: StoredEntry): void {
      const result = toggleFavorite(entry);
      if (!result) return;
      if (!result.favorite && state.detailId === entry.id) state.detailId = null;
      refresh();
    }

    function deleteEntry(entry: StoredEntry): void {
      if (state.tab === 'favorites') removeFavorite(entry.id);
      else removeHistory(entry.id);
      if (state.detailId === entry.id) state.detailId = null;
      refresh();
    }

    function renderDetail(entry: StoredEntry): HTMLElement {
      const card = Card({ className: 'rc-p14__detail', ariaLabel: `${entry.title} 详情` });
      const head = document.createElement('div');
      head.className = 'rc-p14__detail-head';
      const close = document.createElement('button');
      close.type = 'button';
      close.className = 'rc-p14__close rc-p14__detail-close';
      close.textContent = '收起';
      close.addEventListener('click', () => {
        state.detailId = null;
        renderList();
      });
      head.append(Eyebrow('条目详情'), close);

      const titleEl = document.createElement('div');
      titleEl.className = 'rc-p14__detail-title';
      titleEl.textContent = entry.title;

      const params = ParamGrid({
        items: Object.entries(entry.params).map(([key, value]) => ({
          key,
          value: String(value),
        })),
        columns: 2,
        ariaLabel: '条目参数',
      });

      const time = SubText(`记录时间 ${formatTimestamp(entry.ts)}`, {
        className: 'rc-p14__detail-time',
      });

      const favorited = isFavorited(entry);
      const actions = document.createElement('div');
      actions.className = 'rc-p14__detail-actions';
      actions.append(
        IconButton({
          icon: 'share',
          ariaLabel: `分享 ${entry.title}`,
          onClick: () => generateShare(entry),
        }),
        IconButton({
          icon: 'star',
          ariaLabel: favorited ? `取消收藏 ${entry.title}` : `收藏 ${entry.title}`,
          onClick: () => toggleEntryFavorite(entry),
        }),
        IconButton({
          icon: 'del',
          ariaLabel: `删除 ${entry.title}`,
          onClick: () => deleteEntry(entry),
        }),
      );

      card.append(head, titleEl, params, time, actions);
      return card;
    }

    function renderEntry(entry: StoredEntry): HTMLElement {
      const card = document.createElement('div');
      card.className = 'la-card rc-card rc-p14__item';
      card.dataset.id = entry.id;
      card.dataset.kind = entry.kind;

      const main = document.createElement('button');
      main.type = 'button';
      main.className = 'rc-p14__item-main';
      main.setAttribute('aria-label', `查看 ${entry.title}`);
      const titleEl = document.createElement('div');
      titleEl.className = 'rc-p14__item-title';
      titleEl.textContent = entry.title;
      const meta = document.createElement('div');
      meta.className = 'la-sub la-num rc-p14__item-meta';
      meta.textContent = paramsMeta(entry.params);
      main.append(titleEl, meta);
      main.addEventListener('click', () => {
        state.detailId = state.detailId === entry.id ? null : entry.id;
        renderList();
      });

      const side = document.createElement('div');
      side.className = 'rc-p14__item-side';
      const time = document.createElement('div');
      time.className = 'la-sub rc-p14__item-time';
      time.textContent = relativeDayLabel(entry.ts, Date.now());
      const actions = document.createElement('div');
      actions.className = 'rc-p14__item-actions';

      const favorited = isFavorited(entry);
      const shareButton = IconButton({
        icon: 'share',
        ariaLabel: `分享 ${entry.title}`,
        onClick: () => generateShare(entry),
      });
      const starButton = IconButton({
        icon: 'star',
        ariaLabel: favorited ? `取消收藏 ${entry.title}` : `收藏 ${entry.title}`,
        onClick: () => toggleEntryFavorite(entry),
      });
      if (favorited) starButton.classList.add('rc-p14__star-on');
      actions.append(shareButton, starButton);
      side.append(time, actions);

      card.append(main, side);
      return card;
    }

    function renderList(): void {
      listWrap.replaceChildren();
      const entries = currentEntries();
      if (entries.length === 0) {
        const text =
          state.tab === 'favorites'
            ? '暂无收藏 · 在历史条目点星标即可收藏'
            : '暂无历史 · 计算结果保存后会出现在这里';
        listWrap.append(Card({ className: 'rc-p14__empty', children: [SubText(text, { center: true })] }));
        return;
      }
      const detail = state.detailId
        ? entries.find((entry) => entry.id === state.detailId)
        : undefined;
      if (detail) listWrap.append(renderDetail(detail));
      for (const entry of entries) listWrap.append(renderEntry(entry));
    }

    function renderActions(): void {
      const entries = currentEntries();
      actionWrap.replaceChildren(
        Button({
          label: '生成分享长图',
          variant: 'ghost',
          icon: 'share',
          disabled: entries.length === 0,
          onClick: () => {
            const entry = currentEntries()[0];
            if (entry) generateShare(entry);
          },
        }),
      );
    }

    function renderShare(): void {
      shareWrap.replaceChildren();
      if (state.shareMessage) {
        shareWrap.append(
          SubText(state.shareMessage, { center: true, className: 'rc-p14__share-msg' }),
        );
        return;
      }
      if (!state.share) return;

      const card = Card({ className: 'rc-p14__sharecard', ariaLabel: '分享长图' });
      const img = document.createElement('img');
      img.className = 'rc-p14__shareimg';
      img.src = state.share.dataUrl;
      img.alt = '分享长图预览';
      const link = document.createElement('a');
      link.className = 'la-btn ghost rc-p14__download';
      link.href = state.share.dataUrl;
      link.download = state.share.fileName;
      link.textContent = '下载 PNG';
      card.append(
        img,
        link,
        SubText('长图已在本机生成 · 下载查看完整长图', { center: true }),
      );
      shareWrap.append(card);
    }

    function showShareMessage(message: string): void {
      state.share = null;
      state.shareMessage = message;
      renderShare();
    }

    function generateShare(entry: StoredEntry): void {
      const layout = buildShareLayout(entry);
      const canvas = document.createElement('canvas');
      canvas.width = layout.width;
      canvas.height = layout.height;
      const context = canvas.getContext('2d');
      if (!context) {
        showShareMessage('当前环境不支持 canvas，无法生成长图');
        return;
      }
      try {
        paintShareImage(context, layout, resolveSharePalette());
        const dataUrl = canvas.toDataURL('image/png');
        if (!dataUrl || dataUrl === 'data:,') throw new Error('toDataURL 返回空数据');
        state.shareMessage = null;
        state.share = { dataUrl, fileName: shareFileName(entry) };
        renderShare();
      } catch (error) {
        showShareMessage(
          `长图生成失败：${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    renderSeg();
    renderList();
    renderActions();
    renderShare();
    footWrap.append(SubText('长图可直接发微信群 · 仅保存在本机', { center: true }));

    const onExternalSave = (): void => {
      if (state.tab === 'history') refresh();
    };
    document.addEventListener(SAVE_EVENT, onExternalSave);
    ctx.onCleanup(() => document.removeEventListener(SAVE_EVENT, onExternalSave));

    const body = createBody({ className: 'rc-p14__body' });
    body.append(segWrap, listWrap, actionWrap, shareWrap, footWrap);

    ctx.root.append(
      createPage({
        id: 'p14',
        top: TopBar({ title: '收藏' }),
        body,
      }),
    );
  },
};

export default page;
