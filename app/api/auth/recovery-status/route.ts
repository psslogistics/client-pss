import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const recoveryCookie = (await cookies()).get('pss_password_recovery')?.value;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (recoveryCookie !== '1' || !user) return NextResponse.json({ allowed: false }, { status: 401 });
  return NextResponse.json({ allowed: true });
}
