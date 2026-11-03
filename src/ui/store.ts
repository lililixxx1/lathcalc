/**
 * store.ts · 收藏 / 历史本机持久化（W4-C5）
 *
 * ===== 条目结构（冻结，跨卡共享） =====
 * interface StoredEntry {
 *   id: string;                               // 本机唯一 id（时间戳 36 进制 + 计数 + 随机后缀）
 *   kind: string;                             // 计算类别：thread / weight / triangle / arc / taper /
 *                                             //   tolerance / speed / cutting / gcode …（自由字符串）
 *   title: string;                            // 条目名，如 "M30 × 3.5 普通螺纹"
 *   params: Record<string, string | number>;  // 原始输入（只存原始输入，禁止存显示舍入值）
 *   ts: number;                               // 记录时间（毫秒时间戳）
 * }
 *
 * ===== 跨卡保存事件（Lead 冻结） =====
 * 其他页面保存计算结果时派发：
 *   document.dispatchEvent(new CustomEvent('lathcalc:save', {
 *     detail: { kind: 'thread', title: 'M30 × 3.5 普通螺纹', params: { d: 30, p: 3.5 }, ts: Date.now() },
 *   }));
 * 本模块收到合法 detail 后写入**历史**（同 kind + title + params 去重后置顶）。
 * 收藏不自动写入：冻结的 detail 只有 kind/title/params/ts 四个键，没有收藏标志位；
 * 收藏由显式 API（addFavorite / toggleFavorite）以及 p14 的星标动作负责。
 *
 * ===== 存储 =====
 * localStorage，key 前缀 lathcalc.：lathcalc.favorites / lathcalc.history。
 * 每次读取都直接读 localStorage（无模块级缓存），损坏或缺省数据一律按空列表处理。
 * 监听器是应用级单例：模块首次在含 document 的环境加载时自动安装一次（幂等）。
 */

export interface StoredEntry {
  id: string;
  kind: string;
  title: string;
  params: Record<string, string | number>;
  ts: number;
}

/** 写入 / 收藏 API 的入参：id 缺省自动生成，ts 缺省取当前时间。 */
export interface StoredEntryInput {
  id?: string;
  kind: string;
  title: string;
  params?: Record<string, string | number>;
  ts?: number;
}

/** lathcalc:save 事件的 detail 契约。 */
export interface SaveEventDetail {
  kind: string;
  title: string;
  params: Record<string, string | number>;
  ts?: number;
}

export const STORAGE_PREFIX = 'lathcalc.';
export const FAVORITES_STORAGE_KEY = `${STORAGE_PREFIX}favorites`;
export const HISTORY_STORAGE_KEY = `${STORAGE_PREFIX}history`;
export const SAVE_EVENT = 'lathcalc:save';

/** 历史上限（超出裁掉最旧条目；按本机存储控量） */
export const HISTORY_LIMIT = 50;
/** 收藏上限（同上） */
export const FAVORITES_LIMIT = 100;

let idCounter = 0;

function createId(ts: number): string {
  idCounter += 1;
  return `${ts.toString(36)}-${idCounter.toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function getStorage(): Storage | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage;
  } catch {
    return null;
  }
}

function normalizeParams(params: Record<string, string | number> | undefined): Record<string, string | number> {
  const result: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(params ?? {})) {
    if (typeof value === 'string' || (typeof value === 'number' && Number.isFinite(value))) {
      result[key] = value;
    }
  }
  return result;
}

function normalizeInput(input: StoredEntryInput): StoredEntry | null {
  const kind = input.kind.trim();
  const title = input.title.trim();
  if (!kind || !title) return null;
  const ts = typeof input.ts === 'number' && Number.isFinite(input.ts) ? input.ts : Date.now();
  const id = input.id?.trim() || createId(ts);
  return { id, kind, title, params: normalizeParams(input.params), ts };
}

/** 去重签名：kind + title + params（params 键排序，与对象键顺序无关）。 */
function signatureOf(entry: Pick<StoredEntry, 'kind' | 'title' | 'params'>): string {
  const params = Object.keys(entry.params)
    .sort()
    .map((key) => [key, entry.params[key]]);
  return JSON.stringify([entry.kind, entry.title, params]);
}

function isStoredEntry(value: unknown): value is StoredEntry {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<StoredEntry>;
  return (
    typeof candidate.id === 'string' &&
    candidate.id.length > 0 &&
    typeof candidate.kind === 'string' &&
    candidate.kind.length > 0 &&
    typeof candidate.title === 'string' &&
    candidate.title.length > 0 &&
    typeof candidate.ts === 'number' &&
    Number.isFinite(candidate.ts) &&
    !!candidate.params &&
    typeof candidate.params === 'object' &&
    !Array.isArray(candidate.params)
  );
}

function readList(key: string): StoredEntry[] {
  const storage = getStorage();
  if (!storage) return [];
  let raw: string | null;
  try {
    raw = storage.getItem(key);
  } catch {
    return [];
  }
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isStoredEntry).map((entry) => ({
      id: entry.id,
      kind: entry.kind,
      title: entry.title,
      params: normalizeParams(entry.params),
      ts: entry.ts,
    }));
  } catch {
    return [];
  }
}

function writeList(key: string, entries: readonly StoredEntry[]): boolean {
  const storage = getStorage();
  if (!storage) return false;
  try {
    storage.setItem(key, JSON.stringify(entries));
    return true;
  } catch {
    return false;
  }
}

/** 收藏列表（新到旧）。 */
export function listFavorites(): StoredEntry[] {
  return readList(FAVORITES_STORAGE_KEY).sort((a, b) => b.ts - a.ts);
}

/** 历史列表（新到旧）。 */
export function listHistory(): StoredEntry[] {
  return readList(HISTORY_STORAGE_KEY).sort((a, b) => b.ts - a.ts);
}

/** 加入收藏；同 kind + title + params 已存在时返回已有条目（不重复）。 */
export function addFavorite(input: StoredEntryInput): StoredEntry | null {
  const entry = normalizeInput(input);
  if (!entry) return null;
  const list = listFavorites();
  const signature = signatureOf(entry);
  const existing = list.find((item) => signatureOf(item) === signature);
  if (existing) return existing;
  writeList(FAVORITES_STORAGE_KEY, [entry, ...list].slice(0, FAVORITES_LIMIT));
  return entry;
}

/** 按 id 删除收藏；返回是否删除成功。 */
export function removeFavorite(id: string): boolean {
  const list = listFavorites();
  const next = list.filter((entry) => entry.id !== id);
  if (next.length === list.length) return false;
  writeList(FAVORITES_STORAGE_KEY, next);
  return true;
}

/** 清空收藏。 */
export function clearFavorites(): void {
  writeList(FAVORITES_STORAGE_KEY, []);
}

/** 追加历史；同 kind + title + params 去重并置顶，上限 HISTORY_LIMIT。 */
export function addHistory(input: StoredEntryInput): StoredEntry | null {
  const entry = normalizeInput(input);
  if (!entry) return null;
  const list = listHistory();
  const signature = signatureOf(entry);
  const next = [entry, ...list.filter((item) => signatureOf(item) !== signature)].slice(
    0,
    HISTORY_LIMIT,
  );
  writeList(HISTORY_STORAGE_KEY, next);
  return entry;
}

/** 按 id 删除历史；返回是否删除成功。 */
export function removeHistory(id: string): boolean {
  const list = listHistory();
  const next = list.filter((entry) => entry.id !== id);
  if (next.length === list.length) return false;
  writeList(HISTORY_STORAGE_KEY, next);
  return true;
}

/** 清空历史。 */
export function clearHistory(): void {
  writeList(HISTORY_STORAGE_KEY, []);
}

/** 是否已收藏（按 kind + title + params 判断，与 id 无关）。 */
export function isFavorited(entry: Pick<StoredEntry, 'kind' | 'title' | 'params'>): boolean {
  const signature = signatureOf(entry);
  return listFavorites().some((item) => signatureOf(item) === signature);
}

/** 收藏切换：已收藏则移除，未收藏则加入。 */
export function toggleFavorite(
  input: StoredEntryInput,
): { favorite: boolean; entry: StoredEntry } | null {
  const normalized = normalizeInput(input);
  if (!normalized) return null;
  const existing = listFavorites().find(
    (item) => signatureOf(item) === signatureOf(normalized),
  );
  if (existing) {
    removeFavorite(existing.id);
    return { favorite: false, entry: existing };
  }
  const added = addFavorite(input);
  if (!added) return null;
  return { favorite: true, entry: added };
}

/** 保存事件缺省落点：写入历史（见文件头语义说明）。 */
export function recordSave(detail: SaveEventDetail): StoredEntry | null {
  return addHistory(detail);
}

function isSaveDetail(value: unknown): value is SaveEventDetail {
  if (!value || typeof value !== 'object') return false;
  const detail = value as Partial<SaveEventDetail>;
  return (
    typeof detail.kind === 'string' &&
    detail.kind.trim().length > 0 &&
    typeof detail.title === 'string' &&
    detail.title.trim().length > 0 &&
    !!detail.params &&
    typeof detail.params === 'object' &&
    !Array.isArray(detail.params) &&
    (detail.ts === undefined ||
      (typeof detail.ts === 'number' && Number.isFinite(detail.ts)))
  );
}

function handleSaveEvent(event: Event): void {
  const detail = (event as CustomEvent<unknown>).detail;
  if (!isSaveDetail(detail)) return;
  recordSave(detail);
}

let listenerInstalled = false;
let listenerTarget: EventTarget | null = null;

/**
 * 安装 lathcalc:save 监听（幂等；换 target 时先卸载旧监听）。
 * 返回卸载函数；模块在含 document 的环境首次加载时已自动调用一次，
 * 页面无需重复安装（p14 调用也只是幂等确认）。
 */
export function installSaveListener(target?: EventTarget): () => void {
  const resolved = target ?? (typeof document !== 'undefined' ? document : null);
  if (!resolved) return () => {};

  if (listenerInstalled && listenerTarget === resolved) {
    return () => {
      /* 已安装的全局监听由模块生命周期持有，不因单次调用返回的卸载函数失效 */
    };
  }

  if (listenerTarget) {
    listenerTarget.removeEventListener(SAVE_EVENT, handleSaveEvent);
  }
  resolved.addEventListener(SAVE_EVENT, handleSaveEvent);
  listenerInstalled = true;
  listenerTarget = resolved;

  return () => {
    if (listenerTarget !== resolved) return;
    resolved.removeEventListener(SAVE_EVENT, handleSaveEvent);
    listenerInstalled = false;
    listenerTarget = null;
  };
}

// 应用级单例：含 DOM 时首载即监听，保证任意页面 dispatch 都能落历史。
if (typeof document !== 'undefined') {
  installSaveListener(document);
}
