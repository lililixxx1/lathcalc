// @vitest-environment happy-dom
/**
 * W4-C4 · p07 锥度 · 莫氏 页面测试
 *
 * 断言口径：
 *   - 默认值取设计稿 pTaper（D=32 / d=27 / L=50），但结果必须与 core/taper.ts 实时计算一致，
 *     不是复制设计稿 mock（WAVE-PLAN §0 A4 忽略区）。
 *   - 黄金值：C=(32−27)/50=0.1 → 1:10；α/2=atan(0.05)=2.8624052261°→2°51′45″
 *     （WAVE-PLAN §4 #3；test/taper.test.ts 同锚点）。
 *   - 三值推 C：D=30,d=28,L=50 → C=2/50=0.04（派工单金测）。
 *   - 二值输入必须出现不可解提示，且页面无 NaN。
 *   - 莫氏 MT4：src/data/morse.json 行值 1:19.254 + 1°29′15″（GB/T 1443-2016）。
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRouter, type Router } from '../src/ui/router';
import { taperCalc } from '../src/core/taper';
import { findMorse } from '../src/core/lookup';
import type { MorseRow } from '../src/core/types';
import morseJson from '../src/data/morse.json';

let app: HTMLElement;
let router: Router;

const MORSE_ROWS = morseJson as unknown as MorseRow[];

function currentPage(): HTMLElement {
  const page = app.querySelector<HTMLElement>('.la-page');
  if (!page) throw new Error('p07 未渲染');
  return page;
}

function setInput(name: string, value: string): void {
  const input = currentPage().querySelector<HTMLInputElement>(`input[name="${name}"]`);
  if (!input) throw new Error(`输入框 ${name} 不存在`);
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function resultValues(): string[] {
  return [...currentPage().querySelectorAll<HTMLElement>('.rc-resultcard__value')].map(
    (el) => el.textContent ?? '',
  );
}

function clickSegItem(value: string): void {
  currentPage().querySelector<HTMLButtonElement>(`.rc-seg__item[data-value="${value}"]`)?.click();
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

describe('p07 锥度 · 莫氏：计算视图', () => {
  it('默认区块：分段 / 示意图 / D·d·L 三行输入 / 结果卡', async () => {
    await router.navigate('p07');
    const page = currentPage();
    expect(page.dataset.page).toBe('p07');
    expect(page.querySelector('.rc-topbar__title')?.textContent).toContain('锥度 · 莫氏');

    const segItems = [...page.querySelectorAll<HTMLElement>('.rc-seg__item')];
    expect(segItems.map((el) => el.textContent)).toEqual(['计算', '莫氏对照', '反推']);
    expect(segItems[0]?.classList.contains('on')).toBe(true);

    expect(page.querySelector('.rc-p07__figure svg')).not.toBeNull();
    const labels = [...page.querySelectorAll<HTMLElement>('.rc-input__label')].map(
      (el) => el.textContent,
    );
    expect(labels).toEqual(['大端 D', '小端 d', '锥长 L']);
    expect(page.querySelector<HTMLInputElement>('input[name="big"]')?.value).toBe('32');
    expect(page.querySelector<HTMLInputElement>('input[name="small"]')?.value).toBe('27');
    expect(page.querySelector<HTMLInputElement>('input[name="length"]')?.value).toBe('50');
  });

  it('默认值结果 = core 实时计算：C=0.1→1:10、半角 2°51′45″、单边差 2.5', async () => {
    await router.navigate('p07');
    const core = taperCalc({ big: 32, small: 27, length: 50 });
    expect(core.taperC).toBeCloseTo(0.1, 12);
    expect(core.halfAngleDMS).toBe('2°51′45″');
    expect(core.missing).toBe(core.taperC);

    expect(resultValues()).toEqual(['1 : 10', '2°51′45″', '2.5']);
    const labels = [...currentPage().querySelectorAll<HTMLElement>('.rc-resultcard__label')].map(
      (el) => el.textContent,
    );
    expect(labels).toEqual(['锥度 C', '半角 α/2', '大小端差 (D−d)/2']);
    expect(
      [...currentPage().querySelectorAll<HTMLElement>('.rc-resultcard__unit')].map(
        (el) => el.textContent,
      ),
    ).toEqual(['mm']);
  });

  it('三值推 C（D=30,d=28,L=50）：C=0.04 与 core 一致；单边差 1', async () => {
    await router.navigate('p07');
    setInput('big', '30');
    setInput('small', '28');
    setInput('length', '50');

    const core = taperCalc({ big: 30, small: 28, length: 50 });
    expect(core.taperC).toBeCloseTo(0.04, 12);
    expect(core.halfAngleDMS).toBe('1°8′45″');

    expect(resultValues()).toEqual(['1 : 25', '1°8′45″', '1']);
    expect(currentPage().querySelector('.rc-acc__body')?.textContent).toContain('0.04');
  });

  it('只给二值：输入区出现不可解提示，不渲染结果卡、无 NaN', async () => {
    await router.navigate('p07');
    setInput('length', '');
    const page = currentPage();
    const hint = page.querySelector<HTMLElement>('.rc-p07__hint');
    expect(hint).not.toBeNull();
    expect(hint?.textContent).toContain('三值齐全');
    expect(hint?.textContent).toContain('不可解');
    expect(page.querySelector('.rc-resultcard')).toBeNull();
    expect(page.textContent).not.toContain('NaN');
  });

  it('锥长 L=0：提示锥长需大于 0，不假算', async () => {
    await router.navigate('p07');
    setInput('length', '0');
    const page = currentPage();
    expect(page.querySelector('.rc-p07__hint')?.textContent).toContain('大于 0');
    expect(page.querySelector('.rc-resultcard')).toBeNull();
    expect(page.textContent).not.toContain('Infinity');
  });
});

describe('p07 锥度 · 莫氏：莫氏对照', () => {
  it('p01 传参 mode=morse&morse=4：MT4 高亮，结果 = 1:19.254 + 1°29′15″', async () => {
    await router.navigate('p07', { mode: 'morse', morse: 4 });
    const page = currentPage();
    expect(
      page.querySelector<HTMLElement>('.rc-seg__item[data-value="morse"]')?.classList.contains('on'),
    ).toBe(true);

    const chips = [...page.querySelectorAll<HTMLElement>('.rc-p07__chips .la-chip')];
    expect(chips.map((el) => el.textContent)).toEqual([
      'MT0',
      'MT1',
      'MT2',
      'MT3',
      'MT4',
      'MT5',
      'MT6',
    ]);
    expect(chips[4]?.classList.contains('on')).toBe(true);

    const core = findMorse(MORSE_ROWS, 4);
    expect(core.taper).toBe('1:19.254');
    expect(core.halfAngleDMS).toBe('1°29′15″');
    expect(resultValues()).toEqual([core.taper, core.halfAngleDMS]);
    expect(page.querySelector('.rc-p07__source')?.textContent).toContain('GB/T 1443-2016');
  });

  it('点击 MT3 切换：1:19.922 + 1°26′16″（查表行值）', async () => {
    await router.navigate('p07', { mode: 'morse', morse: 4 });
    const chips = [...currentPage().querySelectorAll<HTMLButtonElement>('.rc-p07__chips .la-chip')];
    chips[3]?.click();

    const core = findMorse(MORSE_ROWS, 3);
    expect(core.taper).toBe('1:19.922');
    expect(core.halfAngleDMS).toBe('1°26′16″');
    expect(resultValues()).toEqual(['1:19.922', '1°26′16″']);
    expect(
      currentPage()
        .querySelectorAll<HTMLElement>('.rc-p07__chips .la-chip')[3]
        ?.classList.contains('on'),
    ).toBe(true);
  });

  it('分段切换：计算 ↔ 莫氏对照，各自视图可往返', async () => {
    await router.navigate('p07');
    clickSegItem('morse');
    expect(currentPage().querySelectorAll('.rc-p07__chips .la-chip')).toHaveLength(7);
    expect(currentPage().querySelector('.rc-p07__figure')).toBeNull();

    clickSegItem('calc');
    expect(currentPage().querySelectorAll('.rc-input')).toHaveLength(3);
    expect(currentPage().querySelector('.rc-p07__chips')).toBeNull();
  });
});

describe('p07 反推模式（W6-C4）', () => {
  it('链路键直达 #/p07?mode=reverse&taperC=1/19.254&small=30&length=50 → 32.597 / 1.298 / 1°29′15″', async () => {
    await router.navigate('p07', { mode: 'reverse', taperC: 1 / 19.254, small: 30, length: 50 });
    expect(window.location.hash).toBe(
      '#/p07?mode=reverse&taperC=0.05193725979017347&small=30&length=50',
    );
    const page = currentPage();
    expect(
      page.querySelector<HTMLElement>('.rc-seg__item[data-value="reverse"]')?.classList.contains('on'),
    ).toBe(true);
    expect(page.querySelector<HTMLInputElement>('input[name="taperC"]')).not.toBeNull();
    // 反推大端：D = d + C·L = 30 + 50/19.254 = 32.596863 → 32.597
    // (D−d)/2 = 1.298431 → 1.298（G0-I4 未舍入路径）；α/2 = arctan(C/2) = 1°29′15″
    expect(resultValues()).toEqual(['32.597', '1.298', '1°29′15″']);
    const labels = [...page.querySelectorAll<HTMLElement>('.rc-resultcard__label')].map(
      (el) => el.textContent,
    );
    expect(labels).toEqual(['大端 D', '大小端差 (D−d)/2', '半角 α/2']);
  });

  it('莫氏快选 MT4：填入 C=1/19.254，默认 D=32/d=27 留空 L → 反推锥长 96.27', async () => {
    await router.navigate('p07', { mode: 'reverse' });
    const chips = [...currentPage().querySelectorAll<HTMLButtonElement>('.rc-p07__chips .la-chip')];
    expect(chips.map((el) => el.textContent)).toEqual([
      'MT0',
      'MT1',
      'MT2',
      'MT3',
      'MT4',
      'MT5',
      'MT6',
    ]);
    chips[4]?.click();
    const cInput = currentPage().querySelector<HTMLInputElement>('input[name="taperC"]');
    expect(Number(cInput?.value)).toBeCloseTo(1 / 19.254, 6);
    expect(
      currentPage()
        .querySelectorAll<HTMLElement>('.rc-p07__chips .la-chip')[4]
        ?.classList.contains('on'),
    ).toBe(true);
    // L = (D−d)/C = (32−27)/(1/19.254) = 96.27
    expect(resultValues()).toEqual(['96.27', '2.5', '1°29′15″']);
  });

  it('非法输入行内提示：留空 0 行 / 2+ 行、锥比 C≤0', async () => {
    await router.navigate('p07', {
      mode: 'reverse',
      taperC: 0.05,
      big: 32,
      small: 30,
      length: 50,
    });
    const hint = (): string => currentPage().querySelector('.rc-p07__hint')?.textContent ?? '';
    // 三行全给 = 留空 0 行
    expect(hint()).toContain('留空恰好一行');
    expect(currentPage().querySelector('.rc-resultcard')).toBeNull();

    // 留空 L = 恰一行 → 可解
    setInput('length', '');
    expect(resultValues()).toEqual(['40', '1', '1°25′56″']);

    // 再留空 D = 2 行 → 提示
    setInput('big', '');
    expect(hint()).toContain('留空恰好一行');

    // C≤0 → 提示
    setInput('big', '32');
    setInput('taperC', '0');
    expect(hint()).toContain('大于 0');
    expect(currentPage().textContent).not.toContain('NaN');
  });

  it('分段第三项 data-value=reverse；反推 ↔ 计算可往返且计算视图零回归', async () => {
    await router.navigate('p07');
    const items = [...currentPage().querySelectorAll<HTMLElement>('.rc-seg__item')];
    expect(items.map((el) => el.dataset.value)).toEqual(['calc', 'morse', 'reverse']);
    clickSegItem('reverse');
    expect(currentPage().querySelector('input[name="taperC"]')).not.toBeNull();
    clickSegItem('calc');
    expect(currentPage().querySelectorAll('.rc-input')).toHaveLength(3);
    expect(resultValues()).toEqual(['1 : 10', '2°51′45″', '2.5']);
  });
});
