/**
 * p13 · 速查（W4-C5 实现；W8-D 填充钻头 / 硬度页签）
 *
 * 设计稿区块（docs/车工计算App-无限画布.html 的 pRef，自上而下）：
 *   状态栏 → 顶栏「速查」→ 5 项分类分段（G 代码 / 螺纹 / 莫氏 / 钻头 / 硬度）
 *   → G 代码列表卡（10 行，点按复制）→ 底部说明 → Home 指示条
 *
 * 数据口径：
 *   - src/data/gcode-ref.json（10 行）经 core/lookup.gcodeRef 排序后**原样展示**；
 *     G76 行 desc 含「仅 FANUC；GSK/KND/华中待补」注记，禁止裁剪 / 改写。
 *   - src/data/drill-tap.json（W8-D）：M1.6–M48 常用粗牙攻丝底孔钻头，
 *     双源核对见 src/data/PROVENANCE.md；行内显示「规格 + 钻头直径 mm」。
 *   - src/data/hardness-conv.json（W8-D）：GB/T 1172-1999 精简换算（HRC 20–65 步进 5），
 *     单源披露；硬度页签底部固定近似对照脚注（V3-6）。
 *   - 螺纹 / 莫氏页签仍为引导空态（W4-C5 冻结，本卡不动）。
 */
import type { GcodeRefRow } from '../../core/types';
import { gcodeRef } from '../../core/lookup';
import gcodeJson from '../../data/gcode-ref.json';
import drillJson from '../../data/drill-tap.json';
import hardnessJson from '../../data/hardness-conv.json';
import type { PageContext, PageModule } from '../router';
import {
  Card,
  RowList,
  Segmented,
  SubText,
  TopBar,
  createBody,
  createPage,
  injectStyle,
  ListRow,
} from '../components';

const CSS = `
.rc-p13__list { flex: 1 1 auto; min-height: 0; overflow-y: auto; }
.rc-p13__empty { display: flex; flex-direction: column; gap: 6px; }
.rc-p13__foot { text-align: center; }
`;

type RefTab = 'gcode' | 'thread' | 'morse' | 'drill' | 'hardness';

const TABS: ReadonlyArray<{ value: RefTab; label: string; empty: string }> = [
  { value: 'gcode', label: 'G 代码', empty: '' },
  { value: 'thread', label: '螺纹', empty: '螺纹数据请使用「螺纹 · 选型」页查询' },
  { value: 'morse', label: '莫氏', empty: '莫氏锥度请使用「锥度 · 莫氏」页查询' },
  { value: 'drill', label: '钻头', empty: '' },
  { value: 'hardness', label: '硬度', empty: '' },
];

const GCODE_ROWS = gcodeJson as unknown as GcodeRefRow[];

interface DrillTapRow {
  designation: string;
  major: number;
  pitch: number;
  drill: number;
  source: string;
}

interface HardnessConvRow {
  hrc: number;
  hb: number | null;
  hbScale: 'HBS' | 'HBW' | null;
  hv: number;
  source: string;
}

const DRILL_ROWS = drillJson as unknown as DrillTapRow[];
const HARDNESS_ROWS = hardnessJson as unknown as HardnessConvRow[];

const FOOT_DEFAULT = '点按复制代码 · 内容持续补充';
const FOOT_HARDNESS = '换算值为近似对照，以标准原表为准';

function isRefTab(value: string): value is RefTab {
  return TABS.some((tab) => tab.value === value);
}

/** 钻头直径排版：最多两位小数，整数值保留一位（5 → 5.0；1.25 → 1.25） */
function formatDrill(value: number): string {
  return value.toFixed(2).replace(/0$/, '');
}

/** HB 列：GB/T 1172 低段用 HBS、高段用 HBW；无值时显示破折号（HRC 65 仅 HV） */
function hardnessHB(row: HardnessConvRow): string {
  return row.hb == null ? '—' : String(row.hb);
}

function copyText(text: string): void {
  try {
    void navigator.clipboard?.writeText(text).catch(() => {
      /* 剪贴板不可用时静默失败（与 ResultCard 缺省行为一致） */
    });
  } catch {
    /* 某些环境访问 clipboard 抛同步错误：不影响页面 */
  }
}

export const title = '速查';

const page: PageModule = {
  title,
  render(ctx: PageContext): void {
    injectStyle('rc-p13-styles', CSS);

    const state: { tab: RefTab } = { tab: 'gcode' };
    const segWrap = document.createElement('div');
    const listWrap = document.createElement('div');
    listWrap.className = 'rc-p13__list';
    const footWrap = document.createElement('div');
    footWrap.className = 'rc-p13__foot';

    function renderSeg(): void {
      segWrap.replaceChildren(
        Segmented({
          options: TABS.map((tab) => ({ value: tab.value, label: tab.label })),
          value: state.tab,
          small: true,
          ariaLabel: '速查分类',
          onChange: (value) => {
            if (!isRefTab(value) || value === state.tab) return;
            state.tab = value;
            renderSeg();
            renderList();
            renderFoot();
          },
        }),
      );
    }

    function renderList(): void {
      if (state.tab === 'gcode') {
        const rows = gcodeRef(GCODE_ROWS).map((row) =>
          ListRow({
            name: row.code,
            description: row.desc,
            mono: true,
            trailing: 'copy',
            ariaLabel: `${row.code} ${row.desc}`,
            onClick: () => copyText(row.code),
          }),
        );
        const card = Card({ tight: true, className: 'rc-p13__listcard', children: [RowList(rows, 'G 代码速查')] });
        listWrap.replaceChildren(card);
        return;
      }

      if (state.tab === 'drill') {
        const rows = DRILL_ROWS.map((row) => {
          const drill = formatDrill(row.drill);
          return ListRow({
            name: row.designation,
            value: drill,
            trailing: 'copy',
            ariaLabel: `${row.designation} 攻丝底孔钻头 ${drill} mm`,
            onClick: () => copyText(drill),
          });
        });
        const card = Card({ tight: true, className: 'rc-p13__listcard', children: [RowList(rows, '攻丝底孔钻头表')] });
        listWrap.replaceChildren(card);
        return;
      }

      if (state.tab === 'hardness') {
        const rows = HARDNESS_ROWS.map((row) => {
          const value = `HB ${hardnessHB(row)} · HV ${row.hv}`;
          return ListRow({
            name: `HRC ${row.hrc}`,
            value,
            trailing: 'copy',
            ariaLabel: `HRC ${row.hrc} 换算 ${value}`,
            onClick: () => copyText(`HRC ${row.hrc} · ${value}`),
          });
        });
        const card = Card({ tight: true, className: 'rc-p13__listcard', children: [RowList(rows, '硬度换算表')] });
        listWrap.replaceChildren(card);
        return;
      }

      const tab = TABS.find((item) => item.value === state.tab);
      const card = Card({
        className: 'rc-p13__empty',
        children: [
          SubText(tab?.empty ?? '该分类暂无数据', { center: true }),
          SubText('内容持续补充', { center: true }),
        ],
      });
      listWrap.replaceChildren(card);
    }

    function renderFoot(): void {
      footWrap.replaceChildren(
        SubText(state.tab === 'hardness' ? FOOT_HARDNESS : FOOT_DEFAULT, { center: true }),
      );
    }

    renderSeg();
    renderList();
    renderFoot();

    const body = createBody({ className: 'rc-p13__body' });
    body.append(segWrap, listWrap, footWrap);

    ctx.root.append(
      createPage({
        id: 'p13',
        top: TopBar({ title }),
        body,
      }),
    );
  },
};

export default page;
