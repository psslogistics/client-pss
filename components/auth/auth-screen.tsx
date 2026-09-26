"use client";

import Link from "next/link";
import { FormEvent, useState, type InputHTMLAttributes } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Eye, EyeOff, LockKeyhole, Mail, Phone, UserRound, Building2, type LucideIcon } from "lucide-react";
import AuthShell from "./auth-shell";

export default function AuthScreen({ mode }: { mode: "signin" | "signup" }) {
  const router = useRouter(); const supabase = createClient(); const signUp = mode === "signup";
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [showPassword, setShowPassword] = useState(false); const [company, setCompany] = useState(""); const [contact, setContact] = useState(""); const [mobile, setMobile] = useState(""); const [confirm, setConfirm] = useState(""); const [error, setError] = useState(""); const [notice, setNotice] = useState(""); const [pending, setPending] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setNotice("");
    if (signUp && (!company.trim() || !contact.trim() || !mobile.trim())) return setError("Complete your company, contact, and mobile details.");
    if (signUp && password !== confirm) return setError("Passwords do not match.");
    setPending(true);
    try {
      const result = signUp
        ? await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`, data: { account_type: "client", full_name: contact.trim(), company_name: company.trim(), phone: mobile.trim() } } })
        : await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (result.error) return setError(result.error.message);
      if (signUp) setNotice("Account created. Verify your email before signing in.");
      else { router.replace("/dashboard"); router.refresh(); }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to contact the authentication service. Please try again.");
    } finally { setPending(false); }
  }
  const field = (label: string, value: string, setValue: (value: string) => void, icon: LucideIcon, props: InputHTMLAttributes<HTMLInputElement> = {}) => { const Icon = icon; return <label className="block text-xs font-semibold text-[#344259]">{label}<div className="relative mt-2"><Icon className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#94a3b8]"/><input {...props} required value={value} onChange={(e) => setValue(e.target.value)} className="h-12 w-full rounded-xl border border-[#dbe5f2] bg-[#f8fafc] pl-10 pr-3 text-sm outline-none transition focus:border-[#2563eb] focus:bg-white focus:ring-4 focus:ring-[#2563eb]/10"/></div></label>; };
  return <AuthShell eyebrow={signUp ? "Client onboarding" : "Client workspace"} title={signUp ? "Set up your workspace" : "Welcome back"} description={signUp ? "Create one clear view for every shipment your business moves." : "Sign in to manage bookings, tracking, billing, and delivery performance."}><form onSubmit={submit} className="space-y-4">{signUp && <>{field("Company / legal name", company, setCompany, Building2, { placeholder: "Your registered business" })}{field("Primary contact", contact, setContact, UserRound, { placeholder: "Full name" })}{field("Mobile", mobile, setMobile, Phone, { type: "tel", placeholder: "+91 00000 00000" })}</>}{field("Business email", email, setEmail, Mail, { type: "email", autoComplete: "email", placeholder: "you@company.com" })}<label className="block text-xs font-semibold text-[#344259]">Password<div className="relative mt-2"><LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#94a3b8]"/><input required minLength={8} type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" className="h-12 w-full rounded-xl border border-[#dbe5f2] bg-[#f8fafc] pl-10 pr-11 text-sm outline-none focus:border-[#2563eb] focus:bg-white focus:ring-4 focus:ring-[#2563eb]/10"/><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#94a3b8]">{showPassword ? <EyeOff className="size-4"/> : <Eye className="size-4"/>}</button></div></label>{signUp && field("Confirm password", confirm, setConfirm, LockKeyhole, { type: "password", minLength: 8, autoComplete: "new-password" })}{error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}{notice && <p role="status" className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">{notice}</p>}<button disabled={pending} className="h-12 w-full rounded-xl bg-[#2563eb] text-sm font-semibold text-white shadow-lg shadow-[#2563eb]/20 transition hover:bg-[#1d4ed8] disabled:opacity-60">{pending ? "Working…" : signUp ? "Create client workspace" : "Sign in to workspace"}</button><div className="flex justify-between gap-4 text-xs font-semibold"><Link href={signUp ? "/sign-in" : "/sign-up"} className="text-[#2563eb] hover:underline">{signUp ? "Already registered? Sign in" : "Create an account"}</Link>{!signUp && <Link href="/reset-password" className="text-[#738198] hover:text-[#2563eb] hover:underline">Forgot password?</Link>}</div></form></AuthShell>;
}
