# PROVENANCE 片段 · threads-unified.json（UNC/UNF 统一螺纹常用表）

- 表：`data/threads-unified.json` ｜ 任务：W3-C3 ｜ 录入日期：2026-11-03
- 范围：1/4″–1″ 常用档，UNC 10 行 + UNF 10 行 = 20 行（`family: "unified"`，`tpi` 必填）
- 契约：`ThreadRow`（`src/core/types.ts`）——`designation / pitch / major / tpi / source`，
  unified 行不带 `coarse`（该字段仅 metric 有意义）

## 1. 来源

| 角色 | 来源 | URL | 检索日期 | 取用内容 |
| --- | --- | --- | --- | --- |
| 主源（标准依据） | ASME B1.1《Unified Inch Screw Threads (UN and UNR Thread Form)》 | 付费标准，原文未联网取回 | — | 系列划分（UNC/UNF）与每英寸牙数定义；仅作标准号依据，未作为在线互证源 |
| 互证源 A（独立手册站） | gewinde-normen.de · UNC Thread ANSI/ASME B1.1 | https://www.gewinde-normen.de/en/unified-coarse-thread.html | 2026-11-03 | 公称直径、英寸大径、mm 大径、TPI、pitch mm |
| 互证源 A（独立手册站） | gewinde-normen.de · UNF Thread ANSI/ASME B1.1 | https://www.gewinde-normen.de/en/unified-fine-thread.html | 2026-11-03 | 公称直径、英寸大径、mm 大径、TPI、pitch mm |
| 互证源 B（独立工程表） | eFunda · Unified Screw Threads, Standard Series（UNC 页） | https://www.efunda.com/DesignStandards/screws/screwunc.cfm | 2026-11-03 | 公称直径、basic major diameter（inch）、TPI |
| 互证源 B（独立工程表） | eFunda · Unified Screw Threads, Standard Series（UNF 页） | https://www.efunda.com/DesignStandards/screws/screwunf.cfm | 2026-11-03 | 公称直径、basic major diameter（inch）、TPI |

> 降级披露：ASME B1.1 原文为付费件，本次未联网取回；B.2 的「两源互证」由上述两份
> **独立公开表**（gewinde-normen.de 与 eFunda，互不转载）逐行完成。两表均自行标注以
> ANSI/ASME B1.1 为口径，这属于同一标准的两份独立出版物，不是同源转载。

## 2. 换算口径（禁裸值）

- 螺距：`P = 25.4 / tpi`（mm）。JSON 存 IEEE-754 双精度**完整商值**，不预先舍入，
  避免换算误差累积；显示层再按位数排版。
  - 例：`25.4 / 20 = 1.27`；`25.4 / 13 = 1.9538461538461538`；
    `25.4 / 18 = 1.411111111111111`。
  - 测试以 `pitch === 25.4 / tpi`（严格相等，同一算式同一双精度结果）逐行校验。
- 大径：`major = 英寸分数 × 25.4`（mm）。
  - 例：`1/4 = 0.25 in × 25.4 = 6.35`；`5/16 = 0.3125 × 25.4 = 7.9375`；
    `9/16 = 0.5625 × 25.4 = 14.2875`；`1 in = 25.4`。
- designation 统一为 `尺寸-牙数 系列`（如 `1/4-20 UNC`、`1-8 UNC`），不带英寸引号；
  源表写作 `1/4"-20 UNC`、`1"-8 UNC`，引号差异属排版归一，不是数值分歧。

## 3. 逐行对拍（TPI 与公称尺寸）

两表 TPI 与公称尺寸逐行一致；「大径 mm」为按英寸分数精确换算值（源表 mm 列按 3 位
小数显示，见 §4）。

| designation | TPI（gewinde / eFunda） | 英寸大径（eFunda） | 大径 mm（精确换算） | 对拍 |
| --- | --- | --- | --- | --- |
| 1/4-20 UNC | 20 / 20 | 0.2500 | 6.35 | 一致 |
| 1/4-28 UNF | 28 / 28 | 0.2500 | 6.35 | 一致 |
| 5/16-18 UNC | 18 / 18 | 0.3125 | 7.9375 | 一致 |
| 5/16-24 UNF | 24 / 24 | 0.3125 | 7.9375 | 一致 |
| 3/8-16 UNC | 16 / 16 | 0.3750 | 9.525 | 一致 |
| 3/8-24 UNF | 24 / 24 | 0.3750 | 9.525 | 一致 |
| 7/16-14 UNC | 14 / 14 | 0.4375 | 11.1125 | 一致 |
| 7/16-20 UNF | 20 / 20 | 0.4375 | 11.1125 | 一致 |
| 1/2-13 UNC | 13 / 13 | 0.5000 | 12.7 | 一致 |
| 1/2-20 UNF | 20 / 20 | 0.5000 | 12.7 | 一致 |
| 9/16-12 UNC | 12 / 12 | 0.5625 | 14.2875 | 一致 |
| 9/16-18 UNF | 18 / 18 | 0.5625 | 14.2875 | 一致 |
| 5/8-11 UNC | 11 / 11 | 0.6250 | 15.875 | 一致 |
| 5/8-18 UNF | 18 / 18 | 0.6250 | 15.875 | 一致 |
| 3/4-10 UNC | 10 / 10 | 0.7500 | 19.05 | 一致 |
| 3/4-16 UNF | 16 / 16 | 0.7500 | 19.05 | 一致 |
| 7/8-9 UNC | 9 / 9 | 0.8750 | 22.225 | 一致 |
| 7/8-14 UNF | 14 / 14 | 0.8750 | 22.225 | 一致 |
| 1-8 UNC | 8 / 8 | 1.0000 | 25.4 | 一致 |
| 1-12 UNF | 12 / 12 | 1.0000 | 25.4 | 一致 |

## 4. 分歧与显示取整

- **实质分歧：0 行。** 20 行的 TPI、公称英寸尺寸在两份独立表之间完全一致。
- **显示取整披露（非分歧）**：源表 mm 列（大径与 pitch）统一按 3 位小数显示，本表按
  英寸分数/公式精确换算，差值的绝对值均 ≤ 0.0005 mm：
  - 大径 6 行有 0.0005 mm 显示差：5/16（7.9375 vs 显示 7.938）、
    7/16（11.1125 vs 11.112）、9/16（14.2875 vs 14.288），各含 UNC/UNF。
  - pitch 全部非整三位值的行，源表显示 3 位小数（如 25.4/18→显示 1.411，精确商
    1.411111111111111），差值 < 0.0005 mm。
  这些是排版取整，不改变牙数与公称尺寸，故不按「分歧行」上报；测试断言采用精确换算值。

## 5. 交叉层校验

- 1/4-20 UNC 行 → `ThreadSpec`（`family:'unified'`、`flankAngle:60`、`major:6.35`、
  `pitch:1.27`）→ `threadDimensions`：
  `d2 = d − 0.6495P = 6.35 − 0.6495×1.27 = 6.35 − 0.824865 = 5.525135 mm → 5.525（3 位）`。
  常数 0.6495 来自 WAVE-PLAN §4 头部冻结 60° 常数集；测试见
  `test/data-unified.test.ts`「交叉层验证」。
