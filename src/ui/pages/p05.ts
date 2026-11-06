/**
 * p05 · 圆弧切点 · 工况图库（W4-C3 实现）
 *
 * 设计稿：docs/车工计算App-无限画布.html p05（2 列 × 6 行 = 12 工况图库）。
 * 工况名称 / 输入键集只读引用 core：
 *   src/core/arc-cases-a.ts（AC01–AC06）、src/core/arc-cases-b.ts（AC07–AC12）。
 *
 * 传参约定（本卡登记，待 Lead 批准后同步 src/ui/README.md §5.2 下一版）：
 *   p05 → p06：键 `case` = ArcCaseId（AC01–AC12），例 `#/p06?case=AC01`。
 *
 * 锚点约定（W2-C4/C5 冻结，唯一接线依据）在每张工况卡参数行标注：
 *   AC02/AC03/AC06 无绝对定位，以 X0 为基准（输出相对坐标）；
 *   AC04 斜线段长欠定补约定 L = R1 + R2；其余见 arc-cases-b.ts 文件头。
 *
 * 视觉：缩略示意图 1:1 取自设计稿 p05（64×34 viewBox）；设计稿十六进制色值
 * 替换为 currentColor / var(--la-accent)（契约 §4.2 / ui-source 扫描要求）。
 * v0.3.1（WAVE-PLAN-V4.2，用户反馈「图形没有标注」）：hero 变体增标注层
 * （圆心/虚线半径/尺寸线/符号文字，坐标表 §3 冻结）——推翻 W4-C3-03 的几何半；
 * mock 数值标注维持不采用（示例值几何不可能，见 DEVIATIONS G0 阻塞 1）。
 * v0.4.0（WAVE-PLAN-V4.3，用户反馈「图形能否随数值变化」试点）：新增
 * arcCaseParametricSVG——参数化图形装配（AC01/AC05 试点，规格 core/arc-figure.ts），
 * 数值标签回显求解器真值（V4.3-01 再裁决：形值同源，非 mock）；静态 10 案与
 * 全部 thumb 不变。
 */
import type { FigureView } from '../../core/arc-figure';
import { arcCasesA } from '../../core/arc-cases-a';
import { arcCasesB } from '../../core/arc-cases-b';
import type { ArcCaseId, ArcCaseSolver } from '../../core/types';
import {
  Tile,
  TileGrid,
  TopBar,
  createBody,
  createPage,
  injectStyle,
} from '../components';
import type { PageContext, PageModule } from '../router';

export const title = '圆弧切点 · 工况图库';

const CSS = `
.rc-p05__body { padding-top: 4px; gap: 9px; }
.rc-p05__subrow { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
.rc-p05__count { color: var(--la-accent-ink); font-weight: 600; flex: 0 0 auto; }
.rc-p05__names { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1 1 auto; }
.rc-p05__anchor { font-size: 9.5px; line-height: 1.25; color: var(--la-faint); overflow-wrap: anywhere; }
`;

/** 12 工况（顺序 = 设计稿 p05 图库顺序 AC01 → AC12） */
const ARC_CASES: readonly ArcCaseSolver[] = [...arcCasesA, ...arcCasesB];

/**
 * hero 标注层（v0.3.1，WAVE-PLAN-V4.2 §3 冻结坐标表；thumb 不标注）。
 * 圆心坐标由 GRAPHICS 弧参数解析导出（AC02/03/11 为 circle 显式）；
 * 虚线 = 圆心↔既有橙点；文字为符号（R/R1/α/dZ…）不带数值——
 * 设计稿 mock 数值标注维持不采用（W4-C3-03 数值半维持、几何半推翻）。
 */
interface AnnoSpec {
  /** 灰色圆心点 */
  centers?: readonly (readonly [number, number])[];
  /** 虚线（d 属性） */
  dashes?: readonly string[];
  /** 细实线尺寸线（d 属性） */
  dims?: readonly string[];
  /** 符号文字（文字, x, y=基线） */
  labels?: readonly (readonly [string, number, number])[];
}

const ANNOTATIONS: Record<ArcCaseId, AnnoSpec> = {
  AC01: {
    centers: [[31, 12]],
    dashes: ['M31 12V25'],
    dims: ['M57 12V25', 'M55.7 12H58.3', 'M55.7 25H58.3'],
    labels: [
      ['R', 33.5, 19.5],
      ['α', 46, 16.5],
      ['Ø', 58.8, 19.5],
    ],
  },
  AC02: {
    centers: [
      [21, 17],
      [43, 17],
    ],
    dashes: ['M21 17H43'],
    dims: ['M21 31H43', 'M21 29.7V32.3', 'M43 29.7V32.3'],
    labels: [
      ['R1', 19.7, 23.5],
      ['R2', 41.7, 21.5],
      ['dZ', 30.3, 30.2],
    ],
  },
  AC03: {
    centers: [
      [24, 17],
      [41, 17],
    ],
    dashes: ['M24 17H41'],
    dims: ['M24 31.2H41', 'M24 29.9V32.5', 'M41 29.9V32.5'],
    labels: [
      ['R1', 22.7, 23.5],
      ['R2', 40.7, 21.5],
      ['dZ', 30.3, 30.4],
    ],
  },
  AC04: {
    centers: [
      [3, 21],
      [37, 26],
    ],
    dashes: ['M3 21L26 18', 'M37 26L26 18'],
    labels: [
      ['R1', 6, 6.5],
      ['R2', 43, 25.5],
      ['α', 23, 11.5],
      ['L', 28, 21.8],
    ],
  },
  AC05: {
    centers: [[23, 17]],
    dashes: ['M23 17H32'],
    dims: [
      'M19.5 17V26',
      'M18.2 17H20.8',
      'M18.2 26H20.8',
      'M21.5 27.8H33.5',
      'M21.5 26.5V29.1',
      'M33.5 26.5V29.1',
    ],
    labels: [
      ['R', 26.5, 15.2],
      ['stepX', 9, 22.5],
      ['stepZ', 24, 31.8],
    ],
  },
  AC06: {
    centers: [[19, 11]],
    dashes: ['M19 11H32'],
    dims: [
      'M19 28.2H32',
      'M19 26.9V29.5',
      'M32 26.9V29.5',
      'M55 11V24',
      'M53.7 11H56.3',
      'M53.7 24H56.3',
    ],
    labels: [
      ['R', 24, 9.2],
      ['dX', 56.9, 18.5],
      ['dZ', 24, 32.2],
    ],
  },
  AC07: {
    centers: [[23, 24]],
    dashes: ['M23 24H36'],
    dims: [
      'M23 9.4H36',
      'M23 8.1V10.7',
      'M36 8.1V10.7',
      'M20 11V24',
      'M18.7 11H21.3',
      'M18.7 24H21.3',
    ],
    labels: [
      ['R', 29, 22.2],
      ['dX', 13, 18.5],
      ['dZ', 26.5, 8.2],
    ],
  },
  AC08: {
    centers: [[18, 18]],
    dashes: ['M18 18H29'],
    dims: ['M18 30.5H29', 'M18 29.2V31.8', 'M29 29.2V31.8'],
    labels: [
      ['R', 23.5, 16.2],
      ['dZ', 31.5, 31],
    ],
  },
  AC09: {
    centers: [[30, 17]],
    dashes: ['M30 17H40'],
    labels: [
      ['R', 34.5, 15.2],
      ['α', 21, 13.5],
    ],
  },
  AC10: {
    centers: [[22, 24]],
    dashes: ['M22 10V24'],
    dims: ['M46.8 10V16', 'M45.5 10H48.1', 'M45.5 16H48.1'],
    labels: [
      ['R', 24.5, 13.8],
      ['lead', 48.6, 13.8],
    ],
  },
  AC11: {
    centers: [[26, 17]],
    dashes: ['M26 17H36'],
    labels: [['R', 31, 15.2]],
  },
  AC12: {
    centers: [[28, 18]],
    dashes: ['M28 18H37'],
    dims: ['M12 5.2H37', 'M12 3.9V6.5', 'M37 3.9V6.5'],
    labels: [
      ['R', 32, 16.2],
      ['孔径', 20.5, 3.9],
    ],
  },
};

/** hero 标注层 SVG 片段（V4.2 §2 契约：全 token 色、无内联十六进制） */
function annotationLayer(id: ArcCaseId): string {
  const anno = ANNOTATIONS[id];
  const centers = (anno.centers ?? [])
    .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="0.9" fill="var(--la-sub)" stroke="none"/>`)
    .join('');
  const dashes = (anno.dashes ?? [])
    .map((d) => `<path d="${d}" stroke="var(--la-sub)" stroke-width="0.35" stroke-dasharray="1.6 1.2"/>`)
    .join('');
  const dims = (anno.dims ?? [])
    .map((d) => `<path d="${d}" stroke="var(--la-sub)" stroke-width="0.3"/>`)
    .join('');
  const labels = (anno.labels ?? [])
    .map(([text, x, y]) => `<text x="${x}" y="${y}" font-size="3.2" fill="var(--la-sub)" stroke="none">${text}</text>`)
    .join('');
  return centers + dashes + dims + labels;
}

interface GraphicSpec {
  /** 设计稿 p05 的 SVG path / circle 标记（受信内部字符串） */
  paths: string;
  /** 橙色切点坐标（viewBox 64×34） */
  point: readonly [number, number];
}

/** 缩略示意图：逐条对应设计稿 p05 的 12 个 gcase()（docs/车工计算App-无限画布.html:1233-1244） */
const GRAPHICS: Record<ArcCaseId, GraphicSpec> = {
  AC01: { paths: '<path d="M5 25h26"/><path d="M31 25a13 13 0 0 0 13-13h10"/>', point: [31, 25] },
  AC02: {
    paths: '<circle cx="21" cy="17" r="9"/><circle cx="43" cy="17" r="7"/>',
    point: [33, 17],
  },
  AC03: {
    paths: '<circle cx="24" cy="17" r="12"/><circle cx="41" cy="17" r="5"/>',
    point: [36, 17],
  },
  AC04: {
    paths:
      '<path d="M6 9a12 12 0 0 1 9 11"/><path d="M15 20l22-6"/><path d="M37 14a12 12 0 0 1 12 11"/>',
    point: [26, 18],
  },
  AC05: { paths: '<path d="M6 26h17a9 9 0 0 0 9-9v-5h20"/>', point: [32, 17] },
  AC06: { paths: '<path d="M5 24h14a13 13 0 0 0 13-13h20"/>', point: [32, 11] },
  AC07: { paths: '<path d="M5 11h18a13 13 0 0 1 13 13h18"/>', point: [36, 24] },
  AC08: { paths: '<path d="M18 5v24"/><path d="M18 29a11 11 0 0 0 11-11"/>', point: [29, 18] },
  AC09: { paths: '<path d="M8 27 30 7"/><path d="M30 7a10 10 0 0 1 10 10"/>', point: [40, 17] },
  AC10: {
    paths: '<path d="M8 24a14 14 0 0 1 14-14"/><path d="M22 10h24M22 16h18"/>',
    point: [22, 10],
  },
  AC11: { paths: '<circle cx="26" cy="17" r="10"/><path d="M36 17h18"/>', point: [36, 17] },
  AC12: { paths: '<path d="M12 7v20"/><path d="M12 27h16a9 9 0 0 0 9-9V7"/>', point: [37, 18] },
};

/**
 * 每工况卡锚点约定关键参数（core 输入键 + 欠定补约定）。
 * AC02/AC03/AC06 无绝对定位输入，以 X0 为基准；AC04 线段长 L=R1+R2。
 */
const ANCHORS: Record<ArcCaseId, string> = {
  AC01: 'R · α · 台阶Ø',
  AC02: 'R1 · R2 · dZ · X0基准',
  AC03: 'R1 > R2 · dZ · X0基准',
  AC04: 'R1 · R2 · α · L=R1+R2',
  AC05: 'R · stepX · stepZ',
  AC06: 'R · dX · dZ · X0基准',
  AC07: 'R · dX · dZ',
  AC08: 'R · dZ',
  AC09: 'R · 半角α',
  AC10: 'R · lead',
  AC11: 'R',
  AC12: 'R · 孔径',
};

/**
 * 工况示意图 SVG（p05 缩略图 / p06 大图共用；描边 currentColor，橙点走 token）。
 * hero 变体放大到 220×102 时按 viewBox 比例收细线宽，避免线条过粗。
 */
export function arcCaseGraphic(id: ArcCaseId, variant: 'thumb' | 'hero' = 'thumb'): string {
  const graphic = GRAPHICS[id];
  const hero = variant === 'hero';
  const strokeWidth = hero ? 0.55 : 1.5;
  const pointRadius = hero ? 1 : 2.4;
  const width = hero ? 220 : 64;
  const height = hero ? 102 : 34;
  const annotations = hero ? annotationLayer(id) : '';
  return `<svg viewBox="0 0 64 34" width="${width}" height="${height}" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${annotations}${graphic.paths}<circle cx="${graphic.point[0]}" cy="${graphic.point[1]}" r="${pointRadius}" fill="var(--la-accent)" stroke="none"/></svg>`;
}

/**
 * 参数化工况图形 SVG（V4.3 试点：AC01/AC05；spec 由 core/arc-figure.ts 生成）。
 * chrome 与 hero 一致（viewBox 64×34 / 220×102 / 线宽 0.55 / token 色）；
 * 层序：轴线/虚线/圆心 → 轮廓 → 值标签（最上，保读性）→ 橙点。
 * 数字两位定点（n2），坐标全来自 core 已映射值，本函数零几何。
 */
export function arcCaseParametricSVG(fig: FigureView): string {
  const n2 = (v: number): number => Math.round(v * 100) / 100;
  const segD = (s: { x1: number; y1: number; x2: number; y2: number }): string =>
    `M${n2(s.x1)} ${n2(s.y1)}L${n2(s.x2)} ${n2(s.y2)}`;
  const dash = (s: { x1: number; y1: number; x2: number; y2: number }): string =>
    `<path d="${segD(s)}" stroke="var(--la-sub)" stroke-width="0.35" stroke-dasharray="1.6 1.2"/>`;
  const axis = `<path d="${segD(fig.axis)}" stroke="var(--la-sub)" stroke-width="0.4"/>`;
  const refDashes = fig.refDashes.map(dash).join('');
  const radiusDashes = fig.radiusDashes.map(dash).join('');
  const centers = fig.centerDots
    .map((c) => `<circle cx="${n2(c.x)}" cy="${n2(c.y)}" r="0.9" fill="var(--la-sub)" stroke="none"/>`)
    .join('');
  const segs = fig.segs.map((s) => `<path d="${segD(s)}"/>`).join('');
  const arcs = fig.arcs
    .map(
      (a) =>
        `<path d="M${n2(a.x1)} ${n2(a.y1)}A${n2(a.rx)} ${n2(a.rx)} 0 0 ${a.sweep} ${n2(a.x2)} ${n2(a.y2)}"/>`,
    )
    .join('');
  const labels = fig.labels
    .map(
      (l) =>
        `<text x="${n2(l.x)}" y="${n2(l.y)}" font-size="3.2" fill="var(--la-sub)" stroke="none" text-anchor="${l.anchor}">${l.text}</text>`,
    )
    .join('');
  const point = `<circle cx="${n2(fig.point.x)}" cy="${n2(fig.point.y)}" r="1" fill="var(--la-accent)" stroke="none"/>`;
  return `<svg viewBox="0 0 64 34" width="220" height="102" fill="none" stroke="currentColor" stroke-width="0.55" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${axis}${refDashes}${radiusDashes}${centers}${segs}${arcs}${labels}${point}</svg>`;
}

/** 图库磁贴：Tile compact + 名称/锚点参数两行（组合既有原子件，不新增组件）。 */
function galleryTile(solver: ArcCaseSolver, onClick: () => void): HTMLElement {
  const anchor = ANCHORS[solver.id];
  const tile = Tile({
    compact: true,
    name: solver.name,
    graphic: arcCaseGraphic(solver.id),
    ariaLabel: `${solver.id} · ${solver.name} · ${anchor}`,
    onClick,
  });
  tile.dataset.case = solver.id;

  const name = tile.querySelector<HTMLElement>('.rc-tile__name');
  if (name) {
    const column = document.createElement('span');
    column.className = 'rc-p05__names';
    const anchorEl = document.createElement('span');
    anchorEl.className = 'rc-p05__anchor';
    anchorEl.textContent = anchor;
    name.replaceWith(column);
    column.append(name, anchorEl);
  }
  return tile;
}

const page: PageModule = {
  title,
  render(ctx: PageContext): void {
    injectStyle('rc-p05-styles', CSS);

    const body = createBody({ className: 'rc-p05__body' });

    const subrow = document.createElement('div');
    subrow.className = 'la-sub rc-p05__subrow';
    const hint = document.createElement('span');
    hint.textContent = '按加工情境选择工况，橙点即切点';
    const count = document.createElement('span');
    count.className = 'la-num rc-p05__count';
    count.textContent = '12 种 · 持续补充';
    subrow.append(hint, count);

    const grid = TileGrid(
      ARC_CASES.map((solver) =>
        galleryTile(solver, () => {
          void ctx.navigate('p06', { case: solver.id });
        }),
      ),
      '圆弧切点工况图库',
    );

    body.append(subrow, grid);

    ctx.root.append(
      createPage({
        id: 'p05',
        top: TopBar({
          title: '圆弧切点',
          onBack: () => {
            void ctx.navigate('p01');
          },
        }),
        body,
      }),
    );
  },
};

export default page;
