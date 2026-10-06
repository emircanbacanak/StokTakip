import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { BuyerOrdersClient } from "@/components/orders/buyer-orders-client";

export default async function BuyerOrdersPage({ params }: { params: Promise<{ buyerId: string }> }) {
  const { buyerId } = await params;
  
  return (
    <DashboardLayout
      title="Alıcı Sipariş Detayı"
      subtitle="Seçili alıcıya ait siparişler ve üretim durumları"
      backHref="/dashboard/orders"
      breadcrumbs={[
        { label: "Siparişler", href: "/dashboard/orders" },
        { label: "Alıcı Detayı" },
      ]}
    >
      <BuyerOrdersClient buyerId={buyerId} />
    </DashboardLayout>
  );
}
