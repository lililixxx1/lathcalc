// @vitest-environment happy-dom
/**
 * W4-C4 · p08 公差配合 页面测试
 *
 * 分段依据（lookup.ts 契约：左开右闭 (lo,hi]）：
 *   - Ø40 落 (30,50]：IT7=25 μm → T=0.025 mm（WAVE-PLAN §4 #4；GB/T 1800.1 表1）
 *   - Ø18 落 (10,18]：IT7=18 μm → T=0.018 mm（C-03 边界锚点：>10 至 18）
 *   - IT6 (30,50] = 16 μm → 0.016；IT8 = 39 μm → 0.039
 *   - Ø50 落 (30,50]（闭端点）；Ø50.001 落 (50,80]（下一页段）
 * 断言同时对照 core 的 itToleranceMM / toleranceCompose，页面显示值不得脱离 core。
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRouter, type Router } from '../src/ui/router';
import { itToleranceMM } from '../src/core/lookup';
import { toleranceCompose } from '../src/core/tolerance';
import type { ITTableRow } from '../src/core/types';
import toleranceJson from '../src/data/tolerance-it.json';

let app: HTMLElement;
let router: Router;

const IT_ROWS = toleranceJson as unknown as ITTableRow[];

function currentPage(): HTMLElement {
  const page = app.querySelector<HTMLElement>('.la-page');
  if (!page) throw new Error('p08 未渲染');
  return page;
}

function setNominal(value: string): void {
  const input = currentPage().querySelector<HTMLInputElement>('input[name="nominal"]');
  if (!input) throw new Error('基本尺寸输入框不存在');
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function clickSegItem(value: string): void {
  currentPage().querySelector<HTMLButtonElement>(`.rc-seg__item[data-value="${value}"]`)?.click();
}

function statValues(): string[] {
  return [...currentPage().querySelectorAll<HTMLElement>('.rc-stattriple__value')].map(
    (el) => el.textContent ?? '',
  );
}

function statLabels(): string[] {
  return [...currentPage().querySelectorAll<HTMLElement>('.rc-stattriple__label')].map(
    (el) => el.textContent ?? '',
  );
}

function fitChip(band: string): HTMLButtonElement {
  const chip = currentPage().querySelector<HTMLButtonElement>(
    `.rc-p08__preset[data-fit="${band}"]`,
  );
  if (!chip) throw new Error(`配合 chip ${band} 不存在`);
  return chip;
}

function clickFitChip(band: string): void {
  fitChip(band).click();
}

function fitValues(): string[] {
  return [...currentPage().querySelectorAll<HTMLElement>('.rc-p08__fit .rc-resultcard__value')].map(
    (el) => el.textContent ?? '',
  );
}

function fitLabels(): string[] {
  return [...currentPage().querySelectorAll<HTMLElement>('.rc-p08__fit .rc-resultcard__label')].map(
    (el) => el.textContent ?? '',
  );
}

function fitBadge(): string {
  return currentPage().querySelector<HTMLElement>('.rc-p08__fit .la-badge')?.textContent ?? '';
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

describe('p08 公差配合', () => {
  it('默认 Ø40 IT7 H：+0.025 / 0.000 / 0.025（段 (30,50] IT7=25 μm）', async () => {
    await router.navigate('p08');
    const page = currentPage();
    expect(page.dataset.page).toBe('p08');
    expect(page.querySelector('.rc-topbar__title')?.textContent).toContain('GB/T 1800');
    expect(page.querySelector<HTMLInputElement>('input[name="nominal"]')?.value).toBe('40');

    const grades = [...page.querySelectorAll<HTMLElement>('.rc-seg.small .rc-seg__item')];
    expect(grades.map((el) => el.textContent)).toEqual([
      'IT5',
      'IT6',
      'IT7',
      'IT8',
      'IT9',
      'IT10',
      'IT11',
      'IT12',
    ]);
    expect(grades[2]?.classList.contains('on')).toBe(true);

    // core 双路径：Ø40 落 (30,50]，IT7 表值 25 μm → 0.025 mm。
    expect(itToleranceMM(IT_ROWS, 40, 7)).toBe(0.025);
    const core = toleranceCompose({ nominal: 40, grade: 7, fundamental: 'H' }, 0.025, 0);
    expect(core.upper).toBe(0.025);
    expect(core.lower).toBe(0);

    expect(statValues()).toEqual(['+0.025', '0.000', '0.025']);
    expect(statLabels()).toEqual(['上偏差 ES', '下偏差 EI', '公差 T']);
    expect(page.querySelector('.rc-p08__presetlabel')?.textContent).toBe(
      '常用配合（Ø40 H7 …）',
    );
  });

  it('Ø18 IT7 → T=0.018（段 (10,18]，18 μm；边界含 18）', async () => {
    await router.navigate('p08');
    setNominal('18');
    // Ø18 恰好落在 (10,18] 的闭端点，不是 (18,30]。
    expect(itToleranceMM(IT_ROWS, 18, 7)).toBe(0.018);
    expect(statValues()).toEqual(['+0.018', '0.000', '0.018']);
    expect(currentPage().querySelector('.rc-p08__presetlabel')?.textContent).toBe(
      '常用配合（Ø18 H7 …）',
    );
  });

  it('分段边界：Ø50 → (30,50] 0.025；Ø50.001 → (50,80] 0.030', async () => {
    await router.navigate('p08');
    setNominal('50');
    expect(itToleranceMM(IT_ROWS, 50, 7)).toBe(0.025);
    expect(statValues()[2]).toBe('0.025');

    setNominal('50.001');
    // 50.001 > 50，落入下一段 (50,80]：IT7=30 μm → 0.030 mm。
    expect(itToleranceMM(IT_ROWS, 50.001, 7)).toBe(0.03);
    expect(statValues()[2]).toBe('0.030');
  });

  it('IT6 / IT8 切换：Ø40 → 0.016 / 0.039', async () => {
    await router.navigate('p08');
    clickSegItem('6');
    expect(itToleranceMM(IT_ROWS, 40, 6)).toBe(0.016);
    expect(statValues()).toEqual(['+0.016', '0.000', '0.016']);

    clickSegItem('8');
    expect(itToleranceMM(IT_ROWS, 40, 8)).toBe(0.039);
    expect(statValues()).toEqual(['+0.039', '0.000', '0.039']);
  });

  it('轴 h：es=0 / ei=−T，标签切换为 es / ei', async () => {
    await router.navigate('p08');
    clickSegItem('h');
    // h（基轴制）：es=0，ei=0−0.025=−0.025。
    expect(statValues()).toEqual(['0.000', '-0.025', '0.025']);
    expect(statLabels()).toEqual(['上偏差 es', '下偏差 ei', '公差 T']);
  });

  it('URL 传参 d=18&grade=7 生效', async () => {
    await router.navigate('p08', { d: 18, grade: 7 });
    expect(currentPage().querySelector<HTMLInputElement>('input[name="nominal"]')?.value).toBe(
      '18',
    );
    expect(statValues()).toEqual(['+0.018', '0.000', '0.018']);
  });

  it('超出表范围：输入区提示，不渲染三联卡、无 NaN', async () => {
    await router.navigate('p08');
    setNominal('600');
    const page = currentPage();
    expect(page.querySelector('.rc-p08__hint')).not.toBeNull();
    expect(page.querySelector('.rc-p08__hint')?.textContent).toContain('内置公差表范围');
    expect(page.querySelector('.rc-stattriple')).toBeNull();
    expect(page.textContent).not.toContain('NaN');
  });

  it('常用配合 chips 可点激活：默认 Ø40 点 H7/g6 → 间隙卡（孔 0/+25、轴 −9/−25、+9…+50）', async () => {
    await router.navigate('p08');
    const page = currentPage();
    // 三个 chip 均为可点 button，文案与设计稿静态标签一致。
    const chips = [...page.querySelectorAll<HTMLButtonElement>('.rc-p08__preset')];
    expect(chips.map((el) => el.textContent)).toEqual([
      'H7/g6 间隙',
      'H7/k6 过渡',
      'H7/p6 过盈',
    ]);
    expect(chips.every((el) => el.tagName === 'BUTTON' && !el.disabled)).toBe(true);

    clickFitChip('g6');
    // Ø40 落 (30,50]：IT7=25、IT6=16；g=−9 → ei=−9−16=−25。
    // Xmin=0−(−9)=+9；Xmax=25−(−25)=+50。
    expect(fitLabels()).toEqual([
      '孔 H7 上偏差 ES',
      '孔 H7 下偏差 EI',
      '轴 g6 上偏差 es',
      '轴 g6 下偏差 ei',
      '配合 Xmin–Xmax',
    ]);
    expect(fitValues()).toEqual(['+25', '0', '−9', '−25', '+9 … +50']);
    expect(fitBadge()).toBe('间隙');
    expect(fitChip('g6').classList.contains('on')).toBe(true);
    expect(fitChip('g6').getAttribute('aria-pressed')).toBe('true');
    expect(fitChip('k6').classList.contains('on')).toBe(false);
  });

  it('H7/g6·k6·p6 Ø30 金值（逐项）：+7/+41、−15/+19、−35/−1，类别徽标与静态标签一致', async () => {
    await router.navigate('p08', { d: 30 });
    clickFitChip('g6');
    expect(fitValues()).toEqual(['+21', '0', '−7', '−20', '+7 … +41']);
    expect(fitBadge()).toBe('间隙');

    clickFitChip('k6');
    // k：ei=+2、es=+2+13=+15；Xmin=0−15=−15；Xmax=21−2=+19。
    expect(fitValues()).toEqual(['+21', '0', '+15', '+2', '−15 … +19']);
    expect(fitBadge()).toBe('过渡');
    expect(fitChip('k6').classList.contains('on')).toBe(true);
    expect(fitChip('g6').classList.contains('on')).toBe(false);

    clickFitChip('p6');
    // p：ei=+22、es=+22+13=+35；Xmin=0−35=−35；Xmax=21−22=−1。
    expect(fitValues()).toEqual(['+21', '0', '+35', '+22', '−35 … −1']);
    expect(fitBadge()).toBe('过盈');
    expect(fitChip('p6').classList.contains('on')).toBe(true);
    expect(fitChip('k6').classList.contains('on')).toBe(false);
  });

  it('配合卡随基本尺寸重算：Ø30 g6 → Ø100 g6（−12/−34、+12…+69）', async () => {
    await router.navigate('p08', { d: 30 });
    clickFitChip('g6');
    setNominal('100');
    // Ø100 落 (80,120]：IT7=35、IT6=22；g=−12 → ei=−12−22=−34。
    // Xmin=0−(−12)=+12；Xmax=35−(−34)=+69。
    expect(fitValues()).toEqual(['+35', '0', '−12', '−34', '+12 … +69']);
    expect(fitBadge()).toBe('间隙');
  });

  it('「怎么算的」补配合两行算式：Xmin=EI−es、Xmax=ES−ei 代入实值（Ø30 g6）', async () => {
    await router.navigate('p08', { d: 30 });
    clickFitChip('g6');
    currentPage().querySelector<HTMLButtonElement>('.rc-acc__head')?.click();
    const body = currentPage().querySelector<HTMLElement>('.rc-acc__body');
    if (!body) throw new Error('怎么算的 内容不存在');
    expect(body.hidden).toBe(false);
    expect(body.textContent).toContain(
      '配合 H7/g6：Xmin = EI − es = 0 − (−7) = +7 μm',
    );
    expect(body.textContent).toContain(
      '配合 H7/g6：Xmax = ES − ei = +21 − (−20) = +41 μm',
    );
  });

  it('配合卡在超范围输入时清除且 chips 置灰；恢复有效尺寸后可按以重算', async () => {
    await router.navigate('p08', { d: 30 });
    clickFitChip('g6');
    expect(fitValues()).toHaveLength(5);

    setNominal('600');
    expect(currentPage().querySelector('.rc-p08__fit .rc-resultcard')).toBeNull();
    expect(fitChip('g6').disabled).toBe(true);

    setNominal('30');
    expect(fitValues()).toEqual(['+21', '0', '−7', '−20', '+7 … +41']);
    expect(fitChip('g6').disabled).toBe(false);
  });
});
