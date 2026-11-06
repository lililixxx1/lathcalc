/**
 * p06 · 圆弧 · 切点计算（W4-C3 实现）
 *
 * 入参：hash query `case` = AC01–AC12（p05 登记的同名链路键，见 p05.ts 文件头）。
 *   缺省 / 非法 → 渲染 12 工况选择器兜底，不进入计算。
 *
 * 计算与判向：
 *   - 只调用 core 的 arcCasesA/B solve()；几何与判向不在 UI 重算。
 *   - 判向由 core 统一走 arc.ts judgeArcDirection（图面顺时针 = 前刀架 G02；
 *     rearToolPost=1 时 G02/G03 对调）。本页仅展示「判向依据」，不自行判向。
 *   - gcodeLine 原样取 core 输出（≤3 位小数/去尾零/R 至少 1 位），UI 不重拼。
 *   - 后刀架：向 solve() 传可选键 rearToolPost=1。a/b 两组均支持翻转（b 组为
 *     W4-C3 R-1 Lead 补位，2026-11-03），判向依据行显示对调结果。
 *
 * 默认参数来源（均为树内黄金用例，见 test/arc-cases-a.test.ts / arc-cases-b.test.ts）：
 *   AC01 :57 ｜ AC02 :100 ｜ AC03 :144 ｜ AC04 :188 ｜ AC05 :235 ｜ AC06 :280
 *   AC07 :73 ｜ AC08 :104 ｜ AC09 :135 ｜ AC10 :171 ｜ AC11 :201 ｜ AC12 :230
 *
 * v0.4.0（WAVE-PLAN-V4.3 试点）：AC01/AC05 大图参数化——onInput 求解成功即重建
 * diagram innerHTML（core/arc-figure.ts 规格 + p05 装配）；求解异常保上一帧
 * （结果区已呈 WarnCard）。其余 10 案维持 v0.3.1 静态 hero 符号标注。
 */
import { buildArcFigure, PARAMETRIC_CASES, type ParametricCaseId } from '../../core/arc-figure';
import { arcCasesA } from '../../core/arc-cases-a';
import { arcCasesB } from '../../core/arc-cases-b';
import type { ArcCaseId, ArcCaseSolver, ArcSolution } from '../../core/types';
import {
  Accordion,
  Button,
  Card,
  Chip,
  CodeCard,
  Eyebrow,
  InputRow,
  ResultCard,
  Segmented,
  SubText,
  TopBar,
  WarnCard,
  createBody,
  createPage,
  injectStyle,
} from '../components';
import type { PageContext, PageModule } from '../router';
import { arcCaseGraphic, arcCaseParametricSVG } from './p05';

export const title = '圆弧 · 切点计算';

const CSS = `
.rc-p06__body { padding-top: 2px; gap: 8px; }
.la-card.rc-p06__diagram-card { padding: 10px; display: grid; place-items: center; color: var(--la-ink-body); }
.rc-p06__diagram { width: 100%; }
.rc-p06__diagram svg { width: 100%; height: 96px; display: block; }
.rc-p06__form { display: flex; flex-direction: column; gap: 6px; }
.rc-p06__result { display: flex; flex-direction: column; gap: 8px; min-height: 0; flex: 0 0 auto; }
.rc-p06__toolbar { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; }
.rc-p06__chip { color: var(--la-sub); font-size: 11.5px; padding: 7px 10px; }
.rc-p06__picker { display: flex; flex-wrap: wrap; gap: 7px; }
.rc-p06__picker .la-chip { font-size: 11.5px; }
`;

const ARC_CASES: readonly ArcCaseSolver[] = [...arcCasesA, ...arcCasesB];
const CASE_BY_ID = new Map<string, ArcCaseSolver>(ARC_CASES.map((solver) => [solver.id, solver]));

interface InputMeta {
  label: string;
  unit: string;
}

/** 通用输入键文案（个别工况在 CASE_LABELS 覆盖） */
const INPUT_META: Record<string, InputMeta> = {
  R: { label: '圆弧 R', unit: 'mm' },
  R1: { label: '圆弧 R1', unit: 'mm' },
  R2: { label: '圆弧 R2', unit: 'mm' },
  angle: { label: '角度 α', unit: '°' },
  stepD: { label: '台阶 Ø', unit: 'mm' },
  stepX: { label: '台阶 X', unit: 'mm' },
  stepZ: { label: '台阶 Z', unit: 'mm' },
  dX: { label: '径向偏移 dX', unit: 'mm' },
  dZ: { label: '轴向偏移 dZ', unit: 'mm' },
  lead: { label: '导程 lead', unit: 'mm' },
  boreD: { label: '孔径 boreD', unit: 'mm' },
};

/** 工况级文案覆盖（语义随 arc-cases-a/b 文件头锚点） */
const CASE_LABELS: Partial<Record<ArcCaseId, Record<string, string>>> = {
  // A4 对拍修正：AC01 输入标签对齐设计稿「斜角 α」（原用通用「角度 α」）
  AC01: { angle: '斜角 α' },
  AC02: { dZ: '圆心轴向差 dZ' },
  AC03: { dZ: '圆心轴向差 dZ' },
  AC04: { angle: '斜角 α' },
  AC05: { R: '圆角 R', stepX: '台阶 X（直径）' },
  AC06: { dX: '径向偏移 dX（直径）' },
  AC07: { R: '圆角 R', dX: '外圆 Ø dX', dZ: '端面 Z dZ' },
  AC08: { dZ: '端面偏移 dZ' },
  AC09: { R: '圆角 R', angle: '锥面半角 α' },
  AC10: { lead: '导程 lead' },
  AC11: { R: '球面 R' },
  AC12: { R: '圆角 R' },
};

/** 默认参数 = 树内黄金用例输入（逐条锚点见文件头） */
const DEFAULTS: Record<ArcCaseId, Readonly<Record<string, string>>> = {
  AC01: { R: '5', angle: '45', stepD: '36' },
  AC02: { R1: '10', R2: '15', dZ: '15' },
  AC03: { R1: '25', R2: '10', dZ: '9' },
  AC04: { R1: '5', R2: '3', angle: '45' },
  AC05: { R: '4', stepX: '20', stepZ: '-10' },
  AC06: { R: '10', dX: '12', dZ: '8' },
  AC07: { R: '5', dX: '30', dZ: '-30' },
  AC08: { R: '6', dZ: '-4' },
  AC09: { R: '5', angle: '30' },
  AC10: { R: '5', lead: '3.5' },
  AC11: { R: '10' },
  AC12: { R: '3', boreD: '20' },
};

/**
 * 「怎么算的」公式（受信内部 HTML，静态文本；不含用户输入）。
 * 内容逐条取自 arc-cases-a.ts / arc-cases-b.ts 文件头的冻结模型。
 */
const FORMULAS: Record<ArcCaseId, string> = {
  AC01: '圆心 C = P − R·n(α)，n = (−sinα, cosα)<br>切点 P = (Z 0, X 台阶Ø)，|C−P| = R<br>圆弧 S = C − R·u(α) 顺时针 90° 至 P（前刀架 G02）',
  AC02: '外切：|C1−C2| = R1 + R2<br>C1 = (Z0, X0)，C2 = (dZ, √((R1+R2)² − dZ²))<br>T = C1 + R1·e，e = (C2−C1)/|C1−C2|；S→T 顺时针 90°（前刀架 G02）',
  AC03: '内切：|C1−C2| = R1 − R2（R1 > R2）<br>C1 = (Z0, X0)，C2 = (dZ, √((R1−R2)² − dZ²))<br>T = C1 + R1·e；S→T 顺时针 90°（前刀架 G02）',
  AC04: '斜线过 P1 = (Z0, X0)，方向 u(α)；L = R1 + R2（冻结约定）<br>P2 = P1 + L·u；C2 = P2 + R2·n(α)<br>S2 = C2 − R2·u；S2→P2 逆时针 90°（前刀架 G03）',
  AC05: '尖角 (X stepX, Z stepZ)；圆心 C = (X stepX+2R, Z stepZ−R)<br>外圆切点 Q = (X stepX, Z stepZ−R)；台阶面切点 P = (X stepX+2R, Z stepZ)<br>Q→P 逆时针 90°（前刀架 G03）',
  AC06: '起点 S = (Z0, X0)；弦 c = (dZ, dX/2)，cL = |c| < 2R<br>C = M + q·n，M = S + c/2，q = √(R² − (cL/2)²)<br>终点 E = S + c 为切点；S→E 逆时针（前刀架 G03）',
  AC07: '凸圆角：C = (X dX−2R, Z dZ+R)<br>外圆切点 T1 = (X dX, Z dZ+R)；端面切点 T2 = (X dX−2R, Z dZ)<br>弧 T1→T2，材料在 +Z 侧',
  AC08: '端面 Z = 0；r_t = √(|dZ|·(2R−|dZ|))<br>切点 T = (X 2r_t, Z 0)；内端 E = (X 0, Z dZ)<br>圆心 C = (X 2r_t, Z sign(dZ)·R)；弧 E→T',
  AC09: '锥面半角 α，母线过原点；d = R(1+sinα)/cosα<br>端面切点 F = (X 2d, Z 0)；锥面切点 T = (X 2d·sinα, Z d·cosα)<br>弧 F→T',
  AC10: '圆心 C = (X0, Z0)，半径 R；导程 lead<br>切点 T = (X 2R, Z 0)；入口内端 E = (X 2√(R²−lead²), Z lead)<br>弧 E→T',
  AC11: '半球心 C = (X0, Z0)，半径 R<br>极点 P = (X0, Z−R)；赤道切点 T = (X 2R, Z 0)<br>弧 P→T',
  AC12: '孔壁 X = boreD，孔底面 Z = 0，材料在 +Z 侧<br>圆心 C = (X boreD+2R, Z R)<br>孔壁切点 T1 = (X boreD, Z R)；底面切点 T2 = (X boreD+2R, Z 0)；弧 T1→T2',
};

interface CaseState {
  values: Record<string, string>;
  rear: boolean;
}

/** 显示格式化：≤3 位小数、去尾零、整数不带点（输出层；程序行仍用 core 原值） */
function fmt(v: number): string {
  const rounded = Math.round(v * 1000) / 1000;
  let text = (Object.is(rounded, -0) ? 0 : rounded).toFixed(3).replace(/0+$/, '');
  if (text.endsWith('.')) text = text.slice(0, -1);
  return text;
}

/** 从 core 程序行读取 R 值用于展示（不重拼程序行） */
function radiusTextOf(gcodeLine: string): string {
  const match = /R(-?\d+(?:\.\d+)?)$/.exec(gcodeLine);
  return match?.[1] ?? '—';
}

function caseNumber(id: ArcCaseId): string {
  return id.slice(2);
}

function metaFor(caseId: ArcCaseId, key: string): InputMeta {
  const base = INPUT_META[key] ?? { label: key, unit: '' };
  const label = CASE_LABELS[caseId]?.[key] ?? base.label;
  return { label, unit: base.unit };
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function formulaContent(id: ArcCaseId): string {
  return `${FORMULAS[id]}<br>判向：judgeArcDirection（图面顺时针 = 前刀架 G02；后刀架翻转 G02/G03）；X 为直径制，内部 r = X/2。`;
}

/** 空参数 / 非法工况号兜底：12 工况选择器。 */
function renderCasePicker(ctx: PageContext, requested: string | null): void {
  injectStyle('rc-p06-styles', CSS);

  const body = createBody({ className: 'rc-p06__body' });
  const picker = document.createElement('div');
  picker.className = 'rc-p06__picker';
  for (const solver of ARC_CASES) {
    picker.append(
      Chip({
        label: `${caseNumber(solver.id)} ${solver.name}`,
        onClick: () => {
          void ctx.navigate('p06', { case: solver.id });
        },
      }),
    );
  }

  const card = Card({
    className: 'rc-p06__picker-card',
    children: [
      Eyebrow('选择工况'),
      SubText(
        requested
          ? `工况号「${requested}」无效，请选择加工情境后计算。`
          : '未指定工况号，请选择加工情境后计算。',
      ),
      picker,
    ],
  });

  body.append(
    card,
    Button({
      label: '打开工况图库',
      variant: 'ghost',
      icon: 'arc',
      onClick: () => {
        void ctx.navigate('p05');
      },
    }),
  );

  ctx.root.append(
    createPage({
      id: 'p06',
      top: TopBar({
        title: '圆弧切点',
        badge: '选择工况',
        onBack: () => {
          void ctx.navigate('p05');
        },
      }),
      body,
    }),
  );
}

/** 选定工况：参数表单 + 实时结果 + 前/后刀架 + 公式折叠。 */
function renderCase(ctx: PageContext, arcCase: ArcCaseSolver): void {
  injectStyle('rc-p06-styles', CSS);

  const state: CaseState = {
    values: { ...DEFAULTS[arcCase.id] },
    rear: false,
  };

  const body = createBody({ className: 'rc-p06__body' });

  const diagram = document.createElement('div');
  diagram.className = 'rc-p06__diagram';
  diagram.innerHTML = arcCaseGraphic(arcCase.id, 'hero');
  const diagramCard = Card({ className: 'rc-p06__diagram-card', children: [diagram] });

  // V4.3 试点：参数化案大图随输入重建；非试点案恒静态（本函数零重绘）
  const parametric = (PARAMETRIC_CASES as readonly string[]).includes(arcCase.id);
  function paintFigure(input: Record<string, number>): void {
    if (!parametric) return;
    try {
      diagram.innerHTML = arcCaseParametricSVG(buildArcFigure(arcCase.id as ParametricCaseId, input));
    } catch {
      /* 求解失败保上一帧；结果区已呈 WarnCard（V4.3 §5） */
    }
  }
  if (parametric) {
    const initial: Record<string, number> = {};
    let valid = true;
    for (const key of arcCase.inputs) {
      const raw = (state.values[key] ?? '').trim();
      const v = Number(raw);
      if (raw === '' || !Number.isFinite(v)) valid = false;
      else initial[key] = v;
    }
    if (valid) paintFigure(initial); // 缺省为黄金用例，不可达兜底：维持静态 hero
  }

  const form = document.createElement('div');
  form.className = 'rc-p06__form';
  for (const key of arcCase.inputs) {
    const meta = metaFor(arcCase.id, key);
    form.append(
      InputRow({
        label: meta.label,
        value: state.values[key] ?? '',
        unit: meta.unit,
        name: key,
        onInput: (value) => {
          state.values[key] = value;
          renderResult();
        },
      }),
    );
  }

  const resultHost = document.createElement('div');
  resultHost.className = 'rc-p06__result';

  const toolbar = document.createElement('div');
  toolbar.className = 'rc-p06__toolbar';
  const postSwitch = Segmented({
    options: [
      { value: 'front', label: '前刀架' },
      { value: 'rear', label: '后刀架' },
    ],
    value: 'front',
    ariaLabel: '刀架方位',
    onChange: (value) => {
      state.rear = value === 'rear';
      renderResult();
    },
  });
  const t3Chip = document.createElement('span');
  t3Chip.className = 'la-chip on rc-p06__chip';
  t3Chip.textContent = '刀尖方位 T3';
  const autoChip = document.createElement('span');
  autoChip.className = 'la-chip rc-p06__chip';
  autoChip.textContent = '自动判向 G02/G03';
  toolbar.append(postSwitch, t3Chip, autoChip);

  // 设计稿 p06 的「怎么算的」为展开态；本页结果区新增 R / 判向依据 / CodeCard 后，
  // 展开会超出 390×844（body overflow hidden），故默认收起，避免整页滚动或内容裁切。
  const accordion = Accordion({ open: false, content: formulaContent(arcCase.id) });

  body.append(diagramCard, form, resultHost, toolbar, accordion);

  /** 计算并重建结果区（输入即算；求解异常以 WarnCard 呈现，不冒泡）。 */
  function renderResult(): void {
    resultHost.replaceChildren();

    const input: Record<string, number> = {};
    for (const key of arcCase.inputs) {
      const raw = (state.values[key] ?? '').trim();
      const label = metaFor(arcCase.id, key).label;
      if (raw === '') {
        resultHost.append(WarnCard({ text: `请输入有效参数：${label}` }));
        return;
      }
      const value = Number(raw);
      if (!Number.isFinite(value)) {
        resultHost.append(WarnCard({ text: `参数不是有效数字：${label}` }));
        return;
      }
      input[key] = value;
    }

    let front: ArcSolution;
    try {
      front = arcCase.solve(input);
    } catch (error) {
      resultHost.append(WarnCard({ text: errorText(error) }));
      return;
    }
    // 前刀架求解成功即重绘参数化大图（几何与刀架无关，V4.3 §1；rear 只翻判向标签）
    paintFigure(input);

    let solution = front;
    if (state.rear) {
      try {
        // rearToolPost 为 core 冻结可选键；a/b 两组均翻转（b 组 W4-C3 R-1 补位）。
        solution = arcCase.solve({ ...input, rearToolPost: 1 });
      } catch (error) {
        resultHost.append(WarnCard({ text: errorText(error) }));
        return;
      }
    }

    const figureClockwise = state.rear
      ? solution.direction === 'G03'
      : solution.direction === 'G02';

    const basis = state.rear
      ? `后刀架 · 图面${figureClockwise ? '顺' : '逆'}时针 → ${solution.direction}（前后刀架对调）`
      : `前刀架 T3 · 图面${figureClockwise ? '顺' : '逆'}时针 → ${solution.direction}`;

    const centerText = `X${fmt(solution.center.x)} · Z${fmt(solution.center.z)} · R${radiusTextOf(solution.gcodeLine)}`;

    resultHost.append(
      ResultCard({
        ariaLabel: '切点计算结果',
        items: [
          { label: '切点 X', value: fmt(solution.tangent.x), unit: 'mm', big: true },
          { label: '切点 Z', value: fmt(solution.tangent.z), unit: 'mm', big: true },
          { label: '圆心 · R', value: centerText, mono: true },
          { label: '判向依据', value: basis, mono: true, copy: false },
        ],
      }),
      CodeCard({
        lines: [solution.gcodeLine],
        ariaLabel: 'G 代码程序行',
        comment: `${arcCase.id} ${arcCase.name} · ${state.rear ? '后刀架' : '前刀架'} · X 直径制 · 程序行终点 = 切点（core 输出）`,
      }),
    );
  }

  renderResult();

  ctx.root.append(
    createPage({
      id: 'p06',
      top: TopBar({
        title: arcCase.name,
        badge: `工况 ${caseNumber(arcCase.id)}`,
        onBack: () => {
          void ctx.navigate('p05');
        },
      }),
      body,
    }),
  );
}

const page: PageModule = {
  title,
  render(ctx: PageContext): void {
    const requested = ctx.params.get('case');
    const arcCase = requested ? CASE_BY_ID.get(requested) : undefined;
    if (!arcCase) {
      renderCasePicker(ctx, requested);
      return;
    }
    renderCase(ctx, arcCase);
  },
};

export default page;
