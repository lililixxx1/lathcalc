# V4.14 G2 完整轮归档（plan-code-reviewer，2026-11-11）

## 第一轮：有条件通过（⚠️ 修后可执行）→ C-V414-01

合并裁决原文（要点全录，五字段）：

- **[结论]** 有条件通过（⚠️ 修后可执行）。条件 C-V414-01（工具入库）+ I-1（README
  数值勘正），一个修复提交关账。
- **[已核对]** 验收标准逐条（均附退出码）：五步门禁 5×0（tsc/vitest 787+4skip/
  build/eslint/第五步 PERF_BUDGET 4 passed——reviewer 独立复跑 tsc EXIT=0 与
  PERF_BUDGET EXIT=0 两项）；verify-stage FAIL=0/30；verify-preload pass:true +
  MATCH(md5)（revision 逐位同 + p01-CpxrjPA0.js 在盘实测）；性能对拍（冷 LCP 中位
  80→76、暖 68→72 复算命中、+1264B=17649−16385 复算）；数值纪律抽查（163 双路径/
  283890=ceil(270371×1.05)/appLeft 四值/appLeft 公式）全复算逐位命中。
  审面五项专项：①计划符合性通过（G0 三条件全落地，--la-line→--la-border 勘正留痕）
  ②代码通过（Tile.ts 零改动 C-02、V4.13 scoped 规则 diff 证纯追加、ui-stage 第 3 测
  = C-02 常驻回归网）③证据自含（除 B-1 外过；g1-verify-run.txt REAL_EXIT=1 保留
  FAIL 复现档=「未重写」最硬实证）④**L1 裁决判定成立非粉饰**（五要件：底层零改动/
  原口径披露保留/原 FAIL 档未重写/README 双处披露/冻结计划不动；口径实质=断言从
  写死列数改为写死冻结公式，更紧绑定非放松；pageW==540 独立锚 + Math.max(2) 保底
  堵自洽漏洞；附录 C 裁定：口径修正）⑤「p05 hero」实名勘正合规（p05.ts:289 导出/
  p06.ts:255-256 消费点代码坐实；与 V4.12-02「事后补档=伪造冻结时点禁」方向一致；
  reviewer 对 hero-p06-768.png 独立视觉复核与 vision 2/2 相符）。
  独立复算留痕 4 项：tsc EXIT=0；PERF_BUDGET EXIT=0；python 五式逐位（ceil=283890、
  (508+9)//172=3、(493+9)//172=2、(358+9)//172=2、(768−542)/2=113.0、17649−16385=1264）；
  git show 08d89df --stat 43 文件零越权 pathspec。
- **[阻塞项] C-V414-01**：L1 口径版 `docs/evidence/V4.14-A/tools/verify-stage.mjs`
  （工作区 M，提交版=25 格旧口径）与主仓终包版 `docs/evidence/V4.14-B/runs/
  verify-preload.json`（工作区 M，提交版=树 B 期值）未入库——fef2d4c 检出态复跑得
  25 格 FAIL=1 ≠ 已提交 30 格 FAIL=0，自含链断裂（附录 G）。定性=集成提交漏收口
  （非伪造：输出档真实/diff 透明/HEAD 代码独立复跑真实绿）。
- **[最小修复指令]** 一个修复提交：两文件入库（工作区即实跑版）+ I-1 README:55
  「pageLeft=114」等式勘正（(768−542)/2=113≠114 且无档）+ I-2 复跑命令补记。
- **[复验命令]** git status 无 M；HEAD:verify-stage.mjs grep ≥2；HEAD:verify-preload.json
  grep=2；README 无 pageLeft=114。

Minor 三条：WAVE-PLAN §2 表 168px desync（下波清理）；V4.14-A README 索引未列 g1-*；
真机横屏 overlay 侧留证缺（推断侧）。优点段（收获纪律模范/V4.13 教训吸收/G1 诚实度/
数值四级同源/插件干净）见审核原文。

## 整改回执（Lead，修复提交 402883e）

- 两文件入库（verify-stage.mjs L1 口径+p05 实跑版；verify-preload.json 272209/
  index-DsdmcUIB 主仓终包值）；I-1 勘正（改引 runs/verify-stage.txt appLeft=113=
  (768−542)/2 复算逐位）+ 探针空值根因披露；I-2 机检复跑命令行原文补记；
  Minor 3 按裁定登记（DEFERRED #23）。

## 第二轮复审：通过（✅ 可合并）

- 四复验命令逐条过：git status 无输出；HEAD:verify-stage.mjs grep=**4**；
  HEAD:verify-preload.json grep=**2**；README 无 pageLeft=114（grep 退出码 1）。
- 402883e --stat 恰 3 文件无夹带、父=fef2d4c、冻结件零触碰；I-1 等式复算正确
  （113.0 与 verify-stage.txt:14 逐位同）；I-2/根因披露落地。
- **关账确认**：C-V414-01 + I-1 + I-2 全关账；Minor 前两条登记下波（DEFERRED #23）、
  第三条随提交顺带解决；CONDITIONS 无 V4.14 未关账项，G3 门槛清空。
  波次继续：tag v0.8.0 → 重部署。
- 非阻塞观察项：README §五复跑命令 CHROME 带盘符绝对路径，建议统一占位符写法
  （附录 G 可公开态惯例；不含机器身份信息，仅观察）——并入 DEFERRED #23 顺手项。

## 遗留披露

- stage-p01-844x390.png reviewer 侧视觉判读未成行（CDN 传输解析错误两次）——该档
  有 verify-stage.txt 机检数据佐证（tileCols=2 L1 口径行/appLeft=151），非档缺失。
- 真机横屏 overlay 滚动条侧 3 列为 L1 裁决推断侧陈述（桌面侧 493→2 有档实证）——
  有真机横屏拍证机会时补档。
