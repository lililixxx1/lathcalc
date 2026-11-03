# W2-C4 证据档（arc 工况 01–06 · worker-2）

- 结论：六切点工况求解器，半径空间 (z, r=X/2) 纪律，判向全部经 judgeArcDirection，不变量残差最大 1.776e-15 ≪ 1e-9，p06 mock 值零引用；G1 复验通过，收获 ac6bd0d。
- runs/：gate1-tsc.txt（REAL_EXIT=0）· gate2-vitest.txt（7 文件 32 tests，REAL_EXIT=0）· gate3-build.txt（REAL_EXIT=0）。
- 判定行：W2-G2 通过（2026-11-03，复审报告"逐卡裁决 C4 通过"）。
- 备注：四项几何约定（AC04 L=R1+R2 / X0 基准 / rearToolPost 可选键 / 模型约定）裁决全保留，文档化于 arc-cases-a.ts 头注（TASK-LEDGER W2-C4 行）。
