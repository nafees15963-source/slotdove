import { redirect } from 'next/navigation';
import { loadWorkspace } from '@/lib/workspace';
import { DashboardShell } from '@/components/dashboard/shell';
export const metadata = { robots: { index: false, follow: false } };
export default async function Layout({ children }: { children: React.ReactNode }) {
  const data = await loadWorkspace();
  // Accounts created by an owner start with a temporary password that must be replaced.
  if (data.mustChangePassword) redirect('/account/password?first=1');
  return <DashboardShell {...data}>{children}</DashboardShell>;
}
