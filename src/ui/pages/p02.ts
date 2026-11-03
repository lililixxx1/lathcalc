/**
 * p02 · 螺纹 · 选型（W4-C1 占位骨架；由 W4-C2 填充）
 */
import { renderPlaceholder } from '../components/PageShell';
import type { PageContext, PageModule } from '../router';

export const title = '螺纹 · 选型';

const page: PageModule = {
  title,
  render(ctx: PageContext): void {
    renderPlaceholder(ctx, { id: 'p02', title, badge: 'GB/T 193', plannedBy: 'W4-C2' });
  },
};

export default page;
