# src/ui 契约 · 车工算 LathCalc（W4-C1 冻结）

> **状态：W4-C1 冻结。** W4-C2～C5 对本目录**只消费、不修改**：
> 不改组件签名 / 类名 / 路由 API / 页面骨架 / 本文件；只在自己的页面文件与测试文件内填充。
> 发现契约缺口 → 上报 Lead，不得自行扩接口。
>
> 视觉唯一依据：`docs/车工计算App-无限画布.html`（14 页设计稿，390×844）。
> 设计 token：`src/ui/tokens.css`（W1-b 冻结，**变量值禁止修改**；组件层只允许新增 `.rc-*` 类）。
> 技术栈：原生 TypeScript + DOM API + Vite，**零框架**（无 Vue / React / 运行时依赖）。

---

## 1. 目录与范式

```
src/ui/
  tokens.css            设计 token（只读：色板 / 字体 / 半径 / 间距 / 触控尺寸）
  router.ts             hash 路由 + 14 页注册表 + 懒挂载/卸载
  README.md             本契约
  components/           基础组件（工厂函数 + 同文件样式）
    base.ts             DOM 助手 / 样式注入 / 排版工具类
    icons.ts            线性图标库（设计稿 ICONS 1:1）
    StatusBar.ts        StatusBar（装饰性状态栏）
    HomeIndicator.ts    HomeIndicator（底部指示条）
    TopBar.ts           TopBar / HomeHeader
    Card.ts             Card / Eyebrow / SubText / Badge
    SegChip.ts          Segmented / Chip
    InputRow.ts         InputRow
    ResultCard.ts       ResultCard（结果行 + 复制）
    Accordion.ts        Accordion（怎么算的）
    Keypad.ts           Keypad（自绘数字键盘）
    CodeCard.ts         CodeCard（暗色 G 代码卡）
    WarnCard.ts         WarnCard（警示条）
    Tile.ts             Tile / TileGrid
    ListRow.ts          ListRow / RowList
    Button.ts           Button（primary / ghost）
    IconButton.ts       IconButton（28×28 图标动作：分享 / 星标 / 复制）
    ParamGrid.ts        ParamGrid（带入参数摘要）
    StatBlock.ts        StatBlock / StatTriple
    Scale.ts            Scale（刻度标尺）
    PageShell.ts        createPage / createBody / renderPlaceholder
    index.ts            barrel：页面统一从 '../components' 引入
  pages/
    p01.ts              首页（本卡完整实现）
    p02.ts … p14.ts     占位骨架（各自卡填充）
```

### 1.1 组件范式（写死）

- **组件 = 工厂函数**：`export function Xxx(props): HTMLElement`，每次调用生成新 DOM，无全局状态。
- **样式与组件同文件**：组件文件内 `const CSS = \`...\``，在工厂函数内调用
  `injectStyle('rc-xxx-styles', CSS)`；同 id 只注入一次。基础工具类与 `#app` 尺寸由
  `ensureBaseStyles()` 注入（`components/base.ts`）。
- **页面只在 `render(ctx)` 内建 DOM**：不做模块级 DOM 操作；路由会替换整个 host。
- **更新数据 = 重新渲染局部**：组件是一次性快照；交互后由页面重建对应区块
  （建议页面内写 `renderResult()` / `renderBody()` 小函数，清空容器再 append）。
  唯一例外：`Segmented` 点击时会先乐观更新自身高亮再回调（父级仍应更新数据源）。
- **可信 HTML 的边界**：`Accordion.content`（公式，允许 `<br>`）与 `Tile.graphic`
  （工况示意图 SVG）按**受信内部标记**插入；所有用户/计算结果文本一律走
  `textContent` 或 `escapeHtml()`。

---

## 2. 路由契约

### 2.1 hash 形态

```
#/<pageId>[?key=value&key2=value2]
```

- 合法 `pageId` 仅 `p01`–`p14`（大小写敏感）。
- 缺省 / 非法 hash → 回退 `p01`，启动时用 `history.replaceState` 规范化为 `#/p01`。
- 参数值经 `URLSearchParams` 编解码；`navigate()` 自动编码。
- 页面内读取：`ctx.params.get('d')`；数值字符串自行 `Number(...)` + 校验。

### 2.2 14 页注册表（冻结）

| ID | 标题（document.title 前缀） | 模块 | 实现卡 |
| --- | --- | --- | --- |
| p01 | 首页 | `pages/p01.ts` | W4-C1（已完成） |
| p02 | 螺纹 · 选型 | `pages/p02.ts` | W4-C2 |
| p03 | 螺纹 · 结果 | `pages/p03.ts` | W4-C2 |
| p04 | G76 参考程序 | `pages/p04.ts` | W4-C2 |
| p05 | 圆弧切点 · 工况图库 | `pages/p05.ts` | W4-C3 |
| p06 | 圆弧 · 切点计算 | `pages/p06.ts` | W4-C3 |
| p07 | 锥度 · 莫氏 | `pages/p07.ts` | W4-C4 |
| p08 | 公差配合 | `pages/p08.ts` | W4-C4 |
| p09 | 转速 · 线速度 | `pages/p09.ts` | W4-C4 |
| p10 | 切削参数 | `pages/p10.ts` | W4-C4 |
| p11 | 重量 | `pages/p11.ts` | W4-C5 |
| p12 | 三角 | `pages/p12.ts` | W4-C5 |
| p13 | 速查 | `pages/p13.ts` | W4-C5 |
| p14 | 收藏 · 历史 · 分享 | `pages/p14.ts` | W4-C5 |

注册表在 `router.ts` 的 `PAGES`；`PAGES[id]()` 动态 `import()`（构建按页分 chunk）。
**C2–C5 不修改注册表**（页面 ID / 标题已冻结）。

### 2.3 页面模块接口

```ts
export interface PageModule {
  title: string;                                         // 写入 document.title
  render(ctx: PageContext): void | Promise<void>;
}

export interface PageContext {
  root: HTMLElement;                 // 本页专用 .rc-route 节点
  pageId: PageId;                    // 'p01' … 'p14'
  params: URLSearchParams;           // hash 查询参数
  navigate(pageId, params?): Promise<void>;
  onCleanup(fn: () => void): void;   // 离开本页时逆序执行
}
```

页面模块固定出口：

```ts
export const title = '螺纹 · 选型';
const page: PageModule = { title, render(ctx) { /* … */ } };
export default page;
```

### 2.4 挂载 / 卸载生命周期

1. `start()` 监听 `hashchange`，解析 hash，创建 `.rc-route[data-route="pXX"]`，调用页面 `render(ctx)`。
2. `navigate()` / hash 变化 → 先执行上一页全部 `onCleanup`（**后注册先执行**）→ 移除旧 host
   → 懒加载新模块 → 挂载。
3. `stop()` 移除监听、执行清理、清空 root；可再次 `start()`。
4. 同 hash 重复 `navigate()` 会强制重新挂载（用于刷新场景）。
5. 页面加载/渲染抛错 → 渲染 `.rc-route-error`（`role="alert"`），`current()` 为 `null`，
   可传 `onError` 上报。

入口接线（已批准，`src/main.ts`）：

```ts
import './ui/tokens.css';
import { createRouter } from './ui/router';

const app = document.querySelector<HTMLDivElement>('#app');
if (app) {
  const router = createRouter({ root: app });
  void router.start();
}
```

### 2.5 路由工具

```ts
parseRoute('#/p03?d=30')   // → { pageId: 'p03', params: URLSearchParams }
routeHash('p03', { d: 30, p: 3.5 })  // → '#/p03?d=30&p=3.5'
PAGE_IDS                   // 14 个 ID 的只读元组
PAGES                      // Record<PageId, () => Promise<PageModule>>
```

---

## 3. 页面骨架与填充点（写死）

`createPage()` 生成的 DOM 顺序（自上而下）：

```
.la-page.rc-page[data-page="pXX"]        ← 页面根，390×844 内 flex 纵向
  ├─ .la-status.rc-status                ← StatusBar（装饰，aria-hidden）
  ├─ .la-top(.rc-topbar | .rc-home__head)
  ├─ beforeBody[]                         ← 可选附加块（p01：搜索栏、最近使用）
  ├─ .la-body.rc-body                     ← 内容填充点（overflow: hidden）
  ├─ footer                               ← 可选（p01：离线声明）
  └─ .la-home.rc-homebar                  ← HomeIndicator（装饰，aria-hidden）
```

用法：

```ts
const body = createBody({ className: 'rc-p02__body' });
body.append(Card({ tight: true, children: [RowList(rows)] }));

ctx.root.append(
  createPage({
    id: 'p02',
    top: TopBar({ title, badge: 'GB/T 193' }),
    body,
  }),
);
```

- 页面必须落在 `.la-page` 内；`createPage` 负责状态栏 / Home 指示条。
- `.la-body` 自身 `overflow: hidden`：整页内容必须装在 390×844 内；长列表在**卡片内部**
  滚动（页面局部类 `overflow-y: auto; min-height: 0`），不要让整页滚动。
- 占位页：`renderPlaceholder(ctx, { id, title, badge?, badgeGray?, plannedBy })`
  输出 `.rc-placeholder`（含「建设中 · W4-Cx」、页面标题、路由）。
- **填充步骤（C2–C5）**：保留 `export const title` 与 `export default page`；替换
  `render(ctx)` 函数体；删除 `renderPlaceholder` 调用即可。不要改文件名 / 页面 ID。

### 3.1 页面局部样式

页面可在自己的文件内注入局部 CSS（同范式）：

```ts
const CSS = `.rc-p02__filter { display: flex; gap: 7px; }`;
injectStyle('rc-p02-styles', CSS);
```

允许：新增 `.rc-pXX__*` 类；禁止：改 `tokens.css`、重定义 `--la-*` 变量、硬编码色值/字体栈。

---

## 4. 组件清单（冻结）

所有组件从 `../components`（barrel）引入。类名分两层：
**`la-*` = 设计稿还原类（对拍用，勿改）**；**`rc-*` = 测试 / 行为钩子（稳定选择器）**。

### 4.1 组件总表

| 组件 | 文件 | 关键 props | 事件 | 主要类名 |
| --- | --- | --- | --- | --- |
| `StatusBar()` | StatusBar.ts | — | — | `.la-status.rc-status` / `.rc-status__time` |
| `HomeIndicator()` | HomeIndicator.ts | — | — | `.la-home.rc-homebar` |
| `TopBar` | TopBar.ts | `title` `badge?` `badgeGray?` `star?` `onBack?` `onStar?` | 返回 / 收藏 | `.la-top.rc-topbar` / `__back` `__title` `__star` |
| `HomeHeader` | TopBar.ts | `title` `eyebrow` `onStar?` | 收藏 | `.la-top.rc-home__head` / `.rc-home__title` `__tagline` `__star` |
| `Card` | Card.ts | `children?` `tight?` `className?` `ariaLabel?` | — | `.la-card.rc-card[.tight]` |
| `Eyebrow` | Card.ts | `text` | — | `.la-eyebrow.rc-eyebrow` |
| `SubText` | Card.ts | `text` `{center?, className?}` | — | `.la-sub.rc-sub[.rc-sub--center]` |
| `Badge` | Card.ts | `text` `{gray?}` | — | `.la-badge.rc-badge[.gray]` |
| `Segmented` | SegChip.ts | `options[{value,label,disabled?}]` `value` `ariaLabel` `small?` `onChange?` | 点击项 | `.la-seg.rc-seg[.small]` / `.rc-seg__item[.on]` |
| `Chip` | SegChip.ts | `label` `active?` `disabled?` `onClick?` | 点击 | `.la-chip.rc-chip[.on]` |
| `InputRow` | InputRow.ts | `label` `value` `unit?` `inputMode?` `name?` `ariaLabel?` `placeholder?` `disabled?` `readonly?` `onInput?` `onChange?` | input / change | `.la-input.rc-input` / `.lab` `.field` `.unit` |
| `ResultCard` | ResultCard.ts | `items[]` `ariaLabel?` `onCopy?` | 复制 | `.la-card.tight.rc-resultcard` / `.la-resrow` `.la-reslab` `.la-resval[.big]` `.la-unit` `.la-copy` |
| `Accordion` | Accordion.ts | `content` `title?` `open?` `onToggle?` | 展开 / 收起 | `.la-acc.rc-acc` / `.la-acchead.rc-acc__head` / `.la-formula.rc-acc__body` |
| `Keypad` | Keypad.ts | `onKey?` `ariaLabel?` `disabled?` | 按键 | `.la-key.rc-keypad` / `.rc-keypad__key` |
| `CodeCard` | CodeCard.ts | `lines[]` `comment?` `ariaLabel?` | — | `.la-code.la-mono.rc-codecard` / `.ln` `.cm` |
| `WarnCard` | WarnCard.ts | `text` `ariaLabel?` | — | `.la-warn.rc-warn` / `.rc-warn__icon` `__text` |
| `Tile` | Tile.ts | `name` `sub?` `icon?` `graphic?` `compact?` `onClick?` `ariaLabel?` | 点击 | `.la-tile.rc-tile[.rc-tile--compact]` / `.ticon` `.tname` `.tsub` |
| `TileGrid` | Tile.ts | `tiles[]` `ariaLabel?` | — | `.la-grid2.rc-grid2` |
| `ListRow` | ListRow.ts | `name` `value?` `selected?` `trailing?('chev'\|'copy'\|'none')` `mono?` `description?` `onClick?` `ariaLabel?` | 点击 | `.la-lrow.rc-lrow[.sel]` / `.grow` `.val` `.rc-lrow__chev` |
| `RowList` | ListRow.ts | `rows[]` `ariaLabel?` | — | `.la-rowlist.rc-rowlist` |
| `Button` | Button.ts | `label` `variant?('primary'\|'ghost')` `icon?` `onClick?` `ariaLabel?` `disabled?` | 点击 | `.la-btn.rc-btn[.ghost]` |
| `IconButton` | IconButton.ts | `icon` `ariaLabel` `onClick?` `disabled?` | 点击 | `.la-copy.rc-iconbtn` |
| `ParamGrid` | ParamGrid.ts | `items[{key,value}]` `columns? (2\|3)` `ariaLabel?` | — | `.rc-paramgrid[--2]` / `.rc-param` `__key` `__value` |
| `StatBlock` | StatBlock.ts | `eyebrow` `value` `unit?` `footnote?` `ariaLabel?` | — | `.la-card.rc-stat` / `__value` `__unit` `__foot` |
| `StatTriple` | StatBlock.ts | `items[{value,label,accent?}]` `ariaLabel?` | — | `.la-card.rc-stattriple` / `__cell` `__value[--accent]` `__label` |
| `Scale` | Scale.ts | `value(0–100)` `ariaLabel?` | — | `.la-scale.rc-scale` / `.rc-scale__marker` |
| `createPage` | PageShell.ts | `id` `top` `body` `beforeBody?` `footer?` `statusBar?` `homeIndicator?` `className?` | — | `.la-page.rc-page[data-page]` / `.la-body.rc-body` |
| `createBody` | PageShell.ts | `{className?, ariaLabel?}` | — | `.la-body.rc-body` |
| `renderPlaceholder` | PageShell.ts | `ctx` `{id,title,badge?,badgeGray?,plannedBy?}` | — | 同上 + `.rc-placeholder` |

### 4.2 关键 props 细节

**ResultCard.items**

```ts
interface ResultItem {
  label: string;        // 左标签："中径 d₂"
  value: string;        // 已格式化显示值（格式化在 core/页面完成）
  unit?: string;        // "mm"
  big?: boolean;        // 主结果 26px
  mono?: boolean;       // 程序行：等宽、12px（与 big 互斥）
  copy?: boolean;       // 默认 true；false 不渲染复制按钮
  copyValue?: string;   // 复制内容；缺省 "value unit"
}
```

复制按钮：有 `onCopy` 时只回调（页面负责写剪贴板 / 提示）；无 `onCopy` 时尝试
`navigator.clipboard.writeText`，失败静默。

**Segmented**：点击仅切换自身高亮并回调 `onChange(value)`；父级应据此更新数据并重渲染
受影响区域（价格极低，推荐整块重建）。`disabled` 项不触发回调。

**InputRow**：受控于 props 初值；输入过程不自动改写显示。页面在 `onInput` 里实时计算，
在 `onChange`（失焦/提交）里落定。组件不做数值校验、不做单位换算。

**Accordion**：`content` 为受信 HTML 字符串（设计稿公式含 `<br>`）或 HTMLElement；
`aria-expanded` / `aria-controls` 已同步。`onToggle(open)` 在每次切换后触发。

**Keypad**：键序固定 `7 8 9 / 4 5 6 / 1 2 3 / . 0 del`，`onKey(key: KeypadKey)`；
`KEYPAD_KEYS` 常量可用于测试（勿改顺序）。

**Tile.graphic**：受信 SVG 字符串（p05 工况缩略图）；`compact: true` 渲染横向图库磁贴。
首页磁贴用 `icon: IconName` + `sub`。**SVG 内同样禁止十六进制色值**：描边用
`currentColor`（容器色由 `.rc-tile__graphic` 控制），需要橙色切点时用
`style="fill: var(--la-accent)"` 一类 token 引用；C3 若照抄设计稿内联 SVG，必须先把
`#6A6E73` / `#C74E0D` 等替换为 `var(--la-*)`，否则 `test/ui-source.test.ts` 会判红。

**Button**：`variant: 'ghost'` 对应设计稿白底描边；`icon` 为 IconName，渲染在文案左侧。
**IconButton**：28×28 无文本图标动作（p14 分享 / 星标）；`ariaLabel` 必填。

### 4.3 图标

```ts
import { icon, type IconName } from '../components';
icon('thread', 19);        // 返回 SVG 字符串（currentColor）
```

可用名：`back search star copy chev chevd share ruler thread gcode arc taper tol speed
cutting weight tri book warn calc del`。

### 4.4 DOM 助手

```ts
html(markup)               // 单根模板 → HTMLElement
escapeHtml(value)          // 拼 innerHTML 时转义
cx(...parts)               // 条件 className
appendChildren(parent, [nodeOrString, …])   // 字符串按文本插入
injectStyle(id, css)       // 一次性注入（同 id 幂等；无 DOM 环境 no-op）
ensureBaseStyles()         // 基础样式 + #app 视口高度
```

---

## 5. 页面间传参约定（冻结）

### 5.1 规则

- 只走 hash query（`ctx.params`），**不使用内存单例 / localStorage 传参**（store.ts 属 C5，
  且只用于收藏/历史）。
- 数值以**字符串**传递，接收方 `Number()` + 校验；禁止传已四舍五入的显示值作为计算输入。
- `navigate()` 的 `params` 对象值为 `string | number | boolean`；`null/undefined` 忽略。
- 跨页只传**原始输入**（d / P / R / α …），结果由接收页调用 `src/core/**` 重算，避免
  显示舍入误差累积。

### 5.2 已冻结的链路键

| 链路 | 键 | 含义 | 示例 |
| --- | --- | --- | --- |
| p02 → p03 | `family` | `metric` \| `trapezoid` \| `pipe` \| `unified` | `metric` |
| | `spec` | 规格显示名 | `M30 × 3.5` |
| | `d` | 大径 mm | `30` |
| | `p` | 螺距 mm | `3.5` |
| p03 → p04 | `family` `spec` `d` `p` | 同上四键原样带出；p04 用 core 重算 | 同上 |
| p01 最近使用 → p03 等 | thread 同上四键；speed/weight/triangle 传各自原始输入键 | 动态历史 chip，kind→页：`thread→p03 / speed→p09 / weight→p11 / triangle→p12`（未知落 p14；W5 集成①，空历史回落静态示例） | `#/p03?family=metric&spec=M30+%C3%97+3.5&d=30&p=3.5` |
| p01 → p09 | `d` `vc` | 工件直径 mm / 线速度 m·min⁻¹ | `#/p09?d=50&vc=150` |
| p01 → p07 | `mode` `morse` | `mode=morse`；`morse` = 0–6 | `#/p07?mode=morse&morse=4` |
| p01 → p04 | （无） | G76 首页直达；p04 必须能处理空参数（默认值或重定向 p02，由 C2 定） | `#/p04` |
| p05 → p06 | `case` | 工况号 `AC01`–`AC12`（W4-C3 冻结；非法值由 p06 选择器兜底） | `#/p06?case=AC01` |

推荐调用：

```ts
await ctx.navigate('p03', { family: 'metric', spec: 'M30 × 3.5', d: 30, p: 3.5 });
await ctx.navigate('p04', { family: 'metric', spec: 'M30 × 3.5', d: 30, p: 3.5 });
await ctx.navigate('p09', { d: 50, vc: 150 });
```

### 5.3 待对应卡冻结的链路

p05→p06（工况参数）、p07/p08/p10–p12 的输入参数键由 C3/C4/C5 在自己的页面文件顶部
注释中登记，并同步到本表**下一版**（需 Lead 批准；本版不预占键名，避免冲突）。

---

## 6. 样式范式（写死）

1. **颜色 / 字体只允许 `var(--la-*)`**：组件与页面源码禁止十六进制色值、禁止字体栈字面量。
   语义不存在的颜色用既有 token 取最近语义（如 `--la-well-soft` 作浅凹面），不得新增 hex。
2. **不得重定义 `--la-*`**（`tokens.css` 只读）；组件可新增 `.rc-*` 类，页面局部类用
   `.rc-pXX__*`。
3. **设计稿 `la-*` 类名保留**：`.la-page .la-body .la-top .la-card .la-seg .la-chip .la-input
   .la-btn .la-resrow .la-acc .la-code .la-warn .la-tile .la-grid2 .la-key .la-home` 用于
   A4 逐页对拍，不得改名。
4. 阴影用 `box-shadow: … color-mix(in srgb, var(--la-ink) 10%, transparent)` 之类的
   token 派生写法，不写色值。
5. 触控：按钮/行最小高度按设计稿（键帽 44、卡片行约 40+）；`--la-touch: 48px` 为全局目标。
6. 布局：`#app` 由基础样式设为 `100vh / 100dvh`；`.la-page` 100% 高；`.la-body`
   `overflow: hidden`。页面不得设置超过 390px 的固定宽度，不得依赖横向滚动。
7. 焦点环：基础样式统一 `:focus-visible { outline: 2px solid var(--la-accent); }`。
8. 内联 SVG（p05 工况图 / p06、p07、p12 示意图）同样受色值约束：`stroke` 用
   `currentColor` 或 `var(--la-*)`，橙点用 `var(--la-accent)`，禁止照抄设计稿 hex。

---

## 7. 组件测试范式（C2–C5 照抄）

**环境**：`happy-dom@21.0.4`（devDependency，随 W4-C1 收获进入后续基线；lockfile 固定）。
**按文件启用**，不改 `vite.config.ts`：

```ts
// @vitest-environment happy-dom
```

**页面级模板**：

```ts
// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRouter, type Router } from '../src/ui/router';

let app: HTMLElement;
let router: Router;

beforeEach(async () => {
  document.body.innerHTML = '<div id="app"></div>';
  window.location.hash = '';
  app = document.querySelector<HTMLElement>('#app') as HTMLElement;
  router = createRouter({ root: app });
  await router.start();
});

afterEach(() => {
  router.destroy();
  document.body.replaceChildren();
});

describe('p02 螺纹选型', () => {
  it('渲染 6 行规格并带出参数', async () => {
    await router.navigate('p02');
    expect(app.querySelector('.la-page[data-page="p02"]')).not.toBeNull();
    expect(app.querySelectorAll('.la-rowlist .la-lrow')).toHaveLength(6);
  });
});
```

**组件级模板**：

```ts
// @vitest-environment happy-dom
import { expect, it } from 'vitest';
import { ResultCard } from '../src/ui/components';

it('ResultCard 渲染两行', () => {
  const card = ResultCard({ items: [{ label: 'a', value: '1' }, { label: 'b', value: '2' }] });
  document.body.append(card);
  expect(card.querySelectorAll('.la-resrow')).toHaveLength(2);
});
```

**硬性要求**：

- 断言打到**字面量**（文本 / 计数 / 类名 / 属性 / 事件回调载荷），禁止
  `expect(true).toBe(true)` / 只断言「元素存在」而无结构细节。
- 优先用 `.rc-*` 钩子选择器；对拍类断言可用 `.la-*`。
- 每个测试自行 `document.body.replaceChildren()` 清理；路由测试必须 `router.destroy()`。
- 涉及导航的点击是异步的（动态 import），用 `await vi.waitFor(() => expect(router.current()).toBe('p03'))`。
- 数值期望必须来自 core 黄金用例或算式，不得复制设计稿静态示例值充当计算结果
  （设计稿数值均为示例，见 SOURCE-DEVIATION-NOTE 3 / WAVE-PLAN §0 A4 忽略区）。

运行：

```bash
npx tsc --noEmit
npx vitest run --maxWorkers=2
npm run build
```

三条命令**单独整句执行**，禁止并行、禁止接管道取退出码（附录 A / B.1）。

---

## 8. 冻结边界与变更流程

| C2–C5 **可以** | C2–C5 **不可以** |
| --- | --- |
| 改自己负责的 `pages/pXX.ts` 的 `render()` | 改组件文件 / `router.ts` / 本 README |
| 在页面文件内新增 `.rc-pXX__*` 局部样式 | 改 `tokens.css` / 重定义 `--la-*` |
| 使用全部已有组件与 `navigate` | 改页面 ID / 标题 / 注册表 / 入口 |
| 新增自己的 `test/ui-pXX-*.test.ts` | 改既有 `test/**` 或本卡测试 |
| 上报契约缺口 | 自行新增全局组件 / 改 props 签名 |

需要新通用组件时：先按现有原子件组合；确实无法表达 → 上报 Lead（说明缺哪个 prop /
哪类结构），由 Lead 决定是否追加契约版本。

---

## 9. p01 保真清单与已知决策

### 9.1 区块（自上而下，测试逐项断言）

| # | 区块 | 关键内容 |
| --- | --- | --- |
| 1 | 状态栏 | 9:41 + 信号/WiFi/电量（装饰，aria-hidden） |
| 2 | 顶栏 | logo（ruler）/ 车工算 / `LATHCALC · 离线车工计算器` / 收藏按钮 |
| 3 | 搜索栏 | `搜螺纹、锥度、切点、G 代码…`（静态占位） |
| 4 | 最近使用 | 眉标 `最近使用` + 3 chips：动态取本机历史前 3 条（空历史回落设计稿静态示例 `M30 螺纹` / `Ø50 转速 955` / `莫氏 4 号`） |
| 5 | 功能入口 | 2 列 × 5 行 = **10 格**（名称/副标见下） |
| 6 | 离线声明 | `完全离线 · 无登录 · 无广告 · v0.1` |
| 7 | Home 指示条 | 装饰（aria-hidden） |

入口顺序（设计稿 `docs/车工计算App-无限画布.html:1146-1155`）：

| 序 | 名称 | 副标 | 目标 |
| --- | --- | --- | --- |
| 1 | 螺纹 | 底孔 · 三针 · 尺寸表 | p02 |
| 2 | G76 程序 | 参考程序 · 免费生成 | p04 |
| 3 | 圆弧切点 | 工况图库 · 刀补 | p05 |
| 4 | 锥度 · 莫氏 | 半角 · 查表 | p07 |
| 5 | 公差配合 | GB/T 1800 偏差 | p08 |
| 6 | 转速 · 线速度 | 输入即算 | p09 |
| 7 | 切削参数 | 国产牌号 · 示例库 | p10 |
| 8 | 重量 | 圆钢 · 六方 · 管 | p11 |
| 9 | 三角 | 解三角形 | p12 |
| 10 | 速查 | G 代码 · 钻头 · 硬度 | p13 |

### 9.2 已知决策（W4-C1 登记）

1. **搜索栏为静态视觉占位**：14 页设计稿无独立搜索页，v0.1 不实现搜索交互；文案与样式
   1:1 保留。
2. **最近使用已动态化（W5 集成①，DEFERRED #9 关账，2215a40）**：p01 渲染期读
   `ui/store.ts` 的 `listHistory()` 前 3 条生成 chips；kind→页映射 `thread→p03 /
   speed→p09 / weight→p11 / triangle→p12`（未知落 p14）；空历史回落本条原静态示例
   （`M30 螺纹` / `Ø50 转速 955` / `莫氏 4 号`，保留用于对拍与空态）。
   W4-C1 的静态冻结口径由本 W5 集成裁决取代（G3 Important-1 同步）。
3. **无底部 Tab 导航**：派工单文字提到「底部导航」，但设计稿 p01 实际为「离线声明 +
   Home 指示条」，无 Tab 栏。按「设计稿为唯一视觉依据」实现；差异登记待 Lead 裁决。
4. **状态栏 9:41 为设计稿 mock**：保留用于 390×844 逐区块对拍，标 `aria-hidden`。
5. **首页 G76 直达 p04 时无参数**：p04 必须容忍空参数（默认值或重定向 p02，由 C2 决定）。
6. **p02→p03→p04 只传原始 d/P**：接收页用 `src/core/**` 重算，禁止传显示舍入值。

### 9.3 390×844 无横向滚动自验

- 结构保证：`.la-grid2` 固定两列 `1fr 1fr`；页面无内联 `width` / `style`；`.la-body`
  `overflow: hidden`；`#app` 高度锁定视口。
- 实测（Chrome headless + CDP，工具 `docs/evidence/W4-C1/tools/measure-390.mjs`）：
  p01 `scrollWidth=390 = clientWidth=390`、`scrollHeight=844 = clientHeight=844`、
  `gridColumns=174.5px 174.5px`、`tileCount=10`、`pageOverflow=hidden`；
  p01–p14 全部 `horizontalOverflow=false`。原始输出见
  `docs/evidence/W4-C1/runs/measure-390.json`，截图
  `docs/evidence/W4-C1/runs/p01-390x844.png`。

---

## 10. 构建 / 证据

- 三门禁：`npx tsc --noEmit` / `npx vitest run --maxWorkers=2` / `npm run build`（仓库根，
  单独整句、串行执行）。
- 测试文件：`test/ui-components.test.ts`（组件逐件）、`test/ui-router.test.ts`（14 页 /
  参数 / 清理 / 回退 / 错误卡）、`test/ui-p01.test.ts`（结构 + 导航 + 布局策略）、
  `test/ui-source.test.ts`（无 hex / 无字体栈 / token 引用 / 14 页模块可加载）。
- 证据档：`docs/evidence/W4-C1/README.md` + `runs/`（命令原文 + 原始输出 + REAL_EXIT）。
