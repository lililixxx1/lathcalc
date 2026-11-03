/**
 * p13 · 速查（W4-C1 占位骨架；由 W4-C5 填充）
 */
import { renderPlaceholder } from '../components/PageShell';
import type { PageContext, PageModule } from '../router';

export const title = '速查';

const page: PageModule = {
  title,
  render(ctx: PageContext): void {
    renderPlaceholder(ctx, { id: 'p13', title, plannedBy: 'W4-C5' });
  },
};

export default page;
