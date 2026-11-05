# W11-A · p15 宏程序库四模板（椭圆 / 网纹 / 油槽 / 切槽）

- 卡：W11-A（WAVE-PLAN-V4.1 §2）
- 基线：`c138d76`（W11 契约预置，510 tests）
- 隔离树：`LathCalc-trees_T-W11A`
- 日期：2026-11-05
- 判定行（由 `summarize.mjs` 读取 `runs/` 计算，非手填）：`GATES=tsc:0 lint:0 vitest:0 build:0` ｜ `VITEST=47 files / 528 tests passed` ｜ `BASELINE_TESTS=510` ｜ `NEW_TESTS=18` ｜ `RECOMPUTE=PASS` ｜ `WRITE_SCOPE=PASS` ｜ `VERDICT=PASS`（原始输出见 `runs/07-summary.txt`）。

## 1. 结论

1. `src/core/macro.ts` 实现四模板（FANUC B 类宏，输出 `lines = WHILE/END 循环体`，非展开点列）：
   - **椭圆**：`X=2a·COS[t]`（直径制）、`Z=b·SIN[t]`，`t∈[t0,t1]` 步进 `Δt` 的 `WHILE [#4 LT #5]` 循环体；
     变量分配按 V4.1 §2 冻结：#1=a / #2=b / #3=Δt / #4=当前角 / #5=终止角 / #6=X 直径 / #7=Z。
   - **网纹**：外层 X 逐层压入（每层 ΔX）+ 内层 Z 往复（宽度 W），双 WHILE；notes 提示滚花模数按 GB/T 6403.3 选型（不录标准表，总压深用户输入）。
   - **油槽**：`X=X₀+A·SIN[360·(Z−Zφ)/P]`，Z 按 ΔZ 逐点 G01；八字 = 两遍，第二遍 Zφ=P/2（相位差 180°）。
     口径注：**自研近似结构，非标准工艺文件**（检索判定见 `oilslot-research.md`）。
   - **切槽**：层数 `⌈H/Δd⌉` + 每层 Z 向搭接平移（步距 = 刀宽 − 搭接量），双 WHILE。
2. `src/ui/pages/p15.ts` 为真页面：四模板 Segmented → MacroParamSpec 驱动参数表单 → 程序卡（逐行 + 复制 + `G76_DISCLAIMER`）→「怎么算的」Accordion。
3. URL 键 `tpl=ellipse|knurl|oilslot|groove`（缺省/非法回落 `ellipse`）；已登记 `src/ui/README.md` §5.2（仅改 p15 行）。
4. 免责文案统一复用 `G76_DISCLAIMER`（`src/core/gcode.ts:8` 原句）。

## 2. 门禁（仓库根逐条、单独整句执行）

| 门禁 | 命令 | 退出码 | 证据档 |
| --- | --- | --- | --- |
| 静态检查 | `npx tsc --noEmit` | 0 | `runs/01-tsc.txt` |
| lint | `npm run lint` | 0 | `runs/02-lint.txt` |
| 测试 | `NO_COLOR=1 CI=1 npx vitest run --maxWorkers=2` | 0 | `runs/03-vitest.txt` |
| 构建 | `npm run build` | 0 | `runs/04-build.txt` |

- vitest 原始汇总：`Test Files 47 passed (47)` / `Tests 528 passed (528)`。
- 树内基线 510 tests；本卡净增 18（`test/macro.test.ts` 2→12，`test/ui-p15.test.ts` 0→8），零删既有 `it`。
- `runs/03-vitest.txt` 的 RUN 行树根绝对路径已按附录 G 只改前缀为 `<tree-root>`；其余档无机器绝对路径。
- 本卡四门禁含 `npm run lint`（与 W10-C 同口径；附录 A lint 行标注「暂不设」，但仓内脚本可用且 W10 已纳入四门禁执行）。

## 3. 锚点复算（禁裸值）

| # | 锚点 | 算式 | 结果 | 断言位置 |
| --- | --- | --- | --- | --- |
| 1 | 椭圆点抽验 t=15° | `X=2×15×cos15°=30×0.96592583=28.9777748` | `28.978` | `test/macro.test.ts` 点抽验；`recompute.mjs` |
| 2 | 椭圆点抽验 t=15° | `Z=25×sin15°=25×0.25881905=6.4704761` | `6.470` | 同上 |
| 3 | 椭圆宏行 | `#6=2*#1*COS[#4]` / `WHILE [#4 LT #5] DO1` / `END1` / `G01 X#6 Z#7` | 逐字符存在 | `test/macro.test.ts`；`test/ui-p15.test.ts` |
| 4 | 切槽层数 | `⌈深 2 / Δd 0.5⌉ = 4` | `4` | `test/macro.test.ts` + notes；`recompute.mjs` |
| 5 | 网纹层数 | `⌈H 0.6 / ΔX 0.2⌉ = 3`（缺省示例） | `3` | `test/macro.test.ts` + notes；`recompute.mjs` |
| 6 | 油槽八字相位 | `360×(P/2)/P = 360×(20/2)/20 = 180°`（缺省 P=20 mm） | `180°` | `test/macro.test.ts` + notes；`recompute.mjs` |

独立复算：`recompute.mjs`（**不 import `src/**`**，只按 V4.1 §2 算式重算）输出 `runs/05-recompute.txt`：
`RESULT: 18/18 checks passed` / `VERDICT=PASS`。

## 4. 油槽检索出口（上报条件①）

- 检索记录、URL、逐字摘录与判定：`oilslot-research.md`。
- 结论：唯一命中的具体结构为 **G33 双螺旋**（`G33 X=R1+R2 Z-15 K20 SF=0`，K=导程、SF=起始角），
  搜狐多篇 / 简书 / ai.so.com 为同一文章重复转载，未形成独立多源；360 文库仅标题/关键词无完整代码。
  **未达「多源结构一致」门槛** → 按 V4.1 §2「检索不足」出口实现自研正弦结构，并在 notes 披露
  「自研近似结构，非标准工艺文件」。
- 未采用 G33 结构的原因与取舍：见 `oilslot-research.md` §3；最终报告上报 Lead 裁决。

## 5. 写范围审计

`audit-scope.mjs` 以主仓基线 `c138d76` 的 520 个 tracked 文件为全集，逐文件与树内比对
（换行统一 LF，主仓取基线 blob，不受工作区 HEAD 漂移影响），并扫描树内新增文件：

- 基线内改动 `4/4`：`src/core/macro.ts`、`src/ui/pages/p15.ts`、`src/ui/README.md`、`test/macro.test.ts`；
- 新增：`test/ui-p15.test.ts` + `docs/evidence/W11-A/**`（证据档）；
- `changed_out_of_scope=0` / `new_out_of_scope=0` / `missing_in_tree=0` → `VERDICT=PASS`。
- 原始输出：`runs/06-write-scope.txt`。

## 6. UI 组件契约（V4.1 §4）

- 只使用既有组件：`createPage` / `TopBar` / `Segmented`（SegChip）/ `Card` / `Eyebrow` / `InputRow` /
  `CodeCard` / `Button` / `WarnCard` / `Accordion`。
- 零新 CSS 变量；页面 CSS 只引用既有 `--la-*` token，无十六进制色值、无内联 style 色值
  （`test/ui-p15.test.ts` 组件契约用例 + `test/ui-source.test.ts` 全量扫描）。
- 参数表单由 `MacroParamSpec.params` 驱动（键顺序 / label / unit / defaultValue 均来自 core 元数据）。

## 7. 已知观察 / 上报 Lead

1. **油槽结构出口**：保持自研正弦结构（本卡已实现）或另开卡按 G33 双螺旋实现（需改 V4.1 结构、
   重定锚点与参数域）。本卡不擅自改冻结结构。
2. **PROVENANCE 增量文本**（`data/PROVENANCE.md` 未改，待 Lead 收获时串行合并）：
   > 自研参数化模板（无外部数据依赖）：`src/core/macro.ts` 四模板（椭圆/网纹/油槽/切槽）为参数化生成，
   > 无标准表 / 外部数据录入；椭圆锚点 a=15、b=25、Δt=15° 为 WAVE-PLAN-V4.1 §2 算例输入。
3. **README 合并**：仅改 `src/ui/README.md` 的 p15 页面表行（stub 预置 → 已完成）与 §5.2 p15 `tpl` 行；
   p16 行与其相邻内容未动，Lead 与 W11-B 逐行合并。
4. **实现自定项**：V4.1 §2 仅冻结椭圆变量分配；网纹/油槽/切槽的 `#` 变量分配为本文件内自定
   （未跨模块共享），notes 与宏行注释可复核。
5. **数值精度**：所有嵌入 G 代码的数值按三位小数去尾零输出（与 `core/gcode` 的 `formatNumber` 同口径）；
   用户输入超过三位小数时程序行按三位小数舍入，notes 未逐条展开此格式化细节。
6. **URL 行为**：页面内切换模板不写回 hash（沿用 p11/p12 的页内状态约定）；`tpl` 键用于直达/刷新消费。

## 8. 复跑

```bash
cd <tree-root>
npx tsc --noEmit
npm run lint
NO_COLOR=1 CI=1 npx vitest run --maxWorkers=2
npm run build
node docs/evidence/W11-A/recompute.mjs
node docs/evidence/W11-A/audit-scope.mjs
node docs/evidence/W11-A/summarize.mjs
```

`summarize.mjs` 只读取 `runs/` 原始档并计算判定行；人工不手填。
