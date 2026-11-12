/**
 * share-image.ts · 分享长图引擎（纯函数，V4.15-W3 自 src/ui/pages/p14.ts 抽取）
 *
 * 架构位：对齐 core/*-figure.ts 惯例——纯数字/纯绘制零 DOM、零 ui import；
 * canvas 经 Canvas2DLike 最小接口注入（测试可传桩），调色板由页面层
 * resolveSharePalette（读设计 token）传入，本模块不触 document。
 * 输入结构：ShareEntry（StoredEntry 的结构子集，p14 传入即结构兼容）。
 * __APP_VERSION__ 为 vite 构建期注入全局（src/vite-env.d.ts ambient，项目级）。
 */

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

/** 引擎实际读取的条目字段（StoredEntry 结构子集；来源=抽取期引擎区 entry.* grep 全集）。 */
export interface ShareEntry {
  id: string;
  kind: string;
  title: string;
  params: Record<string, string | number>;
  ts: number;
}

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
export function buildShareLayout(entry: ShareEntry): ShareLayout {
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
export function shareFileName(entry: ShareEntry): string {
  const safeId = entry.id.replace(/[^a-zA-Z0-9-]/g, '');
  return `lathcalc-${entry.kind.replace(/[^a-zA-Z0-9-]/g, '')}-${safeId}.png`;
}
