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
 * 点击 / 聚焦任意输入行可切换写入目标（.la-input--active 高亮；f 行同样可写）。
 * V4.12-B：键盘与编辑规则重构到共用 KeypadController（components/Keypad.ts），
 * 编辑语义零漂移（数字 / '.' / '0' / del / maxLen=10 与原 onKeypad 逐条一致）。
 *
 * 页面参数（README §5.2 冻结链路）：`d`（工件直径 mm）、`vc`（线速度 m·min⁻¹）、
 * `f`（每转进给 mm/r，可选；WAVE-PLAN-V2 §1 新增键）。
 *
 * 切速示意图（WAVE-PLAN-V4.9，用户反馈 #6）：core/speed-figure 工件圆 + Vc 切向
 * 箭头（几何唯一驱动 = D）；Vc/n 标签文本由页面计算真值传入（形值同源 V4.9-01，
 * rpm/vc 模式切换只改文本不改几何）；非法输入保上一帧（V4.9-05，V4.8-04 同规）。
 * 图卡插在输入区之后、标尺/结果卡之前（派工单「输入后、结果前」原则）。
 */
import type { PageContext, PageModule } from '../router';
import { feedRate, spindleSpeed, surfaceSpeed } from '../../core/speed';
import {
  SPEED_FIGURE_VIEW,
  buildSpeedFigure,
  type SpeedFigureView,
} from '../../core/speed-figure';
import {
  Accordion,
  Card,
  InputRow,
  ResultCard,
  Scale,
  Segmented,
  StatBlock,
  TopBar,
  createBody,
  createKeypadController,
  createPage,
  escapeHtml,
  injectStyle,
} from '../components';

const CSS = `
.rc-p09__inputs { display: flex; flex-direction: column; gap: 9px; }
.rc-p09__hint { font-size: 12px; line-height: 1.55; color: var(--la-accent-ink); padding: 0 2px; }
.rc-p09__result { display: flex; flex-direction: column; gap: 9px; }
/* V4.9 切速示意图卡（同 p08/p16 示意图卡布局） */
.rc-p09__diagram { padding: 10px; display: grid; place-items: center; }
.rc-p09__diagram svg { color: var(--la-ink-body); }
/* 真机矮屏兜底：390×844 下键盘四行完整（末行余量 72px，W7-A4 probe-scroll 实测），
   但矮屏（如 667px 高，body 内容区仅约 550px）f 卡态内容会超屏被 overflow:hidden 硬裁。
   页面级开纵滚：844 及以下内容不满屏时不触发滚动，不影响 W5 对拍基线。 */
.la-page[data-page="p09"] .la-body { overflow-y: auto; }
`;

/**
 * 标尺上限（仅展示用，不参与计算）：设计稿 p09 在 n≈955 r/min 时标记 left:63%，
 * 955/1500≈63.7%，据此取 0–1500 r/min 的展示刻度。
 */
const SCALE_MAX_RPM = 1500;

type Mode = 'rpm' | 'vc';
type Field = 'd' | 'vc' | 'rpm' | 'f';

/** V4.12-B：值字典直传共用控制器，键集固定为 d/vc/rpm/f（原 Texts 接口收窄取消）。 */
type Texts = Record<Field, string>;

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

/**
 * 切速示意图 SVG 装配（V4.9：零几何，坐标全来自 core/speed-figure；Vc/n 标签文本
 * 由页面传入）。层序：中心线十字（灰 dash-dot）→ 工件圆 → D 双箭头 + 箭头造型 →
 * Vc 切向箭头（单箭头，方向由 core 端点决定）→ 标签（双 tspan：代号 sub +
 * 值 currentColor 600，p16 同款）。箭头三角（5×1.8）为装配层固定造型装饰，
 * 由 core 线段端点派生，不引入页面几何。
 */
function speedFigureSVG(view: SpeedFigureView, vcLabel: string, nLabel: string): string {
  const n2 = (v: number): number => Math.round(v * 100) / 100;
  const figureText = (
    label: string,
    x: number,
    y: number,
    anchor: 'start' | 'middle' | 'end',
  ): string => {
    const spaceIndex = label.indexOf(' ');
    const code = spaceIndex < 0 ? label.slice(0, 1) : label.slice(0, spaceIndex);
    const rest = spaceIndex < 0 ? label.slice(1) : label.slice(spaceIndex + 1);
    const gap = spaceIndex < 0 ? '' : ' ';
    return (
      `<text x="${n2(x)}" y="${n2(y)}" font-size="8.5" stroke="none" text-anchor="${anchor}">` +
      `<tspan fill="var(--la-sub)">${escapeHtml(code)}</tspan>${gap}` +
      `<tspan fill="currentColor" font-weight="600">${escapeHtml(rest)}</tspan></text>`
    );
  };
  const dashLine = (line: { x1: number; y1: number; x2: number; y2: number }): string =>
    `<line x1="${n2(line.x1)}" y1="${n2(line.y1)}" x2="${n2(line.x2)}" y2="${n2(line.y2)}" stroke="var(--la-sub)" stroke-width="0.8" stroke-dasharray="5 2.5 1.2 2.5"/>`;
  // 水平尺寸线双箭头（两端向外指）
  const dMark = view.diameterMark;
  const dHeads =
    `<path d="M${n2(dMark.x1)} ${n2(dMark.y)}L${n2(dMark.x1 + 5)} ${n2(dMark.y - 1.8)}L${n2(dMark.x1 + 5)} ${n2(dMark.y + 1.8)}Z" fill="currentColor" stroke="none"/>` +
    `<path d="M${n2(dMark.x2)} ${n2(dMark.y)}L${n2(dMark.x2 - 5)} ${n2(dMark.y - 1.8)}L${n2(dMark.x2 - 5)} ${n2(dMark.y + 1.8)}Z" fill="currentColor" stroke="none"/>`;
  const dLine = `<line x1="${n2(dMark.x1)}" y1="${n2(dMark.y)}" x2="${n2(dMark.x2)}" y2="${n2(dMark.y)}" stroke-width="1"/>`;
  // Vc 单箭头：三角形箭头由 core 线段方向派生（旋转造型）
  const angle = Math.atan2(view.vcArrow.y2 - view.vcArrow.y1, view.vcArrow.x2 - view.vcArrow.x1);
  const ux = Math.cos(angle);
  const uy = Math.sin(angle);
  const baseX = view.vcArrow.x2 - 5 * ux;
  const baseY = view.vcArrow.y2 - 5 * uy;
  const vcHead =
    `<path d="M${n2(view.vcArrow.x2)} ${n2(view.vcArrow.y2)}` +
    `L${n2(baseX - 1.8 * uy)} ${n2(baseY + 1.8 * ux)}L${n2(baseX + 1.8 * uy)} ${n2(baseY - 1.8 * ux)}Z" fill="currentColor" stroke="none"/>`;
  const vcLine = `<line x1="${n2(view.vcArrow.x1)}" y1="${n2(view.vcArrow.y1)}" x2="${n2(view.vcArrow.x2)}" y2="${n2(view.vcArrow.y2)}" stroke-width="1"/>`;
  return (
    `<svg viewBox="0 0 ${SPEED_FIGURE_VIEW.width} ${SPEED_FIGURE_VIEW.height}" width="100%" height="104" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">` +
    `${dashLine(view.centerlines.horizontal)}${dashLine(view.centerlines.vertical)}` +
    `<circle cx="${n2(view.circle.cx)}" cy="${n2(view.circle.cy)}" r="${n2(view.circle.r)}"/>` +
    `${dLine}${dHeads}${figureText(dMark.label, dMark.labelX, dMark.labelY, dMark.anchor)}` +
    `${vcLine}${vcHead}${figureText(vcLabel, view.vcArrow.labelX, view.vcArrow.labelY, 'start')}` +
    figureText(nLabel, view.nLabel.x, view.nLabel.y, 'middle') +
    `</svg>`
  );
}

export const title = '转速 · 线速度';

const page: PageModule = {
  title,
  render(ctx: PageContext): void {
    injectStyle('rc-p09-styles', CSS);

    const dParam = Number(ctx.params.get('d'));
    const vcParam = Number(ctx.params.get('vc'));
    const fParam = Number(ctx.params.get('f'));
    const texts: Texts & Record<string, string> = {
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

    // V4.12-B：共用键盘控制器。texts 即页面 Texts 对象；编辑语义与原 onKeypad 逐条一致
    // （del 截尾 / '.' 单点 / 数字 maxLen=10 / '0' 替换），白名单沿用原 allowed 判定。
    const keypadController = createKeypadController({
      texts,
      onChange: () => paintResult(),
      allowed: (field) =>
        field === 'd' ||
        field === 'f' ||
        (state.mode === 'rpm' ? field === 'vc' : field === 'rpm'),
    });

    // V4.9 切速示意图卡：输入区之后、标尺/结果卡之前；非法输入保上一帧（V4.9-05）
    const figureCard = Card({
      className: 'rc-p09__diagram',
      ariaLabel: '切速示意图（工件圆周与切削速度方向）',
    });

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
      keypadController.setActive(field);
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
        return; // 非法输入：示意图保上一帧（V4.9-05）
      }

      // 形值同源（V4.9-01）：Vc/n 标签文本 = 页面计算真值（rpm 模式 Vc 取输入规格化、
      // vc 模式 Vc 与结果卡同为 toFixed(1)），几何唯一驱动 = d → 模式切换只改文本不改几何。
      const vcText = state.mode === 'rpm' ? trimFixed(calc.vc, 6) : calc.vc.toFixed(1);
      try {
        figureCard.innerHTML = speedFigureSVG(
          buildSpeedFigure({
            d: calc.d,
            vcLabel: `Vc ${vcText}`,
            nLabel: `n ${calc.rpm.toFixed(0)} r/min`,
          }),
          `Vc ${vcText}`,
          `n ${calc.rpm.toFixed(0)} r/min`,
        );
      } catch {
        /* 退化防御：保上一帧（V4.9-05） */
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

      // V4.12-B：登记到共用控制器（focusin / click → setActive 由控制器挂接）。
      const register = (field: Field, row: HTMLElement): void => {
        keypadController.register(field, row);
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

    // V4.12-B：原 onKeypad 编辑规则（p09.ts:405-427 现行）已迁入共用控制器，
    // 数字 / '.' / del / maxLen 语义零漂移；sign 键因本页无 signed 字段恒置灰。

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
    // V4.12-B 补位：键盘走页级 footer 槽（.la-body 滚动区之外常显；p09 本有 overflow-y 覆盖）
    body.append(modeSeg, inputWrap, figureCard, scaleWrap, resultWrap, accWrap);

    ctx.root.append(
      createPage({ id: 'p09', top: TopBar({ title }), body, footer: keypadController.keypadEl() }),
    );
  },
};

export default page;
