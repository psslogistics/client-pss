import type { WalletTransaction } from "@/lib/client-finance-data";

// Dashboard operational values are assembled from authenticated Worker/D1
// responses in components/block/dashboard.tsx. This file retains the shared
// financial view type for presentational components only.
export type ClientFinancialSnapshot = {
  balance: number | null;
  pendingCharges: number | null;
  codExposure: number | null;
  recentTransactions: WalletTransaction[];
};
