/**
 * p12 · 三角（W4-C5 实现，SSS-only）
 *
 * 设计稿区块（docs/车工计算App-无限画布.html 的 pTriangle，自上而下）：
 *   状态栏 → 顶栏「三角」→ 示意图卡片 → a/b/c 三列参数 → 三角结果卡
 *   → 直角三角形状态 chips →「怎么算的」→ Home 指示条
 *
 * 范围裁决（W2-C1 冻结）：v0.1 只实现 SSS（三边已知）；SAS / ASA / SSA 为 v0.2 待补，
 * 本页**不提供任何可用入口**（不加分段页签，与设计稿保持一致）。
 * 计算：core/triangle.solveTriangle（余弦定理 + 海伦公式）。
 */
import type { TriangleInput, TriangleResult } from '../../core/types';
import { solveTriangle } from '../../core/triangle';
import type { PageContext, PageModule } from '../router';
import {
  Accordion,
  Card,
  Chip,
  ResultCard,
  SubText,
  TopBar,
  createBody,
  createPage,
  escapeHtml,
  injectStyle,
} from '../components';

const CSS = `
.rc-p12__diagram { padding: 10px; display: grid; place-items: center; }
.rc-p12__diagram svg { color: var(--la-ink-body); }
.rc-p12__params { display: grid; grid-template-columns: repeat(3, 1fr); gap: 7px; }
.rc-p12__param { background: var(--la-well-soft); border-radius: 9px; padding: 7px 10px; display: flex; justify-content: space-between; align-items: baseline; gap: 6px; min-width: 0; }
.rc-p12__param-key { font-size: 11.5px; color: var(--la-sub); flex: 0 0 auto; }
.rc-p12__param-field { flex: 1; width: 100%; min-width: 0; text-align: right; font-family: var(--la-font-num); font-size: 14px; font-weight: 600; color: var(--la-ink); background: transparent; border: 0; outline: none; padding: 0; }
.rc-p12__chips { display: flex; gap: 7px; }
.rc-p12__result:empty, .rc-p12__formula:empty { display: none; }
.rc-p12__hint { text-align: center; padding: 8px 0; }
`;

const SIDES = [
  { key: 'a', label: '边 a' },
  { key: 'b', label: '边 b' },
  { key: 'c', label: '边 c' },
] as const;

type SideKey = (typeof SIDES)[number]['key'];

function parseSide(raw: string): number | undefined {
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

/** 设计稿 p12 示意图（静态几何 + 实时边值标签，色值走 token / currentColor）。 */
function diagramMarkup(sides: Record<SideKey, string>): string {
  const label = (key: SideKey): string => {
    const raw = sides[key].trim();
    return escapeHtml(raw.length > 0 ? raw : '—');
  };
  return `
    <svg viewBox="0 0 220 104" width="100%" height="94" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
      <path d="M28 86 196 86 96 20z"/>
      <text x="100" y="100" font-size="11" fill="var(--la-sub)" stroke="none">c ${label('c')}</text>
      <text x="12" y="56" font-size="11" fill="var(--la-sub)" stroke="none">b ${label('b')}</text>
      <text x="152" y="56" font-size="11" fill="var(--la-sub)" stroke="none">a ${label('a')}</text>
      <text x="92" y="14" font-size="11" fill="var(--la-accent-ink)" stroke="none">C</text>
      <text x="18" y="82" font-size="11" fill="var(--la-sub)" stroke="none">A</text>
      <text x="190" y="82" font-size="11" fill="var(--la-sub)" stroke="none">B</text>
    </svg>
  `;
}

function formulaHtml(result: TriangleResult, sides: TriangleInput): string {
  const a = sides.a ?? 0;
  const b = sides.b ?? 0;
  const c = sides.c ?? 0;
  const cosA = (b * b + c * c - a * a) / (2 * b * c);
  const cosB = (a * a + c * c - b * b) / (2 * a * c);
  const cosC = (a * a + b * b - c * c) / (2 * a * b);
  const s = (a + b + c) / 2;
  return (
    `cos A = (b²+c²−a²) / 2bc = ${cosA.toFixed(4)} → ∠A ${result.A.toFixed(2)}°<br>` +
    `cos B = (a²+c²−b²) / 2ac = ${cosB.toFixed(4)} → ∠B ${result.B.toFixed(2)}°<br>` +
    `cos C = (a²+b²−c²) / 2ab = ${cosC.toFixed(4)} → ∠C ${result.C.toFixed(2)}°<br>` +
    `S = √(s(s−a)(s−b)(s−c))，s = ${String(Number(s.toFixed(2)))} → ${result.area.toFixed(2)}`
  );
}

export const title = '三角';

const page: PageModule = {
  title,
  render(ctx: PageContext): void {
    injectStyle('rc-p12-styles', CSS);

    const state: Record<SideKey, string> = { a: '30', b: '40', c: '50' };

    const diagramCard = Card({ className: 'rc-p12__diagram' });
    const paramsWrap = document.createElement('div');
    paramsWrap.className = 'rc-p12__params';
    const resultWrap = document.createElement('div');
    resultWrap.className = 'rc-p12__result';
    const chipsWrap = document.createElement('div');
    chipsWrap.className = 'rc-p12__chips';
    const accWrap = document.createElement('div');
    accWrap.className = 'rc-p12__formula';

    function renderDiagram(): void {
      diagramCard.innerHTML = diagramMarkup(state);
    }

    function renderResult(): void {
      resultWrap.replaceChildren();
      chipsWrap.replaceChildren();
      accWrap.replaceChildren();

      const a = parseSide(state.a);
      const b = parseSide(state.b);
      const c = parseSide(state.c);
      if (a === undefined || b === undefined || c === undefined) {
        resultWrap.append(
          SubText('输入三边 a / b / c（仅 SSS）', {
            center: true,
            className: 'rc-p12__hint',
          }),
        );
        return;
      }

      let result: TriangleResult;
      try {
        result = solveTriangle({ a, b, c });
      } catch (error) {
        resultWrap.append(
          SubText(error instanceof Error ? error.message.replace('solveTriangle: ', '') : '三边无效', {
            center: true,
            className: 'rc-p12__hint',
          }),
        );
        return;
      }

      const rows = [
        { label: '∠A', value: `${result.A.toFixed(2)}°`, big: false },
        { label: '∠B', value: `${result.B.toFixed(2)}°`, big: false },
        { label: '∠C', value: `${result.C.toFixed(2)}°`, big: true },
      ];
      resultWrap.append(ResultCard({ items: rows, ariaLabel: '三角形结果' }));

      chipsWrap.append(
        Chip({
          label: result.right ? '直角三角形' : '非直角三角形',
          active: result.right,
        }),
        Chip({ label: result.right ? '勾股校验通过' : '勾股校验不通过' }),
      );
      accWrap.append(Accordion({ open: true, content: formulaHtml(result, { a, b, c }) }));
    }

    function renderParams(): void {
      paramsWrap.replaceChildren(
        ...SIDES.map((side) => {
          const label = document.createElement('label');
          label.className = 'rc-p12__param';
          const key = document.createElement('span');
          key.className = 'rc-p12__param-key';
          key.textContent = side.key;
          const input = document.createElement('input');
          input.className = 'rc-p12__param-field la-num rc-p12__field';
          input.type = 'text';
          input.inputMode = 'decimal';
          input.value = state[side.key];
          input.setAttribute('aria-label', side.label);
          input.dataset.side = side.key;
          input.addEventListener('input', () => {
            state[side.key] = input.value;
            renderDiagram();
            renderResult();
          });
          label.append(key, input);
          return label;
        }),
      );
    }

    renderDiagram();
    renderParams();
    renderResult();

    const body = createBody({ className: 'rc-p12__body' });
    body.append(diagramCard, paramsWrap, resultWrap, chipsWrap, accWrap);

    ctx.root.append(
      createPage({
        id: 'p12',
        top: TopBar({ title }),
        body,
      }),
    );
  },
};

export default page;
