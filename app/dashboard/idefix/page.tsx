import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { IdefixTabs } from "@/components/idefix/idefix-tabs";

export default function IdefixPage() {
  return (
    <DashboardLayout
      title="İdefix Yönetimi"
      subtitle="Komisyon hesaplayıcı ve kargo fiyatları"
      maxWidth="max-w-7xl"
    >
      <IdefixTabs />
    </DashboardLayout>
  );
}

