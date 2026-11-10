/**
 * p01 · 首页（W4-C1 完整实现）
 *
 * 设计稿区块（自上而下）：
 *   状态栏 → 顶栏（logo / 车工算 / LATHCALC 副标 / 收藏）→ 搜索栏 → 最近使用 chips
 *   → 功能入口九宫格（实为 2×5 十格）→ 离线声明 → Home 指示条
 *
 * 导航映射（冻结）：
 *   螺纹→p02 / G76→p04 / 圆弧切点→p05 / 锥度·莫氏→p07 / 公差→p08
 *   转速→p09 / 切削参数→p10 / 重量→p11 / 三角→p12 / 速查→p13 / 宏程序→p15 / 挂轮→p16 / 收藏→p14
 */
import type { PageContext, PageId, PageModule, PageParams } from '../router';
import { listHistory } from '../store';
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

/* V4.13：滚动 opt-in（用户反馈「首页划不到底，看不见三角卡片」。滚动模型取证：
   #app 100dvh + .la-page/.la-body 默认 overflow:hidden（components/base.ts:13 /
   PageShell.ts:21-23），滚动须各页自行开启——p01 此前无任何 opt-in：390x844 内容已
   溢出裁切缘 +14px（12 卡恰贴边全见、页脚被裁），390x740 裁 +118px（三角卡
   bottom=710 出局）、680 裁 +178px，整页无滚动通道（CLIP-NOSCROLL）。同 p06 等
   12 页既有先例补 scoped 规则；内容装得下时 overflow-y:auto 零视觉变化。
   证据：docs/evidence/V4.13/runs/scroll-audit.json） */
.la-page[data-page="p01"] .la-body { overflow-y: auto; }
/* V4.13（续）：折边分隔——footer 在 body 外独立 flex 带（PageShell），实测 footer.top ==
   body 裁切缘（802==802，零间隙）：末排卡副标题下半在折边裁掉、页脚文字紧贴其下，
   vision 误读为「两层文字相交」（几何不可交，但零间隙确易误读）。补 6px 分隔：
   footer padding-top 6 → body flex:1 收缩 6px，折边与页脚文字带分离。 */
.la-page[data-page="p01"] .rc-home__footer { padding-top: 6px; }
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
  { icon: 'gcode', name: '宏程序库', sub: '椭圆 · 网纹 · 油槽 · 切槽', page: 'p15' },
  { icon: 'cutting', name: '挂轮计算', sub: '英制螺纹 · 误差 ppm', page: 'p16' },
];

interface RecentEntry {
  label: string;
  active?: boolean;
  page: PageId;
  params?: PageParams;
}

/**
 * 最近使用兜底（设计稿静态示例值）。
 * W5 集成裁决（DEFERRED #9 落实）：渲染时读 store 历史，取前 3 条动态生成 chips；
 * 历史为空时回落本静态示例。kind → 页映射：thread→p03 / speed→p09 / weight→p11 /
 * triangle→p12，其余 kind 一律 p14（历史列表本身可达）。
 */
const RECENT_FALLBACK: readonly RecentEntry[] = [
  {
    label: 'M30 螺纹',
    active: true,
    page: 'p03',
    params: { family: 'metric', spec: 'M30 × 3.5', d: 30, p: 3.5 },
  },
  { label: 'Ø50 转速 955', page: 'p09', params: { d: 50, vc: 150 } },
  { label: '莫氏 4 号', page: 'p07', params: { mode: 'morse', morse: 4 } },
];

/** 历史条目 kind → 目标页（未知 kind 落 p14 收藏·历史）。 */
const KIND_TO_PAGE: Record<string, PageId> = {
  thread: 'p03',
  speed: 'p09',
  weight: 'p11',
  triangle: 'p12',
};

/** 渲染期取最近使用：历史前 3 条 → chips；空历史 → 静态兜底。 */
function recentEntries(): RecentEntry[] {
  const history = listHistory().slice(0, 3);
  if (history.length === 0) return [...RECENT_FALLBACK];
  return history.map((entry, index) => ({
    label: entry.title,
    active: index === 0,
    page: KIND_TO_PAGE[entry.kind] ?? 'p14',
    params: entry.params as PageParams,
  }));
}

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
    for (const entry of recentEntries()) {
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
    // V4.12-C：版本号构建期注入（vite define __APP_VERSION__ ← package.json），
    // 消除 v0.1 硬编码陈旧——用户可据此判断 SW 缓存是否已更新。
    footer.textContent = `完全离线 · 无登录 · 无广告 · v${__APP_VERSION__}`;

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
