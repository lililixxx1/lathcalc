/**
 * p11 · 重量（W4-C5 实现）
 *
 * 设计稿区块（docs/车工计算App-无限画布.html 的 pWeight，自上而下）：
 *   状态栏 → 顶栏「重量」→ 形状分段（圆钢 / 六方 / 钢管 / 平板）
 *   → 尺寸输入 2 列网格 → 密度 chips → 单件重量大数字卡 →「怎么算的」→ Home 指示条
 *
 * 数据口径：
 *   - 密度表 src/data/densities.json（13 行）经 core/lookup.findDensity；
 *   - 计算 core/weight.barWeight：m = ρ(g/cm³) × V(mm³) / 1e6。
 * 设计稿 1.54 kg 等数字为静态示例，按附录 C 以 core 实时计算值替换（不属偏离）。
 */
import type { DensityRow, WeightShape } from '../../core/types';
import { barWeight } from '../../core/weight';
import { findDensity } from '../../core/lookup';
import densitiesJson from '../../data/densities.json';
import type { PageContext, PageModule } from '../router';
import {
  Accordion,
  Card,
  Chip,
  InputRow,
  Segmented,
  StatBlock,
  TopBar,
  createBody,
  createPage,
  injectStyle,
} from '../components';

const CSS = `
.rc-p11__grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.rc-p11__grid .la-input { min-width: 0; }
.rc-p11__density { display: flex; flex-wrap: wrap; gap: 7px; }
.rc-p11__statcard.la-card { padding: 2px 8px; }
.rc-p11__statcard .rc-stat.la-card { background: transparent; border: 0; border-radius: 0; padding: 11px 8px 9px; }
.rc-p11__result:empty, .rc-p11__formula:empty { display: none; }
`;

interface FieldDef {
  key: string;
  label: string;
  unit: string;
  defaultValue: string;
}

const SHAPES: ReadonlyArray<{ value: WeightShape; label: string }> = [
  { value: 'round', label: '圆钢' },
  { value: 'hex', label: '六方' },
  { value: 'pipe', label: '钢管' },
  { value: 'plate', label: '平板' },
];

/** 各形状的输入键（与 core/types.ts WeightInput.dims 注记一致）。 */
const SHAPE_FIELDS: Record<WeightShape, readonly FieldDef[]> = {
  round: [
    { key: 'D', label: '直径 D', unit: 'mm', defaultValue: '50' },
    { key: 'L', label: '长度 L', unit: 'mm', defaultValue: '100' },
  ],
  hex: [
    { key: 'S', label: '对边 S', unit: 'mm', defaultValue: '20' },
    { key: 'L', label: '长度 L', unit: 'mm', defaultValue: '100' },
  ],
  pipe: [
    { key: 'D', label: '外径 D', unit: 'mm', defaultValue: '60' },
    { key: 't', label: '壁厚 t', unit: 'mm', defaultValue: '5' },
    { key: 'L', label: '长度 L', unit: 'mm', defaultValue: '100' },
  ],
  plate: [
    { key: 'W', label: '宽 W', unit: 'mm', defaultValue: '100' },
    { key: 'T', label: '厚 T', unit: 'mm', defaultValue: '10' },
    { key: 'L', label: '长度 L', unit: 'mm', defaultValue: '200' },
  ],
};

const DENSITY_ROWS = densitiesJson as unknown as DensityRow[];

function isWeightShape(value: string): value is WeightShape {
  return SHAPES.some((shape) => shape.value === value);
}

function defaultValues(shape: WeightShape): Record<string, string> {
  const values: Record<string, string> = {};
  for (const field of SHAPE_FIELDS[shape]) values[field.key] = field.defaultValue;
  return values;
}

/** 尺寸显示：整数不带小数，非整数最多 3 位小数。 */
function formatDimension(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(3)));
}

/** 质量显示：≥0.01 kg 用 2 位小数（设计稿 1.54），更小用 4 位避免显示成 0.00。 */
function formatMass(massKg: number): string {
  if (!Number.isFinite(massKg)) return '—';
  return massKg >= 0.01 ? massKg.toFixed(2) : massKg.toFixed(4);
}

function formulaHtml(
  shape: WeightShape,
  dims: Record<string, number>,
  density: DensityRow,
  volumeMM3: number,
  massKg: number,
): string {
  const volume = volumeMM3.toFixed(0);
  const volumeCm3 = (volumeMM3 / 1000).toFixed(2);
  const mass = formatMass(massKg);
  let volumeLine: string;

  switch (shape) {
    case 'round': {
      const D = dims.D ?? 0;
      const L = dims.L ?? 0;
      volumeLine = `V = π·D²/4 × L = π×${formatDimension(D)}²/4 × ${formatDimension(L)} = ${volume} mm³`;
      break;
    }
    case 'hex': {
      const S = dims.S ?? 0;
      const L = dims.L ?? 0;
      volumeLine = `V = (√3/2)·S² × L = (√3/2)×${formatDimension(S)}² × ${formatDimension(L)} = ${volume} mm³`;
      break;
    }
    case 'pipe': {
      const D = dims.D ?? 0;
      const t = dims.t ?? 0;
      const L = dims.L ?? 0;
      const inner = D - 2 * t;
      volumeLine =
        `d = D − 2t = ${formatDimension(D)} − 2×${formatDimension(t)} = ${formatDimension(inner)}<br>` +
        `V = π/4·(D²−d²) × L = π/4×(${formatDimension(D)}²−${formatDimension(inner)}²)×${formatDimension(L)} = ${volume} mm³`;
      break;
    }
    case 'plate': {
      const W = dims.W ?? 0;
      const T = dims.T ?? 0;
      const L = dims.L ?? 0;
      volumeLine = `V = W·T·L = ${formatDimension(W)}×${formatDimension(T)}×${formatDimension(L)} = ${volume} mm³`;
      break;
    }
  }

  return (
    `${volumeLine}<br>` +
    `m = ρ·V = ${density.density} g/cm³ × ${volumeCm3} cm³ ≈ ${mass} kg`
  );
}

export const title = '重量';

const page: PageModule = {
  title,
  render(ctx: PageContext): void {
    injectStyle('rc-p11-styles', CSS);

    const state: {
      shape: WeightShape;
      densityKey: string;
      values: Record<string, string>;
    } = {
      shape: 'round',
      densityKey: 'carbon-steel',
      values: defaultValues('round'),
    };

    const segWrap = document.createElement('div');
    segWrap.className = 'rc-p11__seg';
    const inputsWrap = document.createElement('div');
    inputsWrap.className = 'rc-p11__grid';
    const densityWrap = document.createElement('div');
    densityWrap.className = 'rc-p11__density';
    const resultWrap = document.createElement('div');
    resultWrap.className = 'rc-p11__result';
    const accWrap = document.createElement('div');
    accWrap.className = 'rc-p11__formula';

    function currentDims(): Record<string, number> | null {
      const dims: Record<string, number> = {};
      for (const field of SHAPE_FIELDS[state.shape]) {
        const raw = state.values[field.key] ?? '';
        const value = Number(raw);
        if (!Number.isFinite(value) || value <= 0) return null;
        dims[field.key] = value;
      }
      if (state.shape === 'pipe') {
        const D = dims.D;
        const t = dims.t;
        if (D === undefined || t === undefined || t * 2 >= D) return null;
      }
      return dims;
    }

    function renderResult(): void {
      resultWrap.replaceChildren();
      accWrap.replaceChildren();
      const dims = currentDims();
      if (!dims) {
        resultWrap.append(
          Card({
            className: 'rc-p11__statcard',
            children: [
              StatBlock({ eyebrow: '单件重量 m', value: '—', unit: 'kg', ariaLabel: '单件重量' }),
            ],
          }),
        );
        return;
      }
      const density = findDensity(DENSITY_ROWS, state.densityKey);
      const result = barWeight({ shape: state.shape, dims, density: density.density });
      resultWrap.append(
        Card({
          className: 'rc-p11__statcard',
          children: [
            StatBlock({
              eyebrow: '单件重量 m',
              value: formatMass(result.massKg),
              unit: 'kg',
              ariaLabel: '单件重量',
            }),
          ],
        }),
      );
      accWrap.append(
        Accordion({
          open: true,
          content: formulaHtml(state.shape, dims, density, result.volumeMM3, result.massKg),
        }),
      );
    }

    function renderSeg(): void {
      segWrap.replaceChildren(
        Segmented({
          options: SHAPES,
          value: state.shape,
          ariaLabel: '型材形状',
          onChange: (value) => {
            if (!isWeightShape(value) || value === state.shape) return;
            state.shape = value;
            state.values = defaultValues(value);
            renderSeg();
            renderInputs();
            renderResult();
          },
        }),
      );
    }

    function renderInputs(): void {
      const nodes = SHAPE_FIELDS[state.shape].map((field) =>
        InputRow({
          label: field.label,
          unit: field.unit,
          name: field.key,
          value: state.values[field.key] ?? '',
          ariaLabel: `${field.label}（${SHAPES.find((shape) => shape.value === state.shape)?.label ?? ''}）`,
          onInput: (value) => {
            state.values[field.key] = value;
            renderResult();
          },
        }),
      );
      inputsWrap.replaceChildren(...nodes);
    }

    function renderDensity(): void {
      densityWrap.replaceChildren(
        ...DENSITY_ROWS.map((row) =>
          Chip({
            label: `${row.name} ${row.density.toFixed(2)}`,
            active: row.key === state.densityKey,
            onClick: () => {
              state.densityKey = row.key;
              renderDensity();
              renderResult();
            },
          }),
        ),
      );
    }

    renderSeg();
    renderInputs();
    renderDensity();
    renderResult();

    const body = createBody({ className: 'rc-p11__body' });
    body.append(segWrap, inputsWrap, densityWrap, resultWrap, accWrap);

    ctx.root.append(
      createPage({
        id: 'p11',
        top: TopBar({ title }),
        body,
      }),
    );
  },
};

export default page;
