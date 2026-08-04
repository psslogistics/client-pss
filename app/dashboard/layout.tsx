import Sidebar from "@/components/block/sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 m-6">
        {children}
      </div>
    </div>
  );
}
