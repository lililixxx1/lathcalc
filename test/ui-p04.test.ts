// @vitest-environment happy-dom
/**
 * W4-C2 · p04 G76 参考程序测试；W6-C2 三系统解灰 + 循环形式；W8-B GSK 型号 + HNC G82
 *
 * 金测锚点（WAVE-PLAN §4 #7 / WAVE-PLAN-V2 §4 / WAVE-PLAN-V3 §4）：
 *   M30×3.5 → 行 2 P = 牙深 (30 − 26.21125)/2 = 1.894375 → 1894 μm（禁 1895）
 *   FANUC 两行 = ['G76 P021060 Q100 R0.05', 'G76 X26.211 Z-30. P1894 Q400 F3.5']
 *   KND 两行   = ['G76 P021060 Q100 R50',  'G76 X26.211 Z-30. P1894 Q400 F3.5']（R50=0.05×1000）
 *   HNC 单行   = 'G76 C2 R0 E0 A60 X26.211 Z-30. I0 K1.894 U0.05 V0.1 Q0.4 P0 F3.5'
 *   GSK 988TA  = ['G76 P021060 Q0.1 R0.05', 'G76 X26.211 Z-30. P1.894 Q0.4 F3.5']（mm 小数）
 *   GSK 980TDc = ['G76 P021060 Q1000 R0.05', 'G76 X26.211 Z-30. P18944 Q4000 F3.5']（0.0001mm 增量）
 *   G92 单行   = 'G92 X26.211 Z-30. F3.5'（lines.length===1，G0-B2）
 *   HNC G82    = 'G82 X26.211 Z-30. I0 R0 E0 C1 P0 F3.5'（§1 行4 脚注模板）
 * 来源：docs/research/g76-dialects.md §1 行1–6（W6-C1 双源调研）+ WAVE-PLAN-V3 V3-3/V3-4。
 * P 位正名（W2-C5 裁决 2）：P021060 = 02 精车次数 / 10 退尾量（倒角量）/ 60 刀尖角。
 * enable 矩阵（WAVE-PLAN-V3 起）：G76 / G92 两形式均四系统全可用（W6 置灰解除）。
 * URL 键：system=fanuc|gsk|knd|hnc、cycle=g76|g92、gskmodel=988ta|980tdc（默认 988ta）。
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

function page03(): HTMLElement {
  const el = app.querySelector<HTMLElement>('.la-page[data-page="p03"]');
  if (!el) throw new Error('p03 未渲染');
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

function paramKeys(): string[] {
  return [...page().querySelectorAll<HTMLElement>('.rc-param')].map(
    (cell) => cell.dataset.key ?? '',
  );
}

/** 按 aria-label 取 Segmented 项（系统 / 循环形式两组） */
function segItems(ariaLabel: string): HTMLButtonElement[] {
  return [
    ...page().querySelectorAll<HTMLButtonElement>(
      `.la-seg[aria-label="${ariaLabel}"] .rc-seg__item`,
    ),
  ];
}

function badgeText(): string {
  return page().querySelector('.rc-topbar__title .la-badge')?.textContent ?? '';
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

const M30_PARAMS = { family: 'metric', spec: 'M30 × 3.5', d: 30, p: 3.5 };

describe('p04 M30×3.5 金测', () => {
  beforeEach(async () => {
    await router.navigate('p04', M30_PARAMS);
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

describe('p04 系统页签 · 两形式 enable 矩阵全开（V3-3/V3-4 解灰）', () => {
  it('G76 形式：四系统全可用、无置灰项、无置灰提示（GSK 解灰）', async () => {
    await router.navigate('p04', M30_PARAMS);

    const items = segItems('数控系统');
    expect(items.map((item) => item.textContent)).toEqual(['FANUC', '广数 GSK', 'KND', '华中']);
    expect(items.map((item) => item.disabled)).toEqual([false, false, false, false]);
    expect(items[0]?.classList.contains('on')).toBe(true);

    // 两态 sysnote 随解灰整体移除：旧 GSK 置灰文案不得残留
    expect(page().querySelector('.rc-p04__sysnote')).toBeNull();
    expect(page().textContent).not.toContain('暂不生成');
    expect(page().querySelector('.rc-p04__meta .la-badge')).toBeNull();
  });

  it('G76 形式点选 GSK：生效并出现型号页签（默认 988TA mm）', async () => {
    await router.navigate('p04', M30_PARAMS);
    segItems('数控系统')[1]?.click();

    expect(badgeText()).toBe('广数 GSK');
    expect(segItems('数控系统')[1]?.classList.contains('on')).toBe(true);
    expect(segItems('GSK 型号').map((item) => item.textContent)).toEqual([
      '988TA mm',
      '980TDc 增量',
    ]);
    expect(segItems('GSK 型号')[0]?.classList.contains('on')).toBe(true);
    expect(codeLines()).toEqual([
      'G76 P021060 Q0.1 R0.05',
      'G76 X26.211 Z-30. P1.894 Q0.4 F3.5',
    ]);
  });

  it('G76 形式默认选中；循环形式页签标签与默认态正确', async () => {
    await router.navigate('p04', M30_PARAMS);

    const cycles = segItems('循环形式');
    expect(cycles.map((item) => item.textContent)).toEqual(['G76 复合循环', 'G92 直进循环']);
    expect(cycles[0]?.classList.contains('on')).toBe(true);
    expect(cycles[1]?.classList.contains('on')).toBe(false);
  });
});

describe('p04 G92 直进形式 enable 矩阵（V3-4 解灰）', () => {
  it('G92 形式：四系统全可用、无置灰提示；点选华中生成 G82', async () => {
    await router.navigate('p04', { ...M30_PARAMS, cycle: 'g92' });

    const items = segItems('数控系统');
    expect(items.map((item) => item.disabled)).toEqual([false, false, false, false]);
    expect(page().querySelector('.rc-p04__sysnote')).toBeNull();
    expect(page().textContent).not.toContain('请用 G82');

    items[3]?.click();
    expect(badgeText()).toBe('华中');
    expect(segItems('数控系统')[3]?.classList.contains('on')).toBe(true);
    expect(codeLines()).toEqual(['G82 X26.211 Z-30. I0 R0 E0 C1 P0 F3.5']);
  });

  it('G76 形式先选华中再切 G92：保持华中（不再回落 FANUC），直接出 G82', async () => {
    await router.navigate('p04', { ...M30_PARAMS, system: 'hnc' });
    expect(badgeText()).toBe('华中');
    expect(segItems('数控系统')[3]?.classList.contains('on')).toBe(true);

    segItems('循环形式')[1]?.click();

    expect(segItems('循环形式')[1]?.classList.contains('on')).toBe(true);
    expect(segItems('数控系统')[3]?.classList.contains('on')).toBe(true);
    expect(badgeText()).toBe('华中');
    expect(codeLines()).toEqual(['G82 X26.211 Z-30. I0 R0 E0 C1 P0 F3.5']);
  });

  it('初始 URL system=hnc&cycle=g92 直达：G82 单行（不再是禁用格回落）', async () => {
    await router.navigate('p04', { ...M30_PARAMS, system: 'hnc', cycle: 'g92' });

    expect(segItems('数控系统')[3]?.classList.contains('on')).toBe(true);
    expect(badgeText()).toBe('华中');
    expect(codeLines()).toEqual(['G82 X26.211 Z-30. I0 R0 E0 C1 P0 F3.5']);
  });

  it('G76 → G92 切换后代码卡单行、参数卡收缩为三项', async () => {
    await router.navigate('p04', M30_PARAMS);
    expect(codeLines()).toHaveLength(2);

    segItems('循环形式')[1]?.click();

    expect(codeLines()).toEqual(['G92 X26.211 Z-30. F3.5']);
    expect(paramKeys()).toEqual(['牙底 X', '终点 Z', '导程 F']);
    expect(paramMap()).toEqual({
      '牙底 X': '26.211',
      '终点 Z': '-30.0',
      '导程 F': '3.5',
    });
    // W6-C1-04 裁决文案
    expect(page().querySelector('.rc-p04__pnote')?.textContent).toBe(
      'G92 为循环首行，完整螺纹需后续 X 递减分刀',
    );
    expect(page().querySelector('.rc-codecard')?.getAttribute('aria-label')).toBe(
      'G92 直进循环程序',
    );
  });
});

describe('p04 GSK 型号细分 · G76 两口径（V3-3，DEFERRED #16）', () => {
  it('system=gsk 缺 gskmodel：默认 988TA，两行 mm 小数 + 口径注 + 参数卡', async () => {
    await router.navigate('p04', { ...M30_PARAMS, system: 'gsk' });

    expect(badgeText()).toBe('广数 GSK');
    expect(segItems('GSK 型号')[0]?.classList.contains('on')).toBe(true);
    expect(codeLines()).toEqual([
      'G76 P021060 Q0.1 R0.05',
      'G76 X26.211 Z-30. P1.894 Q0.4 F3.5',
    ]);
    expect(page().querySelector('.rc-codecard__comment')?.textContent).toContain(
      '按 GSK988TA 口径（P/Q=mm 半径）',
    );
    expect(paramMap()).toEqual({
      '牙底 X': '26.211',
      '终点 Z': '-30.0',
      '牙高 P': '1.894 mm',
      '首切 Q': '0.4 mm',
      '导程 F': '3.5',
      '精修 R': '0.05 mm',
    });
    const pnote = page().querySelector('.rc-p04__pnote')?.textContent ?? '';
    expect(pnote).toContain('P = 牙深 (d − d₁)/2 = 1.894 mm（mm 口径三位，非工作牙高 H₁）');
    expect(pnote).not.toContain('μm');
  });

  it('URL gskmodel=980tdc 直达：增量两行 + №.182.7 口径注 + 参数卡', async () => {
    await router.navigate('p04', { ...M30_PARAMS, system: 'gsk', gskmodel: '980tdc' });

    expect(segItems('GSK 型号')[1]?.classList.contains('on')).toBe(true);
    expect(codeLines()).toEqual([
      'G76 P021060 Q1000 R0.05',
      'G76 X26.211 Z-30. P18944 Q4000 F3.5',
    ]);
    expect(page().querySelector('.rc-codecard__comment')?.textContent).toContain(
      '按 GSK980TDc 口径（P/Q=0.0001mm 增量 №.182.7，R=mm）',
    );
    expect(paramMap()).toEqual({
      '牙底 X': '26.211',
      '终点 Z': '-30.0',
      '牙高 P': '18944（0.0001mm）',
      '首切 Q': '4000（0.0001mm）',
      '导程 F': '3.5',
      '精修 R': '0.05 mm',
    });
    expect(page().querySelector('.rc-p04__pnote')?.textContent).toContain(
      'P = 牙深 (d − d₁)/2 = 1.894 mm → 18944（0.0001mm 增量，№.182.7；非工作牙高 H₁）',
    );
  });

  it('型号页签点击切换 988TA ⇄ 980TDc：代码行随口径重算', async () => {
    await router.navigate('p04', { ...M30_PARAMS, system: 'gsk' });
    expect(codeLines()[1]).toBe('G76 X26.211 Z-30. P1.894 Q0.4 F3.5');

    segItems('GSK 型号')[1]?.click();
    expect(segItems('GSK 型号')[1]?.classList.contains('on')).toBe(true);
    expect(codeLines()).toEqual([
      'G76 P021060 Q1000 R0.05',
      'G76 X26.211 Z-30. P18944 Q4000 F3.5',
    ]);

    segItems('GSK 型号')[0]?.click();
    expect(codeLines()).toEqual([
      'G76 P021060 Q0.1 R0.05',
      'G76 X26.211 Z-30. P1.894 Q0.4 F3.5',
    ]);
  });

  it('非法 gskmodel 值回落 988TA（防死状态）', async () => {
    await router.navigate('p04', { ...M30_PARAMS, system: 'gsk', gskmodel: 'invalid' });

    expect(segItems('GSK 型号')[0]?.classList.contains('on')).toBe(true);
    expect(codeLines()).toEqual([
      'G76 P021060 Q0.1 R0.05',
      'G76 X26.211 Z-30. P1.894 Q0.4 F3.5',
    ]);
  });

  it('型号页签只在 GSK + G76 出现：FANUC G76 / GSK G92 / 华中 G76 均无', async () => {
    await router.navigate('p04', M30_PARAMS);
    expect(segItems('GSK 型号')).toHaveLength(0);

    await router.navigate('p04', { ...M30_PARAMS, system: 'gsk', cycle: 'g92' });
    expect(segItems('GSK 型号')).toHaveLength(0);
    expect(codeLines()).toEqual(['G92 X26.211 Z-30. F3.5']);

    await router.navigate('p04', { ...M30_PARAMS, system: 'hnc' });
    expect(segItems('GSK 型号')).toHaveLength(0);
  });
});

describe('p04 HNC 直进循环 · G82 单循环（V3-4，DEFERRED #17）', () => {
  it('system=hnc&cycle=g92：G82 单行 + 行注 + 三格参数卡 + 复制内容', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });

    await router.navigate('p04', { ...M30_PARAMS, system: 'hnc', cycle: 'g92' });

    expect(codeLines()).toEqual(['G82 X26.211 Z-30. I0 R0 E0 C1 P0 F3.5']);
    expect(page().querySelector('.rc-codecard')?.getAttribute('aria-label')).toBe(
      'G82 直进循环程序',
    );
    expect(page().querySelector('.rc-codecard__comment')?.textContent).toContain('已按 华中 生成');
    expect(page().querySelector('.rc-p04__pnote')?.textContent).toBe(
      'G82 为单循环行，完整螺纹需后续 X 递减分刀',
    );
    expect(paramKeys()).toEqual(['牙底 X', '终点 Z', '导程 F']);
    expect(paramMap()).toEqual({
      '牙底 X': '26.211',
      '终点 Z': '-30.0',
      '导程 F': '3.5',
    });

    page().querySelector<HTMLButtonElement>('.rc-btn.ghost')?.click();
    expect(writeText).toHaveBeenCalledWith('G82 X26.211 Z-30. I0 R0 E0 C1 P0 F3.5');
  });

  it('非华中直进循环仍为 G92（方言隔离，G82 不外泄）', async () => {
    await router.navigate('p04', { ...M30_PARAMS, cycle: 'g92' });

    expect(codeLines()).toEqual(['G92 X26.211 Z-30. F3.5']);
    expect(page().querySelector('.rc-p04__pnote')?.textContent).toBe(
      'G92 为循环首行，完整螺纹需后续 X 递减分刀',
    );
  });
});

describe('p04 system=knd 直达（0.001mm 口径，R2 裁决）', () => {
  it('KND 两行金值 + 口径注 + 参数卡单位', async () => {
    await router.navigate('p04', { ...M30_PARAMS, system: 'knd' });

    expect(badgeText()).toBe('KND');
    expect(segItems('数控系统')[2]?.classList.contains('on')).toBe(true);
    expect(codeLines()).toEqual([
      'G76 P021060 Q100 R50',
      'G76 X26.211 Z-30. P1894 Q400 F3.5',
    ]);
    expect(page().querySelector('.rc-codecard__comment')?.textContent).toContain(
      '按 KND-1000T 口径（P/Q/R=0.001mm）',
    );
    expect(paramMap()).toEqual({
      '牙底 X': '26.211',
      '终点 Z': '-30.0',
      '牙高 P': '1894（0.001mm）',
      '首切 Q': '400（0.001mm）',
      '导程 F': '3.5',
      '精修 R': '50（0.001mm）',
    });
  });
});

describe('p04 三系统参数卡标签对照（M30×3.5 金工况）', () => {
  it('FANUC：P 1894 μm / Q 400 μm / R 0.05', async () => {
    await router.navigate('p04', M30_PARAMS);
    expect(paramKeys()).toEqual(['牙底 X', '终点 Z', '牙高 P', '首切 Q', '导程 F', '精修 R']);
    expect(paramMap()['牙高 P']).toBe('1894 μm');
    expect(paramMap()['首切 Q']).toBe('400 μm');
    expect(paramMap()['精修 R']).toBe('0.05');
  });

  it('KND：P 1894（0.001mm）/ Q 400（0.001mm）/ R 50（0.001mm）', async () => {
    await router.navigate('p04', { ...M30_PARAMS, system: 'knd' });
    expect(paramKeys()).toEqual(['牙底 X', '终点 Z', '牙高 P', '首切 Q', '导程 F', '精修 R']);
    expect(paramMap()['牙高 P']).toBe('1894（0.001mm）');
    expect(paramMap()['首切 Q']).toBe('400（0.001mm）');
    expect(paramMap()['精修 R']).toBe('50（0.001mm）');
  });

  it('HNC：K 1.894 mm / Q 0.4 mm / U 0.05 mm，单行程序', async () => {
    await router.navigate('p04', { ...M30_PARAMS, system: 'hnc' });

    expect(badgeText()).toBe('华中');
    expect(codeLines()).toEqual([
      'G76 C2 R0 E0 A60 X26.211 Z-30. I0 K1.894 U0.05 V0.1 Q0.4 P0 F3.5',
    ]);
    expect(paramKeys()).toEqual(['牙底 X', '终点 Z', '牙高 K', '首切 Q', '导程 F', '精修 U']);
    expect(paramMap()['牙高 K']).toBe('1.894 mm');
    expect(paramMap()['首切 Q']).toBe('0.4 mm');
    expect(paramMap()['精修 U']).toBe('0.05 mm');
    expect(paramMap()['牙底 X']).toBe('26.211');
    expect(paramMap()['终点 Z']).toBe('-30.0');
    expect(paramMap()['导程 F']).toBe('3.5');
  });

  it('HNC 代码卡注释「已按 华中 生成」，P021060 说明不误挂到 HNC', async () => {
    await router.navigate('p04', { ...M30_PARAMS, system: 'hnc' });
    expect(page().querySelector('.rc-codecard__comment')?.textContent).toContain('已按 华中 生成');
    expect(page().querySelector('.rc-p04__pnote')?.textContent).not.toContain('P021060');
  });
});

describe('p04 cycle=g92 直达与复制', () => {
  it('cycle=g92 直达：单行 G92 + 三项参数卡', async () => {
    await router.navigate('p04', { ...M30_PARAMS, cycle: 'g92' });

    expect(codeLines()).toEqual(['G92 X26.211 Z-30. F3.5']);
    expect(paramKeys()).toEqual(['牙底 X', '终点 Z', '导程 F']);
    expect(paramMap()).toEqual({
      '牙底 X': '26.211',
      '终点 Z': '-30.0',
      '导程 F': '3.5',
    });
  });

  it('G92 复制按钮写入单行剪贴板内容', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });

    await router.navigate('p04', { ...M30_PARAMS, cycle: 'g92' });
    page().querySelector<HTMLButtonElement>('.rc-btn.ghost')?.click();

    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText).toHaveBeenCalledWith('G92 X26.211 Z-30. F3.5');
  });

  it('G92 形式系统页签可正常切换：GSK 可用、KND 可用', async () => {
    await router.navigate('p04', { ...M30_PARAMS, cycle: 'g92' });

    segItems('数控系统')[1]?.click();
    expect(badgeText()).toBe('广数 GSK');
    expect(segItems('数控系统')[1]?.classList.contains('on')).toBe(true);
    expect(codeLines()).toEqual(['G92 X26.211 Z-30. F3.5']);

    segItems('数控系统')[2]?.click();
    expect(badgeText()).toBe('KND');
    expect(segItems('数控系统')[2]?.classList.contains('on')).toBe(true);
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

/**
 * W10-C 锥管族 UI 锚点（WAVE-PLAN-V4 §2，算例 R1/16、L=9.6）：
 *   d=7.723、P=25.4/28=0.907142857…；d₁=6.561312…→X6.561；牙深 0.580843…→P581；
 *   锥度 = −L/32 = −9.6/32 = −0.3；首刀 0.2 → Q200（p04 锥管族冻结示例参数）。
 */
const R116_PARAMS = { family: 'sealpipe', spec: 'R1/16', d: 7.723, p: 25.4 / 28 };
const NPT116_PARAMS = { family: 'npt', spec: 'NPT1/16', d: 7.895, p: 25.4 / 27 };

describe('p04 锥管族 W10-C · R1/16 金值锚点', () => {
  it('默认 L=9.6（URL 无 l）：FANUC 行2 逐字符 G76 X6.561 Z-9.6 R-0.3 P581 Q200 F0.907', async () => {
    await router.navigate('p04', R116_PARAMS);

    expect(codeLines()).toEqual([
      'G76 P021060 Q100 R0.05',
      'G76 X6.561 Z-9.6 R-0.3 P581 Q200 F0.907',
    ]);
  });

  it('锥管模式显示「螺纹长度 L」输入行（值 9.6）与锥度推导式', async () => {
    await router.navigate('p04', R116_PARAMS);

    const input = page().querySelector<HTMLInputElement>('input[name="taperLength"]');
    expect(input?.value).toBe('9.6');
    const note = page().querySelector('.rc-p04__tapernote')?.textContent ?? '';
    expect(note).toContain('锥度位 R = −L/32 = −9.6/32 = −0.3 mm');
    expect(note).toContain('1:16 锥比 = 直径:长度 → 半径差 = L×(1/16)/2 = L/32');
    expect(note).toContain('程序写作 R-0.3');
    expect(note).toContain('终点 = 基准平面 Z−9.6 / 基面小径 X，起点 = 小端 Z0');
  });

  it('URL l=16 直达：Z-16、锥度 −16/32=−0.5', async () => {
    await router.navigate('p04', { ...R116_PARAMS, l: 16 });

    // FANUC 轴写法：整数 Z 保留小数点（formatAxis(-16) → Z-16.）
    expect(codeLines()[1]).toBe('G76 X6.561 Z-16. R-0.5 P581 Q200 F0.907');
    expect(page().querySelector('.rc-p04__tapernote')?.textContent).toContain(
      '锥度位 R = −L/32 = −16/32 = −0.5 mm',
    );
  });

  it('L 输入行即时更新程序区且输入框不被重建（值保持 16）', async () => {
    await router.navigate('p04', R116_PARAMS);
    const input = page().querySelector<HTMLInputElement>('input[name="taperLength"]');
    if (!input) throw new Error('L 输入行缺失');

    input.value = '16';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    expect(codeLines()[1]).toBe('G76 X6.561 Z-16. R-0.5 P581 Q200 F0.907');
    expect(page().querySelector<HTMLInputElement>('input[name="taperLength"]')).toBe(input);
    expect(input.value).toBe('16');
  });

  it('GSK 980TDc 锚点行逐字符：R 保持 mm，P5808 Q2000', async () => {
    await router.navigate('p04', { ...R116_PARAMS, system: 'gsk', gskmodel: '980tdc' });

    expect(codeLines()).toEqual([
      'G76 P021060 Q1000 R0.05',
      'G76 X6.561 Z-9.6 R-0.3 P5808 Q2000 F0.907',
    ]);
    expect(page().querySelector('.rc-codecard__comment')?.textContent).toContain(
      '按 GSK980TDc 口径（P/Q=0.0001mm 增量 №.182.7，R=mm）',
    );
  });

  it('HNC G92 → G82 锚点行逐字符（I-0.3）', async () => {
    await router.navigate('p04', { ...R116_PARAMS, system: 'hnc', cycle: 'g92' });

    expect(codeLines()).toEqual(['G82 X6.561 Z-9.6 I-0.3 R0 E0 C1 P0 F0.907']);
    expect(page().querySelector('.rc-p04__tapernote')?.textContent).toContain(
      '锥度位 I = −L/32 = −9.6/32 = −0.3 mm',
    );
    expect(page().querySelector('.rc-codecard')?.getAttribute('aria-label')).toBe(
      'G82 直进循环程序',
    );
  });

  it('G92 锚点行：FANUC/GSK/KND 同串 + 「先例外推」披露句', async () => {
    for (const system of ['fanuc', 'gsk', 'knd'] as const) {
      await router.navigate('p04', { ...R116_PARAMS, system, cycle: 'g92' });
      expect(codeLines()).toEqual(['G92 X6.561 Z-9.6 R-0.3 F0.907']);
      expect(page().querySelector('.rc-codecard__comment')?.textContent).toContain(
        'FANUC R 位系 W6 三系统同串先例外推',
      );
    }
  });

  it('KND G76：R-300（0.001mm 推定）+ 推定口径注', async () => {
    await router.navigate('p04', { ...R116_PARAMS, system: 'knd' });

    expect(codeLines()).toEqual([
      'G76 P021060 Q100 R50',
      'G76 X6.561 Z-9.6 R-300 P581 Q200 F0.907',
    ]);
    const comment = page().querySelector('.rc-codecard__comment')?.textContent ?? '';
    expect(comment).toContain('按 KND-1000T 口径（P/Q/R=0.001mm）');
    expect(comment).toContain('R(i) 按 KND 全 P/Q/R 0.001mm 口径推定');
    expect(page().querySelector('.rc-p04__tapernote')?.textContent).toContain(
      '程序写作 R-300（0.001mm 口径）',
    );
  });

  it('直螺纹族不出现锥度推导式与 L 输入行（回归）', async () => {
    await router.navigate('p04', M30_PARAMS);

    expect(page().querySelector('.rc-p04__tapernote')).toBeNull();
    expect(page().querySelector('input[name="taperLength"]')).toBeNull();
  });
});

describe('p03 → p04 锥管族跳转链路（W10-C；蜗杆行为不变）', () => {
  it('p03 密封管 R1/16 点「生成 G76 程序」→ p04 出锥度程序', async () => {
    await router.navigate('p03', R116_PARAMS);
    expect(page03().textContent).toContain('基准平面处直径（GB/T 7306，1:16 锥）');

    page03().querySelector<HTMLButtonElement>('.rc-btn')?.click();
    await vi.waitFor(() => expect(router.current()).toBe('p04'));

    expect(codeLines()).toEqual([
      'G76 P021060 Q100 R0.05',
      'G76 X6.561 Z-9.6 R-0.3 P581 Q200 F0.907',
    ]);
  });

  it('p03 锥管 NPT1/16 点「生成 G76 程序」→ p04 出锥度程序', async () => {
    await router.navigate('p03', NPT116_PARAMS);
    expect(page03().textContent).toContain('基准平面处直径（GB/T 12716，1:16 锥）');

    page03().querySelector<HTMLButtonElement>('.rc-btn')?.click();
    await vi.waitFor(() => expect(router.current()).toBe('p04'));

    // X = 7.895 − 1.0825×(25.4/27) = 6.876648… → 6.877；P = 0.509176… → 509 μm
    expect(codeLines()).toEqual([
      'G76 P021060 Q100 R0.05',
      'G76 X6.877 Z-9.6 R-0.3 P509 Q200 F0.941',
    ]);
  });

  it('p03 蜗杆态仍无 G76 按钮（W10-C 不放开模数制）', async () => {
    await router.navigate('p03', { family: 'worm', spec: 'm2', d: 2, p: 2 });

    expect(page03().querySelector('.rc-btn')).toBeNull();
    expect(page03().querySelector('.rc-resultcard')?.getAttribute('aria-label')).toBe('蜗杆几何');
  });

  it('p04 直达 family=worm：不输出程序，落「请先选型」降级', async () => {
    await router.navigate('p04', { family: 'worm', spec: 'm2', d: 2, p: 2 });

    expect(page().querySelector('.rc-codecard')).toBeNull();
    expect(page().querySelector('.rc-warn__text')?.textContent).toBe(
      '未选择螺纹规格。请先在「螺纹 · 选型」中选择规格，再生成 G76 程序。',
    );
  });
});
