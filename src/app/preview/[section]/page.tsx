import { notFound } from 'next/navigation';
import { DashboardShell } from '@/components/dashboard/shell';
import { PageContent } from '@/components/dashboard/page-content';
import { previewWorkspace } from '@/lib/preview-data';
export const metadata = { robots: { index: false, follow: false } };
/** Local design preview with fictional data. Disabled in production builds. */
export default async function Page({ params }: { params: Promise<{ section: string }> }) {
  if (process.env.NODE_ENV === 'production') notFound();
  const { section } = await params;
  return (
    <DashboardShell workspace={previewWorkspace} businesses={[previewWorkspace.business]} user={{ id: 'preview', email: 'inhaber@example.com' }} isAdmin>
      <PageContent section={section} />
    </DashboardShell>
  );
}
