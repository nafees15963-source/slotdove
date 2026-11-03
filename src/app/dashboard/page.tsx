import { loadWorkspace } from '@/lib/workspace';
import { DashboardShell } from '@/components/dashboard/shell';
import { PageContent } from '@/components/dashboard/page-content';
export const dynamic = 'force-dynamic';
export default async function Page() {
  const data = await loadWorkspace();
  return (
    <DashboardShell {...data} section="overview">
      <PageContent section="overview" />
    </DashboardShell>
  );
}
