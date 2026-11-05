# W8-D 证据档 · p13 速查填充（钻头 / 硬度）

- 卡 ID：W8-D（WAVE-PLAN-V3 G6，DEFERRED #14）
- 基线 commit：`b9f6b3a`
- 隔离树：`<TREE>`（证据档内不写机器绝对路径）
- 结论：**四门禁全绿（lint=0 / tsc=0 / vitest 402/402 / build 0）**；两表数据、p13 渲染、
  测试与 PROVENANCE 按派工单交付，无范围外改动。

## 索引

| 内容 | 路径 |
| --- | --- |
| lint 原始输出 | `runs/gate-lint.txt`（命令 + 原始输出 + `REAL_EXIT`） |
| tsc 原始输出 | `runs/gate-tsc.txt` |
| vitest 原始输出 | `runs/gate-vitest.txt`（39 文件 / 402 例） |
| build 原始输出 | `runs/gate-build.txt`（`✓ built`，PWA 39 entries / 175.10 KiB） |
| 判定行（脚本生成） | `runs/summary.txt`（生成脚本 `summarize.mjs`） |
| 钻头表双源核对档 | `sources/drill-dual-source.md`（25 行逐行来源 A/B + Δ） |
| 硬度表来源档 | `sources/hardness-source.md`（单源披露 + 10 行逐值） |
| 本说明 | `README.md` |

判定行原文（由 `node docs/evidence/W8-D/summarize.mjs` 从四份日志的 `REAL_EXIT` 计算）：

```text
GATE lint | npm run lint | REAL_EXIT=0 | PASS
GATE tsc | npx tsc --noEmit | REAL_EXIT=0 | PASS
GATE vitest | npx vitest run --maxWorkers=2 | REAL_EXIT=0 | PASS
GATE build | npm run build | REAL_EXIT=0 | PASS
JUDGMENT | ALL GATES PASS (exit 0)
```

## 交付物

| 文件 | 改动 |
| --- | --- |
| `src/data/drill-tap.json` | 新建；25 行（M1.6–M48 常用粗牙），`{designation, major, pitch, drill, source}` |
| `src/data/hardness-conv.json` | 新建；10 行（HRC 20–65 步进 5），`{hrc, hbs, hbw, hv, source}`；单源披露 |
| `src/ui/pages/p13.ts` | drill/hardness 页签由空态改为数据表渲染；点按复制对齐 G 代码页签；hardness 底部固定脚注；thread/morse 空态不动 |
| `src/data/PROVENANCE.md` | 汇总表新增两行 + 两表完整溯源节（双源逐行表 / 单源披露） |
| `test/ref-tables.test.ts` | 新建；10 例（钻头 6 + 硬度 4） |
| `test/ui-p13.test.ts` | 扩展 6→11 例；drill/hardness 空态断言替换为渲染断言，零删 `it` |
| `docs/evidence/W8-D/` | 本证据档（新建） |

核心 `src/core/` 零改动；`package.json` / `eslint.config.js` / 冻结参考件 / 其他页面零改动。

## 测试增量

- 基线：**387 例**（派工单基线口径）。
- 本卡：**402 例 / 39 文件**，全绿；新增 **15 例**（`test/ref-tables.test.ts` +10、
  `test/ui-p13.test.ts` +5）。
- 既有 `test/ui-p13.test.ts` 6 例保留（其中「钻头 / 硬度空态」1 例按翻红预授权替换为
  渲染断言，`it` 数量不变）；**零删既有用例**。

## 逐项验收对照

### 1. 四门禁（REAL_EXIT）

| 门禁 | 命令 | 期望 | 实测 | 证据 |
| --- | --- | ---: | ---: | --- |
| lint | `npm run lint` | 0 | **0** | `runs/gate-lint.txt` |
| 静态检查 | `npx tsc --noEmit` | 0 | **0** | `runs/gate-tsc.txt`（无输出） |
| 测试 | `npx vitest run --maxWorkers=2` | 0 | **0** | `runs/gate-vitest.txt`（39 files / 402 tests passed） |
| 构建 | `npm run build` | 0 | **0** | `runs/gate-build.txt`（`✓ built in 480ms`；PWA precache 39 entries / 175.29 KiB） |

### 2. 钻头表（drill-tap.json）

- 25 行，M1.6–M48 常用粗牙；首行 `M1.6×0.35`，末行 `M48×5.0`。
- 三锚点（未舍入算式 + 双源值）：
  - M6×1.0：`6 − 1 = 5.00` → 表值 **5.0**；来源 A/B 均 5.00。
  - M10×1.5：`10 − 1.5 = 8.50` → 表值 **8.5**；来源 A/B 均 8.50。
  - M12×1.75：`12 − 1.75 = 10.25` → 就近标准钻头 **10.2**；来源 A/B 均 10.20，
    `|10.20 − 10.25| = 0.05`。两源均未给 10.3，不触发分歧上报。
- 逐行 `|drill − (d−P)| ≤ 0.05`（`test/ref-tables.test.ts`）；pitch 与
  `threads-metric.json` 粗牙行逐行一致。
- 双源逐行核对见 `sources/drill-dual-source.md`：25/25 行 Δ=0。

### 3. 硬度表（hardness-conv.json）

- 10 行，HRC 20/25/30/35/40/45/50/55/60/65；HV 逐值：226 / 253 / 288 / 331 / 381 /
  441 / 512 / 596 / 698 / 822。
- HB：20–45 行取原表 HBS（225/251/283/323/370/424）；50–60 行取原表 HBW
  （502/585/647）；65 行原表无 HB（布氏换算止于约 650 HBW），UI 显示「HB — · HV 822」。
  JSON 落为 `hb` / `hbScale` 显示列，并保留 `hbs` / `hbw` 原表两列（`hb = hbs ?? hbw`）。
- **单源**：GB/T 1172-1999 表 1 为唯一原表，PROVENANCE 标「单源：GB/T 1172 原表」；
  UI 硬度页签底部固定脚注 `换算值为近似对照，以标准原表为准`。
- 逐值来源见 `sources/hardness-source.md`。

### 4. p13 渲染

- `drill` 页签：25 行列表，行 = 规格 + 钻头直径；点按复制钻头直径（M6×1.0 → `5.0`）。
- `hardness` 页签：10 行列表，行 = `HRC n` + `HB x · HV y`；点按复制
  `HRC 20 · HB 225 · HV 226`；底部固定近似对照脚注。
- `thread` / `morse` 页签：W4-C5 冻结空态文案不变（`thread`/`morse` 断言保留/新增）。
- 原「钻头分类暂无数据」「硬度换算暂无数据」空态文案已移除（测试显式断言 not.toContain）。

### 5. 测试覆盖

- `test/ref-tables.test.ts`：25 行/首末行/三锚点/M12 活算/逐行就近规则/跨表 pitch/
  source 双源；10 行 HRC 步进/锚点/HV·HB 单调/source 单源。
- `test/ui-p13.test.ts`：两页签行数与首末行、三锚点值定位、两页签点按复制 spy、
  空态移除、脚注逐字、莫氏空态冻结、切回 G 代码 10 行。

### 6. PROVENANCE

- 汇总表新增 `drill-tap.json`（双源 2，0 行分歧）与 `hardness-conv.json`
  （副源数 0，单源披露）两行。
- 两表溯源节含来源 URL / 检索日期 / 逐行对拍 / M12 口径 / 行集口径 / 单源披露。

### 7. 证据自含与公开态

- `runs/gate-*.txt`：命令全文 + 原始输出 + `REAL_EXIT` 同档；只看本目录即可复跑。
- `sources/*.md`：双源逐行值与 URL；硬度单源披露。
- 公开态清理：`gate-vitest.txt` 的 banner 树路径前缀替换为 `<TREE>`，其余输出原样保留。

## 说明与披露

1. **来源降级**：GB/T 20330-2006 完整表为付费标准，未逐字取回；试读页覆盖 M1–M2，
   M2.5–M48 的逐行值与 AmesWeb（ISO 2306 同口径公开表）及 ThreadSpec.org（独立公开表）
   双源核对。沿用 W3 付费标准先例，已在 PROVENANCE 与 `sources/` 披露。
2. **硬度单源**：按 V3-6 不伪造第二源；不与 ASTM E140 / ISO 18265 混表。
3. **行集口径**：钻头表 25 行（M1.6–M48）落在派工单预期 24±4 内；M1–M1.4、M7/M9/M11
   未纳入的原因见 `sources/drill-dual-source.md` §4。
4. 树内 `node_modules/` 按附录 D 建树配方从主仓复制（环境准备，非交付物，树内不提交）。

## 复跑方式

```bash
# 在树根执行（路径含空格时加引号）
npm run lint
npx tsc --noEmit
npx vitest run --maxWorkers=2
npm run build
node docs/evidence/W8-D/summarize.mjs
```
