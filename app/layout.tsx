import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "PSS Logistics",
  description: "Direct To Every Direction",
  icons: { icon: "/pss-mark.png" },
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html
      lang="en"
      className={cn("h-full", "antialiased", "font-sans")}
    >
      <head>
        <link rel="preconnect" href="https://pss-api.psslogisticsadmin.workers.dev" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="//pss-api.psslogisticsadmin.workers.dev" />
        <link rel="preconnect" href="https://qyelfkmafzspctqkrwxf.supabase.co" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="//qyelfkmafzspctqkrwxf.supabase.co" />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
