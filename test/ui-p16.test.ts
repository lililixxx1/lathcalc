// @vitest-environment happy-dom
/**
 * W11-B · p16 挂轮计算 页面测试
 *
 * 锚点（WAVE-PLAN-V4.1 §3）：
 *   - 默认 P=1.5 / T=6 → i = 1.5/6 = 0.25；五倍组 {20,…,100} 存在精确解，结果行误差 0.00、
 *     标「精确」徽标。
 *   - URL `#/p16?p=3.175&t=12` → i = 3.175/12 = 0.264583；穷举最优 20/55×40/55，
 *     ratio = 800/3025 = 0.264463、e = 455.52 ppm（V4.1 §3 金值）。
 *   - 齿数解析：逗号 / 空格分隔，去重升序；去重后 <4 提示不出结果（域校验同 core）。
 *   - 组件契约（V4.1 §4）：零内联 style、零十六进制色值、零新增 --la- 变量。
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRouter, type Router } from '../src/ui/router';

// happy-dom 环境下 import.meta.url 非 file 协议（ui-source.test.ts 为 node 环境），
// 故按项目根目录解析源码路径（vitest 以仓库根为 cwd）。
const PAGE_SOURCE = readFileSync(resolve(process.cwd(), 'src/ui/pages/p16.ts'), 'utf8');

let app: HTMLElement;
let router: Router;

function currentPage(): HTMLElement {
  const page = app.querySelector<HTMLElement>('.la-page');
  if (!page) throw new Error('p16 未渲染');
  return page;
}

function inputField(name: string): HTMLInputElement {
  const input = currentPage().querySelector<HTMLInputElement>(`input[name="${name}"]`);
  if (!input) throw new Error(`p16 输入框 ${name} 不存在`);
  return input;
}

function typeInto(name: string, value: string): void {
  const input = inputField(name);
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function rows(): HTMLElement[] {
  return [...currentPage().querySelectorAll<HTMLElement>('.rc-p16__row')];
}

function rowTexts(selector: string): string[] {
  return rows().map(
    (row) => row.querySelector<HTMLElement>(selector)?.textContent ?? '',
  );
}

function gearNumbers(): number[] {
  return rowTexts('.rc-p16__gear').flatMap((text) =>
    text.split(/[^\d]+/).filter(Boolean).map(Number),
  );
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

describe('p16 挂轮计算', () => {
  it('输入卡渲染：P/T 默认 1.5/6 + 自定义齿数入口（B 出口无预置组 chip）', async () => {
    await router.navigate('p16');
    const page = currentPage();
    expect(page.dataset.page).toBe('p16');
    expect(page.querySelector('.rc-topbar__title')?.textContent).toContain('挂轮计算');

    expect(inputField('p').value).toBe('1.5');
    expect(inputField('t').value).toBe('6');
    expect(inputField('teeth').value.length).toBeGreaterThan(0);

    // B 出口（V4.1 §3 预授权）：无预置齿轮组 SegChip，仅自定义齿数。
    expect(page.querySelector('.la-seg')).toBeNull();
    expect(page.querySelector('.la-chip')).toBeNull();
    expect(rows()).toHaveLength(8);
  });

  it('默认 1.5/6：结果表 8 行、误差 0.00 全行标「精确」、比值 6 位', async () => {
    await router.navigate('p16');
    expect(rows()).toHaveLength(8);

    // i_target = 1.5/6 = 0.25；五倍组存在大量精确解（如 30/60×40/80=0.25），
    // 前 8 组按 (errorPpm, a+b+c+d, 字典序) 全为 e=0。
    expect(rowTexts('.rc-p16__err')).toEqual(Array(8).fill('0.00'));
    expect(rowTexts('.rc-p16__ratio')[0]).toMatch(/^0\.250000$/);

    const badges = [...currentPage().querySelectorAll<HTMLElement>('.rc-p16__tag .rc-badge')];
    expect(badges).toHaveLength(8);
    for (const badge of badges) expect(badge.textContent).toBe('精确');
  });

  it('URL 键消费：#/p16?p=3.175&t=12 → 预填 + top1 20/55×40/55 / 0.264463 / 455.52', async () => {
    await router.navigate('p16', { p: 3.175, t: 12 });
    expect(window.location.hash).toBe('#/p16?p=3.175&t=12');

    expect(inputField('p').value).toBe('3.175');
    expect(inputField('t').value).toBe('12');

    // ratio = (20/55)×(40/55) = 800/3025 = 0.2644628099… → 6 位 0.264463；
    // e = |3.175/12 − 0.2644628099| / (3.175/12) × 10⁶ = 455.5215722… → 455.52。
    expect(rowTexts('.rc-p16__gear')[0]).toBe('20/55 × 40/55');
    expect(rowTexts('.rc-p16__ratio')[0]).toBe('0.264463');
    expect(rowTexts('.rc-p16__err')[0]).toBe('455.52');
    expect(rows()).toHaveLength(8);

    // 该算例无 e=0 方案（前 8 组均 455.52 / 463.18 ppm）→ 无「精确」徽标。
    expect(currentPage().querySelectorAll('.rc-p16__tag .rc-badge')).toHaveLength(0);

    const formula = currentPage().querySelector<HTMLElement>('.rc-p16__formula');
    expect(formula?.textContent).toContain('i = P / T = 3.175 / 12 = 0.264583');
    // 表下注：同值齿数需两件齿轮（V4.1 §3 口径）。
    expect(currentPage().textContent).toContain('同值齿数需两件齿轮');
  });

  it('自定义齿数解析：中英文逗号 / 空格分隔 + 去重升序', async () => {
    await router.navigate('p16');
    typeInto('teeth', '80，60, 40 20 60 40 100');

    expect(currentPage().querySelector('.rc-p16__setinfo')?.textContent).toBe(
      '已用齿数 5 枚：20 40 60 80 100',
    );
    expect(rows()).toHaveLength(8);
    const allowed = new Set([20, 40, 60, 80, 100]);
    for (const tooth of gearNumbers()) expect(allowed.has(tooth)).toBe(true);
  });

  it('齿数去重后 <4：提示且不出结果表；补足 4 枚后恢复', async () => {
    await router.navigate('p16');
    typeInto('teeth', '20 20 40 60');

    expect(currentPage().querySelector('.rc-p16__setinfo')?.textContent).toBe(
      '自定义齿数去重后至少 4 个（当前 3 个）',
    );
    expect(rows()).toHaveLength(0);
    expect(currentPage().textContent).toContain('至少 4 个');

    typeInto('teeth', '20 40 60 80');
    expect(rows()).toHaveLength(8);
  });

  it('P 输入非法（0）：提示且不出结果表', async () => {
    await router.navigate('p16');
    typeInto('p', '0');

    expect(rows()).toHaveLength(0);
    expect(currentPage().textContent).toContain('请输入大于 0 的工件螺距 P 与丝杠导程 T');
  });

  it('组件契约：无内联 style 色值、无十六进制色值、无新增 --la- 变量', async () => {
    await router.navigate('p16');

    expect(PAGE_SOURCE).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(PAGE_SOURCE).not.toMatch(/style\s*=/);
    expect(PAGE_SOURCE).not.toMatch(/--la-[a-z0-9-]+\s*:/);

    // DOM 侧同样不得出现内联 style（token 只走 tokens.css 变量引用）。
    const styled = currentPage().querySelectorAll('[style]');
    expect(styled).toHaveLength(0);
    // 仅使用既有组件出口（../components barrel），不直连组件文件。
    expect(PAGE_SOURCE).toContain("from '../components'");
    expect(PAGE_SOURCE).not.toMatch(/from '\.\.\/components\/[A-Za-z]+'/);
  });
});

// V4.8 挂轮系示意图（WAVE-PLAN-V4.8 §4 A2）：图随输入/选择重建，非法保帧。
// 默认 top1（独立穷举复算，排序键 (errorPpm, Σz, 字典序)）：P=1.5/T=6 →
// 20/40×20/40（Σ=120）；第 6 行 20/20×20/80；P=2/T=6（i=1/3）→ 20/30×20/40。
describe('p16 挂轮系示意图（V4.8）', () => {
  function diagramTexts(): string[] {
    return [...currentPage().querySelectorAll<HTMLElement>('.rc-p16__diagram svg text')].map(
      (el) => el.textContent ?? '',
    );
  }

  function diagramShapeCount(): number {
    return currentPage().querySelectorAll('.rc-p16__diagram svg circle').length;
  }

  function picks(): HTMLButtonElement[] {
    return [...currentPage().querySelectorAll<HTMLButtonElement>('.rc-p16__pick')];
  }

  it('默认帧：4 齿轮签 + 3 轴注 + 6 圆（4 齿轮 + 2 啮合点），第 1 行选中', async () => {
    await router.navigate('p16');
    // 默认字符串序：拉丁签在前，CJK 按码元 丝(U+4E1D) < 中(U+4E2D) < 主(U+4E3B)
    expect(diagramTexts().sort()).toEqual([
      'a 20',
      'b 40',
      'c 20',
      'd 40',
      '丝杠',
      '中间轴',
      '主轴',
    ]);
    expect(diagramShapeCount()).toBe(6);
    const pressed = picks().map((btn) => btn.getAttribute('aria-pressed'));
    expect(pressed[0]).toBe('true');
    expect(pressed.filter((value) => value === 'true')).toHaveLength(1);
  });

  it('点行 6（20/20 × 20/80）：图换 {a 20, b 20, c 20, d 80}，按钮态迁移', async () => {
    await router.navigate('p16');
    picks()[5]?.click();
    expect(diagramTexts().sort()).toEqual([
      'a 20',
      'b 20',
      'c 20',
      'd 80',
      '丝杠',
      '中间轴',
      '主轴',
    ]);
    expect(picks()[5]?.getAttribute('aria-pressed')).toBe('true');
    expect(picks()[0]?.getAttribute('aria-pressed')).toBe('false');
    // 挂轮格文案不因按钮化改变（既有行文案断言口径）
    expect(rowTexts('.rc-p16__gear')[5]).toBe('20/20 × 20/80');
  });

  it('P→2 重建：图回第 1 行 {a 20, b 30, c 20, d 40}，选中态重置', async () => {
    await router.navigate('p16');
    picks()[5]?.click();
    typeInto('p', '2');
    // i = 2/6 = 1/3 → top1 20/30×20/40（穷举独立复算）
    expect(diagramTexts().sort()).toEqual([
      'a 20',
      'b 30',
      'c 20',
      'd 40',
      '丝杠',
      '中间轴',
      '主轴',
    ]);
    expect(picks()[0]?.getAttribute('aria-pressed')).toBe('true');
  });

  it('P 非法（0）：hint 出现且示意图保上一帧（V4.8-04）', async () => {
    await router.navigate('p16');
    const before = diagramTexts().sort().join('/');
    typeInto('p', '0');
    expect(currentPage().textContent).toContain('请输入大于 0 的工件螺距 P 与丝杠导程 T');
    expect(diagramShapeCount()).toBe(6);
    expect(diagramTexts().sort().join('/')).toBe(before);
  });

  it('齿数去重后 <4：提示且示意图保上一帧（V4.8-04）', async () => {
    await router.navigate('p16');
    const before = diagramTexts().sort().join('/');
    typeInto('teeth', '20 25 30');
    expect(currentPage().querySelector('.rc-p16__setinfo')?.textContent).toContain(
      '自定义齿数去重后至少 4 个（当前 3 个）',
    );
    expect(diagramTexts().sort().join('/')).toBe(before);
  });
});
