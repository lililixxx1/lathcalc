// @vitest-environment happy-dom
/**
 * W4-C4 · p10 切削参数 页面测试
 *
 * 数据口径（WAVE-PLAN §3 裁决 3）：
 *   - src/data/materials.json 全量 14 行必须全部渲染；
 *   - 页内固定警示「示例数据 · 以试切为准」；
 *   - 每行 source 原文含「示例·待复核，以试切为准」。
 * 数值口径：45 钢硬质合金 Vc=[120,180] → Ø50 转速
 *   1000×120/(π×50)=763.943769→764；1000×180/(π×50)=1145.915654→1146。
 *   高速钢 Vc=[25,35] → 159.154943→159；222.816920→223。
 *
 * V4.9 C 卡增组：切削三要素静态示意图（存在性 + 三要素文本 + 静态恒定），
 * 布局锚见各 describe 头注释（p10.ts cuttingFigureCard 同源常量）。
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRouter, type Router } from '../src/ui/router';
import { spindleSpeed } from '../src/core/speed';
import type { MaterialRow } from '../src/core/types';
import materialsJson from '../src/data/materials.json';

let app: HTMLElement;
let router: Router;

const MATERIALS = materialsJson as unknown as MaterialRow[];

function currentPage(): HTMLElement {
  const page = app.querySelector<HTMLElement>('.la-page');
  if (!page) throw new Error('p10 未渲染');
  return page;
}

function resultValues(): string[] {
  return [...currentPage().querySelectorAll<HTMLElement>('.rc-resultcard__value')].map(
    (el) => el.textContent ?? '',
  );
}

function clickChip(label: string): void {
  const chips = [...currentPage().querySelectorAll<HTMLButtonElement>('.rc-p10__chips .la-chip')];
  const chip = chips.find((el) => el.textContent === label);
  if (!chip) throw new Error(`chip ${label} 不存在`);
  chip.click();
}

function clickSegItem(value: string): void {
  currentPage().querySelector<HTMLButtonElement>(`.rc-seg__item[data-value="${value}"]`)?.click();
}

function rowNames(): string[] {
  return [...currentPage().querySelectorAll<HTMLElement>('.rc-p10__list .la-lrow .rc-lrow__name')].map(
    (el) => el.textContent ?? '',
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

describe('p10 切削参数（示例库）', () => {
  it('14 行全渲染 + 页内固定警示 + 每行 source 如实展示', async () => {
    await router.navigate('p10');
    const page = currentPage();
    expect(page.dataset.page).toBe('p10');
    expect(page.querySelector('.rc-topbar__title')?.textContent).toContain('示例数据');
    expect(page.querySelector('.la-badge.gray')).not.toBeNull();

    // 数据源自指计数：materials.json 实际行数即断言值。
    const rows = page.querySelectorAll<HTMLElement>('.rc-p10__list .la-lrow');
    expect(MATERIALS).toHaveLength(14);
    expect(rows).toHaveLength(MATERIALS.length);
    expect(rowNames()).toEqual(MATERIALS.map((row) => row.name));

    const descriptions = [...page.querySelectorAll<HTMLElement>('.rc-p10__list .rc-lrow__desc')];
    expect(descriptions).toHaveLength(14);
    for (const description of descriptions) {
      expect(description.textContent).toContain('示例·待复核，以试切为准');
    }

    const warn = page.querySelector<HTMLElement>('.rc-warn');
    expect(warn).not.toBeNull();
    expect(warn?.textContent).toContain('示例数据');
    expect(warn?.textContent).toContain('以试切为准');
  });

  it('默认 45 钢 / 硬质合金刀：Vc 120–180、f 0.2–0.4、Ø50 转速 764–1146', async () => {
    await router.navigate('p10');
    expect(resultValues()).toEqual(['120 – 180', '0.2 – 0.4', '764 – 1146']);

    // core 双路径：Ø50 两端点转速取整。
    expect(spindleSpeed({ diameter: 50, vc: 120 }).rpm.toFixed(0)).toBe('764');
    expect(spindleSpeed({ diameter: 50, vc: 180 }).rpm.toFixed(0)).toBe('1146');
    expect(currentPage().querySelector('.rc-resultcard__unit')?.textContent).toBe('m/min');
  });

  it('高速钢刀切换：45 钢 Vc 25–35、f 0.1–0.3、转速 159–223', async () => {
    await router.navigate('p10');
    clickSegItem('hss');
    expect(resultValues()).toEqual(['25 – 35', '0.1 – 0.3', '159 – 223']);
    expect(spindleSpeed({ diameter: 50, vc: 25 }).rpm.toFixed(0)).toBe('159');
    expect(spindleSpeed({ diameter: 50, vc: 35 }).rpm.toFixed(0)).toBe('223');
  });

  it('分组筛选：不锈钢 → 2 行（304 / 316）；全部 → 14 行', async () => {
    await router.navigate('p10');
    clickChip('不锈钢');
    expect(rowNames()).toEqual(['304 不锈钢', '316 不锈钢']);
    expect(resultValues()).toEqual(['60 – 100', '0.1 – 0.25', '382 – 637']);
    // 筛选后固定警示仍在。
    expect(currentPage().querySelector('.rc-warn')).not.toBeNull();

    clickChip('全部');
    expect(rowNames()).toHaveLength(14);
  });

  it('点选材料行：40Cr 结果切换并保留选中态', async () => {
    await router.navigate('p10');
    const rows = [...currentPage().querySelectorAll<HTMLButtonElement>('.rc-p10__list .la-lrow')];
    rows[1]?.click();

    expect(resultValues()).toEqual(['100 – 160', '0.2 – 0.35', '637 – 1019']);
    const after = [...currentPage().querySelectorAll<HTMLElement>('.rc-p10__list .la-lrow')];
    expect(after).toHaveLength(14);
    expect(after[1]?.classList.contains('sel')).toBe(true);
    expect(after[0]?.classList.contains('sel')).toBe(false);
  });
});

// WAVE-PLAN-V4.9 §3 C 卡（Lead 补位）：切削三要素静态示意图。
// 布局冻结：viewBox 220×120；工件端面圆 cx=84/cy=62/r=38；车刀两矩形
// （刀头 118..134×50..78、刀杆 134..208×58..74；G2 勘正注：刀头左缘 118 在
// y∈[50,78] 段微切入圆缘 0.5~4u（圆缘 y=62 处 x=122），啮合状示意）；
// Vc 圆顶切向箭头（线 56..98 y=19 + 右端三角）、ap 径向双箭头（线 98..110 y=62
// + 双端三角，右三角顶点 116 位于圆内——圆缘 y=62 在 x=122，非「恰在圆缘」）、
// f 轴向箭头（线 128..160 y=84 + 左端三角）。
describe('p10 切削三要素静态示意图（V4.9 C 卡）', () => {
  it('图卡存在：工件圆 + 车刀两矩形 + 三要素标注 + 图例 + 装饰图 aria-hidden', async () => {
    await router.navigate('p10');
    const fig = currentPage().querySelector<HTMLElement>('.rc-p10__figurecard');
    expect(fig).not.toBeNull();
    expect(fig?.getAttribute('aria-label')).toContain('切削三要素');

    const svg = fig?.querySelector('svg');
    expect(svg?.getAttribute('viewBox')).toBe('0 0 220 120');
    expect(svg?.getAttribute('aria-hidden')).toBe('true');

    // 工件端面圆 1 + 车刀两矩形（刀头/刀杆）
    expect(fig?.querySelectorAll('circle')).toHaveLength(1);
    expect(fig?.querySelectorAll('rect')).toHaveLength(2);
    expect(fig?.querySelector('circle')?.getAttribute('cx')).toBe('84');

    // 三要素标注文本（SVG 文档序：Vc / ap / f）
    const texts = [...(fig?.querySelectorAll('text') ?? [])].map((el) => el.textContent);
    expect(texts).toEqual(['Vc', 'ap', 'f']);

    // 箭头三角 4 枚：Vc 单端 1 + ap 双端 2 + f 单端 1（纯填充 path，stroke=none）
    expect(fig?.querySelectorAll('path[stroke="none"]')).toHaveLength(4);

    // 图例三要素中文名对照
    const legend = fig?.querySelector<HTMLElement>('.rc-p10__legend');
    expect(legend?.textContent).toContain('切削速度');
    expect(legend?.textContent).toContain('进给量');
    expect(legend?.textContent).toContain('背吃刀量');
  });

  it('静态恒定：切刀具材质 / 筛选分组后图卡为同一 DOM 节点（不重绘）', async () => {
    await router.navigate('p10');
    const svg1 = currentPage().querySelector('svg');
    const card1 = currentPage().querySelector('.rc-p10__figurecard');

    clickSegItem('hss');
    clickChip('不锈钢');
    clickChip('全部');

    const card2 = currentPage().querySelector('.rc-p10__figurecard');
    expect(card2).toBe(card1);
    expect(currentPage().querySelector('svg')).toBe(svg1);
  });
});
