/**
 * p07 · 锥度 · 莫氏（W4-C4 实现；W6-C4 增「反推」模式）
 *
 * 设计稿区块（docs/车工计算App-无限画布.html pTaper）：
 *   状态栏 → 顶栏 → 分段（计算 / 莫氏对照 / 反推）
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
 * 反推模式（WAVE-PLAN-V2 §1，W6-C4；DEFERRED #8）：
 *   - 锥比 C（>0）+ D/d/L 恰两值（留空恰好一行）→ core/taper.taperReverse 解第三值；
 *   - 莫氏快选 chips（MT0–MT6）点选把 taper 字段换算为 C 填入；
 *   - 结果卡：第三值（标名）/ (D−d)/2 / 半角 DMS。
 *
 * 页面参数（README §5.3 登记）：`mode` = morse | reverse；`morse` = 0–6；
 * 反推链路键：`#/p07?mode=reverse&taperC=<C>&small=30&length=50`。
 *
 * 数据访问：所有标准表数值经 src/core/lookup.ts（findMorse）与 src/data/morse.json，
 * 页面不硬编码表值。
 */
import type { PageContext, PageModule } from '../router';
import type { MorseRow } from '../../core/types';
import { findMorse } from '../../core/lookup';
import { taperCalc, taperReverse } from '../../core/taper';
import {
  Accordion,
  Chip,
  InputRow,
  ResultCard,
  Segmented,
  SubText,
  TopBar,
  createBody,
  createKeypadController,
  createPage,
  escapeHtml,
  injectStyle,
} from '../components';
import morseJson from '../../data/morse.json';

const MORSE_ROWS = morseJson as unknown as MorseRow[];

const CSS = `
.la-page[data-page="p07"] .la-body { overflow-y: auto; }
.rc-p07__figure { padding: 10px; display: grid; place-items: center; }
.rc-p07__svg { width: 100%; height: 90px; display: block; color: var(--la-ink-body); }
.rc-p07__hint { font-size: 12px; line-height: 1.55; color: var(--la-accent-ink); padding: 0 2px; }
.rc-p07__chips { display: flex; flex-wrap: wrap; gap: 7px; }
.rc-p07__source { margin-top: 2px; }
.rc-p07__reverse { display: flex; flex-direction: column; gap: 9px; }
`;

type Mode = 'calc' | 'morse' | 'reverse';

interface State {
  mode: Mode;
  /** 原始输入字符串（不转数值，避免输入过程被打断） */
  big: string;
  small: string;
  length: string;
  morse: number;
  /** 反推模式独立输入（与计算模式互不串值） */
  taperC: string;
  reverseBig: string;
  reverseSmall: string;
  reverseLength: string;
  /** 反推模式当前选中的莫氏号（null = 未选/已手改） */
  reverseMorse: number | null;
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

/** 莫氏表 taper 字段（如 '1:19.254'）→ 锥比 C = 1/x；解析失败返回 null。 */
function morseTaperC(taper: string): number | null {
  const match = /^\s*1\s*:\s*([0-9]+(?:\.[0-9]+)?)\s*$/.exec(taper);
  if (!match) return null;
  const ratio = Number(match[1]);
  return ratio > 0 ? 1 / ratio : null;
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

    const modeParam = ctx.params.get('mode');
    const initialMode: Mode =
      modeParam === 'morse' ? 'morse' : modeParam === 'reverse' ? 'reverse' : 'calc';
    const reverseProvided =
      ctx.params.has('taperC') ||
      ctx.params.has('big') ||
      ctx.params.has('small') ||
      ctx.params.has('length');

    const state: State = {
      mode: initialMode,
      big: '32',
      small: '27',
      length: '50',
      morse: 4,
      taperC: ctx.params.get('taperC') ?? '',
      // 反推参数直达：按传入值填；未传该行即留空（待求）
      reverseBig: ctx.params.get('big') ?? (reverseProvided ? '' : '32'),
      reverseSmall: ctx.params.get('small') ?? (reverseProvided ? '' : '27'),
      reverseLength: ctx.params.get('length') ?? (reverseProvided ? '' : ''),
      reverseMorse: null,
    };
    const morseParam = Number(ctx.params.get('morse'));
    if (Number.isInteger(morseParam) && morseParam >= 0 && morseParam <= 6) {
      state.morse = morseParam;
    }

    let accordionOpen = false;
    let statOpen = false;

    // V4.12-B：底部数字键盘（用户指令全站统一）。计算 / 反推两模式字段名共用
    // big/small/length（+反推 taperC），但落到不同 state 属性 → 值字典按模式重映射：
    // keypadTexts 是控制器直读写的唯一字典，模式切换 / 软键盘输入时双向同步；
    // keypadApply 由当前视图装配，把控制器写回的值路由到对应 state 属性并重画。
    const keypadTexts: Record<string, string> = {};
    let keypadApply: (field: string) => void = () => {};

    const keypadController = createKeypadController({
      texts: keypadTexts,
      onChange: (field) => keypadApply(field),
      allowed: (field) =>
        state.mode === 'calc'
          ? field === 'big' || field === 'small' || field === 'length'
          : state.mode === 'reverse'
            ? field === 'taperC' || field === 'big' || field === 'small' || field === 'length'
            : false,
    });

    const syncKeypadTexts = (): void => {
      for (const key of Object.keys(keypadTexts)) delete keypadTexts[key];
      if (state.mode === 'calc') {
        keypadTexts.big = state.big;
        keypadTexts.small = state.small;
        keypadTexts.length = state.length;
      } else if (state.mode === 'reverse') {
        keypadTexts.taperC = state.taperC;
        keypadTexts.big = state.reverseBig;
        keypadTexts.small = state.reverseSmall;
        keypadTexts.length = state.reverseLength;
      }
    };

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
          keypadTexts.big = value;
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
          keypadTexts.small = value;
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
          keypadTexts.length = value;
          paintFigure();
          paintOutcome();
        },
      });

      // V4.12-B：键盘写回路由（键名 = 字典键名 → 计算 / 反推各自的 state 属性）。
      keypadApply = (field) => {
        if (field === 'big') state.big = keypadTexts.big ?? state.big;
        else if (field === 'small') state.small = keypadTexts.small ?? state.small;
        else if (field === 'length') state.length = keypadTexts.length ?? state.length;
        paintFigure();
        paintOutcome();
      };
      keypadController.register('big', inputBig);
      keypadController.register('small', inputSmall);
      keypadController.register('length', inputLength);
      syncKeypadTexts();
      keypadController.setActive('big');

      paintFigure();
      paintOutcome();
      view.append(figureWrap, inputBig, inputSmall, inputLength, outcome);
      return view;
    }

    /** 反推视图：锥比 C + 莫氏快选 + D/d/L 三行（留空恰好一行 = 待求）。 */
    function renderReverseView(): HTMLElement {
      const view = document.createElement('div');
      view.className = 'rc-p07__reverse';
      const chipWrap = document.createElement('div');
      chipWrap.className = 'rc-p07__chips';
      const outcome = document.createElement('div');
      outcome.className = 'rc-p07__reverseout';

      const inputC = InputRow({
        label: '锥比 C',
        value: state.taperC,
        name: 'taperC',
        placeholder: '如 0.051937',
        ariaLabel: '锥比 C',
        onInput: (value) => {
          state.taperC = value;
          keypadTexts.taperC = value;
          state.reverseMorse = null;
          paintChips();
          paintOutcome();
        },
      });
      const cField = inputC.querySelector<HTMLInputElement>('.rc-input__field');

      const paintChips = (): void => {
        chipWrap.replaceChildren(
          ...MORSE_ROWS.map((morse) =>
            Chip({
              label: `MT${morse.number}`,
              active: state.reverseMorse === morse.number,
              onClick: () => {
                const taperC = morseTaperC(morse.taper);
                if (taperC === null) return;
                state.reverseMorse = morse.number;
                state.taperC = formatNumber(taperC, 6);
                keypadTexts.taperC = state.taperC;
                if (cField) cField.value = state.taperC;
                paintChips();
                paintOutcome();
              },
            }),
          ),
        );
      };

      const paintOutcome = (): void => {
        outcome.replaceChildren();
        const taperC = parseNum(state.taperC);
        if (taperC === null || taperC <= 0) {
          const hint = document.createElement('div');
          hint.className = 'rc-p07__hint';
          hint.setAttribute('role', 'note');
          hint.textContent = '锥比 C 需大于 0（可选莫氏快选填入）。';
          outcome.append(hint);
          return;
        }

        const big = parseNum(state.reverseBig);
        const small = parseNum(state.reverseSmall);
        const length = parseNum(state.reverseLength);
        const filled = [big, small, length].filter((value) => value !== null).length;
        if (filled !== 2) {
          const hint = document.createElement('div');
          hint.className = 'rc-p07__hint';
          hint.setAttribute('role', 'note');
          hint.textContent = '大端 D / 小端 d / 锥长 L 需留空恰好一行作为待求值。';
          outcome.append(hint);
          return;
        }

        try {
          const result = taperReverse({
            taperC,
            big: big ?? undefined,
            small: small ?? undefined,
            length: length ?? undefined,
          });
          const solvedLabel =
            result.solved === 'big' ? '大端 D' : result.solved === 'small' ? '小端 d' : '锥长 L';
          outcome.append(
            ResultCard({
              ariaLabel: '锥度反推结果',
              items: [
                { label: solvedLabel, value: formatNumber(result.missing), unit: 'mm', big: true },
                {
                  label: '大小端差 (D−d)/2',
                  value: formatNumber(result.halfDiffMM),
                  unit: 'mm',
                },
                { label: '半角 α/2', value: result.halfAngleDMS },
              ],
            }),
          );
        } catch (error) {
          const hint = document.createElement('div');
          hint.className = 'rc-p07__hint';
          hint.setAttribute('role', 'note');
          hint.textContent =
            error instanceof Error
              ? error.message.replace(/^taperReverse:\s*/, '')
              : '反推失败：输入非法';
          outcome.append(hint);
        }
      };

      paintChips();
      paintOutcome();
      const inputBig = InputRow({
        label: '大端 D',
        value: state.reverseBig,
        unit: 'mm',
        name: 'big',
        onInput: (value) => {
          state.reverseBig = value;
          keypadTexts.big = value;
          paintOutcome();
        },
      });
      const inputSmall = InputRow({
        label: '小端 d',
        value: state.reverseSmall,
        unit: 'mm',
        name: 'small',
        onInput: (value) => {
          state.reverseSmall = value;
          keypadTexts.small = value;
          paintOutcome();
        },
      });
      const inputLength = InputRow({
        label: '锥长 L',
        value: state.reverseLength,
        unit: 'mm',
        name: 'length',
        onInput: (value) => {
          state.reverseLength = value;
          keypadTexts.length = value;
          paintOutcome();
        },
      });

      // V4.12-B：键盘写回路由（反推模式独立输入，与计算模式互不串值）。
      keypadApply = (field) => {
        if (field === 'taperC') {
          state.taperC = keypadTexts.taperC ?? state.taperC;
          state.reverseMorse = null;
          paintChips();
        } else if (field === 'big') state.reverseBig = keypadTexts.big ?? state.reverseBig;
        else if (field === 'small') state.reverseSmall = keypadTexts.small ?? state.reverseSmall;
        else if (field === 'length') state.reverseLength = keypadTexts.length ?? state.reverseLength;
        paintOutcome();
      };
      keypadController.register('taperC', inputC);
      keypadController.register('big', inputBig);
      keypadController.register('small', inputSmall);
      keypadController.register('length', inputLength);
      syncKeypadTexts();
      keypadController.setActive('taperC');

      view.append(inputC, chipWrap, inputBig, inputSmall, inputLength, outcome);
      return view;
    }

    /** 莫氏视图：0–6 号快捷选择 + 查表结果（findMorse）。 */
    function renderMorseView(): HTMLElement {
      const view = document.createElement('div');
      view.className = 'rc-p07__morse';
      // 本视图无输入字段：键盘写回置空 + allowed 全屏蔽（控制器按键为 no-op）。
      keypadApply = () => {};
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
      content.replaceChildren(
        state.mode === 'calc'
          ? renderCalcView()
          : state.mode === 'morse'
            ? renderMorseView()
            : renderReverseView(),
      );
    };

    body.append(
      Segmented({
        options: [
          { value: 'calc', label: '计算' },
          { value: 'morse', label: '莫氏对照' },
          { value: 'reverse', label: '反推' },
        ],
        value: state.mode,
        ariaLabel: '锥度计算模式',
        onChange: (value) => {
          state.mode = value === 'morse' ? 'morse' : value === 'reverse' ? 'reverse' : 'calc';
          renderContent();
        },
      }),
      content,
    );

    renderContent();
    // V4.12-B 补位：键盘走页级 footer 槽（.la-body 滚动区之外常显，见 CSS overflow-y 覆盖）
    ctx.root.append(
      createPage({ id: 'p07', top: TopBar({ title }), body, footer: keypadController.keypadEl() }),
    );
  },
};

export default page;
