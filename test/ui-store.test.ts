// @vitest-environment happy-dom
/**
 * W4-C5 · src/ui/store.ts 测试
 *
 * 覆盖：写入 / 列表 / 删除 / 清空 / localStorage 往返 / lathcalc:save 事件路径。
 * happy-dom 提供 localStorage 与 CustomEvent（vite.config.ts 不改，按文件启用环境）。
 */
import { beforeEach, describe, expect, it } from 'vitest';
import {
  FAVORITES_STORAGE_KEY,
  HISTORY_STORAGE_KEY,
  SAVE_EVENT,
  addFavorite,
  addHistory,
  clearFavorites,
  clearHistory,
  isFavorited,
  listFavorites,
  listHistory,
  recordSave,
  removeFavorite,
  removeHistory,
  toggleFavorite,
  type StoredEntry,
} from '../src/ui/store';

const TS_A = 1_700_000_000_000;
const TS_B = 1_700_000_100_000;

function seed(title = 'M30 × 3.5 普通螺纹'): StoredEntry {
  return {
    id: 'seed-1',
    kind: 'thread',
    title,
    params: { d: 30, p: 3.5 },
    ts: TS_A,
  };
}

beforeEach(() => {
  localStorage.clear();
});

describe('store · 键名与 localStorage 往返', () => {
  it('key 前缀为 lathcalc.：收藏 / 历史键名逐字断言', () => {
    expect(FAVORITES_STORAGE_KEY).toBe('lathcalc.favorites');
    expect(HISTORY_STORAGE_KEY).toBe('lathcalc.history');
    expect(SAVE_EVENT).toBe('lathcalc:save');
  });

  it('addFavorite 写入 localStorage，原始 JSON 与列表读回一致', () => {
    const added = addFavorite({ kind: 'thread', title: 'M30 × 3.5', params: { d: 30, p: 3.5 }, ts: TS_A });
    expect(added).not.toBeNull();
    expect(added?.kind).toBe('thread');
    expect(added?.title).toBe('M30 × 3.5');
    expect(added?.params).toEqual({ d: 30, p: 3.5 });
    expect(added?.ts).toBe(TS_A);

    const raw = localStorage.getItem('lathcalc.favorites');
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw ?? '[]') as StoredEntry[];
    expect(parsed).toHaveLength(1);
    expect(parsed[0]?.id).toBe(added?.id);
    expect(parsed[0]?.title).toBe('M30 × 3.5');

    const listed = listFavorites();
    expect(listed).toHaveLength(1);
    expect(listed[0]?.id).toBe(added?.id);
  });

  it('读取无缓存：外部清空 localStorage 后列表为空', () => {
    addFavorite({ kind: 'weight', title: '圆钢', params: { D: 50 }, ts: TS_A });
    expect(listFavorites()).toHaveLength(1);
    localStorage.removeItem(FAVORITES_STORAGE_KEY);
    expect(listFavorites()).toEqual([]);
  });

  it('损坏 JSON / 非数组按空列表处理，后续写入可恢复', () => {
    localStorage.setItem(HISTORY_STORAGE_KEY, '{not-json');
    expect(listHistory()).toEqual([]);
    localStorage.setItem(HISTORY_STORAGE_KEY, '{"kind":"thread"}');
    expect(listHistory()).toEqual([]);
    addHistory({ kind: 'thread', title: 'M30 × 3.5', params: { d: 30, p: 3.5 }, ts: TS_A });
    expect(listHistory()).toHaveLength(1);
  });
});

describe('store · 收藏增删清空与去重', () => {
  it('同 kind+title+params 不重复收藏（ts 不同也视为同一条目）', () => {
    const first = addFavorite({ kind: 'thread', title: 'M30 × 3.5', params: { d: 30, p: 3.5 }, ts: TS_A });
    const second = addFavorite({ kind: 'thread', title: 'M30 × 3.5', params: { p: 3.5, d: 30 }, ts: TS_B });
    expect(first).not.toBeNull();
    expect(second?.id).toBe(first?.id);
    expect(listFavorites()).toHaveLength(1);
  });

  it('removeFavorite 按 id 删除；不存在返回 false', () => {
    const added = addFavorite({ kind: 'weight', title: '圆钢', params: { D: 50 }, ts: TS_A });
    const id = added?.id ?? '';
    expect(removeFavorite(id)).toBe(true);
    expect(listFavorites()).toEqual([]);
    expect(removeFavorite(id)).toBe(false);
  });

  it('clearFavorites 清空但不动历史', () => {
    addFavorite({ kind: 'weight', title: '圆钢', params: { D: 50 }, ts: TS_A });
    addHistory({ kind: 'triangle', title: '30/40/50', params: { a: 30 }, ts: TS_A });
    clearFavorites();
    expect(listFavorites()).toEqual([]);
    expect(listHistory()).toHaveLength(1);
  });

  it('toggleFavorite 两次往返：收藏 → 取消收藏', () => {
    const entry = seed();
    expect(isFavorited(entry)).toBe(false);
    const on = toggleFavorite(entry);
    expect(on?.favorite).toBe(true);
    expect(isFavorited(entry)).toBe(true);
    const off = toggleFavorite(entry);
    expect(off?.favorite).toBe(false);
    expect(isFavorited(entry)).toBe(false);
    expect(listFavorites()).toEqual([]);
  });
});

describe('store · 历史事件路径（lathcalc:save）', () => {
  it('document 上派发 CustomEvent 即写历史（kind/title/params/ts 原样保留）', () => {
    const detail = { kind: 'thread', title: 'M30 × 3.5 普通螺纹', params: { d: 30, p: 3.5 }, ts: TS_A };
    document.dispatchEvent(new CustomEvent(SAVE_EVENT, { detail }));

    const history = listHistory();
    expect(history).toHaveLength(1);
    expect(history[0]?.kind).toBe('thread');
    expect(history[0]?.title).toBe('M30 × 3.5 普通螺纹');
    expect(history[0]?.params).toEqual({ d: 30, p: 3.5 });
    expect(history[0]?.ts).toBe(TS_A);
    expect(history[0]?.id.length).toBeGreaterThan(0);
    expect(JSON.parse(localStorage.getItem('lathcalc.history') ?? '[]')).toHaveLength(1);
  });

  it('同条目重复派发只保留一条，新的 ts 置顶', () => {
    document.dispatchEvent(
      new CustomEvent(SAVE_EVENT, {
        detail: { kind: 'thread', title: 'M30 × 3.5', params: { d: 30, p: 3.5 }, ts: TS_A },
      }),
    );
    document.dispatchEvent(
      new CustomEvent(SAVE_EVENT, {
        detail: { kind: 'thread', title: 'M30 × 3.5', params: { d: 30, p: 3.5 }, ts: TS_B },
      }),
    );
    const history = listHistory();
    expect(history).toHaveLength(1);
    expect(history[0]?.ts).toBe(TS_B);
  });

  it('参数键顺序不同仍视为同一条目（签名排序）', () => {
    addHistory({ kind: 'thread', title: 'M30', params: { d: 30, p: 3.5 }, ts: TS_A });
    addHistory({ kind: 'thread', title: 'M30', params: { p: 3.5, d: 30 }, ts: TS_B });
    expect(listHistory()).toHaveLength(1);
  });

  it('非法 detail（缺 title / 非对象 / 空 kind）被忽略', () => {
    document.dispatchEvent(new CustomEvent(SAVE_EVENT, { detail: { kind: 'thread', params: {} } }));
    document.dispatchEvent(new CustomEvent(SAVE_EVENT, { detail: null }));
    document.dispatchEvent(new CustomEvent(SAVE_EVENT, { detail: { kind: '  ', title: 'x', params: {} } }));
    document.dispatchEvent(new CustomEvent(SAVE_EVENT));
    expect(listHistory()).toEqual([]);
  });

  it('历史按 ts 新到旧排序；removeHistory / clearHistory 生效', () => {
    addHistory({ kind: 'a', title: '旧', params: { n: 1 }, ts: TS_A });
    addHistory({ kind: 'b', title: '新', params: { n: 2 }, ts: TS_B });
    const history = listHistory();
    expect(history.map((entry) => entry.title)).toEqual(['新', '旧']);
    expect(removeHistory(history[0]?.id ?? '')).toBe(true);
    expect(listHistory()).toHaveLength(1);
    clearHistory();
    expect(listHistory()).toEqual([]);
  });

  it('recordSave 与事件路径同义（直接调用也写历史）', () => {
    const saved = recordSave({ kind: 'speed', title: 'Ø50 转速', params: { d: 50, vc: 150 }, ts: TS_A });
    expect(saved?.title).toBe('Ø50 转速');
    expect(listHistory()).toHaveLength(1);
  });

  it('favorite: true 双落收藏+历史（W4 集成裁决）；缺省仅落历史', () => {
    // p03 星标语义：dispatch 带 favorite:true → 收藏与历史同时落
    document.dispatchEvent(
      new CustomEvent(SAVE_EVENT, {
        detail: {
          kind: 'thread',
          title: 'M30 × 3.5 普通螺纹',
          params: { d: 30, p: 3.5 },
          ts: TS_A,
          favorite: true,
        },
      }),
    );
    expect(listHistory()).toHaveLength(1);
    expect(listFavorites()).toHaveLength(1);
    expect(listFavorites()[0]?.title).toBe('M30 × 3.5 普通螺纹');
    expect(isFavorited({ kind: 'thread', title: 'M30 × 3.5 普通螺纹', params: { d: 30, p: 3.5 } })).toBe(
      true,
    );

    // 缺省（无 favorite 键）：只写历史，不进收藏
    document.dispatchEvent(
      new CustomEvent(SAVE_EVENT, {
        detail: { kind: 'weight', title: '圆钢 Ø50×100', params: { d: 50, l: 100 }, ts: TS_B },
      }),
    );
    expect(listHistory()).toHaveLength(2);
    expect(listFavorites()).toHaveLength(1);
  });
});

describe('store · 非法入参', () => {
  it('空 kind / 空 title 返回 null 且不写盘', () => {
    expect(addFavorite({ kind: '', title: 'x', ts: TS_A })).toBeNull();
    expect(addFavorite({ kind: 'thread', title: '   ', ts: TS_A })).toBeNull();
    expect(addHistory({ kind: '', title: 'x', ts: TS_A })).toBeNull();
    expect(toggleFavorite({ kind: '', title: 'x', ts: TS_A })).toBeNull();
    expect(localStorage.getItem(FAVORITES_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(HISTORY_STORAGE_KEY)).toBeNull();
  });
});
