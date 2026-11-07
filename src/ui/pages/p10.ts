/**
 * p10 · 切削参数（W4-C4 实现）
 *
 * 设计稿区块（docs/车工计算App-无限画布.html pCutting）：
 *   状态栏 → 顶栏（灰底「示例数据」徽标）→ 材料眉标 + 筛选 chips
 *   → 硬质合金刀 / 高速钢刀分段 → 切削三要素示意图（V4.9 C 卡新增）
 *   → 结果卡（Vc / f / 带入 Ø50 转速）
 *   → 材料列表（14 行示例库，行内 source 如实展示）→ 固定警示条 → Home
 *
 * 切削三要素示意图（WAVE-PLAN-V4.9 §3 C 卡，Lead 补位）：
 *   - 页内静态 SVG 常量模板（零 core 模块，三要素为概念示意不随输入变化，
 *     一次渲染常驻不重绘）；viewBox 220×120；
 *   - 工件端面圆 + 车刀（刀头 + 刀杆两矩形，贴近圆缘不切入）；
 *   - 三标注：Vc 圆顶切向箭头（工件旋转线速度方向）、ap 径向双箭头
 *     （沿半径从圆缘向内）、f 轴向箭头（沿刀杆方向，刀具纵向进给）；
 *   - 图例行给三要素中文名对照（ap 为切削三要素口径，本页结果卡无 ap 行）；
 *   - 全部 token 用既有 CSS 变量，零新变量零内联色值（V4.1 §4）。
 *
 * 数据口径（WAVE-PLAN §3 裁决 3）：
 *   - src/data/materials.json 为示例参数库，非标准值；
 *   - 页内固定警示「示例数据 · 以试切为准」；
 *   - 每行 source 原文展示，UI 剥除「（WAVE-PLAN …）」内部括注（U2 裁决 B，
 *     数据档原文不动，完整出处见 src/data/PROVENANCE.md）。
 *   数值换算（Vc 区间 → 转速区间）走 src/core/speed.ts `spindleSpeed`，
 *   带入直径取设计稿示例 Ø50（仅展示用，不参与参数库数据）。
 *
 * 页面参数（README §5.3 登记）：暂无跨页参数。
 */
import type { PageContext, PageModule } from '../router';
import type { MaterialRow, Range } from '../../core/types';
import { findMaterial } from '../../core/lookup';
import { spindleSpeed } from '../../core/speed';
import {
  Card,
  Chip,
  Eyebrow,
  ListRow,
  ResultCard,
  RowList,
  Segmented,
  SubText,
  TopBar,
  WarnCard,
  createBody,
  createPage,
  injectStyle,
} from '../components';
import materialsJson from '../../data/materials.json';

const MATERIALS = materialsJson as unknown as MaterialRow[];

const CSS = `
.rc-p10__chips { display: flex; flex-wrap: wrap; gap: 7px; }
.rc-p10__listcard { flex: 1 1 auto; min-height: 0; display: flex; padding: 3px 14px; }
.rc-p10__list { flex: 1 1 auto; min-height: 0; overflow-y: auto; overflow-x: hidden; }
.rc-p10__list .la-lrow { align-items: flex-start; padding: 9px 2px; }
/* A4 修复：本页后注入的 padding 覆盖了 .la-lrow.sel 的 padding-left:10px（同特异性
   后者胜），负 margin −10px 使行框越出 overflow-x:hidden 列表容器被裁（"45 钢"→"5 钢"）。
   选中态就地收平：不加负 margin，改缩进 10px 呈现强调条。 */
.rc-p10__list .la-lrow.sel { margin-left: 0; padding-left: 10px; }
.rc-p10__list .rc-lrow__name { flex: 0 0 66px; font-weight: 600; }
.rc-p10__list .rc-lrow__desc { min-width: 0; overflow-wrap: anywhere; font-size: 11.5px; line-height: 1.45; }
.rc-p10__list .rc-lrow__value { padding-top: 1px; }
.rc-p10__warn { flex: 0 0 auto; }
.rc-p10__figurecard { display: flex; flex-direction: column; gap: 6px; padding: 10px 14px; }
.rc-p10__figure { display: grid; place-items: center; }
.rc-p10__figure svg { width: 100%; height: 100px; display: block; color: var(--la-ink-body); }
`;

/** 设计稿结果行示例「带入 Ø50 → 转速 n」的展示直径（mm）。 */
const DEMO_DIAMETER = 50;

/**
 * 切削三要素静态示意图（V4.9 C 卡；受信内部常量模板，无插值）。
 * 布局：工件端面圆 cx=84/cy=62/r=38；车刀 = 刀头矩形 + 刀杆矩形（贴近圆缘
 * 不切入）；Vc 圆顶切向箭头 / ap 径向双箭头（沿半径）/ f 轴向箭头（沿刀杆）。
 * 箭头 = 标注线 + 手绘三角（全仓无 marker 先例，三角 100% 可控零兼容性）。
 */
function cuttingFigureCard(): HTMLElement {
  const figure = document.createElement('div');
  figure.className = 'rc-p10__figure';
  figure.innerHTML = `
    <svg viewBox="0 0 220 120" width="100%" height="100" fill="none"
      stroke="currentColor" stroke-width="1.6" aria-hidden="true">
      <path d="M46 62H88M78 26V98" stroke="var(--la-faint)" stroke-width="1.1"
        stroke-dasharray="5 2.5 1.2 2.5"/>
      <circle cx="84" cy="62" r="38"/>
      <rect x="118" y="50" width="16" height="28" stroke-width="1.4"/>
      <rect x="134" y="58" width="74" height="16" stroke-width="1.4"/>
      <path d="M56 19H98" stroke="var(--la-sub)" stroke-width="1.2"/>
      <path d="M104 19L98 16L98 22Z" fill="var(--la-sub)" stroke="none"/>
      <text x="78" y="13" font-size="9.5" fill="var(--la-sub)" stroke="none"
        text-anchor="middle">Vc</text>
      <path d="M98 62H110" stroke="var(--la-sub)" stroke-width="1.2"/>
      <path d="M92 62L98 59L98 65Z" fill="var(--la-sub)" stroke="none"/>
      <path d="M116 62L110 59L110 65Z" fill="var(--la-sub)" stroke="none"/>
      <text x="104" y="55" font-size="9.5" fill="var(--la-sub)" stroke="none"
        text-anchor="middle">ap</text>
      <path d="M128 84H160" stroke="var(--la-sub)" stroke-width="1.2"/>
      <path d="M122 84L128 81L128 87Z" fill="var(--la-sub)" stroke="none"/>
      <text x="144" y="97" font-size="9.5" fill="var(--la-sub)" stroke="none"
        text-anchor="middle">f</text>
    </svg>
  `;
  return Card({
    className: 'rc-p10__figurecard',
    ariaLabel: '切削三要素示意图（Vc 切削速度、f 进给量、ap 背吃刀量）',
    children: [
      figure,
      SubText('Vc 切削速度（m/min）· f 进给量（mm/r）· ap 背吃刀量（mm）', {
        className: 'rc-p10__legend',
      }),
    ],
  });
}

type Tool = 'carbide' | 'hss';

function formatRangeValue(value: number): string {
  const rounded = Number(value.toFixed(3));
  return String(rounded === 0 ? 0 : rounded);
}

function rangeText(range: Range): string {
  return `${formatRangeValue(range[0])} – ${formatRangeValue(range[1])}`;
}

function vcRangeOf(row: MaterialRow, tool: Tool): Range {
  return tool === 'carbide' ? row.carbideVc : row.hssVc;
}

function feedRangeOf(row: MaterialRow, tool: Tool): Range {
  return tool === 'carbide' ? row.carbideFeed : row.hssFeed;
}

/** Vc 区间 → Ø50 下的转速区间（spindleSpeed 两端点，取整 r/min）。 */
function rpmRangeText(range: Range): string {
  const low = spindleSpeed({ diameter: DEMO_DIAMETER, vc: range[0] }).rpm;
  const high = spindleSpeed({ diameter: DEMO_DIAMETER, vc: range[1] }).rpm;
  return `${low.toFixed(0)} – ${high.toFixed(0)}`;
}

export const title = '切削参数';

const page: PageModule = {
  title,
  render(ctx: PageContext): void {
    injectStyle('rc-p10-styles', CSS);

    const groups = Array.from(new Set(MATERIALS.map((row) => row.group)));
    let tool: Tool = 'carbide';
    let group = 'all';
    let selectedKey = MATERIALS[0]?.key ?? '';

    const body = createBody({ className: 'rc-p10__body' });
    const chipWrap = document.createElement('div');
    chipWrap.className = 'rc-p10__chips';
    const resultWrap = document.createElement('div');
    resultWrap.className = 'rc-p10__result';
    const listCard = Card({ tight: true, className: 'rc-p10__listcard' });
    const listWrap = document.createElement('div');
    listWrap.className = 'rc-p10__list';

    function filteredRows(): MaterialRow[] {
      return MATERIALS.filter((row) => group === 'all' || row.group === group);
    }

    function selectedRow(): MaterialRow | undefined {
      try {
        return findMaterial(MATERIALS, selectedKey);
      } catch {
        return MATERIALS[0];
      }
    }

    function paintChips(): void {
      chipWrap.replaceChildren(
        Chip({
          label: '全部',
          active: group === 'all',
          onClick: () => {
            group = 'all';
            clampSelection();
            paintChips();
            paintList();
            paintResult();
          },
        }),
        ...groups.map((name) =>
          Chip({
            label: name,
            active: group === name,
            onClick: () => {
              group = name;
              clampSelection();
              paintChips();
              paintList();
              paintResult();
            },
          }),
        ),
      );
    }

    function clampSelection(): void {
      const rows = filteredRows();
      if (rows.length === 0) return;
      if (!rows.some((row) => row.key === selectedKey)) {
        selectedKey = rows[0]?.key ?? selectedKey;
      }
    }

    function paintList(): void {
      const rows = filteredRows();
      listWrap.replaceChildren(
        RowList(
          rows.map((row) =>
            ListRow({
              name: row.name,
              value: rangeText(vcRangeOf(row, tool)),
              // W4-C4 U2 裁决 B：数据 source 原文含内部计划括注（（WAVE-PLAN …）），
              // 数据档不动（W3 冻结资产，出处见 PROVENANCE）；UI 显示层剥除内部括注。
              description: `${row.group} · ${row.source.replace(/（WAVE-PLAN[^）]*）/, '')}`,
              selected: row.key === selectedKey,
              trailing: 'none',
              ariaLabel: `${row.name}：Vc ${rangeText(vcRangeOf(row, tool))} m/min，示例·待复核`,
              onClick: () => {
                selectedKey = row.key;
                paintList();
                paintResult();
              },
            }),
          ),
          '材料示例列表',
        ),
      );
    }

    function paintResult(): void {
      const row = selectedRow();
      if (!row) {
        resultWrap.replaceChildren();
        return;
      }
      const vc = vcRangeOf(row, tool);
      const feed = feedRangeOf(row, tool);
      resultWrap.replaceChildren(
        ResultCard({
          ariaLabel: `${row.name} 切削参数（示例）`,
          items: [
            { label: '线速度 Vc', value: rangeText(vc), unit: 'm/min', big: true },
            { label: '进给量 f', value: rangeText(feed), unit: 'mm/r' },
            { label: `带入 Ø${DEMO_DIAMETER} → 转速 n`, value: rpmRangeText(vc), unit: 'r/min' },
          ],
        }),
      );
    }

    const toolSeg = Segmented({
      options: [
        { value: 'carbide', label: '硬质合金刀' },
        { value: 'hss', label: '高速钢刀' },
      ],
      value: tool,
      ariaLabel: '刀具材质',
      onChange: (value) => {
        tool = value === 'hss' ? 'hss' : 'carbide';
        paintList();
        paintResult();
      },
    });

    listCard.append(listWrap);

    paintChips();
    paintList();
    paintResult();

    body.append(
      Eyebrow('工件材料（国产牌号库）'),
      chipWrap,
      toolSeg,
      cuttingFigureCard(),
      resultWrap,
      listCard,
      WarnCard({
        text: '示例数据 · 以试切为准：本页参数为示例库，非标准值；推荐区间仅供粗选，实际请以刀具商样本与试切结果为准。',
        ariaLabel: '示例数据警示',
      }),
    );

    ctx.root.append(
      createPage({
        id: 'p10',
        top: TopBar({ title, badge: '示例数据', badgeGray: true }),
        body,
      }),
    );
  },
};

export default page;
