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
 */
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
  return `<svg viewBox="0 0 64 34" width="${width}" height="${height}" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${graphic.paths}<circle cx="${graphic.point[0]}" cy="${graphic.point[1]}" r="${pointRadius}" fill="var(--la-accent)" stroke="none"/></svg>`;
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
