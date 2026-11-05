# V4.2-P06 · v0.3.1 补丁证据档（p06 大图标注层）

> 触发：用户反馈（2026-11-05，站点上线后第一条）——「圆弧切点中图形没有标注」。
> 计划：`docs/plan/WAVE-PLAN-V4.2.md`（§3 冻结坐标表 + §3.1 R1 修订）。
> 裁决：推翻 DEVIATION W4-C3-03 几何半（V4.2-01）；数值半维持不采用。

## 门禁（A1）

终态四门禁 4×REAL_EXIT=0，**48 files / 548 tests**（544+4，零删）：`runs/gate-final.txt`。
新测试 4 条（test/ui-p05.test.ts）：①hero 12/12 案文字键集=§3 表 + 圆心灰点 + 虚线半径
②thumb 回归纯线稿（零 text/零虚线/零 la-sub）③hero 零内联十六进制（契约 §4.2）
④p06 集成 AC01 大图键集入页。

## A4 两轮（tools/verify-p06.mjs，CDP Emulation 390×844@2x mobile 必带）

- 首轮三案三拍 ok（937ms）：vision-reader 判 **AC01 PASS / AC12 PASS / AC05 WARN**——
  stepX/stepZ 尺寸线方向语义转置（直径键应竖、轴向键应横）+ 文字贴线 + 素线无刻记。
- R1 修复（§3.1）：AC05 重锚+标签换位；AC06/AC07 同病换位修正（未拍案一并修）；
  **12 案全部尺寸线加端刻记**；文字-线距 ≥0.8 viewBox 单位。
- 二轮四案四拍 ok（1428ms，REAL_EXIT=0，0 异常 0 console error）：判定见 `runs/a4-verdict.md`。

## 工装勘误（一轮留痕）

首版 verify-p06 收尾 rmSync 清理 Chrome 临时 profile 在 Windows 撞 EPERM（Chrome 退出滞后
文件锁）致退 1——报告本身 ok:true。修：kill 后 sleep 1500ms + 清理 best-effort try/catch
（临时目录归系统清理，不影响判定与产物）。

## 索引

| 文件 | 内容 |
| --- | --- |
| `tools/verify-p06.mjs` | 四案四拍工装（DOM 键集断言 + 390×844@2x 截图；沿革 verify-w5→w7→w8→w12） |
| `runs/verify-p06.json` | 二轮机器报告（ok / 1428ms / 4 shots / 0 异常） |
| `runs/p06-ac0{1,5,6}-annot-390x844.png`、`p06-ac12-annot-390x844.png` | 二轮四拍 |
| `runs/p06-ac05-annot-r1-390x844.png` | 首轮 AC05（WARN 原样留档，被 R1 取代） |
| `runs/gate-final.txt` | 终态四门禁原始输出（548/548） |
| `runs/a4-verdict.md` | vision-reader 两轮判定汇总 |
