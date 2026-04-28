import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { OrdersClient } from "@/components/orders/orders-client";

export default function OrdersPage() {
  return (
    <DashboardLayout title="Siparişler" subtitle="Tüm siparişleri yönetin">
      <OrdersClient />
    </DashboardLayout>
  );
}
