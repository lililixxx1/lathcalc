# WAVE-PLAN-V4.15 · 代码可维护性（v0.8.1）

> 用户指令 2026-11-12：「优化一下代码可维护性」+ standing「下一波」自主波次授权。
> 形态：**Lead 直改**（V4.13/V4.10 先例；纯机械重构无需双树开销），
> Lead 接管卡 → 跳 G1 直入 **G2 完整轮**（TEAM_PROMPT「G2 按卡分轻重」）。
> 「近终局不重构」默认被用户显式指令覆盖（DEVIATIONS V4.15-01，先例
> V4.12-01/V4.14-01）；风险 > 收益项仍一律登记不动（见 §6）。

## 一、审计基线（先审计后动手；工具与原始档见 docs/evidence/V4.15/runs/）

| # | 探针 | 结果 | 结论 |
| --- | --- | --- | --- |
| A1 | 类型逃逸（`: any`/`as any`/`@ts-ignore`，词边界） | **0**（首轮 12 命中全为 CSS `overflow-wrap: anywhere` 假阳性） | 微观债为零，无全仓样式化重构需求 |
| A2 | TODO/FIXME/临时/占位 标记 | 6 命中全为描述性注释（骨架文档、「缺省不占位」等） | 无真实债务标记 |
| A3 | 死导出（audit-dead-exports.cjs 符号级，语料=src+test 全量 .ts） | **全死 17** / 仅 export 关键字死 54（符号本体自身文件内使用） | 17 全死符号可删；54 属「公开面偏宽」，§6 裁定不动 |
| A4 | 文件规模 TOP | p14.ts 692（分享图引擎 ~330 行与页面装配混装）、p07 584 / p04 575（常量表+helpers+figure+page 有序分区） | 仅 p14 构成拆分理由；p07/p04 结构良好不动 |
| A5 | 重复度 | 页面 scoped CSS 5–42 行无重复；`ctx.params` 27 处但语义各异（白名单/回退/徽标同步各页不同） | 不构成抽象理由（§6） |
| A6 | 死导出复扫口径 | 全死 17 = arc.ts `perpendicularFoot` + icons.ts `ICON_NAMES` + types.ts 15 个类型别名（`DegToDMS` + 14 个 `*Fn`；G0 C-03 勘正：原文「16/15」系重复计数，17=1+1+15 逐个可数于 runs/audit-pre.txt） | 三文件清单钉死，无散布 |

**A3 补充事实（p14 引擎抽取可行性）**：引擎区符号（`Canvas2DLike`/`SharePalette`/
`ShareLayout`/`buildShareLayout`/`paintShareImage`/`wrapText`/`kindLabel`/
`formatTimestamp`/`relativeDayLabel`/`SHARE_IMAGE_WIDTH` 等）全仓消费面恰 2 文件
（`src/ui/pages/p14.ts` + `test/ui-p14.test.ts`）；引擎对 `StoredEntry` 的实际读取
仅 5 字段（`id`/`kind`/`title`/`params`/`ts`，A4 区段 grep 全集）；`resolveSharePalette`
读 DOM（getComputedStyle）属页面层。

## 二、卡片（全部 Lead 执行；顺序 W1→W2→W3，互不依赖但同路径集少交叠）

### W1 · 全死代码删除（17 符号，A3/A6 清单）

- `src/core/arc.ts`：删 `perpendicularFoot`（:13-16，垂足工具函数，全仓零引用）。
- `src/ui/components/icons.ts`：删 `ICON_NAMES`（:38，零引用常量；`IconName` 类型不动）。
- `src/core/types.ts`：删 15 个零引用类型别名 —— `DegToDMS`（:18）与 14 个 `*Fn`
  （`ThreadDimensionsFn`:49 等，W2 契约期 Lead 预置的「实现签名注册表」，实现波次
  实际直接导出实名函数，注册表从未被消费；G0 C-03 勘正：原文「16/15」系重复计数，
  17=1+1+15 逐个可数于 runs/audit-pre.txt）。
- **红线核对**：types.ts 头注「不得改本文件」系 W2 实现期对 worker 的防漂移冻结令，
  非永恒冻结；本删除=Lead 修订自身预置契约，登记 DEVIATIONS V4.15-02；
  不触「常数集」（头注 L2 红线指 60°/55° 数值常数，类型别名非常数）。
- 验收：tsc 0 + vitest 787 passed + 4 skipped 数目不变 + 全仓 grep 零残留
  （`grep -rn "perpendicularFoot\|ICON_NAMES\|DegToDMS\|ThreadDimensionsFn\|ThreeWireMFn" src test --include="*.ts"` 退出码 1）。

### W2 · 过渡脚手架退役

- `src/ui/components/PageShell.ts`：删 `renderPlaceholder`（p02–p14 占位骨架，
  W4-C1 期产物；当前 16 页全部已实现，占位渲染零调用方）**连带删其独占参数接口
  `PlaceholderOptions`（:82-91，全仓仅 renderPlaceholder 签名引用，先删接口即孤儿
  ——G0 C-01）**；同步修订 :12 与 :94 附近「占位骨架使用 renderPlaceholder」
  历史注释为已完成时态（只删失效指代，不改其他注释语义）。
- 验收：同 W1 门禁 + `grep -rn "renderPlaceholder\|PlaceholderOptions" src test`
  退出码 1。

### W3 · p14 分享图引擎抽取 `src/core/share-image.ts`（结构性主卡）

- **搬移清单**（p14.ts :64-393 引擎区 → core/share-image.ts，逐符号原样搬移零改写）：
  - 类型/接口：`Canvas2DLike`、`ShareColorKey`、`SharePalette`、`ShareTextBlock`、
    `ShareRect`、`ShareLayout`；
  - 常量：`SHARE_IMAGE_WIDTH`=600（export 保持）、`SHARE_PADDING`=48（现状已私有，
    搬移保持——G0 Minor-3 措辞勘正）；
  - 纯函数：`kindLabel`（携 `KIND_LABELS` 表）、`formatTimestamp`、`formatMonthDay`、
    `relativeDayLabel`、`wrapText`、`buildShareLayout`、`paintShareImage`、
    `shareFileName`（:360，export 保持——test/ui-p14.test.ts 消费；G0 C-02 钉死归属：
    随引擎搬 core，签名 `entry: StoredEntry` → `entry: ShareEntry`，读 entry.id/kind
    ⊂ 5 字段子集，纯函数）。
- **新增代码（G0 C-02 勘正表述）**：`ShareEntry` 结构接口（引擎实际读取的 5 字段：
  `id: string; kind: string; title: string; params: Record<string, string|number>; ts: number`，
  来源=A4 引擎区 `entry.*` grep 全集）+ `buildShareLayout`/`shareFileName` 两签名
  的参数类型改写为 `ShareEntry`；p14 以 `StoredEntry` 传入，tsc 结构兼容即证。
  **目的：core 不依赖 ui/store**
  （core 纯函数零 DOM/零 ui import 的既有架构律，thread/stock/speed-figure 同款）。
- **留在 p14.ts（页面装配层）**：`resolveSharePalette`（读 DOM getComputedStyle，
  :366，转私有）、`paramsMeta`（:386，私有，消费方 :541 装配层——G0 C-02 钉死归属：
  留 p14 不搬）、CSS、page 装配、store 交互（:394-692 不动）。
- `test/ui-p14.test.ts`：**仅改 import 路径**（引擎符号改自 `../src/core/share-image`），
  期望值零漂移（锚点纪律：改期望值=L2）。
- 验收：tsc 0 + vitest 787+4 数目不变且 ui-p14 全绿 + `grep -n "from '../store'" src/core/share-image.ts` 退出码 1（core 零 ui 依赖）+ p14.ts ≤ 400 行。

## 三、验收标准（波次总门禁，逐条附退出码）

1. 五步门禁 **5×0**（bump 0.8.1 **先于** build，V4.7-M2 时序）：
   `npx tsc --noEmit` / `npx vitest run --maxWorkers=2`（787 passed + 4 skipped，
   数目与 v0.8.0 逐位同）/ `npm run build` / `npx eslint .` /
   `PERF_BUDGET=1 npx vitest run test/perf-budget.test.ts --maxWorkers=2`（4 passed；
   W3 模块图变动使 index 块轻微变化，预算阈值 283890B 未压缩口径不变，超限即 FAIL
   ——超限处置=回退评估 W3 拆分（调阈值=L2，禁；G0 Minor-4 补充））。
2. **纯重构零行为主张的机检背书**：`verify-stage`（docs/evidence/V4.14-A/tools/
   verify-stage.mjs，L1 口径版）复跑 **FAIL=0/30**（五尺寸 × 6 路由几何断言；
   src/ui 有触碰故必跑）。**视觉轮免做推理**：W1-W3 均为代码搬家/删除，渲染逻辑
   零改动，DOM 输出零变化由 30 格几何断言背书——此推理明示，G2 有权否决改派 vision。
3. 死导出复扫归零：`node docs/evidence/V4.15/tools/audit-dead-exports.cjs` 复跑，
   「全死符号」= 0；「仅 export 关键字死」清单相对 audit-pre.txt（54）的差集恰为
   预期三条 —— `renderPlaceholder`+`PlaceholderOptions`（W2 删除）、
   `resolveSharePalette`（W3 转私有），另 `ShareColorKey`/`ShareTextBlock`/`ShareRect`
   三接口随 W3 迁址 core/share-image.ts（地址变符号名不变，仍在该清单）。
4. 残留 grep（W1/W2 清单符号）src+test 零命中。
5. 部署后线上核验：新 dist index-*.js 哈希同时出现在 index.html 与 sw.js（bundle
   哈希必变=模块图变动，预期内）。

## 四、版本与部署

- `package.json` 0.8.0 → **0.8.1**（纯重构 patch）。
- tag `v0.8.1`；重部署（zcode-site CLI --site 2117881677596819456）；线上哈希双点核验。

## 五、证据与登记

- `docs/evidence/V4.15/tools/audit-dead-exports.cjs`（A3 工具，可复跑）+
  `runs/audit-pre.txt`（波前档：全死 17/仅 export 死 54，含首轮假阳性披露）+
  `runs/audit-post.txt`（波后复扫）+ 五步门禁档 + verify-stage 复跑档。
- 台账：TASK-LEDGER V4.15 行；DEVIATIONS **V4.15-01**（近终局重构豁免=用户指令
  背书）、**V4.15-02**（types.ts 契约文件修订披露：删 16 个从未消费的预置类型别名，
  不触常数集）。

## 六、非目标（审而不改，防止拍脑袋重构；登记于本节即冻结边界）

1. **29 个组件 Props 接口 export 保留**：组件 API 文档惯例 + 页面装配类型标注的
   合理保留面；改 29 文件纯机械收益低（A3「仅 export 关键字死」主体）。
2. **`ctx.params` 27 处不抽象**：白名单/回退/徽标同步/滚动恢复语义各页不同，
   强抽象反而藏差异（A5）。
3. **超长测试文件不拆**（arc-figure-a2.test 870 / ui-p04.test 728）：用例密度
   非结构债，拆分零收益。
4. **LATIN_CHAR_W 两套估宽维持随 V4.9 G2 Imp-1**：视觉相关，纯重构波禁触
   （4.93 vs 5.5，改值=视觉变化需 vision 轮）。
5. **eslint 不加 complexity/max-lines 类规则**：门禁口径五步不动（W7/V2-2 冻结）。
6. **页面 CSS 不合并**：scoped 5–42 行无重复（A5），BASE_CSS 集中已够。
7. **数据 JSON 不改懒加载**：72KB 已按路由自然分包（p03 只引螺纹表组），
   加动态 import = 收益负（首屏路由不受影响）。

## 七、G0 裁决记录（plan-code-reviewer，2026-11-12）

**有条件通过 → C-01/C-02/C-03 三条全闭（本节即修订记录，计划随本提交冻结）：**

- **C-01** W2 漏连带删 `PlaceholderOptions`（全仓仅 renderPlaceholder 签名引用，不删
  则验收 3 复扫必假红）→ 已并入 §二W2 删除清单与 §三.4 grep 模式。
- **C-02** W3 搬移清单漏 `shareFileName`/`paramsMeta` 归属声明 → 已钉死：前者随引擎
  搬 core（签名 StoredEntry→ShareEntry，export 保持供 test），后者留 p14 装配层
  （消费方 :541）；「新增唯一新代码」表述勘正为「ShareEntry + 两签名类型改写」。
- **C-03** types.ts 计数「16 个（DegToDMS + 15 个 *Fn）」系重复计数 → 勘正
  「15 个（DegToDMS + 14 个 *Fn）」，17=1+1+15 逐个可数于 runs/audit-pre.txt；
  本计划两处 + DEVIATIONS V4.15-02 + TASK-LEDGER V4.15 行四处同步勘正。
- **Minor 处置**：M-1 附录 A lint 行过时=V4.14 M-01 已裁定登记不修（团队纪律件
  不动，维持原裁决）；M-2 工具自述「单列人工判」与实现不符 → 已改
  tools/audit-dead-exports.cjs 注释为实际行为（注释级，逻辑零动）；M-3
  「SHARE_PADDING 转私有」措辞 → 已勘正「现状已私有，搬移保持」；M-4 perf 预算
  超限处置 → 已补 §三.1「回退评估 W3（调阈值=L2 禁）」；M-5 types.ts 头注不改
  （DEVIATIONS 指针化解，采纳）。
- reviewer 独立复算留痕：vitest 787 passed + 4 skipped（61+1 文件）退出码 0；
  死导出工具复跑全死 17/仅 export 死 54 退出码 0；entry.* 5 字段 grep 逐位吻合。
