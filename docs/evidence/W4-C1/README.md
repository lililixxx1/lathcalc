# W4-C1 证据档 · ui/ 契约 + 基础组件 + router + p01 首页

> 卡：W4-C1 ｜ 执行者：worker-1 ｜ 隔离树：`LathCalc-trees_T-W4C1` ｜ 基线 commit：`7a6a190`
> 已获 Lead 裁决：① 新增 devDependency `happy-dom@21.0.4`（裁决 1-A）；② `src/main.ts` 最小 bootstrap 改动（裁决 2-A）。
> 本档自含：命令全文 + 原始输出 + `REAL_EXIT`，只看本目录即可独立复跑。
> 公开态清理：`runs/gate2-vitest.txt` 首行 banner 含机器绝对路径前缀，按附录 G 仅将该
> 前缀替换为 `<TREE>`，行号、其余输出与 `REAL_EXIT` 原样保留。

## 索引

| 档 | 命令 / 内容 | 结果 |
| --- | --- | --- |
| `runs/gate1-tsc.txt` | `npx tsc --noEmit` | `REAL_EXIT=0`（无输出） |
| `runs/gate2-vitest.txt` | `FORCE_COLOR=0 CI=1 npx vitest run --maxWorkers=2` | `Test Files 24 passed (24)` / `Tests 196 passed (196)`，`REAL_EXIT=0` |
| `runs/gate3-build.txt` | `npm run build` | `✓ built in 207ms`，PWA precache 22 entries，`REAL_EXIT=0` |
| `runs/measure-390.txt` | Chrome headless + CDP 390×844 自验（命令 + 汇总，汇总由 JSON 计算） | `REAL_EXIT=0`；p01 `scrollWidth=390 = clientWidth=390`；14 页 `allPagesNoHorizontalOverflow=true` |
| `runs/measure-390.json` | 上述命令原始 stdout | 14 页逐页视口 / 文档宽高 / 网格列宽 / 入口数量 |
| `runs/measure-390.stderr.txt` | 上述命令 stderr | 空（0 字节） |
| `runs/p01-390x844.png` | 上述命令截图 | 390×844，p01 逐区块可见 |
| `tools/measure-390.mjs` | 390×844 自验工具（Chrome headless + CDP，零第三方依赖） | 见 measure-390.txt |

## 交付物

| 路径 | 行数 | 说明 |
| --- | --- | --- |
| `src/ui/components/base.ts` | 92 | DOM 助手 / 样式注入 / 排版工具类 |
| `src/ui/components/icons.ts` | 38 | 设计稿 ICONS 1:1 |
| `src/ui/components/StatusBar.ts` | 25 | 状态栏（装饰） |
| `src/ui/components/HomeIndicator.ts` | 22 | Home 指示条（装饰） |
| `src/ui/components/TopBar.ts` | 109 | TopBar / HomeHeader |
| `src/ui/components/Card.ts` | 79 | Card / Eyebrow / SubText / Badge |
| `src/ui/components/SegChip.ts` | 107 | Segmented / Chip |
| `src/ui/components/InputRow.ts` | 70 | 输入行 |
| `src/ui/components/ResultCard.ts` | 112 | 结果卡（复制行为） |
| `src/ui/components/Accordion.ts` | 70 | 怎么算的 |
| `src/ui/components/Keypad.ts` | 80 | 数字键盘（12 键固定序） |
| `src/ui/components/CodeCard.ts` | 54 | 暗色 G 代码卡 |
| `src/ui/components/WarnCard.ts` | 39 | 警示条 |
| `src/ui/components/Tile.ts` | 87 | 磁贴 / 两列网格 |
| `src/ui/components/ListRow.ts` | 94 | 列表行 / 行容器 |
| `src/ui/components/Button.ts` | 38 | 主按钮 / ghost |
| `src/ui/components/IconButton.ts` | 40 | 28×28 图标动作（分享 / 星标 / 复制） |
| `src/ui/components/ParamGrid.ts` | 57 | 参数网格 |
| `src/ui/components/StatBlock.ts` | 109 | 大数字 / 三联统计 |
| `src/ui/components/Scale.ts` | 35 | 刻度标尺 |
| `src/ui/components/PageShell.ts` | 129 | 页面骨架 / 占位页 |
| `src/ui/components/index.ts` | 26 | barrel |
| `src/ui/router.ts` | 300 | hash 路由 + 14 页注册表 + 懒挂载/卸载 |
| `src/ui/pages/p01.ts` | 153 | 首页完整实现 |
| `src/ui/pages/p02.ts` … `p14.ts` | 16 × 12 + 22 | 13 个占位骨架 |
| `src/ui/README.md` | 523 | 冻结契约（组件 / 骨架 / 路由 / 传参 / 测试 / 样式范式） |
| `test/ui-components.test.ts` | 514 | 组件逐件测试（26 例） |
| `test/ui-router.test.ts` | 194 | 路由测试（12 例） |
| `test/ui-p01.test.ts` | 198 | p01 结构 / 导航（10 例） |
| `test/ui-source.test.ts` | 134 | 源码契约扫描（7 例） |
| `src/main.ts` | 9 | 入口接线（经 Lead 批准，仅此用途） |
| `package.json` / `package-lock.json` | — | 新增 `happy-dom@21.0.4`（经 Lead 批准） |
| `docs/evidence/W4-C1/tools/measure-390.mjs` | 257 | 390×844 自验工具 |

## 覆盖与结论

### 组件（必需 7 件 + 扩展 13 件）

- 必需：`ResultCard` / `InputRow` / `SegChip`（`Segmented` + `Chip`）/ `Keypad` / `Accordion` / `CodeCard` / `WarnCard`。
- 扩展（设计稿 14 页实际通用件）：`StatusBar` / `HomeIndicator` / `TopBar`（含 `HomeHeader`）/ `Card`（含 `Eyebrow` `SubText` `Badge`）/ `Tile`（含 `TileGrid`）/ `ListRow`（含 `RowList`）/ `Button` / `IconButton` / `ParamGrid` / `StatBlock`（含 `StatTriple`）/ `Scale` / `PageShell` / `icons`。
- 每组件 ≥1 例，共 26 例；断言均为字面量（文本 / 计数 / 类名 / 属性 / 回调载荷）。

### 路由

- `#/p01`–`#/p14` 全量可达（`ui-router` 逐页断言 `data-page` 与 hash）。
- 参数传递 / `onCleanup` 逆序 / 非法 hash 回退 / 同 hash 强制重挂载 / 加载失败错误卡 / `stop()` 清空，均有测试。
- 动态 import 构建按页分 chunk（`gate3-build.txt` 可见 p01–p14 独立产物）。

### p01 保真

- 7 个顶层区块按设计稿顺序：状态栏 / 顶栏 / 搜索栏 / 最近使用 / 功能入口网格 / 离线声明 / Home 指示条。
- 功能入口 10 格，名称与副标逐项断言；最近使用 3 chips（首个选中）；收藏 → p14；10 个入口映射 p02/p04/p05/p07/p08/p09/p10/p11/p12/p13。
- 390×844 实测：`scrollWidth=390`、`clientWidth=390`、`scrollHeight=844`、`gridColumns=174.5px 174.5px`、`tileCount=10`、`pageOverflow=hidden`；14 页 `allPagesNoHorizontalOverflow=true`。
- 截图：`runs/p01-390x844.png`（Chrome/156.0.8078.76，DPR=1，mobile=true）。

### 样式契约

- `test/ui-source.test.ts` 扫描全部 `src/ui/**/*.ts`：无十六进制色值字面量；`font-family` 仅允许 `var(--la-font*)` 或 `inherit`；所有 `var(--la-*)` 引用均存在于 `tokens.css`；组件不重定义 `--la-*`。

### 已知非阻塞观察

- 浏览器 console 有 1 条 `http://localhost:4173/favicon.ico 404`：`index.html` 未声明 favicon（`icon.svg` 已存在于 `public/`），`index.html` 本卡禁改；运行时异常 `exceptions=0`，不影响功能与验收。建议后续卡在允许改 `index.html` 时补 `<link rel="icon" href="/icon.svg">`。
- 派工单文字提到 p01「底部导航」，设计稿 p01 实际为「离线声明 + Home 指示条」无 Tab 栏；按设计稿（唯一视觉依据）实现，差异已登记待 Lead 裁决。
- 搜索栏 / 最近使用为设计稿静态内容（14 页无搜索页；动态历史属 C5 store 且 p01 不在 C5 写范围），契约已写死。

## 执行边界说明

- `src/main.ts`（9 行）为 Lead 批准的入口接线，仅 import router + start，保留 tokens.css 导入；`index.html` / `vite.config.ts` / `tsconfig.json` 未改。
- `package.json` / `package-lock.json` 仅新增 `happy-dom@21.0.4`（Lead 裁决 1-A）；测试按文件头 `// @vitest-environment happy-dom` 启用，未改 vitest 配置。
- `docs/evidence/W4-C1/tools/measure-390.mjs` 为可复跑的布局自验工具（零第三方依赖，Node 24 内置 fetch/WebSocket + 本机 Chrome），放在证据目录内以便 G1 复跑；不属于产品源码。
- `dist/` 为门禁构建产物（gitignored），未作为交付物；`node_modules/` 变化为已批准依赖安装。

## 判定行

`gate1 tsc REAL_EXIT=0` ｜ `gate2 vitest REAL_EXIT=0：24 files / 196 tests passed（本卡新增 55 例）` ｜ `gate3 build REAL_EXIT=0` ｜ `measure-390 REAL_EXIT=0：p01 scrollWidth=390=clientWidth，14/14 页无横向溢出`。**待 Lead G1 复验；本档不自称过审。**
