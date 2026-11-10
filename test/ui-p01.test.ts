// @vitest-environment happy-dom
/**
 * W4-C1 · p01 首页结构与导航测试
 *
 * 设计稿 p01 区块清单（自指计数）：状态栏 / 顶栏 / 搜索栏 / 最近使用 / 功能入口网格（10 格）/ 离线声明 / Home 指示条。
 * 断言逐区块、逐文案、逐入口（名称与副标顺序）对齐设计稿 docs/车工计算App-无限画布.html:1135-1160。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { addHistory } from '../src/ui/store';
import { createRouter, type PageId, type Router } from '../src/ui/router';
import pkg from '../package.json';

let app: HTMLElement;
let router: Router;

/** V4.12-C：与构建期注入同源对拍（package.json version）。 */
const APP_VERSION: string = pkg.version;

const TILE_NAMES = [
  '螺纹',
  'G76 程序',
  '圆弧切点',
  '锥度 · 莫氏',
  '公差配合',
  '转速 · 线速度',
  '切削参数',
  '重量',
  '三角',
  '速查',
  '宏程序库',
  '挂轮计算',
];

const TILE_SUBS = [
  '底孔 · 三针 · 尺寸表',
  '参考程序 · 免费生成',
  '工况图库 · 刀补',
  '半角 · 查表',
  'GB/T 1800 偏差',
  '输入即算',
  '国产牌号 · 示例库',
  '圆钢 · 六方 · 管',
  '解三角形',
  'G 代码 · 钻头 · 硬度',
  '椭圆 · 网纹 · 油槽 · 切槽',
  '英制螺纹 · 误差 ppm',
];

const TILE_TARGETS: PageId[] = [
  'p02',
  'p04',
  'p05',
  'p07',
  'p08',
  'p09',
  'p10',
  'p11',
  'p12',
  'p13',
];

function currentPage(): HTMLElement {
  const page = app.querySelector<HTMLElement>('.la-page');
  if (!page) throw new Error('p01 未渲染');
  return page;
}

beforeEach(async () => {
  document.body.innerHTML = '<div id="app"></div>';
  window.location.hash = '';
  app = document.querySelector<HTMLElement>('#app') as HTMLElement;
  router = createRouter({ root: app });
  await router.start();
});

afterEach(() => {
  router.destroy();
  document.body.replaceChildren();
});

describe('p01 结构保真', () => {
  it('区块顺序与设计稿一致（7 个顶层块）', () => {
    const page = currentPage();
    expect(page.getAttribute('data-page')).toBe('p01');
    expect(page.classList.contains('la-page')).toBe(true);

    const blockClasses = [...page.children].map((el) => el.classList[0]);
    expect(blockClasses).toEqual([
      'la-status',
      'la-top',
      'rc-home__searchwrap',
      'rc-home__recent',
      'la-body',
      'rc-home__footer',
      'la-home',
    ]);
  });

  it('状态栏 / 顶栏（logo、车工算、副标、收藏）逐项存在', () => {
    const page = currentPage();
    expect(page.querySelector('.la-status .rc-status__time')?.textContent).toBe('9:41');

    const head = page.querySelector('.rc-home__head');
    expect(head).not.toBeNull();
    expect(head?.querySelector('.la-logo svg')).not.toBeNull();
    expect(head?.querySelector('.rc-home__title')?.textContent).toBe('车工算');
    expect(head?.querySelector('.rc-home__tagline')?.textContent).toBe(
      'LATHCALC · 离线车工计算器',
    );
    expect(head?.querySelector('.rc-home__star')?.getAttribute('aria-label')).toBe('收藏');
  });

  it('搜索栏文案与最近使用 3 个 chips', () => {
    const page = currentPage();
    expect(page.querySelector('.rc-home__search')?.textContent).toContain(
      '搜螺纹、锥度、切点、G 代码…',
    );
    expect(page.querySelector('.rc-home__recent-label')?.textContent).toBe('最近使用');

    const chips = [...page.querySelectorAll<HTMLElement>('.rc-home__chips .la-chip')];
    expect(chips.map((chip) => chip.textContent)).toEqual([
      'M30 螺纹',
      'Ø50 转速 955',
      '莫氏 4 号',
    ]);
    expect(chips[0]?.classList.contains('on')).toBe(true);
    expect(chips[1]?.classList.contains('on')).toBe(false);
  });

  it('功能入口网格 = 10 格，名称与副标逐项对齐设计稿', () => {
    const page = currentPage();
    const grid = page.querySelector('.la-grid2');
    expect(grid).not.toBeNull();
    expect(grid?.getAttribute('aria-label')).toBe('功能入口');

    const tiles = [...page.querySelectorAll<HTMLElement>('.la-grid2 .la-tile')];
    expect(tiles).toHaveLength(12);
    expect(tiles.map((tile) => tile.querySelector('.tname')?.textContent)).toEqual(TILE_NAMES);
    expect(tiles.map((tile) => tile.querySelector('.tsub')?.textContent)).toEqual(TILE_SUBS);
    for (const tile of tiles) expect(tile.querySelector('.ticon svg')).not.toBeNull();
  });

  it('离线声明与 Home 指示条存在，且 p01 无内联 style', () => {
    const page = currentPage();
    // V4.12-C：页脚版本 = 构建期 __APP_VERSION__ 注入（源 package.json），对拍同源。
    expect(page.querySelector('.rc-home__footer')?.textContent).toBe(
      `完全离线 · 无登录 · 无广告 · v${APP_VERSION}`,
    );
    expect(page.querySelector('.la-home')).not.toBeNull();
    expect(page.querySelectorAll('[style]')).toHaveLength(0);
  });

  it('样式契约：两列网格 + app 视口高度 + 纵向裁切（无横向滚动策略）', () => {
    const css = [...document.querySelectorAll('style')]
      .map((style) => style.textContent ?? '')
      .join('\n');
    expect(css).toContain('#app { height: 100vh; height: 100dvh; }');
    expect(css).toContain('.la-grid2 { display: grid; grid-template-columns: 1fr 1fr;');
    expect(css).toContain('.la-page { width: 100%; height: 100%;');
    expect(css).toContain('overflow: hidden');
  });
});

describe('p01 导航', () => {
  it('10 个入口分别导航到 p02/p04/p05/p07/p08/p09/p10/p11/p12/p13', async () => {
    for (let index = 0; index < TILE_TARGETS.length; index += 1) {
      await router.navigate('p01');
      const target = TILE_TARGETS[index] as PageId;
      const tile = currentPage().querySelectorAll<HTMLButtonElement>('.la-grid2 .la-tile')[index];
      tile?.click();
      await vi.waitFor(() => expect(router.current()).toBe(target));
      expect(window.location.hash).toBe(`#/${target}`);
      expect(currentPage().getAttribute('data-page')).toBe(target);
    }
  });

  it('收藏按钮导航到 p14', async () => {
    currentPage().querySelector<HTMLButtonElement>('.rc-home__star')?.click();
    await vi.waitFor(() => expect(router.current()).toBe('p14'));
  });

  it('最近使用 chip 携带参数进入 p03（p02→p03 传参约定示例）', async () => {
    currentPage().querySelectorAll<HTMLButtonElement>('.rc-home__chips .la-chip')[0]?.click();
    await vi.waitFor(() => expect(router.current()).toBe('p03'));

    const query = window.location.hash.slice(window.location.hash.indexOf('?') + 1);
    const params = new URLSearchParams(query);
    expect(params.get('family')).toBe('metric');
    expect(params.get('spec')).toBe('M30 × 3.5');
    expect(params.get('d')).toBe('30');
    expect(params.get('p')).toBe('3.5');
  });

  it('最近使用其余 chip 导航到 p09 / p07', async () => {
    currentPage().querySelectorAll<HTMLButtonElement>('.rc-home__chips .la-chip')[1]?.click();
    await vi.waitFor(() => expect(router.current()).toBe('p09'));
    const speedParams = new URLSearchParams(window.location.hash.split('?')[1] ?? '');
    expect(speedParams.get('d')).toBe('50');
    expect(speedParams.get('vc')).toBe('150');

    await router.navigate('p01');
    currentPage().querySelectorAll<HTMLButtonElement>('.rc-home__chips .la-chip')[2]?.click();
    await vi.waitFor(() => expect(router.current()).toBe('p07'));
    const taperParams = new URLSearchParams(window.location.hash.split('?')[1] ?? '');
    expect(taperParams.get('mode')).toBe('morse');
    expect(taperParams.get('morse')).toBe('4');
  });
});

describe('p01 最近使用动态化（W5 集成，DEFERRED #9 落实）', () => {
  it('历史前 3 条动态渲染、首条高亮、thread 携参入 p03；第 4 条不入', async () => {
    localStorage.clear();
    addHistory({ kind: 'thread', title: 'Tr40×7 梯形螺纹', params: { family: 'trapezoid', spec: 'Tr40×7', d: 40, p: 7 }, ts: 4000 });
    addHistory({ kind: 'speed', title: 'Ø50 转速 955', params: { d: 50, vc: 150 }, ts: 3000 });
    addHistory({ kind: 'weight', title: '圆钢 Ø50×100', params: { d: 50 }, ts: 2000 });
    addHistory({ kind: 'triangle', title: '30/40/50 解三角形', params: { a: 30 }, ts: 1000 });

    await router.navigate('p01');
    const chips = [...currentPage().querySelectorAll<HTMLElement>('.rc-home__chips .la-chip')];
    expect(chips.map((chip) => chip.textContent)).toEqual([
      'Tr40×7 梯形螺纹',
      'Ø50 转速 955',
      '圆钢 Ø50×100',
    ]);
    expect(chips[0]?.classList.contains('on')).toBe(true);
    expect(chips[1]?.classList.contains('on')).toBe(false);

    chips[0]?.click();
    await vi.waitFor(() => expect(router.current()).toBe('p03'));
    const query = new URLSearchParams(window.location.hash.split('?')[1] ?? '');
    expect(query.get('family')).toBe('trapezoid');
    expect(query.get('spec')).toBe('Tr40×7');
    localStorage.clear();
  });

  it('空历史回落 W4-C1 静态示例', async () => {
    localStorage.clear();
    await router.navigate('p01');
    const chips = [...currentPage().querySelectorAll<HTMLElement>('.rc-home__chips .la-chip')];
    expect(chips[0]?.textContent).toBe('M30 螺纹');
    expect(chips[2]?.textContent).toBe('莫氏 4 号');
  });
});
