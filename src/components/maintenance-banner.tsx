/** Platform-wide maintenance notice, switched on in the admin panel. Cached for 60 s. */
async function maintenance() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  try {
    const r = await fetch(`${url}/rest/v1/platform_settings?key=eq.maintenance&select=value`, {
      headers: { apikey: key },
      signal: AbortSignal.timeout(1500),
      next: { revalidate: 60 },
    });
    if (!r.ok) return null;
    const rows = (await r.json()) as { value?: { enabled?: boolean; message?: string } }[];
    const v = rows[0]?.value;
    return v?.enabled ? String(v.message || 'Wartungsarbeiten: Einzelne Funktionen sind kurzzeitig eingeschränkt.').slice(0, 300) : null;
  } catch {
    return null;
  }
}
export async function MaintenanceBanner() {
  const message = await maintenance();
  if (!message) return null;
  return (
    <div className="maintenance-banner" role="status">
      {message}
    </div>
  );
}
