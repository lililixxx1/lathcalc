# W6-C4 证据档 · 三角多模式解算 + 锥度反推

- 卡 ID：W6-C4（WAVE-PLAN-V2 §2，DEFFERED #7/#8）
- 基线 commit：`cd99856`
- 隔离树：`<TREE>`（`LathCalc-trees_T-W6C4`，证据档内不写机器绝对路径）
- 结论：**三门禁全绿（exit 0）**；核心解算与两个页面按派工单交付，无范围外改动。

## 索引

| 内容 | 路径 |
| --- | --- |
| 门禁原始输出 | `runs/tsc.log` / `runs/vitest.log` / `runs/build.log`（命令全文 + 原始输出 + `REAL_EXIT`） |
| 判定行（脚本生成） | `runs/summary.log`（生成脚本 `summarize.mjs`） |
| 本说明 | `README.md` |

判定行原文（由 `node docs/evidence/W6-C4/summarize.mjs` 从三份日志的 `REAL_EXIT` 计算）：

```text
GATE tsc | npx tsc --noEmit | REAL_EXIT=0 | PASS
GATE vitest | npx vitest run --maxWorkers=2 | REAL_EXIT=0 | PASS
GATE build | npm run build | REAL_EXIT=0 | PASS
JUDGMENT | ALL GATES PASS (exit 0)
```

## 交付物

| 文件 | 改动 |
| --- | --- |
| `src/core/triangle.ts` | 填充 `solveTriangleBy`：SSS/SAS/ASA/SSA 模式判定与解算；SSA 双解锐角在前（V2-3）；G0-I1 边界；统一抛错文案 |
| `src/core/taper.ts` | 填充 `taperReverse`：C + 恰两值解第三值；`halfDiffMM` 未舍入路径（G0-I4）；半角复用 `arctan(C/2)` + `degToDMS` |
| `src/ui/pages/p12.ts` | 顶部 Segmented（`sss|sas|asa|ssa`，默认 sss）；每模式恰三输入格；SSA 双解两卡并列 +「SSA 双解」；SSS 渲染零回归 |
| `src/ui/pages/p07.ts` | Segmented 第三项「反推」（`data-value=reverse`）；锥比 C 输入 + MT0–MT6 快选；D/d/L 留空恰一行；结果卡三项；计算/莫氏视图零回归 |
| `test/triangle.test.ts` | 追加 9 例：SSS 等价 / SAS / ASA / SSA 双解 / SSA 边界 / sinC>1 / SSA 单解 / 模式错误 / SSS 退化 |
| `test/taper.test.ts` | 追加 5 例：MT4 反推大端 / 反推锥长整锚 / 反推小端 / 非法输入 / 尺寸矛盾 |
| `test/ui-p07.test.ts` | 既有 :70 断言两项 → 三项；追加 4 例反推视图（链路键 / 莫氏快选 / 非法提示 / 分段往返） |
| `test/ui-p12.test.ts` | 既有 :88「无多模式入口」→ 四项 Segmented；:143/:146 hint 文案迁移；追加 5 例多模式（SAS/ASA/SSA 双解/边界/往返） |
| `docs/evidence/W6-C4/` | 本证据档（新建） |

契约冻结文件 `src/core/types.ts` 未改动；`solveTriangle` / `taperCalc` 保留不动。

## 金值断言清单（算式 + 来源，禁裸值）

| # | 用例 | 断言（显示值） | 未舍入值 / 算式 | 来源 |
| --- | --- | --- | --- | --- |
| 1 | SAS `{b:40,c:50,A:36.87}` | mode `SAS`；`a.toBeCloseTo(30.0001,3)`；`a.toFixed(2)='30.00'`；`∠C=90.00`；`right=true`；area≈600.0014 | `a=√(40²+50²−2·40·50·cos36.87°)`，`cos36.87°=0.7999989281` → `30.0000714567`；面积 `½·40·50·sin36.87°=600.0014291` | WAVE-PLAN-V2 §4 锚 1；金三角 30/40/50 |
| 2 | ASA `{A:36.87,B:53.13,c:50}` | mode `ASA`；`a→30.00`、`b→40.00`；`C=90`、`right=true` | `C=180−36.87−53.13=90`；`a=50·sin36.87°/sin90°=30.0000714566`；`b=50·sin53.13°/sin90°=39.9999464074` | WAVE-PLAN-V2 §4 锚 2 |
| 3 | SSA `{a:40,c:50,A:36.87}` | mode `SSA`；`solutions.length=2`；解₁ `C=48.59°`、`B=94.54°`、`b=66.46`；解₂ `C=131.41°`、`B=11.72°`、`b=13.54`；`solutions[0].C<90` | `sinC=50·sin36.87°/40=0.7500017864`；`C₁=asin=48.5905326358°`、`B₁=94.5394673642°`、`b₁=40·sinB₁/sinA=66.4573784936`；`C₂=131.4094673642°`、`B₂=11.7205326358°`、`b₂=13.5425143212` | WAVE-PLAN-V2 §4 锚 3；V2-3 锐角在前 |
| 4 | SSA 边界 `{A:120,a:45,c:50}` | 抛 `构不成三角形` | `sinC=50·sin120°/45=0.9622504<1`，但 `A≥90° 且 a(45)≤c(50)` → 无解；若直接套公式 `B=180−120−74.2068=−14.2068°`（退化解） | V2-3 / G0-I1 实跑反例 |
| 5 | 模式错误 `{A:60,B:70,C:50}`、`{a:3,b:4}`、AAS、零值、负值、多值 | 抛 `无法判定解算模式或输入非法`（逐字） | 模式判定：恰三边 SSS；恰两边+夹角 SAS；恰两边+对角 SSA；恰两角+夹边 ASA；其余非法 | `src/core/types.ts` G0-I2 |
| 6 | taperReverse `{taperC:1/19.254, small:30, length:50}` | `solved='big'`；`missing=32.596863→32.597`；`halfDiffMM=1.298431→1.298`；`halfAngleDMS=1°29′15″` | `D=30+50/19.254=32.5968629895`；`halfDiff=(D−30)/2=1.2984314948`（未舍入路径，G0-I4）；`α/2=arctan(C/2)=1.4875586°` | WAVE-PLAN-V2 §4 锥度反推；`src/data/morse.json` number=4（GB/T 1443-2016） |
| 7 | taperReverse `{taperC:1/20, big:32, small:30}` | `solved='length'`；`missing=40`；`halfDiffMM=1` | `L=(32−30)/(1/20)=40` | WAVE-PLAN-V2 §1 / §4（整锚） |
| 8 | taperReverse `{taperC:0,…}`、给值 1 个、给值 3 个 | 抛错，文案含 `恰两值` | 契约：`taperC>0` + big/small/length 恰两值，不臆造 | `src/core/types.ts` TaperReverseFn 注释 |
| 9 | p12 UI SSA 链路键 `#/p12?mode=ssa`；输入 40/50/36.87 | 三格字段 `a/c/A`；两张结果卡并列；卡内 `边 b` 分别为 `66.46` / `13.54`；页面文本含 `SSA 双解`；`∠C` 分别 `48.59°` / `131.41°` | 同 #3（core 实时计算，非硬编码） | WAVE-PLAN-V2 §1 UI 契约；V2-3 |
| 10 | p07 UI 链路键 `#/p07?mode=reverse&taperC=1/19.254&small=30&length=50` | Segmented 三项 `计算/莫氏对照/反推`；结果 `32.597`、`1.298`、`1°29′15″`；标签 `大端 D / 大小端差 (D−d)/2 / 半角 α/2` | 同 #6 | WAVE-PLAN-V2 §1 UI 契约；W6-C4 派工单 |

双盲复核：上表未舍入值均由独立 Node 双精度代入余弦/正弦定理与 `D=d+C·L` 复算，并与实现输出对拍。

## 门禁证据（树根目录，单独整句执行）

| 门禁 | 命令 | 期望 | 实测 REAL_EXIT | 原始输出要点 |
| --- | --- | --- | --- | --- |
| 静态检查 | `npx tsc --noEmit` | 0 | **0** | 无输出（`runs/tsc.log`） |
| 测试 | `npx vitest run --maxWorkers=2` | 0 | **0** | `Test Files 38 passed (38)`；`Tests 346 passed (346)`（`runs/vitest.log`） |
| 构建 | `npm run build` | 0 | **0** | `✓ built in 397ms`；PWA `precache 39 entries (164.13 KiB)`（`runs/build.log`） |

测试基线 323 例；本卡新增 23 例（triangle +9、taper +5、ui-p07 +4、ui-p12 +5），共 346 例全绿。
既有测试仅按派工单授权改断言：`test/ui-p07.test.ts:70`（两项→三项）、`test/ui-p12.test.ts:88`（无多模式入口→四项 Segmented）、`test/ui-p12.test.ts:143/:146`（缺值 hint 文案），未删除测试。

## 页面链路键（本卡登记，供 W6 波末并入 ui/README §5.2）

- `#/p12?mode=sss|sas|asa|ssa`（默认 `sss`；非法值回退 `sss`）
- `#/p07?mode=reverse&taperC=<C>&big=<D>&small=<d>&length=<L>`（`taperC` 为数值，如 `0.05193725979017347`；D/d/L 留空恰一行为待求）

## 双盲复核差异说明（非阻塞）

派工单 SSA 锚 3 的 b 未舍入值写作 `66.457381` / `13.542619`；独立复算（正弦定理与余弦定理互证）为
`66.4573784936` / `13.5425143212`。差异来自派工单引用的 `sin36.87°=0.6000018` / `sinC=0.7500022`
为舍入值（双精度真值 `0.6000014291` / `0.7500017864`）。两者 `toFixed(2)` 均为 `66.46` / `13.54`，
与派工单要求的显示断言一致；本卡断言采用显示值 + 独立复算的未舍入值，并已在最终汇报「上报项」登记。

## 证据档清理说明

`runs/vitest.log` 第 2 行原含机器绝对路径前缀，按附录 G「只改前缀」要求替换为 `<TREE>`；命令、行号与其余内容原样保留。
