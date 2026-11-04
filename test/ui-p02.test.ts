// @vitest-environment happy-dom
/**
 * W4-C2 · p02 螺纹选型测试
 *
 * 设计稿区块（docs/车工计算App-无限画布.html:1162-1182）与验收口径：
 *   四族页签（普通 M / 梯形 Tr / 55° 管 / 美制 UN）+ 族内全量列表 + 族内搜索；
 *   行右侧为中径预览 d₂（core/thread 实时计算），点击行跳 p03 并带 family/spec/d/p。
 * 全量行数锚点（W3 冻结表，逐文件数出）：metric 149 / trapezoid 41 / pipe 13 / unified 20。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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

function page(): HTMLElement {
  const el = app.querySelector<HTMLElement>('.la-page[data-page="p02"]');
  if (!el) throw new Error('p02 未渲染');
  return el;
}

function rows(): HTMLElement[] {
  return [...page().querySelectorAll<HTMLElement>('.la-rowlist .la-lrow')];
}

function rowNames(): string[] {
  return rows().map((row) => row.querySelector('.rc-lrow__name')?.textContent ?? '');
}

function tabButton(label: string): HTMLButtonElement {
  const button = [...page().querySelectorAll<HTMLButtonElement>('.la-seg .rc-seg__item')].find(
    (item) => item.textContent === label,
  );
  if (!button) throw new Error(`未找到页签：${label}`);
  return button;
}

function filterChip(label: string): HTMLButtonElement {
  const chip = [...page().querySelectorAll<HTMLButtonElement>('.rc-p02__chips .la-chip')].find(
    (item) => item.textContent === label,
  );
  if (!chip) throw new Error(`未找到筛选 chip：${label}`);
  return chip;
}

function searchInput(): HTMLInputElement {
  const input = page().querySelector<HTMLInputElement>('.rc-input__field');
  if (!input) throw new Error('未找到族内搜索框');
  return input;
}

function customRow(): HTMLElement {
  const row = page().querySelector<HTMLElement>('.rc-p02__customrow');
  if (!row) throw new Error('未找到自定义规格行');
  return row;
}

function customInput(name: string): HTMLInputElement {
  const input = page().querySelector<HTMLInputElement>(`input[name="${name}"]`);
  if (!input) throw new Error(`未找到自定义输入 ${name}`);
  return input;
}

function setCustom(name: string, value: string): void {
  const input = customInput(name);
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function clickCustomCalc(): void {
  const button = page().querySelector<HTMLButtonElement>('.rc-p02__custompanel .rc-btn');
  if (!button) throw new Error('未找到自定义「计算」按钮');
  button.click();
}

describe('p02 结构保真与四族列表', () => {
  it('顶栏 / 四族页签 / 搜索 / 筛选 / 说明逐块存在', async () => {
    await router.navigate('p02');

    // TopBar 的 h1 内同时含标题文本节点与徽标，标题取首个文本节点
    expect(page().querySelector('.rc-topbar__title')?.firstChild?.textContent).toBe('螺纹');
    expect(page().querySelector('.rc-topbar .la-badge')?.textContent).toBe('GB/T 193');
    expect(
      [...page().querySelectorAll('.la-seg .rc-seg__item')].map((item) => item.textContent),
    ).toEqual(['普通 M', '梯形 Tr', '55° 管', '美制 UN']);
    expect(page().querySelector('.rc-input__label')?.textContent).toBe('搜索');
    expect(
      [...page().querySelectorAll('.rc-p02__chips .la-chip')].map((chip) => chip.textContent),
    ).toEqual(['粗牙', '细牙', '按螺距筛选']);
    expect(page().querySelector('.rc-sub')?.textContent).toBe(
      '右侧为中径预览 d₂ / mm · 选中查看完整结果',
    );
    expect(page().querySelector('.la-rowlist')?.getAttribute('aria-label')).toBe(
      '普通 M 规格',
    );
  });

  it('四族页签逐族渲染全量行数：149 / 41 / 13 / 20', async () => {
    await router.navigate('p02');

    expect(rows()).toHaveLength(149); // threads-metric.json：149 行（W3-C1）

    tabButton('梯形 Tr').click();
    expect(rows()).toHaveLength(41); // threads-trapezoid.json：41 行（W3-C2）
    expect(page().querySelector('.rc-topbar .la-badge')?.textContent).toBe('GB/T 5796');

    tabButton('55° 管').click();
    expect(rows()).toHaveLength(13); // threads-pipe.json：13 行（W3-C2）
    expect(page().querySelector('.rc-topbar .la-badge')?.textContent).toBe('GB/T 7307');

    tabButton('美制 UN').click();
    expect(rows()).toHaveLength(20); // threads-unified.json：20 行（W3-C3）
    expect(page().querySelector('.rc-topbar .la-badge')?.textContent).toBe('ASME B1.1');

    tabButton('普通 M').click();
    expect(rows()).toHaveLength(149);
  });

  it('列表按大径升序；M30 粗牙行预览 d₂=27.727（30 − 0.6495×3.5）', async () => {
    await router.navigate('p02');

    // 大径升序、同大径按螺距升序：M1×0.2（P=0.2）在 M1 粗牙（P=0.25）之前
    expect(rowNames()[0]).toBe('M1 × 0.2');
    // d₂ = 1 − 0.6495×0.2 = 0.8701 → 0.870
    expect(rows()[0]?.querySelector('.rc-lrow__value')?.textContent).toBe('0.870');

    const m30 = rows().find(
      (row) => row.querySelector('.rc-lrow__name')?.textContent === 'M30 × 3.5',
    );
    expect(m30).toBeDefined();
    // d₂ = 30 − 0.6495×3.5 = 30 − 2.27325 = 27.72675 → 27.727
    expect(30 - 0.6495 * 3.5).toBeCloseTo(27.72675, 9);
    expect(m30?.querySelector('.rc-lrow__value')?.textContent).toBe('27.727');
  });
});

describe('p02 族内搜索与筛选', () => {
  it('按规格名搜索 M30 → 4 行（M30 × 1 / 1.5 / 2 / 3.5）', async () => {
    await router.navigate('p02');
    const input = searchInput();
    input.value = 'M30';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    expect(rows()).toHaveLength(4);
    expect(rowNames()).toEqual(['M30 × 1', 'M30 × 1.5', 'M30 × 2', 'M30 × 3.5']);
  });

  it('「按螺距筛选」模式：P=3.5 → 2 行（M30、M33）', async () => {
    await router.navigate('p02');
    filterChip('按螺距筛选').click();

    const input = searchInput();
    expect(input.placeholder).toBe('输入螺距，如 3.5');
    input.value = '3.5';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    expect(rows()).toHaveLength(2);
    expect(rowNames()).toEqual(['M30 × 3.5', 'M33 × 3.5']);
  });

  it('粗牙 / 细牙筛选 39 / 110 行；非 metric 族禁用', async () => {
    await router.navigate('p02');

    filterChip('粗牙').click();
    expect(rows()).toHaveLength(39); // W3-C1：粗牙 39 档

    filterChip('细牙').click();
    expect(rows()).toHaveLength(110); // 149 − 39

    tabButton('梯形 Tr').click();
    expect(rows()).toHaveLength(41);
    expect(filterChip('粗牙').disabled).toBe(true);
    expect(filterChip('细牙').disabled).toBe(true);
  });

  it('切换族页签会清空搜索词并恢复全量列表', async () => {
    await router.navigate('p02');
    const input = searchInput();
    input.value = 'M30';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(rows()).toHaveLength(4);

    tabButton('美制 UN').click();
    expect(rows()).toHaveLength(20);
    expect(searchInput().value).toBe('');
  });
});

describe('p02 导航（p02 → p03 传参约定）', () => {
  it('点击 M30 × 3.5 行跳 p03，hash 带 family/spec/d/p 四键', async () => {
    await router.navigate('p02');
    const m30 = rows().find(
      (row) => row.querySelector('.rc-lrow__name')?.textContent === 'M30 × 3.5',
    );
    expect(m30).toBeDefined();
    m30?.click();

    await vi.waitFor(() => expect(router.current()).toBe('p03'));
    const params = new URLSearchParams(window.location.hash.split('?')[1] ?? '');
    expect(params.get('family')).toBe('metric');
    expect(params.get('spec')).toBe('M30 × 3.5');
    expect(params.get('d')).toBe('30');
    expect(params.get('p')).toBe('3.5');
  });

  it('管螺纹行跳 p03 时 family 用 pipe（而非 pipe55）', async () => {
    await router.navigate('p02');
    tabButton('55° 管').click();

    const gHalf = rows().find((row) => row.querySelector('.rc-lrow__name')?.textContent === 'G1/2');
    expect(gHalf).toBeDefined();
    gHalf?.click();

    await vi.waitFor(() => expect(router.current()).toBe('p03'));
    const params = new URLSearchParams(window.location.hash.split('?')[1] ?? '');
    expect(params.get('family')).toBe('pipe');
    expect(params.get('spec')).toBe('G1/2');
    expect(params.get('d')).toBe('20.955');
    expect(Number(params.get('p'))).toBeCloseTo(25.4 / 14, 12);
  });
});

describe('p02 自定义规格输入（W6-C3 · V2-5/V2-8）', () => {
  it('静态行已激活：可展开 d / P 两格 + 计算按钮，无 aria-disabled', async () => {
    await router.navigate('p02');
    const row = customRow();
    expect(row.getAttribute('aria-disabled')).toBeNull();
    expect(row.getAttribute('aria-expanded')).toBe('false');
    expect(row.textContent).toContain('P = 2.0');
    expect(page().querySelector('.rc-p02__custompanel')).toBeNull();

    row.click();
    expect(customRow().getAttribute('aria-expanded')).toBe('true');
    expect(customRow().textContent).not.toContain('P = 2.0');
    expect(customInput('customD').value).toBe('');
    expect(customInput('customP').value).toBe('');
    // 只输 d + P，不做 tpi 输入（V2-5）
    expect(page().querySelectorAll('.rc-p02__custompanel input')).toHaveLength(2);
    expect(
      page().querySelector('.rc-p02__custompanel .rc-btn')?.textContent,
    ).toBe('计算');
  });

  it('普通 M 页签 d=30 / P=3.5 → p03，hash 带 family/d/p 与 spec=自定义 Ø30×3.5', async () => {
    await router.navigate('p02');
    customRow().click();
    setCustom('customD', '30');
    setCustom('customP', '3.5');
    clickCustomCalc();

    await vi.waitFor(() => expect(router.current()).toBe('p03'));
    const raw = window.location.hash.split('?')[1] ?? '';
    const params = new URLSearchParams(raw);
    expect(params.get('family')).toBe('metric');
    expect(params.get('d')).toBe('30');
    expect(params.get('p')).toBe('3.5');
    // spec 格式钉死：自定义 Ø30×3.5（UTF-8 百分号编码 + 空格 '+'）
    expect(params.get('spec')).toBe('自定义 Ø30×3.5');
    expect(raw).toContain(
      `spec=${encodeURIComponent('自定义')}+${encodeURIComponent('Ø30×3.5')}`,
    );
    expect(app.querySelector('.la-page[data-page="p03"]')).not.toBeNull();
    expect(app.textContent).toContain('自定义 Ø30×3.5');
  });

  it('自定义规格随当前族页签：梯形 Tr → family=trapezoid', async () => {
    await router.navigate('p02');
    tabButton('梯形 Tr').click();
    customRow().click();
    setCustom('customD', '40');
    setCustom('customP', '7');
    clickCustomCalc();

    await vi.waitFor(() => expect(router.current()).toBe('p03'));
    const params = new URLSearchParams(window.location.hash.split('?')[1] ?? '');
    expect(params.get('family')).toBe('trapezoid');
    expect(params.get('d')).toBe('40');
    expect(params.get('p')).toBe('7');
    expect(params.get('spec')).toBe('自定义 Ø40×7');
  });

  it('非法输入（d=0）→ 行内提示、不跳转', async () => {
    await router.navigate('p02');
    customRow().click();
    setCustom('customD', '0');
    setCustom('customP', '3.5');
    clickCustomCalc();

    expect(router.current()).toBe('p02');
    expect(window.location.hash).not.toContain('p03');
    const error = page().querySelector<HTMLElement>('.rc-p02__customerr');
    expect(error).not.toBeNull();
    expect(error?.hidden).toBe(false);
    expect(error?.textContent).toContain('大于 0');
  });

  it('非法输入（P=0）→ 行内提示、不跳转', async () => {
    await router.navigate('p02');
    customRow().click();
    setCustom('customD', '30');
    setCustom('customP', '0');
    clickCustomCalc();

    expect(router.current()).toBe('p02');
    expect(page().querySelector<HTMLElement>('.rc-p02__customerr')?.hidden).toBe(false);
  });
});
