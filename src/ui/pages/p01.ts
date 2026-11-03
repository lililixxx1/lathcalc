/**
 * p01 · 首页（W4-C1 完整实现）
 *
 * 设计稿区块（自上而下）：
 *   状态栏 → 顶栏（logo / 车工算 / LATHCALC 副标 / 收藏）→ 搜索栏 → 最近使用 chips
 *   → 功能入口九宫格（实为 2×5 十格）→ 离线声明 → Home 指示条
 *
 * 导航映射（冻结）：
 *   螺纹→p02 / G76→p04 / 圆弧切点→p05 / 锥度·莫氏→p07 / 公差→p08
 *   转速→p09 / 切削参数→p10 / 重量→p11 / 三角→p12 / 速查→p13 / 收藏→p14
 */
import type { PageContext, PageId, PageModule, PageParams } from '../router';
import {
  Chip,
  HomeHeader,
  Tile,
  TileGrid,
  createBody,
  createPage,
  icon,
  injectStyle,
  type IconName,
} from '../components';

const HOME_CSS = `
.rc-home__searchwrap { padding: 2px 16px 0; }
.la-search { display: flex; align-items: center; gap: 8px; height: 46px; border-radius: 12px; background: var(--la-well); padding: 0 13px; color: var(--la-faint); font-size: 13.5px; }
.rc-home__search { cursor: default; }
.rc-home__recent { padding: 12px 16px 0; display: flex; align-items: center; gap: 9px; }
.rc-home__recent-label { flex: 0 0 auto; }
.rc-home__chips { display: flex; gap: 7px; overflow: hidden; min-width: 0; }
.rc-home__body { padding-top: 12px; }
.rc-home__footer { text-align: center; font-size: 10.5px; color: var(--la-faint); padding: 0 0 6px; }
`;

interface HomeEntry {
  icon: IconName;
  name: string;
  sub: string;
  page: PageId;
  params?: PageParams;
}

/** 首页工具入口（设计稿顺序，勿排序：测试逐项断言）。 */
const HOME_ENTRIES: readonly HomeEntry[] = [
  { icon: 'thread', name: '螺纹', sub: '底孔 · 三针 · 尺寸表', page: 'p02' },
  { icon: 'gcode', name: 'G76 程序', sub: '参考程序 · 免费生成', page: 'p04' },
  { icon: 'arc', name: '圆弧切点', sub: '工况图库 · 刀补', page: 'p05' },
  { icon: 'taper', name: '锥度 · 莫氏', sub: '半角 · 查表', page: 'p07' },
  { icon: 'tol', name: '公差配合', sub: 'GB/T 1800 偏差', page: 'p08' },
  { icon: 'speed', name: '转速 · 线速度', sub: '输入即算', page: 'p09' },
  { icon: 'cutting', name: '切削参数', sub: '国产牌号 · 示例库', page: 'p10' },
  { icon: 'weight', name: '重量', sub: '圆钢 · 六方 · 管', page: 'p11' },
  { icon: 'tri', name: '三角', sub: '解三角形', page: 'p12' },
  { icon: 'book', name: '速查', sub: 'G 代码 · 钻头 · 硬度', page: 'p13' },
];

interface RecentEntry {
  label: string;
  active?: boolean;
  page: PageId;
  params?: PageParams;
}

/**
 * 最近使用（设计稿静态示例值）。
 * v0.1 不做首页动态历史：store.ts 属 W4-C5 写范围，且 C5 不可回写 p01；
 * 若后续要动态化，需 Lead 单独裁决。
 */
const RECENT_ENTRIES: readonly RecentEntry[] = [
  {
    label: 'M30 螺纹',
    active: true,
    page: 'p03',
    params: { family: 'metric', spec: 'M30 × 3.5', d: 30, p: 3.5 },
  },
  { label: 'Ø50 转速 955', page: 'p09', params: { d: 50, vc: 150 } },
  { label: '莫氏 4 号', page: 'p07', params: { mode: 'morse', morse: 4 } },
];

export const title = '首页';

const page: PageModule = {
  title,
  render(ctx: PageContext): void {
    injectStyle('rc-p01-styles', HOME_CSS);

    const header = HomeHeader({
      title: '车工算',
      eyebrow: 'LATHCALC · 离线车工计算器',
      onStar: () => {
        void ctx.navigate('p14');
      },
    });

    const searchWrap = document.createElement('div');
    searchWrap.className = 'rc-home__searchwrap';
    searchWrap.innerHTML = `<div class="la-search rc-home__search">${icon('search', 16)}<span>搜螺纹、锥度、切点、G 代码…</span></div>`;

    const recent = document.createElement('div');
    recent.className = 'rc-home__recent';
    const recentLabel = document.createElement('span');
    recentLabel.className = 'la-eyebrow rc-home__recent-label';
    recentLabel.textContent = '最近使用';
    const chips = document.createElement('div');
    chips.className = 'rc-home__chips';
    for (const entry of RECENT_ENTRIES) {
      chips.append(
        Chip({
          label: entry.label,
          ...(entry.active === undefined ? {} : { active: entry.active }),
          onClick: () => {
            void ctx.navigate(entry.page, entry.params);
          },
        }),
      );
    }
    recent.append(recentLabel, chips);

    const body = createBody({ className: 'rc-home__body' });
    body.append(
      TileGrid(
        HOME_ENTRIES.map((entry) =>
          Tile({
            icon: entry.icon,
            name: entry.name,
            sub: entry.sub,
            onClick: () => {
              void ctx.navigate(entry.page, entry.params);
            },
          }),
        ),
        '功能入口',
      ),
    );

    const footer = document.createElement('div');
    footer.className = 'rc-home__footer';
    footer.textContent = '完全离线 · 无登录 · 无广告 · v0.1';

    ctx.root.append(
      createPage({
        id: 'p01',
        top: header,
        beforeBody: [searchWrap, recent],
        body,
        footer,
      }),
    );
  },
};

export default page;
