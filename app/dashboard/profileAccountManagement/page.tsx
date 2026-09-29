import ProfileAccountManagement from "@/components/block/profileAccountManagement";
import ProfileWorkspaceSummary from "@/components/block/profileWorkspaceSummary";

export default function ProfileAccountManagementPage() {
  return (
    <div className="space-y-4">
      <ProfileWorkspaceSummary />
      <ProfileAccountManagement />
    </div>
  );
}
