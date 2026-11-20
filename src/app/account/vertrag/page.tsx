import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase/server';
import { hasSignedTerms, LEGAL_VERSION } from '@/lib/trust';
import { SignTerms } from '@/components/sign-terms';
import { dateDe, publicSettings } from '@/lib/release';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Nutzungsbedingungen unterschreiben – Slotdove', robots: { index: false, follow: false } };
export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const db = await supabaseServer();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect('/login');
  const raw = (await searchParams).next || '/dashboard';
  const next = /^\/(dashboard|onboarding)(\/[a-z0-9-]*)?$/.test(raw) ? raw : '/dashboard';
  if (await hasSignedTerms(user.id)) redirect(next);
  const { release } = await publicSettings();
  return <SignTerms next={next} version={LEGAL_VERSION} email={user.email || ''} from={dateDe(release.free_from)} until={dateDe(release.free_until)} />;
}
