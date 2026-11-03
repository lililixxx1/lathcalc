/**
 * p07 · 锥度 · 莫氏（W4-C1 占位骨架；由 W4-C4 填充）
 */
import { renderPlaceholder } from '../components/PageShell';
import type { PageContext, PageModule } from '../router';

export const title = '锥度 · 莫氏';

const page: PageModule = {
  title,
  render(ctx: PageContext): void {
    renderPlaceholder(ctx, { id: 'p07', title, plannedBy: 'W4-C4' });
  },
};

export default page;
