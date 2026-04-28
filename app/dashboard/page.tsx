import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { DashboardStats } from "@/components/dashboard/dashboard-stats";
import { RecentOrders } from "@/components/dashboard/recent-orders";
import { ColorChart } from "@/components/dashboard/color-chart";

export default function DashboardPage() {
  return (
    <DashboardLayout title="Dashboard" subtitle="Genel bakış ve özet bilgiler">
      <div className="space-y-4">
        <DashboardStats />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ColorChart />
          <RecentOrders />
        </div>
      </div>
    </DashboardLayout>
  );
}
