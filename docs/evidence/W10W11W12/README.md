# W10W11W12 · v0.3 证据档

> 波次：W10 收尾三卡（A/B/C）+ W11 功能两卡（A/B）+ W12 收口（Lead）。
> 提交链：bd1d74d（契约预置）→ ca34c08（W10-A）→ 21a7c4b（W10-B）→ aa2a68d（W10-C）
> → c138d76（W11 契约预置）→ 6e23d01（W11 双卡）→ 1023cbb（G2-W10 三 Minor）→ W12 终态提交。
> 各卡证据档在 `docs/evidence/W10-A|B|C/`、`W11-A|B/`（自含门禁原始输出+双源核对+复算脚本）；
> 本档收 W12 全局验收（A1–A4）。

## A1 四门禁（终态）

主仓根目录串行复跑，全部 REAL_EXIT=0：`npm run lint`（0 error）/ `npx tsc --noEmit`（0）/
`npx vitest run --maxWorkers=2`（48 files / **544 tests**）/ `npm run build`（PWA precache 42）。
原始输出见 `runs/gate-final.txt`。测试链单调不减：477 → 482（W10-A）→ 482（W10-B 零代码）
→ 507（W10-C）→ 510（W11 预置桩）→ 542（W11 双卡）→ 543（M2 p08 用例）→ 544（N1 整数域）。

## A2 黄金用例

WAVE-PLAN-V4 §2 四锚点 + V4.1 §2/§3 锚点全部入 vitest 逐字符/逐位断言；G2-W10/G2-W11
reviewer 各自第三路独立复算逐位吻合（报告留档 `team-prompt/reports/`，W12 并入本档引用）。

## A3 链流（30 秒预算，实走 DOM）

工具：`tools/verify-w12.mjs`（Chrome headless + CDP；Emulation.setDeviceMetricsOverride
390×844@2x mobile 必带——V2-A4-P1 Windows DPI 129% 伪影教训自 verify-w7 原样保留；
沿革 verify-w5→w7→w8→w12）。

结果（`runs/verify-w12.json`）：**ok_a3=true，1128ms**（预算 30,000ms），
0 运行时异常、0 console error。十二跳 = v0.2.1 八跳原样回归 + v0.3 四新跳：

| 新跳 | 断言 |
| --- | --- |
| p04 锥管 R1/16（L 缺省 9.6）FANUC | 行2 逐字符 `G76 X6.561 Z-9.6 R-0.3 P581 Q200 F0.907` + −L/32 推导式注 |
| p04 锥管切 KND | `R-300` 整数μ（0.001mm 口径推定）行2 逐字符 |
| p08 Ø600 H7/g6 | >500 段配合卡 `+22 … +136`（W10-A 解锁，(500,630] 金值组） |
| p15 宏程序库 | 四模板 chip + 椭圆宏行 `WHILE [#4 LT #5] DO1` / `#6=2*#1*COS[#4]` / `G01 X#6 Z#7` / `END1` |
| p16 挂轮 | 默认 8 行 + top1「精确」徽标 + 「数学示例」明示；URL ?p=3.175&t=12 → top1 20/55、455.52 ppm |

### 工装勘误（一轮留痕）

首版 p16 结果表选择器误用 `tbody tr`——p16 表格为 div 结构（`.rc-p16__row`，role=table
ARIA 语义），修正为 `.rc-p16__resultcard .rc-p16__row` 后通过。

## A4 v0.3 改动面截图（7 张 390×844 @2x）

清单：p04×2（锥管 FANUC / KND）、p08×1（Ø600 配合）、p15×2（椭圆/油槽）、p16×2（默认/英制）。
v0.2.1 十一图不重拍（W8W9 档在案；八跳回归即覆盖其页面逻辑）。
**口径（G0-v0.3 C-03 冻结）**：A4 画布对拍范围仍=设计稿 14 页；p15/p16 为新增页，
视觉验收=组件契约清单+token 引用（vitest 断言 + G2-W11 reviewer grep 双确认）+ 本批 vision-reader
独立审图（可读性/布局/文案口径，不对拍画布）。判定见 `runs/a4-verdict.md`：
第一轮 1P/6W/0F → 4 修（p15 单列 / 轴命名 / g6 小写 / 单位整词）2 豁免（W3/W7，A3 DOM + 测试双证），
修复后 4 拍复审全 PASS，遗留观察项经 CDP DOM 实证为零溢出误读（97/97）。

## 索引

| 文件 | 内容 |
| --- | --- |
| `tools/verify-w12.mjs` | A3 链流 + A4 截图工装（CDP，Emulation 390×844@2x） |
| `runs/verify-w12.json` | A3/A4 机器报告（ok_all / 1128ms / 7 shots / 0 exceptions） |
| `runs/*.png` ×7 | 390×844 @2x 截图 |
| `runs/gate-final.txt` | W12 终跑四门禁原始输出（544/544） |
| `runs/a4-verdict.md` | vision-reader 判定汇总 |
