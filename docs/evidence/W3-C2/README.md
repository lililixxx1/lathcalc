# W3-C2 证据档 · Tr 梯形 + G 管螺纹 + ac 表转正

> 卡：W3-C2 ｜ 执行者：worker-2 ｜ 基线：c3eede2 ｜ 收获：0fd896f ｜ 本 README 为 G2-W3 收尾补齐（I-1，2026-11-03，判定素材取自 runs/ 原始输出）

## 索引

| 档 | 命令 | 结果 |
| --- | --- | --- |
| runs/gate1-tsc.txt | `npx tsc --noEmit` | REAL_EXIT=0 |
| runs/gate2-vitest.txt | `npx vitest run --maxWorkers=2` | Tests 94 passed (94)（77 既有 + 17 新增：trapezoid 9 + pipe 8），REAL_EXIT=0 |
| runs/gate3-build.txt | `npm run build` | ✓ built in 72ms（PWA precache 7 entries），REAL_EXIT=0 |

## 结论

- 交付：`src/data/threads-trapezoid.json`（41 行 Tr8–Tr44）、`src/data/threads-pipe.json`（13 行 G1/8–G2）、两 provenance 片段、`test/data-trapezoid.test.ts`、`test/data-pipe.test.ts`。
- **路径判对**：按冻结架构直写 `src/data/`（派工单误写根 data/，worker 凭四处冻结证据偏离并披露，Lead 认可）。
- 双源：Tr = GB/T 5796.1/5796.3-2005（嘉立创转载 + openstd 元数据）+ DIN 103 反推互证 + ISO 2901 抽查；G = GB/T 7307-2001 + BSPP 厂商表 + ISO 228-1 抽查；R/Rc/Rp 零混入。
- **ac 表双源转正关账**（W2-C2 裁决②）：四档 ac 三源互证；P28–44 同档常量延伸披露（provenance §5.5）。
- U5 两行 DIN 排版笔误：Lead 公式复算确认（d3=d−P−2ac、D1=d−P），保留主源值。

## 判定行

G1 通过（2026-11-03，树内三门禁复跑 + 锚点 Tr40×7/G1/2/G1 直读 + thread.ts 逐字节一致 + 零 R/Rc/Rp）；G2-W3 通过（零阻塞，U5 手推复核成立、迁移后 src/data/threads-pipe.json 与冻结树 cmp IDENTICAL、嘉立创 URL 验活 HTTP 200）。
