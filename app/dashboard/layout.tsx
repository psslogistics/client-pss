"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarInset, SidebarMenu,
  SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger, useSidebar,
} from "@/components/ui/sidebar";
import {
  ChevronRight, User, Settings, Bell, Search, Moon, Sun,
} from "lucide-react";
import { PssIcon } from "@/components/ui/icon";
import type { IconName } from "@/lib/iconography";
import { defaultUnreadIds, notifications, NOTIFICATIONS_EVENT, readIdsFromStorage } from "@/components/block/notifications-data";
import { searchClientMaster } from "@/lib/master-search";
import { createClient } from "@/lib/supabase/client";

type NavItem = { title: string; icon: IconName; href: string };

const shipments: NavItem[] = [
  { title: "Booking", icon: "bookings", href: "/dashboard/shipmentBooking" },
  { title: "Tracking", icon: "tracking", href: "/dashboard/shipmentTracking" },
  { title: "Pickup", icon: "pickups", href: "/dashboard/pickupRequests" },
  { title: "RTO", icon: "returns", href: "/dashboard/returnShipments" },
];

const walletBilling: NavItem[] = [
  { title: "Wallet", icon: "wallets", href: "/dashboard/walletManagement" },
  { title: "Billing", icon: "billing", href: "/dashboard/billingInvoiceManagement" },
];

const operations: NavItem[] = [
  { title: "All Shipments", icon: "shipments", href: "/dashboard/allShipments" },
  { title: "Warehouses", icon: "warehouse", href: "/dashboard/warehouseManagement" },
  { title: "NDR", icon: "ndr", href: "/dashboard/ndrManagement" },
  { title: "Exceptions", icon: "exceptions", href: "/dashboard/exceptionsManagement" },
];

const informationCenter: NavItem[] = [
  { title: "Pincode Serviceability", icon: "tracking", href: "/dashboard/pincodeServiceability" },
  { title: "Rate Check", icon: "billing", href: "/dashboard/rateCheck" },
  { title: "Rate Card Check", icon: "reports", href: "/dashboard/rateCard" },
];

const report: NavItem[] = [
  { title: "Reports", icon: "reports", href: "/dashboard/reportsAnalytics" },
];

const support: NavItem[] = [
  { title: "Support", icon: "support", href: "/dashboard/supportTicketCreation" },
];

const allRoutes = [{ title: "Dashboard", href: "/dashboard" }, ...shipments, ...operations, ...informationCenter, ...walletBilling, ...report, ...support,
  { title: "Profile", href: "/dashboard/profileAccountManagement" },
  { title: "Settings", href: "/dashboard/userSettings" },
  { title: "Notifications", href: "/dashboard/notificationsAlerts" },
];

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
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [themeReady, setThemeReady] = useState(false);
  const supabase = createClient();
  const [unreadCount, setUnreadCount] = useState(defaultUnreadIds.length);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const currentRoute = allRoutes.find((r) => r.href === pathname)?.title ?? "Dashboard";
  const searchResults = useMemo(() => searchClientMaster(searchQuery), [searchQuery]);

  useEffect(() => {
    const syncUnreadCount = () => setUnreadCount(notifications.filter((item) => !readIdsFromStorage().includes(item.id)).length);
    const timer = window.setTimeout(syncUnreadCount, 0);
    window.addEventListener(NOTIFICATIONS_EVENT, syncUnreadCount);
    return () => { window.clearTimeout(timer); window.removeEventListener(NOTIFICATIONS_EVENT, syncUnreadCount); };
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
    const applyFieldMetadata = () => document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>("input, textarea, select").forEach((field, index) => {
      if (!field.id) field.id = `client-field-${index + 1}`;
      if (!field.getAttribute("name")) field.setAttribute("name", field.id);
    });
    applyFieldMetadata();
    const observer = new MutationObserver(applyFieldMetadata);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

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
              </div>
            )}
          </div>
          {!collapsed && (
            <div className="text-center">
              <div className="text-[15px] font-semibold tracking-tight">Authenticated client</div>
              <div className="text-[13px] text-sidebar-foreground/50">Secure Supabase session</div>
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

          {/* Shipments */}
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs uppercase tracking-widest font-medium text-sidebar-foreground/40 px-3">
              Shipments
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <NavItems items={shipments} pathname={pathname} />
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Operations */}
          <SidebarGroup>
            <SidebarGroupLabel className="px-3 text-xs font-medium uppercase tracking-widest text-sidebar-foreground/40">
              Operations
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <NavItems items={operations} pathname={pathname} />
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Information Center */}
          <SidebarGroup>
            <SidebarGroupLabel className="px-3 text-xs font-medium uppercase tracking-widest text-sidebar-foreground/40">
              Information Center
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <NavItems items={informationCenter} pathname={pathname} />
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Wallet and Billing */}
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs uppercase tracking-widest font-medium text-sidebar-foreground/40 px-3">
              Wallet and Billing
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <NavItems items={walletBilling} pathname={pathname} />
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Report */}
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs uppercase tracking-widest font-medium text-sidebar-foreground/40 px-3">
              Report
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <NavItems items={report} pathname={pathname} />
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Support */}
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs uppercase tracking-widest font-medium text-sidebar-foreground/40 px-3">
              Support
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <NavItems items={support} pathname={pathname} />
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        {/* Footer Brand */}
        <SidebarFooter className="border-t border-sidebar-border/40 py-3">
          <div className={`flex items-center gap-2 ${collapsed ? "justify-center" : "px-1"}`}>
            <div className="size-8 rounded-md bg-sidebar-primary text-sidebar-primary-foreground grid place-items-center text-sm font-bold shrink-0">
              P
            </div>
            {!collapsed && <span className="text-[15px] font-semibold tracking-tight">PSS Logistics</span>}
          </div>
          <button type="button" onClick={async () => { await supabase.auth.signOut({ scope: "global" }); window.location.assign("/sign-in"); }} className={`mt-2 rounded-lg px-2 py-2 text-left text-xs font-semibold text-destructive hover:bg-destructive/10 ${collapsed ? "text-center" : ""}`}>{collapsed ? "↪" : "Sign out"}</button>
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
