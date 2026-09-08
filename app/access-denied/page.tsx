import Link from "next/link";

export default async function AccessDeniedPage({ searchParams }: { searchParams: Promise<{ reason?: string }> }) {
  const reason = (await searchParams).reason;
  return <main className="grid min-h-screen place-items-center bg-background p-6 text-center"><section className="max-w-md rounded-2xl border border-border bg-card p-8 shadow-sm"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">PSS / ACCESS CONTROL</p><h1 className="mt-3 text-2xl font-semibold">Access unavailable</h1><p className="mt-3 text-sm text-muted-foreground">This account is not assigned to an active client workspace{reason ? ` (${reason.replaceAll("-", " ")})` : ""}.</p><Link href="/sign-in" className="mt-6 inline-flex h-10 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground">Return to sign in</Link></section></main>;
}
