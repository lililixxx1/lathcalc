# V4.11 证据档 · v0.7.2 p02 URL 族参冷启动修复（反馈小修波，Lead 直改）

上游：2026-11-08 车工走查（用户「你是一个车工，你用这个网站，看看有什么问题」→ 终报
坐实缺陷 1 条；用户裁决「修」）。范围外不动：SW 回访陈旧缓存（观察项，涉及 workbox
激活策略另行评估）、p06 起点切点 / p15 椭圆宏默认区间 / p03 Tr 小径符号 d₃（建议级）、
p02 页签态不进 hash（刷新落 metric，预存行为，G2-V4.11 C-01 登记移交——见 §四）。

> **机理勘误（G2-V4.11 C-01）**：走查终报原叙述「页签切换写 #/p02?family=…、挂载不读
> （只写不读）」前半失实——p02 页签 onChange 只改本地态不写 hash（p02.ts，与 p15 tpl
> 「页面内切换不写回 hash」同款预存设计），App 内交互无法产生带 family 的 p02 URL；
> 该 URL 只出现于手工构造/外部分享链接。真实缺陷 = **深链不生效**（挂载
> `let family='metric'` 写死不读参，p03 同链路读参，行为不一致）；修复 = 深链/书签
> 直达恢复生效，与 p03 对齐。

## 一、缺陷与修法（2 文件 +24/−2）

| 项 | 修前 | 修法 | 文件 |
| --- | --- | --- | --- |
| 深链族参不生效 | `#/p02?family=…`（手工构造/外部分享/书签）冷挂载恒落「普通 M」——`let family='metric'` 写死不读路由参；p03 同链路读参，行为不一致 | 挂载读 `ctx.params.get('family')`，FAMILY_TABS 白名单命中即恢复；非法/缺省静默回退 metric（路由键口径 pipe≠pipe55，README §5.2；§5.2 已补 p02 族直达登记行） | p02.ts:168-174 |
| 徽标挂载不同步（连带暴露的潜伏缺陷） | TopBar 徽标构造写死 FAMILY_TABS[0]（GB/T 193），挂载序列只调 syncHint 不调 syncBadge——此前恒从 metric 挂载故未暴露；恢复非米制族时徽标与列表错位 | 挂载序列补 `syncBadge()`（与 syncHint 对称） | p02.ts:428-431 |
| 恢复页签不可见 | URL 恢复蜗杆（第 7 签）时激活签在横滚视口外，用户看不到当前族 | 挂载后激活签 `scrollIntoView({inline:'nearest'})`（与 Segmented 点击自带同款，SegChip.ts:75 惯例），再 syncSegFade 初判 | p02.ts:433-438 |

新增测试 3（ui-p02.test.ts V4.11 describe）：冷启动模拟 = 置 hash 后 destroy + 重建
router + start（非 navigate 路径，真验 render 读 ctx.params）。预注册预期 = 恢复态与
页签点击态逐项等价：① worm 直达（GB/T 10087 / 蜗签高亮 / 15 行 / m1 预览 3.142=π×1
/ 粗牙细牙禁用）；② trapezoid 直达（GB/T 5796 / Tr8 × 1.5 首行 d₂ 7.250=8−0.5×1.5）；
③ 非法 family=pipe55 静默回退（GB/T 193 / 149 行 / 粗牙可用）。

## 二、四门禁（bump 0.7.2 先于跑门禁，V4.7-M2 时序）

| 门禁 | 结果 | 留证 |
| --- | --- | --- |
| tsc --noEmit | 0 | runs/gate-tsc.txt |
| vitest run | **732/732**（58 文件，729+3） | runs/gate-vitest.txt |
| build | 0，dist `index-Ci7fNikV.js` | runs/gate-build.txt |
| lint | 0 | runs/gate-lint.txt |

均含 REAL_EXIT=0。首跑 vitest 2 例失败暴露徽标潜伏缺陷（badge 断言 GB/T 193 ≠
GB/T 10087，family 本身已恢复）→ 补 syncBadge 后全绿；失败档已覆盖于
gate-vitest.txt 旧版，最终档为重跑全绿版。

## 三、IAB 机检（localhost:4173 preview，390×844，页面实跑 index-Ci7fNikV.js 与 dist 一致）

> SW 坑复演：4173 源 SW（V4.10 后回访重注册）拦截新资产 → 注销 + 删
> `workbox-precache-v2-http://localhost:4173/` 后二刷生效（首刷与注销竞态仍旧包）。

| 冷加载 URL（goto 全 URL = 真冷挂载） | 机检结果 |
| --- | --- |
| `#/p02?family=worm` | badge GB/T 10087 ✓ 蜗签 `.on` ✓ 首行 m1/3.142 ✓ 粗牙 disabled ✓ 蜗签 rect.x=329（滚入 390 视口）✓ segScrollLeft=95（真实滚动）✓ segwrap --l/--r 双挂（两端渐隐）✓ hint=轴向齿距 ✓ |
| `#/p02?family=trapezoid` | badge GB/T 5796 ✓ Tr8 × 1.5 / 7.250 ✓ scrollLeft=0（第 2 签无需滚）✓ 仅 --r ✓ |
| `#/p02?family=pipe55`（非法回退） | badge GB/T 193 ✓ 普通 M 高亮 ✓ M1 × 0.2 / 0.870 ✓ 粗牙可用 ✓ |

实拍一帧：runs/p02-worm-coldload.png（worm 冷加载态：蜗签可见高亮 + 双缘渐隐）。

## 四、G2 快审（plan-code-reviewer，2026-11-08）

裁决 **有条件通过（⚠️ 修后可合并）**：六条验收全过（V1–V6，含独立复跑 tsc/vitest/eslint
三门禁全绿、恢复态与点击态五同步等价逐项、destroy+重建冷启动模拟真实性、IAB 截图独立
目检复核）；阻塞项 **C-01 = 缺陷机理叙述失实**（「页签切换写 URL」的写入方在代码中不
存在——onChange 只改本地态，全仓 hash 写点仅 router navigate/replaceState 与 TopBar
back；带 family 的 p02 URL 只能来自手工构造/外部分享）+ C-02（§5.2 未登记新键）+
Minor（g2-review.md 归档）。全文见 runs/g2-review.md。

**整改（本波当清，纯注释/文档级、逻辑零变动）：**
- C-01：p02.ts 注释与本文档 §一/档首机理勘误块已改写为真实机理（深链不生效，非「只写
  不读」）；p03→p02 返回落 metric 预存场景登记移交（本波不覆盖，见档首范围外清单）；
- C-02：src/ui/README.md §5.2 补「p02 族直达 | family | 缺省/非法回落 metric
  （页面内切页签不写回 hash，同 p15 tpl 先例）」登记行；
- Minor：本报告已归档 runs/g2-review.md。
- 整改后终态四门禁重捕（新包哈希见 §二），IAB worm 冷加载复探见 §三末行。

## 五、目录索引

- `runs/`：四门禁（终态）+ p02-worm-coldload.png + g2-review.md。
- 上游走查：本会话车工走查终报（2026-11-08，conversation 记录）；v0.7.1 线上版。
