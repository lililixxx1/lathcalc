# G2-V4.11 快审报告（plan-code-reviewer，2026-11-08，轻量轮）

> 原文归档（agent agent_3d5867bf，29 次工具调用，独立复跑 tsc/vitest/eslint 三门禁全绿）。
> 裁决：**有条件通过（⚠️ 修后可合并）**；C-01/C-02/Minor 已由 Lead 当波整改（见
> ../README.md §四），整改为纯注释/文档级，逻辑零变动，终态门禁重捕于同目录四 txt。

## 五字段

### [结论] 有条件通过（⚠️ 修后可合并）
代码修复本身正确、六条验收全过、门禁独立复跑全绿；但缺陷机理叙述与代码事实不符
（"页签切换写 URL"的写入方在代码中不存在），证据档与源码注释各有一处失实表述需修正
后方可归档关账。

### [已核对]
| 项 | 核对结果 |
|---|---|
| V1 tsc | 档 gate-tsc.txt REAL_EXIT=0；独立复跑 REAL_EXIT=0 |
| V2 vitest | 档 gate-vitest.txt REAL_EXIT=0、732/732（58 文件）；独立复跑 REAL_EXIT=0，732/732（ui-p02 23 测含新增 3 全过） |
| V3 build | 档 gate-build.txt REAL_EXIT=0、dist/assets/index-Ci7fNikV.js 与验收一致（未独立复跑，V1/V4 已超额抽查） |
| V4 eslint | 档 gate-lint.txt REAL_EXIT=0；独立复跑 REAL_EXIT=0 |
| V5 逻辑审 | 全过：①白名单恢复 `FAMILY_TABS.find(...)?.value ?? 'metric'`，null/非法静默回退不抛错；②恢复态与点击态等价——挂载序列覆盖点击路径全部五同步，初始态 `coarse='all'/query=''/pitchMode=false` 与点击重置一致，Segmented 构造 `value:family` 初始 `.on` 落对；③syncBadge 潜伏缺陷叙述属实（TopBar 构造写死 FAMILY_TABS[0]，原挂载序列确无 syncBadge）；④destroy=stop 移除 hashchange 监听无泄漏，start 重读 hash 渲染冷启动模拟真实，微任务序保证渲染先于排队 hashchange 且幂等早退；⑤scrollIntoView 同款先例 SegChip.ts:75；⑥数值核：π×1=3.142（wormGeometry）、8−0.5×1.5=7.250（deg30Tr.d2Factor=0.5）、行数交叉引用属实；IAB 截图独立目检复核（GB/T 10087 徽标、蜗签高亮、m1→3.142、m1.25→3.927=π×1.25、m2→6.283=2π、左缘渐隐） |
| V6 纪律 | 过：冻结三参考件未动；team-prompt/ 与 .zcode-site.json 被忽略不入 git；测试期望值全部附算式+来源；runs/ 四门禁 REAL_EXIT=0 齐全 |

### [阻塞项]（Critical，关账条件）
- **C-01（置信度 100）缺陷机理叙述失实**：证据档 §一首行与 p02.ts 注释均称
  「页签切换写 #/p02?family=…（routeHash）」。穷尽核实：p02 页签 onChange 仅改本地态
  不写 hash；全仓 p02 入口均为裸跳（p03.ts:369、p04.ts:530、p01.ts:47）；hash 写点仅
  router.ts:262/274 与 TopBar.ts:69。App 内交互无法产生带 family 的 p02 URL，该 URL
  只能来自手工构造/外部分享链接。修复本身成立（深链/书签/分享直达生效，与 p03 对齐）。
  附带：p03→p02 返回（TopBar back 回裸 #/p02）落 metric 为另一可达预存场景，本波不
  覆盖，登记即可。

### 建议改进（不阻塞）
- C-02：src/ui/README.md §5.2 无「p02 family 直达」行，而 §5.3 规定新键须先入 §5.2
  ——应补登记行。
- Minor：README §四引用 runs/g2-review.md 尚不存在（即本报告）。

### [最小修复指令]
1. 证据档 §一首行改真实机理（深链不生效，非「只写不读」）+ 加注 p03→p02 返回场景登记移交。
2. p02.ts 注释删「页签切换会写」表述，改「外链/书签冷挂载读参恢复（对齐 p03 直达）」。
3. src/ui/README.md §5.2 补 p02 族直达登记行。

### [复验命令]
```
cd "C:\Users\Administrator\Desktop\ccc\q-novel\CNC Machinist Calculator" && npx eslint . && npx tsc --noEmit && npx vitest run
```
