"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, FileText, LockKeyhole, Phone, ShieldCheck, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { SkeletonFormSection } from "@/components/ui/skeleton";

type KycStatus = "not_started" | "draft" | "submitted" | "under_review" | "needs_changes" | "approved" | "rejected" | "suspended";
type KycProfile = { client_id: string; status: KycStatus; gst_number: string | null; pan_number: string | null; aadhaar_last4: string | null; mobile_number: string | null; phone_verified_at: string | null; review_notes: string | null };
type DocumentRow = { document_type: "aadhaar" | "gst" | "pan" | "other"; original_filename: string; status: string };

const inputClass = "h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10";
const requiredDocuments = ["aadhaar", "gst", "pan"] as const;
const documentLabel = (type: string) => type === "aadhaar" ? "Aadhaar" : type.toUpperCase();

export default function ClientKycForm() {
  const supabase = useMemo(() => createClient(), []);
  const [profile, setProfile] = useState<KycProfile | null>(null);
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Your session has expired. Please sign in again."); setLoading(false); return; }
    const { data: membership } = await supabase.from("client_memberships").select("client_id").eq("user_id", user.id).eq("membership_status", "active").order("is_primary", { ascending: false }).limit(1).maybeSingle();
    if (!membership?.client_id) { setError("An active client assignment is required for KYC."); setLoading(false); return; }
    const [{ data: nextProfile, error: profileError }, { data: nextDocuments, error: documentError }] = await Promise.all([
      supabase.from("client_kyc_profiles").select("client_id,status,gst_number,pan_number,aadhaar_last4,mobile_number,phone_verified_at,review_notes").eq("client_id", membership.client_id).maybeSingle(),
      supabase.from("client_kyc_documents").select("document_type,original_filename,status").eq("client_id", membership.client_id),
    ]);
    if (profileError || documentError) setError("KYC details could not be loaded.");
    let resolvedProfile = nextProfile as KycProfile | null;
    if (!resolvedProfile) {
      const created = await supabase.from("client_kyc_profiles").insert({ client_id: membership.client_id, status: "draft" }).select("client_id,status,gst_number,pan_number,aadhaar_last4,mobile_number,phone_verified_at,review_notes").single();
      if (!created.error) resolvedProfile = created.data as KycProfile;
    }
    setProfile(resolvedProfile);
    setPhone(resolvedProfile?.mobile_number ?? "");
    setDocuments((nextDocuments ?? []) as DocumentRow[]);
    setLoading(false);
  };

  // The initial load synchronizes the form with the authenticated Supabase session.
  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
  useEffect(() => { void load(); }, []);

  const updateFields = async (fields: Partial<Pick<KycProfile, "gst_number" | "pan_number" | "aadhaar_last4">>) => {
    if (!profile) return;
    setSaving(true); setError(""); setNotice("");
    const { error: updateError } = await supabase.from("client_kyc_profiles").update(fields).eq("client_id", profile.client_id);
    setSaving(false);
    if (updateError) setError("KYC details could not be saved."); else { setProfile((current) => current ? { ...current, ...fields } : current); setNotice("KYC details saved."); }
  };

  const sendOtp = async () => {
    const normalized = phone.replace(/[^0-9+]/g, "");
    if (!/^\+?[0-9]{10,15}$/.test(normalized)) { setError("Enter an active mobile number with 10 to 15 digits."); return; }
    setSaving(true); setError("");
    const { error: updateError } = await supabase.auth.updateUser({ phone: normalized });
    setSaving(false);
    if (updateError) { setError(updateError.message); return; }
    setOtpSent(true); setNotice("OTP sent to the mobile number. Enter it to verify.");
  };

  const verifyOtp = async () => {
    setSaving(true); setError("");
    const normalized = phone.replace(/[^0-9+]/g, "");
    const { error: verifyError } = await supabase.auth.verifyOtp({ phone: normalized, token: otp.trim(), type: "phone_change" });
    if (verifyError) { setSaving(false); setError(verifyError.message); return; }
    const { error: markError } = await supabase.rpc("mark_client_phone_verified");
    setSaving(false);
    if (markError) { setError("The mobile number was verified, but KYC verification could not be recorded."); return; }
    setOtpSent(false); setOtp(""); setNotice("Mobile number verified successfully."); await load();
  };

  const uploadDocument = async (type: typeof requiredDocuments[number], file: File | null) => {
    if (!profile || !file) return;
    if (!['application/pdf', 'image/jpeg', 'image/png'].includes(file.type) || file.size > 10 * 1024 * 1024) { setError("Upload a PDF, JPG, or PNG file up to 10 MB."); return; }
    setSaving(true); setError(""); setNotice("");
    const extension = file.name.split(".").pop()?.toLowerCase() || "bin";
    const path = `${profile.client_id}/${type}/${crypto.randomUUID()}.${extension}`;
    const upload = await supabase.storage.from("client-kyc-documents").upload(path, file, { contentType: file.type, upsert: true });
    if (upload.error) { setSaving(false); setError("The document could not be uploaded."); return; }
    const { error: rowError } = await supabase.from("client_kyc_documents").upsert({ client_id: profile.client_id, document_type: type, object_path: path, original_filename: file.name, content_type: file.type, status: "submitted", uploaded_by: (await supabase.auth.getUser()).data.user?.id }, { onConflict: "client_id,document_type" });
    setSaving(false);
    if (rowError) { setError("The document record could not be saved."); return; }
    setFiles((current) => ({ ...current, [type]: file })); setNotice(`${documentLabel(type)} document uploaded.`); await load();
  };

  const submit = async () => {
    setSaving(true); setError(""); setNotice("");
    const { data, error: submitError } = await supabase.rpc("submit_client_kyc");
    setSaving(false);
    if (submitError) { setError(submitError.message.includes("mandatory") || submitError.message.includes("requires") ? submitError.message : "KYC could not be submitted."); return; }
    setProfile(data as KycProfile); setNotice("KYC request submitted to Super Admin for review.");
  };

  const hasDocument = (type: string) => documents.some((document) => document.document_type === type);
  const complete = Boolean(profile?.gst_number && profile.pan_number && profile.aadhaar_last4 && profile.phone_verified_at && requiredDocuments.every(hasDocument));
  const status = profile?.status ?? "not_started";

  if (loading) return <section className="rounded-xl border border-border bg-card p-5" role="status" aria-label="Loading KYC requirements" aria-busy="true"><SkeletonFormSection fields={4} /><SkeletonFormSection className="mt-5" fields={3} /></section>;
  return <section className="rounded-xl border border-border bg-card shadow-xs">
    <div className="border-b border-border/70 px-4 py-4 sm:px-5"><div className="flex items-start justify-between gap-3"><div><h2 className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="h-4 w-4 text-primary" />Mandatory KYC for shipment booking</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">Aadhaar, GST, PAN, and an OTP-verified mobile number are required before you can start booking.</p></div><span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-primary">{status.replaceAll("_", " ")}</span></div></div>
    <div className="space-y-5 p-4 sm:p-5">
      {notice && <div role="status" className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-700">{notice}</div>}
      {error && <div role="alert" className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive">{error}</div>}
      {profile?.review_notes && <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-800">Super Admin note: {profile.review_notes}</div>}
      <div className="grid gap-4 sm:grid-cols-3"><label className="block"><span className="mb-1.5 block text-[11px] font-semibold text-muted-foreground">GST number *</span><input className={inputClass} value={profile?.gst_number ?? ""} onChange={(event) => setProfile((current) => current ? { ...current, gst_number: event.target.value.toUpperCase() } : current)} onBlur={() => void updateFields({ gst_number: profile?.gst_number ?? "" })} placeholder="15-character GSTIN" /></label><label className="block"><span className="mb-1.5 block text-[11px] font-semibold text-muted-foreground">PAN number *</span><input className={inputClass} value={profile?.pan_number ?? ""} onChange={(event) => setProfile((current) => current ? { ...current, pan_number: event.target.value.toUpperCase() } : current)} onBlur={() => void updateFields({ pan_number: profile?.pan_number ?? "" })} placeholder="10-character PAN" /></label><label className="block"><span className="mb-1.5 block text-[11px] font-semibold text-muted-foreground">Aadhaar last 4 digits *</span><input className={inputClass} inputMode="numeric" maxLength={4} value={profile?.aadhaar_last4 ?? ""} onChange={(event) => setProfile((current) => current ? { ...current, aadhaar_last4: event.target.value.replace(/\D/g, "").slice(0, 4) } : current)} onBlur={() => void updateFields({ aadhaar_last4: profile?.aadhaar_last4 ?? "" })} placeholder="Last 4 digits" /></label></div>
      <div className="rounded-xl border border-border/70 p-4"><div className="flex items-center gap-2 text-xs font-semibold"><Phone className="h-4 w-4 text-primary" />Active mobile number and OTP verification</div><div className="mt-3 flex flex-col gap-2 sm:flex-row"><input className={inputClass} value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+91XXXXXXXXXX" disabled={Boolean(profile?.phone_verified_at)} /><button type="button" onClick={() => void sendOtp()} disabled={saving || Boolean(profile?.phone_verified_at)} className="h-10 shrink-0 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground disabled:opacity-50">{saving ? "Sending…" : "Send OTP"}</button></div>{otpSent && <div className="mt-3 flex flex-col gap-2 sm:flex-row"><input className={inputClass} value={otp} onChange={(event) => setOtp(event.target.value)} placeholder="Enter OTP" inputMode="numeric" /><button type="button" onClick={() => void verifyOtp()} disabled={saving || !otp.trim()} className="h-10 shrink-0 rounded-lg border border-primary px-3 text-xs font-semibold text-primary disabled:opacity-50">Verify mobile</button></div>}{profile?.phone_verified_at && <p className="mt-2 flex items-center gap-1.5 text-xs text-emerald-700"><Check className="h-3.5 w-3.5" />Mobile number verified</p>}</div>
      <div className="grid gap-3 sm:grid-cols-3">{requiredDocuments.map((type) => <label key={type} className="cursor-pointer rounded-xl border border-border/70 p-4 hover:border-primary/50"><span className="flex items-center gap-2 text-xs font-semibold"><FileText className="h-4 w-4 text-primary" />{documentLabel(type)} document *</span><span className="mt-1 block truncate text-[11px] text-muted-foreground">{files[type]?.name ?? (hasDocument(type) ? "Uploaded" : "PDF, JPG, or PNG up to 10 MB")}</span><span className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-input px-2.5 py-1.5 text-[11px] font-semibold"><Upload className="h-3.5 w-3.5" />Upload</span><input type="file" accept="application/pdf,image/jpeg,image/png" className="sr-only" onChange={(event) => void uploadDocument(type, event.target.files?.[0] ?? null)} /></label>)}</div>
      <div className="flex items-start gap-2 rounded-lg bg-muted/40 px-3 py-3 text-xs leading-5 text-muted-foreground"><LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-primary" />Documents are stored in a private secure area and reviewed only for KYC authorization.</div>
      <div className="flex flex-col gap-3 border-t border-border/70 pt-4 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-muted-foreground">{status === "approved" ? "KYC approved. Shipment booking is enabled." : "Submit only after all mandatory details and documents are complete."}</p><button type="button" onClick={() => void submit()} disabled={saving || !complete || status === "approved" || status === "under_review" || status === "submitted"} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"><ShieldCheck className="h-4 w-4" />{status === "approved" ? "KYC approved" : status === "under_review" || status === "submitted" ? "Awaiting review" : "Submit KYC for review"}</button></div>
    </div>
  </section>;
}
