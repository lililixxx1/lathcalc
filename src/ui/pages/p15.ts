/**
 * p15 · 宏程序库（stub 页——WAVE-PLAN-V4 §3 / V4.1 §1b 契约预置，W11-A 填实现）
 *
 * 定位（调研报告:380）：椭圆 / 网纹 / 油槽 / 切槽 四模板，FANUC B 类宏变量，
 * 免费开放（对位竞品 VIP 锁）。实现契约见 src/core/types.ts MacroTemplateSpec/MacroBuildFn
 * 与 docs/plan/WAVE-PLAN-V4.1.md §2。
 *
 * 视觉验收口径（V4.1 §4）：只拼既有组件与 tokens.css 变量，零新 CSS 变量。
 */
import type { PageContext, PageModule } from '../router';
import { Card, SubText, TopBar, createBody, createPage } from '../components';

const page: PageModule = {
  title: '宏程序库',
  render(ctx: PageContext): void {
    const body = createBody({ className: 'rc-p15__body' });
    body.append(
      Card({
        children: [
          SubText('四模板（椭圆 / 网纹 / 油槽 / 切槽）建设中——W11-A 派工', { center: true }),
        ],
      }),
    );

    ctx.root.append(
      createPage({
        id: 'p15',
        top: TopBar({ title: '宏程序库' }),
        body,
      }),
    );
  },
};

export default page;
