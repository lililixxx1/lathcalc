# A4 判定 · v0.3 改动面 7 拍（vision-reader 两轮 + DOM 实证）

口径：G0-v0.3 C-03——画布对拍仍=设计稿 14 页；p15/p16 新增页走组件契约清单
（vitest 断言 + G2-W11 reviewer grep）+ vision-reader 独立审图（可读性/布局/文案，
不对拍画布）。工具 `tools/verify-w12.mjs`（Emulation 390×844@2x mobile，防 Windows DPI 伪影）。

## 第一轮（2026-11-05，修复前基线 7 拍）

**1 PASS / 6 WARN / 0 FAIL**。逐条：

| 编号 | 拍 | 现象 | 根因定位 | 处置 |
| --- | --- | --- | --- | --- |
| W1 | p15 油槽 | 值 `40` 显示似 `4`（右裁） | `.rc-p15__form` 两列 1fr，列宽 ~170px，label+unit 挤占后 `.la-input .field`（19px 右对齐）仅容 2–3 字符 | **修**：表单改单列（p15.ts CSS） |
| W2 | p15 油槽 | 值 `-100` 显示似 `-10…` | 同 W1 | 同 W1 |
| W3 | p16 默认 | 齿数框 17 枚仅见 8 枚 | HTML input 长文本原生水平滚动（固有交互，非布局缺陷）；下方 setinfo 行完整列出 17 枚 | **豁免**（交互本性；A3 DOM 断言「数学示例」明示在案） |
| W4a | p15 椭圆 | label「长半轴 a」与锚点 a=15<b=25 矛盾 | 命名按长短轴而锚点按轴向（X 全径 2a=30 仍大于 Z=b=25） | **修**：label 改「X 半轴 a」「Z 半轴 b」（macro.ts:47-48 + ui-p15.test 同步） |
| W4b | p15 椭圆 | 值 `360` 显示似 `36` | 同 W1 | 同 W1 |
| W5 | p08 Ø600 | eyebrow 显示「H7/G6」（g 被大写） | `.la-eyebrow` 全局 `text-transform: uppercase`（Card.ts:12/base.ts:21）；DOM 文本本为小写 g6（测试一直绿），纯显示层；GB/T 1800.1 轴代号须小写 | **修**：`.rc-p08__fitcard .la-eyebrow { text-transform: none }`（p08.ts CSS 域内覆盖） |
| W6 | p04 KND | 参数卡单位注在 `0.001mm` 内断词 | 共享组件 `.rc-param__value { overflow-wrap: anywhere }`（ParamGrid.ts）允许任意断点 | **修**：p04 域内 `overflow-wrap: normal`（全角括号前后可断、`0.001mm` 整词不断；不动共享组件，不波及他页） |
| W7 | p15 椭圆 | 免责/披露行未入镜 | 390×844 视口固有只见首屏，内容区可滚 | **豁免**（A3 DOM 断言 G76_DISCLAIMER + notes 折叠在页 + ui-p15 测试逐字断言在案） |

修复后四门禁复跑全绿（544/544，`runs/gate-final.txt` 为修复后终态输出），
`verify-w12.mjs` 复跑 ok_all（A3 1138ms / 7 拍重拍 / 0 异常 0 console error）。

## 第二轮（修复后复审 4 拍）

受影响页 p15×2 / p08 / p04-KND 复拍复审，检查点 C1（单列值完整）C2（轴命名）
C3（g6 小写）C4（单位整词 + R-300）**全 PASS**（vision-reader 逐字转录留档）。
p04-KND 发现 1 处非阻断观察项，追加 DOM 实证：

> 「首切 Q」格 `200（0.001mm）` 第二行右括号「贴格缘似被裁」。
> CDP 探针（headless 390px 实测）：三枚带单位值格 `scrollWidth === clientWidth`
> （牙高 P 99/99、首切 Q **97/97**、精修 R 99/99），格与值均零溢出——
> `（0.001mm）` 为不可断整词（kinsoku 禁 `（` 后/`）` 前断行），恰好落在
> 97px 值格内（余量最窄 ~2px），全量绘制、无裁切机制（无 overflow:hidden 祖先）。
> 判定：4x 放大下贴缘排版误读，非缺陷，维持现状（review-protocol 精确优先：
> DOM 实测优先于视觉推断；vision-reader 本轮亦在不确定清单中要求 DOM 实证）。

## 终判

**A4 通过**：7 拍无 FAIL；6 WARN 中 4 修复（W1/W2/W4b 同根一处、W4a、W5、W6）、
2 豁免（W3 交互本性、W7 视口固有，均有 A3 DOM + 测试双证）；修复后复审全 PASS，
遗留观察项经 DOM 实证为零溢出误读。
