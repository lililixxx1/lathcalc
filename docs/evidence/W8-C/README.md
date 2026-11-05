# W8-C 证据档 · 基本偏差表 + H7/g6·k6·p6 常用配合实算 + p08 chips 激活

> 卡：W8-C（WAVE-PLAN-V3 G5，DEFERRED #12）｜ 执行者：worker-2 ｜ 隔离树：`T-W8C` ｜ 基线 commit：`b9f6b3a`
> 写范围：`src/data/fundamental-deviations.json`（新建）、`src/core/tolerance.ts`、`src/ui/pages/p08.ts`、
> `src/data/PROVENANCE.md`、`test/`（新建 2 文件 + 扩展 `ui-p08.test.ts`）、`docs/evidence/W8-C/`。
> 本档自含：命令全文 + 原始输出 + `REAL_EXIT` 同档；只看本目录即可独立复跑。
> 公开态清理：`runs/gate2-vitest.txt` 的 RUN banner 树路径前缀替换为 `<TREE>`（按附录 G 只改前缀，其余原样）。

## 索引

| 档 | 命令 / 内容 | 结果 |
| --- | --- | --- |
| `runs/gate0-lint.txt` | `npm run lint` | `REAL_EXIT=0`（0 error / 0 warning） |
| `runs/gate1-tsc.txt` | `npx tsc --noEmit` | `REAL_EXIT=0`（无输出） |
| `runs/gate2-vitest.txt` | `FORCE_COLOR=0 CI=1 npx vitest run --maxWorkers=2` | `40 passed (40)` / `407 passed (407)`，`REAL_EXIT=0` |
| `runs/gate3-build.txt` | `npm run build` | `✓ built in 424ms`，64 modules，PWA precache 39 entries，`REAL_EXIT=0` |
| `runs/dual-source-verify.txt` | `node docs/evidence/W8-C/tools/verify-fundamental-deviations.mjs` | `A vs B vs data: 63 cells, 0 diffs`；`corroboration C–G: 212 cells, 0 diffs`；`RESULT: PASS`，`REAL_EXIT=0` |
| `tools/verify-fundamental-deviations.mjs` | 自含双源核对脚本（A/B 21×3 + 旁证 C–G） | 见 `runs/dual-source-verify.txt` |

## 交付物

| 路径 | 说明 |
| --- | --- |
| `src/data/fundamental-deviations.json` | 21 段 × g/k/p 基本偏差（μm）；`{ source, bands }` 按 WAVE-PLAN-V3 §1 data 契约 |
| `src/core/tolerance.ts` | 新增 `fitTolerance`（契约签名未改）；复用 `lookup.itToleranceMM` + `toleranceCompose` |
| `src/ui/pages/p08.ts` | 三 chips 静态→可点激活；配合卡（孔/轴极限偏差 + Xmin–Xmax + 类别徽标）；「怎么算的」补两行配合算式 |
| `test/data-fundamental-deviations.test.ts` | 6 例：21 段规模 / 63 值逐位 / 端别符号 / 与 IT 表分段一致 / 金测段 / 4 锚点 |
| `test/fit-tolerance.test.ts` | 9 例：Ø30 三配合逐字段 / Ø10 / Ø100 / 分段边界 / 首段 / 越界抛错 / 整数性 |
| `test/ui-p08.test.ts` | 既有 7 例零删；新增 5 例（chips 激活 / Ø30 三金值 / 尺寸重算 / 配合算式 / 超范围清除） |
| `src/data/PROVENANCE.md` | 新增 `fundamental-deviations.json` 溯源片段：双源清单 + 21×3 对拍表 + 旁证 275 格 + 排除源登记 |

新增测试 **20 例**（6 + 9 + 5）；全量套件 **40 files / 407 tests**（基线 387 + 20），**零删既有用例**。

## 双源核对（21 段 × g/k/p）

- **来源 A**：GB/T 1800.3-1998《轴的基本偏差数值》公开转写（mechtool.cn），表 1 `g`（es）、表 1 `k`（IT4–IT7 列，ei）、表 2 `p`（ei）。
- **来源 B**：ISO 286-1:2010 表值实现 `thefhiter/tolerance-handbook` · `js/engine/iso286.js`（`ES.g` / `EI.k` / `EI.p`，21 主段）。
- **端别纪律**：g 列 = es（负值，上偏差）；k/p 列 = ei（下偏差）。k 列 >500 mm 段为 0；p 列 >500 段继续增大。

| 段 (lo,hi] | g(A) | g(B) | k(A) | k(B) | p(A) | p(B) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| (0,3] | −2 | −2 | 0 | 0 | +6 | +6 |
| (3,6] | −4 | −4 | +1 | +1 | +12 | +12 |
| (6,10] | −5 | −5 | +1 | +1 | +15 | +15 |
| (10,18] | −6 | −6 | +1 | +1 | +18 | +18 |
| (18,30] | −7 | −7 | +2 | +2 | +22 | +22 |
| (30,50] | −9 | −9 | +2 | +2 | +26 | +26 |
| (50,80] | −10 | −10 | +2 | +2 | +32 | +32 |
| (80,120] | −12 | −12 | +3 | +3 | +37 | +37 |
| (120,180] | −14 | −14 | +3 | +3 | +43 | +43 |
| (180,250] | −15 | −15 | +4 | +4 | +50 | +50 |
| (250,315] | −17 | −17 | +4 | +4 | +56 | +56 |
| (315,400] | −18 | −18 | +4 | +4 | +62 | +62 |
| (400,500] | −20 | −20 | +5 | +5 | +68 | +68 |
| (500,630] | −22 | −22 | 0 | 0 | +78 | +78 |
| (630,800] | −24 | −24 | 0 | 0 | +88 | +88 |
| (800,1000] | −26 | −26 | 0 | 0 | +100 | +100 |
| (1000,1250] | −28 | −28 | 0 | 0 | +120 | +120 |
| (1250,1600] | −30 | −30 | 0 | 0 | +140 | +140 |
| (1600,2000] | −32 | −32 | 0 | 0 | +170 | +170 |
| (2000,2500] | −34 | −34 | 0 | 0 | +195 | +195 |
| (2500,3150] | −38 | −38 | 0 | 0 | +240 | +240 |

**结论：63/63 单元格一致，0 差异。** 旁证 C–G 合计 212 格 0 差异（C/D ≤500 全列 78；E Shigley ≤400 为 69；F BI7KHI 10–80 为 24；G saucecode g 全段 41）。原始输出见 `runs/dual-source-verify.txt`；完整对拍与来源 URL 见 `src/data/PROVENANCE.md` 的 `fundamental-deviations.json` 片段。

### 排除源登记

`superWorldSavior/mcp-tolerance` 的 `tests/fixtures/iso286_table_values.json` 把 k 列记为 `[+2, 0, 0, …]`，与 A/B/C/D/E/F 六源均矛盾（标准为 `[0, +1, +1, +1, +2, …]`）；判为转抄错误，**未采用**。其 g/p 列与 A 一致。

## 金值复核（core ↔ 页面）

### `fitTolerance` 金值（`test/fit-tolerance.test.ts`，逐字段 `toBe`）

| 配合 | Ø | 表值段 | 孔 H7 | 轴 | Xmin | Xmax | fitType |
| --- | ---: | --- | --- | --- | ---: | ---: | --- |
| H7/g6 | 30 | (18,30]：g=−7、IT6=13、IT7=21 | EI=0、ES=+21 | es=−7、ei=−20 | +7 | +41 | clearance |
| H7/k6 | 30 | (18,30]：k=+2、IT6=13、IT7=21 | EI=0、ES=+21 | es=+15、ei=+2 | −15 | +19 | transition |
| H7/p6 | 30 | (18,30]：p=+22、IT6=13、IT7=21 | EI=0、ES=+21 | es=+35、ei=+22 | −35 | −1 | interference |
| H7/g6 | 10 | (6,10]：g=−5、IT6=9、IT7=15 | EI=0、ES=+15 | es=−5、ei=−14 | +5 | +29 | clearance |
| H7/k6 | 10 | (6,10]：k=+1、IT6=9、IT7=15 | EI=0、ES=+15 | es=+10、ei=+1 | −10 | +14 | transition |
| H7/p6 | 10 | (6,10]：p=+15、IT6=9、IT7=15 | EI=0、ES=+15 | es=+24、ei=+15 | −24 | 0 | interference（边界 ≤0） |
| H7/g6 | 100 | (80,120]：g=−12、IT6=22、IT7=35 | EI=0、ES=+35 | es=−12、ei=−34 | +12 | +69 | clearance |
| H7/k6 | 100 | (80,120]：k=+3、IT6=22、IT7=35 | EI=0、ES=+35 | es=+25、ei=+3 | −25 | +32 | transition |
| H7/p6 | 100 | (80,120]：p=+37、IT6=22、IT7=35 | EI=0、ES=+35 | es=+59、ei=+37 | −59 | −2 | interference |

- 算式：g6 `ei=es−IT6`；k6/p6 `es=ei+IT6`；`Xmin=EI−es`、`Xmax=ES−ei`。
- 分段边界：Ø18→(10,18]（g=−6、Xmin=+6、Xmax=+35）；Ø18.001/Ø30→(18,30]（g=−7、+7/+41）；Ø30.001→(30,50]（g=−9、+9/+50）。
- 越界：0 / −5 / NaN / ∞ / 500.001 / 600 / 3150 均抛 `PANIC`；>500 抛错来自冻结 IT 表仅到 ≤500（本表 21 段已录入，不越权扩展 IT 表）。

### p08 页面（`test/ui-p08.test.ts`，新增 5 例）

- 三 chips 为 `<button.rc-p08__preset>`，文案保持 `H7/g6 间隙` / `H7/k6 过渡` / `H7/p6 过盈`；点击后 `.on` + `aria-pressed=true`。
- Ø40 默认 g6：孔 `+25 / 0`、轴 `−9 / −25`、配合 `+9 … +50`、徽标 `间隙`。
- Ø30 g6/k6/p6：`+21 / 0` + `−7 / −20` + `+7 … +41`（间隙）；`+21 / 0` + `+15 / +2` + `−15 … +19`（过渡）；`+21 / 0` + `+35 / +22` + `−35 … −1`（过盈）。
- 尺寸改 Ø100 后配合卡重算：`+35 / 0`、`−12 / −34`、`+12 … +69`。
- 「怎么算的」展开后含：`配合 H7/g6：Xmin = EI − es = 0 − (−7) = +7 μm`、`Xmax = ES − ei = +21 − (−20) = +41 μm`。
- 超范围 Ø600：配合卡清除、chips 置灰；恢复 Ø30 后按 g6 重新出现。

## 设计 / 契约说明

1. **数据契约保持最小字段**：`{ source, bands: [{ band, g, k, p }] }`；`fitTolerance` 在 core 内解析 `band` 字符串为 `(lo,hi]`（`≤3` → `(0,3]`），未给 JSON 增字段。
2. **chips 用既有 `Chip` 组件**（`button.la-chip`），父级控制 `.on` / `aria-pressed`；原静态 `span` 与 `cursor: default` 覆盖已移除。
3. **配合卡与页面 IT 模式解耦**：配合恒为基孔制 H7 + g6/k6/p6，不随「孔 H / 轴 h」分段或 IT 等级改变；卡眉标写明 `H7/<band>`，避免与当前 IT 三联卡混淆。
4. **>500 数据可用但实算不开放**：本表 21 段双源核对完整；`fitTolerance` 仍受 `tolerance-it.json` ≤500 限制抛错。若后续扩展 IT 表，无需再补基本偏差。
5. **负号排版**：配合卡与算式中的负数/减号用 U+2212（设计稿排版），与既有 `signed()` 的小数 ASCII 负号并存；两者不在同一视觉行。

## 已知观察（上报 Lead）

1. **主源降级**：GB/T 1800.1-2020 全文为采标标准，官方全文系统不提供在线阅读；本卡主源使用 GB/T 1800.3-1998 轴基本偏差表的公开转写（数值同 ISO 286-1:2010 体系），并以 ISO 286-1:2010 独立实现为副源。已在 `PROVENANCE.md` §1 如实披露。
2. **两处反直觉表值**（A/B/G 三源一致，非笔误）：
   - `>2500–3150` 段 g = **−38**（非 −36）；
   - `k` 列 **>500 mm 全为 0**（`ei=0.6·D^(1/3)` 仅适用 ≤500 的 IT4–IT7）。
3. **排除源**：`mcp-tolerance` fixture 的 k 列 `[2,0,0,…]` 与六源矛盾，判转抄错误，已在 `PROVENANCE.md` §4 登记。
4. **p08 既有 7 例零改**：派工单预授权的「静态 chips 断言替换」未触发（既有测试未断言 chips 静态性），只做新增，满足零删既有用例。

## 判定行

`gate0 lint REAL_EXIT=0` ｜ `gate1 tsc REAL_EXIT=0` ｜ `gate2 vitest REAL_EXIT=0：40 files / 407 tests passed（基线 387 + 新增 20，零删既有）` ｜ `gate3 build REAL_EXIT=0：✓ built in 424ms，precache 39 entries` ｜ `dual-source-verify REAL_EXIT=0：A/B/data 63 cells 0 diff；旁证 C–G 212 cells 0 diff；RESULT PASS`。**待 Lead G1 复验；本档不自称过审。**
