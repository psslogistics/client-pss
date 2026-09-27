import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function requireClientAccess() {
  const supabase = await createClient(); const claimsResult = await supabase.auth.getClaims(); const userId = claimsResult.data?.claims?.sub;
  if (!userId) redirect('/sign-in');
  const [{ data, error: profileError }, { data: userRole, error: roleError }, { data: memberships, error: membershipError }] = await Promise.all([
    supabase.from('profiles').select('id,email,display_name,status').eq('id', userId).maybeSingle(),
    supabase.from('user_roles').select('role_id,is_active').eq('user_id', userId).maybeSingle(),
    supabase.from('client_memberships').select('client_id,membership_status').eq('user_id', userId),
  ]);
  if (profileError) redirect('/auth-error?reason=profile');
  if (!data) redirect('/access-pending?reason=profile');
  if (data.status !== 'active') redirect('/access-denied?reason=profile-inactive');
  if (roleError) redirect('/auth-error?reason=role');
  if (!userRole?.is_active) redirect('/access-denied?reason=missing-role');
  if (membershipError) redirect('/auth-error?reason=membership');
  const activeMemberships = (memberships ?? []).filter((membership) => membership.membership_status === 'active');
  if (!activeMemberships.length) redirect('/access-pending?reason=client-assignment');
  const [{ data: role, error: roleLookupError }, { data: accounts, error: accountError }] = await Promise.all([
    supabase.from('roles').select('role_code,scope').eq('id', userRole.role_id).maybeSingle(),
    supabase.from('client_accounts').select('id,status').in('id', activeMemberships.map((membership) => membership.client_id)),
  ]);
  if (roleLookupError) redirect('/auth-error?reason=role');
  if (role?.role_code !== 'client_user') redirect('/access-denied?reason=missing-role');
  if (accountError) redirect('/auth-error?reason=client-account');
  const activeMembership = activeMemberships.find((membership) => accounts?.some((account) => account.id === membership.client_id && account.status === 'active'));
  if (!activeMembership) redirect('/access-pending?reason=client-assignment');
  return { userId, profile: data, role, clientId: activeMembership.client_id };
}
