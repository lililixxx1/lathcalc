// @vitest-environment happy-dom
/**
 * ui-p15.test.ts · 宏程序库页面（W11-A）
 *
 * 断言口径（WAVE-PLAN-V4.1 §2/§4）：
 *   - 四模板 Segmented 切换 → 程序卡行与 core.buildMacro 输出逐字符一致；
 *   - URL 键 tpl=ellipse|knurl|oilslot|groove（非法回落 ellipse）；
 *   - 程序行为 WHILE 循环体（非展开点列）；
 *   - 免责文案 = G76_DISCLAIMER 原句；
 *   - 参数域错误显示含「参数」；
 *   - 组件契约：只用既有组件类名，页面无内联 style 色值（V4.1 §4）。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRouter, type Router } from '../src/ui/router';
import { MACRO_TEMPLATES, buildMacro } from '../src/core/macro';
import { G76_DISCLAIMER } from '../src/core/gcode';
import type { MacroTemplateId } from '../src/core/types';

let app: HTMLElement;
let router: Router;

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
  vi.restoreAllMocks();
  delete (navigator as unknown as { clipboard?: unknown }).clipboard;
});

function page(): HTMLElement {
  const el = app.querySelector<HTMLElement>('.la-page[data-page="p15"]');
  if (!el) throw new Error('p15 未渲染');
  return el;
}

function specOf(id: MacroTemplateId) {
  const spec = MACRO_TEMPLATES.find((item) => item.id === id);
  if (!spec) throw new Error(`测试夹具缺少模板 ${id}`);
  return spec;
}

/** 页面同源期望：core.buildMacro + MacroParamSpec.defaultValue */
function coreLines(id: MacroTemplateId): string[] {
  const values: Record<string, number> = {};
  for (const param of specOf(id).params) values[param.key] = param.defaultValue;
  return buildMacro(id, values).lines;
}

function codeLines(): string[] {
  return [...page().querySelectorAll<HTMLElement>('.rc-codecard__line')].map(
    (line) => line.textContent ?? '',
  );
}

function tabItems(): HTMLButtonElement[] {
  return [
    ...page().querySelectorAll<HTMLButtonElement>(
      '.la-seg[aria-label="宏模板"] .rc-seg__item',
    ),
  ];
}

function activeTab(): string {
  return tabItems().find((item) => item.classList.contains('on'))?.dataset.value ?? '';
}

describe('p15 宏程序库 · 四模板', () => {
  it('四模板 Segmented 渲染；点击切换后程序行 = core.buildMacro 输出', async () => {
    await router.navigate('p15');

    expect(tabItems().map((item) => item.textContent)).toEqual(['椭圆', '网纹', '油槽', '切槽']);
    expect(tabItems().map((item) => item.dataset.value)).toEqual([
      'ellipse',
      'knurl',
      'oilslot',
      'groove',
    ]);
    expect(activeTab()).toBe('ellipse');

    for (const id of ['ellipse', 'knurl', 'oilslot', 'groove'] as const) {
      tabItems()
        .find((item) => item.dataset.value === id)
        ?.click();
      expect(activeTab()).toBe(id);
      expect(codeLines()).toEqual(coreLines(id));
    }
  });

  it('程序行为 WHILE 循环体（非展开点列），行数与 core 输出一致', async () => {
    await router.navigate('p15');
    const lines = codeLines();
    const expected = coreLines('ellipse');

    // 自指计数：页面行数 = 同一 core 调用的行数；不手打魔法数
    expect(lines).toEqual(expected);
    expect(lines).toHaveLength(expected.length);
    expect(lines.length).toBeGreaterThan(0);
    // 椭圆缺省 = 单层 WHILE 循环体（锚点行 V4.1 §2）
    expect(lines.filter((line) => line.startsWith('WHILE'))).toHaveLength(1);
    expect(lines).toContain('WHILE [#4 LT #5] DO1');
    expect(lines).toContain('G01 X#6 Z#7');
  });

  it('免责文案 = G76_DISCLAIMER 原句', async () => {
    await router.navigate('p15');
    const text = page().querySelector('.rc-p15__disclaimer .rc-warn__text')?.textContent;
    expect(text).toBe(G76_DISCLAIMER);
    // gcode.ts:8 原句（报告 §7.4）
    expect(text).toBe('代码为参考模板，上机前请核对系统、刀具、材料与安全间距。');
  });

  it('tpl 键消费：groove 直达；非法值回落 ellipse', async () => {
    await router.navigate('p15', { tpl: 'groove' });
    expect(activeTab()).toBe('groove');
    expect(codeLines()).toEqual(coreLines('groove'));

    await router.navigate('p15', { tpl: 'nope' });
    expect(activeTab()).toBe('ellipse');
    expect(codeLines()).toEqual(coreLines('ellipse'));
  });

  it('参数域报错：a=0 → 显示含「参数」错误并撤下程序卡；恢复后重新生成', async () => {
    await router.navigate('p15');
    const input = page().querySelector<HTMLInputElement>('.rc-input__field[name="a"]');
    if (!input) throw new Error('X 半轴 a 输入框未渲染');

    input.value = '0';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    // 0 < min=1 → core 抛「参数「X 半轴 a」超出范围 1–500mm」（W12 A4-W4a 轴命名）
    expect(page().querySelector('.rc-p15__error')?.textContent).toContain('参数');
    expect(page().querySelector('.rc-codecard')).toBeNull();

    input.value = '15';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(page().querySelector('.rc-codecard')).not.toBeNull();
    expect(codeLines()).toEqual(coreLines('ellipse'));
  });

  it('组件契约：参数表单按 MacroParamSpec 驱动，页面无内联 style 色值', async () => {
    await router.navigate('p15');

    // 参数键顺序 = MacroParamSpec.params（椭圆 V4.1 §2：a/b/Δt/t₀/t₁/f）
    const inputNames = [
      ...page().querySelectorAll<HTMLInputElement>('.rc-input__field'),
    ].map((input) => input.name);
    expect(inputNames).toEqual(specOf('ellipse').params.map((param) => param.key));

    // V4.1 §4：零内联硬编码色值
    const offenders = [...page().querySelectorAll<HTMLElement>('[style]')].filter((el) => {
      const style = el.getAttribute('style') ?? '';
      return /color|background|#[0-9a-fA-F]{3,8}/.test(style);
    });
    expect(offenders).toEqual([]);

    // 既有组件类名齐套
    for (const selector of [
      '.la-seg[aria-label="宏模板"]',
      '.la-card',
      '.la-input',
      '.la-code',
      '.la-warn',
      '.la-acc',
    ]) {
      expect(page().querySelector(selector)).not.toBeNull();
    }
  });

  it('复制程序写入当前模板 lines', async () => {
    await router.navigate('p15');
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });

    page().querySelector<HTMLButtonElement>('.rc-btn.ghost')?.click();
    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText).toHaveBeenCalledWith(coreLines('ellipse').join('\n'));
  });

  it('notes 折叠：标题「怎么算的」，展开含油槽算式与自研口径注', async () => {
    await router.navigate('p15', { tpl: 'oilslot' });
    const head = page().querySelector<HTMLButtonElement>('.rc-acc__head');
    const body = page().querySelector<HTMLElement>('.rc-acc__body');
    if (!head || !body) throw new Error('notes 折叠未渲染');

    expect(page().querySelector('.rc-acc__title')?.textContent).toBe('怎么算的');
    expect(body.hidden).toBe(true);
    head.click();
    expect(body.hidden).toBe(false);
    expect(body.textContent).toContain('X = X₀ + A·SIN[360·(Z−Zφ)/P]');
    // 派工单上报条件：检索不足 → 自研近似结构披露
    expect(body.textContent).toContain('自研近似结构，非标准工艺文件');
  });
});
