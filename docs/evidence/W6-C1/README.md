# W6-C1 证据档 · G76 / G92 方言双源取证

> 卡：W6-C1 ｜ 执行者：worker-2 ｜ 隔离树：`LathCalc-trees_T-W6C1` ｜ 基线 commit：`cd99856`
> 取证日期：2026-11-04 ｜ 本档自含：命令 / 原始输出 / 退出码 / 来源 URL / 逐字摘录
> 公开态：本档只含公开 URL、文档名、逐字摘录与相对路径；不含密钥、机器绝对路径。

## 索引

| 档 | 内容 | 结果 |
| --- | --- | --- |
| `../../research/g76-dialects.md` | 调研结论档：结论表（6 行）、来源表（11 条）、FANUC 基线、风险披露 | 6 行；enable 4 / keep-gray 2 |
| `runs/q01-bing-gsk980td-g76.txt` | Bing CN：GSK980TD G76 查询 | 结果污染，无可用命中 |
| `runs/q02-bing-hnc21t-g76.txt` | Bing CN：HNC-21T G76 查询 | 结果污染，无可用命中 |
| `runs/q03-bing-knd1000t-g76.txt` | Bing CN：KND1000T G76 查询 | 结果污染，无可用命中 |
| `runs/q04-360-gsk980td-g76.txt` | 360：GSK980TD G76 查询 | 二手文库命中，未取参数表 |
| `runs/q05-360-hnc21t-g76.txt` | 360：HNC-21T G76 查询 | 命中 HNC-21T 手册/课件线索 |
| `runs/q06-360-knd1000t-g76.txt` | 360：KND1000T G76 查询 | 仅通用 G76 课件 |
| `runs/q07-sogou-hnc21t-manual.txt` | Sogou：HNC-21T 编程说明书 | 命中 21ic 全文与 book118 扫描件 |
| `runs/q08-sogou-knd1000t-manual.txt` | Sogou：KND-1000T 手册（B12B-T00N-0001） | 命中 book118 扫描件 |
| `runs/q09-sogou-knd-g76-unit.txt` | Sogou：KND G76 P/Q 单位 | 命中两处独立问答，确认 μm |
| `runs/q10-sogou-knd-g92.txt` | Sogou：KND G92 格式 | 命中 KND 手册 + 泉威培训 |
| `runs/q11-360-hnc-g82.txt` | 360：HNC G82 螺纹单循环 | 确认 HNC 单循环为 G82 |
| `runs/q12-sogou-hnc21t-format.txt` | Sogou：HNC-21T G76 精确格式 | 命中课件逐字格式 |
| `runs/s01-gsk-988ta.txt` | GSK988TA 官方手册逐字摘录（G76/G92） | A 级 |
| `runs/s02-gsk-980tdc.txt` | GSK980TDc 官方手册逐字摘录（G76/G92） | A 级；与 988TA 单位口径不同 |
| `runs/s03-hnc8.txt` | 华中 8 型官方编程说明书逐字摘录（G76/G92） | A 级 |
| `runs/s04-hnc21t-21ic.txt` | 21ic HNC-21T 专题文章逐字摘录 | B 级 |
| `runs/s05-hnc21t-toc.txt` | HNC-21T 编程说明书目录（G92 = 工件坐标系设定） | A- 级 |
| `runs/s06-knd1000t.txt` | KND-1000T 官方手册扫描件逐字转录（G76/G92） | A 级 |
| `runs/s07-knd-secondary.txt` | KND G76 两处用户问答旁证 | C 级 |
| `runs/s08-quanwei-g92.txt` | 上海泉威 G92 培训讲解 | B 级 |
| `runs/05-m30x35-recalc.txt` | M30×3.5 数值复核命令 + 原始输出 | `REAL_EXIT=0` |
| `runs/09-code-unchanged.txt` | 代码 / 冻结参考件与基线 `cd99856` 的 diff | 7 项 `DIFF_EXIT=0` |
| `runs/10-summary.txt` | 结论表判定行（脚本生成） | `JUDGEMENT=PASS` |
| `tools/summarize.mjs` | 结论表行数 / 建议 / 脚注统计脚本 | 见 `runs/10-summary.txt` |

## 结论摘要

| # | 系统 × 指令 | 建议 | 理由（一句话） |
| --- | --- | --- | --- |
| 1 | GSK × G76 | **keep-gray** | 980TDc 与 988TA 两代官方手册在 `P/Q` 单位与 `J/K` 所在行不一致；未限定型号/参数前不能生成对所有 GSK 都安全的程序。 |
| 2 | GSK × G92 | **enable** | 980TDc 与 988TA 两代官方手册的直/锥 `G92 X(U) Z(W) F(I) [R]` 格式一致。 |
| 3 | 华中 HNC × G76 | **enable** | HNC-8 官方手册 + HNC-21T 专题文章 + HNC-21T 课件，三源在 `C/R/E/A/X/Z/I/K/U/V/Q/P/F` 单行结构上一致。 |
| 4 | 华中 HNC × G92 | **keep-gray** | 双源负结论：HNC-21T 目录与 HNC-8 官方手册均把 `G92` 定义为工件坐标系设定；螺纹单循环是 `G82`。 |
| 5 | KND × G76 | **enable** | KND-1000T 官方手册给出完整格式/参数表/示例（0.001 mm 口径）；两处独立问答互证 `Q` 为 μm（C 级旁证）。 |
| 6 | KND × G92 | **enable** | KND-1000T 官方手册给出直/锥 `G92 X(U) Z(W) F/R`；上海泉威培训资料互证通用 `X/Z/R/F` 语法。 |

**判定行（脚本生成，见 `runs/10-summary.txt`）**：
`CONCLUSION_ROWS=6` / `ENABLE=4` / `KEEP_GRAY=2` / `FOOTNOTED_ROWS=6` / `ROWS_WITHOUT_RECOMMENDATION=0` / `JUDGEMENT=PASS` / `REAL_EXIT=0`。

## 复核命令

```bash
# 1) 判定行（在树根执行）
node docs/evidence/W6-C1/tools/summarize.mjs docs/research/g76-dialects.md

# 2) M30×3.5 数值复核（单独整句执行）
node -e "const d=30,p=3.5,d1=d-1.0825*p; const h=(d-d1)/2; console.log(d1, h, Math.round(h*1000), Math.round(0.4*1000), Math.round(h/0.0001), Math.round(0.4/0.0001))"

# 3) 代码零改动（从主仓基线导出后 diff）
git -C "<主仓>" archive cd99856 src test index.html package.json | tar -x -C <TEMP>/w6c1_baseline
diff -r "<树>/src" <TEMP>/w6c1_baseline/src
diff -r "<树>/test" <TEMP>/w6c1_baseline/test
diff "<树>/index.html" <TEMP>/w6c1_baseline/index.html
diff "<树>/package.json" <TEMP>/w6c1_baseline/package.json
```

## 偏差 / 未决

1. **GSK × G76 未解灰**：不是资料不足，而是两条 A 级官方来源的型号/参数差异。若 Lead 将 GSK 限定为 988TA（mm 口径）或要求 980TDc 设 `№.182.7 = mm`，可按结论表的 988TA 示例转 enable；否则保持置灰。此项需 Lead 裁决。
2. **HNC × G92 置灰是负结论**：HNC 的 G92 不是螺纹循环，下游不应生成 G92 螺纹行；若 UI 保留 G92 页签，应在 HNC 下置灰并提示改用 G82。
3. **KND × G76 的第二来源为 C 级用户问答**：KND-1000T 官方手册本身是 A 级，但 `Q` 为 μm 的明确表述来自两处用户问答；若审核坚持「两源均为 A/B 级」，本行应降为 keep-gray。本档按「A 级手册 + 两处独立旁证 + 示例自洽」判 enable，并在风险节披露。
4. **G92 单行的产品限制**：G92 是模态循环，完整螺纹需要后续 `X` 递减行；本工具按 G0-B2 只输出单行首刀/参考行，不能宣称一行完成螺纹。W6-C2 的 UI 免责文案必须保留并补充这一点。
5. **未上机实测**：本档只做语法/语义级取证，不替代真机参数与报警验证。
