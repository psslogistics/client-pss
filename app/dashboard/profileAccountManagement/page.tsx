import ProfileAccountManagement from "@/components/block/profileAccountManagement";
import ProfileWorkspaceSummary from "@/components/block/profileWorkspaceSummary";
import ClientKycForm from "@/components/block/clientKycForm";

export default function ProfileAccountManagementPage() {
  return (
    <div className="space-y-4">
      <ProfileWorkspaceSummary />
      <ProfileAccountManagement />
      <ClientKycForm />
    </div>
  );
}
