"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";

export default function Hero() {
  return (
    <div className={cn("min-h-screen flex flex-col items-center justify-center p-8 gap-4")}>
      <h1 className="text-4xl font-bold tracking-tight">PSS Logistics</h1>
      <p className="text-muted-foreground text-lg mb-8">Select a portal to continue</p>
      
      <div className="flex flex-col sm:flex-row gap-4">
        <Link 
          href="/dashboard"
          className="px-8 py-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-medium transition-colors text-center shadow-sm"
        >
          Dashboard
        </Link>
        <Link 
          href="/admin"
          className="px-8 py-3 rounded-lg border border-input bg-background hover:bg-accent hover:text-accent-foreground font-medium transition-colors text-center shadow-sm"
        >
          Admin
        </Link>
        <Link 
          href="/superAdmin"
          className="px-8 py-3 rounded-lg border border-input bg-background hover:bg-accent hover:text-accent-foreground font-medium transition-colors text-center shadow-sm"
        >
          Super Admin
        </Link>
      </div>
    </div>
  );
}
