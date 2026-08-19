"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { deriveAuthIdentity, saveAuthIdentity } from "@/lib/auth-identity";

type AuthMode = "signin" | "signup";

const inputClass = "h-11 w-full border border-neutral-300 bg-white px-3 text-sm text-neutral-950 outline-none transition placeholder:text-neutral-400 focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white dark:focus:border-white";

export default function AuthScreen({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const isSignUp = mode === "signup";
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [company, setCompany] = useState("");
  const [contact, setContact] = useState("");
  const [mobile, setMobile] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [terms, setTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem("pss-theme");
    const next = saved === "dark" || saved === "light" ? saved : window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    document.documentElement.classList.toggle("dark", next === "dark");
    const timer = window.setTimeout(() => setTheme(next), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    window.localStorage.setItem("pss-theme", next);
  };

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setNotice("");
    if (!email.trim() || !password) { setError("Enter your email or mobile number and password."); return; }
    const authIdentity = deriveAuthIdentity(email);
    if (!authIdentity) { setError("Enter a valid email or 10-digit mobile number."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (email.toLowerCase().includes("invalid") || password.toLowerCase().includes("invalid")) { setError("The demo credentials were not accepted. Try another value."); return; }
    if (isSignUp) {
      if (!company.trim() || !contact.trim() || !mobile.trim()) { setError("Complete your company, contact, and mobile details."); return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError("Enter a valid business email."); return; }
      if (!/^\d{10}$/.test(mobile.replace(/\D/g, ""))) { setError("Enter a valid 10-digit mobile number."); return; }
      if (password !== confirmPassword) { setError("Passwords do not match."); return; }
      if (!terms) { setError("Accept the terms to create a client account."); return; }
    }
    setSubmitting(true);
    saveAuthIdentity(authIdentity);
    window.setTimeout(() => { setSubmitting(false); setNotice(isSignUp ? "Client account created in demo mode." : "Signed in successfully in demo mode."); window.setTimeout(() => router.push("/dashboard"), 450); }, 500);
  };

  return <main className="min-h-screen bg-neutral-100 text-neutral-950 dark:bg-neutral-950 dark:text-white"><div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-between px-5 py-6 sm:px-8 sm:py-8"><header className="flex items-center justify-between"><Link href="/sign-in" className="text-sm font-semibold tracking-[0.18em]">PSS LOGISTICS</Link><button type="button" onClick={toggleTheme} className="border border-neutral-300 px-3 py-2 text-[11px] font-medium uppercase tracking-wider text-neutral-600 hover:border-neutral-950 hover:text-neutral-950 dark:border-neutral-700 dark:text-neutral-400 dark:hover:border-white dark:hover:text-white">{theme === "dark" ? "Light" : "Dark"} mode</button></header><section className="grid w-full flex-1 place-items-center py-12"><div className="grid w-full max-w-4xl overflow-hidden border border-neutral-300 bg-white dark:border-neutral-700 dark:bg-neutral-900 lg:grid-cols-[0.85fr_1.15fr]"><div className="hidden border-r border-neutral-300 bg-neutral-200 p-10 dark:border-neutral-700 dark:bg-neutral-900 lg:flex lg:flex-col lg:justify-between"><div><p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-500 dark:text-neutral-400">Client access</p><h1 className="mt-6 max-w-xs text-4xl font-semibold leading-tight tracking-[-0.04em]">Move every shipment with clarity.</h1></div><p className="max-w-xs text-xs leading-5 text-neutral-500 dark:text-neutral-400">A focused gateway for booking, tracking, billing, wallet, reports, and support.</p></div><div className="p-6 sm:p-10"><div className="mb-8"><p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-500 dark:text-neutral-400">{isSignUp ? "Create client account" : "Client portal"}</p><h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em]">{isSignUp ? "Start shipping with PSS" : "Sign in to continue"}</h2><p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">{isSignUp ? "Register your business workspace in demo mode." : "Enter your account details to open the client workspace."}</p></div><form onSubmit={submit} noValidate className="space-y-4">{isSignUp && <div className="grid gap-4 sm:grid-cols-2"><label className="block text-xs font-semibold sm:col-span-2">Company / legal name<input value={company} onChange={(event) => setCompany(event.target.value)} className={`${inputClass} mt-1.5`} autoComplete="organization" /></label><label className="block text-xs font-semibold">Contact person<input value={contact} onChange={(event) => setContact(event.target.value)} className={`${inputClass} mt-1.5`} autoComplete="name" /></label><label className="block text-xs font-semibold">Mobile number<input value={mobile} onChange={(event) => setMobile(event.target.value)} className={`${inputClass} mt-1.5`} inputMode="numeric" autoComplete="tel" /></label></div>}<label className="block text-xs font-semibold">{isSignUp ? "Business email" : "Email or mobile number"}<input value={email} onChange={(event) => setEmail(event.target.value)} className={`${inputClass} mt-1.5`} autoComplete="username" /></label><label className="block text-xs font-semibold">Password<div className="relative mt-1.5"><input type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} className={`${inputClass} pr-16`} autoComplete={isSignUp ? "new-password" : "current-password"} /><button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute inset-y-0 right-0 px-3 text-[10px] font-semibold uppercase tracking-wider text-neutral-500 hover:text-neutral-950 dark:hover:text-white">{showPassword ? "Hide" : "Show"}</button></div></label>{isSignUp && <label className="block text-xs font-semibold">Confirm password<div className="relative mt-1.5"><input type={showConfirmPassword ? "text" : "password"} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className={`${inputClass} pr-16`} autoComplete="new-password" /><button type="button" onClick={() => setShowConfirmPassword((value) => !value)} className="absolute inset-y-0 right-0 px-3 text-[10px] font-semibold uppercase tracking-wider text-neutral-500 hover:text-neutral-950 dark:hover:text-white">{showConfirmPassword ? "Hide" : "Show"}</button></div></label>}{!isSignUp && <label className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400"><input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} className="size-3.5 accent-neutral-950" /> Remember me</label>}{isSignUp && <label className="flex items-start gap-2 text-xs leading-5 text-neutral-600 dark:text-neutral-400"><input type="checkbox" checked={terms} onChange={(event) => setTerms(event.target.checked)} className="mt-1 size-3.5 shrink-0 accent-neutral-950" /> I agree to the PSS Logistics terms and demo account conditions.</label>}{error && <p role="alert" className="border border-red-300 bg-red-50 px-3 py-2.5 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">{error}</p>}{notice && <p role="status" className="border border-neutral-300 bg-neutral-100 px-3 py-2.5 text-xs text-neutral-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">{notice}</p>}<button type="submit" disabled={submitting} className="h-11 w-full border border-neutral-950 bg-neutral-950 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-wait disabled:opacity-50 dark:border-white dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200">{submitting ? "Working…" : isSignUp ? "Create client account" : "Sign in"}</button></form><div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200 pt-5 text-xs dark:border-neutral-800">{isSignUp ? <Link href="/sign-in" className="font-semibold underline underline-offset-4">Already have an account? Sign in</Link> : <><button type="button" onClick={() => setNotice("Password recovery is WILL DO LATER.")} className="text-neutral-500 underline underline-offset-4 hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-white">Forgot password?</button><Link href="/sign-up" className="font-semibold underline underline-offset-4">Create client account</Link></>}</div></div></div></section><footer className="flex justify-between text-[10px] uppercase tracking-[0.16em] text-neutral-500 dark:text-neutral-500"><span>Client workspace</span><span>Frontend demo</span></footer></div></main>;
}
