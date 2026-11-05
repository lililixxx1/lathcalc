# W10-C · p04 锥管族程序生成（G76/G92 锥度位）+ p03 按钮解禁

- 卡：W10-C（WAVE-PLAN-V4 §2）
- 基线 commit：`bd1d74d`
- 隔离树：`LathCalc-trees_T-W10C`
- 日期：2026-11-05
- 判定行（由 `summarize.mjs` 读取 `runs/` 计算，非手填）：
  **四门禁 REAL_EXIT 全 0；vitest 44 files / 502 tests 全绿；四锚点行独立复算 5/5 PASS。**

## 1. 结论

1. `src/core/gcode.ts` 删除 `assertNoTaper` 桩，四方言锥度位全部落地：
   - FANUC / GSK 两行式行2：`X Z` 后插 `R{mm}`（GSK 980TDc 的 R 保持 mm）；
   - KND 两行式同位次：`R` 按 0.001 mm 口径输出整数 μ（−0.3 → `R-300`，推定并披露）；
   - HNC G76 单行：`I` 位写入锥度；HNC G92 → G82：模板 `I0` 处替换为锥度值；
   - G92 单行（FANUC/GSK/KND 同串）：`G92 X.. Z.. R.. F..`，并披露
     「FANUC R 位系 W6 三系统同串先例外推」。
2. p04 支持 `sealpipe` / `npt`：锥管模式显示「螺纹长度 L」输入行（URL 键 `l`，
   缺省/非法回落 9.6），`taperRadiusMM = −L/32`，程序卡下方显示锥度位与推导式；
   直螺纹族行为逐字符不变（缺省/0 = 直螺纹）。
3. p03 的 sealpipe/npt「生成 G76 程序」链路经测试确认真跳转（代码层本来就已统一
   跳转，本次仅补注释与链路测试；蜗杆态仍无按钮）。
4. KND `R(i)` 单位无逐字第二源：按派工单上报条件① 以 0.001mm 推定实现并在口径注
   披露，双源摘录见 `knd-ri-sources.md`。

## 2. 门禁（仓库根逐条、单独整句执行）

| 门禁 | 命令 | 退出码 | 证据档 |
| --- | --- | --- | --- |
| 静态检查 | `npx tsc --noEmit` | 0 | `runs/01-tsc.txt` |
| lint | `npm run lint` | 0 | `runs/02-lint.txt` |
| 测试 | `npx vitest run --maxWorkers=2` | 0 | `runs/03-vitest.txt` |
| 构建 | `npm run build` | 0 | `runs/04-build.txt` |

- vitest 原始汇总：`Test Files 44 passed (44)` / `Tests 502 passed (502)`。
- 树内基线 477 tests；本卡净增 25（`gcode.test.ts` 32→44，`ui-p04.test.ts` 30→43），
  零删既有 `it`。
- 主仓在卡执行期间已推进到 W10-A 收获 `ca34c08`（482 tests）；本卡六文件与该提交
  无路径交集，收获后合并预期 507 tests（以 Lead 收获后实跑为准）。
- `runs/03-vitest.txt` 的 RUN 行树根绝对路径已按附录 G 只改前缀为 `<tree-root>`；
  其余档无机器绝对路径。

## 3. 金值锚点（WAVE-PLAN-V4 §2 W10-C，逐字符）

算例：R1/16（`threads-sealpipe.json` row0，d=7.723，P=25.4/28=0.907142857…），
L=9.6，首刀 0.2，基面小径 X=7.723−1.2806×0.907142857…=6.561312…→6.561。

| # | 锚点行 | 断言位置 |
| --- | --- | --- |
| 1 | `G76 X6.561 Z-9.6 R-0.3 P581 Q200 F0.907` | `test/gcode.test.ts` · FANUC 行2；`test/ui-p04.test.ts` · p04 默认 L=9.6 |
| 2 | `G76 X6.561 Z-9.6 R-0.3 P5808 Q2000 F0.907` | `test/gcode.test.ts` · GSK 980TDc 行2；`test/ui-p04.test.ts` · 980TDc 直达 |
| 3 | `G82 X6.561 Z-9.6 I-0.3 R0 E0 C1 P0 F0.907` | `test/gcode.test.ts` · HNC G82；`test/ui-p04.test.ts` · HNC G92 |
| 4 | `G92 X6.561 Z-9.6 R-0.3 F0.907` | `test/gcode.test.ts` · FANUC/GSK/KND 同串；`test/ui-p04.test.ts` · 三系统循环 |

独立复算：`recompute.mjs`（不 import `src/**`，按 V4 §2 算式重算中间值与 5 条程序行，
含 KND G76 推定行），输出 `runs/05-recompute.txt`：`VERDICT=PASS (5/5 锚点行)`。

## 4. KND `R(i)` 单位（上报条件①）

- 双源摘录与判定：`knd-ri-sources.md`；取回尝试原始记录：`runs/knd-ri-book118.txt`。
- 结论：源 [8] 手册参数表/示例未逐字写 `R(i)` 单位；示例 `Q100/R200/P3680` 与
  0.001mm 自洽。按 0.001mm 推定：`R${Math.round(taper*1000)}`（−0.3 → `R-300`）。
- 披露：p04 KND + G76 + 锥管代码卡注释含
  「R(i) 按 KND 全 P/Q/R 0.001mm 口径推定」；锥度推导式注含「程序写作 R-300（0.001mm 口径）」。

## 5. 写范围审计

- `audit-scope.mjs`：以主仓基线 `bd1d74d` 的 461 个 tracked 文件为全集（取 baseline blob，
  避免并行收获导致的 HEAD 漂移），逐文件与树内比对（换行统一 LF）。
- 输出 `runs/07-write-scope.txt`：`changed_in_scope=6`（六文件全改）、
  `changed_out_of_scope=0`、`missing_in_tree=0`、`VERDICT=PASS`。

## 6. 证据索引

| 路径 | 内容 |
| --- | --- |
| `runs/01-tsc.txt` | `npx tsc --noEmit` 原始输出 + REAL_EXIT |
| `runs/02-lint.txt` | `npm run lint` 原始输出 + REAL_EXIT |
| `runs/03-vitest.txt` | 全量 vitest 原始输出 + REAL_EXIT（502 tests） |
| `runs/04-build.txt` | `npm run build` 原始输出 + REAL_EXIT（39 precache） |
| `runs/05-recompute.txt` | 独立复算 5 条程序行 + VERDICT |
| `runs/06-summary.txt` | 门禁汇总判定行（脚本生成） |
| `runs/07-write-scope.txt` | 写范围审计 |
| `runs/knd-ri-book118.txt` | KND 手册页取回记录（HTTP 200 / 预览无正文） |
| `runs/08-env.txt` | Node / npm / tsc / vitest 版本（Node 24.12.0 / npm 11.21.1 / TS 5.9.3 / vitest 3.2.7） |
| `knd-ri-sources.md` | KND `R(i)` 双源摘录 + 推定判定 |
| `recompute.mjs` | 独立复算脚本（不 import src） |
| `summarize.mjs` | 门禁汇总脚本（生成判定行） |
| `audit-scope.mjs` | 写范围审计脚本 |

## 7. 未决 / 上报

1. **KND `R(i)` 单位推定**（上报条件①）：按 0.001mm 实现；若 Lead 取得手册正文或要求
   面向 K100Ti-D 分支，需复核。
2. **p03 实际行为与派工单措辞差异**：基线 p03 的 sealpipe/npt 按钮已统一 `navigate('p04')`；
   原「落请先选型」是 p04 拒绝这两族造成的。本次 p04 解禁后链路自然打通，p03 仅补注释，
   未改行为（链路测试见 `ui-p04.test.ts`）。如要求 p03 有代码级 diff 之外的改动，请裁决。
3. 无 `types.ts` 额外字段需求（全程未改 `src/core/types.ts`、`src/data/**`）。
