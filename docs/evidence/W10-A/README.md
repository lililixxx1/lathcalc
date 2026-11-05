# W10-A 证据档 · IT 公差表 >500–3150 双源录入 + fitTolerance 解锁

> 卡：W10-A（WAVE-PLAN-V4 §2）｜ 执行者：worker-2 ｜ 隔离树：`LathCalc-trees_T-W10A` ｜ 基线 commit：`bd1d74d`
> 写范围：`src/data/tolerance-it.json`、`test/data-it.test.ts`；`test/fit-tolerance.test.ts`（派工单「翻红预授权」最小扩）
> 证据目录：`docs/evidence/W10-A/`（本 README + `runs/` + `tools/` + `dual-source-table.md`）
> 本档自含：命令全文 + 原始输出 + `REAL_EXIT` 同档；只看本目录即可独立复跑（源快照按 URL 重抓后用 SHA-256 核对）。
> 公开态清理：`runs/gate2-vitest.txt`、`runs/focused-w10a-tests.txt` 的 RUN banner 树路径前缀替换为 `<TREE>`；
> `runs/source-extraction.txt` 的快照路径替换为 `<SRC_A_SNAPSHOT>` / `<SRC_B_SNAPSHOT>`（按附录 G 只改前缀，其余原样）。

## 索引

| 档 | 命令 / 内容 | 结果 |
| --- | --- | --- |
| `runs/source-extraction.txt` | `node docs/evidence/W10-A/tools/extract-sources.mjs <SRC_A> <SRC_B>` | 源 A/B 解析 21 段；>500 段 144 格 0 差异；≤500 IT5–IT12 104 格 0 差异；`REAL_EXIT=0` |
| `runs/source-values.json` | 上命令生成的规范化源记录（A/B 各 21 段，IT1–IT18） | 机器可读，`verify-tolerance-it.mjs` 的输入 |
| `runs/build-data.txt` | `node docs/evidence/W10-A/tools/build-tolerance-it.mjs` | `appended 8 segments (IT1–IT18)`，`REAL_EXIT=0` |
| `runs/dual-source-verify.txt` | `node docs/evidence/W10-A/tools/verify-tolerance-it.mjs` | 21 段 / 248 格 / 744 次三向比较，**0 差异**，`REAL_EXIT=0` |
| `dual-source-table.md` | `node docs/evidence/W10-A/tools/render-dual-source-table.mjs` | >500 段 8 × 18 格逐格 `A/B` + 一致性列；144/144 一致；`REAL_EXIT=0`（`runs/render-table.txt`） |
| `runs/fit500-independent-recalc.txt` | `node docs/evidence/W10-A/tools/fit500-independent-recalc.mjs` | 5 组独立代入（3 组必选 + 2 边界），0 差异，`REAL_EXIT=0` |
| `runs/focused-w10a-tests.txt` | `FORCE_COLOR=0 CI=1 npx vitest run --maxWorkers=2 test/data-it.test.ts test/fit-tolerance.test.ts` | 2 files / **22 tests passed**，`REAL_EXIT=0` |
| `runs/gate0-lint.txt` | `FORCE_COLOR=0 CI=1 npm run lint` | `REAL_EXIT=0`（无 error） |
| `runs/gate1-tsc.txt` | `FORCE_COLOR=0 CI=1 npx tsc --noEmit` | `REAL_EXIT=0`（无输出） |
| `runs/gate0-lint-fix.txt` | 同上（Lead 裁决 A 修复后复跑 lint） | `REAL_EXIT=0`（无 error） |
| `runs/gate1-tsc-fix.txt` | 同上（Lead 裁决 A 修复后复跑 tsc） | `REAL_EXIT=0`（无输出） |
| `runs/gate2-vitest.txt` | `FORCE_COLOR=0 CI=1 npx vitest run --maxWorkers=2` | **`REAL_EXIT=1`**：44 files（42 passed / 2 failed）；482 tests（**479 passed / 3 failed**）——3 红均为范围外陈旧断言，见「门禁结果」 |
| `runs/gate2-fix.txt` | 同上（Lead 授权 3 行最小修复后复跑） | **`REAL_EXIT=0`**：44 files / **482 tests passed** |
| `runs/gate3-build.txt` | `FORCE_COLOR=0 CI=1 npm run build` | `✓ built in 399ms`，PWA precache 39 entries（194.93 KiB），`REAL_EXIT=0` |
| `tools/extract-sources.mjs` | 双源快照解析 + 逐格对拍 + 规范化记录 | 见 `runs/source-extraction.txt` |
| `tools/build-tolerance-it.mjs` | 追加 8 段（保留既有 13 行原文；临时文件 + rename 原子替换） | 见 `runs/build-data.txt` |
| `tools/verify-tolerance-it.mjs` | A/B/入库值三向逐格复核（自含） | 见 `runs/dual-source-verify.txt` |
| `tools/fit500-independent-recalc.mjs` | 不 import `core/tolerance.ts`，按端别规则独立代入 | 见 `runs/fit500-independent-recalc.txt` |
| `tools/render-dual-source-table.mjs` | 生成双源核对表 | 见 `dual-source-table.md` |

## 交付物

| 路径 | 说明 |
| --- | --- |
| `src/data/tolerance-it.json` | 13 段 → **21 段**：≤500 保留 13 段 × IT5–IT12 = 104 值；>500–3150 新增 8 段 × IT1–IT18 = 144 值；共 248 值 |
| `test/data-it.test.ts` | 8 例 → **12 例**（+4）：21 段/248 值规模、>500 分段边界、>500 IT6/7/8 全段、>500 交集等级锚点、>500 mm 换算 |
| `test/fit-tolerance.test.ts` | 9 例 → **10 例**（+1，零删 `it`）：越界判据 500.001/600/3150 → >3150；新增 >500 三组实算 + 2 边界 |
| `docs/evidence/W10-A/` | 本档 + `runs/` + `tools/` + `dual-source-table.md` |

测试总数：基线 **477** → 树内全量 **482**（+5：data-it +4、fit-tolerance +1），**单调不减**；既有 `it` 零删。

## 数据口径与双源

### 源 A（GB/T 1800.3-1998 公开转写）

| 项 | 内容 |
| --- | --- |
| 标准 | GB/T 1800.3-1998《标准公差数值》（标准公差数值表；GB/T 1800.1 的分册旧编号） |
| 可读文本 | mechtool.cn《标准公差数值(摘自GB/T 1800.3-1998)》 |
| URL | <https://www.mechtool.cn/drawingandaccuracy/drawingandaccuracy_standardtolerancevalues.html> |
| 覆盖 | 21 段 × IT1–IT18（≤3 … >2500–3150） |
| 表注 | 「基本尺寸大于 500mm 的 IT1 至 IT5 的标准公差数值为试行」 |
| 单位 | IT1–IT11 为 μm；IT12–IT18 为 mm（本次 ×1000 换算为整数 μm，如 0.7 mm → 700 μm） |
| 快照 SHA-256 | `787b58cc9724ca99368d5fcd8805a09a0b27bc0299f9f5e7a48ef320fdacf47d`（页面 HTML） |
| 访问日期 | 2026-11-05 |

### 源 B（ISO 286-1:2010 Table 1 表值实现）

| 项 | 内容 |
| --- | --- |
| 来源 | `thefhiter/tolerance-handbook` · `js/engine/iso286.js`（W8-C 基本偏差卡同一实现，本次用其 `IT` 表） |
| URL | <https://raw.githubusercontent.com/thefhiter/tolerance-handbook/main/js/engine/iso286.js> |
| 覆盖 | `MAIN` 21 段 × IT01, IT0, IT1…IT18；>500 段 IT01/IT0 为 `null`（未定义），IT1–IT18 有值 |
| 独立性 | 另一作者按 ISO 286-1:2010 独立实现；≤500 段 IT5–IT12 与本仓既有 104 值逐格一致（旁证源保真） |
| 快照 SHA-256 | `cbb867f71054ad09b7ae937a02d0fd79629f97583bbe14839c330886a0193cdb`（`iso286.js`；与 W8-C PROVENANCE 记录一致） |
| 访问日期 | 2026-11-05 |

### 段与等级范围

- **段边界（8 粗段，左开右闭）**：`(500,630]`、`(630,800]`、`(800,1000]`、`(1000,1250]`、`(1250,1600]`、`(1600,2000]`、`(2000,2500]`、`(2500,3150]`——与 `src/data/fundamental-deviations.json` 的 >500 段逐段相同（前 13 段亦逐段相同）。
- **等级范围**：两源对 >500 段共同覆盖 **IT1–IT18（18 级）**；按冻结口径「两源交集」取全交集。
- **与预注册预期的偏离（如实披露）**：派工单预注册「预期 IT6–IT16 附近」；实查两源均为 IT1–IT18（GB 表注明 IT1–IT5 为试行），故实际范围更宽。未按预期裁剪——裁剪会丢失两源均覆盖的值，且无标准依据；以「不预设、以双源实查为准」为准。

### 双源逐格核对

- **>500 段**：8 段 × 18 级 = **144 格**，A/B/入库值三向逐格一致，**0 差异**（`runs/dual-source-verify.txt`；逐格表见 `dual-source-table.md`）。
- **≤500 段源保真旁证**：源 B 对既有 13 段 × IT5–IT12 = **104 格**逐值复核，0 差异（不改既有值，仅证源 B 可信）。
- 合计 **248 格 / 744 次比较，0 差异**；原始解析输出 `runs/source-extraction.txt`（含两快照 SHA-256）。

## fitTolerance >500 三组实算（双盲对拍）

表值来源：`tolerance-it.json`（W10-A）+ `fundamental-deviations.json`（W8-C，21 段已全、本次不改）。
公式（`tolerance.ts`）：孔 H7 `EI=0、ES=+IT7`；g6 `ei=es−IT6`；k6/p6 `es=ei+IT6`；`Xmin=EI−es`、`Xmax=ES−ei`。

| 组 | Ø / 段 | 配合 | IT7 / IT6（μm） | 基本偏差（μm） | 孔 H7 | 轴 6 级 | Xmin … Xmax | 类别 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 600 → `(500,630]` | H7/g6 | 70 / 44 | g=−22 | 0 / +70 | es=−22、ei=−66 | **+22 … +136** | 间隙 |
| 2 | 1000 → `(800,1000]` | H7/k6 | 90 / 56 | k=0 | 0 / +90 | ei=0、es=+56 | **−56 … +90** | 过渡 |
| 3 | 2000 → `(1600,2000]` | H7/p6 | 150 / 92 | p=+170 | 0 / +150 | ei=+170、es=+262 | **−262 … −20** | 过盈 |
| 边界 | 500.001 → `(500,630]` | H7/g6 | 70 / 44 | g=−22 | 0 / +70 | −22 / −66 | +22 … +136 | 间隙 |
| 边界 | 3150 → `(2500,3150]` | H7/g6 | 210 / 135 | g=−38 | 0 / +210 | −38 / −173 | +38 … +383 | 间隙 |

- **路径 1（独立代入）**：`tools/fit500-independent-recalc.mjs` 不 import `tolerance.ts`，直接读两张数据表按端别规则代入；输出 `runs/fit500-independent-recalc.txt`，5 例 0 差异。
- **路径 2（测试断言）**：`test/fit-tolerance.test.ts` 新增 `it` 用 `expectFit` 逐字段 `toBe`（含 hole/shaft/min/max/fitType）。
- 越界判据同步：原 `500.001 / 600 / 3150` 应抛错 → 改为 `3150.001 / 4000` 抛错（`(lo,hi]` 末段闭于 3150）。

## 门禁结果（树根串行执行，一条命令一档）

| 门禁 | 命令 | `REAL_EXIT` | 摘要 |
| --- | --- | --- | --- |
| gate0 lint | `npm run lint` | **0** | 无 error |
| gate1 静态检查 | `npx tsc --noEmit` | **0** | 无输出 |
| gate2 测试（修复前，历史留痕） | `npx vitest run --maxWorkers=2` | **1** | 44 files（42 passed / 2 failed）；482 tests（479 passed / 3 failed）——3 红均为范围外陈旧断言 |
| gate2 测试（修复后，Lead 裁决 A） | `npx vitest run --maxWorkers=2` | **0** | 44 files / **482 tests passed**（`runs/gate2-fix.txt`） |
| gate3 构建 | `npm run build` | **0** | `✓ built in 399ms`；PWA precache 39 entries（194.93 KiB） |

> 修复后另复跑 lint / tsc：`runs/gate0-lint-fix.txt`、`runs/gate1-tsc-fix.txt` 均 `REAL_EXIT=0`；build 输入未变，`runs/gate3-build.txt` 仍有效。

### gate2 历史 3 红（Lead 裁决选项 A：已授权最小修复）

| # | 文件:行 | 断言 | 失败原因 | 已应用的最小修复（Lead 裁决 A） |
| --- | --- | --- | --- | --- |
| 1 | `test/data-fundamental-deviations.test.ts:98` | `expect(IT_ROWS).toHaveLength(13)` | 扩段后 IT 表为 21 段（`expected 13 but got 21`） | `13` → `21`；标题「前 13 段」同步改为「21 段」。循环 `i < IT_ROWS.length` 自动覆盖 21 段（两表 21 段边界已逐段一致） |
| 2 | `test/ui-p08.test.ts:180` | `setNominal('600')` 后断言出现「超出表范围」提示 | 600 现落 `(500,630]`，p08 自动解锁并正常渲染（实测配合卡 `+22 … +136`，与本卡组 1 一致） | `'600'` → `'3150.001'`（新越界样本，断言语义不变） |
| 3 | `test/ui-p08.test.ts:268` | `setNominal('600')` 后断言配合卡清除、chips 置灰 | 同上 | 同上 |

- **修复执行（Lead G1 裁决选项 A，追加授权写范围）**：上述 3 行已应用，零删 `it`、最小修改；复跑 `runs/gate2-fix.txt` = `REAL_EXIT=0`、44 files / **482 tests passed**。
- 以上 3 处原不在派工单「翻红预授权」清单（仅 `data-it.test.ts`、`fit-tolerance.test.ts`），修复前按「其余文件测试翻红=上报」未改树内；Lead 裁决后按授权改。
- p08 **显示层无 ≤500 硬编码**：页面统一走 `itToleranceMM`/`fitTolerance`，600 的配合卡输出 `+22 … +136` 与本卡金值组 1 一致；红仅来自测试把 600 当越界样本。

## 预注册预期 vs 实测

| 项 | 预注册 | 实测 | 判定 |
| --- | --- | --- | --- |
| 段计数 | 13 → 21（+8） | 21 | 符合 |
| 每段等级数 | 以双源交集为准（预期 IT6–IT16 附近，不预设） | **IT1–IT18（18 级）** | 偏离预期，按「不预设」口径取实查交集，已披露 |
| 双源差异 | 0 格 | 0 格（144 新格 + 104 旁证格） | 符合 |
| 四门禁 | 全绿 | gate0/1/3 绿；gate2 修复前红 3 例、Lead 裁决 A 授权修复后 **482/482 绿** | 符合（修复后） |
| 测试总数 | ≥477 单调不减 | 477 → 482（+5，零删 `it`） | 符合 |

## PROVENANCE 增量（供 Lead 收获时串行合并；树内 `src/data/PROVENANCE.md` 未改）

### 建议追加到 `tolerance-it.json · 溯源片段（W3-C4）` 节末的新小节

```markdown
## 7. W10-A 增量：>500–3150 段（IT1–IT18，2026-11-05）

- 范围：`tolerance-it.json` 由 13 段扩至 21 段；新增 >500–630 / >630–800 / >800–1000 / >1000–1250 / >1250–1600 / >1600–2000 / >2000–2500 / >2500–3150 共 8 粗段，左开右闭；段界与 `fundamental-deviations.json` 的 21 段逐段相同。
- 等级：两源对 >500 段共同覆盖 **IT1–IT18（18 级）**。GB/T 1800.3-1998 转写原表注「基本尺寸大于 500mm 的 IT1 至 IT5 的标准公差数值为试行」；ISO 286-1:2010 实现中 IT01/IT0 在 >500 段未定义，IT1–IT18 有值。按冻结口径「两源交集」取 IT1–IT18；与派工单预注册预期「IT6–IT16 附近」不同，以实查为准并如实披露。
- 单位：μm。源 A 原表 IT12–IT18 以 mm 列出，已 ×1000 换算为整数 μm（如 0.7 mm → 700 μm）。
- 双源：源 A = GB/T 1800.3-1998《标准公差数值》公开转写（mechtool.cn，<https://www.mechtool.cn/drawingandaccuracy/drawingandaccuracy_standardtolerancevalues.html>，快照 SHA-256 `787b58cc9724ca99368d5fcd8805a09a0b27bc0299f9f5e7a48ef320fdacf47d`）；源 B = ISO 286-1:2010 Table 1 表值实现 `thefhiter/tolerance-handbook` · `js/engine/iso286.js`（<https://raw.githubusercontent.com/thefhiter/tolerance-handbook/main/js/engine/iso286.js>，快照 SHA-256 `cbb867f71054ad09b7ae937a02d0fd79629f97583bbe14839c330886a0193cdb`）。两源均覆盖 21 段 × IT1–IT18。
- 对拍：>500 段 8 × 18 = **144 格**，A/B/入库值三向逐格一致，**0 差异**；≤500 段另以源 B 对 IT5–IT12 复核 **104 格**，0 差异（源保真旁证，不改既有值）。合计 248 格 / 744 次比较，0 差异。原始输出 `docs/evidence/W10-A/runs/source-extraction.txt`、`runs/dual-source-verify.txt`；逐格表 `docs/evidence/W10-A/dual-source-table.md`。
- `fitTolerance` >500 实算（抽 3 组，算式见 `docs/evidence/W10-A/README.md`）：Ø600 H7/g6 +22…+136 间隙；Ø1000 H7/k6 −56…+90 过渡；Ø2000 H7/p6 −262…−20 过盈；边界 Ø500.001、Ø3150 按 (lo,hi] 落段。独立复算 `docs/evidence/W10-A/runs/fit500-independent-recalc.txt`。
- 新增行 `source` 字段：「GB/T 1800.1-2020 表1（IT 数值同 GB/T 1800.3-1998 / ISO 286-1:2010；>500 段 IT1–IT5 为试行）」。
- 测试：`test/data-it.test.ts` 12 例；`test/fit-tolerance.test.ts` 10 例（>500 三组 + 边界；原 9 例零删）。
```

### 需同步改写的既有两处（W10-A 后口径）

1. 顶部汇总表 `tolerance-it.json` 行建议改为：

```markdown
| tolerance-it.json | provenance/tolerance-it.md（W10-A 增量见 §7） | ≤500：GB/T 1800.1-2020 表1（2009 同值，降级已批）；>500：GB/T 1800.3-1998 转写 + ISO 286-1:2010 | ≤500 6；>500 2 | ≤500 1 格（IT9 (400,500]，裁决 155）；>500 0 格（144 格一致） | 已合并 |
```

2. 本片段 `## 6. 结论` 第 1 条建议改为：

```markdown
1. `data/tolerance-it.json`：**21 段**（≤500 13 段 × IT5–IT12 = 104 值 + >500 8 段 × IT1–IT18 = 144 值，共 **248 个值全部非空**），段界 `(lo,hi]` 连续覆盖 `(0,3150]`；>500 双源核对见 §7。
```

（可选）若 Lead 维护 `src/data/provenance/tolerance-it.md` 片段源，可将上述 §7 与结论改写同步到该片段，再重新合并 `PROVENANCE.md`。

## 判定行

`gate0 lint REAL_EXIT=0` ｜ `gate1 tsc REAL_EXIT=0` ｜ `gate2 vitest 修复前 REAL_EXIT=1（3 红，历史留痕）→ gate2-fix REAL_EXIT=0：44 files / 482 tests passed（Lead 裁决 A 授权 3 行最小修复）` ｜ `gate3 build REAL_EXIT=0：✓ built in 399ms，precache 39 entries` ｜ `dual-source verify REAL_EXIT=0：248 cells / 744 comparisons，0 diffs` ｜ `fit500 independent recalc REAL_EXIT=0：5 cases，0 diffs` ｜ `focused W10-A tests REAL_EXIT=0：2 files / 22 tests passed`。**待 Lead G1 复验；本档不自称过审。**
