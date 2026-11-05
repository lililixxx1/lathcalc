/**
 * p15 · 宏程序库（W11-A 实现；WAVE-PLAN-V4 §3 / V4.1 §2）
 *
 * 定位（调研报告:380）：椭圆 / 网纹 / 油槽 / 切槽 四模板，FANUC B 类宏变量，
 * 免费开放（对位竞品 VIP 锁）。实现契约见 src/core/types.ts MacroTemplateSpec/MacroBuildFn。
 *
 * 页面结构（V4.1 §2）：
 *   顶栏「宏程序库」→ 四模板 Segmented → 参数表单（MacroParamSpec 驱动）
 *   → 程序卡（lines 逐行 + 复制 + G76_DISCLAIMER 免责）→「怎么算的」notes 折叠。
 *
 * URL 键（README §5.2 登记）：tpl = ellipse | knurl | oilslot | groove，缺省/非法回落 ellipse。
 * 视觉验收口径（V4.1 §4）：只拼既有组件与 tokens.css 变量，零新 CSS 变量、零内联色值。
 * 数值口径：参数域校验全部下沉 core/macro.buildMacro（页面只负责展示错误文案）。
 */
import type { MacroTemplateId } from '../../core/types';
import { MACRO_TEMPLATES, buildMacro } from '../../core/macro';
import type { PageContext, PageModule } from '../router';
import {
  Accordion,
  Button,
  Card,
  CodeCard,
  Eyebrow,
  InputRow,
  Segmented,
  SubText,
  TopBar,
  WarnCard,
  createBody,
  createPage,
  injectStyle,
} from '../components';

const CSS = `
.rc-p15__body { padding-top: 2px; }
.rc-p15__tabs { flex: 0 0 auto; }
.rc-p15__scroll { flex: 1 1 auto; min-height: 0; overflow-y: auto; display: flex; flex-direction: column; gap: 9px; padding-bottom: 4px; }
/* W12 A4-W1/W2/W4b：两列 1fr 时列宽 ~170px，label+unit 挤占后 19px 值区仅 ~2–3 字符宽
   （40→"4"、-100→"-10…"、360→"36" 裁值）——改单列，值区全宽；滚容器 .rc-p15__scroll 纵向兜底 */
.rc-p15__form { display: grid; grid-template-columns: 1fr; gap: 8px; }
.rc-p15__form .la-input .lab { font-size: 11.5px; }
.rc-p15__program { display: flex; flex-direction: column; gap: 9px; flex: 0 0 auto; }
.rc-p15__program:empty { display: none; }
.rc-p15__program .rc-p15__error { color: var(--la-warn-ink); line-height: 1.55; overflow-wrap: anywhere; }
.rc-p15__notebody { display: flex; flex-direction: column; gap: 5px; }
.rc-p15__note { line-height: 1.6; overflow-wrap: anywhere; }
`;

const TEMPLATE_IDS: readonly MacroTemplateId[] = ['ellipse', 'knurl', 'oilslot', 'groove'];

function isMacroId(value: string | null): value is MacroTemplateId {
  return value !== null && (TEMPLATE_IDS as readonly string[]).includes(value);
}

function specOf(id: MacroTemplateId) {
  const spec = MACRO_TEMPLATES.find((item) => item.id === id);
  if (!spec) throw new Error(`宏模板未登记：${id}`);
  return spec;
}

function defaultValues(id: MacroTemplateId): Record<string, string> {
  const values: Record<string, string> = {};
  for (const param of specOf(id).params) values[param.key] = String(param.defaultValue);
  return values;
}

export const title = '宏程序库';

const page: PageModule = {
  title,
  render(ctx: PageContext): void {
    injectStyle('rc-p15-styles', CSS);

    const tplParam = ctx.params.get('tpl');
    const initialTpl: MacroTemplateId = isMacroId(tplParam) ? tplParam : 'ellipse';
    const state: {
      tpl: MacroTemplateId;
      values: Record<MacroTemplateId, Record<string, string>>;
    } = {
      tpl: initialTpl,
      values: {
        ellipse: defaultValues('ellipse'),
        knurl: defaultValues('knurl'),
        oilslot: defaultValues('oilslot'),
        groove: defaultValues('groove'),
      },
    };

    const tabsWrap = document.createElement('div');
    tabsWrap.className = 'rc-p15__tabs';
    const formWrap = document.createElement('div');
    const programWrap = document.createElement('div');
    programWrap.className = 'rc-p15__program';
    const notesWrap = document.createElement('div');
    notesWrap.className = 'rc-p15__notes';
    const scroll = document.createElement('div');
    scroll.className = 'rc-p15__scroll';
    scroll.append(formWrap, programWrap, notesWrap);

    /** 读取当前模板的表单值；空值 / 非数值在页面层先拦（域校验仍在 core） */
    function readValues(): { values: Record<string, number>; error: string | null } {
      const spec = specOf(state.tpl);
      const raw = state.values[state.tpl];
      const values: Record<string, number> = {};
      for (const param of spec.params) {
        const text = raw[param.key] ?? '';
        if (text.trim() === '') {
          return { values, error: `参数「${param.label}」不能为空` };
        }
        const value = Number(text);
        if (!Number.isFinite(value)) {
          return { values, error: `参数「${param.label}」不是有效数值` };
        }
        values[param.key] = value;
      }
      return { values, error: null };
    }

    function renderTabs(): void {
      tabsWrap.replaceChildren(
        Segmented({
          options: MACRO_TEMPLATES.map((template) => ({
            value: template.id,
            label: template.name,
          })),
          value: state.tpl,
          ariaLabel: '宏模板',
          onChange: (value) => {
            if (!isMacroId(value) || value === state.tpl) return;
            state.tpl = value;
            renderTabs();
            renderForm();
            renderProgram();
            renderNotes();
          },
        }),
      );
    }

    function renderForm(): void {
      const spec = specOf(state.tpl);
      const raw = state.values[state.tpl];
      const grid = document.createElement('div');
      grid.className = 'rc-p15__form';
      for (const param of spec.params) {
        grid.append(
          InputRow({
            label: param.label,
            unit: param.unit,
            name: param.key,
            value: raw[param.key] ?? '',
            ariaLabel: `${param.label}（${spec.name}）`,
            onInput: (value) => {
              raw[param.key] = value;
              renderProgram();
            },
          }),
        );
      }
      formWrap.replaceChildren(
        Card({
          children: [Eyebrow(`${spec.name}参数（FANUC B 类宏）`), grid],
        }),
      );
    }

    function renderProgram(): void {
      const spec = specOf(state.tpl);
      const parsed = readValues();
      if (parsed.error) {
        programWrap.replaceChildren(
          Card({ children: [SubText(parsed.error, { className: 'rc-p15__error' })] }),
        );
        return;
      }

      try {
        const program = buildMacro(state.tpl, parsed.values);
        const disclaimer = document.createElement('div');
        disclaimer.className = 'rc-p15__disclaimer';
        disclaimer.append(WarnCard({ text: program.disclaimer }));
        programWrap.replaceChildren(
          CodeCard({
            lines: program.lines,
            comment: `FANUC B 类宏 · ${spec.name} · WHILE 循环体（非展开点列）`,
            ariaLabel: `${spec.name}宏程序`,
          }),
          Button({
            variant: 'ghost',
            icon: 'copy',
            label: '复制程序',
            onClick: () => {
              void navigator.clipboard?.writeText(program.lines.join('\n')).catch(() => undefined);
            },
          }),
          disclaimer,
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        programWrap.replaceChildren(
          Card({ children: [SubText(message, { className: 'rc-p15__error' })] }),
        );
      }
    }

    function renderNotes(): void {
      const spec = specOf(state.tpl);
      const content = document.createElement('div');
      content.className = 'rc-p15__notebody';
      for (const note of spec.notes) {
        const line = document.createElement('div');
        line.className = 'rc-p15__note';
        line.textContent = note;
        content.append(line);
      }
      notesWrap.replaceChildren(Accordion({ title: '怎么算的', content }));
    }

    renderTabs();
    renderForm();
    renderProgram();
    renderNotes();

    const body = createBody({ className: 'rc-p15__body', ariaLabel: '宏程序库' });
    body.append(tabsWrap, scroll);

    ctx.root.append(
      createPage({
        id: 'p15',
        top: TopBar({ title: '宏程序库', badge: 'FANUC B' }),
        body,
      }),
    );
  },
};

export default page;
