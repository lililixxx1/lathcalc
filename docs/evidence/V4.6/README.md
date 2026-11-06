# V4.6 · v0.6.1 收口打磨波证据档

> 触发：v0.6.0 交付后台账存货——G2-V4.4 三条 Minor（DEVIATIONS:135）、G2-V4.5
> M-1（DEVIATIONS:141）、A4 观察项（DEVIATIONS:136/142）。
> 执行形态：Lead 直改（V4.2/V4.3/V4.5 先例：单卡计划 + A4 两轮 + G2 完整轮，不走 G1）。
> 计划：`docs/plan/WAVE-PLAN-V4.6.md`（V4.6-01..05）。

## 范围与结论

| # | 项 | 处置 | 结果 |
| --- | --- | --- | --- |
| A | `test/triangle-figure.test.ts` 两处钳位注释几何勘正 | 注释按实算重写（高瘦未钳 y=7.0；扁宽 x=−8.05、w=18.05、左极点 (16,88)=C） | 完成 |
| B | p12 标签钳位定界不足（`a 45.83` 右缘≈222 越 220） | x 定界 [20,200]→[27,193]（最坏 8 字符半宽 25.5） | 完成 |
| C | AC04 R1/α 标签框相交 + R1/R2 被灰虚线穿框 | R1/R2 半径法向偏移 2.6→5.4；α 对角右上避让（0.64/步，避 R1/R2 框与圆心点） | 完成 |
| D | AC03 R2=5 小圆内标签压弧（A4-R1 判 FAIL） | 圆内放不下（字宽 7.42 > 直径 6.75）→ 圆外右侧 + 水平虚线引线；默认 R2=10 仍圆内 | 完成 |
| E | AC06 dX 标签被出口斜线穿框 | 移到出口端点右侧（半宽+1.0），右缘钳位 ≤59 | 完成 |
| F | kit 头注「零逻辑改动」与 sampleArc 增量矛盾 | 头注改为受控增量说明；计划 V4.4 §2 措辞校齐 | 完成 |
| G | a2.test:706 tS 第二分量符号笔误 | 注释勘正为 (9.196152,3.928203)/10 | 完成 |
| H | 证据工具 `node --check` | 两份工装复制入档前 node --check 通过 | 完成 |

不做（V4.6-06）：° 符号 1x 观感（V4.5-02 文本格式冻结）；AC12 轴线远离孔壁（内孔
几何必然）；AC11 单参数自相似（数学必然）。

## 实现期计划修订（如实披露）

1. **V4.6-03 首版不充分**：计划初版只做「圆内垂直居中」（基线 +2.8→+1.0），A4-R1
   判 FAIL——R2=5 时字宽 7.42 > 小圆直径 6.75，左右弧仍切字，且圆心灰点叠在文字行上。
   改为「圆内放不下→圆外右侧 + 水平虚线引线」（契约零变更，引线走既有 refDashes 层）。
2. **V4.6-02 首版副作用**：仅把 α 上移会落到 C1 圆心灰点上（A4-R2 判 α30° 不可读）；
   改为对角右上避让，并把两圆心点纳入避让集合（r=0.9+0.5 余量）。

## 门禁（A1，原始输出见 runs/gate-*.txt）

| 门禁 | 命令 | 结果 |
| --- | --- | --- |
| 静态检查 | `npx tsc --noEmit` | exit 0 |
| 测试 | `npx vitest run --maxWorkers=2` | **657/657** exit 0（652→657，+5） |
| lint | `npm run lint` | exit 0 |
| 构建 | `npm run build` | exit 0（PWA precache 42） |

## A4（三轮）

| 轮次 | 判定 | 内容 |
| --- | --- | --- |
| ROUND1（vision-reader 新实例，7 拍） | **FAIL** | 1 FAIL：AC03 b `R2=5` 圆内压弧+圆心点叠字；2 WARN：AC04 a/b 的 R1 标签被灰虚线穿框；AC06/p12 通过 |
| R1 修复 | — | AC03 改圆外右侧+引线；AC04 R1/R2 外移 5.4；α 上移避让 |
| ROUND2（新实例，7 拍） | **FAIL** | 1 FAIL：AC04 b `α30°` 落到 C1 圆心点被遮挡不可读；AC03 R2=5 圆外引线修复确认生效；AC06/p12 通过 |
| R2 修复 | — | α 改对角右上避让 + 圆心点纳入避让集合（pad 1.4） |
| ROUND3（新实例，AC04 两拍） | **PASS** | `α45°`/`α30°` 完整可读、无圆心点遮挡、无叠字；R1/R2 灰虚线穿框已消除；保留 2 WARN（R2=3 / R1=4 被小圆实线弧擦字，仍完整可辨，属已知残留） |

- 机检工装：`tools/verify-v45.mjs`（12 案×2 输入=25 拍）与 `tools/verify-tri.mjs`
  （8 拍）全量重跑；`runs/verify-v45.json` / `runs/verify-tri.json`：ok=true、
  exceptions=0、consoleErrors=0。
- 判定口径：FAIL=叠字/遮挡至不可读/越界裁切；WARN=紧贴或被线擦过但可读。
  两处保留 WARN 已登记为**已知残留**（不改锚法无法在拥挤工况内同时消除，收益 < 风险）。

## 索引

| 文件 | 内容 |
| --- | --- |
| `tools/verify-v45.mjs` | p06 全 12 案两输入对拍工装（复制自 V4.4-FIG，node --check 通过） |
| `tools/verify-tri.mjs` | p12 四模式 8 拍工装（复制自 V4.5-TRI，node --check 通过） |
| `runs/verify-v45.json` | 25 拍机报告（ok/标签集/图变断言） |
| `runs/verify-tri.json` | 8 拍机报告（ok/path 集/保帧） |
| `runs/gate-tsc.txt` / `gate-vitest.txt` / `gate-lint.txt` / `gate-build.txt` | 四门禁原始输出 + REAL_EXIT |
| `runs/p06-ac04-param-a|b-390x844.png` | AC04 两输入终版（α 对角避让后） |
| `runs/p06-ac03-param-b-390x844.png` | AC03 R2=5 圆外标签+引线终版 |
| `runs/p06-ac06-param-a|b-390x844.png` | AC06 dX 右移终版 |
| `runs/p12-sas-b-390x844.png` | p12 长标签 `a 45.83` 右界收紧终版 |
| `runs/p12-sss-default-390x844.png` | p12 默认 30/40/50 回归 |
| `runs/p06-ac01..ac12-param-a|b-390x844.png` | 其余 10 案全量回归拍 |
| `runs/p05-gallery-regression-390x844.png` | p05 图库缩略回归 |
