// @vitest-environment happy-dom
/**
 * W4-C5 · p13 速查页测试
 *
 * 设计稿区块：5 项分类分段 / G 代码列表卡 10 行 / 底部说明。
 * 数据锚：src/data/gcode-ref.json（10 行）经 core/lookup.gcodeRef 排序后原样展示；
 * G76 行 desc 的「仅 FANUC；GSK/KND/华中待补」注记必须逐字可见。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRouter, type Router } from '../src/ui/router';
import { gcodeRef } from '../src/core/lookup';
import type { GcodeRefRow } from '../src/core/types';
import gcodeJson from '../src/data/gcode-ref.json';

const GCODE_ROWS = gcodeRef(gcodeJson as unknown as GcodeRefRow[]);

let app: HTMLElement;
let router: Router;

function page(): HTMLElement {
  const element = app.querySelector<HTMLElement>('.la-page[data-page="p13"]');
  if (!element) throw new Error('p13 未渲染');
  return element;
}

function rows(): HTMLElement[] {
  return [...page().querySelectorAll<HTMLElement>('.rc-p13__list .la-lrow')];
}

function clickSeg(label: string): void {
  const item = [...page().querySelectorAll<HTMLButtonElement>('.rc-seg__item')].find(
    (button) => button.textContent === label,
  );
  if (!item) throw new Error(`分段项 ${label} 不存在`);
  item.click();
}

beforeEach(async () => {
  document.body.innerHTML = '<div id="app"></div>';
  window.location.hash = '';
  app = document.querySelector<HTMLElement>('#app') as HTMLElement;
  router = createRouter({ root: app });
  await router.start();
  await router.navigate('p13');
});

afterEach(() => {
  router.destroy();
  document.body.replaceChildren();
  vi.restoreAllMocks();
  delete (navigator as unknown as { clipboard?: unknown }).clipboard;
});

describe('p13 结构保真', () => {
  it('顶栏 / 5 项分类分段（G 代码默认选中）/ 底部说明', () => {
    const root = page();
    expect(root.querySelector('.rc-topbar__title')?.textContent).toBe('速查');
    const items = [...root.querySelectorAll<HTMLElement>('.rc-seg__item')];
    expect(items.map((item) => item.textContent)).toEqual(['G 代码', '螺纹', '莫氏', '钻头', '硬度']);
    expect(root.querySelector('.la-seg')?.classList.contains('small')).toBe(true);
    expect(items[0]?.classList.contains('on')).toBe(true);
    expect(root.querySelector('.rc-p13__foot')?.textContent).toBe('点按复制代码 · 内容持续补充');
  });

  it('G 代码列表 = gcode-ref 10 行，code 顺序与 desc 逐行一致', () => {
    const list = rows();
    expect(GCODE_ROWS).toHaveLength(10);
    expect(list).toHaveLength(10);
    const codes = list.map((row) => row.querySelector('.rc-lrow__mono')?.textContent ?? '');
    const descriptions = list.map((row) => row.querySelector('.rc-lrow__desc')?.textContent ?? '');
    expect(codes).toEqual(GCODE_ROWS.map((row) => row.code));
    expect(codes).toEqual(['G01', 'G02', 'G03', 'G04', 'G20/21', 'G76', 'G92', 'M03', 'M05', 'M30']);
    expect(descriptions).toEqual(GCODE_ROWS.map((row) => row.desc));
  });

  it('G76 行注记原样可见：「仅 FANUC；GSK/KND/华中待补」', () => {
    const g76 = rows().find(
      (row) => row.querySelector('.rc-lrow__mono')?.textContent === 'G76',
    );
    const text = g76?.querySelector('.rc-lrow__desc')?.textContent ?? '';
    expect(text).toContain('螺纹切削复合循环');
    expect(text).toContain('仅 FANUC；GSK/KND/华中待补');
    expect(text).toBe('螺纹切削复合循环（两行式模板，仅 FANUC；GSK/KND/华中待补）');
  });
});

describe('p13 复制与分类切换', () => {
  it('点按行复制 G 代码（navigator.clipboard.writeText 收到 code）', () => {
    const writeText = vi.fn<(text: string) => Promise<void>>().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });

    const g01 = rows().find((row) => row.querySelector('.rc-lrow__mono')?.textContent === 'G01');
    g01?.click();
    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText).toHaveBeenCalledWith('G01');
  });

  it('切到「螺纹」显示诚实空态；切回「G 代码」恢复 10 行', () => {
    clickSeg('螺纹');
    expect(rows()).toHaveLength(0);
    expect(page().querySelector('.rc-p13__list')?.textContent).toContain(
      '螺纹数据请使用「螺纹 · 选型」页查询',
    );
    clickSeg('G 代码');
    expect(rows()).toHaveLength(10);
  });

  it('钻头 / 硬度空态文案不含伪造数值', () => {
    clickSeg('钻头');
    expect(page().querySelector('.rc-p13__list')?.textContent).toContain('钻头分类暂无数据');
    clickSeg('硬度');
    expect(page().querySelector('.rc-p13__list')?.textContent).toContain('硬度换算暂无数据');
  });
});
