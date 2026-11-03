// @vitest-environment happy-dom
/**
 * W4-C5 · p11 重量页测试
 *
 * 设计稿区块：形状分段 / 尺寸输入网格 / 密度 chips / 单件重量大数字卡 /「怎么算的」。
 * 金测锚：碳钢 ρ=7.85（W2 weight 冻结用例）、铝 ρ=2.70（平板用例）；期望值一律由
 * core/weight.barWeight + core/lookup.findDensity 实时重算，UI 显示值须与 core 输出逐位一致。
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRouter, type Router } from '../src/ui/router';
import { barWeight } from '../src/core/weight';
import { findDensity } from '../src/core/lookup';
import type { DensityRow, WeightShape } from '../src/core/types';
import densitiesJson from '../src/data/densities.json';

const DENSITIES = densitiesJson as unknown as DensityRow[];

let app: HTMLElement;
let router: Router;

function page(): HTMLElement {
  const element = app.querySelector<HTMLElement>('.la-page[data-page="p11"]');
  if (!element) throw new Error('p11 未渲染');
  return element;
}

function statText(): string {
  return page().querySelector('.rc-stat__value')?.textContent ?? '';
}

function setInput(name: string, value: string): void {
  const input = page().querySelector<HTMLInputElement>(`.rc-input__field[name="${name}"]`);
  if (!input) throw new Error(`输入框 ${name} 不存在`);
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function clickSeg(label: string): void {
  const item = [...page().querySelectorAll<HTMLButtonElement>('.rc-p11__seg .rc-seg__item')].find(
    (button) => button.textContent === label,
  );
  if (!item) throw new Error(`分段项 ${label} 不存在`);
  item.click();
}

function clickDensity(prefix: string): void {
  const chip = [...page().querySelectorAll<HTMLButtonElement>('.rc-p11__density .la-chip')].find(
    (button) => (button.textContent ?? '').startsWith(prefix),
  );
  if (!chip) throw new Error(`密度 chip ${prefix} 不存在`);
  chip.click();
}

function expectedMass(shape: WeightShape, dims: Record<string, number>, densityKey: string): string {
  const density = findDensity(DENSITIES, densityKey);
  return barWeight({ shape, dims, density: density.density }).massKg.toFixed(2);
}

beforeEach(async () => {
  document.body.innerHTML = '<div id="app"></div>';
  window.location.hash = '';
  app = document.querySelector<HTMLElement>('#app') as HTMLElement;
  router = createRouter({ root: app });
  await router.start();
  await router.navigate('p11');
});

afterEach(() => {
  router.destroy();
  document.body.replaceChildren();
});

describe('p11 结构保真', () => {
  it('顶栏 / 四形状分段 / 默认圆钢两输入 / 13 个密度 chips', () => {
    const root = page();
    expect(root.querySelector('.rc-topbar__title')?.textContent).toBe('重量');

    const items = [...root.querySelectorAll<HTMLElement>('.rc-p11__seg .rc-seg__item')];
    expect(items.map((item) => item.textContent)).toEqual(['圆钢', '六方', '钢管', '平板']);
    expect(items[0]?.classList.contains('on')).toBe(true);

    const inputs = [...root.querySelectorAll<HTMLInputElement>('.rc-input__field')];
    expect(inputs.map((input) => input.name)).toEqual(['D', 'L']);
    expect(inputs.map((input) => input.value)).toEqual(['50', '100']);

    const chips = [...root.querySelectorAll<HTMLElement>('.rc-p11__density .la-chip')];
    expect(chips).toHaveLength(13);
    expect(chips[0]?.textContent).toBe('碳钢 7.85');
    expect(chips.map((chip) => chip.textContent)).toContain('铝 2.70');
  });

  it('默认圆钢 Ø50×100 碳钢显示 1.54 kg，与 core 输出一致', () => {
    // V = π×50²/4×100 = 196349.540849 mm³；m = 7.85×196.349540849/1000 = 1.541344 kg
    expect(findDensity(DENSITIES, 'carbon-steel').density).toBe(7.85);
    expect(statText()).toBe(`${expectedMass('round', { D: 50, L: 100 }, 'carbon-steel')}kg`);
    expect(statText()).toBe('1.54kg');
    expect(page().querySelector('.rc-stat__unit')?.textContent).toBe('kg');
    expect(page().querySelector('.rc-stat__eyebrow')?.textContent).toBe('单件重量 m');
  });

  it('密度锚点 2.70：切到铝后重量与 core 一致，显示 0.53 kg', () => {
    expect(findDensity(DENSITIES, 'aluminum').density).toBe(2.7);
    clickDensity('铝 ');
    expect(statText()).toBe(`${expectedMass('round', { D: 50, L: 100 }, 'aluminum')}kg`);
    expect(statText()).toBe('0.53kg');
    const active = [...page().querySelectorAll<HTMLElement>('.rc-p11__density .la-chip')].find(
      (chip) => chip.classList.contains('on'),
    );
    expect(active?.textContent).toBe('铝 2.70');
  });

  it('「怎么算的」公式含体积 196350、密度 7.85 与结果 1.54（默认展开）', () => {
    const formula = page().querySelector('.rc-acc__body');
    expect(formula).not.toBeNull();
    expect(formula?.hasAttribute('hidden')).toBe(false);
    const text = formula?.textContent ?? '';
    expect(text).toContain('196350 mm³');
    expect(text).toContain('7.85 g/cm³');
    expect(text).toContain('1.54 kg');
  });
});

describe('p11 四形状实时计算（core 对拍）', () => {
  it('六方 S20×100 碳钢：输入键切为 S/L，显示 0.27 kg', () => {
    clickSeg('六方');
    const inputs = [...page().querySelectorAll<HTMLInputElement>('.rc-input__field')];
    expect(inputs.map((input) => input.name)).toEqual(['S', 'L']);
    expect(inputs.map((input) => input.value)).toEqual(['20', '100']);
    setInput('S', '20');
    setInput('L', '100');
    expect(statText()).toBe(`${expectedMass('hex', { S: 20, L: 100 }, 'carbon-steel')}kg`);
    expect(statText()).toBe('0.27kg');
  });

  it('钢管 D60 / t5 / L100 碳钢：三输入，显示 0.68 kg', () => {
    clickSeg('钢管');
    const inputs = [...page().querySelectorAll<HTMLInputElement>('.rc-input__field')];
    expect(inputs.map((input) => input.name)).toEqual(['D', 't', 'L']);
    expect(statText()).toBe(`${expectedMass('pipe', { D: 60, t: 5, L: 100 }, 'carbon-steel')}kg`);
    expect(statText()).toBe('0.68kg');
    const formula = page().querySelector('.rc-acc__body')?.textContent ?? '';
    expect(formula).toContain('d = D − 2t = 60 − 2×5 = 50');
    expect(formula).toContain('86394 mm³');
  });

  it('平板 W100 / T10 / L200 铝：显示 0.54 kg（密度入参生效）', () => {
    clickSeg('平板');
    clickDensity('铝 ');
    const inputs = [...page().querySelectorAll<HTMLInputElement>('.rc-input__field')];
    expect(inputs.map((input) => input.name)).toEqual(['W', 'T', 'L']);
    expect(inputs.map((input) => input.value)).toEqual(['100', '10', '200']);
    expect(statText()).toBe(`${expectedMass('plate', { W: 100, T: 10, L: 200 }, 'aluminum')}kg`);
    expect(statText()).toBe('0.54kg');
  });

  it('切换形状后重算：六方 → 平板 → 圆钢，显示值逐形状跟随 core', () => {
    clickSeg('六方');
    expect(statText()).toBe('0.27kg');
    clickSeg('平板');
    expect(statText()).toBe(`${expectedMass('plate', { W: 100, T: 10, L: 200 }, 'carbon-steel')}kg`);
    clickSeg('圆钢');
    expect(statText()).toBe('1.54kg');
  });
});

describe('p11 输入校验', () => {
  it('空值 / 非数值显示「—」，恢复后重新计算', () => {
    setInput('D', '');
    expect(statText()).toBe('—kg');
    expect(page().querySelector('.rc-acc')).toBeNull();
    setInput('D', 'abc');
    expect(statText()).toBe('—kg');
    setInput('D', '50');
    expect(statText()).toBe('1.54kg');
  });

  it('钢管壁厚非法（2t ≥ D）显示「—」', () => {
    clickSeg('钢管');
    setInput('t', '30');
    expect(statText()).toBe('—kg');
    setInput('t', '5');
    expect(statText()).toBe('0.68kg');
  });
});
