/**
 * p10 · 切削参数（W4-C4 实现）
 *
 * 设计稿区块（docs/车工计算App-无限画布.html pCutting）：
 *   状态栏 → 顶栏（灰底「示例数据」徽标）→ 材料眉标 + 筛选 chips
 *   → 硬质合金刀 / 高速钢刀分段 → 结果卡（Vc / f / 带入 Ø50 转速）
 *   → 材料列表（14 行示例库，行内 source 如实展示）→ 固定警示条 → Home
 *
 * 数据口径（WAVE-PLAN §3 裁决 3）：
 *   - src/data/materials.json 为示例参数库，非标准值；
 *   - 页内固定警示「示例数据 · 以试切为准」；
 *   - 每行 source 原文展示（含「示例·待复核，以试切为准」）。
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
.rc-p10__list .rc-lrow__name { flex: 0 0 66px; font-weight: 600; }
.rc-p10__list .rc-lrow__desc { min-width: 0; overflow-wrap: anywhere; font-size: 11.5px; line-height: 1.45; }
.rc-p10__list .rc-lrow__value { padding-top: 1px; }
.rc-p10__warn { flex: 0 0 auto; }
`;

/** 设计稿结果行示例「带入 Ø50 → 转速 n」的展示直径（mm）。 */
const DEMO_DIAMETER = 50;

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
              description: `${row.group} · ${row.source}`,
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
