import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
const unsafe = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
/** API protection before any route code runs:
 * - no CORS: preflights are refused and no Access-Control-Allow-* headers are ever sent,
 * - state-changing requests must come from this site (the cron endpoint uses a bearer secret). */
function guardApi(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (request.method === 'OPTIONS') return new NextResponse(null, { status: 405, headers: { Allow: 'GET, POST, DELETE', Vary: 'Origin' } });
  if (unsafe.has(request.method) && !pathname.startsWith('/api/cron/')) {
    const origin = request.headers.get('origin');
    const site = request.nextUrl.origin;
    const fetchSite = request.headers.get('sec-fetch-site');
    if ((origin && origin !== site) || (fetchSite && !['same-origin', 'none'].includes(fetchSite)))
      return NextResponse.json({ error: 'INVALID_ORIGIN' }, { status: 403, headers: { 'Cache-Control': 'no-store', Vary: 'Origin' } });
  }
  const response = NextResponse.next();
  response.headers.set('Vary', 'Origin');
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}
export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (pathname.startsWith('/api/')) return guardApi(request);
  if (pathname === '/de' || pathname === '/en') {
    const locale = pathname.slice(1);
    const headers = new Headers(request.headers);
    headers.set('x-slotdove-locale', locale);
    const localized = NextResponse.next({ request: { headers } });
    localized.cookies.set('slotdove-locale', locale, {
      path: '/',
      sameSite: 'lax',
      maxAge: 31536000,
    });
    localized.headers.set('Cache-Control', 'private, no-store');
    return localized;
  }

  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return response;
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(values) {
        values.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        values.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Signed-out visitors never see protected screens, not even briefly.
  // (Each page and API route still checks permissions itself.)
  const isAdminArea = pathname.startsWith('/admin') && pathname !== '/admin/login';
  const isPrivate = isAdminArea || pathname.startsWith('/dashboard') || pathname === '/onboarding' || pathname.startsWith('/account');
  if (isPrivate && !user) {
    const target = request.nextUrl.clone();
    target.pathname = isAdminArea ? '/admin/login' : '/login';
    target.search = '';
    const redirect = NextResponse.redirect(target);
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    redirect.headers.set('Cache-Control', 'private, no-store');
    return redirect;
  }
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}
export const config = {
  matcher: ['/api/:path*', '/de', '/en', '/dashboard/:path*', '/admin/:path*', '/onboarding', '/account/:path*'],
};
