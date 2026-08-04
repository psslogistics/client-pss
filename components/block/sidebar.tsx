"use client";

import Link from "next/link";
import {
  LayoutDashboard,
  Package,
  Truck,
  MapPin,
  RotateCcw,
  Wallet,
  BarChart3,
  Settings,
} from "lucide-react";

const items = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/" },
  { label: "Shipments", icon: Package, href: "/shipments" },
  { label: "Booking", icon: Truck, href: "/booking" },
  { label: "Tracking", icon: MapPin, href: "/tracking" },
  { label: "Returns", icon: RotateCcw, href: "/returns" },
  { label: "Wallet", icon: Wallet, href: "/wallet" },
  { label: "Analytics", icon: BarChart3, href: "/analytics" },
];

export default function Sidebar() {
  return (
    <aside className="flex h-screen w-56 flex-col border-r border-slate-200 bg-white">

      {/* Brand */}
      <div className="flex h-14 items-center px-4">
        <span className="text-[15px] font-semibold tracking-tight text-slate-950">
          PSS Logistics
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-2">
        <div className="space-y-0.5">
          {items.map(({ label, icon: Icon, href }) => (
            <Link
              key={label}
              href={href}
              className="
                flex h-9 items-center gap-3
                rounded-md px-3
                text-[13px] font-medium text-slate-600
                transition-colors
                hover:bg-slate-100 hover:text-slate-950
              "
            >
              <Icon size={16} strokeWidth={1.75} />
              {label}
            </Link>
          ))}
        </div>
      </nav>

      {/* Bottom */}
      <div className="border-t border-slate-200 p-2">
        <Link
          href="/settings"
          className="
            flex h-9 items-center gap-3
            rounded-md px-3
            text-[13px] font-medium text-slate-600
            hover:bg-slate-100 hover:text-slate-950
          "
        >
          <Settings size={16} strokeWidth={1.75} />
          Settings
        </Link>
      </div>

    </aside>
  );
}
