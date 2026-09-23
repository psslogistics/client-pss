"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCheck, CheckCircle2, CircleAlert, Info, Search, Settings2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { pssApi } from "@/lib/pss-api";
import type { NotificationCategory, NotificationItem, NotificationTone } from "@/components/block/notifications-data";

type Filter = "All" | "Unread" | NotificationCategory;

const toneStyles: Record<NotificationTone, string> = {
  info: "bg-primary/10 text-primary",
  success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  warning: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  critical: "bg-destructive/10 text-destructive",
};

const toneBorder: Record<NotificationTone, string> = {
  info: "border-primary/20",
  success: "border-emerald-500/20",
  warning: "border-amber-500/25",
  critical: "border-destructive/25",
};

const toneIcon: Record<NotificationTone, typeof Info> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  critical: CircleAlert,
};

const filters: Filter[] = ["All", "Unread", "Shipments", "Operations", "Billing", "System", "Support"];

export default function NotificationsAlerts() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("All");
  const [allNotifications, setAllNotifications] = useState<NotificationItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void pssApi<{ data: Array<Record<string, unknown>> }>("/v1/notifications").then((result) => {
      if (cancelled) return;
      setAllNotifications(result.data.map((row) => ({
        id: String(row.id), category: (String(row.category ?? "System").replace(/^\w/, (value) => value.toUpperCase()) as NotificationCategory),
        tone: (row.type === "warning" ? "warning" : row.type === "critical" ? "critical" : row.type === "success" ? "success" : "info") as NotificationTone,
        title: String(row.title ?? "Notification"), message: String(row.message ?? ""), time: row.created_at ? new Date(String(row.created_at)).toLocaleString() : "", unread: !Boolean(row.is_read),
        actionLabel: "Open", actionHref: String(row.action_href ?? "/dashboard")
      })));
      setHydrated(true);
    }).catch((reason) => { if (!cancelled) { setError(reason instanceof Error ? reason.message : "Unable to load notifications."); setHydrated(true); } });
    return () => { cancelled = true; };
  }, []);
  const unreadIds = useMemo(() => hydrated ? allNotifications.filter((item) => item.unread).map((item) => item.id) : [], [allNotifications, hydrated]);
  const isRead = (id: string) => !allNotifications.find((item) => item.id === id)?.unread;
  const visibleNotifications = useMemo(() => allNotifications.filter((item) => {
    const matchesFilter = filter === "All" || (filter === "Unread" ? unreadIds.includes(item.id) : item.category === filter);
    const haystack = `${item.title} ${item.message} ${item.category}`.toLowerCase();
    return matchesFilter && haystack.includes(query.toLowerCase());
  }), [allNotifications, filter, query, unreadIds]);
  const urgentNotifications = visibleNotifications.filter((item) => item.tone === "critical" || item.tone === "warning").slice(0, 3);

  const markRead = (item: NotificationItem) => {
    void pssApi(`/v1/notifications/${item.id}`, { method: "PATCH", headers: { "Idempotency-Key": crypto.randomUUID() }, body: JSON.stringify({ is_read: true }) }).then(() => { setAllNotifications((current) => current.map((entry) => entry.id === item.id ? { ...entry, unread: false } : entry)); window.dispatchEvent(new Event("pss-notifications-updated")); }).catch((reason) => setError(reason instanceof Error ? reason.message : "Unable to update notification."));
  };

  const markAllRead = () => {
    void Promise.all(unreadIds.map((id) => pssApi(`/v1/notifications/${id}`, { method: "PATCH", headers: { "Idempotency-Key": crypto.randomUUID() }, body: JSON.stringify({ is_read: true }) }))).then(() => { setAllNotifications((current) => current.map((item) => ({ ...item, unread: false }))); window.dispatchEvent(new Event("pss-notifications-updated")); }).catch((reason) => setError(reason instanceof Error ? reason.message : "Unable to update notifications."));
  };

  return (
    <main className="flex w-full flex-col gap-4">

      {error && <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive">{error}</p>}
      {urgentNotifications.length > 0 && <section className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 shadow-xs sm:p-5" aria-labelledby="priority-alerts-title"><div className="flex items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-destructive/10 text-destructive"><CircleAlert className="h-4 w-4" /></span><div><div className="flex flex-wrap items-center gap-2"><h2 id="priority-alerts-title" className="text-sm font-semibold">Priority operational alerts</h2><span className="rounded-full border border-destructive/20 bg-background/60 px-2 py-0.5 text-[10px] font-semibold text-destructive">Needs attention</span></div><p className="mt-1 text-xs leading-5 text-muted-foreground">Changes that may affect active shipments, pickups, or service availability.</p></div></div><div className="mt-4 grid gap-2 lg:grid-cols-3">{urgentNotifications.map((item) => <NotificationCard key={item.id} item={item} isRead={isRead(item.id)} onRead={markRead} compact />)}</div></section>}

      <section className="overflow-hidden rounded-xl border border-border bg-card shadow-xs" aria-labelledby="all-notifications-title">
        <div className="flex flex-col gap-3 border-b border-border/70 p-4 sm:p-5"><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div><h2 id="all-notifications-title" className="text-sm font-semibold">All notifications</h2><p className="mt-1 text-xs text-muted-foreground"><span className="font-semibold text-primary">{unreadIds.length} unread</span> across your logistics workspace</p></div><div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto"><label className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-lg border border-input bg-background px-3 sm:min-w-64 lg:max-w-xs"><Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search notifications…" aria-label="Search notifications" className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground" />{query && <button type="button" onClick={() => setQuery("")} aria-label="Clear notification search"><X className="h-3.5 w-3.5 text-muted-foreground" /></button>}</label><button type="button" onClick={markAllRead} disabled={!unreadIds.length} className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-input px-3 text-xs font-semibold transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"><CheckCheck className="h-3.5 w-3.5" /> Mark all read</button></div></div><div className="flex gap-1.5 overflow-x-auto pb-0.5" role="tablist" aria-label="Notification filters">{filters.map((item) => <button key={item} type="button" role="tab" aria-selected={filter === item} onClick={() => setFilter(item)} className={cn("shrink-0 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition", filter === item ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground")}>{item}{item === "Unread" && <span className="ml-1">{unreadIds.length}</span>}</button>)}</div></div>
        <div className="divide-y divide-border/70">{!hydrated ? <div className="flex min-h-48 flex-col items-center justify-center px-5 text-center"><Settings2 className="h-5 w-5 animate-pulse text-muted-foreground/50" /><p className="mt-3 text-sm font-semibold">Loading production notifications…</p><p className="mt-1 text-xs text-muted-foreground">Checking your notification feed.</p></div> : visibleNotifications.length ? visibleNotifications.map((item) => <NotificationCard key={item.id} item={item} isRead={isRead(item.id)} onRead={markRead} />) : <div className="flex min-h-48 flex-col items-center justify-center px-5 text-center"><Settings2 className="h-5 w-5 text-muted-foreground/50" /><p className="mt-3 text-sm font-semibold">No notifications found</p><p className="mt-1 text-xs text-muted-foreground">Try another filter or search term.</p></div>}</div>
      </section>
    </main>
  );
}

function NotificationCard({ item, isRead, onRead, compact = false }: { item: NotificationItem; isRead: boolean; onRead: (item: NotificationItem) => void; compact?: boolean }) {
  const Icon = toneIcon[item.tone];
  return <article className={cn("flex gap-3 p-4 transition hover:bg-accent/30 sm:p-5", !isRead && "bg-primary/[0.025]", compact && "rounded-lg border bg-background p-3 sm:p-3", toneBorder[item.tone])}><span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl", toneStyles[item.tone])}><Icon className="h-4 w-4" /></span><div className="min-w-0 flex-1"><div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3"><div className="flex min-w-0 items-center gap-2"><h3 className={cn("truncate text-sm", !isRead ? "font-semibold" : "font-medium")}>{item.title}</h3>{!isRead && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-label="Unread" />}</div><span className="shrink-0 text-[10px] text-muted-foreground">{item.time}</span></div><p className="mt-1 text-xs leading-5 text-muted-foreground">{item.message}</p><div className="mt-3 flex flex-wrap items-center gap-2"><span className="rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">{item.category}</span><Link href={item.actionHref} onClick={() => onRead(item)} className="inline-flex items-center rounded-lg bg-primary px-2.5 py-1.5 text-[11px] font-semibold text-primary-foreground transition hover:bg-primary/90">{item.actionLabel}</Link>{!isRead && <button type="button" onClick={() => onRead(item)} className="rounded-lg border border-input px-2.5 py-1.5 text-[11px] font-semibold text-muted-foreground hover:bg-accent">Mark read</button>}</div></div></article>;
}
