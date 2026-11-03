/**
 * p13 · 速查（W4-C5 实现）
 *
 * 设计稿区块（docs/车工计算App-无限画布.html 的 pRef，自上而下）：
 *   状态栏 → 顶栏「速查」→ 5 项分类分段（G 代码 / 螺纹 / 莫氏 / 钻头 / 硬度）
 *   → G 代码列表卡（10 行，点按复制）→ 底部说明 → Home 指示条
 *
 * 数据口径：src/data/gcode-ref.json（10 行）经 core/lookup.gcodeRef 排序后**原样展示**；
 * G76 行 desc 含「仅 FANUC；GSK/KND/华中待补」注记，禁止裁剪 / 改写。
 * 其余分类 v0.1 无数据（设计稿仅展示 G 代码），切换后显示诚实空态，不伪造内容。
 */
import type { GcodeRefRow } from '../../core/types';
import { gcodeRef } from '../../core/lookup';
import gcodeJson from '../../data/gcode-ref.json';
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
  { value: 'drill', label: '钻头', empty: '钻头分类暂无数据，内容持续补充' },
  { value: 'hardness', label: '硬度', empty: '硬度换算暂无数据，内容持续补充' },
];

const GCODE_ROWS = gcodeJson as unknown as GcodeRefRow[];

function isRefTab(value: string): value is RefTab {
  return TABS.some((tab) => tab.value === value);
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

    renderSeg();
    renderList();
    footWrap.append(SubText('点按复制代码 · 内容持续补充', { center: true }));

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
