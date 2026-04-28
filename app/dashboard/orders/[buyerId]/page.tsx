import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { BuyerOrdersClient } from "@/components/orders/buyer-orders-client";

export default async function BuyerOrdersPage({ params }: { params: Promise<{ buyerId: string }> }) {
  const { buyerId } = await params;
  
  return (
    <DashboardLayout title="Siparişler" subtitle="">
      <BuyerOrdersClient buyerId={buyerId} />
    </DashboardLayout>
  );
}
