/**
 * p02 · 螺纹 · 选型（W4-C2 实现）
 *
 * 设计稿区块（自上而下，docs/车工计算App-无限画布.html:1162-1182）：
 *   状态栏 → 顶栏（螺纹 + 标准徽标）→ 四族分段页签 → 族内搜索
 *   → 粗牙 / 细牙 / 按螺距筛选 → 规格列表（族内全量，卡内滚动）
 *   → 自定义规格（设计稿静态行）→ 列表说明 → Home 指示条
 *
 * 数据口径：四张 threads-*.json 经 core/lookup.listThreads 查询；
 *   中径预览经 core/thread.threadDimensions 计算（UI 不硬编码任何标准表数值）。
 * 跳转：选定行 → p03，参数键 family/spec/d/p（src/ui/README.md §5.2 冻结链路）。
 */
import type { PageContext, PageModule } from '../router';
import {
  Button,
  Card,
  Chip,
  InputRow,
  ListRow,
  RowList,
  Segmented,
  SubText,
  TopBar,
  createBody,
  createPage,
  icon,
  injectStyle,
} from '../components';
import { listThreads } from '../../core/lookup';
import { threadDimensions, wormGeometry } from '../../core/thread';
import type { FlankAngle, ThreadFamily, ThreadRow } from '../../core/types';
import metricRows from '../../data/threads-metric.json';
import trapezoidRows from '../../data/threads-trapezoid.json';
import pipeRows from '../../data/threads-pipe.json';
import unifiedRows from '../../data/threads-unified.json';
import sealpipeRows from '../../data/threads-sealpipe.json';
import nptRows from '../../data/threads-npt.json';
import wormRows from '../../data/threads-worm.json';

/** 七族数据（W3 冻结表 + W8-A 三新族；行数 149/53/13/20/15/14/15 由测试逐族断言） */
const ALL_ROWS: ThreadRow[] = [
  ...(metricRows as unknown as ThreadRow[]),
  ...(trapezoidRows as unknown as ThreadRow[]),
  ...(pipeRows as unknown as ThreadRow[]),
  ...(unifiedRows as unknown as ThreadRow[]),
  ...(sealpipeRows as unknown as ThreadRow[]),
  ...(nptRows as unknown as ThreadRow[]),
  ...(wormRows as unknown as ThreadRow[]),
];

type RouteFamily =
  | 'metric'
  | 'trapezoid'
  | 'pipe'
  | 'unified'
  | 'sealpipe'
  | 'npt'
  | 'worm';
/** 粗牙筛选（仅 metric 有意义；non-metric 页签下禁用） */
type CoarseFilter = 'all' | 'coarse' | 'fine';

interface FamilyTab {
  /** 路由 family 键（README §5.2：pipe 不是 pipe55） */
  value: RouteFamily;
  /** 页签文案（设计稿：普通 M / 梯形 Tr / 55° 管 / 美制 UN） */
  label: string;
  /** 数据表 family 口径 */
  dataFamily: ThreadFamily;
  /** 顶栏标准徽标（设计稿静态 GB/T 193，按族切换为对应标准） */
  standard: string;
}

const FAMILY_TABS: readonly FamilyTab[] = [
  { value: 'metric', label: '普通 M', dataFamily: 'metric', standard: 'GB/T 193' },
  { value: 'trapezoid', label: '梯形 Tr', dataFamily: 'trapezoid', standard: 'GB/T 5796' },
  { value: 'pipe', label: '55° 管', dataFamily: 'pipe55', standard: 'GB/T 7307' },
  { value: 'unified', label: '美制 UN', dataFamily: 'unified', standard: 'ASME B1.1' },
  { value: 'sealpipe', label: '密封管 R', dataFamily: 'sealpipe', standard: 'GB/T 7306' },
  { value: 'npt', label: '锥管 NPT', dataFamily: 'npt', standard: 'GB/T 12716' },
  { value: 'worm', label: '蜗杆', dataFamily: 'worm', standard: 'GB/T 10087' },
];

const HINT_D2 = '右侧为中径预览 d₂ / mm · 选中查看完整结果';
const HINT_WORM = '右侧为轴向齿距 px / mm · 选中查看几何结果';

const CSS = `
.rc-p02__body { padding-top: 4px; }
/* 七签在 390px 下容纳不下（WAVE-PLAN-V3 §1）：页签容器横向滚动，子项不压缩 */
.rc-p02__body .la-seg { overflow-x: auto; scrollbar-width: none; }
.rc-p02__body .la-seg::-webkit-scrollbar { display: none; }
.rc-p02__body .la-seg > .rc-seg__item { flex: 0 0 auto; padding-left: 10px; padding-right: 10px; }
.rc-p02__chips { display: flex; gap: 7px; flex: 0 0 auto; }

.rc-p02__listcard { flex: 1 1 auto; min-height: 0; display: flex; }
.rc-p02__listcard .la-rowlist { flex: 1 1 auto; min-height: 0; overflow-y: auto; }
.rc-p02__customrow { cursor: pointer; }
.rc-p02__customname { color: var(--la-sub); }
.rc-p02__customval { color: var(--la-accent-ink); font-weight: 600; }
.rc-p02__custompanel { display: flex; flex-direction: column; gap: 8px; padding: 4px 0 10px; border-top: 1px solid var(--la-border-soft); }
.rc-p02__customerr { font-size: 12px; line-height: 1.55; color: var(--la-accent-ink); padding: 0 2px; }
.rc-p02__customactions { display: flex; }
.rc-p02__customactions .la-btn { flex: 1 1 auto; }
`;

function flankAngleFor(family: ThreadFamily): FlankAngle {
  if (family === 'pipe55' || family === 'sealpipe') return 55;
  if (family === 'trapezoid') return 30;
  if (family === 'worm') return 40;
  return 60;
}

/** 螺距显示：≤3 位小数、去尾零（3.5 / 2 / 1.814） */
function formatPitch(pitch: number): string {
  return String(Math.round(pitch * 1000) / 1000);
}

/**
 * 列表显示名（设计稿风格）：
 *   M30（粗牙，P=3.5）→ "M30 × 3.5"；M30×2 → "M30 × 2"；Tr40×7 → "Tr40 × 7"；
 *   管 / 美制保持原规格名（G1/2、1/4-20 UNC）。
 */
function displayName(row: ThreadRow): string {
  if (row.designation.includes('×')) return row.designation.replace('×', ' × ');
  if (row.family === 'metric' || row.family === 'trapezoid') {
    return `${row.designation} × ${formatPitch(row.pitch)}`;
  }
  return row.designation;
}

/** 中径预览（mm，3 位小数）：60°/55°/30°Tr 常数族由 core/thread 路由 */
function previewD2(row: ThreadRow): string {
  return threadDimensions({
    family: row.family,
    designation: row.designation,
    pitch: row.pitch,
    major: row.major,
    flankAngle: flankAngleFor(row.family),
  }).d2.toFixed(3);
}

/** 行右侧预览值：蜗杆显示轴向齿距 px=π·m（活算），其余族显示中径 d₂ */
function previewValue(row: ThreadRow): string {
  if (row.family === 'worm') return wormGeometry(row.pitch).axialPitch.toFixed(3);
  return previewD2(row);
}

/** 设计稿静态「自定义规格…」行（docs/车工计算App-无限画布.html:1178）；W6-C3 激活为可展开输入（V2-8） */

export const title = '螺纹 · 选型';

const page: PageModule = {
  title,
  render(ctx: PageContext): void {
    injectStyle('rc-p02-styles', CSS);

    let family: RouteFamily = 'metric';
    let coarse: CoarseFilter = 'all';
    let query = '';
    let pitchMode = false;
    let customOpen = false;
    let customD = '';
    let customP = '';
    let customErrorEl: HTMLElement | null = null;

    const activeTab = (): FamilyTab =>
      FAMILY_TABS.find((tab) => tab.value === family) ?? FAMILY_TABS[0]!;

    const top = TopBar({ title: '螺纹', badge: FAMILY_TABS[0]!.standard });
    const body = createBody({ className: 'rc-p02__body', ariaLabel: '螺纹选型' });
    const searchWrap = document.createElement('div');
    searchWrap.className = 'rc-p02__search';
    const chipsRow = document.createElement('div');
    chipsRow.className = 'rc-p02__chips';
    const listCard = Card({
      tight: true,
      className: 'rc-p02__listcard',
      ariaLabel: '螺纹规格列表',
    });
    const customCard = Card({ tight: true, className: 'rc-p02__customcard' });
    const hint = SubText(HINT_D2, { center: true });

    function syncBadge(): void {
      const badge = top.querySelector<HTMLElement>('.la-badge');
      if (badge) badge.textContent = activeTab().standard;
    }

    function syncHint(): void {
      hint.textContent = family === 'worm' ? HINT_WORM : HINT_D2;
    }

    function buildSearch(): void {
      searchWrap.replaceChildren(
        InputRow({
          label: '搜索',
          value: query,
          placeholder: pitchMode ? '输入螺距，如 3.5' : '规格名或螺距',
          inputMode: 'text',
          ariaLabel: '族内搜索规格',
          onInput: (value) => {
            query = value;
            renderList();
          },
        }),
      );
    }

    function buildChips(): void {
      const metricOnly = family === 'metric';
      chipsRow.replaceChildren(
        Chip({
          label: '粗牙',
          active: coarse === 'coarse',
          disabled: !metricOnly,
          onClick: () => {
            coarse = coarse === 'coarse' ? 'all' : 'coarse';
            buildChips();
            renderList();
          },
        }),
        Chip({
          label: '细牙',
          active: coarse === 'fine',
          disabled: !metricOnly,
          onClick: () => {
            coarse = coarse === 'fine' ? 'all' : 'fine';
            buildChips();
            renderList();
          },
        }),
        Chip({
          label: '按螺距筛选',
          active: pitchMode,
          onClick: () => {
            pitchMode = !pitchMode;
            buildSearch();
            buildChips();
            renderList();
          },
        }),
      );
    }

    function submitCustom(): void {
      const d = Number(customD.trim());
      const p = Number(customP.trim());
      if (!Number.isFinite(d) || d <= 0 || !Number.isFinite(p) || p <= 0) {
        if (customErrorEl) {
          customErrorEl.textContent = '请输入大于 0 的大径 d 与螺距 P。';
          customErrorEl.hidden = false;
        }
        return;
      }
      if (customErrorEl) {
        customErrorEl.textContent = '';
        customErrorEl.hidden = true;
      }
      // V2-5：只输 d + P，牙型角由 p03 按 family 取；spec 显示名钉死为「自定义 Ø30×3.5」。
      void ctx.navigate('p03', {
        family,
        spec: `自定义 Ø${d}×${p}`,
        d,
        p,
      });
    }

    /** 自定义规格行：点击展开 d / P 两格 + 计算按钮；族别取当前页签（V2-8）。 */
    function renderCustom(): void {
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'la-lrow rc-lrow rc-p02__customrow';
      row.setAttribute('aria-expanded', String(customOpen));
      // 折叠态保留设计稿静态「P = 2.0」；展开后隐藏，避免与用户输入冲突。
      const staticVal = customOpen
        ? ''
        : '<span class="val la-num rc-p02__customval">P = 2.0</span>';
      row.innerHTML = `<span class="grow rc-lrow__name rc-p02__customname">自定义规格…</span>${staticVal}<span class="rc-lrow__chev">${icon(customOpen ? 'chevd' : 'chev', 15)}</span>`;
      row.addEventListener('click', () => {
        customOpen = !customOpen;
        renderCustom();
      });

      const children: HTMLElement[] = [row];
      customErrorEl = null;
      if (customOpen) {
        const clearError = (): void => {
          if (customErrorEl) {
            customErrorEl.textContent = '';
            customErrorEl.hidden = true;
          }
        };

        const panel = document.createElement('div');
        panel.className = 'rc-p02__custompanel';
        panel.setAttribute('role', 'group');
        panel.setAttribute('aria-label', '自定义规格输入');
        panel.append(
          InputRow({
            label: '大径 d',
            value: customD,
            unit: 'mm',
            name: 'customD',
            placeholder: '如 30',
            onInput: (value) => {
              customD = value;
              clearError();
            },
          }),
          InputRow({
            label: '螺距 P',
            value: customP,
            unit: 'mm',
            name: 'customP',
            placeholder: '如 3.5',
            onInput: (value) => {
              customP = value;
              clearError();
            },
          }),
        );

        const error = document.createElement('div');
        error.className = 'rc-p02__customerr';
        error.setAttribute('role', 'note');
        error.hidden = true;
        customErrorEl = error;

        const actions = document.createElement('div');
        actions.className = 'rc-p02__customactions';
        actions.append(Button({ label: '计算', onClick: submitCustom }));

        panel.append(error, actions);
        children.push(panel);
      }
      customCard.replaceChildren(...children);
    }

    function filteredRows(): ThreadRow[] {
      const tab = activeTab();
      let rows = listThreads(ALL_ROWS, tab.dataFamily, coarse === 'coarse');
      if (coarse === 'fine') rows = rows.filter((row) => row.coarse !== true);
      const needle = query.trim().toLowerCase();
      if (!needle) return rows;
      return rows.filter((row) => {
        if (pitchMode) return formatPitch(row.pitch).includes(needle);
        return (
          row.designation.toLowerCase().includes(needle) ||
          displayName(row).toLowerCase().includes(needle) ||
          formatPitch(row.pitch).includes(needle)
        );
      });
    }

    function renderList(): void {
      const tab = activeTab();
      const rows = filteredRows();
      const items = rows.map((row) => {
        const name = displayName(row);
        const value = previewValue(row);
        const valueLabel = row.family === 'worm' ? '轴向齿距' : '中径';
        return ListRow({
          name,
          value,
          ariaLabel: `${name}，${valueLabel} ${value} 毫米`,
          onClick: () => {
            void ctx.navigate('p03', {
              family: tab.value,
              spec: name,
              d: row.major,
              p: row.pitch,
            });
          },
        });
      });
      listCard.replaceChildren(RowList(items, `${tab.label} 规格`));
    }

    const segmented = Segmented({
      options: FAMILY_TABS.map((tab) => ({ value: tab.value, label: tab.label })),
      value: family,
      ariaLabel: '螺纹制式',
      onChange: (value) => {
        family = FAMILY_TABS.find((tab) => tab.value === value)?.value ?? 'metric';
        coarse = 'all';
        query = '';
        pitchMode = false;
        syncBadge();
        syncHint();
        buildSearch();
        buildChips();
        renderList();
      },
    });

    body.append(segmented, searchWrap, chipsRow, listCard, customCard, hint);
    buildSearch();
    buildChips();
    renderCustom();
    syncHint();
    renderList();

    ctx.root.append(createPage({ id: 'p02', top, body }));
  },
};

export default page;
