# V4.3-FIG · v0.4.0 参数化图形试点证据档（p06 AC01/AC05）

> 触发：用户第二条反馈（2026-11-06）——「展示的图形能否随着数值的变化而变化」；
> 用户裁决「先试点 2 案看效果」（AC01 + AC05，效果满意后再决定推广其余 10 案）。
> 计划：`docs/plan/WAVE-PLAN-V4.3.md`（§2 契约 / §3·§4 几何规格与金锚 / §3.1 R1 修订）。
> 裁决：DEVIATION V4.3-01——v0.3.1「数值半」在参数化图形上推翻（形值同源，回显
> 求解器真值非 mock）；静态 10 案与全部 thumb 不变。

## 实现（Lead 直改，用户反馈补丁先例）

- `src/core/arc-figure.ts`（新）：纯函数图形规格——solve() 单源 + 四分之一弧起点
  导出 + bbox 等比映射（内框 [4,60]×[3.5,30.5] 保圆）+ 值标签；`PARAMETRIC_CASES`。
- `src/ui/pages/p05.ts`：`arcCaseParametricSVG`（SVG 装配，token 色，零几何）。
- `src/ui/pages/p06.ts`：onInput 前刀架求解成功即重建大图；异常保上一帧
  （结果区已呈 WarnCard）；非试点 10 案静态 hero 不重绘。
- A4-R1（§3.1）：显示段（切线/直腿）裁至轴线 r≥0（α 小/R 大穿轴压 Ø 标签），
  弧=求解实体不裁；R 标签避让 2.2→3.0。

## 门禁（A1，R1 后终态）

四门禁单独整句执行退出码均 0，**50 files / 572 tests**（548+24：arc-figure 18 +
ui-p06-param 6；零删，修订既有断言 1 条=ui-p05 p06 集成键集随 V4.3-01 语义更新）：
`runs/gate-final.txt`。

## A4 两轮（tools/verify-v43.mjs，CDP Emulation 390×844@2x mobile）

- 机器对拍（两案×两输入 + AC02 静态抽拍，5 拍）：ok 986ms / 0 异常 / 0 console
  error / 两案 figureChanged=true（path d 集随输入变化）+ 标签集=输入真值
  （AC01 R5/α45°/Ø36→R12/α30°/Ø50；AC05 R4/Ø20/Z-10→R8/Ø28/Z-16）：
  `runs/verify-v43.json`。
- 首轮 vision-reader 判定：A 随值变化 **PASS**（像素差分 2.71%/2.57% + 形变实测：
  AC01 基线 140→178px、倾角 45°→30° 目测一致；AC05 圆角跨度约翻倍）/ B 标签真值
  **PASS**（五拍图上=输入框逐项一致）/ C 图面质量 **WARN**（AC01 R12 拍直腿显示段
  穿轴线压 Ø50 文字——2.4R 定长腿 α 小时必越轴）/ D 静态回归 **PASS**（AC02 符号
  层+灰点+虚线+端刻记齐备）/ E 几何语义 **WARN**（AC05 径向比例尺随 bbox 归一，
  Ø/Z 视觉幅度弱——登记试点观察项，比例尺固定属推广期决策）。总判：通过（无 FAIL）。
- R1 处置后二轮复审：见 `runs/a4-verdict.md` 终判节。

## 工装勘误（一轮留痕）

首跑 timeout：vite preview 只绑 ::1，`http://127.0.0.1:4173/` 不通（curl 000）——
URL 改 `http://localhost:4173/` 后过（v0.3.1 会话时 127.0.0.1 可用，本次环境差异）。

## 索引

| 文件 | 内容 |
| --- | --- |
| `tools/verify-v43.mjs` | 两案×两输入对拍 + AC02 静态抽拍工装（DOM 断言标签集与 path d 变化 + 截图；沿革 verify-w5→w7→w8→w12→p06） |
| `tools/crop-a4.py`、`measure-a4.py`、`measure2-a4.py` | vision-reader 判定留痕（裁剪/像素测量） |
| `tools/crops-a4/` | 判定用放大图与差分图（11+2 张） |
| `runs/verify-v43.json` | 机器报告（R1 后，ok/986ms/5 shots） |
| `runs/p06-ac01-param-{a,b}-390x844.png` | AC01 两输入对拍（R1 后拍） |
| `runs/p06-ac05-param-{a,b}-390x844.png` | AC05 两输入对拍 |
| `runs/p06-ac02-static-390x844.png` | 静态回归抽拍（v0.3.1 符号层不变；代码路径未动=git 可证，AC02 圆大小系设计稿 p05 冻结示意） |
| `runs/gate-final.txt` | 四门禁原始输出（572/572） |
| `runs/a4-verdict.md` | vision-reader 两轮判定汇总 |
