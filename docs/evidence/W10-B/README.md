# W10-B 证据档 · NPT 5/6 第三源检索（B 方案结案）

> 卡：W10-B ｜ 执行者：worker-1 ｜ 隔离树：T-W10B（`<TREE>`）｜ 基线 commit：`bd1d74d`
> 结论：**B 方案**（零代码改动，维持 14 行 NPT1/16–NPT4；NPT5/NPT6 不入库）
> 判定：冻结规则「第三源**基面大径**直列与两候选之一逐位一致」未满足——未找到同时具备
> 「基面大径直列」与「可确认独立权威性」的第三源。
> 预注册预期：A 方案概率 <50%；实际 B，与预期一致；B 为合法出口，不算失败。
> 本档自含：来源 URL + 逐字摘录 + 两候选对照表 + 检索过程 + 四门禁原始输出 + 零 diff 验证。
> 公开态：本档无机器绝对路径；命令中的树根以 `<TREE>` 占位。

## 索引

| 档 | 内容 | 结果 |
| --- | --- | --- |
| `runs/source-p1-extract.txt` | P1（164580，GB/T 12716-2011 转载）第二表逐字摘录 | 5=140.952 / 6=167.792（大径 d=D） |
| `runs/source-s1-extract.txt` | S1（gewinde-normen.de）NPT 表逐字摘录 | 5=141.300 / 6=168.275（Major Diameter；5/6 行为管外径口径） |
| `runs/source-amesweb-extract.txt` | 第三源 AmesWeb（ASME B1.20.1 表）逐字摘录 | 有基面中径 E1，无基面大径直列；E1 5=5.44929 in / 6=6.50597 in |
| `runs/source-mechtool-extract.txt` | 第三源 mechtool.cn 逐字摘录 | 5=140.952 / 6=167.792（大径 d=D；中文参考站同系转录） |
| `runs/search-log.txt` | 检索词 + 命中/未命中 + 不可达站点清单 | H1–H4 命中；U1–U6 不可用；N1–N11 未命中/不可达 |
| `runs/summary.txt` | `tools/verify-w10b.mjs` 输出（数值核对 + 门禁汇总 + 判定行） | `VERDICT=B_PLAN`，`REAL_EXIT=0` |
| `tools/verify-w10b.mjs` | 数值核对与门禁汇总脚本（脚本入库，判定行不手填） | 见 `runs/summary.txt` |
| `tools/verify_baseline.py` | 隔离树 vs 基线全量核验脚本（filter-aware `git hash-object`） | 见 `runs/isolation-check.txt` |
| `runs/gate0-lint.txt` | `npm run lint` | 0 error，`REAL_EXIT=0` |
| `runs/gate1-tsc.txt` | `npx tsc --noEmit` | 无输出，`REAL_EXIT=0` |
| `runs/gate2-vitest.txt` | `NO_COLOR=1 npx vitest run --maxWorkers=2` | 44 files / 477 tests passed，`REAL_EXIT=0` |
| `runs/gate3-build.txt` | `NO_COLOR=1 npm run build` | `✓ built in 396ms`，PWA precache 39 entries，`REAL_EXIT=0` |
| `runs/isolation-check.txt` | 隔离树 vs 基线 `bd1d74d`（src/test/docs 全量） | 450/450 一致，`JUDGMENT=PASS` |
| `runs/isolation-check-all.txt` | 隔离树 vs 基线 `bd1d74d`（全量 tracked blob） | 461/461 一致，`JUDGMENT=PASS` |
| `tools/verify_all_tracked.py` | 全量 tracked blob 核验脚本 | 见 `runs/isolation-check-all.txt` |
| `runs/hashes.txt` | 两个写范围文件 sha256 + git blob 对照 | 与基线逐字节一致 |

## 1. 判定结论

**B 方案，零代码改动。** `src/data/threads-npt.json` 保持 14 行，`test/data-npt.test.ts`
保持原样（14 行计数断言）；NPT5/NPT6 仍不入库。

判定依据（派工单冻结规则）：
- **A 方案条件** = 第三源公开可引（ASME B1.20.1 原文 / 权威工程手册 / 厂商技术表），且其
  **基面大径直列**与两候选之一**逐位一致**。
- 本次唯一独立于 GB/T 12716 系谱、且可公开引用的第三源是 **AmesWeb 的 ASME B1.20.1 表**；
  该表**没有「基面大径」直列**，只有基面中径 E1。按 NPT 基本牙型 `D = E1 + 0.8P` 派生，
  5=140.952 mm、6=167.792 mm，与 P1 逐位一致；但这是**派生值**，不是第三源发布的
  基面大径直列，未满足 A 条件的字面要求。
- **mechtool.cn** 有「大径 d=D」直列且与 P1 逐位一致，但它是中文机械参考站的同系转录
  （未注明标准版本；L1 与 P1/ASME 有 0.01 mm 级差异），权威性不可确认，属派工单
  **上报条件 ②**（镜像/转载站无法确认权威性），不能单独作为合格第三源。
- doc88 / max.book118 / 百度文库 / 360 文库的 ASME B1.20.1 中文译本均为镜像/转载站
  （上报条件 ②），且需登录/付费，未作为判定依据。
- 未发现任何第三源把 **141.300 / 168.275** 作为「基面大径」发布；该两值只在
  **管外径口径**出现（5.563×25.4=141.3002；6.625×25.4=168.275）。

> 判定行由脚本生成：`runs/summary.txt` 的 `VERDICT=B_PLAN`（`tools/verify-w10b.mjs`）。

## 2. 两候选（W8-A-01 在案）

| 规格 | P1：GB/T 12716-2011 转载「大径 d=D」 | S1：gewinde-normen.de「Major Diameter」 | S1 口径核对 |
| --- | ---: | ---: | --- |
| NPT5 | **140.952 mm** | 141.300 mm | 5.563 in × 25.4 = 141.3002 mm（管外径口径） |
| NPT6 | **167.792 mm** | 168.275 mm | 6.625 in × 25.4 = 168.275 mm（管外径口径） |

两源在 **TPI / 螺距**上一致：NPT5、NPT6 均为 **8 TPI**，P = 25.4/8 = **3.175 mm**。
（派工单正文括注的「NPT5=5TPI、NPT6=6TPI?」与两源实表不符；派工单同时要求
「以源表为准」，本卡按源表 **8 TPI / 3.175 mm** 记录。见第 10 节偏离。）

## 3. 第三源检索结果

### 3.1 AmesWeb（ASME B1.20.1）— 数值可核，但无基面大径直列

- URL：<https://amesweb.info/Screws/NPT-Thread-Chart.aspx>（2026-11-05）
- 页面自述（逐字）：「ANSI/ASME B1.20.1 taper pipe thread dimensions by nominal size」
- 表头（逐字）：
  `Nom. Pipe Size | Outer Dia. of Pipe | TPI | Pitch, P | Pitch Dia. at Beginning of External Thread, E0 | Hand-Tight Engagement | Effective Thread, External | Overall Length, External Thread, L4 | Basic Minor Dia. at Small End of Pipe`
- 5/6 行（逐字）：
  ```
  5 | 5.5630 | 8 | 0.12500 | 5.39073 | 0.9370 | 7.50 | 5.44929 | 1.4063 | 11.25 | 5.47862 | 1.8400 | 5.2907
  6 | 6.6250 | 8 | 0.12500 | 6.44609 | 0.9580 | 7.66 | 6.50597 | 1.5125 | 12.10 | 6.54062 | 1.9462 | 6.3461
  ```
- 列映射：第 8 个数据格 = **Pitch Dia. at Gaging Plane, E1**（基面中径，in）。
- 派生（NPT 基本牙型 60° 关系；mechtool 页注明确给出「D2＝d2＝D-0.8P
  D1＝d1＝D-1.6P」，P1 表值逐行满足该关系）：
  - NPT5：`D = E1 + 0.8P = 5.44929 + 0.8×0.125 = 5.54929 in × 25.4 = 140.951966 → 140.952 mm`
  - NPT6：`D = E1 + 0.8P = 6.50597 + 0.8×0.125 = 6.60597 in × 25.4 = 167.791638 → 167.792 mm`
- 交叉校验：
  - `E1 × 25.4` = 138.412 / 165.252 mm，与 P1 的「中径 d2=D2」逐位一致；
  - 源内自洽：`E0 − 小端基本小径 = 0.8P`（5：5.39073 − 5.2907 = 0.10003；
    6：6.44609 − 6.3461 = 0.09999；0.8P = 0.10000 in）。
- **结论**：AmesWeb 的 ASME 数据与 P1 的 5/6 行完全同系（中径 E1、小端小径全部对齐），
  派生基面大径与 P1 逐位一致；但该表**没有**「基面大径」直列，按冻结规则不能直接作为
  A 方案依据。

### 3.2 mechtool.cn — 有基面大径直列，但属同系转录（上报条件 ②）

- URL：<https://www.mechtool.cn/thread/thread_americanpipethreadgeneralsealingpipethread.html>（2026-11-05）
- 5/6 行（逐字）：
  ```
  5 | 8 | 3.175 | 2.540 | 140.952 | 138.412 | 135.872 | 7.50 | 23.812 | 2 | 6.350 | 134.384
  6 | 8 | 3.175 | 2.540 | 167.792 | 165.252 | 162.712 | 7.66 | 24.320 | 2 | 6.350 | 161.191
  ```
- 「大径 d=D」= 140.952 / 167.792，与 P1 逐位一致；但：
  - 未注明标准版本，内容与 GB/T 12716 系谱一致（与 P1 同源）；
  - L1 与 P1/ASME 有 0.01 mm 级差异（5：23.812 vs 23.800；6：24.320 vs 24.333），
    说明是二次转录而非独立标准表。
- **结论**：按派工单上报条件 ② 登记，不作合格独立第三源。

### 3.3 镜像 / 转载站（上报条件 ②）

- doc88.com、max.book118.com、百度文库、360 文库：检索到多份 ASME B1.20.1-1983/2006/2013
  中文版/英文版转载页；均需登录/付费，且属镜像/转载站，权威性不可确认，未作为判定依据。
- 规范库（guifanku.com）站内搜索无可直接下载的 ASME B1.20.1 原文。

### 3.4 未命中 / 不可达（完整清单见 `runs/search-log.txt`）

- 未命中：DuckDuckGo、Bing（含 ensearch）、Sogou、Mojeek、Marginalia、Yandex（captcha）、
  Brave（超时）、百度（captcha）。
- 不可达/无表：engineersedge（403）、machiningdoctor（无尺寸表）、efunda（404）、
  engineeringtoolbox（404）、Wikipedia（超时）、archive.org / web.archive.org（超时）、
  law.resource.org（IBR 目录无 B1.20.1）。

## 4. 对照表（两候选 vs 第三源）

| 规格 | P1 基面大径 | S1 Major Diameter | AmesWeb E1（in） | E1×25.4（mm） | 派生 E1+0.8P（mm） | mechtool 大径 | 判定 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| NPT5 | 140.952 | 141.300 | 5.44929 | 138.412 | **140.952**（= P1） | 140.952（= P1） | P1 数值被第三源旁证；无直列 → B |
| NPT6 | 167.792 | 168.275 | 6.50597 | 165.252 | **167.792**（= P1） | 167.792（= P1） | 同上 |

> 说明：AmesWeb 的 E1 与 P1 中径逐位一致；派生大径与 P1 逐位一致；S1 的 5/6 值等于
> 管外径口径，不是基面大径。数值层面 P1 已被 ASME 数据旁证；程序层面因第三源缺
> 「基面大径」直列，按冻结规则走 B。

## 5. 脚本生成的数值核对

`runs/summary.txt`（`node docs/evidence/W10-B/tools/verify-w10b.mjs`，`REAL_EXIT=0`）关键行：

```
SPEC=5 T3A_E1_in=5.44929 T3A_E1_mm=138.412 P1_d2=138.412 D2_MATCH=true
SPEC=5 DERIVED_MAJOR=D=E1+0.8P=140.952mm P1=140.952 S1=141.3 MATCH_P1=true MATCH_S1=false
SPEC=5 SRC_INTERNAL_E0_MINUS_SMALL_MINOR=0.1 EXPECTED_0.8P=0.1
SPEC=6 T3A_E1_in=6.50597 T3A_E1_mm=165.252 P1_d2=165.252 D2_MATCH=true
SPEC=6 DERIVED_MAJOR=D=E1+0.8P=167.792mm P1=167.792 S1=168.275 MATCH_P1=true MATCH_S1=false
SPEC=6 SRC_INTERNAL_E0_MINUS_SMALL_MINOR=0.1 EXPECTED_0.8P=0.1
THIRD_SOURCE_HAS_DIRECT_MAJOR_COLUMN=false
THIRD_SOURCE_INDEPENDENT_AUTHORITY=false
GATES lint=0 tsc=0 vitest=0 build=0
VITEST test_files=44 tests=477
ISOLATION=PASS
VERDICT=B_PLAN
```

## 6. 四门禁（原始输出见 `runs/`）

| 门禁 | 命令 | 期望退出码 | 实测 | 档 |
| --- | --- | ---: | --- | --- |
| lint | `npm run lint` | 0 | 0 error / 0 warning，`REAL_EXIT=0` | `runs/gate0-lint.txt` |
| 静态检查 | `npx tsc --noEmit` | 0 | 无输出，`REAL_EXIT=0` | `runs/gate1-tsc.txt` |
| 测试 | `NO_COLOR=1 npx vitest run --maxWorkers=2` | 0 | `Test Files 44 passed (44)` / `Tests 477 passed (477)`，`REAL_EXIT=0` | `runs/gate2-vitest.txt` |
| 构建 | `NO_COLOR=1 npm run build` | 0 | `✓ built in 396ms`，PWA precache 39 entries，`REAL_EXIT=0` | `runs/gate3-build.txt` |

测试计数与基线一致（477），无新增/删除用例——B 方案预期行为。

## 7. 零代码 / 隔离验证

- 两写范围文件与基线 `bd1d74d` **逐字节一致**：
  - `src/data/threads-npt.json`：baseline blob `81620882e6010ee65ea1ba7b3a68e161359a06d0`
    = tree hash-object 同值；sha256 `ba512d37f048125712d452ae2bf2fa6f4aa32df3f5794ae07ea71e5a97451098`
  - `test/data-npt.test.ts`：baseline blob `a9a8733aa70e9cb0d93f78e86929b69723148762`
    = tree hash-object 同值；sha256 `756377b4e6dc3cbf146a44327bf6bebcd92478a99ce605c4af17b4a365330962`
- `runs/isolation-check.txt`（`tools/verify_baseline.py`，filter-aware `git hash-object`）：
  `src/test/docs` 基线跟踪文件 **450/450 MATCH**，`MISMATCH=0`，`MISSING=0`，
  `EXTRA_OUTSIDE_W10B=0`，`JUDGMENT=PASS`。
- `runs/isolation-check-all.txt`（`tools/verify_all_tracked.py`）：全量 tracked blob
  **461/461 MATCH**，`MISMATCH=0`，`MISSING=0`，`JUDGMENT=PASS`（含根级配置/锁定文件）。
- 树内新增仅 `docs/evidence/W10-B/**`（本档 + 脚本 + runs）。
- 构建门禁曾生成 `dist/`（vite 产物，基线 `.gitignore` 已忽略）；核验后已删除，
  以保持树内仅基线文件 + 本证据档。写范围文件零改动（见上）。

## 8. 复跑方式

在树根 `<TREE>` 下依次执行（路径含空格须引号）：

```bash
cd "<TREE>"
npx tsc --noEmit
NO_COLOR=1 npx vitest run --maxWorkers=2
NO_COLOR=1 npm run build
npm run lint
node docs/evidence/W10-B/tools/verify-w10b.mjs
```

隔离核验（只读）：

```bash
python -I docs/evidence/W10-B/tools/verify_baseline.py "<TREE>" "<MAIN_REPO>" bd1d74d
python -I docs/evidence/W10-B/tools/verify_all_tracked.py "<TREE>" "<MAIN_REPO>" bd1d74d
```

> `<MAIN_REPO>` = 主仓绝对路径（仅复跑时由执行者填入；本档不记录具体机器路径）；
> `runs/isolation-check*.txt` 输出均为仓内相对路径。

## 9. 上报项（待 Lead 裁决 / 登记，本树未执行）

### 9.1 决策点：AmesWeb 派生值是否可升级为 A 方案

- **选项 A（补录 2 行）**：接受「AmesWeb 基面中径 E1 + NPT 基本牙型 D=E1+0.8P」作为
  基面大径的等价证据，把 NPT5/NPT6 补入 `threads-npt.json`（major 140.952/167.792，
  pitch 3.175，tpi 8），`threads-npt.json` 14→16 行，`test/data-npt.test.ts` 计数与
  全表大径断言同步扩 2 行；source 标注双源（P1 + AmesWeb/ASME B1.20.1）。
  代价：需 Lead 认定派生等价满足冻结规则；否则会被 G2 以「无基面大径直列」驳回。
- **选项 B（本次执行）**：维持 14 行，`DEFERRED #19` 按「检索完成、维持 14 行」结案；
  检索材料留档 `docs/evidence/W10-B/`。代价：NPT5/6 仍不可选；未来若找到直列表可再开卡。
- 本卡按冻结规则的**字面要求**选择 B，不替 Lead 拍板；若 Lead 认定 AmesWeb 的 ASME 表
  属于「ASME B1.20.1 原文/权威手册」且派生等价可接受，可裁决升级 A。

### 9.2 mechtool.cn 源权威性判定（上报条件 ②）

- mechtool.cn 的「大径 d=D」直列与 P1 逐位一致，但为同系转录（未注明版本，L1 有
  0.01 mm 级差异）。请 Lead 判定是否可作「权威工程手册/公开可引第三源」；本卡按 ②
  登记，未据此补录。

### 9.3 PROVENANCE 增量文本（供 Lead 收获时串行合并，树内未改）

建议追加到 `src/data/PROVENANCE.md` 的 W8-A NPT 节（或新开 W10-B 小节）：

```md
### W10-B · NPT 5/6 第三源检索（2026-11-05，B 方案结案）

- 结论：维持 14 行（NPT1/16–NPT4），NPT5/NPT6 不入库；DEFERRED #19 按检索完成结案。
- 两候选：P1（GB/T 12716-2011 转载）5=140.952 / 6=167.792；S1（gewinde-normen.de）
  5=141.300 / 6=168.275（S1 该列 5/6 行为管外径口径 5.563×25.4 / 6.625×25.4）。
- 第三源：AmesWeb「NPT Thread Dimensions Chart – ASME B1.20.1」
  （https://amesweb.info/Screws/NPT-Thread-Chart.aspx，2026-11-05）给出基面中径 E1：
  5=5.44929 in / 6=6.50597 in；按 NPT 基本牙型 D=E1+0.8P 派生得 5=140.952 mm /
  6=167.792 mm，与 P1 逐位一致；该表无基面大径直列，故未按 A 方案补录。
- 同系转录登记：mechtool.cn（大径 d=D 5=140.952 / 6=167.792）与 P1 一致，但未注明
  标准版本且 L1 有 0.01 mm 级差异，未作独立第三源；doc88/book118/百度文库 ASME 中文
  译本属镜像/转载站（上报条件 ②）。
- 检索材料：`docs/evidence/W10-B/`（README + runs/source-*-extract.txt + search-log.txt）。
```

## 10. 偏离

1. **派工单括注 TPI 与源表不符**：派工单背景句「NPT5=5TPI P=25.4/5、NPT6=6TPI?」与
   两源实表不符；P1、S1、AmesWeb、mechtool 均为 **8 TPI / P=3.175 mm**。按派工单
   「以源表为准」，本卡记录 8 TPI，未按括注处理。B 方案下不影响数据表。
2. **构建产物 `dist/`**：四门禁的 `npm run build` 在树内生成 `dist/`（基线 `.gitignore`
   已忽略）；核验后已删除，保持树内仅基线文件 + 本证据档。写范围文件零改动（见第 7 节）。
3. **检索环境限制**：Wikipedia / archive.org / web.archive.org 连接超时，
   engineersedge 403，Baidu/Yandex captcha，DuckDuckGo 空结果；已按「同一异常最多
   尝试 2 次」停止追查，完整记录见 `runs/search-log.txt`。
