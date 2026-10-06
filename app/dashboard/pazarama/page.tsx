import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { PazaramaTabs } from "@/components/pazarama/pazarama-tabs";

export default function PazaramaPage() {
  return (
    <DashboardLayout
      title="Pazarama Yönetimi"
      subtitle="Ürün listeleme, ürün ekleme ve komisyon hesaplayıcı"
      maxWidth="max-w-7xl"
    >
      <PazaramaTabs />
    </DashboardLayout>
  );
}

