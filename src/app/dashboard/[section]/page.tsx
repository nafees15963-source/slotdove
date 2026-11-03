import { notFound } from 'next/navigation';
import { loadWorkspace } from '@/lib/workspace';
import { DashboardShell } from '@/components/dashboard/shell';
import { PageContent } from '@/components/dashboard/page-content';
export const dynamic = 'force-dynamic';
export default async function Page({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (
    ![
      'overview',
      'calendar',
      'appointments',
      'customers',
      'services',
      'staff',
      'availability',
      'booking',
      'analytics',
      'notifications',
      'integrations',
      'settings',
      'billing',
    ].includes(section)
  )
    notFound();
  const data = await loadWorkspace();
  return (
    <DashboardShell {...data} section={section}>
      <PageContent section={section} />
    </DashboardShell>
  );
}
