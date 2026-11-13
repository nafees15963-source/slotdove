import { loadWorkspace } from '@/lib/workspace';
import { DashboardShell } from '@/components/dashboard/shell';
export const metadata = { robots: { index: false, follow: false } };
export default async function Layout({ children }: { children: React.ReactNode }) {
  const data = await loadWorkspace();
  return <DashboardShell {...data}>{children}</DashboardShell>;
}
