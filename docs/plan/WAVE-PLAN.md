# WAVE-PLAN · 车工算 LathCalc v0.1（M1 里程碑）

> 状态：草案 v1（2026-11-03，G0 待审）｜冻结后为本里程碑唯一执行依据
> 冻结参考件：`docs/车工计算App-调研报告.md`（=报告）、`docs/车工计算App-无限画布.html`（=设计稿）
> 共识基线：全量 14 页 PWA ｜ Vite+TS+vitest ｜ 螺纹四族 ｜ G76 仅 FANUC ｜ MIT

## 0. 交付物与验收基线（M1 完成定义）

**交付物**：`dist/` 可部署的纯静态 PWA——14 页全部可用、完全离线（断网可开）、无登录无广告无埋点。

**验收基线（全部满足才算 M1 完成）**：

| # | 基线 | 证据 |
| --- | --- | --- |
| A1 | 三门禁全绿：`npx tsc --noEmit`、`npx vitest run --maxWorkers=2`、`npm run build` | G3 证据档 |
| A2 | 黄金用例全绿：报告 §6.4 六条 + 每模块 ≥3 组独立例题（见 §4） | vitest 输出 |
| A3 | 30 秒链路：首页 → 查 M30 粗牙 → 底孔/三针 → 生成 G76，断网状态下走通 | Lead 浏览器留证 |
| A4 | 14 页逐页与设计稿对拍（390×844）：布局结构、token 色、组件形态一致；数值区实时计算 | 截图对比档 |

## 1. 架构冻结

```
src/
  core/            纯函数，零 UI 依赖，零 DOM 导入
    types.ts         共享类型（ThreadSpec / TaperInput / ArcCase …）   [Lead 预置]
    speed.ts         转速/进给/Ra
    thread.ts        螺纹公式族（60°/55°/30°Tr：d2/d1/H1/底孔/三针）
    taper.ts         锥度三值互算/半角
    arc.ts           圆弧切点 12 工况（arcCase01…arcCase12）
    tolerance.ts     偏差合成（H/h 基准 + IT 值 → 上下偏差）
    triangle.ts      解三角形（SSS/SSA/SAS…）
    weight.ts        重量（圆/六方/管/板 × 密度）
    gcode.ts         G76 FANUC 两行式模板 + 免责常量
    lookup.ts        数据表查询（螺纹选型/IT 分段/莫氏/材料）          [W3]
  data/            纯 JSON + 溯源
    threads-metric.json / threads-trapezoid.json / threads-pipe.json / threads-unified.json
    tolerance-it.json / morse.json / densities.json / materials.json / gcode-ref.json
    PROVENANCE.md / COVERAGE.md
  ui/              页面与组件（la- token 1:1 移植自设计稿）
    tokens.css / components/（ResultCard/Keypad/SegChip/InputRow/Accordion/…）
    router.ts / pages/×14 / store.ts（收藏+历史，localStorage）
  sw/              vite-plugin-pwa 配置（service worker + manifest）
test/              黄金用例 + 例题（数值锚点，零漂移）
```

**契约预置（Lead，W1b）**：`types.ts` 全量 + 各 core 模块签名 + `throw new Error('PANIC: not implemented')` 桩 + 门禁脚本 + 空 vitest 跑通。worker 只填实现，不定义接口。

## 2. 波次与卡

### W1（Lead 自研，产出直接进 G2）
| 卡 | 内容 |
| --- | --- |
| W1-a | 主仓基线 `8d74951` + 附录 + AGENTS.md（已完成）+ 本计划 G0 冻结 |
| W1-b | 骨架：npm 初始化、vite/vitest/tsconfig、契约桩、tokens.css、CI 门禁三命令全绿 |

### W2（core 纯函数 + 用例，5 卡并行；基线 = W1-b commit）
| 卡 | 模块 | 关键验收（断言打到数值位） |
| --- | --- | --- |
| W2-C1 | speed + triangle + weight | §4 黄金 #5/#6 + 各 ≥3 例题 |
| W2-C2 | thread 公式族 | §4 黄金 #1/#2；60°/55°/Tr 三族常数独立复算 |
| W2-C3 | taper + tolerance | §4 黄金 #3/#4；半角弧度→度分秒转换用例 |
| W2-C4 | arc 工况 01–06 | 每工况 ≥2 例题，切点满足几何不变量（距离=R、共线校验） |
| W2-C5 | arc 工况 07–12 + gcode | 同上 + G76 模板参数逐位断言（设计稿 p04 值对拍） |

### W3（数据表 + 溯源，5 卡并行；基线 = W2 收获后 commit）
| 卡 | 数据 | 双源要求 |
| --- | --- | --- |
| W3-C1 | threads-metric.json（粗牙 M1–M64 全 + 细牙常用） | GB/T 196 与独立手册互证，PROVENANCE 逐条 |
| W3-C2 | threads-trapezoid（GB/T 5796）+ threads-pipe（55° G 管） | 同上 |
| W3-C3 | threads-unified（UNC/UNF）+ gcode-ref.json | ASME B1.1 互证 |
| W3-C4 | tolerance-it.json（GB/T 1800.1，尺寸段 × IT6–IT12 + H/h/g/k/p 常用偏差） | 抽 3 段交叉对拍 |
| W3-C5 | morse（0–6）+ densities + materials（9 材料 × 2 刀具，标"示例数据"） | 莫氏锥度双源；参数库标"以试切为准" |

### W4（UI，1 前置卡 + 4 并行卡；基线 = W3 收获后 commit）
| 卡 | 页 | 依赖 |
| --- | --- | --- |
| W4-C1 | tokens + 基础组件 + router + p01 首页 | W3 |
| W4-C2 | p02 选型 / p03 结果 / p04 G76（参数带出：一处输入多处复用） | W4-C1 契约 |
| W4-C3 | p05 图库（12 工况缩略图）/ p06 切点计算 | W4-C1 |
| W4-C4 | p07 锥度 / p08 公差 / p09 转速（自绘键盘）/ p10 切削参数 | W4-C1 |
| W4-C5 | p11 重量 / p12 三角 / p13 速查 / p14 收藏+历史+分享长图 | W4-C1 |

### W5（集成 + 终局，Lead 主导）
- SW/manifest 离线验证、30 秒链路留证、14 页截图对拍、G3 全量审、遗留项登记 DEFERRED。

## 3. 关键裁决（已定，不再议）

1. G76 仅 FANUC；GSK/KND/华中页签置灰 + "待补"徽标；免责文案固定。
2. 蜗杆/NPT → `data/COVERAGE.md` 待补清单，不做进 v0.1。
3. 切削参数库为示例数据（页内固定警示 + 每条数据 PROVENANCE 标"示例·待复核"）。
4. 字体走系统栈，不打包 webfont。
5. 分享长图用 canvas 2D 绘制（本机生成，不联网）。
6. UI 还原基准 = 390×844 对拍 + 布局自适应；la- token 1:1。

## 4. 黄金用例（数值锚点；来源=报告 §6.4 / 设计稿；双路径复算后冻结）

| # | 用例 | 期望（附算式） | 来源 |
| --- | --- | --- | --- |
| 1 | M30×2 普通螺纹 | d2 = 30−0.6495×2 = **28.701**；d1 = 30−1.0825×2 = **27.835**；底孔 ≈ 30−2 = **28.0** | 报告 §6.4 |
| 2 | 三针 M30×2, d0=1.1547 | M = d2+3d0−0.866P = 28.701+3.4641−1.732 = **30.433**（报告值 30.434 有 ±0.001 舍入差，以复算冻结值为准，差异已披露） | 报告 §6.4 + 复算 |
| 3 | 锥度 1:10 | α/2 = arctan(1/20) = **2°51′45″**（2.86241°） | 报告 §6.4 |
| 4 | Ø40 IT7（30–50 段） | 公差 T = **0.025 mm**；H 孔：EI=0, ES=+0.025 | 报告 §6.4 + GB/T 1800.1 |
| 5 | 转速 Ø50, Vc=150 | n = 1000×150/(π×50) = **955 r/min**（954.93）；f=0.2 → vf=**191 mm/min** | 报告 §6.4 + 设计稿 p09 |
| 6 | 重量 Ø50×100 钢 | V=π×25²×100=196350 mm³ → m ≈ **1.54 kg** | 报告 §6.4 + 设计稿 p11 |
| 7 | M30×3.5（设计稿 p03 全串） | d2=**27.727**、d1=**26.211**、底孔 **26.5**、三针 d0=**2.021**、M≈**30.758**、G76: X26.211 P1895 Q400 F3.5 | 设计稿 p03/p04 |
| 8 | 切点工况 01（设计稿 p06 示例） | 切点 X18.536 / Z−21.464、圆心 X28.536 Z−5.0（正式版实时计算，示例值仅对拍显示层） | 设计稿 p06 |

## 5. 风险与缓解（继承报告 §8，新增执行层）

| 风险 | 缓解 |
| --- | --- |
| 数据表录错 | 双源 + PROVENANCE + 抽查交叉对拍（W3 各卡验收） |
| 切点工况公式推导错 | 几何不变量断言（到圆心距离=R、切线垂直半径）+ 图形回放校验 |
| UI 还原度争议 | la- token 1:1 + 逐页截图对拍档；数值区以实时计算覆盖示例值 |
| worker 配额中断 | worker-1/2 互为异池候选（附录 E 先例表）；Lead 补位走完整轮 G2 |
| 报告黄金值 vs 复算值差 | §4 已披露三针 M 值 ±0.001 舍入差；冻结复算值 |

## 6. 闸门序列

W1-b（Lead 产出）→ **G2**（reviewer 审骨架契约）→ W2 派工 → G1 批次复验 → **G2** → 收获 → W3 → … → W4 → W5 → **G3** 终局。
每波 G2 通过后在本文档 §7 回填验收记录。

## 7. 验收记录回填（闸门后填写）

| 闸门 | 日期 | 裁决 | 条件项 | 备注 |
| --- | --- | --- | --- | --- |
| G0 | | | | |
