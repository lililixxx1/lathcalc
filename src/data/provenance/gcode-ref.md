# PROVENANCE 片段 · gcode-ref.json（G 代码速查表）

- 表：`data/gcode-ref.json` ｜ 任务：W3-C3 ｜ 录入日期：2026-11-03
- 行结构：`GcodeRefRow { code, desc }`（`src/core/types.ts`）——契约无 `source` 字段，
  来源只进本 provenance 片段（设计如此，不是缺字段）
- 行集来源：**设计稿 p13 速查页**，`docs/车工计算App-无限画布.html` 第 1411–1433 行
  `pRef` 区块，代码行见 1418–1427，共 **10 行**；页面注册见 1532 行
  `addPage(100, yD2, pageW, pageH, '13 速查', pRef)`

## 1. 行集（以设计稿为准，逐行提取）

| # | 设计稿行 | code | 设计稿原文 desc | 入库 desc |
| --- | --- | --- | --- | --- |
| 1 | :1418 | G01 | 直线插补 | 直线插补 |
| 2 | :1419 | G02 | 顺时针圆弧插补 | 顺时针圆弧插补（图面顺时针＝前刀架 G02；X 上 Z 右、自 +Y 视；后刀架翻转） |
| 3 | :1420 | G03 | 逆时针圆弧插补 | 逆时针圆弧插补（图面逆时针＝前刀架 G03；X 上 Z 右、自 +Y 视；后刀架翻转） |
| 4 | :1421 | G04 | 暂停延时 | 暂停延时 |
| 5 | :1422 | G20/21 | 英制 / 公制输入 | 英制 / 公制输入 |
| 6 | :1423 | G76 | 螺纹切削复合循环 | 螺纹切削复合循环（两行式模板，仅 FANUC；GSK/KND/华中待补） |
| 7 | :1424 | G92 | 螺纹切削单循环 | 螺纹切削单循环（仅速查数据行，v0.1 不生成程序） |
| 8 | :1425 | M03 | 主轴正转 | 主轴正转（CW） |
| 9 | :1426 | M05 | 主轴停止 | 主轴停止 |
| 10 | :1427 | M30 | 程序结束并返回 | 程序结束并返回 |

> 设计稿行集只有这 10 行（1418–1427），没有 G00/G17/G18/G28 等其它代码；本表不扩行。

## 2. 语义来源（双源互证）

### 源 A：设计稿原文（行集与中文口径）

- `docs/车工计算App-无限画布.html`：p13 区块（1411–1433），代码行 1418–1427。
- 取用：code 与中文 desc 的基准；`G20/21` 在设计稿中为**一行合并**（非 G20、G21 两行），
  本表照录一行，不拆。

### 源 B：FANUC 手册口径（语义互证）

| 来源 | URL | 检索日期 | 取用 |
| --- | --- | --- | --- |
| FANUC 车床系统 A 的 G 代码说明字典（社区维护，措辞为 FANUC 手册口径） | https://github.com/jmr1/vscode-ncproj/blob/main/conf/fanuc_lathe_system_a/desc/gcode_desc_en.json | 2026-11-03 | G01/G02/G03/G04/G20/G21/G76/G92 的英文说明与格式 |
| FANUC 车床系统 A 的 M 代码说明字典（同上） | https://github.com/jmr1/vscode-ncproj/blob/main/conf/fanuc_lathe_system_a/desc/mcode_desc_en.json | 2026-11-03 | M03/M05/M30 的英文说明 |
| FANUC 专题技术站 · 圆弧插补 | https://www.helmancnc.com/fanuc-circular-interpolation-g02-g-code-example/ | 2026-11-03 | “G02 – Circular Interpolation Clockwise. G03 – Circular Interpolation Anti-Clockwise.” |
| FANUC 专题技术站 · G76 螺纹循环 | https://www.helmancnc.com/cnc-fanuc-g76-threading-cycle/ | 2026-11-03 | Two Line Format G76 Threading Cycle（FANUC） |
| FANUC 专题技术站 · G92 螺纹循环 | https://www.helmancnc.com/cnc-fanuc-g92-threading-cycle/ | 2026-11-03 | Fanuc G92 Threading Cycle / 直进式 |
| FANUC 专题技术站 · G04 暂停 | https://www.helmancnc.com/fanuc-g04-dwell/ | 2026-11-03 | G04 dwell 语义（P ms / X、U sec） |
| FANUC 专题技术站 · M 代码表 | https://www.helmancnc.com/fanuc-m-code-list/ | 2026-11-03 | M03 Spindle start forward CW / M05 Spindle stop / M30 End of program (Reset) |
| FANUC 31i G 代码参考（公开镜像，用于 G20/G21 交叉核对） | https://github.com/MaxDavis03/GCode-Anything/blob/main/G-Code%20Research/Fanuc%2031i%20G-Codes | 2026-11-03 | G20 Input in inch / G21 Input in mm / G76 Multiple threading cycle / G92 Thread cutting cycle |

> **降级披露（检索失败）**：FANUC 官方手册在线取回失败——
> `https://www.fanucamerica.com/support/manuals` 与
> `https://www.fanucamerica.com/products/cnc` 均返回 HTTP 403；
> `https://www.fanuc.co.jp/en/product/catalog/` 连接超时。故未取得官方 PDF 原文，
> 按派工单「检索失败 → 如实上报降级」执行：以 **FANUC 车床系统 A 的 G/M 代码说明字典**
> 与 **FANUC 专题技术站（Helmancnc）** 两份独立公开来源互证，并保留官方 URL 与失败码。

## 3. 逐行语义对拍

| code | 设计稿口径 | FANUC 口径（源 B） | 结论 |
| --- | --- | --- | --- |
| G01 | 直线插补 | Linear interpolation (Cutting feed) | 一致 |
| G02 | 顺时针圆弧插补 | Circular interpolation CW / Clockwise direction (CW) | 一致；desc 追加车床视图判向注记（见 §4） |
| G03 | 逆时针圆弧插补 | Circular interpolation CCW / Counterclockwise direction (CCW) | 一致；desc 追加车床视图判向注记（见 §4） |
| G04 | 暂停延时 | Dwell（G04 X/P/U） | 一致 |
| G20/21 | 英制 / 公制输入 | G20 Input in inch / G21 Input in mm | 一致；设计稿合并为一行，照录 |
| G76 | 螺纹切削复合循环 | Multiple-thread cutting cycle（两行式 G76 P… Q… R… / X Z P Q F） | 一致；desc 追加「仅 FANUC」注记（WAVE-PLAN §3 裁决 1；GSK/KND/华中 v0.2 待补） |
| G92 | 螺纹切削单循环 | Threading cycle（G92 X Z F Q） | 一致；v0.1 仅速查数据行，不生成程序（COVERAGE 待补 2b） |
| M03 | 主轴正转 | Spindle start forward CW | 一致（正转 = forward/CW） |
| M05 | 主轴停止 | Spindle stop | 一致 |
| M30 | 程序结束并返回 | End of program (Reset) | 一致（「返回」对应 Reset/程序复位返回） |

**分歧行数：0。** 无两源数值/语义冲突行。

## 4. G02/G03 判向口径与 src/core/arc.ts 契约对齐

`src/core/arc.ts` 的 `judgeArcDirection` 及其文件头（第 26–44 行）冻结视图约定：

- X 朝上（直径制）、Z 朝右，自 **+Y（操作者一侧）** 看；该图相对数学系（x 右 z 上）
  是转置系，定向翻转，故数学正叉积 = 车床图面顺时针。
- 前刀架：**顺时针 = G02**；`rearToolPost = true`（后刀架）时 G02/G03 翻转。

本表 desc 落为：
- G02：`图面顺时针＝前刀架 G02；X 上 Z 右、自 +Y 视；后刀架翻转`
- G03：`图面逆时针＝前刀架 G03；X 上 Z 右、自 +Y 视；后刀架翻转`

FANUC 口径（G02 = CW，G03 = CCW，G18 ZX 平面）与该视图约定相容；差异只在「按哪个
观察方向数顺/逆」——arc.ts 固定为自 +Y 看，本表 desc 明示同一观察方向，避免图面歧义。
`test/data-gcode-ref.test.ts` 用 `judgeArcDirection` 做交叉验证：圆心 (0,0)、起点 X+
（图面 12 点）、终点 Z+（图面 3 点）→ G02；起终点互换 → G03；后刀架 → 翻转。
