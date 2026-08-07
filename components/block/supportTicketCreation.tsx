"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Clock3, FileText, LifeBuoy, Mail, MessageSquare, Search, Send, ShieldCheck, UserRound, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = "tickets" | "new" | "contact";
type TicketStatus = "Open" | "Pending" | "Resolved" | "Closed";
type TicketPriority = "Low" | "High" | "Urgent";
type ChatMessage = { id: number; sender: "user" | "support"; text: string; time: string };

type Ticket = {
  id: string;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: string;
  requester?: string;
  messages: number;
  updated: string;
};

const tickets: Ticket[] = [
  { id: "TKT20260008", status: "Resolved", priority: "Urgent", subject: "Tracking discrepancy", messages: 6, updated: "about 6 hours ago", category: "Pickup", requester: "Omar Hassan" },
  { id: "TKT20260010", status: "Pending", priority: "Low", subject: "Tracking discrepancy", messages: 6, updated: "about 7 hours ago", category: "Tracking" },
  { id: "TKT20260004", status: "Pending", priority: "Urgent", subject: "Rate quote request", messages: 8, updated: "about 16 hours ago", category: "Pickup", requester: "Elena Petrov" },
  { id: "TKT20260001", status: "Resolved", priority: "Low", subject: "Pickup rescheduling needed", messages: 8, updated: "about 16 hours ago", category: "Account", requester: "Priya Sharma" },
  { id: "TKT20260003", status: "Resolved", priority: "Urgent", subject: "Shipment delayed at customs", messages: 5, updated: "about 21 hours ago", category: "Claims" },
  { id: "TKT20260005", status: "Pending", priority: "High", subject: "Account access issue", messages: 8, updated: "1 day ago", category: "Billing", requester: "Carlos Mendez" },
  { id: "TKT20260002", status: "Closed", priority: "High", subject: "Shipment delayed at customs", messages: 8, updated: "1 day ago", category: "Documentation", requester: "Sarah Johnson" },
  { id: "TKT20260007", status: "Open", priority: "Urgent", subject: "Documentation error", messages: 7, updated: "1 day ago", category: "Tracking", requester: "Sarah Johnson" },
  { id: "TKT20260006", status: "Resolved", priority: "High", subject: "Account access issue", messages: 5, updated: "1 day ago", category: "Billing", requester: "Priya Sharma" },
  { id: "TKT20260009", status: "Pending", priority: "Urgent", subject: "Documentation error", messages: 6, updated: "1 day ago", category: "Billing" },
];

const statusStyles: Record<TicketStatus, string> = {
  Open: "border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-300",
  Pending: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  Resolved: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  Closed: "border-border bg-muted text-muted-foreground",
};

const priorityStyles: Record<TicketPriority, string> = {
  Low: "text-muted-foreground",
  High: "text-amber-600 dark:text-amber-400",
  Urgent: "text-destructive",
};

const initialChatMessages: ChatMessage[] = [
  { id: 1, sender: "user", text: "Could you please help us review the latest update on this request? The shipment details may need another verification.", time: "about 6 hours ago" },
  { id: 2, sender: "support", text: "Thanks for reaching out. Our operations team is checking this with the relevant courier and will update the ticket with the next action.", time: "Support team · 1 hour ago" },
];

function StatusBadge({ status }: { status: TicketStatus }) {
  return <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold", statusStyles[status])}>{status}</span>;
}

export default function SupportTicketCreation() {
  const [tab, setTab] = useState<Tab>("tickets");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(tickets[0].id);
  const [notice, setNotice] = useState("");
  const [category, setCategory] = useState("Tracking");
  const [priority, setPriority] = useState<TicketPriority>("High");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [chatDraft, setChatDraft] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(initialChatMessages);
  const [menuOpen, setMenuOpen] = useState<"category" | "priority" | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(null);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 3200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const filteredTickets = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return tickets;
    return tickets.filter((ticket) => [ticket.id, ticket.subject, ticket.category, ticket.requester].filter(Boolean).some((value) => value!.toLowerCase().includes(normalized)));
  }, [query]);

  const selectedTicket = tickets.find((ticket) => ticket.id === selectedId) || tickets[0];
  const sendChatMessage = () => {
    const text = chatDraft.trim();
    if (!text) return;
    setChatMessages((current) => [...current, { id: Date.now(), sender: "user", text, time: "Just now" }]);
    setChatDraft("");
    window.setTimeout(() => setChatMessages((current) => [...current, { id: Date.now() + 1, sender: "support", text: "Thanks for your message. A PSS support specialist is reviewing this and will respond with the next update.", time: "Just now" }]), 700);
  };
  const createTicket = () => {
    if (!subject.trim() || !description.trim()) {
      setNotice("Add a subject and description before submitting.");
      return;
    }
    setNotice("Ticket created successfully. Our support team will respond shortly.");
    setSubject("");
    setDescription("");
    setTab("tickets");
  };

  return <div className="flex h-[calc(100vh-5.5rem)] max-h-[calc(100vh-5.5rem)] w-full flex-col overflow-hidden">
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-xs">
      <div className="flex flex-col gap-3 border-b border-border/70 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div><h1 className="flex items-center gap-2 text-base font-semibold"><LifeBuoy className="h-4 w-4 text-primary" />Support</h1><p className="mt-1 text-xs text-muted-foreground">Get help, track tickets, and contact our support team.</p></div>
        <div className="flex rounded-lg bg-muted/60 p-1" role="tablist" aria-label="Support views">
          {([['tickets', 'My Tickets'], ['new', 'New Ticket'], ['contact', 'Contact Us']] as const).map(([value, label]) => <button key={value} type="button" role="tab" aria-selected={tab === value} onClick={() => setTab(value)} className={cn("rounded-md px-3 py-1.5 text-xs font-semibold transition", tab === value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>{label}</button>)}
        </div>
      </div>

      {tab === "tickets" && <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(300px,0.85fr)_minmax(0,1.4fr)]">
        <div className="flex min-h-0 flex-col border-b border-border/70 lg:border-b-0 lg:border-r">
          <div className="shrink-0 border-b border-border/70 p-4"><label className="flex h-9 items-center gap-2 rounded-lg border border-input bg-background px-3"><Search className="h-3.5 w-3.5 text-muted-foreground" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tickets…" aria-label="Search tickets" className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground" />{query && <button type="button" onClick={() => setQuery("")} aria-label="Clear ticket search"><X className="h-3.5 w-3.5 text-muted-foreground" /></button>}</label></div>
          <div className="min-h-0 flex-1 overflow-y-auto p-2">{filteredTickets.map((ticket) => <button key={ticket.id} type="button" onClick={() => setSelectedId(ticket.id)} className={cn("mb-1 w-full rounded-lg border p-3 text-left transition last:mb-0", selectedId === ticket.id ? "border-primary/35 bg-primary/5" : "border-transparent hover:border-border hover:bg-accent/50")}><div className="flex items-center justify-between gap-2"><span className="font-mono text-[10px] text-muted-foreground">{ticket.id}</span><StatusBadge status={ticket.status} /></div><p className="mt-2 truncate text-sm font-semibold">{ticket.subject}</p><div className="mt-2 flex items-center gap-2 text-[10px] text-muted-foreground"><span>{ticket.category}</span><span>·</span><span className={cn("font-semibold", priorityStyles[ticket.priority])}>{ticket.priority}</span><span className="ml-auto">{ticket.updated}</span></div></button>)}{!filteredTickets.length && <p className="px-3 py-8 text-center text-xs text-muted-foreground">No tickets match your search.</p>}</div>
        </div>
        <div className="flex flex-col p-4 sm:p-5">
          <div className="flex flex-col gap-3 border-b border-border/70 pb-4 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><span className="font-mono text-sm font-bold">{selectedTicket.id}</span><StatusBadge status={selectedTicket.status} /></div><h2 className="mt-2 text-lg font-semibold tracking-tight">{selectedTicket.subject}</h2><p className="mt-1 text-xs text-muted-foreground">{selectedTicket.category} {selectedTicket.requester && <>· raised by {selectedTicket.requester}</>}</p></div><span className={cn("rounded-full border border-border px-2.5 py-1 text-[10px] font-semibold", priorityStyles[selectedTicket.priority])}>{selectedTicket.priority} priority</span></div>
          <div className="mt-4 min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">{chatMessages.map((message) => message.sender === "user" ? <div key={message.id} className="flex justify-end gap-3"><div className="max-w-[85%] rounded-xl rounded-tr-sm bg-primary/10 px-3 py-2.5"><p className="text-right text-xs font-semibold text-primary">You</p><p className="mt-1 text-xs leading-5 text-foreground">{message.text}</p><p className="mt-2 text-right text-[10px] text-muted-foreground">{message.time}</p></div><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/10 text-primary"><UserRound className="h-4 w-4" /></span></div> : <div key={message.id} className="flex gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-500/10 text-emerald-600"><ShieldCheck className="h-4 w-4" /></span><div className="max-w-[85%] rounded-xl rounded-tl-sm border border-border bg-card px-3 py-2.5"><p className="text-xs font-semibold">PSS Support</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{message.text}</p><p className="mt-2 text-[10px] text-muted-foreground">{message.time}</p></div></div>)}</div>
          <form onSubmit={(event) => { event.preventDefault(); sendChatMessage(); }} className="mt-4 shrink-0 rounded-xl border border-border bg-muted/30 p-2"><div className="flex items-end gap-2"><textarea value={chatDraft} onChange={(event) => setChatDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); sendChatMessage(); } }} rows={1} placeholder="Write a message…" aria-label="Chat message" className="max-h-24 min-h-9 flex-1 resize-none bg-transparent px-2 py-2 text-xs outline-none placeholder:text-muted-foreground" /><button type="submit" disabled={!chatDraft.trim()} className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"><Send className="h-3.5 w-3.5" />Send</button></div><div className="mt-1 px-2 text-[10px] text-muted-foreground">Press Enter to send · Shift + Enter for a new line</div></form>
        </div>
      </div>}

      {tab === "new" && <div className="min-h-0 flex-1 overflow-y-auto"><div className="mx-auto w-full max-w-3xl p-4 sm:p-6"><div className="mb-5 flex items-start gap-3 rounded-xl bg-primary/5 p-4"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><FileText className="h-4 w-4" /></span><div><h2 className="text-sm font-semibold">Create a support ticket</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">Share the details and our operations team will route your request to the right specialist.</p></div></div><div className="grid gap-4 sm:grid-cols-2"><label className="sm:col-span-2"><span className="mb-1.5 block text-xs font-semibold">Subject</span><input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Briefly describe the issue" className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10" /></label><div ref={menuRef} className="relative"><span className="mb-1.5 block text-xs font-semibold">Category</span><button type="button" onClick={() => setMenuOpen(menuOpen === "category" ? null : "category")} className="flex h-10 w-full items-center justify-between rounded-lg border border-input bg-background px-3 text-left text-sm hover:bg-accent"><span>{category}</span><span className="text-muted-foreground">⌄</span></button>{menuOpen === "category" && <div className="absolute inset-x-0 top-full z-20 mt-1 rounded-xl border border-border bg-popover p-1 shadow-lg">{["Tracking", "Pickup", "Billing", "Documentation", "Claims", "Account"].map((item) => <button key={item} type="button" onClick={() => { setCategory(item); setMenuOpen(null); }} className={cn("block w-full rounded-lg px-3 py-2 text-left text-xs hover:bg-accent", category === item && "bg-primary/5 font-semibold text-primary")}>{item}</button>)}</div>}</div><div className="relative"><span className="mb-1.5 block text-xs font-semibold">Priority</span><button type="button" onClick={() => setMenuOpen(menuOpen === "priority" ? null : "priority")} className="flex h-10 w-full items-center justify-between rounded-lg border border-input bg-background px-3 text-left text-sm hover:bg-accent"><span className={priorityStyles[priority]}>{priority}</span><span className="text-muted-foreground">⌄</span></button>{menuOpen === "priority" && <div className="absolute inset-x-0 top-full z-20 mt-1 rounded-xl border border-border bg-popover p-1 shadow-lg">{(["Low", "High", "Urgent"] as TicketPriority[]).map((item) => <button key={item} type="button" onClick={() => { setPriority(item); setMenuOpen(null); }} className={cn("block w-full rounded-lg px-3 py-2 text-left text-xs hover:bg-accent", priorityStyles[item], priority === item && "bg-primary/5 font-semibold")}>{item}</button>)}</div>}</div><label className="sm:col-span-2"><span className="mb-1.5 block text-xs font-semibold">Description</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Include shipment references, dates, and any action already taken…" rows={7} className="w-full resize-y rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10" /></label></div><div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-4"><p className="text-[11px] text-muted-foreground">Typical response time: under 2 hours during business hours.</p><button type="button" onClick={createTicket} className="inline-flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"><Send className="h-3.5 w-3.5" />Submit ticket</button></div></div></div>}

      {tab === "contact" && <div className="min-h-0 flex-1 overflow-y-auto"><div className="grid h-full content-start gap-4 p-4 sm:grid-cols-2 sm:p-6 lg:grid-cols-3"><div className="rounded-xl border border-border bg-background p-4"><span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary"><MessageSquare className="h-4 w-4" /></span><h2 className="mt-4 text-sm font-semibold">Live chat</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">Talk to a support specialist about an active shipment or ticket.</p><button type="button" onClick={() => setNotice("Live chat is being connected for your account.")} className="mt-4 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90">Start chat</button></div><div className="rounded-xl border border-border bg-background p-4"><span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary"><Mail className="h-4 w-4" /></span><h2 className="mt-4 text-sm font-semibold">Email support</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">Send detailed documentation and we’ll respond within one business day.</p><a href="mailto:support@psslogi.com" className="mt-4 inline-flex rounded-lg border border-input px-3 py-2 text-xs font-semibold hover:bg-accent">support@psslogi.com</a></div><div className="rounded-xl border border-border bg-background p-4"><span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary"><Clock3 className="h-4 w-4" /></span><h2 className="mt-4 text-sm font-semibold">Support hours</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">Operations support is available around the clock for shipment-critical issues.</p><p className="mt-4 text-xs font-semibold text-emerald-600 dark:text-emerald-400">24/7 monitoring active</p></div></div></div>}
    </section>
    {notice && <div role="status" className="fixed bottom-5 right-5 z-50 flex max-w-sm items-start gap-2 rounded-xl border border-border bg-popover px-4 py-3 text-xs text-popover-foreground shadow-xl"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /><span>{notice}</span><button type="button" onClick={() => setNotice("")} aria-label="Dismiss notification"><X className="h-3.5 w-3.5 text-muted-foreground" /></button></div>}
  </div>;
}
