"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarInset, SidebarMenu,
  SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger, useSidebar,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard, Package, Truck, History, HandHelping, RotateCcw,
  Wallet, FileText, LifeBuoy, Receipt, ChevronRight, User, Settings, Bell, Search,
} from "lucide-react";

const shipments = [
  { title: "Booking", icon: Package, href: "/dashboard/shipmentBooking" },
  { title: "Tracking", icon: Truck, href: "/dashboard/shipmentTracking" },
  { title: "History", icon: History, href: "/dashboard/shipmentHistory" },
  { title: "Pickup", icon: HandHelping, href: "/dashboard/pickupRequests" },
  { title: "RTO", icon: RotateCcw, href: "/dashboard/returnShipments" },
];

const walletBilling = [
  { title: "Wallet", icon: Wallet, href: "/dashboard/walletManagement" },
  { title: "Billing", icon: Receipt, href: "/dashboard/billingInvoiceManagement" },
];

const report = [
  { title: "Reports", icon: FileText, href: "/dashboard/reportsAnalytics" },
];

const support = [
  { title: "Support", icon: LifeBuoy, href: "/dashboard/supportTicketCreation" },
];

const allRoutes = [{ title: "Dashboard", href: "/dashboard" }, ...shipments, ...walletBilling, ...report, ...support,
  { title: "Profile", href: "/dashboard/profileAccountManagement" },
  { title: "Notifications", href: "/dashboard/notificationsAlerts" },
];

type NavItem = { title: string; icon: React.ComponentType<{ className?: string }>; href: string };

function NavItems({ items, pathname }: { items: NavItem[]; pathname: string }) {
  return (
    <SidebarMenu>
      {items.map((r) => (
        <SidebarMenuItem key={r.title}>
          <SidebarMenuButton isActive={pathname === r.href} render={<Link href={r.href} />} tooltip={r.title}>
            <r.icon className="shrink-0 opacity-70" />
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
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const currentRoute = allRoutes.find((r) => r.href === pathname)?.title ?? "Dashboard";

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

  return (
    <>
      <Sidebar collapsible="icon" variant="sidebar" className="border-r border-sidebar-border/50">
        {/* User Profile */}
        <SidebarHeader className={`items-center gap-1 border-sidebar-border/40 ${collapsed ? "p-2" : "pt-6 pb-4"}`}>
          <div className="relative" ref={menuRef}>
            <button onClick={() => setMenuOpen(!menuOpen)} className={`rounded-full bg-sidebar-foreground/10 grid place-items-center transition-all cursor-pointer hover:bg-sidebar-foreground/15 ${collapsed ? "size-8" : "size-14 mb-1"}`}>
              <User className={collapsed ? "size-4 opacity-50" : "size-6 opacity-50"} />
            </button>
            {menuOpen && (
              <div className={`absolute z-50 w-44 bg-popover border border-border rounded-lg shadow-lg py-1 ${collapsed ? "left-full top-0 ml-2" : "top-full left-1/2 -translate-x-1/2 mt-1"}`}>
                <Link href="/dashboard/profileAccountManagement" onClick={() => setMenuOpen(false)} className="flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-accent rounded-md mx-1 transition-colors">
                  <User className="size-4 opacity-60" />Profile
                </Link>
                <button onClick={() => setMenuOpen(false)} className="flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-accent rounded-md mx-1 w-[calc(100%-0.5rem)] transition-colors">
                  <Settings className="size-4 opacity-60" />Settings
                </button>
              </div>
            )}
          </div>
          {!collapsed && (
            <div className="text-center">
              <div className="text-[15px] font-semibold tracking-tight">John Doe</div>
              <div className="text-[13px] text-sidebar-foreground/50">john.doe@example.com</div>
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
                    <LayoutDashboard className="shrink-0 opacity-70" />
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
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <div className="flex items-center gap-3 border-b px-4 h-14">
          <div className="flex items-center gap-2 shrink-0">
            <SidebarTrigger />
            <span className="text-sm font-semibold">{currentRoute}</span>
          </div>
          <button onClick={() => setSearchOpen(true)} className="flex-1 flex items-center gap-2 h-8 px-3 rounded-lg border border-border/60 bg-muted/40 text-muted-foreground text-sm cursor-pointer hover:bg-muted/60 transition-colors">
            <Search className="size-4 shrink-0 opacity-50" />
            <span className="flex-1 text-left truncate">Search shipments, references...</span>
            <kbd className="hidden sm:inline-flex h-5 items-center justify-center gap-2 px-1.5 text-[10px] font-medium text-muted-foreground leading-none"><span className="text-[10px]">⌘</span><span>K</span></kbd>
          </button>
          <Link href="/dashboard/notificationsAlerts" className="shrink-0 size-8 grid place-items-center rounded-lg hover:bg-accent transition-colors">
            <Bell className="size-[18px] opacity-60" />
          </Link>
        </div>
        <div className="p-4">{children}</div>

        {/* Search Overlay */}
        {searchOpen && (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]" onClick={() => setSearchOpen(false)}>
            <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" />
            <div className="relative w-full max-w-lg mx-4 bg-popover border border-border rounded-xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-3 px-4 h-12 border-b border-border/60">
                <Search className="size-[18px] opacity-40 shrink-0" />
                <input ref={searchRef} type="text" placeholder="Search shipments, references, pages..." className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60" />
                <kbd className="hidden sm:inline-flex h-5 items-center justify-center gap-0.5 px-1.5 text-[10px] font-medium text-muted-foreground leading-none"><span className="text-[10px]">ESC</span></kbd>
              </div>
              <div className="p-3 text-xs text-muted-foreground/60 text-center">Start typing to search...</div>
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
