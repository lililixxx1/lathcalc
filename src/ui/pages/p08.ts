/**
 * p08 · 公差配合（W4-C4 实现）
 *
 * 设计稿区块（docs/车工计算App-无限画布.html pTol）：
 *   状态栏 → 顶栏（GB/T 1800 徽标）→ 基本尺寸输入
 *   → 孔 H / 轴 h 分段 → IT 等级分段 → 偏差三联卡
 *   → 「常用配合」眉标 + chips → 怎么算的 → Home
 *
 * 计算口径：
 *   - IT 公差值一律走 src/core/lookup.ts `itToleranceMM`（(lo,hi] 左开右闭分段，
 *     Ø18 落 (10,18]、Ø40 落 (30,50]）；
 *   - 上下偏差由 src/core/tolerance.ts `toleranceCompose` 合成；
 *   - 页面不做任何表值兜底 / 硬编码，查表失败时给输入区提示；
 *   - IT5–IT12 共 8 级（data/tolerance-it.json 全量等级）。
 *
 * v0.6.2（WAVE-PLAN-V4.7，用户反馈 #4「公差配合没有示意图」）：公差带示意图
 * 参数化——单带画当前 H{grade}/h{grade}，选中配合 chip 画 H7+轴带（V4.7-01 形值
 * 同源）；图形零几何，坐标全来自 core/tolerance-figure；查表失败保上一帧
 * （V4.7-04）。
 *
 * 页面参数（README §5.3 登记）：`d`（基本尺寸 mm）、`grade`（IT 等级）。
 */
import type { PageContext, PageModule } from '../router';
import type { FitResult, ITTableRow, ToleranceResult } from '../../core/types';
import { itToleranceMM } from '../../core/lookup';
import { fitTolerance, toleranceCompose } from '../../core/tolerance';
import {
  TOL_FIGURE_VIEW,
  buildToleranceFigure,
  type TolBandInput,
  type TolFigureView,
} from '../../core/tolerance-figure';
import {
  Accordion,
  Badge,
  Card,
  Chip,
  InputRow,
  ResultCard,
  Segmented,
  StatTriple,
  TopBar,
  createBody,
  createKeypadController,
  createPage,
  escapeHtml,
  injectStyle,
} from '../components';
import toleranceJson from '../../data/tolerance-it.json';

const IT_ROWS = toleranceJson as unknown as ITTableRow[];

const CSS = `
.la-page[data-page="p08"] .la-body { overflow-y: auto; }
.rc-p08__hint { font-size: 12px; line-height: 1.55; color: var(--la-accent-ink); padding: 0 2px; }
.rc-p08__presets { display: flex; flex-wrap: wrap; gap: 7px; }
.rc-p08__fithead { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 4px; }
.rc-p08__fitcard { margin-top: 6px; }
/* V4.7 公差带示意图卡（同 p12 示意图卡布局） */
.rc-p08__diagram { padding: 10px; display: grid; place-items: center; }
.rc-p08__diagram svg { color: var(--la-ink-body); }
/* W12 A4-W5：la-eyebrow 全局 text-transform:uppercase 会把配合代号 g6/k6/p6 显示成大写，
   GB/T 1800.1 轴公差带代号须小写——配合卡域内关闭大写变换 */
.rc-p08__fitcard .la-eyebrow { text-transform: none; }
`;

type FitBand = 'g6' | 'k6' | 'p6';

interface FitPreset {
  band: FitBand;
  /** chips 文案（与设计稿静态标签一致，最后两字即类别） */
  label: string;
  category: '间隙' | '过渡' | '过盈';
}

const FIT_PRESETS: readonly FitPreset[] = [
  { band: 'g6', label: 'H7/g6 间隙', category: '间隙' },
  { band: 'k6', label: 'H7/k6 过渡', category: '过渡' },
  { band: 'p6', label: 'H7/p6 过盈', category: '过盈' },
];

const GRADES: readonly number[] = [5, 6, 7, 8, 9, 10, 11, 12];

function parseNum(text: string): number | null {
  const trimmed = text.trim();
  if (trimmed === '') return null;
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : null;
}

/** 带符号偏差：+0.025 / 0.000 / -0.025（三位小数）。 */
function signed(value: number, digits = 3): string {
  const threshold = 0.5 / 10 ** digits;
  if (Math.abs(value) < threshold) return (0).toFixed(digits);
  return `${value > 0 ? '+' : ''}${value.toFixed(digits)}`;
}

/** 正公差值：0.025（三位小数）。 */
function positive(value: number, digits = 3): string {
  return Math.abs(value).toFixed(digits);
}

/** 带符号 μm 整数：+7 / −20 / 0（负号用 U+2212，与设计稿排版一致）。 */
function signedUM(value: number): string {
  if (value === 0) return '0';
  return `${value > 0 ? '+' : '−'}${Math.abs(value)}`;
}

/** 基本尺寸显示：去尾零。 */
function formatNominal(value: number): string {
  const rounded = Number(value.toFixed(3));
  return String(rounded === 0 ? 0 : rounded);
}

/**
 * 公差带示意图 SVG 装配（V4.7：零几何，坐标全来自 core/tolerance-figure）。
 * 层序：零线（灰细）→ 公差带矩形（孔=墨、轴=橙墨）→ 标签；色值走 token。
 */
function parametricTolSVG(view: TolFigureView): string {
  const n2 = (v: number): number => Math.round(v * 100) / 100;
  const zero = `<path d="M${n2(view.zeroLine.x1)} ${n2(view.zeroLine.y)}L${n2(view.zeroLine.x2)} ${n2(view.zeroLine.y)}" stroke="var(--la-sub)" stroke-width="1.2"/>`;
  const rects = view.bands
    .map(
      (b) =>
        `<rect x="${n2(b.x0)}" y="${n2(b.yTop)}" width="${n2(b.x1 - b.x0)}" height="${n2(b.yBot - b.yTop)}" stroke="${b.kind === 'shaft' ? 'var(--la-accent-ink)' : 'currentColor'}"/>`,
    )
    .join('');
  const labels = view.labels
    .map((l) => {
      const color =
        l.role === 'unit'
          ? 'var(--la-sub)'
          : l.role === 'code' && l.text === l.text.toLowerCase()
            ? 'var(--la-accent-ink)'
            : l.role === 'code'
              ? 'currentColor'
              : 'var(--la-sub)';
      const size = l.role === 'unit' ? 8 : 11;
      return `<text x="${n2(l.x)}" y="${n2(l.y)}" font-size="${size}" fill="${color}" stroke="none" text-anchor="${l.anchor}">${escapeHtml(l.text)}</text>`;
    })
    .join('');
  return `<svg viewBox="0 0 ${TOL_FIGURE_VIEW.width} ${TOL_FIGURE_VIEW.height}" width="100%" height="96" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true">${zero}${rects}${labels}</svg>`;
}

export const title = '公差配合';

const page: PageModule = {
  title,
  render(ctx: PageContext): void {
    injectStyle('rc-p08-styles', CSS);

    const nominalParam = Number(ctx.params.get('d'));
    const gradeParam = Number(ctx.params.get('grade'));
    let nominalText =
      Number.isFinite(nominalParam) && nominalParam > 0 ? String(nominalParam) : '40';
    let grade = GRADES.includes(gradeParam) ? gradeParam : 7;
    let fundamental = 'H';
    let accordionOpen = false;
    let fitBand: FitBand | null = null;

    const body = createBody({ className: 'rc-p08__body' });

    // V4.12-B：底部数字键盘（用户指令全站统一）。nominalText 为真值源，
    // 软键盘输入 / 键盘写回两条路径都经 keypadTexts 同步。
    const keypadTexts: Record<string, string> = { nominal: nominalText };
    const keypadController = createKeypadController({
      texts: keypadTexts,
      onChange: (field) => {
        if (field === 'nominal') nominalText = keypadTexts.nominal ?? nominalText;
        paint();
      },
    });

    const inputRow = InputRow({
      label: '基本尺寸',
      value: nominalText,
      unit: 'mm',
      name: 'nominal',
      onInput: (value) => {
        nominalText = value;
        keypadTexts.nominal = value;
        paint();
      },
    });
    keypadController.register('nominal', inputRow);
    keypadController.setActive('nominal');

    const holeSeg = Segmented({
      options: [
        { value: 'H', label: '孔 H' },
        { value: 'h', label: '轴 h' },
      ],
      value: fundamental,
      ariaLabel: '孔轴制',
      onChange: (value) => {
        fundamental = value === 'h' ? 'h' : 'H';
        paint();
      },
    });

    const gradeSeg = Segmented({
      options: GRADES.map((value) => ({ value: String(value), label: `IT${value}` })),
      value: String(grade),
      small: true,
      ariaLabel: 'IT 等级',
      onChange: (value) => {
        const next = Number(value);
        if (GRADES.includes(next)) grade = next;
        paint();
      },
    });

    const statWrap = document.createElement('div');
    statWrap.className = 'rc-p08__stat';
    // V4.7 公差带示意图卡：插在 IT 等级分段与三联卡之间（查表失败保上一帧）
    const diagramCard = Card({
      className: 'rc-p08__diagram',
      ariaLabel: '公差带示意图（零线上正下负，偏差单位 μm）',
    });
    const presetLabel = document.createElement('div');
    presetLabel.className = 'la-eyebrow rc-p08__presetlabel';
    const presetWrap = document.createElement('div');
    presetWrap.className = 'rc-p08__presets';
    interface PresetChip {
      band: FitBand;
      el: HTMLButtonElement;
    }
    const presetChips: PresetChip[] = [];
    for (const preset of FIT_PRESETS) {
      const chip = Chip({
        label: preset.label,
        onClick: () => {
          fitBand = preset.band;
          paint();
        },
      }) as HTMLButtonElement;
      chip.classList.add('rc-p08__preset');
      chip.dataset.fit = preset.band;
      presetChips.push({ band: preset.band, el: chip });
      presetWrap.append(chip);
    }
    const fitWrap = document.createElement('div');
    fitWrap.className = 'rc-p08__fit';
    const accWrap = document.createElement('div');
    accWrap.className = 'rc-p08__acc';

    interface Outcome {
      result: ToleranceResult;
      itMM: number;
      nominal: number;
    }

    interface FitOutcome {
      result: FitResult;
      preset: FitPreset;
    }

    function compute(): Outcome | null {
      const nominal = parseNum(nominalText);
      if (nominal === null || nominal <= 0) return null;
      try {
        const itMM = itToleranceMM(IT_ROWS, nominal, grade);
        const result = toleranceCompose({ nominal, grade, fundamental }, itMM, 0);
        return { result, itMM, nominal };
      } catch {
        return null;
      }
    }

    /** 当前选中 chips 的配合实算；未选 / 缺段 / 越界返回 null。 */
    function computeFit(nominal: number): FitOutcome | null {
      if (fitBand === null) return null;
      const preset = FIT_PRESETS.find((item) => item.band === fitBand);
      if (!preset) return null;
      try {
        return { result: fitTolerance({ nominal, shaftBand: fitBand }), preset };
      } catch {
        return null;
      }
    }

    function updatePresets(enabled: boolean): void {
      for (const { band, el } of presetChips) {
        el.disabled = !enabled;
        const on = enabled && fitBand === band;
        el.classList.toggle('on', on);
        if (on) el.setAttribute('aria-pressed', 'true');
        else el.removeAttribute('aria-pressed');
      }
    }

    function renderFit(fit: FitOutcome, nominal: number): void {
      const { result, preset } = fit;
      const head = document.createElement('div');
      head.className = 'rc-p08__fithead';
      const eyebrow = document.createElement('div');
      eyebrow.className = 'la-eyebrow';
      eyebrow.textContent = `配合实算 Ø${formatNominal(nominal)} H7/${preset.band}`;
      head.append(eyebrow, Badge(preset.category));

      const rows = ResultCard({
        ariaLabel: '配合极限偏差与间隙/过盈',
        items: [
          { label: '孔 H7 上偏差 ES', value: signedUM(result.hole.upperUM), unit: 'μm' },
          { label: '孔 H7 下偏差 EI', value: signedUM(result.hole.lowerUM), unit: 'μm' },
          { label: `轴 ${preset.band} 上偏差 es`, value: signedUM(result.shaft.upperUM), unit: 'μm' },
          { label: `轴 ${preset.band} 下偏差 ei`, value: signedUM(result.shaft.lowerUM), unit: 'μm' },
          {
            label: '配合 Xmin–Xmax',
            value: `${signedUM(result.minUM)} … ${signedUM(result.maxUM)}`,
            unit: 'μm',
          },
        ],
      });

      fitWrap.replaceChildren(
        Card({
          className: 'rc-p08__fitcard',
          ariaLabel: `配合实算 H7/${preset.band}`,
          children: [head, rows],
        }),
      );
    }

    function paint(): void {
      const outcome = compute();
      if (!outcome) {
        const hint = document.createElement('div');
        hint.className = 'rc-p08__hint';
        hint.setAttribute('role', 'note');
        hint.textContent = '基本尺寸需大于 0 且在内置公差表范围内；当前输入暂不可查表。';
        statWrap.replaceChildren(hint);
        presetLabel.textContent = '常用配合';
        fitWrap.replaceChildren();
        updatePresets(false);
        accWrap.replaceChildren();
        return;
      }

      const { result, itMM, nominal } = outcome;
      const isHole = fundamental === 'H';
      const fit = computeFit(nominal);
      updatePresets(true);
      if (fit) renderFit(fit, nominal);
      else fitWrap.replaceChildren();

      // V4.7-01 形值同源：选中配合画 H7+轴带（fitTolerance μm 整数），
      // 否则画当前 H{grade}/h{grade} 单带（ToleranceResult mm ×1000 取整）。
      const figureBands: TolBandInput[] = fit
        ? [
            { code: 'H7', kind: 'hole', lowerUM: fit.result.hole.lowerUM, upperUM: fit.result.hole.upperUM },
            { code: fit.preset.band, kind: 'shaft', lowerUM: fit.result.shaft.lowerUM, upperUM: fit.result.shaft.upperUM },
          ]
        : [
            {
              code: `${fundamental}${grade}`,
              kind: 'single',
              lowerUM: Math.round(result.lower * 1000),
              upperUM: Math.round(result.upper * 1000),
            },
          ];
      try {
        diagramCard.innerHTML = parametricTolSVG(buildToleranceFigure(figureBands));
      } catch {
        /* 退化防御：保上一帧（提示已在输入区） */
      }

      statWrap.replaceChildren(
        StatTriple({
          ariaLabel: '极限偏差与公差',
          items: [
            {
              value: signed(result.upper),
              label: isHole ? '上偏差 ES' : '上偏差 es',
            },
            {
              value: signed(result.lower),
              label: isHole ? '下偏差 EI' : '下偏差 ei',
            },
            {
              value: positive(result.tolerance),
              label: '公差 T',
              accent: true,
            },
          ],
        }),
      );
      presetLabel.textContent = `常用配合（Ø${formatNominal(nominal)} ${fundamental}${grade} …）`;

      let content = isHole
        ? `Ø${formatNominal(nominal)} 按 GB/T 1800.1 分段（左开右闭）查 IT${grade} = ${positive(itMM * 1000, 0)} μm<br>` +
          `H（基孔制）：EI = 0 → ES = EI + IT = ${signed(result.upper)}<br>` +
          '表值为内置查表数据（GB/T 1800.1）'
        : `Ø${formatNominal(nominal)} 按 GB/T 1800.1 分段（左开右闭）查 IT${grade} = ${positive(itMM * 1000, 0)} μm<br>` +
          `h（基轴制）：es = 0 → ei = es − IT = ${signed(result.lower)}<br>` +
          '表值为内置查表数据（GB/T 1800.1）';
      if (fit) {
        const { result: fitResult, preset } = fit;
        content +=
          `<br>配合 H7/${preset.band}：Xmin = EI − es = ${signedUM(fitResult.hole.lowerUM)} − (${signedUM(fitResult.shaft.upperUM)}) = ${signedUM(fitResult.minUM)} μm` +
          `<br>配合 H7/${preset.band}：Xmax = ES − ei = ${signedUM(fitResult.hole.upperUM)} − (${signedUM(fitResult.shaft.lowerUM)}) = ${signedUM(fitResult.maxUM)} μm`;
      }
      accWrap.replaceChildren(
        Accordion({
          open: accordionOpen,
          onToggle: (open) => {
            accordionOpen = open;
          },
          content,
        }),
      );
    }

    paint();
    // V4.12-B 补位：键盘走页级 footer 槽（.la-body 滚动区之外常显，见 CSS overflow-y 覆盖）
    body.append(inputRow, holeSeg, gradeSeg, diagramCard, statWrap, presetLabel, presetWrap, fitWrap, accWrap);

    ctx.root.append(
      createPage({
        id: 'p08',
        top: TopBar({ title, badge: 'GB/T 1800' }),
        body,
        footer: keypadController.keypadEl(),
      }),
    );
  },
};

export default page;
