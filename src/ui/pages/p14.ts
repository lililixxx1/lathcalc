/**
 * p14 · 收藏 · 历史 · 分享长图（W4-C5 实现）
 *
 * 设计稿区块（docs/车工计算App-无限画布.html 的 pFav，自上而下）：
 *   状态栏 → 顶栏「收藏」→ 分段「收藏 N / 历史」→ 条目卡列表
 *   （标题 + 参数摘要 + 相对时间 + 分享/星标）→「生成分享长图」→ 说明 → Home 指示条
 *
 * 数据：src/ui/store.ts（localStorage，前缀 lathcalc.）。
 * 分享长图：canvas 2D 本机绘制（WAVE-PLAN §3 裁决 5：零联网），
 *   生成 dataURL 展示 + <a download> 下载；布局与绘制拆成纯函数（buildShareLayout /
 *   paintShareImage）便于测试用 canvas 桩断言。
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

const KIND_LABELS: Readonly<Record<string, string>> = {
  thread: '螺纹',
  weight: '重量',
  triangle: '三角',
  arc: '圆弧切点',
  taper: '锥度',
  tolerance: '公差',
  speed: '转速',
  cutting: '切削参数',
  gcode: 'G 代码',
};

export const SHARE_IMAGE_WIDTH = 600;
const SHARE_PADDING = 48;

/** canvas 2D 的最小绘制面（真实 CanvasRenderingContext2D 结构兼容，测试可传桩）。 */
export interface Canvas2DLike {
  fillStyle: string | CanvasGradient | CanvasPattern;
  font: string;
  textAlign: CanvasTextAlign;
  textBaseline: CanvasTextBaseline;
  fillRect(x: number, y: number, width: number, height: number): void;
  fillText(text: string, x: number, y: number): void;
}

export type ShareColorKey =
  | 'background'
  | 'card'
  | 'ink'
  | 'inkBody'
  | 'sub'
  | 'accent'
  | 'accentInk'
  | 'border'
  | 'codeBg'
  | 'codeGreen';

export interface SharePalette {
  background: string;
  card: string;
  ink: string;
  inkBody: string;
  sub: string;
  accent: string;
  accentInk: string;
  border: string;
  codeBg: string;
  codeGreen: string;
  fontFamily: string;
  monoFamily: string;
}

export interface ShareTextBlock {
  text: string;
  x: number;
  y: number;
  size: number;
  weight: 400 | 600 | 700;
  color: ShareColorKey;
  align: 'left' | 'right';
}

export interface ShareRect {
  x: number;
  y: number;
  width: number;
  height: number;
  color: ShareColorKey;
}

export interface ShareLayout {
  width: number;
  height: number;
  background: ShareColorKey;
  rects: ShareRect[];
  texts: ShareTextBlock[];
}

/** 类别中文名（未知类别原样返回）。 */
export function kindLabel(kind: string): string {
  return KIND_LABELS[kind] ?? kind;
}

/** 记录时间（本地时区，YYYY-MM-DD HH:mm）。 */
export function formatTimestamp(ts: number): string {
  const date = new Date(ts);
  if (Number.isNaN(date.getTime())) return '—';
  const pad = (value: number): string => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatMonthDay(ts: number): string {
  const date = new Date(ts);
  if (Number.isNaN(date.getTime())) return '—';
  const pad = (value: number): string => String(value).padStart(2, '0');
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** 相对日期：今天 / 昨天 / N 天前（2–6 天）/ MM-DD。 */
export function relativeDayLabel(ts: number, now: number): string {
  const day = 86_400_000;
  const startOfDay = (value: number): number => {
    const date = new Date(value);
    date.setHours(0, 0, 0, 0);
    return date.getTime();
  };
  const diff = Math.round((startOfDay(now) - startOfDay(ts)) / day);
  if (diff === 0) return '今天';
  if (diff === 1) return '昨天';
  if (diff > 1 && diff < 7) return `${diff} 天前`;
  return formatMonthDay(ts);
}

/** 按估算字宽折行（CJK 按 1 个字号宽，ASCII 按 0.56 个字号宽）。 */
export function wrapText(text: string, maxWidth: number, fontSize: number): string[] {
  const lines: string[] = [];
  let current = '';
  let width = 0;
  for (const char of text) {
    // 码点 ≤ 0xFF（拉丁/ASCII）按窄字宽 0.56 倍；代理对高位置 > 0xFF 判宽，与原 [\u0000-\u00ff] 语义一致
    const charWidth = char.charCodeAt(0) <= 0xff ? fontSize * 0.56 : fontSize;
    if (current.length > 0 && width + charWidth > maxWidth) {
      lines.push(current);
      current = char;
      width = charWidth;
    } else {
      current += char;
      width += charWidth;
    }
  }
  if (current.length > 0) lines.push(current);
  return lines.length > 0 ? lines : [''];
}

/** 分享长图布局（纯函数；尺寸与全部文本块可断言）。 */
export function buildShareLayout(entry: StoredEntry): ShareLayout {
  const rects: ShareRect[] = [];
  const texts: ShareTextBlock[] = [];
  const innerWidth = SHARE_IMAGE_WIDTH - SHARE_PADDING * 2;

  rects.push({ x: 0, y: 0, width: SHARE_IMAGE_WIDTH, height: 10, color: 'accent' });

  let cursor = 36;
  texts.push({
    text: '车工算 · LATHCALC',
    x: SHARE_PADDING,
    y: cursor + 20,
    size: 20,
    weight: 600,
    color: 'sub',
    align: 'left',
  });
  cursor += 46;
  texts.push({
    text: '计算记录 · 本机生成',
    x: SHARE_PADDING,
    y: cursor + 16,
    size: 16,
    weight: 400,
    color: 'sub',
    align: 'left',
  });
  cursor += 44;

  for (const line of wrapText(entry.title, innerWidth, 34)) {
    texts.push({
      text: line,
      x: SHARE_PADDING,
      y: cursor + 34,
      size: 34,
      weight: 700,
      color: 'ink',
      align: 'left',
    });
    cursor += 46;
  }

  cursor += 8;
  texts.push({
    text: `${kindLabel(entry.kind)} · ${formatTimestamp(entry.ts)}`,
    x: SHARE_PADDING,
    y: cursor + 20,
    size: 18,
    weight: 400,
    color: 'sub',
    align: 'left',
  });
  cursor += 40;

  rects.push({ x: SHARE_PADDING, y: cursor, width: innerWidth, height: 1, color: 'border' });
  cursor += 14;

  const params = Object.entries(entry.params);
  if (params.length === 0) {
    texts.push({
      text: '（无参数）',
      x: SHARE_PADDING,
      y: cursor + 30,
      size: 22,
      weight: 400,
      color: 'sub',
      align: 'left',
    });
    cursor += 58;
  }
  params.forEach(([key, value], index) => {
    if (index % 2 === 0) {
      rects.push({
        x: SHARE_PADDING - 12,
        y: cursor,
        width: innerWidth + 24,
        height: 54,
        color: 'card',
      });
    }
    texts.push({
      text: String(key),
      x: SHARE_PADDING,
      y: cursor + 34,
      size: 22,
      weight: 400,
      color: 'sub',
      align: 'left',
    });
    texts.push({
      text: String(value),
      x: SHARE_IMAGE_WIDTH - SHARE_PADDING,
      y: cursor + 36,
      size: 28,
      weight: 600,
      color: 'inkBody',
      align: 'right',
    });
    cursor += 62;
  });

  rects.push({ x: SHARE_PADDING, y: cursor, width: innerWidth, height: 1, color: 'border' });
  cursor += 24;

  // 页脚锚定图片底部（长图下沿留白由高度差自然形成）
  const height = Math.max(760, Math.ceil(cursor + 128));
  const footerTop = height - 104;
  rects.push({ x: SHARE_PADDING, y: footerTop, width: innerWidth, height: 1, color: 'border' });
  texts.push({
    // V4.12-C：版本号构建期注入（同 p01 页脚，消除 v0.1 硬编码陈旧）。
    text: `完全离线 · 本机生成 · 车工算 v${__APP_VERSION__}`,
    x: SHARE_PADDING,
    y: footerTop + 32,
    size: 18,
    weight: 400,
    color: 'sub',
    align: 'left',
  });
  texts.push({
    text: '数值以实际测量为准 · 本图仅作计算记录',
    x: SHARE_PADDING,
    y: footerTop + 62,
    size: 16,
    weight: 400,
    color: 'sub',
    align: 'left',
  });

  return {
    width: SHARE_IMAGE_WIDTH,
    height,
    background: 'background',
    rects,
    texts,
  };
}

/** 绘制分享长图（纯绘制，不读 DOM / 不联网）。 */
export function paintShareImage(
  ctx: Canvas2DLike,
  layout: ShareLayout,
  palette: SharePalette,
): void {
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = palette[layout.background];
  ctx.fillRect(0, 0, layout.width, layout.height);

  for (const rect of layout.rects) {
    ctx.fillStyle = palette[rect.color];
    ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
  }

  for (const block of layout.texts) {
    ctx.fillStyle = palette[block.color];
    if (palette.fontFamily) ctx.font = `${block.weight} ${block.size}px ${palette.fontFamily}`;
    ctx.textAlign = block.align;
    ctx.fillText(block.text, block.x, block.y);
  }
}

/** 下载文件名（只含安全字符）。 */
export function shareFileName(entry: StoredEntry): string {
  const safeId = entry.id.replace(/[^a-zA-Z0-9-]/g, '');
  return `lathcalc-${entry.kind.replace(/[^a-zA-Z0-9-]/g, '')}-${safeId}.png`;
}

/** 从设计 token 读取 canvas 调色板（浏览器环境）。 */
export function resolveSharePalette(root?: Element | null): SharePalette {
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
