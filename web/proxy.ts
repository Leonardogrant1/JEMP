import { createServerClient } from '@supabase/ssr';
import createMiddleware from 'next-intl/middleware';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';


const LANDING_ROUTES = /^\/(?!admin|api|sign-in|imprint|privacy-policy|terms-of-service|_next|.*\..*).*$/


export default async function proxy(req: NextRequest) {

  if (LANDING_ROUTES.test(req.nextUrl.pathname)) {
    const defaultLocale = "de"
    const handleI18nRouting = createMiddleware({
      locales: ['en', 'de'],
      defaultLocale,
      localePrefix: 'as-needed'
    });
    const response = handleI18nRouting(req);

    return response;
  }


  // Supabase auth for admin routes
  let response = NextResponse.next({ request: req })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value))
          response = NextResponse.next({ request: req })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()


  if (!user && req.nextUrl.pathname.startsWith('/admin')) {
    return NextResponse.redirect(new URL('/sign-in', req.url))
  }



  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
}
