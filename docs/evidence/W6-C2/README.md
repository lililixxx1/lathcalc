# W6-C2 证据档 · core/gcode 方言实现 + p04 三系统解灰 + G92 循环形式

> 卡：W6-C2 ｜ 执行者：worker-1 ｜ 隔离树：T-W6C2 ｜ 基线 commit：`be90518`
> 日期：2026-11-04 ｜ 语义唯一来源：`docs/research/g76-dialects.md`（W6-C1，Lead 裁决 R1/R2/R3）
> 结论：**三门禁全部 exit 0**；全量 vitest `38 files / 387 tests` 全绿；金值双盲复算 **6/6 PASS**；
> 写范围审计仅 4 个在单文件 + 本证据目录（`runs/04-baseline-diff.log`）。

## 1. 交付物与写范围

| 文件 | 变更（vs `be90518`，added/deleted 行） | 内容 |
| --- | --- | --- |
| `src/core/gcode.ts` | +42 / −10 | `g76Dialect`（fanuc 恒等 / knd 两行 / hnc 单行 / gsk throw）、`g92Cycle` 单行；`fanucG76` 主体零改动 |
| `src/ui/pages/p04.ts` | +270 / −101 | 系统页签 value 对齐 `CncSystem`；循环形式 Segmented；enable 矩阵 + 回落；两态 sysnote；参数卡方言化；URL `system`/`cycle` |
| `test/gcode.test.ts` | +142 / −2 | 方言/G92 新用例（6 → 19） |
| `test/ui-p04.test.ts` | +220 / −26 | 预授权迁移 2 条 + 新用例（9 → 22） |
| `docs/evidence/W6-C2/` | 新增 | 本 README + `runs/` + `recompute.mjs` |

基线导出逐文件比对（`runs/04-baseline-diff.log`）：仅上述 4 文件 `differ`，另 `docs/evidence/W6-C2` 为新增目录；无范围外改动。
逐文件行数见 `runs/05-diff-numstat.log`。

## 2. 门禁（仓库根逐条、单独整句执行）

| 门禁 | 命令 | 退出码 | 证据档 |
| --- | --- | --- | --- |
| 静态检查 | `npx tsc --noEmit` | 0 | `runs/01-tsc.log` |
| 测试 | `npx vitest run --maxWorkers=2` | 0 | `runs/02-vitest.log` |
| 构建 | `npm run build` | 0 | `runs/03-build.log` |

- vitest 原始汇总：`Test Files 38 passed (38)` / `Tests 387 passed (387)`；其中 `test/gcode.test.ts (19 tests)`、`test/ui-p04.test.ts (22 tests)`。
- 环境：Node `v24.12.0`、npm `11.21.1`、TypeScript `5.9.3`、vitest `3.2.7`（`runs/06-env.log`）。
- 每档均含命令行 + 原始输出 + `REAL_EXIT`；vitest RUN 行的树根绝对路径已按附录 G 只改前缀为 `<tree-root>`。

## 3. 金值双盲复算（强制项）

- 脚本：`docs/evidence/W6-C2/recompute.mjs`（独立实现，不 import `src/**`；复算格式化口径与 `gcode.ts` helper 规格一致）。
- 记录：`runs/00-double-blind.log`，`REAL_EXIT=0`，**6/6 PASS**。
- 未舍入中间值：`d1=26.21125`；单边牙深 `1.894375`；`depthUM=1894`；`depth3=1.894`；`firstUM=400`；`finishKND=50`。
- 逐字符结果（built === expected）：

| 项 | 结果 |
| --- | --- |
| FANUC 行1 | `G76 P021060 Q100 R0.05` PASS |
| FANUC 行2 | `G76 X26.211 Z-30. P1894 Q400 F3.5` PASS |
| KND 行1 | `G76 P021060 Q100 R50` PASS |
| KND 行2 | `G76 X26.211 Z-30. P1894 Q400 F3.5` PASS |
| HNC 单行 | `G76 C2 R0 E0 A60 X26.211 Z-30. I0 K1.894 U0.05 V0.1 Q0.4 P0 F3.5` PASS |
| G92 单行 | `G92 X26.211 Z-30. F3.5` PASS |

- 与派工单 §2 金值表逐字符一致，无不符项。

## 4. 实现要点（验收对照）

- FANUC 恒等式：`g76Dialect(p,'fanuc')` 直接 `return fanucG76(p)`；测试覆盖默认与自定义精修、第二例参数（非单点巧合）。
- KND：两行式，`R = Math.round(0.05×1000) = 50`，`P = Math.round(1.894375×1000) = 1894`，`Q = Math.round(0.4×1000) = 400`；行2 与 FANUC 同串。
- HNC：单行式 `C2 R0 E0 A60 X… Z… I0 K… U… V0.1 Q… P0 F…`；mm 半径口径三位；模板常量逐字取调研档冻结示例，未做跨方言等效改写。
- GSK：`throw new Error('g76Dialect: GSK G76 两代系统 P/Q 单位口径不同，暂不生成（W6-C1 R1 置灰）')`；测试 `toThrow` 逐字断言。
- G92：`lines.length === 1`；FANUC/GSK/KND 同串，core 无 system 分支；免责 `G76_DISCLAIMER` 照常返回。
- p04 enable 矩阵：G76 形式 `[fanuc:on, gsk:off, knd:on, hnc:on]`；G92 形式 `[fanuc:on, gsk:on, knd:on, hnc:off]`；切换形式/初始 URL 落禁用格均回落 FANUC。
- 两态 sysnote 逐字：G76 `GSK · 两代系统单位口径不同，暂不生成（防静默错误）`；G92 `华中 · G92 为工件坐标系设定，螺纹单循环请用 G82`。
- 参数卡：G76 六格语义顺序不变；FANUC `1894 μm / 400 μm / 0.05`，KND `1894（0.001mm）/ 400（0.001mm）/ 50（0.001mm）`，HNC `K 1.894 mm / Q 0.4 mm / U 0.05 mm`；X/Z/F 三系统同形。G92 收缩为三格（牙底 X / 终点 Z / 导程 F）。
- CodeCard：KND + G76 注释含 `按 KND-1000T 口径（P/Q/R=0.001mm）`；HNC `已按 华中 生成`；GSK/FANUC 推广同一模式。
- G92 SubText（W6-C1-04 裁决文案）：`G92 为循环首行，完整螺纹需后续 X 递减分刀`。
- TopBar badge 跟随当前系统（FANUC / 广数 GSK / KND / 华中）；免责 WarnCard 保留；空参数「请先选型」分支行为不变。

## 5. URL 链路键登记（供 Lead 波末并入 `src/ui/README.md` §5.2）

| 链路 | 键 | 含义 | 示例 |
| --- | --- | --- | --- |
| p03 → p04 | `family` `spec` `d` `p` `system` `cycle` | 前四键原样带出；`system` = `fanuc` \| `gsk` \| `knd` \| `hnc`（默认 `fanuc`）；`cycle` = `g76` \| `g92`（默认 `g76`） | `#/p04?family=metric&spec=M30%C3%973.5&d=30&p=3.5&system=knd&cycle=g92` |
| p01 → p04 | （无） | 空参数直达仍按原行为提示先选型；`system`/`cycle` 可选 | `#/p04` |

- 非法 `system` / `cycle` 值回落默认；`system`×`cycle` 落在禁用格时回落 `fanuc`。
- 点击页签只更新页面状态，不改写 hash（沿用 p07/p12 的「读参数 + 组件状态」模式）；直达 URL 键为冻结契约。

## 6. 翻红预授权执行清单

| 派工单 §3 条目 | 执行 |
| --- | --- |
| `test/ui-p04.test.ts:138` 旧「仅 FANUC / 待补」断言 | 迁移为 `p04 系统页签 · G76 形式 enable 矩阵` 的逐格 disabled 断言 |
| `test/ui-p04.test.ts:154` `.rc-p04__sysnote` 含「待补」 | 迁移为两态提示逐字断言（G76 / G92 各一条） |
| 文件头注释 | 已同步 W6-C2 范围与金值来源 |
| 其余既有断言 | 全部保留并通过：两行金值、P1894 禁 1895、复制两行、免责、P 位注、G1/2 55°、空态、p02→p03→p04 链路 |

- 用例净增：`gcode.test.ts` +13（6→19）、`ui-p04.test.ts` +13（9→22），合计 **+26（≥20）**。
- 翻红未超出 §3 清单。

## 7. 偏差 / 上报项（编号为提议，待 Lead 裁决）

- **W6-C2-01（实现选择，低风险）**：空参数态在「请先选型」警示与按钮之外，也渲染了系统/循环形式两组 Segmented；空态核心行为（无代码卡/无参数卡/按钮回 p02）不变。
- **W6-C2-02（实现选择，低风险）**：HNC 的 G76 说明区不显示 `P021060` 位义（该模板不存在于 HNC 单行式），牙深行改用 `K = 牙深 ... mm`；避免跨方言错标。
- **W6-C2-03（实现选择，低风险）**：FANUC「精修 R」参数值保持旧展示 `0.05`（无单位后缀，与派工单金值表 `R 0.05` 一致）；KND 追加 `（0.001mm）`，HNC 用 `mm`。
- **W6-C2-04（规则外延，低风险）**：初始 URL 落在禁用格（`system=hnc&cycle=g92` / `system=gsk&cycle=g76`）时同样回落 FANUC，与「切换形式回落」共享同一「防死状态」不变量。
- **W6-C2-05（上游语义提示，需发布注记）**：`g76-dialects.md §4.2 #5` 指出 KND `R(d)` 单位可能随机型不同（K100Ti-D 问答示例为 mm）。本卡按 R2/KND-1000T 采用 0.001mm 并在 UI 标注；面向 K100Ti-D 用户需在发布说明中限定口径。
- **W6-C2-06（上游语义提示，非阻塞）**：`§4.2 #3` HNC-21T 完整手册文本层不可得，enable 依据为 HNC-8 官方手册（A）+ HNC-21T 教学来源（B/B）；`§4.2 #2` GSK 的 `J/K` 行位置随型号，因 GSK G76 已置灰而不涉及。
- 范围外缺陷：未发现（未修复任何范围外文件）。

## 8. 复跑方式

```bash
# 在隔离树根目录执行（路径含空格须引号）
npx tsc --noEmit
npx vitest run --maxWorkers=2
npm run build
node docs/evidence/W6-C2/recompute.mjs
```

证据档相对路径索引：`runs/00-double-blind.log`、`runs/01-tsc.log`、`runs/02-vitest.log`、`runs/03-build.log`、`runs/04-baseline-diff.log`、`runs/05-diff-numstat.log`、`runs/06-env.log`。
