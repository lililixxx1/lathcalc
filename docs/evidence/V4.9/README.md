# WAVE-PLAN-V4.9 证据档 · v0.7.0 全站图形化收口

用户反馈 #6（2026-11-07「螺母没有图形展示螺纹形状，再看下其他项目，能用图形展示的尽量都用图形展示」）
→ p03 牙型剖面（A 卡）+ p11 料型双视图 / p09 切速图（B 卡）+ p10 切削三要素（C 卡，Lead 补位）。
计划冻结 8b1bbb9；交付 efa7454（A 收获+集成）← 943351e（B 收获）← eb3a00f（C 卡）。

## 一、四门禁（Lead 亲跑，终态 = A4 勘正修复后）

| 门禁 | 结果 | 留证 |
| --- | --- | --- |
| tsc --noEmit | 0 | runs/gate-tsc.txt |
| vitest run | 726/726（58 文件） | runs/gate-vitest.txt |
| build | 0，dist `index-BH_Y46GF.js` | runs/gate-build.txt |
| lint | 0 | runs/gate-lint.txt |

均含 `REAL_EXIT=0` 行，路径脱敏 `<REPO>`。

## 二、A4 终态验证（16 拍，390×844@2x，tools/verify-pro.mjs 血统 pro）

- 机检：`runs/verify-pro.json` ok=true（16 shots / exceptions 0 / consoleErrors 0），
  precheck dist bundle = `index-BH_Y46GF.js`，preview 服务哈希与 dist 一致（V4.8-R2 纪律）。
- 判读：p03 六张 + p11/p09/p10 十张全部 PASS（0 WARN 0 FAIL）。
  p11 L 标签净空专项：`L_LABEL_DY` 8→9 修复后 6 张全部 4 行全白（@2x）≥3px 口径。
  p11-keepframe 逐像素保帧（0/213000 差异）；p09-mode 与 default 几何逐像素一致
  （差异仅 Vc 文字 14×11px 包围盒内）。

## 三、A4 两处勘正（本轮证据档关键披露）

1. **harness 拍 URL 笔误（工具侧，非产品缺陷）**：p03-pipe55 首跑超时——路由族键是
   `pipe`（`pipe55` 仅为 dataFamily），`family=pipe55` 使 readParams 判非法降级「请先选型」。
   tools/verify-pro.mjs 已勘正并注明。
2. **A 卡布局缺陷（vision 终轮 5 拍 FAIL 同模式，Lead 集成期修复）**：宽度约束生效时
   牙型带满幅 x∈[10,210]，右端上升牙侧斜线扫过 x≈170-210 全带竖向区间，与右对齐 x=208
   悬浮的 d₂/d₁（蜗杆「分度线」）标签几何必然相交——线穿字（metric/Tr/pipe55/sealpipe
   各一处 + worm「分度线」整行被穿）。vision 预判轮时 A 卡未到货故漏至终轮。
   **修复**（`V4.9-A4 勘正`，源码注释与测试头注 ③ 同款披露；G2 复核后标签列
   右锚 254→**256**、净空推导勘正为 9 字符口径）：
   - viewBox 220→**262**，带左对齐 x0=10（原居中），右侧标签列右锚 x=256（真实
     最长标签 9 西文字符 'd₂ 36.500' est. 44.37u → est. 左缘 211.6，距满幅带
     右缘 210 est. 净空 1.6u；10 字符仅手工 URL 极端案可造、真实字宽下净空 ≥5u）；
     UI 卡 viewport 326×140 时 scale=1，**字号物理尺寸与牙型比例零损失**
     （k 式 200 预算不变，全部 y 锚不变）。
   - 视图模型增派生字段 `bandRight`（UI 直径线右端与标签列起点依据，契约 §2 派生
     字段允许、此处披露）；UI 直径线 [10,bandRight]、标签右对齐 x=254。
   - 顺手消除：sealpipe 基面线顶端与 P 1.814 文字紧贴（右缘 108.6→102.3，复判实测
     净空 ~17px@2x）。
   - 测试：k/y 锚全不变（M10/Tr/worm 满幅案 x0 恰仍=10），G 案 x0 16.2939→10、
     新增 bandRight 断言（210 / 197.4122）；复判 6/6 PASS。

## 四、集成期顺手修清单（efa7454 已披露 + 本档）

- `stock-figure.ts` L_LABEL_DY 8→9（vision 预判轮系统性 WARN；round 案线 139+9=148<150）。
- `gear-figure.ts` Minor-2 补注（轴注字顶 139.7=147−8×0.91 推导）。
- 计划 §3 d₂ 线字面锚 38.02/44.00 勘正 72.66/58.29（半距误置，构造链值；G0 复算漏检，
  worker 上报后 Lead 独立复算裁决选项 A——双盲复算纪律见 DEVIATIONS V4.9-01）。
- 本档 §三.2 A4 布局勘正（本提交）。

## 五、目录索引

- `tools/verify-pro.mjs`：16 拍 harness（SCENARIOS 含拍预期；头注含 p09-redraw 语义勘正）。
- `runs/`：四门禁留证 + 16 张 PNG + verify-pro.json。
- `V4.9-A/`、`V4.9-B/`、`V4.9-C/`：三卡各自 README + 门禁 + 锚复算（worker/Lead 原始证据）。
- 契约偏离：A 卡 8 条披露于 V4.9-A/README；B 卡 7 条披露于 V4.9-B/README §5（§2 预授权内）。

## 六、G2 完整轮（plan-code-reviewer，2026-11-07）

裁决 **PASS-with-minors**（0 Critical / 2 Important / 4 Minor）；四门禁 reviewer
亲跑独立复现 4×0、726/726；15 文件全覆盖；d₂ 勘正链 72.66/58.29、G 案 k=41.3192、
bandRight 197.4122、scale=1 论证均逐值复核通过。

整改处置（本波顺手清，随 G2 整改提交）：
- Important-2 标签列推导 9 字符口径 + LABEL_COL_X 254→256（零测试耦合）。
- Minor：p10/ui-p10 「恰在圆缘」假算术注释勘正；计划 §1/§2/§3 viewBox 220→262
  回注（勘正卫生对称）；V4.9-A/README §5.5 加 A4/G2 后记。

登记下波（不在本波修）：
- Important-1 牙型垂直 2× 径向拉伸（k=96/(d−d₁) 分母系直径差而带高画直径差·k，
  牙侧视觉角 arctan(tan(α/2)/2)≠α；源于冻结计划锚本身——§3 M10 牙顶 20.70/
  牙根 107.30 即 86.6px 带，实现忠实；修法=垂直改真径向并修订计划锚，按冻结
  参考件缺陷纪律登记）。
- Minor：thread-figure LATIN_CHAR_W 4.93 与 stock/speed/gear 5.5 两套西文估宽统一
  （动测试锚，随 Important-1 一并）。
