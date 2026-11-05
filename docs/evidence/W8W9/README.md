# W8W9 · v0.2.1 证据档

> 波次：W8 数据扩张四卡（W8-A/B/C/D）+ W9 收口（Lead）。
> 基线 b9f6b3a → 收获链 f543c36（B）→ 25d62a6（D）→ 0b1f959（C）→ 08280f6（A）→ W9 发布物提交。
> 四卡证据档在 `docs/evidence/W8-A|B|C|D/`（各卡自含门禁原始输出+双源核对）；本档收 W9 全局验收（A1–A4）。

## A1 四门禁（终态）

主仓根目录串行复跑，全部 exit 0：`npm run lint`（0 error）/ `npx tsc --noEmit`（0）/
`npx vitest run --maxWorkers=2`（44 files / 477 tests）/ `npm run build`（PWA precache 39）。
原始输出见 `runs/gate-*.txt`（W9 终跑）。

## A2 黄金用例

WAVE-PLAN-V3 §4 全部 11 锚点组入 vitest 逐字符/逐位断言（断言位置见 G2-W8 报告第 2 节）；
G2-W8 独立 node 复算 9 组逐位吻合。

## A3 链流（30 秒预算，实走 DOM）

工具：`tools/verify-w8.mjs`（Chrome headless + CDP；**Emulation.setDeviceMetricsOverride
390×844@2x mobile 必带**——V2-A4-P1 Windows DPI 129% 伪影教训，自 verify-w7 原样保留）。

结果（`runs/verify-w8.json`，V3-A4-01 修复后终跑）：**ok_a3=true，566ms**（预算 30,000ms），
0 运行时异常、0 console error。八跳：

| 跳 | 断言 |
| --- | --- |
| p02 点「密封管 R」页签选 R1/16 → p03 | d₂=7.142 / d₁=6.561 +「基准平面」标注在页 |
| p02 点「蜗杆」选 m2 → p03 | 轴向齿距 px=6.283 / 全齿高 h₁=4.400 / 全页无「三针」 |
| p04 GSK 默认 988TA | `G76 P021060 Q0.1 R0.05` / `G76 X26.211 Z-30. P1.894 Q0.4 F3.5` |
| 切 980TDc | `G76 P021060 Q1000 R0.05` / `G76 X26.211 Z-30. P18944 Q4000 F3.5` + 0.0001mm 口径注 |
| HNC + 直进循环 | 单行 `G82 X26.211 Z-30. I0 R0 E0 C1 P0 F3.5` + 分刀行注 |
| p08 输 Ø30 点 H7/g6 | 配合卡「配合实算 Ø30 H7/g6」+ Xmin–Xmax「+7 … +41」+ 间隙徽标 |

### 工装勘误（三轮迭代留痕）

1. 首版 p02 直达 `#/p02?family=sealpipe` 无效——p02 自 v0.1 起只**发出** family 键不消费
   （§5.2 出向键），改为真实点击页签（更贴 A3 实走 DOM 本意）。
2. 蜗杆行匹配 `/^m2\b/` 误中 m2.5（`2` 与 `.` 间是词边界）——改 ListRow aria-label
   前缀 `m2，` 精确匹配。
3. p03 `format3` 为固定三位（4.4 显示 `4.400`），断言按 UI 实示值修正；
   蜗杆卡 label 为「轴向**齿**距 px」。

## A4 五页对拍（11 张 780×1688 @2x）

清单：p02×3（七族页签默认/密封管/蜗杆）、p03×2（R1/16 基面/蜗杆 m2）、
p04×3（GSK 988TA/980TDc/HNC G82）、p08×1（H7/g6 配合卡）、p13×2（钻头/硬度）。
判定：vision-reader 独立审图（豁免清单含 V2-A4 全部已裁决项 + 本批新增预期），
**9 PASS / 2 WARN / 0 FAIL**；两 WARN Lead 处置与附带不确定点澄清见
`runs/a4-verdict.md`——WARN-1（横滑页签选中项视口外）修复结案：`SegChip.ts` 点击后
`scrollIntoView` + 单测断言（总数不变 477：断言加于 SegChip 既有用例内），复跑复审通过；WARN-2（№.182.7）为 GSK 980TDc
手册条款编号引用，三重在档冻结，豁免结案。

## 索引

| 文件 | 内容 |
| --- | --- |
| `tools/verify-w8.mjs` | A3 链流 + A4 截图工装（CDP，Emulation 390×844@2x） |
| `runs/verify-w8.json` | A3/A4 机器报告（ok_all / 565ms / 11 shots / 0 exceptions） |
| `runs/*.png` ×11 | 390×844 @2x 截图 |
| `runs/gate-*.txt` | W9 终跑四门禁原始输出 + REAL_EXIT |
| `runs/a4-verdict.md` | vision-reader 判定汇总 |
