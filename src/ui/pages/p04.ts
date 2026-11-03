/**
 * p04 · G76 参考程序（W4-C1 占位骨架；由 W4-C2 填充）
 */
import { renderPlaceholder } from '../components/PageShell';
import type { PageContext, PageModule } from '../router';

export const title = 'G76 参考程序';

const page: PageModule = {
  title,
  render(ctx: PageContext): void {
    renderPlaceholder(ctx, { id: 'p04', title, badge: 'FANUC', plannedBy: 'W4-C2' });
  },
};

export default page;
