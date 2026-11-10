# V4.13 · 全站滚动审计与修复（v0.7.4）

> 用户反馈 2026-11-10（v0.7.3 上线后）：「首页划不到底，看不见三角卡片，其它二级
> 页面你也看看」。Lead 直改（V4.x 反馈小修第九案，不走 G1）。

## 一、根因（滚动模型取证）

- 滚动架构：`#app { height:100vh/100dvh }`（src/ui/components/base.ts:13）→
  `.la-page { height:100%; overflow:hidden }` + `.la-body { overflow:hidden }`
  （src/ui/components/PageShell.ts:21-23）——**滚动必须各页自行 opt-in**
  （页内 `overflow-y:auto` 容器或 `.la-page[data-page=xx] .la-body{overflow-y:auto}`
  scoped 规则）。16 页中 12 页已有 opt-in（含 V4.12 键盘七页），**p01/p03/p04/p05
  从未开启**。
- 为何至今未暴露：v0.7.0 全站审计（18 页 27 拍）检查的是路由命中/横向溢出/白屏，
  **未验纵向可达性**；且 p01 在 390×844 审计视口恰以 +14px 贴边挤下 12 卡（页脚带
  被裁），p03/p04 默认占位态远小于视口。用户真机 dvh 更矮 → 三角卡（bottom=710）
  出局且整页无任何滚动通道（「划不到底」= 没得划）。

## 二、审计（tools/scroll-audit.mjs，CDP 390 宽 × {844,740,680} 三视口）

20 路由 = 16 页默认态 + 重内容态（p03 蜗杆/梯形/密封管、p04 长程序——**占位态
FITS 不算证据**，首轮教训：p03/p04 缺参降级「请先选型」，补真实参数态后重跑）。
判定三级：FITS（无溢出）/ SCROLLABLE（有溢出且有滚动通道）/ **CLIP-NOSCROLL
（内容被裁且无任何滚动容器=缺陷）**。

修复前缺陷集（首轮 console 记录转写；runs/scroll-audit.json 归档的是修复后终包复审档）：

| 页 | 状态 | 844 / 740 / 680 溢出量 |
| --- | --- | --- |
| p01 | 默认 | +14 / +118 / +178px（三角卡 tri=[614,710] 全视口同位不可滚） |
| p03 | trapezoid Tr40×7 | +171 / +275 / +335px |
| p03 | sealpipe R1/16 | +129 / +233 / +293px |
| p04 | sealpipe G76 长程序 | 装得下 / 装得下 / +36px |

其余 15 页默认+重态全 FITS/SCROLLABLE（p02/p10/p13/p15 页内滚动容器，键盘七页
与 p16 body 滚动）。

## 三、修复（三行 scoped 规则 + 一行折边分隔）

- `p01/p03/p04` 各补 `.la-page[data-page="pXX"] .la-body { overflow-y: auto; }`
  （同既有 12 页先例；内容装得下时零视觉变化；源码注释附取证来源与量值）；
- p01 追加 `.rc-home__footer { padding-top: 6px }`：footer 在 body 外独立 flex 带，
  实测 footer.top == body 裁切缘（802==802 零间隙）——末排卡副标题下半在折边裁
  掉、页脚紧贴其下，vision 首轮误读为「两层文字相交」（机检证几何不可交，但零
  间隙确易误读）；6px 分隔带后复判过。
- +3 测（ui-p01/p03/p04：style 注入含 scoped 规则，防规则被误删的回归网），
  781→**784/784**。

## 四、验收

- 四门禁 4×0（runs/tsc|vitest|build|eslint.txt，REAL_EXIT 留证；bump 0.7.4 先于
  build，V4.7-M2 纪律）；
- 审计复审（G2 C-01 复原后终包 index-C5x0qv1v.js，归档 scroll-audit.json）：
  **20 路由 × 3 视口 CLIP-NOSCROLL 缺陷集空**（p01 844 SCROLLABLE +20px 折边、
  740 +124、680 +184——均＝修复前值 +6，系 footer padding-top 6px → body flex:1
  收缩，G2 I-01 勘正的数值级互证；680 滚到底 scrollTop=193=max 实拍另证）；
- 末端实拍机检（runs/p01-390x844-top.png / p01-390x680-bottom.png）：680 滚到底
  三角卡 rect [421,517] 全见、页脚 bottom=660≤680 含 v0.7.4；844 顶部无回归；
- vision 两轮：首轮 1 PASS/1 FAIL（折边零间隙误读为交叠，机检复核几何不可交
  footer.top≥body.clipBottom）→ 加 6px 分隔重拍 → **2/2 PASS**（折边带 17 设备
  像素空行零字形像素、末排四卡+页脚完整）。

## 五、登记

- 审计方法论入册：**「默认 FITS」不是证据**——占位态/空态必须补真实内容态重跑
  （本波 p03/p04 首轮即被占位态骗过）；纵向可达性自本波起有专门机检网
  （scroll-audit 可复跑：`CHROME=... node docs/evidence/V4.13/tools/scroll-audit.mjs
  <url> <outDir>`）。
- v0.7.0 全站审计的未覆盖项（纵向可达性）由本波补位；其余 15 页现口径全绿。

## 六、G2 快审（plan-code-reviewer，2026-11-11）

**有条件通过 → C-01 复原后关账**。Critical 一条（真问题）：**C-01 p04 越权删除
W12 A4-W6 活规则**——V4.13 初笔的 CSS 插入脚本定位公式（锚点→模板结尾间整段替换）
把 `.rc-p04__body .rc-param__value { overflow-wrap: normal; }` 及 W12 注释静默顶掉，
784 全绿测不到（grep test/ overflow-wrap 零命中）、README「纯追加」声明失实；reviewer
四点闭环（git diff 证删 / ParamGrid.ts:13 anywhere 基样式无补偿 / 选择器活代码
KND 0.001mm 断词缺陷回退 / 测试盲区）——**Lead 已复原**（git 对照 HEAD，注释带
C-01 出处；diff 现唯一删除行＝旧注释首行改写），CSS 变更故终态四门禁重捕 4×0、
784/784、终包 C5x0qv1v 审计复审缺陷集空（W12 规则与滚动无交互，结论不受影响）。
Important 两条均勘正：I-01 README 两处与归档档不符（+14→+20 附算式；首轮 console
记录转写披露——首轮档未落盘）；I-02 802==802 实测值补档 runs/fold-probe.json
（诚实注明系 6px 分隔前包 DvWGyMBY 所测）。Minor：M-01 19→20 路由（README×2/
台账/mjs 头注重态清单同步勘正）；M-02 reviewer 侧 vision 工具解析 844 顶拍失败
（该拍已经本波 vision 轮判 PASS，680 拍独立佐证，不重拍）；M-03 not.toContain
近乎恒真（留档不修）。

**C-01 教训入册**：脚本化「模板串内插文本」禁止「锚点→结尾」区间替换式公式
（尾部可能有新规则），一律锚点后原位拼接 + `git diff` 空删除行复查 + 声明「纯追加」
的改动面以 diff 为准不是以意图为准。
