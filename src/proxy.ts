import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
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
  await supabase.auth.getUser();
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}
export const config = {
  matcher: ['/de', '/en', '/dashboard/:path*', '/admin/:path*', '/onboarding', '/account/:path*'],
};
