import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { cookies: { getAll: () => request.cookies.getAll(), setAll: (items) => { items.forEach(({ name, value }) => request.cookies.set(name, value)); response = NextResponse.next({ request }); items.forEach(({ name, value, options }) => response.cookies.set(name, value, options)) } } })
  const claimsResult = await supabase.auth.getClaims()
  const userId = claimsResult.data?.claims?.sub
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    if (!userId) return NextResponse.redirect(new URL('/sign-in', request.url))
    const { data: profile, error: profileError } = await supabase.from('profiles').select('status').eq('id', userId).maybeSingle()
    if (profileError) return NextResponse.redirect(new URL('/auth-error?reason=profile', request.url))
    if (!profile) return NextResponse.redirect(new URL('/access-pending?reason=profile', request.url))
    if (profile.status !== 'active') return NextResponse.redirect(new URL('/access-denied?reason=profile-inactive', request.url))
    const { data: userRole, error: roleError } = await supabase.from('user_roles').select('role_id,is_active').eq('user_id', userId).maybeSingle()
    if (roleError) return NextResponse.redirect(new URL('/auth-error?reason=role', request.url))
    if (!userRole?.is_active) return NextResponse.redirect(new URL('/access-denied?reason=missing-role', request.url))
    const { data: role, error: roleLookupError } = await supabase.from('roles').select('role_code').eq('id', userRole.role_id).maybeSingle()
    if (roleLookupError) return NextResponse.redirect(new URL('/auth-error?reason=role', request.url))
    if (role?.role_code !== 'client_user') return NextResponse.redirect(new URL('/access-denied?reason=missing-role', request.url))
    const { data: memberships, error: membershipError } = await supabase.from('client_memberships').select('client_id,membership_status').eq('user_id', userId)
    if (membershipError) return NextResponse.redirect(new URL('/auth-error?reason=membership', request.url))
    const activeMemberships = (memberships ?? []).filter((membership) => membership.membership_status === 'active')
    if (!activeMemberships.length) return NextResponse.redirect(new URL('/access-pending?reason=client-assignment', request.url))
    const { data: accounts, error: accountError } = await supabase.from('client_accounts').select('id,status').in('id', activeMemberships.map((membership) => membership.client_id))
    if (accountError) return NextResponse.redirect(new URL('/auth-error?reason=client-account', request.url))
    const assigned = activeMemberships.some((membership) => accounts?.some((account) => account.id === membership.client_id && account.status === 'active'))
    if (!assigned) return NextResponse.redirect(new URL('/access-pending?reason=client-assignment', request.url))
  }
  return response
}
