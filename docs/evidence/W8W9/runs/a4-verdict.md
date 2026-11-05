# A4 五页对拍 · vision-reader 判定汇总与 Lead 处置

> 判定方：vision-reader（独立审图，豁免清单含 V2-A4 全部已裁决项 + 本批预期差异）。
> 判定对象：`runs/*.png` 11 张（780×1688，390×844@2x，Emulation 强制）。
> 判定结果：**9 PASS / 2 WARN / 0 FAIL**。

## 逐图判定

| # | 截图 | 判定 | 要点 |
| --- | --- | --- | --- |
| 1 | p02-seven-tabs | PASS | 七族页签默认态（普通 M 选中）、列表/搜索/自定义卡齐备 |
| 2 | p02-sealpipe | PASS | 密封管 R 页签选中，R1/16–R6 列表、右侧中径预览 |
| 3 | p02-worm | **WARN-1** | 蜗杆页签选中且列表正确，但**选中签停在横滑区视口外，图内无高亮可见**（判定方自注：横滑伴随现象，不判缺失） |
| 4 | p03-sealpipe-r116 | PASS | d₂=7.142 / d₁=6.561、「基准平面」标注、底孔=基面小径 |
| 5 | p03-worm-m2 | PASS | 轴向齿距 px=6.283 / 全齿高 h₁=4.400（2.2×m=4.4，固定三位显示）、无三针卡 |
| 6 | p04-gsk-988ta | PASS | 两行式 G76，P/Q/R=mm 半径小数（P1.894 / Q0.4） |
| 7 | p04-gsk-980tdc | **WARN-2** | 增量口径正确（P18944 / Q4000 + 0.0001mm 口径注）；口径注两处含形似「№.182.7」字符段，判定方语义存疑【不确定】 |
| 8 | p04-hnc-g82 | PASS | 单行 `G82 X26.211 Z-30. I0 R0 E0 C1 P0 F3.5` + 分刀行注 |
| 9 | p08-fit-h7g6 | PASS | 配合卡「配合实算 Ø30 H7/g6」、Xmin–Xmax「+7 … +41」、间隙徽标；标题省略号与范围连接符「…」为有意文案（非缺失） |
| 10 | p13-drill | PASS | 钻头表 25 行渲染、页签态正确 |
| 11 | p13-hardness | PASS | 硬度表 10 行渲染、HRC65 行无 HB（单源披露一致） |

## Lead 处置

### WARN-1（p02-worm 选中签视口外）→ **修复结案**（V3-A4-01）

真实可用性缺陷：点「蜗杆」后选中胶囊滑出视口，用户看不到当前选中态。W9 收口期 Lead 小修
（W5 favicon 先例）：`src/ui/components/SegChip.ts` 分段控件点击后对选中项
`scrollIntoView({ inline: 'nearest', block: 'nearest' })`——组件级一处修复，全部横滑页签受益；
非溢出场景 `nearest` 为 no-op。测试：`test/ui-components.test.ts` SegChip 既有用例内补 spy 断言（总数不变 477）。

复验：修复后 rebuild + 重跑 `tools/verify-w8.mjs`（A3 复绿 566ms / 11 shots / 0 异常），
vision-reader 复审 `p02-worm` 复拍图确认「蜗杆页签在视口内完整可见，白色卡片底高亮选中」。

### WARN-2（№.182.7 字符段）→ **有意文案豁免**（V3-A4-02）

非占位残留/乱码：`№.182.7` 为 GSK 980TDc 编程手册中 0.0001mm 增量单位的**手册条款编号引用**，
三重在档冻结——`docs/research/g76-dialects.md` §1 行4（口径注原文）、`docs/plan/WAVE-PLAN-V3.md`
V3-3、README「数据与精度说明」。判定方语义存疑属预期（引用标记不自释），豁免结案。

### 附带不确定点澄清（判定方标注、Lead 核查）

1. **p02「美制 UN」页签不见 UNC·UNF**：DOM 级核查（CDP `scrollWidth==clientWidth==69`，无溢出裁剪）
   ——label 本身即「美制 UN」，为设计稿冻结四签文案（`src/ui/pages/p02.ts:65` 注释明引
   `docs/车工计算App-无限画布.html`，测试 `test/ui-p02.test.ts:99` 断言）；UN 为美制统一螺纹总称，
   UNC/UNF 细分在族内列表体现。非缺陷。
2. **p08「…」连接符与标题省略号**：有意文案（范围分隔 `+7 … +41`），非缺失。
