// @vitest-environment happy-dom
/**
 * W4-C2 · p02 螺纹选型测试
 *
 * 设计稿区块（docs/车工计算App-无限画布.html:1162-1182）与验收口径：
 *   七族页签（普通 M / 梯形 Tr / 55° 管 / 美制 UN / 密封管 R / 锥管 NPT / 蜗杆）+ 族内全量列表 + 族内搜索；
 *   行右侧为中径预览 d₂（core/thread 实时计算；蜗杆为轴向齿距 px=π·m），点击行跳 p03 并带 family/spec/d/p。
 * 全量行数锚点（W3 冻结表 + W8-A 三新族/Tr 补行，逐文件数出）：metric 149 / trapezoid 53 / pipe 13 /
 *   unified 20 / sealpipe 15 / npt 14 / worm 15。
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

describe('p02 结构保真与七族列表', () => {
  it('顶栏 / 七族页签 / 搜索 / 筛选 / 说明逐块存在', async () => {
    await router.navigate('p02');

    // TopBar 的 h1 内同时含标题文本节点与徽标，标题取首个文本节点
    expect(page().querySelector('.rc-topbar__title')?.firstChild?.textContent).toBe('螺纹');
    expect(page().querySelector('.rc-topbar .la-badge')?.textContent).toBe('GB/T 193');
    expect(
      [...page().querySelectorAll('.la-seg .rc-seg__item')].map((item) => item.textContent),
    ).toEqual(['普通 M', '梯形 Tr', '55° 管', '美制 UN', '密封管 R', '锥管 NPT', '蜗杆']);
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

  it('七族页签逐族渲染全量行数：149 / 53 / 13 / 20 / 15 / 14 / 15', async () => {
    await router.navigate('p02');

    expect(rows()).toHaveLength(149); // threads-metric.json：149 行（W3-C1）

    tabButton('梯形 Tr').click();
    expect(rows()).toHaveLength(53); // threads-trapezoid.json：41 行（W3-C2）+ 12 行最大螺距（W8-A）
    expect(page().querySelector('.rc-topbar .la-badge')?.textContent).toBe('GB/T 5796');

    tabButton('55° 管').click();
    expect(rows()).toHaveLength(13); // threads-pipe.json：13 行（W3-C2）
    expect(page().querySelector('.rc-topbar .la-badge')?.textContent).toBe('GB/T 7307');

    tabButton('美制 UN').click();
    expect(rows()).toHaveLength(20); // threads-unified.json：20 行（W3-C3）
    expect(page().querySelector('.rc-topbar .la-badge')?.textContent).toBe('ASME B1.1');

    tabButton('密封管 R').click();
    expect(rows()).toHaveLength(15); // threads-sealpipe.json：15 行 R1/16–R6（W8-A）
    expect(page().querySelector('.rc-topbar .la-badge')?.textContent).toBe('GB/T 7306');

    tabButton('锥管 NPT').click();
    expect(rows()).toHaveLength(14); // threads-npt.json：14 行 NPT1/16–NPT4（W8-A）
    expect(page().querySelector('.rc-topbar .la-badge')?.textContent).toBe('GB/T 12716');

    tabButton('蜗杆').click();
    expect(rows()).toHaveLength(15); // threads-worm.json：15 个标准模数（W8-A）
    expect(page().querySelector('.rc-topbar .la-badge')?.textContent).toBe('GB/T 10087');

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
    expect(rows()).toHaveLength(53);
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

describe('p02 三新族（W8-A · V3-1/V3-2）', () => {
  it('页签容器注入横向滚动样式（390px 容纳七签）', async () => {
    await router.navigate('p02');
    const style = document.getElementById('rc-p02-styles')?.textContent ?? '';
    expect(style).toContain('overflow-x: auto');
    expect(style).toContain('.la-seg');
  });

  it('密封管 R：R1/16 预览 d₂=7.142，点击带 family=sealpipe', async () => {
    await router.navigate('p02');
    tabButton('密封管 R').click();

    // d₂ = 7.723 − 0.6403×0.907142857… = 7.142156… → 7.142（55° 常数，基准平面处）
    expect(rowNames()[0]).toBe('R1/16');
    expect(rows()[0]?.querySelector('.rc-lrow__value')?.textContent).toBe('7.142');
    expect(page().querySelector('.rc-sub')?.textContent).toBe(
      '右侧为中径预览 d₂ / mm · 选中查看完整结果',
    );

    rows()[0]?.click();
    await vi.waitFor(() => expect(router.current()).toBe('p03'));
    const params = new URLSearchParams(window.location.hash.split('?')[1] ?? '');
    expect(params.get('family')).toBe('sealpipe');
    expect(params.get('spec')).toBe('R1/16');
    expect(params.get('d')).toBe('7.723');
    expect(Number(params.get('p'))).toBeCloseTo(25.4 / 28, 12);
  });

  it('锥管 NPT：NPT1/16 预览 d₂=7.284，点击带 family=npt', async () => {
    await router.navigate('p02');
    tabButton('锥管 NPT').click();

    // d₂ = 7.895 − 0.6495×0.940740740… = 7.283988… → 7.284（60° 常数，基准平面处）
    expect(rowNames()[0]).toBe('NPT1/16');
    expect(rows()[0]?.querySelector('.rc-lrow__value')?.textContent).toBe('7.284');

    rows()[0]?.click();
    await vi.waitFor(() => expect(router.current()).toBe('p03'));
    const params = new URLSearchParams(window.location.hash.split('?')[1] ?? '');
    expect(params.get('family')).toBe('npt');
    expect(params.get('spec')).toBe('NPT1/16');
    expect(params.get('d')).toBe('7.895');
    expect(Number(params.get('p'))).toBeCloseTo(25.4 / 27, 12);
  });

  it('蜗杆：右侧显示 px=π·m（m2→6.283），说明文案切 px，点击带 family=worm', async () => {
    await router.navigate('p02');
    tabButton('蜗杆').click();

    expect(page().querySelector('.rc-sub')?.textContent).toBe(
      '右侧为轴向齿距 px / mm · 选中查看几何结果',
    );
    // px = π×1 = 3.141592… → 3.142（首行 m1）
    expect(rowNames()[0]).toBe('m1');
    expect(rows()[0]?.querySelector('.rc-lrow__value')?.textContent).toBe('3.142');
    const m2 = rows().find((row) => row.querySelector('.rc-lrow__name')?.textContent === 'm2');
    // px = π×2 = 6.283185… → 6.283
    expect(m2?.querySelector('.rc-lrow__value')?.textContent).toBe('6.283');

    m2?.click();
    await vi.waitFor(() => expect(router.current()).toBe('p03'));
    const params = new URLSearchParams(window.location.hash.split('?')[1] ?? '');
    expect(params.get('family')).toBe('worm');
    expect(params.get('spec')).toBe('m2');
    expect(params.get('d')).toBe('2');
    expect(params.get('p')).toBe('2');
  });

  it('切回普通 M 恢复 d₂ 说明文案', async () => {
    await router.navigate('p02');
    tabButton('蜗杆').click();
    expect(page().querySelector('.rc-sub')?.textContent).toContain('轴向齿距');
    tabButton('普通 M').click();
    expect(page().querySelector('.rc-sub')?.textContent).toBe(
      '右侧为中径预览 d₂ / mm · 选中查看完整结果',
    );
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

// V4.10（UI 审计 WARN-3）：七签横滚无指示 → segwrap 左右渐隐蒙层由滚动位置挂摘。
// happy-dom 无布局（scrollWidth/clientWidth 双 0）→ 伪布局驱动 JS 挂摘逻辑
// （真实浏览器视觉由 A4 实拍复验）。
describe('p02 七签横滚渐隐指示（V4.10）', () => {
  it('segwrap 存在；溢出挂 --r、滚到头摘 --r 挂 --l', async () => {
    await router.navigate('p02');
    const seg = page().querySelector<HTMLElement>('.rc-p02__segwrap .la-seg');
    const wrap = page().querySelector<HTMLElement>('.rc-p02__segwrap');
    expect(seg).not.toBeNull();
    expect(wrap).not.toBeNull();
    // 无布局双 0：挂载后初判无指示
    expect(wrap?.classList.contains('rc-p02__segwrap--r')).toBe(false);

    // 溢出 200u、scrollLeft=0 → 右侧还有内容，挂 --r 不挂 --l
    Object.defineProperty(seg, 'scrollWidth', { value: 400, configurable: true });
    Object.defineProperty(seg, 'clientWidth', { value: 200, configurable: true });
    Object.defineProperty(seg, 'scrollLeft', { value: 0, configurable: true });
    seg?.dispatchEvent(new Event('scroll'));
    expect(wrap?.classList.contains('rc-p02__segwrap--r')).toBe(true);
    expect(wrap?.classList.contains('rc-p02__segwrap--l')).toBe(false);

    // 滚到头（scrollLeft=200=隐藏量）→ 摘 --r 挂 --l
    Object.defineProperty(seg, 'scrollLeft', { value: 200, configurable: true });
    seg?.dispatchEvent(new Event('scroll'));
    expect(wrap?.classList.contains('rc-p02__segwrap--r')).toBe(false);
    expect(wrap?.classList.contains('rc-p02__segwrap--l')).toBe(true);
  });
});
