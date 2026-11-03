// @vitest-environment happy-dom
/**
 * W4-C2 · p04 G76 参考程序测试
 *
 * 金测锚点（WAVE-PLAN §4 #7）：
 *   M30×3.5 → 行 2 P = 牙深 (30 − 26.21125)/2 = 1.894375 → 1894 μm（禁 1895）
 *   两行 = ['G76 P021060 Q100 R0.05', 'G76 X26.211 Z-30. P1894 Q400 F3.5']
 * P 位正名（W2-C5 裁决 2）：P021060 = 02 精车次数 / 10 退尾量（倒角量）/ 60 刀尖角。
 * 系统页签：仅 FANUC 可用；GSK / KND / 华中置灰 + 待补徽标（WAVE-PLAN §3 裁决 1）。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRouter, type Router } from '../src/ui/router';
import { fanucG76, G76_DISCLAIMER } from '../src/core/gcode';
import { threadDimensions } from '../src/core/thread';
import type { ThreadSpec } from '../src/core/types';

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
  const el = app.querySelector<HTMLElement>('.la-page[data-page="p04"]');
  if (!el) throw new Error('p04 未渲染');
  return el;
}

function codeLines(): string[] {
  return [...page().querySelectorAll<HTMLElement>('.rc-codecard__line')].map(
    (line) => line.textContent ?? '',
  );
}

function paramMap(): Record<string, string> {
  const map: Record<string, string> = {};
  for (const cell of page().querySelectorAll<HTMLElement>('.rc-param')) {
    const key = cell.dataset.key ?? '';
    map[key] = cell.querySelector('.rc-param__value')?.textContent ?? '';
  }
  return map;
}

/** M30×3.5 的 core 期望输出（与页面同一函数、同一参数） */
function coreM30Program(): string[] {
  const spec: ThreadSpec = {
    family: 'metric',
    designation: 'M30 × 3.5',
    pitch: 3.5,
    major: 30,
    flankAngle: 60,
  };
  const dims = threadDimensions(spec);
  return fanucG76({
    minorDiameter: dims.d1,
    endZ: -30,
    threadDepthMM: (30 - dims.d1) / 2,
    firstCutDepthMM: 0.4,
    lead: 3.5,
  }).lines;
}

describe('p04 M30×3.5 金测', () => {
  beforeEach(async () => {
    await router.navigate('p04', {
      family: 'metric',
      spec: 'M30 × 3.5',
      d: 30,
      p: 3.5,
    });
  });

  it('两行 G76 与 core fanucG76 输出逐字符一致（含 P1894 / 禁 1895）', () => {
    const lines = codeLines();
    expect(lines).toHaveLength(2);
    expect(lines).toEqual(coreM30Program());
    expect(lines).toEqual([
      'G76 P021060 Q100 R0.05',
      'G76 X26.211 Z-30. P1894 Q400 F3.5',
    ]);
    // 牙深 = (30 − 26.21125)/2 = 1.894375 mm → 1894 μm；H₁ 路径 1895 禁止出现
    expect((30 - 26.21125) / 2).toBeCloseTo(1.894375, 9);
    expect(page().textContent).not.toContain('1895');
  });

  it('参数卡六格逐值来自 fanucG76 输出', () => {
    expect(paramMap()).toEqual({
      '牙底 X': '26.211',
      '终点 Z': '-30.0',
      '牙高 P': '1894 μm',
      '首切 Q': '400 μm',
      '导程 F': '3.5',
      '精修 R': '0.05',
    });
  });

  it('P 位正名与牙深说明原样展示', () => {
    const note = page().querySelector('.rc-p04__pnote')?.textContent ?? '';
    expect(note).toContain('P021060 = 02 精车次数 · 10 退尾量（倒角量）· 60 刀尖角');
    expect(note).toContain('P = 牙深 (d − d₁)/2 = 1.894 mm → 1894 μm（非工作牙高 H₁）');
  });

  it('免责文案 = G76_DISCLAIMER 原句', () => {
    expect(page().querySelector('.rc-warn__text')?.textContent).toBe(G76_DISCLAIMER);
    expect(page().querySelector('.rc-warn__text')?.textContent).toBe(
      '代码为参考模板，上机前请核对系统、刀具、材料与安全间距。',
    );
  });

  it('复制程序写入两行文本', () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });

    page().querySelector<HTMLButtonElement>('.rc-btn.ghost')?.click();
    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText).toHaveBeenCalledWith(
      'G76 P021060 Q100 R0.05\nG76 X26.211 Z-30. P1894 Q400 F3.5',
    );
  });
});

describe('p04 系统页签（仅 FANUC）', () => {
  it('FANUC 可用；GSK / KND / 华中置灰并带「待补」徽标', async () => {
    await router.navigate('p04', {
      family: 'metric',
      spec: 'M30 × 3.5',
      d: 30,
      p: 3.5,
    });

    const items = [...page().querySelectorAll<HTMLButtonElement>('.la-seg .rc-seg__item')];
    expect(items.map((item) => item.textContent)).toEqual(['FANUC', '广数 GSK', 'KND', '华中']);
    expect(items[0]?.disabled).toBe(false);
    expect(items[0]?.classList.contains('on')).toBe(true);
    expect(items.slice(1).map((item) => item.disabled)).toEqual([true, true, true]);

    expect(page().querySelector('.rc-p04__meta .la-badge')?.textContent).toBe('待补');

    items[1]?.click();
    expect(items[0]?.classList.contains('on')).toBe(true);
    expect(items[1]?.classList.contains('on')).toBe(false);
  });
});

describe('p04 空参数与族路由', () => {
  it('直达 #/p04 无参数：提示先选型，不输出程序，按钮回 p02', async () => {
    await router.navigate('p04');

    expect(page().querySelector('.rc-codecard')).toBeNull();
    expect(page().querySelector('.rc-param')).toBeNull();
    expect(page().querySelector('.rc-warn__text')?.textContent).toBe(
      '未选择螺纹规格。请先在「螺纹 · 选型」中选择规格，再生成 G76 程序。',
    );

    page().querySelector<HTMLButtonElement>('.rc-btn')?.click();
    await vi.waitFor(() => expect(router.current()).toBe('p02'));
  });

  it('55° 管 G1/2：X18.632 / P1162 / F1.814（core 重算）', async () => {
    await router.navigate('p04', {
      family: 'pipe',
      spec: 'G1/2',
      d: 20.955,
      p: 25.4 / 14,
    });

    expect(codeLines()).toEqual([
      'G76 P021060 Q100 R0.05',
      'G76 X18.632 Z-30. P1162 Q400 F1.814',
    ]);
    expect(paramMap()['牙底 X']).toBe('18.632');
    expect(paramMap()['牙高 P']).toBe('1162 μm');
    expect(paramMap()['导程 F']).toBe('1.814');
  });
});

describe('W4-C2 金测链：p02 选型 → p03 结果 → p04 G76', () => {
  it('M30×3.5 全链路（d₂=27.727 → 两行 G76）', async () => {
    await router.navigate('p02');
    const m30 = [...app.querySelectorAll<HTMLElement>('.rc-lrow')].find(
      (row) => row.querySelector('.rc-lrow__name')?.textContent === 'M30 × 3.5',
    );
    expect(m30).toBeDefined();
    m30?.click();
    await vi.waitFor(() => expect(router.current()).toBe('p03'));

    // d₂ = 30 − 0.6495×3.5 = 27.72675 → 27.727
    expect(
      app.querySelector<HTMLElement>(
        '.la-resrow[data-label="中径 d₂"] .rc-resultcard__value',
      )?.textContent,
    ).toBe('27.727');

    app.querySelector<HTMLButtonElement>('.rc-btn')?.click();
    await vi.waitFor(() => expect(router.current()).toBe('p04'));

    expect(codeLines()).toEqual([
      'G76 P021060 Q100 R0.05',
      'G76 X26.211 Z-30. P1894 Q400 F3.5',
    ]);
  });
});
