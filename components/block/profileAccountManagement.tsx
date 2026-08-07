"use client";

import { useState } from "react";
import {
  BriefcaseBusiness,
  Building2,
  Check,
  Clock3,
  FileCheck2,
  Globe2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Save,
  ShieldCheck,
  Upload,
  UserRound,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Profile = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  jobTitle: string;
  department: string;
  officeLocation: string;
  timezone: string;
  emergencyName: string;
  emergencyPhone: string;
};

type BusinessProfile = {
  gstin: string;
  pan: string;
  legalName: string;
  tradeName: string;
  businessType: string;
  addressLine: string;
  city: string;
  district: string;
  state: string;
  pincode: string;
  email: string;
  phone: string;
  signatoryName: string;
  signatoryDesignation: string;
  signatoryEmail: string;
  signatoryPhone: string;
};

type BusinessDocuments = {
  gstCertificate: string;
  panDocument: string;
  addressProof: string;
  signatoryAuthorization: string;
};

const initialProfile: Profile = {
  firstName: "Alex",
  lastName: "Morgan",
  email: "alex.morgan@psslogistics.io",
  phone: "+1 (415) 555-0192",
  jobTitle: "Operations Lead",
  department: "Operations",
  officeLocation: "San Francisco, CA",
  timezone: "America/Los_Angeles",
  emergencyName: "Jordan Morgan",
  emergencyPhone: "+1 (415) 555-0193",
};

const initialBusinessProfile: BusinessProfile = {
  gstin: "27AABCP1234F1Z5",
  pan: "AABCP1234F",
  legalName: "PSS Logistics India Pvt. Ltd.",
  tradeName: "PSS Logistics",
  businessType: "Private Limited Company",
  addressLine: "402, Logistics Business Park, Andheri East",
  city: "Mumbai",
  district: "Mumbai Suburban",
  state: "Maharashtra",
  pincode: "400069",
  email: "accounts@psslogistics.io",
  phone: "+91 22 4567 8900",
  signatoryName: "Alex Morgan",
  signatoryDesignation: "Authorized Signatory",
  signatoryEmail: "alex.morgan@psslogistics.io",
  signatoryPhone: "+91 98765 43210",
};

const initialBusinessDocuments: BusinessDocuments = {
  gstCertificate: "GST-registration-certificate.pdf",
  panDocument: "Company-PAN.pdf",
  addressProof: "Principal-place-address-proof.pdf",
  signatoryAuthorization: "Authorized-signatory-letter.pdf",
};

const inputClass =
  "h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/70 focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-default disabled:opacity-100";

function Metric({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "primary" | "success" }) {
  return (
    <div className="min-w-0 flex-1 rounded-xl border border-border bg-card px-3 py-2.5 shadow-xs">
      <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-lg font-bold", tone === "primary" && "text-primary", tone === "success" && "text-emerald-600 dark:text-emerald-400")}>
        {value}
      </p>
    </div>
  );
}

function Field({ label, value, editing, onChange, type = "text", placeholder }: { label: string; value: string; editing: boolean; onChange: (value: string) => void; type?: string; placeholder?: string }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-[11px] font-semibold text-muted-foreground">{label}</span>
      <input type={type} value={value} placeholder={placeholder} disabled={!editing} onChange={(event) => onChange(event.target.value)} className={inputClass} />
    </label>
  );
}

function DocumentField({ label, value, editing, onChange }: { label: string; value: string; editing: boolean; onChange: (value: string) => void }) {
  return (
    <label className={cn("flex min-h-16 items-center justify-between gap-3 rounded-xl border border-border bg-background px-3 py-2.5", editing && "cursor-pointer hover:border-primary/40 hover:bg-accent/40")}>
      <span className="flex min-w-0 items-center gap-2.5"><FileCheck2 className="h-4 w-4 shrink-0 text-emerald-500" /><span className="min-w-0"><span className="block text-[11px] font-semibold">{label}</span><span className="mt-0.5 block truncate text-[10px] text-muted-foreground">{value || "Document not uploaded"}</span></span></span>
      {editing && <><span className="inline-flex shrink-0 items-center gap-1 text-[10px] font-semibold text-primary"><Upload className="h-3.5 w-3.5" />Replace</span><input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={(event) => onChange(event.target.files?.[0]?.name || value)} /></>}
    </label>
  );
}

export default function ProfileAccountManagement() {
  const [activeView, setActiveView] = useState<"personal" | "business">("personal");
  const [profile, setProfile] = useState(initialProfile);
  const [savedProfile, setSavedProfile] = useState(initialProfile);
  const [business, setBusiness] = useState(initialBusinessProfile);
  const [savedBusiness, setSavedBusiness] = useState(initialBusinessProfile);
  const [documents, setDocuments] = useState(initialBusinessDocuments);
  const [savedDocuments, setSavedDocuments] = useState(initialBusinessDocuments);
  const [editing, setEditing] = useState(false);
  const [businessEditing, setBusinessEditing] = useState(false);
  const [notice, setNotice] = useState("");

  const updateProfile = (key: keyof Profile, value: string) => {
    setProfile((current) => ({ ...current, [key]: value }));
    setNotice("");
  };

  const updateBusiness = (key: keyof BusinessProfile, value: string) => {
    setBusiness((current) => ({ ...current, [key]: value }));
    setNotice("");
  };

  const startEditing = () => { setNotice(""); setEditing(true); };
  const cancelEditing = () => { setProfile(savedProfile); setNotice(""); setEditing(false); };
  const saveProfile = () => { setSavedProfile(profile); setEditing(false); setNotice("Profile changes saved successfully."); };
  const startBusinessEditing = () => { setNotice(""); setBusinessEditing(true); };
  const cancelBusinessEditing = () => { setBusiness(savedBusiness); setDocuments(savedDocuments); setNotice(""); setBusinessEditing(false); };
  const saveBusiness = () => { setSavedBusiness(business); setSavedDocuments(documents); setBusinessEditing(false); setNotice("Business information saved and submitted for verification."); };

  const status = activeView === "personal" ? { label: "Account verified", detail: "KYC complete", verified: true } : { label: "Under verification", detail: "KYC incomplete", verified: false };

  return (
    <div className="w-full space-y-3">
      {notice && <div role="status" className="flex items-center justify-between rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300"><span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5" />{notice}</span><button type="button" onClick={() => setNotice("")} aria-label="Dismiss confirmation" className="rounded p-1 hover:bg-emerald-500/10"><X className="h-3.5 w-3.5" /></button></div>}

      <section className="rounded-xl border border-border bg-card p-4 shadow-xs sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-primary/10 text-lg font-bold text-primary">AM</div>
            <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="truncate text-lg font-bold tracking-tight">{profile.firstName} {profile.lastName}</h2><span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Active</span></div><p className="mt-1 text-sm text-muted-foreground">{profile.jobTitle} <span className="mx-1">·</span> {profile.department}</p><p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><Mail className="h-3 w-3" />{profile.email}</p></div>
          </div>
          <button type="button" onClick={activeView === "personal" ? (editing ? saveProfile : startEditing) : (businessEditing ? saveBusiness : startBusinessEditing)} className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary/90">{activeView === "personal" ? (editing ? <><Save className="h-3.5 w-3.5" />Save Changes</> : <><Pencil className="h-3.5 w-3.5" />Edit Profile</>) : (businessEditing ? <><Save className="h-3.5 w-3.5" />Save &amp; submit</> : <><Pencil className="h-3.5 w-3.5" />Edit business information</>)}</button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 border-t border-border/70 pt-4 sm:grid-cols-4"><Metric label="Shipments managed" value="1,284" tone="primary" /><Metric label="On-time rate" value="94.2%" tone="success" /><Metric label="Compliance score" value="98.5%" tone="success" /><Metric label="Member since" value="Mar 2024" /></div>
      </section>

      <section className="rounded-xl border border-border bg-card shadow-xs">
        <div className="flex flex-col gap-3 border-b border-border/70 px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="flex items-center gap-2 text-sm font-semibold">{activeView === "personal" ? <UserRound className="h-4 w-4 text-primary" /> : <Building2 className="h-4 w-4 text-primary" />}{activeView === "personal" ? "Personal information" : "Business information"}</h3><p className="mt-0.5 text-xs text-muted-foreground">{activeView === "personal" ? "Keep your contact details and work preferences up to date." : "Keep your business details and verification documents up to date."}</p></div><div className="flex items-center gap-2"><span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold", status.verified ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-amber-500/10 text-amber-700 dark:text-amber-300")}><span className={cn("h-1.5 w-1.5 rounded-full", status.verified ? "bg-emerald-500" : "bg-amber-500")} />{status.label}</span><span className="hidden text-[10px] text-muted-foreground sm:inline">{status.detail}</span></div></div>
          <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted/60 p-1 sm:w-fit"><button type="button" onClick={() => { setActiveView("personal"); setNotice(""); }} className={cn("rounded-md px-3 py-2 text-xs font-semibold transition", activeView === "personal" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>Personal information</button><button type="button" onClick={() => { setActiveView("business"); setNotice(""); }} className={cn("rounded-md px-3 py-2 text-xs font-semibold transition", activeView === "business" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>Business information</button></div>
        </div>

        {activeView === "personal" ? <div className="space-y-5 p-4 sm:p-5"><div className="grid gap-4 sm:grid-cols-2"><Field label="First name" value={profile.firstName} editing={editing} onChange={(value) => updateProfile("firstName", value)} /><Field label="Last name" value={profile.lastName} editing={editing} onChange={(value) => updateProfile("lastName", value)} /><Field label="Email" value={profile.email} editing={editing} onChange={(value) => updateProfile("email", value)} type="email" /><Field label="Phone" value={profile.phone} editing={editing} onChange={(value) => updateProfile("phone", value)} type="tel" /></div><div className="grid gap-4 border-t border-border/70 pt-5 sm:grid-cols-2"><Field label="Job title" value={profile.jobTitle} editing={editing} onChange={(value) => updateProfile("jobTitle", value)} /><Field label="Department" value={profile.department} editing={editing} onChange={(value) => updateProfile("department", value)} /><Field label="Office location" value={profile.officeLocation} editing={editing} onChange={(value) => updateProfile("officeLocation", value)} /><Field label="Timezone" value={profile.timezone} editing={editing} onChange={(value) => updateProfile("timezone", value)} /></div><div className="rounded-xl border border-border bg-muted/20 p-4"><div className="flex items-start gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><div><h4 className="text-xs font-semibold">Emergency contact</h4><p className="mt-0.5 text-[11px] text-muted-foreground">Used only for urgent account or shipment operations.</p></div></div><div className="mt-4 grid gap-4 sm:grid-cols-2"><Field label="Contact name" value={profile.emergencyName} editing={editing} onChange={(value) => updateProfile("emergencyName", value)} /><Field label="Contact phone" value={profile.emergencyPhone} editing={editing} onChange={(value) => updateProfile("emergencyPhone", value)} type="tel" /></div></div>{editing && <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-4"><p className="text-[11px] text-muted-foreground">Changes are saved to this account profile.</p><div className="flex gap-2"><button type="button" onClick={cancelEditing} className="inline-flex items-center gap-1.5 rounded-lg border border-input px-3 py-2 text-xs font-semibold hover:bg-accent"><X className="h-3.5 w-3.5" />Cancel</button><button type="button" onClick={saveProfile} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"><Save className="h-3.5 w-3.5" />Save Changes</button></div></div>}</div> : <div className="space-y-5 p-4 sm:p-5"><div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3"><p className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300"><ShieldCheck className="h-3.5 w-3.5" />Business verification is under review</p><p className="mt-1 text-[11px] text-muted-foreground">Your details are saved for administrator review. Business KYC is incomplete until verification is approved.</p></div><div className="grid gap-4 sm:grid-cols-2"><Field label="GSTIN" value={business.gstin} editing={businessEditing} onChange={(value) => updateBusiness("gstin", value)} placeholder="15-character GSTIN" /><Field label="PAN" value={business.pan} editing={businessEditing} onChange={(value) => updateBusiness("pan", value)} placeholder="Business PAN" /><Field label="Legal business name" value={business.legalName} editing={businessEditing} onChange={(value) => updateBusiness("legalName", value)} /><Field label="Trade/company name" value={business.tradeName} editing={businessEditing} onChange={(value) => updateBusiness("tradeName", value)} /><Field label="Business constitution/type" value={business.businessType} editing={businessEditing} onChange={(value) => updateBusiness("businessType", value)} /><Field label="Business email" value={business.email} editing={businessEditing} onChange={(value) => updateBusiness("email", value)} type="email" /><Field label="Business phone" value={business.phone} editing={businessEditing} onChange={(value) => updateBusiness("phone", value)} type="tel" /></div><div className="grid gap-4 border-t border-border/70 pt-5 sm:grid-cols-2"><Field label="Principal place of business" value={business.addressLine} editing={businessEditing} onChange={(value) => updateBusiness("addressLine", value)} /><Field label="City" value={business.city} editing={businessEditing} onChange={(value) => updateBusiness("city", value)} /><Field label="District" value={business.district} editing={businessEditing} onChange={(value) => updateBusiness("district", value)} /><Field label="State / UT" value={business.state} editing={businessEditing} onChange={(value) => updateBusiness("state", value)} /><Field label="PIN code" value={business.pincode} editing={businessEditing} onChange={(value) => updateBusiness("pincode", value)} /><div /></div><div className="rounded-xl border border-border bg-muted/20 p-4"><div className="flex items-start gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><div><h4 className="text-xs font-semibold">Authorized signatory</h4><p className="mt-0.5 text-[11px] text-muted-foreground">The person authorized to represent this business account.</p></div></div><div className="mt-4 grid gap-4 sm:grid-cols-2"><Field label="Full name" value={business.signatoryName} editing={businessEditing} onChange={(value) => updateBusiness("signatoryName", value)} /><Field label="Designation" value={business.signatoryDesignation} editing={businessEditing} onChange={(value) => updateBusiness("signatoryDesignation", value)} /><Field label="Email" value={business.signatoryEmail} editing={businessEditing} onChange={(value) => updateBusiness("signatoryEmail", value)} type="email" /><Field label="Phone" value={business.signatoryPhone} editing={businessEditing} onChange={(value) => updateBusiness("signatoryPhone", value)} type="tel" /></div></div><div className="border-t border-border/70 pt-5"><div className="mb-3"><h4 className="text-xs font-semibold">Verification documents</h4><p className="mt-0.5 text-[11px] text-muted-foreground">PDF, JPG or PNG files used for administrator review.</p></div><div className="grid gap-2 sm:grid-cols-2"><DocumentField label="GST registration certificate" value={documents.gstCertificate} editing={businessEditing} onChange={(value) => setDocuments((current) => ({ ...current, gstCertificate: value }))} /><DocumentField label="Company PAN document" value={documents.panDocument} editing={businessEditing} onChange={(value) => setDocuments((current) => ({ ...current, panDocument: value }))} /><DocumentField label="Principal place address proof" value={documents.addressProof} editing={businessEditing} onChange={(value) => setDocuments((current) => ({ ...current, addressProof: value }))} /><DocumentField label="Authorized signatory proof" value={documents.signatoryAuthorization} editing={businessEditing} onChange={(value) => setDocuments((current) => ({ ...current, signatoryAuthorization: value }))} /></div></div>{businessEditing && <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-4"><p className="text-[11px] text-muted-foreground">Submitting keeps the status as Under verification until admin approval.</p><div className="flex gap-2"><button type="button" onClick={cancelBusinessEditing} className="inline-flex items-center gap-1.5 rounded-lg border border-input px-3 py-2 text-xs font-semibold hover:bg-accent"><X className="h-3.5 w-3.5" />Cancel</button><button type="button" onClick={saveBusiness} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"><Save className="h-3.5 w-3.5" />Save &amp; submit for verification</button></div></div>}</div>}
      </section>

      <div className="flex flex-wrap gap-x-4 gap-y-2 px-1 text-[11px] text-muted-foreground"><span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{activeView === "personal" ? profile.phone : business.phone}</span><span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{activeView === "personal" ? profile.officeLocation : `${business.city}, ${business.state}`}</span><span className="inline-flex items-center gap-1"><Building2 className="h-3 w-3" />{activeView === "personal" ? profile.department : business.businessType}</span><span className="inline-flex items-center gap-1"><Globe2 className="h-3 w-3" />{activeView === "personal" ? profile.timezone : "India"}</span><span className="inline-flex items-center gap-1"><BriefcaseBusiness className="h-3 w-3" />{activeView === "personal" ? profile.jobTitle : business.tradeName}</span><span className="inline-flex items-center gap-1"><Clock3 className="h-3 w-3" />Joined Mar 15, 2024</span></div>
    </div>
  );
}
