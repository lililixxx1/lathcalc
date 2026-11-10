# V4.12-B 证据档 · 数字键盘全站统一

- 任务：数字键盘全站统一——p06/p07/p08/p11/p12/p16 六页接入底部数字键盘，p09 重构到共用
  `createKeypadController`（零行为漂移），负号经新增 ± 键支持 signed 字段。
- 用户指令：2026-11-10「有的页面有数字九宫格有的没有，统一一下」。
- 设计偏离背书：冻结设计稿本仅 p09 有键盘；九宫推广与底行 3→4 键为用户指令背书的
  设计偏离，由 Lead 登记台账（worker 不登记）。
- 基线 commit：f504f3d（隔离树 `LathCalc-trees_V412B`）。

## runs/ 索引（一命令一档：命令全文 + 原始输出 + REAL_EXIT）

| 档 | 命令 | 判定 |
| --- | --- | --- |
| `01-tsc-noEmit.log` | `npx tsc --noEmit` | REAL_EXIT=0 |
| `02-vitest-run-full.log` | `npx vitest run --maxWorkers=2` | 58 files / 756 tests 全绿，REAL_EXIT=0 |
| `03-npm-run-build.log` | `npm run build` | vite build + PWA generateSW 完成，REAL_EXIT=0 |
| `04-ui-p09-zeroedit.log` | `npx vitest run test/ui-p09.test.ts --maxWorkers=2` + 基线对拍 | 17 tests 全绿 REAL_EXIT=0；与 f504f3d blob 内容逐字一致（仅行尾 CRLF，见「未决点」） |

## 判定行（摘录自各档原始输出）

```
01: REAL_EXIT=0                                          （npx tsc --noEmit）
02: Tests  756 passed (756) / Test Files 58 passed (58)  REAL_EXIT=0
03: built in 502ms + PWA precache 43 entries             REAL_EXIT=0
04: Tests  17 passed (17)  REAL_EXIT=0 + CONTENT_IDENTICAL=yes / REAL_EXIT_DIFF=0
```

## 结论

验收标准 1–5 全部满足：

1. 六接入页测试各新增 ≥3 条断言（键盘存在 `.rc-keypad` 非空 / 13 键、键入副作用打到具体值、
   p16 teeth 不接键盘断言）——详见下表；ui-components 13 键断言改写 + KeypadController
   契约断言（keypadEl 幂等 / 高亮类 / sign 置灰随 signed / 编辑规则 / maxLen / el-即-input
   分支 / 无 active no-op）。
2. `test/ui-p09.test.ts` 零编辑全绿（17/17，档 04 含与基线 blob 的逐字对拍）。
3. `npx tsc --noEmit` 退出码 0。
4. `npx vitest run --maxWorkers=2` 退出码 0（全量 756/756）。
5. `npm run build` 退出码 0。

## 各页接入摘要（字段 / signed / 白名单）

| 页 | 接入字段（register 键名） | signed | 白名单 allowed | 键盘位置 | 备注 |
| --- | --- | --- | --- | --- | --- |
| p06 | 逐案 `arcCase.inputs`（R/R1/R2/angle/stepD/stepX/stepZ/dX/dZ/lead/boreD） | 仅键名 `stepZ`、`dZ`（默认负值源现 p06.ts:111 AC05 stepZ='-10'、:113 AC07 dZ='-30'、:114 AC08 dZ='-4'；派工单锚 110/112/113 为改动前行号——本卡 import 增一行后整体偏移 1，动手前双盲复核时与锚逐条一致） | 缺省（全部已注册） | renderCase body 末尾 | 工况选择器兜底视图（无输入框）不接键盘，防死键盘 |
| p07 | 计算视图 `big`/`small`/`length`；反推视图 `taperC`/`big`/`small`/`length` | 全 unsigned（taperC 为正数比率，G0 已核） | 按模式：calc 三键 / reverse 四键 / morse 全屏蔽 | body 末尾（分段与内容之后） | 两模式字段名共用但落不同 state 属性 → keypadTexts 按模式重映射 + keypadApply 路由写回；莫氏对照视图无输入字段，按键 no-op |
| p08 | `nominal` | unsigned | 缺省 | body 末尾 | nominalText 真值源，keypadTexts 单键同步 |
| p11 | 动态 `field.key`（D/L、S/L、D/t/L、W/T/L） | unsigned | 缺省 | body 末尾 | state.values 整体为 texts；形状切换改为原地清空重填保持引用稳定（行为不变） |
| p12 | 模式字段集（sss a/b/c、sas b/c/A、asa A/B/c、ssa a/c/A） | unsigned | 缺省 | body 末尾 | 裸 input 直接 register（契约「el 本身是 input」分支） |
| p16 | `p`、`t` | unsigned | 仅 `p`/`t`（**teeth 齿数串排除、不接键盘**） | body 末尾（resultsWrap 之后） | teeth 未 register 且白名单排除，双保险 |
| p09 | `d`/`vc`/`rpm`/`f` | 无 signed 字段（sign 键恒置灰） | 沿用原 allowed 判定（mode 相关） | body 末尾（先例位） | 重构到 controller：del/'.'/数字/maxLen=10/allowed/'0' 替换语义逐条一致 |

## 新增测试断言统计（预期登记 ≥21 条对拍）

按新增测试用例计：p06 +4、p07 +4、p08 +3、p11 +3、p12 +3、p16 +3 = 20 条（每条用例内含
≥3 个 expect 断言，总量远超 21）；ui-components 另 +4（13 键序 / signDisabled /
controller 契约 ×3）。p09 新增 0 条——其验收载体是零编辑既有键盘用例全绿（预期登记已
声明该口径）。全量 756/756。

## 未决点

1. **树内全树 CRLF 行尾**：建树管线（git archive + autocrlf）产物，全部文件带 CRLF。
   本卡未改动任何文件行尾；`test/ui-p09.test.ts` 与基线 f504f3d blob 经
   `diff --strip-trailing-cr` 逐字一致（档 04）。零编辑判定按内容成立；收获时如需
   行尾归一由 Lead 在收获侧统一处理，worker 不做全树改写。
2. **p06 工况选择器兜底视图未接键盘**：该视图无任何输入字段（12 工况 chips + 提示卡），
   接键盘即死键盘。派工单锚（p06.ts:277 附近 InputRow）仅指计算视图，已按锚接入；
   此取舍如需推翻请 Lead 裁示。
3. **p06 '-' 中间态求解容错**：sign 键入产生 `'-'` 或空串时，renderResult 走既有
   「请输入有效参数 / 参数不是有效数字」WarnCard 分支（现 p06.ts:338-346 守卫先于
   solve:351，守卫不通过即 return，不进 core），
   不抛异常、不进 solve；与软键盘手输 '-' 行为一致，零新增偏离。无 solve 异常，故
   不触发派工单「sign 语义冲突上报」条件。
4. **src/ui/components/index.ts 无改动**：barrel 已用 `export * from './Keypad'`，
   新符号（`KeypadController` / `KeypadControllerOptions` / `createKeypadController`）
   自动随文件导出，无需编辑；派工单交付物列为「修改 index.ts（导出新符号）」，
   实际零改动即达成导出目的。
5. **KeypadController 实现位置**：契约注释「Keypad.ts 追加导出」——实现连同接口全部
   追加在 `src/ui/components/Keypad.ts`，未新建文件。
