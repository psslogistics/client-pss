import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { cookies: { getAll: () => request.cookies.getAll(), setAll: (items) => { items.forEach(({ name, value }) => request.cookies.set(name, value)); response = NextResponse.next({ request }); items.forEach(({ name, value, options }) => response.cookies.set(name, value, options)) } } })
  const claimsResult = await supabase.auth.getClaims()
  const userId = claimsResult.data?.claims?.sub
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    if (!userId) return NextResponse.redirect(new URL('/sign-in', request.url))
    const { data: profile } = await supabase.from('profiles').select('status,user_roles(role:roles(role_code))').eq('id', userId).maybeSingle()
    const roles = (profile?.user_roles ?? []) as Array<{ role?: { role_code?: string } }>
    if (profile?.status !== 'active' || !roles.some((item) => item.role?.role_code === 'client_user')) return NextResponse.redirect(new URL('/sign-in?error=not-authorized', request.url))
  }
  return response
}
