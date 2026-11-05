# W8-B 证据档 · GSK G76 型号细分 + HNC G82 直进循环

> 卡：W8-B ｜ 执行者：worker-1 ｜ 隔离树：`<tree-root>`（T-W8B）｜ 基线 commit：`b9f6b3a`
> 日期：2026-11-05 ｜ 语义唯一来源：`docs/research/g76-dialects.md` §1 行1/行4（W6-C1 双源调研）
> 计划依据：`docs/plan/WAVE-PLAN-V3.md` G3/G4 + V3-3/V3-4；DEFERRED #16/#17
> 结论：**四门禁全部 exit 0**；全量 vitest `38 files / 408 tests` 全绿（基线 387 + 新增 21）；
> 金值双盲复算 **19/19 PASS**；写范围审计仅 4 个在单文件 + 本证据目录。

## 1. 交付物与写范围

| 文件 | 变更（vs `b9f6b3a`，added/deleted 行） | 内容 |
| --- | --- | --- |
| `src/core/gcode.ts` | +58 / −16 | `g76Dialect` GSK 两口径分支（988TA mm / 980TDc 0.0001mm 增量）+ 缺型号 throw 新文案；`g92Cycle` HNC→G82 单行 |
| `src/ui/pages/p04.ts` | +91 / −54 | GSK 型号 Segmented（URL `gskmodel`）+ 两口径代码卡注/参数卡；HNC 直进循环生成 G82 + 行注；enable 矩阵全开、两态 sysnote 与回落逻辑移除 |
| `test/gcode.test.ts` | +157 / −6 | GSK 988TA/980TDc 金值、换算路径、第二例、缺型号文案、HNC G82、G92 向后兼容（19 → 32 tests） |
| `test/ui-p04.test.ts` | +176 / −36 | 预授权迁移 enable 矩阵/sysnote 断言 + 型号选择器/G82 生成/参数卡断言（22 → 30 tests） |
| `docs/evidence/W8-B/` | 新增 | 本 README + `recompute.mjs` + `runs/` |

- 逐文件行数：`runs/06-diff-numstat.txt`。
- 写范围审计（基线导出逐文件比对）：`runs/05-write-scope-diff.txt`。仅上述 4 文件 `differ`
  + `Only in ./docs/evidence: W8-B`；`diff` 退出码 1 为「存在差异」的预期值，非门禁失败。
- 树内 `node_modules/` 接收时缺失（附录 D 要求树内含）：按附录 D 配方从主仓**只读复制**
  到树内，仅用于跑门禁，未进入任何 diff/提交。`dist/` 为构建产物，比对时排除。
- 未改动 `src/core/types.ts`（契约冻结）、`src/core/` 其他文件、其他页面、`src/data/`、
  `docs/plan/`、`docs/research/`、冻结参考件、`package.json`、`eslint.config.js`、`.zcode-site/`。

## 2. 门禁（仓库根逐条、单独整句执行）

| 门禁 | 命令 | 退出码 | 证据档 |
| --- | --- | --- | --- |
| lint | `npm run lint` | 0 | `runs/02-lint.txt` |
| 静态检查 | `npx tsc --noEmit` | 0 | `runs/01-tsc.txt` |
| 测试 | `npx vitest run --maxWorkers=2` | 0 | `runs/03-vitest.txt` |
| 构建 | `npm run build` | 0 | `runs/04-build.txt` |

- vitest 原始汇总：`Test Files 38 passed (38)` / `Tests 408 passed (408)`；
  `test/gcode.test.ts (32 tests)`、`test/ui-p04.test.ts (30 tests)`。
- 环境：Node `v24.12.0`、npm `11.21.1`、TypeScript `5.9.3`、vitest `3.2.7`、
  ESLint `v10.14.0`（`runs/07-env.txt`）。
- 每档均含命令原始输出 + `REAL_EXIT`。`runs/03-vitest.txt` 的 RUN 行树根绝对路径已按
  附录 G 只改前缀为 `<tree-root>`（该行其余字节原样）；其余档无机器绝对路径。

## 3. 金值双盲复算（强制项）

- 脚本：`docs/evidence/W8-B/recompute.mjs`（独立实现，不 import `src/**`；按调研档 §1 行1/行4
  的公式与单位注重新代入，格式化规格按 core 契约独立重写）。
- 记录：`runs/00-double-blind.txt`，`REAL_EXIT=0`，**19/19 PASS**（`VERDICT PASS` 由脚本计算）。
- 逐字符结果（built === expected）：

| 项 | 结果 |
| --- | --- |
| M30×3.5 d1 = 30 − 1.0825×3.5 = 26.21125 | PASS |
| M30×3.5 单边牙深 = (30−26.21125)/2 = 1.894375 | PASS |
| GSK 988TA 行1 `G76 P021060 Q0.1 R0.05` | PASS |
| GSK 988TA 行2 `G76 X26.211 Z-30. P1.894 Q0.4 F3.5` | PASS |
| GSK 988TA 精修 0.08 `R0.08` | PASS |
| 980TDc 增量中间值 0.1→1000 / 1.894375→18944 / 0.4→4000 | PASS ×3 |
| GSK 980TDc 行1 `G76 P021060 Q1000 R0.05` | PASS |
| GSK 980TDc 行2 `G76 X26.211 Z-30. P18944 Q4000 F3.5` | PASS |
| GSK 980TDc 精修 0.08 `R0.08`（R 保持 mm） | PASS |
| M30×2 d1 = 27.835 / 牙深名义 1.0825 | PASS |
| M30×2 988TA 三位 1.083 / 980TDc 增量 10825 | PASS ×2 |
| M30×2 988TA 行2 `G76 X27.835 Z-30. P1.083 Q0.3 F2.0` | PASS |
| M30×2 980TDc 行2 `G76 X27.835 Z-30. P10825 Q3000 F2.0` | PASS |
| HNC G82 `G82 X26.211 Z-30. I0 R0 E0 C1 P0 F3.5` | PASS |
| G92 向后兼容 `G92 X26.211 Z-30. F3.5` | PASS |
| 两口径输出不同（防静默共用一套格式） | PASS |

复算键算式（全部写入脚本，非手填）：

- 988TA：`P = formatNumber(1.894375) = 1.894`；`Q(Δdmin) = 0.1`；`Q(Δd) = 0.4`；`R(d) = 0.05`。
- 980TDc：`inc(x) = Math.round(x × 10⁴)` ⇒ `P = 18944`、`Q = 4000`、`Δdmin = 1000`；`R = 0.05` mm。
- 第二例 M30×2：`formatNumber(1.0825) = 1.083`（三位四舍五入，1082.5→1083）；`inc(1.0825) = 10825`。
- HNC G82 模板常量 `I0 R0 E0 C1 P0` 为直螺纹默认值（§1 行4 脚注）。

## 4. 验收标准逐条对照

1. **门禁**：§2 四门禁 exit 0；vitest 387 → 408（+21，零删既有用例——被替换的旧断言均按
   派工单「翻红预授权」以新断言覆盖，见 §5）。
2. **金值**：§3 全部逐字符 PASS。`g76Dialect(p,'gsk')` 缺型号错误文案逐字
   `GSK 需先选型号（988TA mm / 980TDc 增量）`（`test/gcode.test.ts` 断言全串精确相等，
   非子串匹配）；`g92Cycle(p)` / `g92Cycle(p,'fanuc')` 保持 `G92 X26.211 Z-30. F3.5`；
   `g76Dialect(p,'fanuc') ≡ fanucG76(p)` 恒等式原用例未动、仍绿。
3. **p04**：GSK + G76 出现「型号」Segmented（`988TA mm` / `980TDc 增量`），URL 键
   `gskmodel=988ta|980tdc`，缺省/非法值回落 `988ta`；GSK 代码卡口径注逐字
   `按 GSK988TA 口径（P/Q=mm 半径）` / `按 GSK980TDc 口径（P/Q=0.0001mm 增量 №.182.7，R=mm）`；
   HNC×直进循环代码卡生成 `G82 …` + 行注 `G82 为单循环行，完整螺纹需后续 X 递减分刀`；
   enable 矩阵两形式均四系统全可用，GSK 禁用 / HNC 禁用 / 「请用 G82」提示与回落逻辑移除；
   KND 口径注与既有断言未动。
4. **测试**：GSK 两口径金值、精修余量 0.08 两型号、增量换算路径（中间值 + 自定义首刀 0.35→Q3500）、
   第二例 M30×2、G82 免责字段与向后兼容四路（缺省/fanuc/gsk/knd）均入 `test/gcode.test.ts`；
   `test/ui-p04.test.ts` 覆盖型号页签默认/双击切换/非法值回落/出现条件 + G82 生成/行注/复制。
5. **证据档**：本档 + `runs/`（四门禁原始输出 + 双盲复算 + 写范围审计）+ `recompute.mjs`。

## 5. 预授权迁移与实现取舍（披露）

- **翻红预授权迁移**（派工单明列）：
  - `test/gcode.test.ts`：旧 `GSK 置灰 R1` 两条 `it`（throw 文案 / 零输出）→ 新文案 + 两口径
    金值共 11 条 `it`，另新增 G92 向后兼容 1 条 + HNC G82 3 条；总数 19 → 32。
  - `test/ui-p04.test.ts`：旧 enable 矩阵 / sysnote / HNC 回落断言块 6 条 `it` 中，
    2 条原样保留（循环形式标签、G76→G92 切换），4 条按预授权替换；同区域新增
    全可用矩阵、型号选择器、G82 生成共 12 条 `it`。总数 22 → 30，其余 16 条用例原样保留。
- **sysnote 整体移除**：W6-C2 的两态小字注只为置灰理由服务；解灰后无禁用项，既有测试
  `sysnote()` 辅助函数一并移除（派工单授权的「sysnote 相关断言随新 UI 更新」）。
- **HNC G82 代码卡 aria-label**：由 `G92 直进循环程序` 改为 `G82 直进循环程序`（与代码行一致）。
- **GSK 参数卡单位**：988TA `P/Q` 后缀 ` mm`、980TDc 后缀 `（0.0001mm）`；两型号 `R` 均标 ` mm`
  （R 始终保持 mm 口径，见§1 行1 单位注）。代码卡口径注为权威文案。
- **GSK J/K 退尾未输出**：两代手册 J/K 所在行不同（`g76-dialects.md` §4.2 第 2 条），本实现
  统一省略 J/K（直螺纹模板），避免跨型号行位歧义。
- **980TDc 前提**：实现与 UI 注均按状态参数 №.182.7 = 0.0001mm 增量档（V3-3 冻结口径）；
  若机床切到 mm/inch 档，P/Q 需按 mm 输入，代码卡口径注即此前提提示。

## 6. 风险 / 待 Lead 知悉

1. **半值舍入的浮点敏感性（既有行为，未改）**：p04 页面的牙深走
   `(d − d1)/2` 全精度路径。M30×2 时 `d1 = 30 − 1.0825×2` 的二进制表示使
   `threadDepthMM = 1.0824999999999996`（< 名义 1.0825）：
   - GSK 988TA 三位格式化得 `P1.082`（数学上 1.0825 三位四舍五入应为 1.083）；
   - FANUC/KND 的 `Math.round(×1000)` 得 `1082`（同样既有行为）。
   core 金值测试按既有测试惯例以名义值 `1.0825` 入参，故断言 `P1.083` / `P10825`（与派工单
   §2「按算式断言」一致）。该敏感性 W8-B **未修复**：修它会改变 FANUC/KND/HNC 既有输出
   （超出本卡范围且非派工单要求），登记给 Lead 决定是否在后续波次统一处理。
2. **免责边界**：HNC G82 单行只是单循环行，完整螺纹仍需后续 X 递减分刀；UI 已加行注，
   免责文案沿用 `G76_DISCLAIMER`（报告 §7.4 原句）。
3. **真实机床未验证**：全部结论为语法/语义级双源取证（W6-C1），未上机实测。

## 7. 链路键登记（供 Lead 波末并入 `src/ui/README.md` §5.2）

| 链路 | 键 | 含义 | 示例 |
| --- | --- | --- | --- |
| p03 → p04 | `gskmodel` | `988ta` \| `980tdc`，默认 `988ta`；仅 GSK + G76 形式出现型号页签，非法/缺省值回落 `988ta`（防死状态） | `980tdc` |

另：§5.2 现有 `system` / `cycle` 两键的「禁用组合自动回落 fanuc」说明随 V3-3/V3-4 解灰作废
（四系统 × 两形式全可用），建议 Lead 波末同步改写该行。

## 8. 证据档索引

| 文件 | 内容 |
| --- | --- |
| `runs/00-double-blind.txt` | 独立复算 19 项逐字符比对 + `VERDICT` |
| `runs/01-tsc.txt` | `npx tsc --noEmit` 原始输出 + `REAL_EXIT=0` |
| `runs/02-lint.txt` | `npm run lint` 原始输出 + `REAL_EXIT=0` |
| `runs/03-vitest.txt` | `npx vitest run --maxWorkers=2` 原始输出 + `REAL_EXIT=0` |
| `runs/04-build.txt` | `npm run build` 原始输出 + `REAL_EXIT=0` |
| `runs/05-write-scope-diff.txt` | 基线 `b9f6b3a` 导出逐文件比对结果 |
| `runs/06-diff-numstat.txt` | 4 个在单文件 added/deleted 行数 |
| `runs/07-env.txt` | Node / npm / tsc / vitest / eslint 版本 |
| `recompute.mjs` | 双盲复算脚本（独立实现，可单独重跑） |
