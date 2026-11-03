/**
 * p07 · 锥度 · 莫氏（W4-C4 实现）
 *
 * 设计稿区块（docs/车工计算App-无限画布.html pTaper）：
 *   状态栏 → 顶栏 → 分段（计算 / 莫氏对照）
 *   → 示意图 → 大端 D / 小端 d / 锥长 L 三行输入
 *   → 结果卡（锥度 C / 半角 α/2 / 大小端单边差）→ 怎么算的 → Home
 *
 * 计算口径（W2-C3 裁决 1 + taper.ts 契约）：
 *   - D、d、L 三值齐全才可解：C=(D−d)/L、α/2=arctan(C/2)；
 *     只给二值数学不可解 → 输入区提示，不调用 core、不假算；
 *   - `missing` 语义 = taperC（TaperResult 注释「补全后的第四值」）；
 *   - 大小端差 (D−d)/2 单列一行（DEFERRED #8 本卡关账）；
 *   - 莫氏快捷选择：findMorse 查 src/data/morse.json，展示锥度比 + halfAngleDMS。
 *
 * 页面参数（README §5.3 登记）：`mode` = morse；`morse` = 0–6。
 *
 * 数据访问：所有标准表数值经 src/core/lookup.ts（findMorse），页面不硬编码表值。
 */
import type { PageContext, PageModule } from '../router';
import type { MorseRow } from '../../core/types';
import { findMorse } from '../../core/lookup';
import { taperCalc } from '../../core/taper';
import {
  Accordion,
  Chip,
  InputRow,
  ResultCard,
  Segmented,
  SubText,
  TopBar,
  createBody,
  createPage,
  escapeHtml,
  injectStyle,
} from '../components';
import morseJson from '../../data/morse.json';

const MORSE_ROWS = morseJson as unknown as MorseRow[];

const CSS = `
.rc-p07__figure { padding: 10px; display: grid; place-items: center; }
.rc-p07__svg { width: 100%; height: 90px; display: block; color: var(--la-ink-body); }
.rc-p07__hint { font-size: 12px; line-height: 1.55; color: var(--la-accent-ink); padding: 0 2px; }
.rc-p07__chips { display: flex; flex-wrap: wrap; gap: 7px; }
.rc-p07__source { margin-top: 2px; }
`;

type Mode = 'calc' | 'morse';

interface State {
  mode: Mode;
  /** 原始输入字符串（不转数值，避免输入过程被打断） */
  big: string;
  small: string;
  length: string;
  morse: number;
}

/** 解析输入框文本；空 / 非数值 → null（缺值语义）。 */
function parseNum(text: string): number | null {
  const trimmed = text.trim();
  if (trimmed === '') return null;
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : null;
}

/** 数值显示：最多 digits 位小数并去尾零；-0 归一为 0。 */
function formatNumber(value: number, digits = 3): string {
  if (!Number.isFinite(value)) return '—';
  const rounded = Number(value.toFixed(digits));
  return String(rounded === 0 ? 0 : rounded);
}

/** 锥度 C → 「1 : x」显示（C=0 为圆柱）。 */
function taperRatioText(taperC: number): string {
  if (taperC === 0) return '0（圆柱）';
  const ratio = 1 / Math.abs(taperC);
  if (!Number.isFinite(ratio)) return '∞';
  const text = ratio.toFixed(3).replace(/\.?0+$/, '');
  return `${taperC < 0 ? '-' : ''}1 : ${text}`;
}

/** 设计稿 p07 示意图（受信内部标记；标签值经 escapeHtml）。 */
function taperFigure(big: string, small: string, length: string): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'la-card rc-p07__figure';
  wrap.innerHTML = `
    <svg class="rc-p07__svg" viewBox="0 0 220 100" width="100%" height="90" fill="none"
      stroke="currentColor" stroke-width="1.6" aria-hidden="true">
      <path d="M62 22h96l-15 56H77z"/>
      <path d="M40 22h22M40 78h37" stroke="var(--la-faint)" stroke-width="1.1"/>
      <text x="98" y="14" font-size="11" fill="var(--la-sub)" stroke="none">D ${escapeHtml(big || '—')}</text>
      <text x="98" y="98" font-size="11" fill="var(--la-sub)" stroke="none">d ${escapeHtml(small || '—')}</text>
      <text x="14" y="53" font-size="11" fill="var(--la-sub)" stroke="none">L ${escapeHtml(length || '—')}</text>
    </svg>
  `;
  return wrap;
}

export const title = '锥度 · 莫氏';

const page: PageModule = {
  title,
  render(ctx: PageContext): void {
    injectStyle('rc-p07-styles', CSS);

    const state: State = {
      mode: ctx.params.get('mode') === 'morse' ? 'morse' : 'calc',
      big: '32',
      small: '27',
      length: '50',
      morse: 4,
    };
    const morseParam = Number(ctx.params.get('morse'));
    if (Number.isInteger(morseParam) && morseParam >= 0 && morseParam <= 6) {
      state.morse = morseParam;
    }

    let accordionOpen = false;
    let statOpen = false;

    const body = createBody({ className: 'rc-p07__body' });
    const content = document.createElement('div');
    content.className = 'rc-p07__content';

    /** 计算视图：输入区常驻，示意图 / 结果按输入局部重建（不打断输入焦点）。 */
    function renderCalcView(): HTMLElement {
      const view = document.createElement('div');
      view.className = 'rc-p07__calc';
      const figureWrap = document.createElement('div');
      figureWrap.className = 'rc-p07__figurewrap';
      const outcome = document.createElement('div');
      outcome.className = 'rc-p07__outcome';

      const paintFigure = (): void => {
        figureWrap.replaceChildren(taperFigure(state.big, state.small, state.length));
      };

      const paintOutcome = (): void => {
        outcome.replaceChildren();
        const big = parseNum(state.big);
        const small = parseNum(state.small);
        const length = parseNum(state.length);
        if (big === null || small === null || length === null) {
          const hint = document.createElement('div');
          hint.className = 'rc-p07__hint';
          hint.setAttribute('role', 'note');
          hint.textContent = '锥度需 D、d、L 三值齐全：只给二值数学不可解（C = (D−d)/L）。';
          outcome.append(hint);
          return;
        }
        if (length <= 0) {
          const hint = document.createElement('div');
          hint.className = 'rc-p07__hint';
          hint.setAttribute('role', 'note');
          hint.textContent = '锥长 L 需大于 0，否则锥度不可解。';
          outcome.append(hint);
          return;
        }
        const result = taperCalc({ big, small, length });
        const halfWidth = (big - small) / 2;
        outcome.append(
          ResultCard({
            ariaLabel: '锥度计算结果',
            items: [
              {
                label: '锥度 C',
                value: taperRatioText(result.taperC),
                big: true,
                copyValue: taperRatioText(result.taperC),
              },
              {
                label: '半角 α/2',
                value: result.halfAngleDMS,
                copyValue: result.halfAngleDMS,
              },
              {
                label: '大小端差 (D−d)/2',
                value: formatNumber(halfWidth),
                unit: 'mm',
              },
            ],
          }),
        );
        outcome.append(
          Accordion({
            open: accordionOpen,
            onToggle: (open) => {
              accordionOpen = open;
            },
            content:
              `C = (D−d)/L = (${formatNumber(big)}−${formatNumber(small)})/${formatNumber(length)} = ${formatNumber(result.taperC, 6)} = ${taperRatioText(result.taperC)}<br>` +
              `α/2 = arctan((D−d)/2L) = arctan(${formatNumber(halfWidth / length, 6)}) = ${result.halfAngleDMS}<br>` +
              `大小端单边差 = (D−d)/2 = ${formatNumber(halfWidth)} mm（车削单边进刀参考）`,
          }),
        );
      };

      const inputBig = InputRow({
        label: '大端 D',
        value: state.big,
        unit: 'mm',
        name: 'big',
        onInput: (value) => {
          state.big = value;
          paintFigure();
          paintOutcome();
        },
      });
      const inputSmall = InputRow({
        label: '小端 d',
        value: state.small,
        unit: 'mm',
        name: 'small',
        onInput: (value) => {
          state.small = value;
          paintFigure();
          paintOutcome();
        },
      });
      const inputLength = InputRow({
        label: '锥长 L',
        value: state.length,
        unit: 'mm',
        name: 'length',
        onInput: (value) => {
          state.length = value;
          paintFigure();
          paintOutcome();
        },
      });

      paintFigure();
      paintOutcome();
      view.append(figureWrap, inputBig, inputSmall, inputLength, outcome);
      return view;
    }

    /** 莫氏视图：0–6 号快捷选择 + 查表结果（findMorse）。 */
    function renderMorseView(): HTMLElement {
      const view = document.createElement('div');
      view.className = 'rc-p07__morse';
      const chipWrap = document.createElement('div');
      chipWrap.className = 'rc-p07__chips';
      const resultWrap = document.createElement('div');
      resultWrap.className = 'rc-p07__morseout';
      const accWrap = document.createElement('div');
      accWrap.className = 'rc-p07__morseacc';

      const paint = (): void => {
        const row = findMorse(MORSE_ROWS, state.morse);
        chipWrap.replaceChildren(
          ...MORSE_ROWS.map((morse) =>
            Chip({
              label: `MT${morse.number}`,
              active: morse.number === state.morse,
              onClick: () => {
                state.morse = morse.number;
                paint();
              },
            }),
          ),
        );
        resultWrap.replaceChildren(
          ResultCard({
            ariaLabel: '莫氏锥度查表结果',
            items: [
              { label: '锥度', value: row.taper, big: true },
              { label: '半角 α/2', value: row.halfAngleDMS },
            ],
          }),
          SubText(row.source, { className: 'rc-p07__source' }),
        );
        accWrap.replaceChildren(
          Accordion({
            open: statOpen,
            onToggle: (open) => {
              statOpen = open;
            },
            content:
              `莫氏锥度比 = ${row.taper}<br>` +
              'α/2 = arctan(1 / (2 × 锥度比值))<br>' +
              '锥度比与半角取自内置莫氏表（GB/T 1443-2016）',
          }),
        );
      };

      paint();
      view.append(chipWrap, resultWrap, accWrap);
      return view;
    }

    const renderContent = (): void => {
      content.replaceChildren(state.mode === 'calc' ? renderCalcView() : renderMorseView());
    };

    body.append(
      Segmented({
        options: [
          { value: 'calc', label: '计算' },
          { value: 'morse', label: '莫氏对照' },
        ],
        value: state.mode,
        ariaLabel: '锥度计算模式',
        onChange: (value) => {
          state.mode = value === 'morse' ? 'morse' : 'calc';
          renderContent();
        },
      }),
      content,
    );

    renderContent();
    ctx.root.append(createPage({ id: 'p07', top: TopBar({ title }), body }));
  },
};

export default page;
