import Link from 'next/link';
import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase/server';
import { Admin } from '@/components/admin';
export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Platform administration',
  robots: { index: false, follow: false },
};
export default async function Page() {
  const db = await supabaseServer();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect('/admin/login');
  const { data } = await db.rpc('my_platform_role');
  if (!data)
    return (
      <main className="error-page">
        <h1>403</h1>
        <p>Access is restricted to authorized platform administrators.</p>
        <Link className="btn btn-outline" href="/dashboard">
          Dashboard
        </Link>
      </main>
    );
  return <Admin />;
}
