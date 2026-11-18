import { notFound } from 'next/navigation';
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
      'chat',
      'support',
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
  return <PageContent section={section} />;
}
