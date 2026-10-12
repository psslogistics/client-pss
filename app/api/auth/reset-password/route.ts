import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const recoveryCookie = (await cookies()).get('pss_password_recovery')?.value;
  const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser();
  if (recoveryCookie !== '1' || !user) return NextResponse.json({ error: 'Use the secure password-reset link sent to your email.' }, { status: 401 });
  const body = await request.json().catch(() => ({})) as { password?: string };
  if (!body.password || body.password.length < 8) return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
  const { error } = await supabase.auth.updateUser({ password: body.password });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
