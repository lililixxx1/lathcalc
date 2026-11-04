/**
 * p09 · 转速 · 线速度（W4-C4 实现；自绘键盘为主输入）
 *
 * 设计稿区块（docs/车工计算App-无限画布.html pSpeed）：
 *   状态栏 → 顶栏 → 分段（求转速 n / 求线速度 Vc）
 *   → 工件直径 D / 切削速度 Vc 两行 → 刻度标尺 → 大数字结果卡
 *   → 怎么算的 → 自绘数字键盘（.la-key，12 键固定序）→ Home
 *
 * 计算口径（src/core/speed.ts）：
 *   n = 1000·Vc / (π·D)           （spindleSpeed 正向）
 *   Vc = n·π·D / 1000             （surfaceSpeed 反解，DEFERRED #13 已 core 化）
 *   vf = f·n                      （feedRate；f 有效时在结果区追加进给卡）
 * 自绘键盘写入「当前高亮输入行」：默认在求转速模式下指向 Vc，在求线速度模式下指向 n；
 * 点击 / 聚焦任意输入行可切换写入目标（.rc-p09__input--active 高亮；f 行同样可写）。
 *
 * 页面参数（README §5.2 冻结链路）：`d`（工件直径 mm）、`vc`（线速度 m·min⁻¹）、
 * `f`（每转进给 mm/r，可选；WAVE-PLAN-V2 §1 新增键）。
 */
import type { PageContext, PageModule } from '../router';
import type { KeypadKey } from '../components';
import { feedRate, spindleSpeed, surfaceSpeed } from '../../core/speed';
import {
  Accordion,
  InputRow,
  Keypad,
  ResultCard,
  Scale,
  Segmented,
  StatBlock,
  TopBar,
  createBody,
  createPage,
  injectStyle,
} from '../components';

const CSS = `
.rc-p09__inputs { display: flex; flex-direction: column; gap: 9px; }
.rc-p09__input--active { border-color: var(--la-accent); }
.rc-p09__hint { font-size: 12px; line-height: 1.55; color: var(--la-accent-ink); padding: 0 2px; }
.rc-p09__result { display: flex; flex-direction: column; gap: 9px; }
`;

/**
 * 标尺上限（仅展示用，不参与计算）：设计稿 p09 在 n≈955 r/min 时标记 left:63%，
 * 955/1500≈63.7%，据此取 0–1500 r/min 的展示刻度。
 */
const SCALE_MAX_RPM = 1500;

type Mode = 'rpm' | 'vc';
type Field = 'd' | 'vc' | 'rpm' | 'f';

interface Texts {
  d: string;
  vc: string;
  rpm: string;
  f: string;
}

function parseNum(text: string): number | null {
  const trimmed = text.trim();
  if (trimmed === '') return null;
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : null;
}

/** 去尾零的定点显示（最多 digits 位小数）。 */
function trimFixed(value: number, digits: number): string {
  const text = value.toFixed(digits).replace(/\.?0+$/, '');
  return text === '-0' ? '0' : text;
}

/** 进给显示：常规走去尾零；小于显示精度（如 0.0004）时退化为原值，避免显示成 0。 */
function formatFeed(value: number): string {
  const text = trimFixed(value, 3);
  return text === '0' ? String(value) : text;
}

export const title = '转速 · 线速度';

const page: PageModule = {
  title,
  render(ctx: PageContext): void {
    injectStyle('rc-p09-styles', CSS);

    const dParam = Number(ctx.params.get('d'));
    const vcParam = Number(ctx.params.get('vc'));
    const fParam = Number(ctx.params.get('f'));
    const texts: Texts = {
      d: Number.isFinite(dParam) && dParam > 0 ? String(dParam) : '50',
      vc: Number.isFinite(vcParam) && vcParam > 0 ? String(vcParam) : '150',
      rpm: '',
      f: Number.isFinite(fParam) && fParam > 0 ? String(fParam) : '',
    };

    const state: { mode: Mode; active: Field } = { mode: 'rpm', active: 'vc' };
    let accordionOpen = false;

    const body = createBody({ className: 'rc-p09__body' });
    const inputWrap = document.createElement('div');
    inputWrap.className = 'rc-p09__inputs';
    const scaleWrap = document.createElement('div');
    scaleWrap.className = 'rc-p09__scale';
    const resultWrap = document.createElement('div');
    resultWrap.className = 'rc-p09__result';
    const accWrap = document.createElement('div');
    accWrap.className = 'rc-p09__acc';

    const inputEls: Partial<Record<Field, HTMLInputElement>> = {};
    const rowEls: Partial<Record<Field, HTMLElement>> = {};

    interface Calc {
      d: number;
      /** 当前模式的主结果（rpm 模式为 n，vc 模式为 Vc） */
      main: number;
      rpm: number;
      vc: number;
    }

    function compute(): Calc | null {
      const d = parseNum(texts.d);
      if (d === null || d <= 0) return null;
      if (state.mode === 'rpm') {
        const vc = parseNum(texts.vc);
        if (vc === null || vc < 0) return null;
        const result = spindleSpeed({ diameter: d, vc });
        return { d, main: result.rpm, rpm: result.rpm, vc };
      }
      const rpm = parseNum(texts.rpm);
      if (rpm === null || rpm < 0) return null;
      const vc = surfaceSpeed({ d, n: rpm });
      return { d, main: vc, rpm, vc };
    }

    function setActive(field: Field): void {
      state.active = field;
      for (const [key, el] of Object.entries(rowEls)) {
        if (el) el.classList.toggle('rc-p09__input--active', key === field);
      }
    }

    function paintResult(): void {
      scaleWrap.replaceChildren();
      resultWrap.replaceChildren();
      accWrap.replaceChildren();
      const calc = compute();
      if (!calc) {
        const hint = document.createElement('div');
        hint.className = 'rc-p09__hint';
        hint.setAttribute('role', 'note');
        hint.textContent = '请输入大于 0 的工件直径；切削速度 / 转速需为非负数。';
        resultWrap.append(hint);
        scaleWrap.append(Scale({ value: 0, ariaLabel: '主轴转速区间 0–1500 r/min，当前不可计算' }));
        return;
      }

      // f 有效（有限且 > 0）才计算并显示 vf；空 / 0 / 负数一律不显示（诚实不伪造）。
      const fValue = parseNum(texts.f);
      const feed = fValue !== null && fValue > 0 ? fValue : null;
      const vf = feed === null ? null : feedRate(feed, calc.rpm);

      if (state.mode === 'rpm') {
        resultWrap.append(
          StatBlock({
            eyebrow: '主轴转速 n',
            value: calc.rpm.toFixed(0),
            unit: 'r/min',
            footnote:
              vf === null
                ? 'vf = f·n（未输入进给 f，暂不计算）'
                : 'vf = f·n（结果见下方进给卡）',
            ariaLabel: '主轴转速计算结果',
          }),
        );
      } else {
        resultWrap.append(
          StatBlock({
            eyebrow: '线速度 Vc',
            value: calc.vc.toFixed(1),
            unit: 'm/min',
            footnote: 'Vc = n·π·D / 1000（由主轴转速反算）',
            ariaLabel: '线速度计算结果',
          }),
        );
      }

      if (feed !== null && vf !== null) {
        const vfCard = document.createElement('div');
        vfCard.className = 'rc-p09__vfcard';
        vfCard.append(
          ResultCard({
            items: [
              {
                label: `vf = f·n = ${formatFeed(feed)}×${calc.rpm.toFixed(0)}`,
                value: vf.toFixed(1),
                unit: 'mm/min',
                copy: false,
              },
            ],
            ariaLabel: '每分钟进给结果',
          }),
        );
        resultWrap.append(vfCard);
      }

      scaleWrap.append(
        Scale({
          value: (calc.rpm / SCALE_MAX_RPM) * 100,
          ariaLabel: `主轴转速区间 0–1500 r/min，当前 ${calc.rpm.toFixed(0)}`,
        }),
      );

      const vfLine =
        feed !== null && vf !== null
          ? `<br>vf = f·n = ${formatFeed(feed)}×${calc.rpm.toFixed(0)} = ${vf.toFixed(1)} mm/min`
          : '';
      accWrap.append(
        Accordion({
          open: accordionOpen,
          onToggle: (open) => {
            accordionOpen = open;
          },
          content:
            state.mode === 'rpm'
              ? `n = 1000·Vc / (π·D)<br>` +
                `&nbsp;&nbsp;= 1000×${trimFixed(calc.vc, 6)} / (π×${trimFixed(calc.d, 6)}) = ${calc.rpm.toFixed(0)} r/min` +
                vfLine
              : `Vc = n·π·D / 1000<br>` +
                `&nbsp;&nbsp;= ${trimFixed(calc.rpm, 6)}×π×${trimFixed(calc.d, 6)} / 1000 = ${calc.vc.toFixed(1)} m/min` +
                vfLine,
        }),
      );
    }

    function renderInputs(): void {
      inputWrap.replaceChildren();
      for (const key of Object.keys(inputEls) as Field[]) delete inputEls[key];
      for (const key of Object.keys(rowEls) as Field[]) delete rowEls[key];

      const register = (field: Field, row: HTMLElement): void => {
        rowEls[field] = row;
        const input = row.querySelector<HTMLInputElement>('input');
        if (input) {
          inputEls[field] = input;
          input.addEventListener('focusin', () => setActive(field));
        }
        row.addEventListener('click', () => setActive(field));
      };

      const dRow = InputRow({
        label: '工件直径 D',
        value: texts.d,
        unit: 'mm',
        name: 'd',
        onInput: (value) => {
          texts.d = value;
          setActive('d');
          paintResult();
        },
      });
      register('d', dRow);

      if (state.mode === 'rpm') {
        const vcRow = InputRow({
          label: '切削速度 Vc',
          value: texts.vc,
          unit: 'm/min',
          name: 'vc',
          onInput: (value) => {
            texts.vc = value;
            setActive('vc');
            paintResult();
          },
        });
        register('vc', vcRow);
        inputWrap.append(dRow, vcRow);
      } else {
        const rpmRow = InputRow({
          label: '主轴转速 n',
          value: texts.rpm,
          unit: 'r/min',
          name: 'rpm',
          onInput: (value) => {
            texts.rpm = value;
            setActive('rpm');
            paintResult();
          },
        });
        register('rpm', rpmRow);
        inputWrap.append(dRow, rpmRow);
      }

      const fRow = InputRow({
        label: '每转进给 f',
        value: texts.f,
        unit: 'mm/r',
        name: 'f',
        onInput: (value) => {
          texts.f = value;
          setActive('f');
          paintResult();
        },
      });
      register('f', fRow);
      inputWrap.append(fRow);

      setActive(state.active);
    }

    function onKeypad(key: KeypadKey): void {
      const field = state.active;
      const allowed =
        field === 'd' ||
        field === 'f' ||
        (state.mode === 'rpm' ? field === 'vc' : field === 'rpm');
      if (!allowed) return;
      const current = texts[field];
      let next: string;
      if (key === 'del') {
        next = current.slice(0, -1);
      } else if (key === '.') {
        if (current.includes('.')) return;
        next = current === '' ? '0.' : `${current}.`;
      } else {
        if (current.length >= 10) return;
        next = current === '0' ? key : `${current}${key}`;
      }
      texts[field] = next;
      const input = inputEls[field];
      if (input) input.value = next;
      paintResult();
    }

    const modeSeg = Segmented({
      options: [
        { value: 'rpm', label: '求转速 n' },
        { value: 'vc', label: '求线速度 Vc' },
      ],
      value: state.mode,
      ariaLabel: '转速换算方向',
      onChange: (value) => {
        const nextMode: Mode = value === 'vc' ? 'vc' : 'rpm';
        if (nextMode === state.mode) return;
        const current = compute();
        if (nextMode === 'vc') {
          texts.rpm = current ? trimFixed(current.rpm, 3) : '';
          state.active = 'rpm';
        } else {
          texts.vc = current ? trimFixed(current.vc, 3) : '';
          state.active = 'vc';
        }
        state.mode = nextMode;
        renderInputs();
        paintResult();
      },
    });

    renderInputs();
    paintResult();
    body.append(
      modeSeg,
      inputWrap,
      scaleWrap,
      resultWrap,
      accWrap,
      Keypad({ onKey: onKeypad, ariaLabel: '数字键盘：输入当前高亮字段' }),
    );

    ctx.root.append(createPage({ id: 'p09', top: TopBar({ title }), body }));
  },
};

export default page;
