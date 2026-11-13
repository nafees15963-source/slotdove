import { PageContent } from '@/components/dashboard/page-content';
export const dynamic = 'force-dynamic';
export default async function Page() {
  return <PageContent section="overview" />;
}
