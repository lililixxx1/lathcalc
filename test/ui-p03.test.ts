// @vitest-environment happy-dom
/**
 * W4-C2 · p03 螺纹结果测试
 *
 * 金测锚点（WAVE-PLAN §4 #7，M30×3.5）：
 *   d₂ = 30 − 0.6495×3.5 = 27.72675 → 27.727
 *   d₁ = 30 − 1.0825×3.5 = 26.21125 → 26.211
 *   H₁ = 0.5413×3.5 = 1.89455 → 1.895；底孔 = 30 − 3.5 = 26.5
 *   d₀ = 0.57735×3.5 = 2.020725 → 2.021；M = 27.72675 + 3×2.020725 − 0.866×3.5 = 30.757925 → 30.758
 *
 * 四族路由：metric/unified 走 60° 常数；pipe 走 55°；trapezoid 走 30°Tr（ac 由 core d₁ 反解）。
 * 收藏：顶栏星标派发 `lathcalc:save`（detail = {kind,title,params,ts}）。
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
  const el = app.querySelector<HTMLElement>('.la-page[data-page="p03"]');
  if (!el) throw new Error('p03 未渲染');
  return el;
}

function resultValue(label: string): string | undefined {
  return (
    page().querySelector<HTMLElement>(
      `.la-resrow[data-label="${label}"] .rc-resultcard__value`,
    )?.textContent ?? undefined
  );
}

function formulaText(): string {
  return page().querySelector('.rc-acc__body')?.textContent ?? '';
}

describe('p03 M30×3.5 金测（WAVE-PLAN §4 #7）', () => {
  beforeEach(async () => {
    await router.navigate('p03', {
      family: 'metric',
      spec: 'M30 × 3.5',
      d: 30,
      p: 3.5,
    });
  });

  it('顶栏与眉标：M30 × 3.5 / GB/T 196 / 普通螺纹 · 粗牙 · 螺距 P 3.5 mm', () => {
    // TopBar 的 h1 内同时含标题文本节点与徽标，标题取首个文本节点
    expect(page().querySelector('.rc-topbar__title')?.firstChild?.textContent).toBe(
      'M30 × 3.5',
    );
    expect(page().querySelector('.rc-topbar .la-badge')?.textContent).toBe('GB/T 196');
    expect(page().querySelector('.rc-eyebrow')?.textContent).toBe(
      '普通螺纹 · 粗牙 · 螺距 P 3.5 mm',
    );
  });

  it('基本尺寸卡：d/d₂/d₁/H₁/底孔逐值', () => {
    // d₂ = 30 − 0.6495×3.5 = 27.72675 → 27.727
    expect(30 - 0.6495 * 3.5).toBeCloseTo(27.72675, 9);
    expect(resultValue('大径 d')).toBe('30.000');
    expect(resultValue('中径 d₂')).toBe('27.727');
    expect(resultValue('小径 d₁')).toBe('26.211');
    expect(resultValue('牙型高 H₁')).toBe('1.895');
    expect(resultValue('底孔钻头')).toBe('≈ 26.5');
  });

  it('三针卡：d₀=2.021；M=30.758（d₂+3d₀−0.866P）', () => {
    // M = 27.72675 + 3×2.020725 − 0.866×3.5 = 30.757925 → 30.758
    expect(27.72675 + 3 * 2.020725 - 0.866 * 3.5).toBeCloseTo(30.757925, 9);
    expect(resultValue('三针量针 d₀')).toBe('2.021');
    expect(resultValue('三针跨距 M')).toBe('30.758');
  });

  it('「怎么算的」默认展开，公式带代入算式与标准', () => {
    const head = page().querySelector('.rc-acc__head');
    expect(head?.getAttribute('aria-expanded')).toBe('true');
    expect(formulaText()).toContain('d₂ = d − 0.6495P = 30 − 2.273 = 27.727');
    expect(formulaText()).toContain('d₁ = d − 1.0825P = 30 − 3.789 = 26.211');
    expect(formulaText()).toContain('三针 M = d₂ + 3d₀ − 0.866P = 30.758');
    expect(formulaText()).toContain('依据：GB/T 196-2003');
  });

  it('收藏星标派发 lathcalc:save（kind/title/params/ts）', () => {
    const events: CustomEvent[] = [];
    const handler = (event: Event): void => {
      events.push(event as CustomEvent);
    };
    document.addEventListener('lathcalc:save', handler);
    try {
      page().querySelector<HTMLButtonElement>('.rc-topbar__star')?.click();
      expect(events).toHaveLength(1);
      const detail = events[0]?.detail as {
        kind: string;
        title: string;
        params: Record<string, unknown>;
        ts: number;
      };
      expect(detail.kind).toBe('thread');
      expect(detail.title).toBe('M30 × 3.5');
      expect(detail.params).toEqual({
        family: 'metric',
        spec: 'M30 × 3.5',
        d: 30,
        p: 3.5,
      });
      expect(typeof detail.ts).toBe('number');
      expect(detail.ts).toBeGreaterThan(0);
    } finally {
      document.removeEventListener('lathcalc:save', handler);
    }
  });

  it('生成 G76 程序 → p04，四键原样带出', async () => {
    page().querySelector<HTMLButtonElement>('.rc-btn')?.click();
    await vi.waitFor(() => expect(router.current()).toBe('p04'));

    const params = new URLSearchParams(window.location.hash.split('?')[1] ?? '');
    expect(params.get('family')).toBe('metric');
    expect(params.get('spec')).toBe('M30 × 3.5');
    expect(params.get('d')).toBe('30');
    expect(params.get('p')).toBe('3.5');
  });
});

describe('p03 四族常数路由', () => {
  it('Tr40×7：d₂=36.500 / d₁=32.000 / ac=0.50 / M=41.062', async () => {
    await router.navigate('p03', {
      family: 'trapezoid',
      spec: 'Tr40 × 7',
      d: 40,
      p: 7,
    });

    expect(page().querySelector('.rc-topbar .la-badge')?.textContent).toBe('GB/T 5796');
    expect(page().querySelector('.rc-eyebrow')?.textContent).toBe('梯形螺纹 · 螺距 P 7 mm');
    // d₂ = 40 − 0.5×7 = 36.500；d₁ = 40 − 7 − 2×0.5 = 32.000（ac=0.5，P=6–12 档）
    expect(resultValue('中径 d₂')).toBe('36.500');
    expect(resultValue('小径 d₁')).toBe('32.000');
    expect(resultValue('牙型高 H₁')).toBe('3.500');
    expect(resultValue('底孔钻头')).toBe('≈ 33.0');
    expect(resultValue('牙顶间隙 ac')).toBe('0.50');
    expect(resultValue('三针量针 d₀')).toBe('3.623');
    expect(resultValue('三针跨距 M')).toBe('41.062');
    expect(formulaText()).toContain('d₁ = d − P − 2ac = 40 − 7 − 1.000 = 32.000（ac = 0.50）');
  });

  it('G1/2（55° 管）：d₂=19.793 / d₁=18.632 / M=21.288，眉标带 14 tpi', async () => {
    await router.navigate('p03', {
      family: 'pipe',
      spec: 'G1/2',
      d: 20.955,
      p: 25.4 / 14,
    });

    expect(page().querySelector('.rc-topbar .la-badge')?.textContent).toBe('GB/T 7307');
    expect(page().querySelector('.rc-eyebrow')?.textContent).toBe(
      '55° 管螺纹 · 14 tpi · 螺距 P 1.814 mm',
    );
    // d₂ = 20.955 − 0.6403×1.814285714… = 19.793312857… → 19.793
    expect(resultValue('中径 d₂')).toBe('19.793');
    expect(resultValue('小径 d₁')).toBe('18.632');
    expect(resultValue('三针量针 d₀')).toBe('1.023');
    expect(resultValue('三针跨距 M')).toBe('21.288');
    expect(formulaText()).toContain('d₂ = d − 0.6403P');
  });

  it('1/4-20 UNC（60° 美制）：d₂=5.525 / d₁=4.975 / M=6.625', async () => {
    await router.navigate('p03', {
      family: 'unified',
      spec: '1/4-20 UNC',
      d: 6.35,
      p: 1.27,
    });

    expect(page().querySelector('.rc-topbar .la-badge')?.textContent).toBe('ASME B1.1');
    expect(page().querySelector('.rc-eyebrow')?.textContent).toBe(
      '美制统一螺纹 · UNC · 螺距 P 1.27 mm',
    );
    // d₂ = 6.35 − 0.6495×1.27 = 5.525135 → 5.525；d₁ = 6.35 − 1.0825×1.27 = 4.975225 → 4.975
    expect(resultValue('中径 d₂')).toBe('5.525');
    expect(resultValue('小径 d₁')).toBe('4.975');
    expect(resultValue('三针量针 d₀')).toBe('0.733');
    expect(resultValue('三针跨距 M')).toBe('6.625');
    expect(formulaText()).toContain('依据：ASME B1.1');
  });
});

describe('p03 空参数降级', () => {
  it('直达 #/p03 无参数：提示先选型，不渲染结果卡，按钮回 p02', async () => {
    await router.navigate('p03');

    expect(page().querySelector('.rc-resultcard')).toBeNull();
    expect(page().querySelector('.rc-warn__text')?.textContent).toBe(
      '未选择螺纹规格。请先在「螺纹 · 选型」中选择规格。',
    );
    page().querySelector<HTMLButtonElement>('.rc-btn')?.click();
    await vi.waitFor(() => expect(router.current()).toBe('p02'));
  });
});
