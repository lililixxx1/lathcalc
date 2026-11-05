/**
 * p16 · 挂轮计算（stub 页——WAVE-PLAN-V4 §3 / V4.1 §1b 契约预置，W11-B 填实现）
 *
 * 定位（调研报告:182）：普通车床挂轮 a/b×c/d + 传动比误差（ppm），
 * 预置常见国产车床齿轮组（双源判定）+ 自定义齿数兜底。
 * 实现契约见 src/core/types.ts GearTrainInput/GearTrainSolution/GearTrainFn
 * 与 docs/plan/WAVE-PLAN-V4.1.md §3。
 *
 * 视觉验收口径（V4.1 §4）：只拼既有组件与 tokens.css 变量，零新 CSS 变量。
 */
import type { PageContext, PageModule } from '../router';
import { Card, SubText, TopBar, createBody, createPage } from '../components';

const page: PageModule = {
  title: '挂轮计算',
  render(ctx: PageContext): void {
    const body = createBody({ className: 'rc-p16__body' });
    body.append(
      Card({
        children: [
          SubText('挂轮计算（a/b×c/d + 误差 ppm）建设中——W11-B 派工', { center: true }),
        ],
      }),
    );

    ctx.root.append(
      createPage({
        id: 'p16',
        top: TopBar({ title: '挂轮计算' }),
        body,
      }),
    );
  },
};

export default page;
