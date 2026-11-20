import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase/server';
import { Onboarding } from '@/components/onboarding';
import { hasSignedTerms } from '@/lib/trust';
export default async function Page() {
  const db = await supabaseServer();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect('/login');
  if (!(await hasSignedTerms(user.id))) redirect('/account/vertrag?next=/onboarding');
  return <Onboarding email={user.email || ''} />;
}
