# W11-B · p16 挂轮计算（穷举算法 + 自定义齿数兜底）

- 卡：W11-B（WAVE-PLAN-V4.1 §3 / §4）
- 基线 commit：`c138d76`（W11 契约预置，510 tests）
- 隔离树：`LathCalc-trees_T-W11B`（非 git 仓库，基线核验：树内文件与 `c138d76` blob 一致）
- 日期：2026-11-05
- 判定行（由 `summarize.mjs` 读取 `runs/` 计算，非手填）：
  **四门禁 REAL_EXIT 全 0；vitest 47 files / 524 tests 全绿；锚点复算 8/8 PASS；写范围审计 PASS。**

## 1. 结论

1. `src/core/gear.ts` 落地 V4.1 §3 冻结算法：`i_target = P/T`，a/b/c/d ∈ 可用齿数集合
   四重穷举 `(a/b)×(c/d)`，按 `(errorPpm 升序, a+b+c+d 升序, (a,b,c,d) 字典序)` 取前 8；
   `errorPpm = |i_target − ratio| / i_target × 10⁶`。集合去重 / 升序由实现负责；
   P≤0、T≤0、去重后 <4、含 ≤0 齿数 → throw（文案含「挂轮」）。
2. `src/ui/pages/p16.ts` 为真页面：P/T 输入卡 → 齿轮组（自定义齿数，逗号 / 空格分隔，
   去重升序）→ 前 8 结果表（a/b×c/d、ratio 6 位、误差 ppm 2 位、e=0 标「精确」徽标）
   → 表下注「同值齿数需两件齿轮」→ `i = P / T` 算式卡。URL 键 `p` `t`
   （`#/p16?p=3.175&t=12`）。
3. **预置齿轮组 = B 出口**：未检索到「组名 + 齿数清单」双源逐位一致的国产车床标准挂轮组，
   按 V4.1 §3 预授权只保留自定义齿数入口；不新增 `src/data/gear-sets.json`，
   `src/data/PROVENANCE.md` 零改动。检索日志与逐位核对见 `gear-sets.md`。
4. 组件契约（V4.1 §4）：页面只用 `../components` barrel 既有组件与 `tokens.css` 既有变量；
   零新 CSS 变量、零十六进制色值、零内联 `style`（`test/ui-p16.test.ts` 断言 + `ui-source.test.ts` 全量扫描）。

## 2. 门禁（仓库根逐条、单独整句执行）

| 门禁 | 命令 | 退出码 | 证据档 |
| --- | --- | --- | --- |
| 静态检查 | `npx tsc --noEmit` | 0 | `runs/01-tsc.txt` |
| lint | `npm run lint` | 0 | `runs/02-lint.txt` |
| 测试 | `npx vitest run --maxWorkers=2` | 0 | `runs/03-vitest.txt` |
| 构建 | `npm run build` | 0 | `runs/04-build.txt` |

- vitest 原始汇总：`Test Files 47 passed (47)` / `Tests 524 passed (524)`。
- 树内基线 510 tests；本卡净增 14：
  - `test/gear.test.ts` 1（桩 PANIC 用例）→ 8 个真断言用例（净 +7；桩用例按派工单
    「桩用例改造+扩真断言」替换，非删除既有验收语义）；
  - `test/ui-p16.test.ts` 新建 7 用例（净 +7）。
- `runs/03-vitest.txt` 的 RUN 行树根绝对路径已按附录 G 只改前缀为 `<tree-root>`；
  其余证据档无机器绝对路径。

## 3. 金值锚点（V4.1 §3，含算式）

集合一律为五倍组 `{20,25,…,100}`（17 枚，`20+5k`，k=0…16）。

| # | 算例 | 期望 | 断言位置 |
| --- | --- | --- | --- |
| 1 | T=6、P=1.5 | `i=1.5/6=0.25`；top1.errorPpm === 0（精确解存在，如 `30/60×40/80=0.5×0.5=0.25`）；排序键单调 | `test/gear.test.ts` 用例 1/3；`test/ui-p16.test.ts` 默认态 |
| 2 | T=12、P=3.175（=25.4/8，8 tpi） | top1 = `20/55×40/55`；`ratio=(20/55)×(40/55)=800/3025=0.264462809917…`；`e=|0.264583333…−0.2644628099…|/0.264583333…×10⁶=455.5215722 ppm`；次优并列 `40/55×20/55`（字典序） | `test/gear.test.ts` 用例 2；`test/ui-p16.test.ts` URL 键用例 |
| 3 | 域校验 | P≤0 / T≤0、齿数去重后 <4、含 ≤0 齿数 → throw（文案含「挂轮」） | `test/gear.test.ts` 用例 5/6/7 |

独立复算：`recompute.mjs`（不 import `src/**`，按 V4.1 §3 算式重实现四重穷举），
输出 `runs/07-recompute.txt`：`VERDICT=PASS (8/8 断言)`；top1 全精度 `455.52157220015545`，
与测试断言 `toBeCloseTo(455.52, 1)` / `toBeCloseTo(455.5215722, 3)` 一致。

## 4. 预置齿轮组检索出口（B）

- 检索日志、URL、逐字摘录与判定：`gear-sets.md`。
- 判定：**B 出口**（V4.1 §3 预授权，B 不算失败）。两个真实单源清单均非 CA6140/C6132/C616，
  且互不一致（Reishauer 清单无 66；`gears` 缺省清单无 63/64/66/90/100），不满足双源逐位一致。
- 落地：UI 无预置 SegChip，仅自定义齿数；无 `src/data/gear-sets.json`；
  `src/data/PROVENANCE.md` 无增量（B 出口无数据即无增量，符合派工单）。

## 5. 写范围审计

- `audit-scope.mjs`：以主仓基线 `c138d76` 的 520 个 tracked 文件为全集（取 baseline blob，
  避免并行收获导致 HEAD 漂移），逐文件与树内比对（换行统一 LF）；另扫描 `src/test/docs`
  下基线外新文件。
- 输出 `runs/08-write-scope.txt`：
  `changed_in_scope=4`（`src/core/gear.ts` / `src/ui/pages/p16.ts` / `src/ui/README.md` /
  `test/gear.test.ts`）、`changed_out_of_scope=0`、`new_files_out_of_scope=0`、`missing_in_tree=0`、
  `VERDICT=PASS`。
- 新文件：`test/ui-p16.test.ts`、`docs/evidence/W11-B/`（均在写范围内）。
- `src/ui/README.md` 只改两处 p16 行：§2.2 页面表 p16 行（`W11-B（已完成）`）、
  §5.2 新增 `p16 挂轮直达` 键行（`p` `t`）；p15 行与其它行未动。
  §5.3 原文无 p16 待冻结条目（仅 p10/p11 无 URL 键说明），故无需改；p16 键按 §5.1 规则登记在 §5.2。

## 6. 证据索引

| 路径 | 内容 |
| --- | --- |
| `runs/01-tsc.txt` | `npx tsc --noEmit` 原始输出 + REAL_EXIT=0 |
| `runs/02-lint.txt` | `npm run lint` 原始输出 + REAL_EXIT=0 |
| `runs/03-vitest.txt` | 全量 vitest 原始输出 + REAL_EXIT=0（47 files / 524 tests） |
| `runs/04-build.txt` | `npm run build` 原始输出 + REAL_EXIT=0（41 precache） |
| `runs/05-gear-test.txt` | `test/gear.test.ts` 聚焦复跑 + REAL_EXIT=0（8 tests） |
| `runs/06-ui-p16-test.txt` | `test/ui-p16.test.ts` 聚焦复跑 + REAL_EXIT=0（7 tests） |
| `runs/07-recompute.txt` | 锚点独立复算脚本输出 + REAL_EXIT=0（8/8 PASS） |
| `runs/08-write-scope.txt` | 写范围审计输出 + REAL_EXIT=0（PASS） |
| `runs/09-summary.txt` | `summarize.mjs` 计算的判定行 + REAL_EXIT=0 |
| `recompute.mjs` | 锚点穷举复算（node 可跑，不 import src） |
| `audit-scope.mjs` | 写范围审计（node 可跑） |
| `summarize.mjs` | 判定行汇总（node 可跑） |
| `gear-sets.md` | 预置齿轮组检索日志 / 双源核对 / B 出口判定 |
