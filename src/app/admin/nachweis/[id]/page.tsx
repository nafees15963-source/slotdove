import { notFound, redirect } from 'next/navigation';
import { z } from 'zod';
import { supabaseServer } from '@/lib/supabase/server';
import { adminAssurance, adminMfaRequired } from '@/lib/http';
import { loadProof } from '@/lib/proof';
import { SignatureProof } from '@/components/signature-proof';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Unterschriftsnachweis', robots: { index: false, follow: false } };
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const id = z.uuid().safeParse((await params).id);
  if (!id.success) notFound();
  const db = await supabaseServer();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect('/admin/login');
  const { data: isAdmin } = await db.rpc('my_platform_role');
  if (!isAdmin) notFound();
  if (adminMfaRequired() && (await adminAssurance(db)).current !== 'aal2') redirect('/admin');
  const data = await loadProof(id.data);
  if (!data) notFound();
  return <SignatureProof data={data} />;
}
