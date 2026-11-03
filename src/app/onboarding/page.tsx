import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase/server';
import { Onboarding } from '@/components/onboarding';
export default async function Page() {
  const db = await supabaseServer();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect('/login');
  return <Onboarding email={user.email || ''} />;
}
