// @vitest-environment happy-dom
/**
 * W4-C5 · p14 收藏 / 历史 / 分享长图测试
 *
 * 覆盖：空态、收藏与历史列表、条目详情、星标切换、删除、
 * lathcalc:save 事件端到端（其他卡 dispatch → store 写历史 → p14 刷新）、
 * 分享长图纯函数（buildShareLayout / paintShareImage / wrapText / 相对时间）。
 * canvas 环境：happy-dom 无 2D context，页面走「不支持 canvas」降级；绘制逻辑用桩断言。
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRouter, type Router } from '../src/ui/router';
import {
  addFavorite,
  addHistory,
  isFavorited,
  listFavorites,
  listHistory,
  type StoredEntry,
} from '../src/ui/store';
import {
  SHARE_IMAGE_WIDTH,
  buildShareLayout,
  formatTimestamp,
  kindLabel,
  paintShareImage,
  relativeDayLabel,
  shareFileName,
  wrapText,
  type Canvas2DLike,
  type SharePalette,
} from '../src/core/share-image';
import pkg from '../package.json';

/** V4.12-C：分享长图页脚版本 = 构建期 __APP_VERSION__（源 package.json），对拍同源。 */
const APP_VERSION: string = pkg.version;

const NOW = 1_700_000_000_000;

const ENTRY: StoredEntry = {
  id: 'abc-1',
  kind: 'weight',
  title: '圆钢 Ø50 × 100',
  params: { D: 50, L: 100 },
  ts: NOW,
};

const PALETTE: SharePalette = {
  background: 'bg',
  card: 'card',
  ink: 'ink',
  inkBody: 'ink-body',
  sub: 'sub',
  accent: 'accent',
  accentInk: 'accent-ink',
  border: 'border',
  codeBg: 'code-bg',
  codeGreen: 'code-green',
  fontFamily: 'Test Sans',
  monoFamily: 'Test Mono',
};

/** canvas 桩：记录全部绘制命令（不依赖任何第三方 canvas 包）。 */
class CanvasStub implements Canvas2DLike {
  fillStyle: string | CanvasGradient | CanvasPattern = '';
  font = '';
  textAlign: CanvasTextAlign = 'left';
  textBaseline: CanvasTextBaseline = 'alphabetic';
  rects: Array<{ x: number; y: number; width: number; height: number; fill: string }> = [];
  texts: string[] = [];
  fonts: string[] = [];
  aligns: CanvasTextAlign[] = [];

  fillRect(x: number, y: number, width: number, height: number): void {
    this.rects.push({ x, y, width, height, fill: String(this.fillStyle) });
  }

  fillText(text: string): void {
    this.texts.push(text);
    this.fonts.push(this.font);
    this.aligns.push(this.textAlign);
  }
}

function expectedTimestamp(ts: number): string {
  const date = new Date(ts);
  const pad = (value: number): string => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

let app: HTMLElement;
let router: Router;

function page(): HTMLElement {
  const element = app.querySelector<HTMLElement>('.la-page[data-page="p14"]');
  if (!element) throw new Error('p14 未渲染');
  return element;
}

function segLabels(): string[] {
  return [...page().querySelectorAll<HTMLElement>('.rc-seg__item')].map(
    (item) => item.textContent ?? '',
  );
}

function clickSeg(label: string): void {
  const item = [...page().querySelectorAll<HTMLButtonElement>('.rc-seg__item')].find(
    (button) => button.textContent === label,
  );
  if (!item) throw new Error(`分段项 ${label} 不存在`);
  item.click();
}

function itemTitles(): string[] {
  return [...page().querySelectorAll<HTMLElement>('.rc-p14__item-title')].map(
    (item) => item.textContent ?? '',
  );
}

function clickIcon(ariaLabel: string): void {
  const button = page().querySelector<HTMLButtonElement>(`button[aria-label="${ariaLabel}"]`);
  if (!button) throw new Error(`图标按钮 ${ariaLabel} 不存在`);
  button.click();
}

beforeEach(async () => {
  localStorage.clear();
  document.body.innerHTML = '<div id="app"></div>';
  window.location.hash = '';
  app = document.querySelector<HTMLElement>('#app') as HTMLElement;
  router = createRouter({ root: app });
  await router.start();
  await router.navigate('p14');
});

afterEach(() => {
  router.destroy();
  document.body.replaceChildren();
});

describe('p14 结构与空态', () => {
  it('顶栏「收藏」/ 两段式（收藏 0 / 历史）/ 收藏空态 / 分享按钮禁用', () => {
    const root = page();
    expect(root.querySelector('.rc-topbar__title')?.textContent).toBe('收藏');
    expect(segLabels()).toEqual(['收藏 0', '历史']);
    expect(root.querySelector('.rc-p14__empty')?.textContent).toBe(
      '暂无收藏 · 在历史条目点星标即可收藏',
    );
    const shareButton = root.querySelector<HTMLButtonElement>('button.rc-btn');
    expect(shareButton?.disabled).toBe(true);
    expect(root.querySelector('.rc-p14__foot')?.textContent).toBe(
      '长图可直接发微信群 · 仅保存在本机',
    );
  });

  it('切到历史显示历史空态', () => {
    clickSeg('历史');
    expect(page().querySelector('.rc-p14__empty')?.textContent).toBe(
      '暂无历史 · 计算结果保存后会出现在这里',
    );
  });
});

describe('p14 收藏 / 历史列表', () => {
  it('收藏条目渲染标题、参数摘要、相对时间与分享/星标动作', () => {
    addFavorite({
      kind: 'thread',
      title: 'M30 × 3.5 普通螺纹',
      params: { d: 30, p: 3.5 },
      ts: Date.now(),
    });
    return router.navigate('p14').then(() => {
      expect(segLabels()).toEqual(['收藏 1', '历史']);
      expect(itemTitles()).toEqual(['M30 × 3.5 普通螺纹']);
      expect(page().querySelector('.rc-p14__item-meta')?.textContent).toBe('d 30 · p 3.5');
      expect(page().querySelector('.rc-p14__item-time')?.textContent).toBe('今天');
      expect(
        page().querySelector('button[aria-label="分享 M30 × 3.5 普通螺纹"]'),
      ).not.toBeNull();
      expect(
        page().querySelector('button[aria-label="取消收藏 M30 × 3.5 普通螺纹"]'),
      ).not.toBeNull();
    });
  });

  it('收藏卡星标 = 取消收藏：列表清空、localStorage 同步、计数归零', () => {
    addFavorite({ kind: 'weight', title: '圆钢 Ø50 × 100', params: { D: 50, L: 100 }, ts: NOW });
    return router.navigate('p14').then(() => {
      clickIcon('取消收藏 圆钢 Ø50 × 100');
      expect(itemTitles()).toEqual([]);
      expect(segLabels()).toEqual(['收藏 0', '历史']);
      expect(listFavorites()).toEqual([]);
      expect(localStorage.getItem('lathcalc.favorites')).toBe('[]');
    });
  });

  it('历史条目星标 = 加入收藏；切回收藏可见', () => {
    addHistory({ kind: 'weight', title: '圆钢 Ø50 × 100', params: { D: 50, L: 100 }, ts: NOW });
    return router.navigate('p14').then(() => {
      clickSeg('历史');
      expect(itemTitles()).toEqual(['圆钢 Ø50 × 100']);
      clickIcon('收藏 圆钢 Ø50 × 100');
      expect(isFavorited({ kind: 'weight', title: '圆钢 Ø50 × 100', params: { D: 50, L: 100 } })).toBe(true);
      expect(segLabels()).toEqual(['收藏 1', '历史']);
      clickSeg('收藏 1');
      expect(itemTitles()).toEqual(['圆钢 Ø50 × 100']);
    });
  });

  it('lathcalc:save 事件端到端：其他页 dispatch → 历史写入 → 历史页即时出现', () => {
    clickSeg('历史');
    document.dispatchEvent(
      new CustomEvent('lathcalc:save', {
        detail: {
          kind: 'thread',
          title: 'M30 × 3.5 普通螺纹',
          params: { d: 30, p: 3.5 },
          ts: NOW,
        },
      }),
    );
    expect(listHistory()).toHaveLength(1);
    expect(itemTitles()).toEqual(['M30 × 3.5 普通螺纹']);
    expect(page().querySelector('.rc-p14__empty')).toBeNull();
  });
});

describe('p14 条目详情', () => {
  it('点按条目展开详情：参数网格 + 记录时间；收起后消失', () => {
    addFavorite({ kind: 'thread', title: 'M30 × 3.5 普通螺纹', params: { d: 30, p: 3.5 }, ts: NOW });
    return router.navigate('p14').then(() => {
      page().querySelector<HTMLButtonElement>('.rc-p14__item-main')?.click();
      const detail = page().querySelector('.rc-p14__detail');
      expect(detail).not.toBeNull();
      expect(detail?.querySelector('.rc-p14__detail-title')?.textContent).toBe('M30 × 3.5 普通螺纹');
      const params = [...page().querySelectorAll<HTMLElement>('.rc-p14__detail .rc-param')];
      expect(params).toHaveLength(2);
      expect(params.map((cell) => cell.querySelector('.rc-param__key')?.textContent)).toEqual(['d', 'p']);
      expect(params.map((cell) => cell.querySelector('.rc-param__value')?.textContent)).toEqual(['30', '3.5']);
      expect(detail?.querySelector('.rc-p14__detail-time')?.textContent).toBe(
        `记录时间 ${expectedTimestamp(NOW)}`,
      );
      page().querySelector<HTMLButtonElement>('.rc-p14__detail-close')?.click();
      expect(page().querySelector('.rc-p14__detail')).toBeNull();
    });
  });

  it('详情里删除历史条目：列表回到空态、store 同步', () => {
    addHistory({ kind: 'triangle', title: '30 / 40 / 50', params: { a: 30, b: 40, c: 50 }, ts: NOW });
    return router.navigate('p14').then(() => {
      clickSeg('历史');
      page().querySelector<HTMLButtonElement>('.rc-p14__item-main')?.click();
      clickIcon('删除 30 / 40 / 50');
      expect(itemTitles()).toEqual([]);
      expect(listHistory()).toEqual([]);
      expect(page().querySelector('.rc-p14__empty')?.textContent).toBe(
        '暂无历史 · 计算结果保存后会出现在这里',
      );
    });
  });
});

describe('p14 分享长图（canvas 降级 + 纯函数）', () => {
  it('canvas 不可用（happy-dom）时点按分享按钮走降级提示，不抛错', () => {
    addFavorite({ kind: 'weight', title: '圆钢 Ø50 × 100', params: { D: 50, L: 100 }, ts: NOW });
    return router.navigate('p14').then(() => {
      const shareButton = page().querySelector<HTMLButtonElement>('button.rc-btn');
      expect(shareButton?.disabled).toBe(false);
      shareButton?.click();
      expect(page().querySelector('.rc-p14__share-msg')?.textContent).toBe(
        '当前环境不支持 canvas，无法生成长图',
      );
    });
  });

  it('buildShareLayout：600 宽、长图高度、标题/类别/时间/参数/页脚逐项出现', () => {
    const layout = buildShareLayout(ENTRY);
    expect(layout.width).toBe(SHARE_IMAGE_WIDTH);
    expect(layout.width).toBe(600);
    expect(layout.height).toBeGreaterThanOrEqual(760);
    expect(layout.background).toBe('background');
    const texts = layout.texts.map((block) => block.text);
    expect(texts).toContain('圆钢 Ø50 × 100');
    expect(kindLabel('weight')).toBe('重量');
    expect(texts).toContain(`重量 · ${expectedTimestamp(NOW)}`);
    expect(texts).toContain('D');
    expect(texts).toContain('50');
    expect(texts).toContain('L');
    expect(texts).toContain('100');
    expect(texts).toContain(`完全离线 · 本机生成 · 车工算 v${APP_VERSION}`);
    // rects：顶部橙条 + 参数区上分隔线 + 偶数行卡底 + 参数区下分隔线 + 页脚分隔线 = 5
    expect(layout.rects).toHaveLength(5);
    expect(layout.rects[0]).toMatchObject({ x: 0, y: 0, width: 600, height: 10, color: 'accent' });
  });

  it('paintShareImage：铺底 + 全部 rect/text 逐条绘制，字体与对齐来自布局', () => {
    const layout = buildShareLayout(ENTRY);
    const stub = new CanvasStub();
    paintShareImage(stub, layout, PALETTE);

    expect(stub.rects).toHaveLength(layout.rects.length + 1); // + 全幅背景
    expect(stub.rects[0]).toMatchObject({ x: 0, y: 0, width: 600, height: layout.height, fill: 'bg' });
    expect(stub.texts).toEqual(layout.texts.map((block) => block.text));
    expect(stub.fonts[0]).toBe('600 20px Test Sans');
    const valueIndex = layout.texts.findIndex(
      (block) => block.text === '50' && block.align === 'right',
    );
    expect(valueIndex).toBeGreaterThan(0);
    expect(stub.fonts[valueIndex]).toBe('600 28px Test Sans');
    expect(stub.aligns[valueIndex]).toBe('right');
    expect(stub.texts).toContain('圆钢 Ø50 × 100');
  });

  it('shareFileName：含 kind 与安全 id，扩展名 .png', () => {
    expect(shareFileName(ENTRY)).toBe('lathcalc-weight-abc-1.png');
    expect(shareFileName({ ...ENTRY, id: 'a/b c', kind: 'weight' })).toBe(
      'lathcalc-weight-abc.png',
    );
  });

  it('wrapText：CJK 按字号折行，ASCII 半宽', () => {
    expect(wrapText('一二三四五六七八九十', 100, 20)).toEqual(['一二三四五', '六七八九十']);
    expect(wrapText('ABCDEFGHIJ', 60, 10)).toEqual(['ABCDEFGHIJ']);
    expect(wrapText('', 100, 20)).toEqual(['']);
  });

  it('relativeDayLabel：今天 / 昨天 / N 天前 / MM-DD', () => {
    const now = new Date(2026, 10, 3, 12, 0, 0).getTime();
    expect(relativeDayLabel(new Date(2026, 10, 3, 8, 0, 0).getTime(), now)).toBe('今天');
    expect(relativeDayLabel(new Date(2026, 10, 2, 9, 0, 0).getTime(), now)).toBe('昨天');
    expect(relativeDayLabel(new Date(2026, 9, 31, 9, 0, 0).getTime(), now)).toBe('3 天前');
    expect(relativeDayLabel(new Date(2026, 9, 20, 9, 0, 0).getTime(), now)).toBe('10-20');
  });

  it('formatTimestamp：本地时区 YYYY-MM-DD HH:mm', () => {
    expect(formatTimestamp(NOW)).toBe(expectedTimestamp(NOW));
    expect(formatTimestamp(NOW)).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
  });
});
