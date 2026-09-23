"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarInset, SidebarMenu,
  SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger, useSidebar,
} from "@/components/ui/sidebar";
import {
  ChevronRight, User, Settings, Bell, Search, Moon, Sun,
} from "lucide-react";
import { PssIcon } from "@/components/ui/icon";
import { BrandLogo } from "@/components/ui/brand-logo";
import type { IconName } from "@/lib/iconography";
import { searchClientMaster } from "@/lib/master-search";
import { createClient } from "@/lib/supabase/client";
import { pssApi } from "@/lib/pss-api";

type NavItem = { title: string; icon: IconName; href: string };
type NavGroup = { title: string; description: string; items: NavItem[] };

const navigationGroups: NavGroup[] = [
  { title: "Shipment Operations", description: "Book, monitor, and move shipments", items: [
    { title: "All Shipments", icon: "shipments", href: "/dashboard/allShipments" },
    { title: "Tracking", icon: "tracking", href: "/dashboard/shipmentTracking" },
    { title: "Pickup", icon: "pickups", href: "/dashboard/pickupRequests" },
  ] },
  { title: "Network & Serviceability", description: "Manage locations and delivery coverage", items: [
    { title: "Warehouses", icon: "warehouse", href: "/dashboard/warehouseManagement" },
    { title: "Pincode Serviceability", icon: "tracking", href: "/dashboard/pincodeServiceability" },
  ] },
  { title: "Pricing & Finance", description: "Rates, reconciliation, and settlement", items: [
    { title: "Rate Calculator", icon: "billing", href: "/dashboard/rateCheck" },
    { title: "Rate Card", icon: "reports", href: "/dashboard/rateCard" },
    { title: "Weight Reconciliation", icon: "reports", href: "/dashboard/weightReconciliation" },
    { title: "Wallet", icon: "wallets", href: "/dashboard/walletManagement" },
    { title: "Billing", icon: "billing", href: "/dashboard/billingInvoiceManagement" },
    { title: "COD Remittance", icon: "billing", href: "/dashboard/codRemittance" },
  ] },
  { title: "Exceptions & Support", description: "Resolve delivery issues and get help", items: [
    { title: "NDR/Exceptions", icon: "exceptions", href: "/dashboard/ndrExceptions" },
    { title: "Support", icon: "support", href: "/dashboard/supportTicketCreation" },
  ] },
  { title: "Account & Preferences", description: "Notifications, profile, and settings", items: [
    { title: "Notifications", icon: "notifications", href: "/dashboard/notificationsAlerts" },
    { title: "Profile", icon: "user", href: "/dashboard/profileAccountManagement" },
    { title: "Settings", icon: "settings", href: "/dashboard/userSettings" },
  ] },
];

const navigation = navigationGroups.flatMap((group) => group.items);
const allRoutes = [{ title: "Dashboard", href: "/dashboard" }, ...navigation];

function NavItems({ items, pathname }: { items: NavItem[]; pathname: string }) {
  return (
    <SidebarMenu>
      {items.map((r) => (
        <SidebarMenuItem key={r.title}>
          <SidebarMenuButton isActive={pathname === r.href} render={<Link href={r.href} />} tooltip={r.title}>
            <PssIcon name={r.icon} size="lg" className="shrink-0 opacity-70" />
            <span>{r.title}</span>
            {pathname === r.href && <ChevronRight className="ml-auto size-3.5 opacity-40" />}
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}

function SidebarInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [themeReady, setThemeReady] = useState(false);
  const [profile, setProfile] = useState<{ display_name: string | null; email: string | null; company_name?: string | null }>({ display_name: null, email: null });
  const supabase = useMemo(() => createClient(), []);
  const [unreadCount, setUnreadCount] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const currentRoute = allRoutes.find((r) => r.href === pathname)?.title ?? "Dashboard";
  const searchResults = useMemo(() => searchClientMaster(searchQuery), [searchQuery]);

  useEffect(() => {
    let cancelled = false;
    const syncUnreadCount = () => void pssApi<{ data: Array<Record<string, unknown>> }>("/v1/notifications").then((result) => { if (!cancelled) setUnreadCount(result.data.filter((item) => !Boolean(item.is_read)).length); }).catch(() => undefined);
    syncUnreadCount();
    const timer = window.setInterval(syncUnreadCount, 60000);
    window.addEventListener("pss-notifications-updated", syncUnreadCount);
    return () => { cancelled = true; window.clearInterval(timer); window.removeEventListener("pss-notifications-updated", syncUnreadCount); };
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("pss-theme");
    const next = saved === "dark" || saved === "light" ? saved : window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    document.documentElement.classList.toggle("dark", next === "dark");
    const timer = window.setTimeout(() => { setTheme(next); setThemeReady(true); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.classList.add("theme-transition");
    document.documentElement.classList.toggle("dark", next === "dark");
    localStorage.setItem("pss-theme", next);
    window.setTimeout(() => document.documentElement.classList.remove("theme-transition"), 450);
  };

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menuOpen]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); setSearchOpen((v) => !v); }
      if (e.key === "Escape") setSearchOpen(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  useEffect(() => { if (searchOpen) setTimeout(() => searchRef.current?.focus(), 50); }, [searchOpen]);

  useEffect(() => {
    let active = true;
    void (async () => {
      const { data: userResult } = await supabase.auth.getUser();
      if (!userResult.user || !active) return;
      const { data } = await supabase.from("profiles").select("display_name,email,company_name").eq("id", userResult.user.id).maybeSingle();
      if (active) setProfile({ display_name: data?.display_name ?? userResult.user.user_metadata?.full_name ?? null, email: data?.email ?? userResult.user.email ?? null, company_name: data?.company_name ?? null });
    })();
    return () => { active = false; };
  }, [supabase]);

  return (
    <>
      <Sidebar collapsible="icon" variant="sidebar" className="border-r border-sidebar-border/70 dark:border-r-2 dark:border-sidebar-border dark:shadow-[1px_0_0_0_var(--sidebar-border)]">
        {/* User Profile */}
        <SidebarHeader className={`relative items-center gap-1 border-sidebar-border/40 ${collapsed ? "p-2" : "pt-6 pb-4"}`}>
          <div className="relative" ref={menuRef}>
            <button onClick={() => setMenuOpen(!menuOpen)} className={`rounded-full bg-sidebar-foreground/10 grid place-items-center transition-all cursor-pointer hover:bg-sidebar-foreground/15 ${collapsed ? "size-8" : "size-14 mb-1"}`}>
              <User className={collapsed ? "size-4 opacity-50" : "size-6 opacity-50"} />
            </button>
            {menuOpen && (
              <div className={`absolute z-50 w-44 animate-in fade-in zoom-in-95 duration-150 bg-popover border border-border rounded-lg shadow-lg py-1 motion-reduce:animate-none ${collapsed ? "left-full top-0 ml-2" : "top-full left-1/2 -translate-x-1/2 mt-1"}`}>
                <Link href="/dashboard/profileAccountManagement" onClick={() => setMenuOpen(false)} className="flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-accent rounded-md mx-1 transition-colors">
                  <User className="size-4 opacity-60" />Profile
                </Link>
                <Link href="/dashboard/userSettings" onClick={() => setMenuOpen(false)} className="flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-accent rounded-md mx-1 transition-colors">
                  <Settings className="size-4 opacity-60" />Settings
                </Link>
                <button type="button" onClick={async () => { setMenuOpen(false); await supabase.auth.signOut({ scope: "global" }); router.push("/sign-in"); }} className="flex w-[calc(100%-0.5rem)] items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm text-destructive hover:bg-destructive/10 mx-1">
                  <span aria-hidden="true">↪</span>Sign out
                </button>
              </div>
            )}
          </div>
          {!collapsed && (
            <div className="text-center">
              <div className="max-w-[180px] truncate text-[15px] font-semibold tracking-tight">{profile.display_name || "Client account"}</div>
              <div className="max-w-[180px] truncate text-[13px] text-sidebar-foreground/50">{profile.email || "Secure Supabase session"}</div>
            </div>
          )}
        </SidebarHeader>

        <SidebarContent className={collapsed ? "" : "px-1"}>
          {/* Dashboard */}
          <SidebarGroup className="pb-0">
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                    <SidebarMenuButton isActive={pathname === "/dashboard"} render={<Link href="/dashboard" />} tooltip="Dashboard">
                    <PssIcon name="dashboard" size="lg" className="shrink-0 opacity-70" />
                    <span>Dashboard</span>
                    {pathname === "/dashboard" && <ChevronRight className="ml-auto size-3.5 opacity-40" />}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {navigationGroups.map((group) => <SidebarGroup key={group.title} className="py-1">
            <SidebarGroupLabel className="h-auto items-start px-3 py-2 text-sidebar-foreground/45">
              <span className="min-w-0">
                <span className="block text-[10px] font-semibold uppercase tracking-[0.12em]">{group.title}</span>
                {!collapsed && <span className="mt-0.5 block truncate text-[10px] font-normal normal-case tracking-normal text-sidebar-foreground/35">{group.description}</span>}
              </span>
            </SidebarGroupLabel>
            <SidebarGroupContent><NavItems items={group.items} pathname={pathname} /></SidebarGroupContent>
          </SidebarGroup>)}
        </SidebarContent>

        {/* Footer Brand */}
        <SidebarFooter className="border-t border-sidebar-border/40 py-3">
          <div className={`flex items-center gap-2 ${collapsed ? "justify-center" : "px-1"}`}>
            <BrandLogo compact={collapsed} className={collapsed ? "w-8" : "w-[132px]"} />
          </div>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <div className="flex min-w-0 items-center gap-3 border-b px-4 h-14">
          <div className="flex items-center gap-2 shrink-0">
            <SidebarTrigger />
            <span className="text-sm font-semibold">{currentRoute}</span>
          </div>
          <button onClick={() => setSearchOpen(true)} className="min-w-0 flex-1 flex items-center gap-2 h-8 px-3 rounded-lg border border-border/60 bg-muted/40 text-muted-foreground text-sm cursor-pointer hover:bg-muted/60 transition-colors">
            <Search className="size-4 shrink-0 opacity-50" />
            <span className="flex-1 text-left truncate">Search shipments, references...</span>
            <kbd className="hidden sm:inline-flex h-5 items-center justify-center gap-2 px-1.5 text-[10px] font-medium text-muted-foreground leading-none"><span className="text-[10px]">⌘</span><span>K</span></kbd>
          </button>
          <Link href="/dashboard/notificationsAlerts" aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : "Notifications"} className="relative shrink-0 size-8 grid place-items-center rounded-lg hover:bg-accent transition-colors">
            <Bell className="size-[18px] opacity-60" />
            {unreadCount > 0 && <span className="absolute -right-1 -top-1 grid min-h-4 min-w-4 place-items-center rounded-full border-2 border-background bg-destructive px-1 text-[9px] font-bold leading-none text-destructive-foreground">{unreadCount > 99 ? "99+" : unreadCount}</span>}
          </Link>
          <button type="button" onClick={toggleTheme} disabled={!themeReady} aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"} title={theme === "dark" ? "Light mode" : "Dark mode"} className="grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition-all duration-300 hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none">
            {!themeReady ? <span className="size-4" aria-hidden="true" /> : theme === "dark" ? <Sun className="size-4 animate-in zoom-in-75 duration-300" /> : <Moon className="size-4 animate-in zoom-in-75 duration-300" />}
          </button>
        </div>
        <div className="min-w-0 p-4">{children}</div>

        {/* Search Overlay */}
      {searchOpen && (
          <div className="fixed inset-0 z-50 flex animate-in fade-in duration-150 items-start justify-center pt-[20vh] motion-reduce:animate-none" onClick={() => setSearchOpen(false)}>
            <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" />
            <div className="relative w-full max-w-lg mx-4 animate-in fade-in zoom-in-95 duration-150 bg-popover border border-border rounded-xl shadow-2xl motion-reduce:animate-none" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-3 px-4 h-12 border-b border-border/60">
                <Search className="size-[18px] opacity-40 shrink-0" />
                <input ref={searchRef} type="text" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search shipments, invoices, pickups..." className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60" />
                <kbd className="hidden sm:inline-flex h-5 items-center justify-center gap-0.5 px-1.5 text-[10px] font-medium text-muted-foreground leading-none"><span className="text-[10px]">ESC</span></kbd>
              </div>
              <div className="max-h-80 overflow-y-auto p-2">
                {!searchQuery.trim() ? <p className="p-4 text-center text-xs text-muted-foreground">Search across shipments, invoices, pickups, and pages.</p> : searchResults.length ? searchResults.map((result) => <Link key={result.id} href={result.href} onClick={() => { setSearchOpen(false); setSearchQuery(""); }} className="flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-accent"><Search className="mt-0.5 size-4 shrink-0 text-primary" /><span className="min-w-0"><span className="flex items-center gap-2 text-xs font-semibold"><span className="truncate">{result.title}</span><span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">{result.type}</span></span><span className="mt-0.5 block truncate text-[10px] text-muted-foreground">{result.detail}</span></span></Link>) : <p className="p-4 text-center text-xs text-muted-foreground">No matching company records or pages.</p>}
              </div>
            </div>
          </div>
        )}
      </SidebarInset>
    </>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider defaultOpen>
      <SidebarInner>{children}</SidebarInner>
    </SidebarProvider>
  );
}
