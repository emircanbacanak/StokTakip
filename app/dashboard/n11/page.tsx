import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { N11Tabs } from "@/components/n11/n11-tabs";

export default function N11Page() {
  return (
    <DashboardLayout
      title="N11 Yönetimi"
      subtitle="Komisyon hesaplayıcı ve kargo fiyatları"
      maxWidth="max-w-7xl"
    >
      <N11Tabs />
    </DashboardLayout>
  );
}

