# W8-A 证据档 · 螺纹三族数据扩张（R/NPT/蜗杆）+ Tr 12 行 + PROFILE_CONSTANTS

> 卡：W8-A ｜ 执行者：worker-1 ｜ 隔离树：`T-W8A`（`<TREE>`）｜ 基线 commit：`b9f6b3a`
> 写范围：`src/data/threads-sealpipe.json`、`src/data/threads-npt.json`、`src/data/threads-worm.json`、
> `src/data/threads-trapezoid.json`、`src/data/PROVENANCE.md`、`src/data/COVERAGE.md`、
> `src/core/thread.ts`、`src/ui/pages/p02.ts`、`src/ui/pages/p03.ts`、
> `test/thread.test.ts`、`test/data-trapezoid.test.ts`、`test/data-sealpipe.test.ts`、
> `test/data-npt.test.ts`、`test/data-worm.test.ts`、`test/ui-p02.test.ts`、`test/ui-p03.test.ts`、
> 本证据目录（新建）。
> 本档自含：命令全文 + 原始输出 + `REAL_EXIT`；只看本目录即可独立复跑。
> 公开态清理：档内路径均为仓内相对路径或 `<TREE>` 占位；不记机器绝对路径。

## 索引

| 档 | 命令 / 内容 | 结果 |
| --- | --- | --- |
| `runs/gate1-lint.txt` | `npm run lint` | 0 error / 0 warning，`REAL_EXIT=0` |
| `runs/gate2-tsc.txt` | `npx tsc --noEmit` | 无输出，`REAL_EXIT=0` |
| `runs/gate3-vitest.txt` | `NO_COLOR=1 npx vitest run --maxWorkers=2` | `Test Files 41 passed (41)` / `Tests 421 passed (421)`，`REAL_EXIT=0` |
| `runs/gate4-build.txt` | `NO_COLOR=1 npm run build` | `✓ built in 387ms`，PWA precache 39 entries，`REAL_EXIT=0` |
| `runs/anchor-tests.txt` | `NO_COLOR=1 npx vitest run --maxWorkers=2`（7 个本卡测试文件） | `7 passed` / `75 passed`，`REAL_EXIT=0` |
| `runs/data-crosscheck.txt` | `node docs/evidence/W8-A/tools/data-crosscheck.mjs` | 四表逐行「值 / 来源A / 来源B」+ 行数/换算校验，`DATA_JUDGMENT: PASS`，`REAL_EXIT=0` |
| `runs/summary.txt` | `node docs/evidence/W8-A/tools/summarize.mjs` | 脚本生成的判定行：`JUDGMENT: ALL_GATES_PASS` |
| `runs/summary-run.txt` | 上一行的命令原始输出（含 `REAL_EXIT=0`） | 同上 |
| `runs/isolation-check.txt` | `node docs/evidence/W8-A/tools/isolation-check.mjs "../CNC Machinist Calculator" b9f6b3a .` | 与基线差异 16 文件 = 写范围 16 文件，`ISOLATION_JUDGMENT: PASS`，`REAL_EXIT=0` |
| `tools/summarize.mjs` | 四门禁 REAL_EXIT + vitest 计数汇总（脚本入库，判定行不手填） | 见 `runs/summary.txt` |
| `tools/data-crosscheck.mjs` | 数据表逐行双源拆分与自检（行数 / tpi→P / 蜗杆活算） | 见 `runs/data-crosscheck.txt` |
| `tools/isolation-check.mjs` | 隔离树 vs 基线 b9f6b3a 的 src/test 差异白名单校验 | 见 `runs/isolation-check.txt` |

## 交付物

| 路径 | 行数 | 说明 |
| --- | ---: | --- |
| `src/core/thread.ts` | 146 | 导出 `PROFILE_CONSTANTS`（60°/55°/30°Tr/40°）；`threadDimensions`/`threeWireM` 改引常数集；实现 `wormGeometry`（px=π·m、h₁=2.2·m、40°；m≤0 或非有限数抛错）；锥管族底孔 = 基面小径 |
| `src/ui/pages/p02.ts` | 405 | FAMILY_TABS 扩七签；`.la-seg` 横向滚动；`flankAngleFor` 扩 sealpipe 55 / npt 60 / worm 40；蜗杆行右值 = px（活算）并切换说明文案 |
| `src/ui/pages/p03.ts` | 400 | 七族路由；sealpipe/npt 基面口径 + 「基准平面处直径」标注行；worm 走 `wormGeometry`、无三针卡/无 G76 按钮；公式区改引 `PROFILE_CONSTANTS`（显示文案不变） |
| `src/data/threads-sealpipe.json` | 122 | 新建，15 行 R1/16–R6，`family='sealpipe'`，`major`=基面大径 |
| `src/data/threads-npt.json` | 114 | 新建，14 行 NPT1/16–NPT4（含 3 1/2），`family='npt'` |
| `src/data/threads-worm.json` | 107 | 新建，15 个标准模数 m1–m25，`pitch` 承载 m（见 PROVENANCE 行结构约定） |
| `src/data/threads-trapezoid.json` | 373 | 41 → 53 行（补 12 个最大螺距档），原 41 行零改动 |
| `src/data/PROVENANCE.md` | 1111 | 新增 W8-A 四节（sealpipe / npt / worm / Tr 12 行）逐行双源表；顶部汇总表补三表 |
| `src/data/COVERAGE.md` | 45 | 七族覆盖状态 + 待补表更新（NPT 5/6、蜗杆三针保留）+ 数据性质披露 |
| `test/thread.test.ts` | 405 | 追加 `PROFILE_CONSTANTS` 与 `wormGeometry` 用例（原 8 例零删除） |
| `test/data-trapezoid.test.ts` | 207 | 41→53 断言更新 + 追加最大螺距 12 行用例（原 9 例零删除） |
| `test/data-sealpipe.test.ts` | 129 | 新建 7 例（形态 / tpi 换算 / 全表大径 / 族甄别 / 排序 / R1/16 金值） |
| `test/data-npt.test.ts` | 119 | 新建 6 例（形态 / tpi 换算 / 全表大径 / 族甄别 / 排序 / NPT1/16 金值） |
| `test/data-worm.test.ts` | 79 | 新建 5 例（形态 / 模数系列 / 排序 / m=2 金值 / 逐行活算） |
| `test/ui-p02.test.ts` | 412 | 七签/行数/新族预览与导航/横向滚动样式用例（原 11 例零删除） |
| `test/ui-p03.test.ts` | 318 | 新族展示用例（原 8 例零删除） |

测试计数：基线 387 → **421**（新增 34 例；测试文件 38 → 41，新增 3 个数据测试文件）。

## 四门禁（原始输出见 `runs/`）

| 门禁 | 命令 | 断言 | 实测 |
| --- | --- | --- | --- |
| lint | `npm run lint` | 0 error | 0 error / 0 warning，`REAL_EXIT=0` |
| tsc | `npx tsc --noEmit` | 0 | 无输出，`REAL_EXIT=0` |
| vitest | `npx vitest run --maxWorkers=2` | 全绿、零删既有用例 | 421 passed / 41 files，`REAL_EXIT=0`（基线 387） |
| build | `npm run build` | 成功 | `✓ built in 387ms`，`REAL_EXIT=0` |

## 关键断言（金值与算式，WAVE-PLAN-V3 §4）

1. **R1/16（密封管 55° 基面）**：P = 25.4/28 = 0.907142857…（显示 0.907）；基面大径 7.723；
   d₂ = 7.723 − 0.6403×0.907142857… = 7.142156428… → **7.142**；
   d₁ = 7.723 − 1.2806×0.907142857… = 6.561312857… → **6.561**（= 基面小径，底孔 6.6）。
   断言位置：`test/data-sealpipe.test.ts`「R1/16 金值」、`test/ui-p03.test.ts`「R1/16（密封管 55°）」。
2. **NPT1/16（锥管 60° 基面）**：P = 25.4/27 = 0.940740740…（显示 0.941）；基面大径 7.895；
   d₂ = 7.895 − 0.6495×0.940740740… = 7.283988888… → **7.284**；
   d₁ = 7.895 − 1.0825×0.940740740… = 6.876648148… → **6.877**（底孔 6.9）。
3. **蜗杆 m=2**：px = π×2 = 6.283185307179586 → **6.283**；h₁ = 2.2×2 = **4.4**；flankAngle = **40**。
   断言位置：`test/thread.test.ts`、`test/data-worm.test.ts`、`test/ui-p03.test.ts`。
4. **Tr 大螺距 12 行**：53 行总数；12 行 designation/major/pitch 逐行；
   抽样 Tr30×10 → d₂ = 30 − 0.5×10 = 25.000、d₁ = 30 − 10 − 2×0.5 = 19.000；
   Tr44×12 → d₂ = 38.000、d₁ = 31.000。
5. **七签与行数**：普通 M 149 / 梯形 Tr 53 / 55° 管 13 / 美制 UN 20 / 密封管 R 15 / 锥管 NPT 14 / 蜗杆 15。
6. **p03 公式区单一常数源**：公式文案中的 0.6495/1.0825/0.5413/0.57735/0.6403/1.2806/0.56371/
   3.1657/0.9605/0.5/0.51764/4.8637/1.866 全部由 `PROFILE_CONSTANTS` 插值，显示文案与 W4 冻结逐字符一致
   （既有 `test/ui-p03.test.ts` M30/G1/2 公式断言零改动通过）。

## 数据双源核对（逐行表）

完整逐行输出（脚本生成）见 `runs/data-crosscheck.txt`；来源 URL/标准号与版本披露见
`src/data/PROVENANCE.md` 的 W8-A 四节。以下为同口径摘录（值 / 来源A / 来源B）。

### 1. threads-sealpipe.json（15 行；主源 GB/T 7306.1-2000 表，jlcfa 转载；第二源 BSPT 厂商表 supergaging.com）

| 规格 | tpi | 基面大径 | 来源A（GB/T 7306.1） | 来源B（BSPT 厂商表） | 判定 |
| --- | ---: | ---: | ---: | ---: | --- |
| R1/16 | 28 | 7.723 | 7.723 | 7.723 | 一致 |
| R1/8 | 28 | 9.728 | 9.728 | 9.728 | 一致 |
| R1/4 | 19 | 13.157 | 13.157 | 13.157 | 一致 |
| R3/8 | 19 | 16.662 | 16.662 | 16.662 | 一致 |
| R1/2 | 14 | 20.955 | 20.955 | 20.955 | 一致 |
| R3/4 | 14 | 26.441 | 26.441 | 26.411 | 副源排版笔误（保留 26.441） |
| R1 | 11 | 33.249 | 33.249 | 33.249 | 一致 |
| R1 1/4 | 11 | 41.910 | 41.910 | 41.910 | 一致 |
| R1 1/2 | 11 | 47.803 | 47.803 | 47.803 | 一致 |
| R2 | 11 | 59.614 | 59.614 | 59.614 | 一致 |
| R2 1/2 | 11 | 75.184 | 75.184 | 75.184 | 一致 |
| R3 | 11 | 87.884 | 87.884 | 87.884 | 一致 |
| R4 | 11 | 113.030 | 113.030 | 113.03 | 一致 |
| R5 | 11 | 138.430 | 138.430 | 138.43 | 一致 |
| R6 | 11 | 163.830 | 163.830 | 163.83 | 一致 |

- 旁证：Autodesk Fusion `ISOPipeThreads.xml`（G 系列）同尺寸代号基面大径 15/15 与主源一致
  （R/G 基面基本大径相同，仅作数值旁证，不计入双源）。
- `pitch = 25.4/tpi` 逐行严格相等（脚本 `PITCH_TPI_OK=true`）。

### 2. threads-npt.json（14 行；主源 GB/T 12716-2011 表，164580 转载；第二源 gewinde-normen.de NPT 表）

| 规格 | tpi | 基面大径 | 来源A（GB/T 12716-2011） | 来源B（gewinde-normen.de） | 判定 |
| --- | ---: | ---: | ---: | ---: | --- |
| NPT1/16 | 27 | 7.895 | 7.895 | 7.895 | 一致 |
| NPT1/8 | 27 | 10.242 | 10.242 | 10.242 | 一致 |
| NPT1/4 | 18 | 13.616 | 13.616 | 13.616 | 一致 |
| NPT3/8 | 18 | 17.055 | 17.055 | 17.055 | 一致 |
| NPT1/2 | 14 | 21.223 | 21.223 | 21.223 | 一致 |
| NPT3/4 | 14 | 26.568 | 26.568 | 26.568 | 一致 |
| NPT1 | 11.5 | 33.228 | 33.228 | 33.228 | 一致 |
| NPT1 1/4 | 11.5 | 41.985 | 41.985 | 41.985 | 一致 |
| NPT1 1/2 | 11.5 | 48.054 | 48.054 | 48.054 | 一致 |
| NPT2 | 11.5 | 60.092 | 60.092 | 60.092 | 一致 |
| NPT2 1/2 | 8 | 72.699 | 72.699 | 72.699 | 一致 |
| NPT3 | 8 | 88.608 | 88.608 | 88.608 | 一致 |
| NPT3 1/2 | 8 | 101.316 | 101.316 | 101.316 | 一致 |
| NPT4 | 8 | 113.973 | 113.973 | 113.973 | 一致 |

- **5/6 未入库**：P1 = 140.952 / 167.792（基面大径口径），第二源 = 141.300 / 168.275
  （= 5.563 in / 6.625 in 管外径口径）→ 双源冲突，按「宁缺毋滥」不入表（详见 PROVENANCE §4）。

### 3. threads-worm.json（15 行；主源 GB/T 10088-2018 模数系列经 GB/T 10085-1988 表，jlcfa；第二源 mechtool GB 10085-1988 匹配表）

| 模数 m | 来源A（jlcfa GB/T 10085 表） | 来源B（mechtool 匹配表） | 判定 |
| ---: | ---: | ---: | --- |
| 1 | ✓ | ✓ | 一致 |
| 1.25 | ✓ | ✓ | 一致 |
| 1.6 | ✓ | ✓ | 一致 |
| 2 | ✓ | ✓ | 一致 |
| 2.5 | ✓ | ✓ | 一致 |
| 3.15 | ✓ | ✓ | 一致 |
| 4 | ✓ | ✓ | 一致 |
| 5 | ✓ | ✓ | 一致 |
| 6.3 | ✓ | ✓ | 一致 |
| 8 | ✓ | ✓ | 一致 |
| 10 | ✓ | ✓ | 一致 |
| 12.5 | ✓ | ✓ | 一致 |
| 16 | ✓ | ✓ | 一致 |
| 20 | ✓ | ✓ | 一致 |
| 25 | ✓ | ✓ | 一致 |

- 与派工单期望 R40 化系列逐值一致；px=π·m、h₁=2.2·m 由 `wormGeometry` 活算（`WORM_GEOMETRY_OK=true`）。
- 标准号降级披露：GB/T 10088-2018 仅 openstd 元数据可核（现行），可读两表均以 GB/T 10085-1988 为表头；
  未臆造 10088 原文（详见 PROVENANCE）。

### 4. threads-trapezoid.json 新增 12 行（主源 GB/T 5796.2/5796.3-2005 表；第二源 Autodesk Fusion ISO Metric Trapezoidal 表）

| 规格 | d | P | 来源A（GB/T 5796） | 来源B（Fusion ISO 表） | 判定 |
| --- | ---: | ---: | --- | --- | --- |
| Tr22×8 | 22 | 8 | ✓ | TR22x8 | 一致 |
| Tr24×8 | 24 | 8 | ✓ | TR24x8 | 一致 |
| Tr26×8 | 26 | 8 | ✓ | TR26x8 | 一致 |
| Tr28×8 | 28 | 8 | ✓ | TR28x8 | 一致 |
| Tr30×10 | 30 | 10 | ✓ | TR30x10 | 一致 |
| Tr32×10 | 32 | 10 | ✓ | TR32x10 | 一致 |
| Tr34×10 | 34 | 10 | ✓ | TR34x10 | 一致 |
| Tr36×10 | 36 | 10 | ✓ | TR36x10 | 一致 |
| Tr38×10 | 38 | 10 | ✓ | TR38x10 | 一致 |
| Tr40×10 | 40 | 10 | ✓ | TR40x10 | 一致 |
| Tr42×10 | 42 | 10 | ✓ | TR42x10 | 一致 |
| Tr44×12 | 44 | 12 | ✓ | TR44x12 | 一致 |

- 基线 41 行（GB/DIN 103 交集）零改动；分档副源在行 `source` 字段区分（DIN 103 vs Autodesk Fusion）。
- 版本披露：GB/T 5796.2-2022 为现行版；可读文本为 2005 版表 + Fusion（ISO 2902 系列实现），组合互证一致。

## 实现口径摘要

- `PROFILE_CONSTANTS`：`deg60` / `deg55` / `deg30Tr` / `deg40Worm` 四组；`threadDimensions`、`threeWireM`、
  p03 公式文案全部改引同一常数源（G2 消双写）。显示文案逐字符不变（既有 p03 公式断言零改动通过）。
- 锥管族（sealpipe/npt）：`threadDimensions` 按 `spec.family` 将 `tapDrill` 置为基面小径 d₁（V3-1），
  p03 展示加 `基准平面处直径（GB/T 7306 / GB/T 12716，1:16 锥）` 标注行。
- 蜗杆：`wormGeometry(m)` 校验 `Number.isFinite(m) && m > 0`，返回 `{ axialPitch: π·m, wholeDepth: 2.2·m, flankAngle: 40 }`；
  p03 不调用 `threadDimensions`/`threeWireM`，只渲染一张「蜗杆几何」卡，不显示三针行。
- p02：七签 + `.la-seg { overflow-x: auto }`（390px 可横向滚动）；蜗杆行右值显示 px（π·m），
  说明文案随族切换为「右侧为轴向齿距 px / mm」。

## 偏离与上报（供主会话裁决）

1. **NPT 5/6 未入库（双源冲突）**：见上 §2 与 PROVENANCE §4。选项：A. 维持 1/16–4（本卡做法）；
   B. 以 GB/T 12716 转载表单源补 140.952/167.792（会违反双源规则，需 Lead 批注降级）。
2. **蜗杆标准号降级**：GB/T 10088-2018 全文不可在线取回；可读双源表均以 GB/T 10085-1988 为表头。
   本卡按双源值录入并在 `source` 同时标 10088/10085，PROVENANCE 披露；如 Lead 要求严格 10088 原文，需采购标准。
3. **`test/data-trapezoid.test.ts` 改动不在预授权清单**：该文件断言 41 行与 DIN 103 来源；补 12 行必然翻红。
   已按最小改法更新计数与来源断言并追加用例（零删除 `it`）；请 Lead 确认或改派。
4. **p03 蜗杆态隐藏「生成 G76 程序」按钮**：p04 未支持 worm/sealpipe/npt 族（本卡禁改 p04）；
   蜗杆 G76 语义不成立，故隐藏。sealpipe/npt 仍保留按钮并原样带族键，p04 会走「请先选型」降级路径
   （p04 不在本卡写范围，登记为后续卡）。
5. **R3/4 第二源 26.411**：按副源排版笔误处理（主源/旁证均 26.441），未改主源值。
6. **Tr 版本**：GB/T 5796.2-2022 为现行，表按 2005 版（与基线 41 行同口径）录入并披露。

## 判定行（由 `tools/summarize.mjs` 计算生成，见 `runs/summary.txt`）

```text
lint    REAL_EXIT=0  PASS
tsc     REAL_EXIT=0  PASS
vitest  REAL_EXIT=0  PASS  tests=421 files=41
build   REAL_EXIT=0  PASS

JUDGMENT: ALL_GATES_PASS
```

数据核对（由 `tools/data-crosscheck.mjs` 计算生成，见 `runs/data-crosscheck.txt`）：

```text
ROWS_OK=true
FAMILIES_OK=true
SOURCE_SPLIT_OK=true
PITCH_TPI_OK=true
WORM_GEOMETRY_OK=true
DATA_JUDGMENT: PASS
```
