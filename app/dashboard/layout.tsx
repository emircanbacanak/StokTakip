import { DesktopSidebar } from "@/components/layout/desktop-sidebar";
import { BottomNav } from "@/components/layout/bottom-nav";

export default function DashboardRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <DesktopSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        {children}
      </div>
      <BottomNav />
    </div>
  );
}
