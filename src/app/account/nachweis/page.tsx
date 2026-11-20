import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase/server';
import { loadProof } from '@/lib/proof';
import { SignatureProof } from '@/components/signature-proof';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Mein Vertragsnachweis', robots: { index: false, follow: false } };
export default async function Page() {
  const db = await supabaseServer();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect('/login');
  const data = await loadProof(user.id);
  if (!data) redirect('/login');
  return <SignatureProof data={data} />;
}
