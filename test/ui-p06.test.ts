// @vitest-environment happy-dom
/**
 * W4-C3 · p06 圆弧切点计算
 *
 * 断言：AC01 金测（切点 36/0、G02、程序行 'G02 X36 Z0 R5.0'）；12 工况默认参数
 * 全部可求解且程序行与 core 输出逐字一致；前/后刀架 G02↔G03 对调；输入即算；
 * 无效参数错误呈现；空 / 非法工况号选择器兜底。
 * 期望程序行来自 tree 内 test/arc-cases-a/b 的黄金用例，不采用设计稿 mock 值。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { arcCasesA } from '../src/core/arc-cases-a';
import { arcCasesB } from '../src/core/arc-cases-b';
import type { ArcCaseSolver } from '../src/core/types';
import { createRouter, type Router } from '../src/ui/router';

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
});

interface CaseSpec {
  id: string;
  name: string;
  input: Record<string, number>;
  inputKeys: readonly string[];
  gcode: string;
}

const CASES: readonly CaseSpec[] = [
  {
    id: 'AC01',
    name: '直线—圆弧相切',
    input: { R: 5, angle: 45, stepD: 36 },
    inputKeys: ['R', 'angle', 'stepD'],
    gcode: 'G02 X36 Z0 R5.0',
  },
  {
    id: 'AC02',
    name: '两圆弧外切',
    input: { R1: 10, R2: 15, dZ: 15 },
    inputKeys: ['R1', 'R2', 'dZ'],
    gcode: 'G02 X16 Z6 R10.0',
  },
  {
    id: 'AC03',
    name: '两圆弧内切',
    input: { R1: 25, R2: 10, dZ: 9 },
    inputKeys: ['R1', 'R2', 'dZ'],
    gcode: 'G02 X40 Z15 R25.0',
  },
  {
    id: 'AC04',
    name: '圆弧—斜线—圆弧',
    input: { R1: 5, R2: 3, angle: 45 },
    inputKeys: ['R1', 'R2', 'angle'],
    gcode: 'G03 X11.314 Z5.657 R3.0',
  },
  {
    id: 'AC05',
    name: '台阶倒圆',
    input: { R: 4, stepX: 20, stepZ: -10 },
    inputKeys: ['R', 'stepX', 'stepZ'],
    gcode: 'G03 X28 Z-10 R4.0',
  },
  {
    id: 'AC06',
    name: '凹圆弧切入',
    input: { R: 10, dX: 12, dZ: 8 },
    inputKeys: ['R', 'dX', 'dZ'],
    gcode: 'G03 X12 Z8 R10.0',
  },
  {
    id: 'AC07',
    name: '凸圆弧收尾',
    input: { R: 5, dX: 30, dZ: -30 },
    inputKeys: ['R', 'dX', 'dZ'],
    gcode: 'G03 X20 Z-30 R5.0',
  },
  {
    id: 'AC08',
    name: '端面切弧',
    input: { R: 6, dZ: -4 },
    inputKeys: ['R', 'dZ'],
    gcode: 'G03 X11.314 Z0 R6.0',
  },
  {
    id: 'AC09',
    name: '锥面切弧',
    input: { R: 5, angle: 30 },
    inputKeys: ['R', 'angle'],
    gcode: 'G03 X8.66 Z7.5 R5.0',
  },
  {
    id: 'AC10',
    name: '圆弧螺纹入口',
    input: { R: 5, lead: 3.5 },
    inputKeys: ['R', 'lead'],
    gcode: 'G03 X10 Z0 R5.0',
  },
  {
    id: 'AC11',
    name: '球面收尾',
    input: { R: 10 },
    inputKeys: ['R'],
    gcode: 'G02 X20 Z0 R10.0',
  },
  {
    id: 'AC12',
    name: '内孔圆弧过渡',
    input: { R: 3, boreD: 20 },
    inputKeys: ['R', 'boreD'],
    gcode: 'G02 X26 Z0 R3.0',
  },
];

function coreSolver(id: string): ArcCaseSolver {
  const solver = [...arcCasesA, ...arcCasesB].find((entry) => entry.id === id);
  if (!solver) throw new Error(`missing core solver ${id}`);
  return solver;
}

function p06Page(): HTMLElement | null {
  return app.querySelector<HTMLElement>('.la-page[data-page="p06"]');
}

function rowValue(label: string): string {
  const rows = Array.from(p06Page()?.querySelectorAll<HTMLElement>('.rc-resultcard__row') ?? []);
  const row = rows.find((entry) => entry.dataset.label === label);
  return row?.querySelector('.rc-resultcard__value, .rc-resultcard__mono')?.textContent ?? '';
}

function codeLine(): string {
  return p06Page()?.querySelector('.rc-codecard__line')?.textContent ?? '';
}

function inputEl(name: string): HTMLInputElement {
  const input = p06Page()?.querySelector<HTMLInputElement>(`input[name="${name}"]`);
  if (!input) throw new Error(`missing input ${name}`);
  return input;
}

function type(name: string, value: string): void {
  const input = inputEl(name);
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function click(selector: string): void {
  const target = p06Page()?.querySelector<HTMLElement>(selector);
  if (!target) throw new Error(`missing element ${selector}`);
  target.click();
}

function badgeText(): string {
  return p06Page()?.querySelector('.rc-topbar__title .la-badge')?.textContent ?? '';
}

describe('p06 切点计算', () => {
  it('AC01 金测：切点 X36/Z0、前刀架 G02、程序行与 core 逐字一致', async () => {
    await router.navigate('p06', { case: 'AC01' });

    expect(p06Page()).not.toBeNull();
    expect(p06Page()?.querySelector('.rc-topbar__title')?.textContent).toContain('直线—圆弧相切');
    expect(badgeText()).toBe('工况 01');
    expect(
      Array.from(p06Page()?.querySelectorAll<HTMLInputElement>('.rc-p06__form input') ?? []).map(
        (input) => input.name,
      ),
    ).toEqual(['R', 'angle', 'stepD']);
    expect(inputEl('R').value).toBe('5');
    expect(inputEl('angle').value).toBe('45');
    expect(inputEl('stepD').value).toBe('36');

    expect(rowValue('切点 X')).toBe('36');
    expect(rowValue('切点 Z')).toBe('0');
    expect(rowValue('圆心 · R')).toBe('X28.929 · Z3.536 · R5.0');
    expect(rowValue('判向依据')).toBe('前刀架 T3 · 图面顺时针 → G02');
    expect(codeLine()).toBe('G02 X36 Z0 R5.0');

    const core = coreSolver('AC01').solve(CASES[0]!.input);
    expect(core.tangent.x).toBe(36);
    expect(core.tangent.z).toBe(0);
    expect(core.direction).toBe('G02');
    expect(core.gcodeLine).toBe('G02 X36 Z0 R5.0');
    expect(codeLine()).toBe(core.gcodeLine);

    expect(p06Page()?.querySelector('.rc-p06__diagram svg')).not.toBeNull();
    expect(p06Page()?.querySelector('.rc-acc__body')?.textContent).toContain(
      '圆心 C = P − R·n(α)',
    );
  });

  it('12 工况默认参数全部可求解：表单键集 / 零异常 / 程序行与 core 逐字一致', async () => {
    for (const spec of CASES) {
      await router.navigate('p06', { case: spec.id });
      expect(p06Page()).not.toBeNull();
      expect(p06Page()?.querySelector('.rc-topbar__title')?.textContent).toContain(spec.name);
      expect(badgeText()).toBe(`工况 ${spec.id.slice(2)}`);
      expect(
        Array.from(
          p06Page()?.querySelectorAll<HTMLInputElement>('.rc-p06__form input') ?? [],
        ).map((input) => input.name),
      ).toEqual([...spec.inputKeys]);
      expect(p06Page()?.querySelector('.rc-warn')).toBeNull();
      expect(codeLine()).toBe(spec.gcode);
      expect(codeLine()).toBe(coreSolver(spec.id).solve(spec.input).gcodeLine);
    }
  });

  it('前/后刀架切换 AC01：G02 → G03 对调，切点几何不变', async () => {
    await router.navigate('p06', { case: 'AC01' });
    expect(codeLine()).toBe('G02 X36 Z0 R5.0');
    expect(rowValue('判向依据')).toBe('前刀架 T3 · 图面顺时针 → G02');

    click('.rc-p06__toolbar .rc-seg__item[data-value="rear"]');
    expect(codeLine()).toBe('G03 X36 Z0 R5.0');
    expect(rowValue('判向依据')).toBe('后刀架 · 图面顺时针 → G03（前后刀架对调）');
    expect(rowValue('切点 X')).toBe('36');
    expect(rowValue('切点 Z')).toBe('0');

    const rearItem = p06Page()?.querySelector<HTMLElement>(
      '.rc-p06__toolbar .rc-seg__item[data-value="rear"]',
    );
    expect(rearItem?.classList.contains('on')).toBe(true);
    expect(rearItem?.getAttribute('aria-selected')).toBe('true');

    click('.rc-p06__toolbar .rc-seg__item[data-value="front"]');
    expect(codeLine()).toBe('G02 X36 Z0 R5.0');
    expect(rowValue('判向依据')).toBe('前刀架 T3 · 图面顺时针 → G02');
  });

  it('前/后刀架切换 AC05：G03 → G02 反向对调', async () => {
    await router.navigate('p06', { case: 'AC05' });
    expect(codeLine()).toBe('G03 X28 Z-10 R4.0');
    expect(rowValue('判向依据')).toBe('前刀架 T3 · 图面逆时针 → G03');

    click('.rc-p06__toolbar .rc-seg__item[data-value="rear"]');
    expect(codeLine()).toBe('G02 X28 Z-10 R4.0');
    expect(rowValue('判向依据')).toBe('后刀架 · 图面逆时针 → G02（前后刀架对调）');
  });

  it('输入即算：AC01 改为 R3 / α30° / 台阶Ø20 命中 core 例 2', async () => {
    await router.navigate('p06', { case: 'AC01' });

    type('R', '3');
    type('angle', '30');
    type('stepD', '20');

    expect(codeLine()).toBe('G02 X20 Z0 R3.0');
    expect(rowValue('切点 X')).toBe('20');
    expect(rowValue('切点 Z')).toBe('0');
    expect(rowValue('圆心 · R')).toBe('X14.804 · Z1.5 · R3.0');
  });

  it('无效参数：core 抛错显示 WarnCard，修正后恢复程序行', async () => {
    await router.navigate('p06', { case: 'AC01' });

    type('R', '0');
    expect(p06Page()?.querySelector('.rc-warn')?.textContent).toContain('AC01: R must be > 0');
    expect(p06Page()?.querySelector('.rc-codecard')).toBeNull();

    type('R', '5');
    expect(p06Page()?.querySelector('.rc-warn')).toBeNull();
    expect(codeLine()).toBe('G02 X36 Z0 R5.0');

    type('R', '');
    expect(p06Page()?.querySelector('.rc-warn')?.textContent).toContain(
      '请输入有效参数：圆弧 R',
    );
  });

  it('空参数直达：12 工况选择器兜底，选中后进入计算', async () => {
    await router.navigate('p06');
    expect(p06Page()).not.toBeNull();
    expect(p06Page()?.querySelectorAll('.rc-p06__picker .rc-chip')).toHaveLength(12);
    expect(p06Page()?.querySelector('.rc-codecard')).toBeNull();

    const chips = Array.from(
      p06Page()?.querySelectorAll<HTMLElement>('.rc-p06__picker .rc-chip') ?? [],
    );
    const target = chips.find((chip) => chip.textContent === '05 台阶倒圆');
    expect(target).toBeDefined();
    target?.click();

    await vi.waitFor(() => expect(window.location.hash).toBe('#/p06?case=AC05'));
    await vi.waitFor(() => expect(codeLine()).toBe('G03 X28 Z-10 R4.0'));
    expect(badgeText()).toBe('工况 05');
  });

  it('非法工况号：选择器兜底并提示无效工况号', async () => {
    await router.navigate('p06', { case: 'AC99' });

    expect(p06Page()?.querySelectorAll('.rc-p06__picker .rc-chip')).toHaveLength(12);
    expect(p06Page()?.querySelector('.rc-p06__picker-card')?.textContent).toContain('AC99');
    expect(p06Page()?.querySelector('.rc-codecard')).toBeNull();
  });

  it('AC07 后刀架：G03→G02 对调（core b 组翻转 W4-C3 R-1 补位后全工况生效）', async () => {
    await router.navigate('p06', { case: 'AC07' });
    expect(codeLine()).toBe('G03 X20 Z-30 R5.0');

    click('.rc-p06__toolbar .rc-seg__item[data-value="rear"]');
    expect(rowValue('判向依据')).toBe('后刀架 · 图面逆时针 → G02（前后刀架对调）');
    expect(codeLine()).toBe('G02 X20 Z-30 R5.0');
  });

  it('顶栏返回回到工况图库 p05', async () => {
    await router.navigate('p06', { case: 'AC01' });

    click('.rc-topbar__back');
    await vi.waitFor(() => expect(router.current()).toBe('p05'));
    expect(app.querySelector('.la-page[data-page="p05"]')).not.toBeNull();
  });
});
