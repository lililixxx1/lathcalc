// @vitest-environment happy-dom
/**
 * W4-C5 · p12 三角页测试（SSS-only）
 *
 * 设计稿区块：示意图卡 / a·b·c 三列参数 / 三角结果卡 / 直角状态 chips /「怎么算的」。
 * 范围裁决（W2-C1 冻结）：v0.1 仅 SSS；SAS/ASA/SSA 不提供任何可用入口。
 * 期望值一律由 core/triangle.solveTriangle 实时重算并与 UI 逐位对拍。
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRouter, type Router } from '../src/ui/router';
import { solveTriangle } from '../src/core/triangle';

let app: HTMLElement;
let router: Router;

function page(): HTMLElement {
  const element = app.querySelector<HTMLElement>('.la-page[data-page="p12"]');
  if (!element) throw new Error('p12 未渲染');
  return element;
}

function setSide(side: 'a' | 'b' | 'c', value: string): void {
  const input = page().querySelector<HTMLInputElement>(`.rc-p12__field[data-side="${side}"]`);
  if (!input) throw new Error(`边 ${side} 输入框不存在`);
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function setField(field: 'a' | 'b' | 'c' | 'A' | 'B' | 'C', value: string): void {
  const input = page().querySelector<HTMLInputElement>(`.rc-p12__field[data-field="${field}"]`);
  if (!input) throw new Error(`字段 ${field} 输入框不存在`);
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function resultValue(label: string): string {
  const rows = [...page().querySelectorAll<HTMLElement>('.rc-resultcard__row')];
  const row = rows.find((item) => item.dataset.label === label);
  return row?.querySelector('.rc-resultcard__value')?.textContent ?? '';
}

/** 指定结果卡内的行值（SSA 双解时两张卡并列，需按卡定位）。 */
function cardValue(card: Element, label: string): string {
  const rows = [...card.querySelectorAll<HTMLElement>('.rc-resultcard__row')];
  const row = rows.find((item) => item.dataset.label === label);
  return row?.querySelector('.rc-resultcard__value')?.textContent ?? '';
}

function chipTexts(): string[] {
  return [...page().querySelectorAll<HTMLElement>('.rc-p12__chips .la-chip')].map(
    (chip) => chip.textContent ?? '',
  );
}

function clickSeg(value: string): void {
  page().querySelector<HTMLButtonElement>(`.rc-seg__item[data-value="${value}"]`)?.click();
}

function fieldKeys(): string[] {
  return [...page().querySelectorAll<HTMLInputElement>('.rc-p12__field')].map(
    (field) => field.dataset.field ?? '',
  );
}

beforeEach(async () => {
  document.body.innerHTML = '<div id="app"></div>';
  window.location.hash = '';
  app = document.querySelector<HTMLElement>('#app') as HTMLElement;
  router = createRouter({ root: app });
  await router.start();
  await router.navigate('p12');
});

afterEach(() => {
  router.destroy();
  document.body.replaceChildren();
});

describe('p12 结构保真', () => {
  it('顶栏 / 三个 SSS 输入 / 结果卡三行 / 状态 chips / 示意图', () => {
    const root = page();
    expect(root.querySelector('.rc-topbar__title')?.textContent).toBe('三角');

    const fields = [...root.querySelectorAll<HTMLInputElement>('.rc-p12__field')];
    expect(fields.map((field) => field.dataset.side)).toEqual(['a', 'b', 'c']);
    expect(fields.map((field) => field.getAttribute('aria-label'))).toEqual(['边 a', '边 b', '边 c']);
    expect(fields.map((field) => field.value)).toEqual(['30', '40', '50']);

    expect(root.querySelectorAll('.rc-resultcard__row')).toHaveLength(3);
    expect(root.querySelector('.rc-p12__diagram svg')).not.toBeNull();
    const diagramText = root.querySelector('.rc-p12__diagram')?.textContent ?? '';
    expect(diagramText).toContain('c 50');
    expect(diagramText).toContain('b 40');
    expect(diagramText).toContain('a 30');
    expect(diagramText).toContain('C');
    expect(diagramText).toContain('A');
    expect(diagramText).toContain('B');
  });

  it('30/40/50：∠A 36.87° / ∠B 53.13° / ∠C 90.00°，直角 chips 命中', () => {
    const core = solveTriangle({ a: 30, b: 40, c: 50 });
    expect(resultValue('∠A')).toBe(`${core.A.toFixed(2)}°`);
    expect(resultValue('∠B')).toBe(`${core.B.toFixed(2)}°`);
    expect(resultValue('∠C')).toBe(`${core.C.toFixed(2)}°`);
    expect(resultValue('∠A')).toBe('36.87°');
    expect(resultValue('∠B')).toBe('53.13°');
    expect(resultValue('∠C')).toBe('90.00°');
    expect(chipTexts()).toEqual(['直角三角形', '勾股校验通过']);
    expect(page().querySelectorAll('.rc-p12__chips .la-chip.on')).toHaveLength(1);
  });

  it('模式 Segmented：SSS/SAS/ASA/SSA 四项，默认 SSS 且三输入 a/b/c', () => {
    const root = page();
    const segItems = [...root.querySelectorAll<HTMLElement>('.la-seg .rc-seg__item')];
    expect(segItems.map((item) => item.textContent)).toEqual(['SSS', 'SAS', 'ASA', 'SSA']);
    expect(segItems.map((item) => item.dataset.value)).toEqual(['sss', 'sas', 'asa', 'ssa']);
    expect(segItems[0]?.classList.contains('on')).toBe(true);
    expect(root.querySelectorAll('.rc-p12__field')).toHaveLength(3);
  });
});

describe('p12 SSS 实时计算（core 对拍）', () => {
  it('3/4/5：直角判定与 core 一致，∠C 90.00°', () => {
    setSide('a', '3');
    setSide('b', '4');
    setSide('c', '5');
    const core = solveTriangle({ a: 3, b: 4, c: 5 });
    expect(core.right).toBe(true);
    expect(resultValue('∠A')).toBe(`${core.A.toFixed(2)}°`);
    expect(resultValue('∠B')).toBe(`${core.B.toFixed(2)}°`);
    expect(resultValue('∠C')).toBe(`${core.C.toFixed(2)}°`);
    expect(resultValue('∠A')).toBe('36.87°');
    expect(resultValue('∠C')).toBe('90.00°');
    expect(chipTexts()).toEqual(['直角三角形', '勾股校验通过']);
    const diagramText = page().querySelector('.rc-p12__diagram')?.textContent ?? '';
    expect(diagramText).toContain('a 3');
    expect(diagramText).toContain('b 4');
    expect(diagramText).toContain('c 5');
  });

  it('13/14/15：非直角，三角度与 core 一致', () => {
    setSide('a', '13');
    setSide('b', '14');
    setSide('c', '15');
    const core = solveTriangle({ a: 13, b: 14, c: 15 });
    expect(core.right).toBe(false);
    expect(resultValue('∠A')).toBe(`${core.A.toFixed(2)}°`);
    expect(resultValue('∠B')).toBe(`${core.B.toFixed(2)}°`);
    expect(resultValue('∠C')).toBe(`${core.C.toFixed(2)}°`);
    expect(resultValue('∠A')).toBe('53.13°');
    expect(resultValue('∠B')).toBe('59.49°');
    expect(resultValue('∠C')).toBe('67.38°');
    expect(chipTexts()).toEqual(['非直角三角形', '勾股校验不通过']);
    expect(page().querySelectorAll('.rc-p12__chips .la-chip.on')).toHaveLength(0);
  });

  it('「怎么算的」展示余弦定理三行 + 海伦公式，数值来自 core 结果', () => {
    const formula = page().querySelector('.rc-acc__body')?.textContent ?? '';
    expect(formula).toContain('cos A = (b²+c²−a²) / 2bc = 0.8000 → ∠A 36.87°');
    expect(formula).toContain('cos C = (a²+b²−c²) / 2ab = 0.0000 → ∠C 90.00°');
    expect(formula).toContain('S = √(s(s−a)(s−b)(s−c))，s = 60 → 600.00');
  });
});

describe('p12 输入校验', () => {
  it('缺边时提示「输入三边 a / b / c」', () => {
    setSide('b', '');
    expect(page().querySelector('.rc-resultcard')).toBeNull();
    expect(page().querySelector('.rc-p12__hint')?.textContent).toBe('输入三边 a / b / c');
  });

  it('三边不能构成三角形时显示错误、不渲染结果卡', () => {
    setSide('a', '1');
    setSide('b', '2');
    setSide('c', '10');
    expect(page().querySelector('.rc-resultcard')).toBeNull();
    expect(page().querySelector('.rc-p12__hint')?.textContent).toBe('三边不能构成三角形');
    setSide('c', '2.5');
    expect(page().querySelectorAll('.rc-resultcard__row')).toHaveLength(3);
  });
});

describe('p12 多模式解算（W6-C4）', () => {
  it('SAS：切换后三输入 b/c/A；b=40,c=50,A=36.87 → 边 a=30.00、直角', () => {
    clickSeg('sas');
    expect(fieldKeys()).toEqual(['b', 'c', 'A']);
    setField('b', '40');
    setField('c', '50');
    setField('A', '36.87');
    // a = √(40²+50²−2×40×50×cos36.87°) = 30.000071 → 30.00
    expect(resultValue('边 a')).toBe('30.00');
    expect(resultValue('∠A')).toBe('36.87°');
    expect(resultValue('∠C')).toBe('90.00°');
    expect(page().querySelectorAll('.rc-p12__solutions .rc-resultcard')).toHaveLength(1);
    expect(page().querySelector('.rc-acc__body')?.textContent).toContain('余弦定理');
  });

  it('ASA：切换后三输入 A/B/c；A=36.87,B=53.13,c=50 → a=30.00、b=40.00', () => {
    clickSeg('asa');
    expect(fieldKeys()).toEqual(['A', 'B', 'c']);
    setField('A', '36.87');
    setField('B', '53.13');
    setField('c', '50');
    // C=90°；a=c·sinA/sinC=30.000071；b=c·sinB/sinC=39.999946
    expect(resultValue('边 a')).toBe('30.00');
    expect(resultValue('边 b')).toBe('40.00');
    expect(resultValue('∠C')).toBe('90.00°');
  });

  it('SSA 链路键直达 #/p12?mode=ssa：a=40,c=50,A=36.87 → 双解两卡并列、锐角解在前', async () => {
    await router.navigate('p12', { mode: 'ssa' });
    expect(window.location.hash).toBe('#/p12?mode=ssa');
    const segItems = [...page().querySelectorAll<HTMLElement>('.rc-seg__item')];
    expect(segItems.find((item) => item.dataset.value === 'ssa')?.classList.contains('on')).toBe(
      true,
    );
    expect(fieldKeys()).toEqual(['a', 'c', 'A']);

    setField('a', '40');
    setField('c', '50');
    setField('A', '36.87');

    const cards = [...page().querySelectorAll<HTMLElement>('.rc-p12__solutions .rc-resultcard')];
    expect(cards).toHaveLength(2);
    const [first, second] = cards;
    expect(first).toBeDefined();
    expect(second).toBeDefined();
    if (!first || !second) return;
    // 解₁（锐角 C=48.590533°）：b₁ = a·sinB₁/sinA = 66.457378 → 66.46
    expect(cardValue(first, '∠C')).toBe('48.59°');
    expect(cardValue(first, '边 b')).toBe('66.46');
    // 解₂（钝角 C=131.409467°）：b₂ = 13.542514 → 13.54
    expect(cardValue(second, '∠C')).toBe('131.41°');
    expect(cardValue(second, '边 b')).toBe('13.54');
    expect(page().textContent).toContain('SSA 双解');
    expect(page().querySelector('.rc-acc__body')?.textContent).toContain('sinC');
  });

  it('SSA 边界无解：A=120,a=45,c=50 → 提示「构不成三角形」，不渲染结果卡', () => {
    clickSeg('ssa');
    setField('a', '45');
    setField('c', '50');
    setField('A', '120');
    expect(page().querySelector('.rc-p12__hint')?.textContent).toBe('构不成三角形');
    expect(page().querySelector('.rc-resultcard')).toBeNull();
  });

  it('模式往返：ssa → sss 恢复 a/b/c 三输入与 v0.1 结果', () => {
    clickSeg('ssa');
    expect(fieldKeys()).toEqual(['a', 'c', 'A']);
    clickSeg('sss');
    expect(fieldKeys()).toEqual(['a', 'b', 'c']);
    expect(resultValue('∠C')).toBe('90.00°');
    expect(chipTexts()).toEqual(['直角三角形', '勾股校验通过']);
  });
});
