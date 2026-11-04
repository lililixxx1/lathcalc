// @vitest-environment happy-dom
/**
 * W4-C4 · p09 转速 · 线速度 页面测试（自绘键盘为主输入）
 *
 * 黄金值（WAVE-PLAN §4 #5）：
 *   Ø50 / Vc=150 → n = 1000×150/(π×50) = 954.929659 → 显示 955 r/min。
 * 键盘输入用例：
 *   Vc 150 → 退格 3 次 → 输入 90 → n = 1000×90/(π×50) = 572.957795 → 573。
 *   直径改为 80（键盘）→ n = 1000×150/(π×80) = 596.831 → 597。
 * 反向（求线速度 Vc）：
 *   D=50 / n=1000 → Vc = 1000×π×50/1000 = 157.079633 → 157.1 m/min。
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRouter, type Router } from '../src/ui/router';
import { feedRate, spindleSpeed, surfaceSpeed } from '../src/core/speed';
import { KEYPAD_KEYS } from '../src/ui/components';

let app: HTMLElement;
let router: Router;

function currentPage(): HTMLElement {
  const page = app.querySelector<HTMLElement>('.la-page');
  if (!page) throw new Error('p09 未渲染');
  return page;
}

function setInput(name: string, value: string): void {
  const input = currentPage().querySelector<HTMLInputElement>(`input[name="${name}"]`);
  if (!input) throw new Error(`输入框 ${name} 不存在`);
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function keypad(key: string): void {
  currentPage().querySelector<HTMLButtonElement>(`.rc-keypad__key[data-key="${key}"]`)?.click();
}

function statMainValue(): string {
  const value = currentPage().querySelector<HTMLElement>('.rc-stat__value');
  return value?.childNodes[0]?.textContent ?? '';
}

function statUnit(): string {
  return currentPage().querySelector<HTMLElement>('.rc-stat__unit')?.textContent ?? '';
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

describe('p09 转速 · 线速度', () => {
  it('默认 Ø50 / Vc=150 → n=955 r/min（core 黄金值）+ 标尺 + 键盘 12 键', async () => {
    await router.navigate('p09');
    const page = currentPage();
    expect(page.dataset.page).toBe('p09');

    const segItems = [...page.querySelectorAll<HTMLElement>('.rc-seg__item')];
    expect(segItems.map((el) => el.textContent)).toEqual(['求转速 n', '求线速度 Vc']);
    expect(segItems[0]?.classList.contains('on')).toBe(true);

    expect(page.querySelector<HTMLInputElement>('input[name="d"]')?.value).toBe('50');
    expect(page.querySelector<HTMLInputElement>('input[name="vc"]')?.value).toBe('150');

    const core = spindleSpeed({ diameter: 50, vc: 150 });
    expect(core.rpm.toFixed(0)).toBe('955');
    expect(statMainValue()).toBe('955');
    expect(statUnit()).toBe('r/min');
    expect(page.querySelector('.rc-stat__eyebrow')?.textContent).toBe('主轴转速 n');

    expect(page.querySelector('.rc-scale')).not.toBeNull();
    expect(page.querySelector('.rc-acc__body')?.textContent).toContain('n = 1000·Vc / (π·D)');

    const keys = [...page.querySelectorAll<HTMLElement>('.rc-keypad__key')].map(
      (el) => el.dataset.key,
    );
    expect(keys).toEqual([...KEYPAD_KEYS]);
  });

  it('自绘键盘为主输入：Vc 150 → 退格 3 次 → 90 → n=573', async () => {
    await router.navigate('p09');
    keypad('del');
    keypad('del');
    keypad('del');
    keypad('9');
    keypad('0');

    expect(currentPage().querySelector<HTMLInputElement>('input[name="vc"]')?.value).toBe('90');
    // n = 1000×90/(π×50) = 572.957795 → 573
    expect(spindleSpeed({ diameter: 50, vc: 90 }).rpm.toFixed(0)).toBe('573');
    expect(statMainValue()).toBe('573');
  });

  it('键盘写入目标随输入行切换：点直径行后退格输入 80 → n=597', async () => {
    await router.navigate('p09');
    const dInput = currentPage().querySelector<HTMLInputElement>('input[name="d"]');
    dInput?.click();
    keypad('del');
    keypad('del');
    keypad('8');
    keypad('0');

    expect(currentPage().querySelector<HTMLInputElement>('input[name="d"]')?.value).toBe('80');
    expect(currentPage().querySelector<HTMLInputElement>('input[name="vc"]')?.value).toBe('150');
    // n = 1000×150/(π×80) = 596.831 → 597
    expect(spindleSpeed({ diameter: 80, vc: 150 }).rpm.toFixed(0)).toBe('597');
    expect(statMainValue()).toBe('597');
  });

  it('求线速度 Vc：D=50 / n=1000 → Vc=157.1 m/min（同一关系反解）', async () => {
    await router.navigate('p09');
    clickSegItem('vc');

    const rpmInput = currentPage().querySelector<HTMLInputElement>('input[name="rpm"]');
    expect(rpmInput).not.toBeNull();
    setInput('rpm', '1000');

    const expected = (1000 * Math.PI * 50) / 1000;
    expect(expected.toFixed(1)).toBe('157.1');
    expect(statMainValue()).toBe('157.1');
    expect(statUnit()).toBe('m/min');
    expect(currentPage().querySelector('.rc-stat__eyebrow')?.textContent).toBe('线速度 Vc');
    expect(currentPage().querySelector('.rc-acc__body')?.textContent).toContain(
      'Vc = n·π·D / 1000',
    );
  });

  it('模式切换保留连续值：求转速→求线速度时 n 由当前 Vc 反推', async () => {
    await router.navigate('p09');
    clickSegItem('vc');
    // 955/954.93 都来自 Ø50/Vc=150；反向算回 Vc 应仍为 150.0。
    const rpmValue = currentPage().querySelector<HTMLInputElement>('input[name="rpm"]')?.value ?? '';
    expect(Number(rpmValue)).toBeCloseTo(954.93, 2);
    expect(statMainValue()).toBe('150.0');
  });

  it('直径 0：输入区提示，不渲染大数字卡、无 NaN', async () => {
    await router.navigate('p09');
    setInput('d', '0');
    const page = currentPage();
    expect(page.querySelector('.rc-p09__hint')).not.toBeNull();
    expect(page.querySelector('.rc-stat')).toBeNull();
    expect(page.textContent).not.toContain('NaN');
  });

  it('p01 传参 d=40&vc=100：n=796（1000×100/(π×40)=795.7747）', async () => {
    await router.navigate('p09', { d: 40, vc: 100 });
    expect(currentPage().querySelector<HTMLInputElement>('input[name="d"]')?.value).toBe('40');
    expect(currentPage().querySelector<HTMLInputElement>('input[name="vc"]')?.value).toBe('100');
    expect(spindleSpeed({ diameter: 40, vc: 100 }).rpm.toFixed(0)).toBe('796');
    expect(statMainValue()).toBe('796');
  });
});

describe('p09 进给 f / vf 卡（W6-C3 · WAVE-PLAN-V2 F6）', () => {
  it('默认 f 为空 → 不渲染 vf 卡（诚实不伪造）', async () => {
    await router.navigate('p09');
    expect(currentPage().querySelector('.rc-p09__vfcard')).toBeNull();
    expect(currentPage().querySelector<HTMLInputElement>('input[name="f"]')?.value).toBe('');
  });

  it('输入 f=0.2 → vf 卡 191.0 mm/min（值调 core feedRate）', async () => {
    await router.navigate('p09');
    setInput('f', '0.2');

    const coreVf = feedRate(0.2, spindleSpeed({ diameter: 50, vc: 150 }).rpm);
    // vf = 0.2×954.929658551372 = 190.9859317102744 → toFixed(1) = 191.0
    expect(coreVf.toFixed(1)).toBe('191.0');

    const card = currentPage().querySelector<HTMLElement>('.rc-p09__vfcard');
    expect(card).not.toBeNull();
    expect(card?.textContent).toContain('vf = f·n');
    expect(card?.textContent).toContain('191.0');
    expect(card?.textContent).toContain('mm/min');
  });

  it('f=0 → 不渲染 vf 卡，主结果仍为 955', async () => {
    await router.navigate('p09');
    setInput('f', '0');
    expect(currentPage().querySelector('.rc-p09__vfcard')).toBeNull();
    expect(statMainValue()).toBe('955');
  });

  it('求线速度 Vc 走 core surfaceSpeed：D=50 / n=1000 → 157.1', async () => {
    await router.navigate('p09');
    clickSegItem('vc');
    setInput('rpm', '1000');

    const expected = surfaceSpeed({ d: 50, n: 1000 });
    // (1000×π)×50/1000 = 157.07963267948963 → 157.1
    expect(expected.toFixed(1)).toBe('157.1');
    expect(statMainValue()).toBe(expected.toFixed(1));
  });

  it('传参 f=0.2：f 预填且 vf 卡 191.0（#/p09?d=50&vc=150&f=0.2）', async () => {
    await router.navigate('p09', { d: 50, vc: 150, f: 0.2 });
    expect(currentPage().querySelector<HTMLInputElement>('input[name="f"]')?.value).toBe('0.2');
    expect(currentPage().querySelector('.rc-p09__vfcard')?.textContent).toContain('191.0');
  });

  it('f 行可成为键盘写入目标：点击 f 行后键入 0.2 → vf 卡 191.0', async () => {
    await router.navigate('p09');
    const fInput = currentPage().querySelector<HTMLInputElement>('input[name="f"]');
    fInput?.closest('.rc-input')?.dispatchEvent(new Event('click', { bubbles: true }));
    keypad('0');
    keypad('.');
    keypad('2');

    expect(currentPage().querySelector<HTMLInputElement>('input[name="f"]')?.value).toBe('0.2');
    expect(currentPage().querySelector('.rc-p09__vfcard')?.textContent).toContain('191.0');
  });
});
