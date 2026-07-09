// middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const ADMIN_ONLY_PATHS = ['/plans', '/locations', '/reports', '/workers', '/terminal', '/facial-sync', '/ads']
const PUBLIC_PATHS = ['/login', '/auth/callback', '/set-password']

export async function middleware(request: NextRequest) {
  // Server actions are POST requests with the next-action header — skip redirect logic
  if (request.headers.has('next-action')) {
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const path = request.nextUrl.pathname
  const isPublicPath = PUBLIC_PATHS.some(p => path === p || path.startsWith(`${p}/`))
  const loginUrl = new URL('/login', request.url)
  loginUrl.searchParams.set('error', 'auth_unavailable')

  let user: Awaited<ReturnType<typeof supabase.auth.getUser>>['data']['user'] = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch (error) {
    console.error('Supabase auth unavailable in middleware:', error)
    return isPublicPath ? supabaseResponse : NextResponse.redirect(loginUrl)
  }

  if (!user && !isPublicPath) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user && path === '/login') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  if (user) {
    const mustChangePassword = user.user_metadata?.must_change_password === true

    if (mustChangePassword && path !== '/set-password') {
      return NextResponse.redirect(new URL('/set-password', request.url))
    }

    if (!mustChangePassword && path === '/set-password') {
      return NextResponse.redirect(new URL('/', request.url))
    }

    let role: string | null | undefined = null
    try {
      const { data: access } = await supabase
        .from('user_access')
        .select('role')
        .eq('user_id', user.id)
        .single()

      role = access?.role
    } catch (error) {
      console.error('Supabase role lookup unavailable in middleware:', error)
      return isPublicPath ? supabaseResponse : NextResponse.redirect(loginUrl)
    }

    const isAdminOnly = ADMIN_ONLY_PATHS.some(p => path.startsWith(p))

    if (role === 'worker' && isAdminOnly) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
