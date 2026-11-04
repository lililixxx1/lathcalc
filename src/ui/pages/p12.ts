/**
 * p12 · 三角（W4-C5 实现；W6-C4 增模式切换 SSS/SAS/ASA/SSA + SSA 双解）
 *
 * 设计稿区块（docs/车工计算App-无限画布.html 的 pTriangle，自上而下）：
 *   状态栏 → 顶栏「三角」→ 模式分段 → 示意图卡片 → 三列参数 → 三角结果卡
 *   → 直角三角形状态 chips →「怎么算的」→ Home 指示条
 *
 * 模式（WAVE-PLAN-V2 §1 契约）：
 *   SSS → a,b,c；SAS → b,c,A；SSA → a,c,A；ASA → A,B,c（字段集钉死）。
 *   SSA 双解时两结果卡并列、锐角解在前（V2-3）；无解提示「构不成三角形」。
 * 计算：core/triangle.solveTriangleBy（SSS 内部复用 v0.1 solveTriangle）。
 */
import type { TriangleInput, TriangleResult, TriangleSolveOutput } from '../../core/types';
import { solveTriangleBy } from '../../core/triangle';
import type { PageContext, PageModule } from '../router';
import {
  Accordion,
  Card,
  Chip,
  ResultCard,
  Segmented,
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
.rc-p12__result { display: flex; flex-direction: column; gap: 7px; }
.rc-p12__solutions { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 7px; }
.rc-p12__solution { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.rc-p12__solution-title { font-size: 11.5px; font-weight: 600; color: var(--la-sub); padding-left: 2px; }
.rc-p12__result:empty, .rc-p12__formula:empty { display: none; }
.rc-p12__hint { text-align: center; padding: 8px 0; }
`;

type Mode = 'sss' | 'sas' | 'asa' | 'ssa';
type FieldKey = 'a' | 'b' | 'c' | 'A' | 'B' | 'C';
type SideKey = 'a' | 'b' | 'c';

interface FieldDef {
  key: FieldKey;
  kind: 'side' | 'angle';
}

const MODE_ORDER: readonly Mode[] = ['sss', 'sas', 'asa', 'ssa'];

/** 每模式恰好三输入格，字段集钉死（WAVE-PLAN-V2 §1） */
const MODE_FIELDS: Readonly<Record<Mode, readonly FieldDef[]>> = {
  sss: [
    { key: 'a', kind: 'side' },
    { key: 'b', kind: 'side' },
    { key: 'c', kind: 'side' },
  ],
  sas: [
    { key: 'b', kind: 'side' },
    { key: 'c', kind: 'side' },
    { key: 'A', kind: 'angle' },
  ],
  asa: [
    { key: 'A', kind: 'angle' },
    { key: 'B', kind: 'angle' },
    { key: 'c', kind: 'side' },
  ],
  ssa: [
    { key: 'a', kind: 'side' },
    { key: 'c', kind: 'side' },
    { key: 'A', kind: 'angle' },
  ],
};

const MODE_HINT: Readonly<Record<Mode, string>> = {
  sss: '输入三边 a / b / c',
  sas: '输入两边及夹角 b / c / A',
  asa: '输入两角及夹边 A / B / c',
  ssa: '输入两边及对角 a / c / A',
};

const MODE_FORMULA: Readonly<Record<Exclude<Mode, 'sss'>, string>> = {
  sas: '余弦定理：a = √(b²+c²−2bc·cosA)；再按三边求三角与面积（海伦）。',
  asa: 'C = 180° − A − B；正弦定理：a = c·sinA / sinC，b = c·sinB / sinC。',
  ssa: 'sinC = c·sinA / a；双解时 C₂ = 180° − C₁，锐角解在前（V2-3）。',
};

function modeFromParam(raw: string | null): Mode {
  return MODE_ORDER.includes(raw as Mode) ? (raw as Mode) : 'sss';
}

function fieldLabel(field: FieldDef): string {
  return field.kind === 'side' ? `边 ${field.key}` : `角 ${field.key}`;
}

function parseField(raw: string): number | undefined {
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

/** 多模式结果卡行：三边 + 三角（SSA 双解时两卡并列，逐卡可读 b）。 */
function solutionItems(result: TriangleResult): Array<{
  label: string;
  value: string;
  unit?: string;
}> {
  return [
    { label: '边 a', value: result.a.toFixed(2), unit: 'mm' },
    { label: '边 b', value: result.b.toFixed(2), unit: 'mm' },
    { label: '边 c', value: result.c.toFixed(2), unit: 'mm' },
    { label: '∠A', value: `${result.A.toFixed(2)}°` },
    { label: '∠B', value: `${result.B.toFixed(2)}°` },
    { label: '∠C', value: `${result.C.toFixed(2)}°` },
  ];
}

export const title = '三角';

const page: PageModule = {
  title,
  render(ctx: PageContext): void {
    injectStyle('rc-p12-styles', CSS);

    const state: { mode: Mode; values: Record<FieldKey, string> } = {
      mode: modeFromParam(ctx.params.get('mode')),
      values: { a: '30', b: '40', c: '50', A: '', B: '', C: '' },
    };

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
      diagramCard.innerHTML = diagramMarkup({
        a: state.values.a,
        b: state.values.b,
        c: state.values.c,
      });
    }

    function showHint(message: string): void {
      resultWrap.append(
        SubText(message, {
          center: true,
          className: 'rc-p12__hint',
        }),
      );
    }

    /** v0.1 SSS 结果渲染（三行角度 + 直角 chips + 余弦定理/海伦），保持零回归。 */
    function renderLegacy(result: TriangleResult, input: TriangleInput): void {
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
      accWrap.append(Accordion({ open: true, content: formulaHtml(result, input) }));
    }

    /** SAS/ASA/SSA 渲染：三边+三角；SSA 双解两卡并列、锐角解在前。 */
    function renderMultiMode(
      output: TriangleSolveOutput,
      mode: Exclude<Mode, 'sss'>,
    ): void {
      const dual = output.solutions.length > 1;
      if (dual) {
        resultWrap.append(
          SubText('SSA 双解（锐角解在前）', {
            center: true,
            className: 'rc-p12__dual',
          }),
        );
      }

      const grid = document.createElement('div');
      grid.className = 'rc-p12__solutions';
      output.solutions.forEach((solution, index) => {
        const card = document.createElement('div');
        card.className = 'rc-p12__solution';
        if (dual) {
          const cardTitle = document.createElement('div');
          cardTitle.className = 'rc-p12__solution-title';
          cardTitle.textContent = `解 ${index + 1}`;
          card.append(cardTitle);
        }
        card.append(
          ResultCard({
            items: solutionItems(solution),
            ariaLabel: dual ? `三角形结果（解 ${index + 1}）` : '三角形结果',
          }),
        );
        grid.append(card);
      });
      resultWrap.append(grid);
      accWrap.append(
        Accordion({
          open: true,
          content: MODE_FORMULA[mode],
        }),
      );
    }

    function renderResult(): void {
      resultWrap.replaceChildren();
      chipsWrap.replaceChildren();
      accWrap.replaceChildren();

      const fields = MODE_FIELDS[state.mode];
      const input: TriangleInput = {};
      let missing = false;
      for (const field of fields) {
        const value = parseField(state.values[field.key]);
        if (value === undefined) {
          missing = true;
          break;
        }
        input[field.key] = value;
      }
      if (missing) {
        showHint(MODE_HINT[state.mode]);
        return;
      }

      let output: TriangleSolveOutput;
      try {
        output = solveTriangleBy(input);
      } catch (error) {
        let message = error instanceof Error ? error.message : '构不成三角形';
        // v0.1 SSS 文案零回归
        if (state.mode === 'sss' && message === '构不成三角形') {
          message = '三边不能构成三角形';
        }
        showHint(message);
        return;
      }

      if (state.mode === 'sss') {
        const result = output.solutions[0];
        if (!result) {
          showHint('三边不能构成三角形');
          return;
        }
        renderLegacy(result, input);
        return;
      }
      renderMultiMode(output, state.mode);
    }

    function renderParams(): void {
      paramsWrap.replaceChildren(
        ...MODE_FIELDS[state.mode].map((field) => {
          const label = document.createElement('label');
          label.className = 'rc-p12__param';
          const key = document.createElement('span');
          key.className = 'rc-p12__param-key';
          key.textContent = field.kind === 'side' ? field.key : `∠${field.key}`;
          const input = document.createElement('input');
          input.className = 'rc-p12__param-field la-num rc-p12__field';
          input.type = 'text';
          input.inputMode = 'decimal';
          input.value = state.values[field.key];
          input.setAttribute('aria-label', fieldLabel(field));
          input.dataset.field = field.key;
          if (field.kind === 'side') input.dataset.side = field.key;
          input.addEventListener('input', () => {
            state.values[field.key] = input.value;
            renderDiagram();
            renderResult();
          });
          label.append(key, input);
          return label;
        }),
      );
    }

    const segmented = Segmented({
      options: MODE_ORDER.map((mode) => ({ value: mode, label: mode.toUpperCase() })),
      value: state.mode,
      ariaLabel: '三角解算模式',
      onChange: (value) => {
        state.mode = modeFromParam(value);
        renderParams();
        renderDiagram();
        renderResult();
      },
    });

    renderDiagram();
    renderParams();
    renderResult();

    const body = createBody({ className: 'rc-p12__body' });
    body.append(segmented, diagramCard, paramsWrap, resultWrap, chipsWrap, accWrap);

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
