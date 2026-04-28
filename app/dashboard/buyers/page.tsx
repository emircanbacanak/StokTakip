import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { BuyersClient } from "@/components/buyers/buyers-client";

export default function BuyersPage() {
  return (
    <DashboardLayout title="Alıcılar" subtitle="Müşteri bilgilerini yönetin">
      <BuyersClient />
    </DashboardLayout>
  );
}
