/**
 * p16 · 挂轮计算（W11-B 实现）
 *
 * 定位（调研报告:182）：普通车床挂轮 a/b×c/d + 传动比误差（ppm）。
 * 齿轮组出口 = B 方案（V4.1 §3 预授权）：未检索到「组名 + 齿数清单」双源逐位一致的
 * 国产车床标准挂轮组，因此只提供自定义齿数入口，零预置数据依赖
 * （检索日志与判定见 docs/evidence/W11-B/gear-sets.md）。
 *
 * 计算口径（src/core/gear.ts，V4.1 §3 冻结）：
 *   i_target = P / T（工件螺距 / 丝杠导程）；四重穷举 (a/b)×(c/d)；
 *   排序键 (errorPpm, a+b+c+d, 字典序) 取前 8；e = |i_target−i|/i_target×10⁶。
 *
 * 页面参数（README §5.2 冻结链路）：`p` 工件螺距 mm、`t` 丝杠导程 mm。
 *
 * 挂轮系示意图（WAVE-PLAN-V4.8，用户反馈 #5）：core/gear-figure 三轴共线展开
 * 画法（主轴 a — 中间轴 b·c — 丝杠 d，半径按齿数比例）；画当前选中行（默认
 * 第 1 行），结果表挂轮格可点切换（V4.8-01）；非法输入保上一帧（V4.8-04）。
 *
 * 视觉验收口径（V4.1 §4）：只拼既有组件与 tokens.css 变量，零新 CSS 变量、零内联色值。
 */
import type { PageContext, PageModule } from '../router';
import type { GearTrainSolution } from '../../core/types';
import { solveGearTrain } from '../../core/gear';
import {
  GEAR_FIGURE_VIEW,
  buildGearTrainFigure,
  type GearFigureView,
} from '../../core/gear-figure';
import {
  Badge,
  Card,
  Eyebrow,
  InputRow,
  SubText,
  TopBar,
  createBody,
  createPage,
  escapeHtml,
  injectStyle,
} from '../components';

const CSS = `
.rc-p16__stack { display: flex; flex-direction: column; gap: 9px; }
.rc-p16__teeth .rc-input__field { text-align: left; font-family: var(--la-font-mono); font-size: 13px; font-weight: 500; }
.rc-p16__setinfo { font-size: 11.5px; color: var(--la-sub); padding: 2px 2px 0; line-height: 1.5; overflow-wrap: anywhere; }
/* 存量修复（W11-B 起，A4-R1 发现）：SubText 基类 .rc-sub 同特异性灰注入在后，
   橙色提示被级联压灰——提页面级特异性保橙。 */
.la-page[data-page="p16"] .rc-p16__hint { font-size: 12px; color: var(--la-accent-ink); padding: 2px; line-height: 1.5; }
.rc-p16__table { display: flex; flex-direction: column; }
.rc-p16__head, .rc-p16__row { display: flex; align-items: center; gap: 8px; padding: 8px 0; }
.rc-p16__head { border-bottom: 1px solid var(--la-border); }
.rc-p16__row { border-top: 1px solid var(--la-border-soft); }
.rc-p16__headcell { font-size: 10.5px; font-weight: 600; letter-spacing: 0.04em; color: var(--la-sub); }
.rc-p16__gear { flex: 1 1 auto; min-width: 0; font-size: 13px; font-weight: 600; overflow-wrap: anywhere; }
.rc-p16__ratio { flex: 0 0 74px; text-align: right; font-size: 12.5px; color: var(--la-ink-body); }
.rc-p16__err { flex: 0 0 62px; text-align: right; font-size: 12.5px; font-weight: 600; }
.rc-p16__tag { flex: 0 0 40px; display: flex; justify-content: flex-end; }
.rc-p16__note { font-size: 11.5px; color: var(--la-sub); line-height: 1.5; padding: 0 2px; }
.rc-p16__diagram { padding: 10px; display: grid; place-items: center; }
.rc-p16__diagram svg { color: var(--la-ink-body); }
.rc-p16__pick {
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  color: inherit;
  background: none;
  border: 0;
  padding: 0;
  text-align: left;
  cursor: pointer;
  overflow-wrap: anywhere;
}
.rc-p16__pick[aria-pressed="true"] { color: var(--la-accent-ink); }
/* 结果 8 行 + 算式卡在 390×844 下超内容区高度：页面级开纵滚（同 p09 矮屏兜底口径）。 */
.la-page[data-page="p16"] .la-body { overflow-y: auto; }
`;

/** 默认示例齿数（V4.1 §3 锚点集合 {20,25,…,100}，17 枚；非预置机床齿轮组）。 */
const DEFAULT_TEETH = Array.from({ length: 17 }, (_, index) => 20 + index * 5)
  .join(' ')
  .replace(/\s+/g, ' ')
  .trim();

/** 自定义齿数解析：逗号（中英文）/ 空白分隔 → 去重升序（集合去重排序由页面负责）。 */
function parseTeeth(text: string): number[] {
  const tokens = text.split(/[\s,，]+/).filter((token) => token !== '');
  const values: number[] = [];
  for (const token of tokens) {
    const value = Number(token);
    if (!Number.isFinite(value)) throw new Error(`自定义齿数含非数值：${token}`);
    values.push(value);
  }
  return [...new Set(values)].sort((left, right) => left - right);
}

function formatNumber(value: number): string {
  return Number.isFinite(value) ? String(value) : '';
}

function n2(value: number): string {
  return value.toFixed(2);
}

/**
 * 挂轮系示意图 SVG 装配（零几何，几何全在 core/gear-figure）：
 * 轴心线/中心线 dash-dot 灰 → 齿轮圆细线描边 → 啮合点实心 → 标签
 * （齿轮签双 tspan：码 sub + 齿数 currentColor 600；轴注 sub）。
 */
function parametricGearSVG(view: GearFigureView): string {
  const dashLine = (x1: number, y1: number, x2: number, y2: number): string =>
    `<line x1="${n2(x1)}" y1="${n2(y1)}" x2="${n2(x2)}" y2="${n2(y2)}" stroke="var(--la-sub)" stroke-width="0.8" stroke-dasharray="5 2.5 1.2 2.5"/>`;
  const axis = dashLine(view.axisLine.x1, view.axisLine.y, view.axisLine.x2, view.axisLine.y);
  const centerlines = view.centerlines
    .map((line) => dashLine(line.x, line.y1, line.x, line.y2))
    .join('');
  const circles = view.circles
    .map((circle) => `<circle cx="${n2(circle.cx)}" cy="${n2(circle.cy)}" r="${n2(circle.r)}"/>`)
    .join('');
  const dots = view.meshDots
    .map((dot) => `<circle cx="${n2(dot.x)}" cy="${n2(dot.y)}" r="1.6" fill="var(--la-sub)" stroke="none"/>`)
    .join('');
  const labels = view.labels
    .map((label) => {
      const anchor = `text-anchor="${label.anchor}"`;
      if (label.role === 'shaft') {
        return `<text x="${n2(label.x)}" y="${n2(label.y)}" font-size="8" fill="var(--la-sub)" stroke="none" ${anchor}>${escapeHtml(label.text)}</text>`;
      }
      const spaceIndex = label.text.indexOf(' ');
      const code = label.text.slice(0, spaceIndex);
      const teeth = label.text.slice(spaceIndex + 1);
      return `<text x="${n2(label.x)}" y="${n2(label.y)}" font-size="9.5" stroke="none" ${anchor}><tspan fill="var(--la-sub)">${escapeHtml(code)}</tspan> <tspan fill="currentColor" font-weight="600">${escapeHtml(teeth)}</tspan></text>`;
    })
    .join('');
  return `<svg viewBox="0 0 ${GEAR_FIGURE_VIEW.width} ${GEAR_FIGURE_VIEW.height}" width="100%" height="132" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">${axis}${centerlines}${circles}${dots}${labels}</svg>`;
}

export const title = '挂轮计算';

const page: PageModule = {
  title,
  render(ctx: PageContext): void {
    injectStyle('rc-p16-styles', CSS);

    const pParam = Number(ctx.params.get('p'));
    const tParam = Number(ctx.params.get('t'));
    const state = {
      p: Number.isFinite(pParam) && pParam > 0 ? formatNumber(pParam) : '1.5',
      t: Number.isFinite(tParam) && tParam > 0 ? formatNumber(tParam) : '6',
      teeth: DEFAULT_TEETH,
      /** 示意图所画行（0 基；输入变化重建结果表时重置回 0，V4.8-01）。 */
      selected: 0,
    };

    const body = createBody({ className: 'rc-p16__body' });
    const resultsWrap = document.createElement('div');
    resultsWrap.className = 'rc-p16__results';

    /** 挂轮系示意图卡（V4.8-02）：默认空，首次成功求解后填充；失败保上一帧。 */
    const diagramCard = Card({
      className: 'rc-p16__diagram',
      ariaLabel: '挂轮系示意图（主轴 a — 中间轴 b·c — 丝杠 d，半径按齿数比例）',
    });

    function paintDiagram(solution: GearTrainSolution): void {
      try {
        diagramCard.innerHTML = parametricGearSVG(buildGearTrainFigure(solution));
      } catch {
        /* 退化防御：保上一帧（提示已在结果区） */
      }
    }

    const inputStack = document.createElement('div');
    inputStack.className = 'rc-p16__stack';
    inputStack.append(
      InputRow({
        label: '工件螺距 P',
        value: state.p,
        unit: 'mm',
        name: 'p',
        ariaLabel: '工件螺距 P（mm）',
        onInput: (value) => {
          state.p = value;
          paintResults();
        },
      }),
      InputRow({
        label: '丝杠导程 T',
        value: state.t,
        unit: 'mm',
        name: 't',
        ariaLabel: '丝杠导程 T（mm）',
        onInput: (value) => {
          state.t = value;
          paintResults();
        },
      }),
    );

    const setInfo = SubText('', { className: 'rc-p16__setinfo' });
    const teethInput = InputRow({
      label: '可用齿数',
      value: state.teeth,
      unit: '齿',
      inputMode: 'text',
      name: 'teeth',
      ariaLabel: '自定义可用齿数（空格或逗号分隔）',
      placeholder: '如 20 25 30 …（空格或逗号分隔）',
      onInput: (value) => {
        state.teeth = value;
        paintResults();
      },
    });
    teethInput.classList.add('rc-p16__teeth');

    const resultLabel = Eyebrow('推荐挂轮（前 8 组）');

    function hint(text: string): HTMLElement {
      return SubText(text, { className: 'rc-p16__hint' });
    }

    /** 结果表（V4.8-01）：挂轮格为可点按钮选择示意图对象，选中行 aria-pressed。 */
    function buildTable(
      solutions: readonly GearTrainSolution[],
      selectedIndex: number,
      onPick: (index: number) => void,
    ): HTMLElement {
      const table = document.createElement('div');
      table.className = 'rc-p16__table';
      table.setAttribute('role', 'table');
      table.setAttribute('aria-label', '挂轮方案前 8 组');

      const head = document.createElement('div');
      head.className = 'rc-p16__head';
      head.setAttribute('role', 'row');
      for (const [text, className] of [
        ['挂轮 a/b × c/d', 'rc-p16__gear'],
        ['比值', 'rc-p16__ratio'],
        ['误差 ppm', 'rc-p16__err'],
        ['', 'rc-p16__tag'],
      ] as const) {
        const cell = document.createElement('span');
        cell.className = `rc-p16__headcell ${className}`;
        cell.setAttribute('role', 'columnheader');
        cell.textContent = text;
        head.append(cell);
      }
      table.append(head);

      solutions.forEach((solution, index) => {
        const row = document.createElement('div');
        row.className = 'rc-p16__row';
        row.setAttribute('role', 'row');

        const gear = document.createElement('span');
        gear.className = 'rc-p16__gear la-mono';
        gear.setAttribute('role', 'cell');

        const pick = document.createElement('button');
        pick.type = 'button';
        pick.className = 'rc-p16__pick';
        pick.textContent = `${solution.a}/${solution.b} × ${solution.c}/${solution.d}`;
        pick.setAttribute(
          'aria-label',
          `示意图切换到第 ${index + 1} 组：${pick.textContent ?? ''}`,
        );
        pick.setAttribute('aria-pressed', index === selectedIndex ? 'true' : 'false');
        pick.addEventListener('click', () => onPick(index));
        gear.append(pick);

        const ratio = document.createElement('span');
        ratio.className = 'rc-p16__ratio la-num';
        ratio.setAttribute('role', 'cell');
        ratio.textContent = solution.ratio.toFixed(6);

        const error = document.createElement('span');
        error.className = 'rc-p16__err la-num';
        error.setAttribute('role', 'cell');
        error.textContent = solution.errorPpm.toFixed(2);

        const tag = document.createElement('span');
        tag.className = 'rc-p16__tag';
        tag.setAttribute('role', 'cell');
        if (solution.errorPpm === 0) tag.append(Badge('精确'));

        row.append(gear, ratio, error, tag);
        table.append(row);
      });

      return table;
    }

    function paintResults(): void {
      const p = Number(state.p.trim());
      const t = Number(state.t.trim());
      const target = p / t;

      const pValid = Number.isFinite(p) && p > 0;
      const tValid = Number.isFinite(t) && t > 0;
      const teeth: number[] = [];
      let teethError = '';

      try {
        teeth.push(...parseTeeth(state.teeth));
        if (teeth.some((tooth) => tooth <= 0)) {
          teethError = '齿数必须为正数（> 0）';
        } else if (teeth.length < 4) {
          teethError = `自定义齿数去重后至少 4 个（当前 ${teeth.length} 个）`;
        }
      } catch (error) {
        teethError = error instanceof Error ? error.message : '自定义齿数解析失败';
      }

      // G2-W11 Minor-2：默认预填五倍组须用户可见地明示「数学示例，非任何机床标配齿轮组」
      setInfo.textContent =
        teethError === ''
          ? `已用齿数 ${teeth.length} 枚：${teeth.join(' ')}${teeth.join(' ') === DEFAULT_TEETH ? '（数学示例集合，非任何机床标配齿轮组）' : ''}`
          : teethError;

      resultsWrap.replaceChildren(resultLabel);
      if (!pValid || !tValid) {
        resultsWrap.append(hint('请输入大于 0 的工件螺距 P 与丝杠导程 T'));
        return;
      }
      if (teethError !== '') {
        resultsWrap.append(hint(teethError));
        return;
      }

      let solutions: GearTrainSolution[];
      try {
        solutions = solveGearTrain({
          workpiecePitch: p,
          leadscrewPitch: t,
          availableTeeth: teeth,
        });
      } catch (error) {
        resultsWrap.append(hint(error instanceof Error ? error.message : '挂轮计算失败'));
        return;
      }

      // 输入变化 → 结果表重建，选中态重置回第 1 行（V4.8-01）
      state.selected = 0;
      const onPick = (index: number): void => {
        state.selected = index;
        resultsWrap
          .querySelectorAll('.rc-p16__pick')
          .forEach((btn, i) => btn.setAttribute('aria-pressed', i === index ? 'true' : 'false'));
        const current = solutions[index] ?? solutions[0];
        if (current) paintDiagram(current);
      };
      const tableEl = buildTable(solutions, state.selected, onPick);

      resultsWrap.append(
        Card({ tight: true, className: 'rc-p16__resultcard', children: [tableEl] }),
        SubText('同值齿数需两件齿轮：如 20/55 × 40/55 需 55 齿两件。', {
          className: 'rc-p16__note',
        }),
        Card({
          className: 'rc-p16__formula',
          children: [
            Eyebrow('传动比 i = P / T'),
            SubText(`i = P / T = ${state.p.trim()} / ${state.t.trim()} = ${target.toFixed(6)}`),
          ],
        }),
      );
      const initial = solutions[state.selected] ?? solutions[0];
      if (initial) paintDiagram(initial);
    }

    paintResults();

    body.append(
      Card({
        children: [Eyebrow('工件 / 丝杠'), inputStack],
      }),
      Card({
        children: [Eyebrow('齿轮组（自定义）'), teethInput, setInfo],
      }),
      diagramCard,
      resultsWrap,
    );

    ctx.root.append(
      createPage({
        id: 'p16',
        top: TopBar({ title }),
        body,
      }),
    );
  },
};

export default page;
