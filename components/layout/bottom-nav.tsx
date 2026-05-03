"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ShoppingCart, Factory, Users, Package, Calculator } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Ana Sayfa", icon: LayoutDashboard },
  { href: "/dashboard/orders", label: "Siparişler", icon: ShoppingCart },
  { href: "/dashboard/production", label: "Üretim", icon: Factory },
  { href: "/dashboard/buyers", label: "Alıcılar", icon: Users },
  { href: "/dashboard/products", label: "Stok", icon: Package },
  { href: "/dashboard/accounting", label: "Muhasebe", icon: Calculator },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden">
      {/* Blur backdrop */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-xl border-t border-border" />
      <div className="relative flex">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-1 flex-col items-center justify-center py-2.5 gap-1"
            >
              <div className={cn(
                "w-8 h-8 rounded-xl flex items-center justify-center transition-all",
                isActive
                  ? "bg-gradient-to-br from-blue-500 to-violet-600 shadow-lg shadow-blue-500/30"
                  : ""
              )}>
                <Icon className={cn(
                  "w-4 h-4 transition-all",
                  isActive ? "text-white" : "text-muted-foreground"
                )} />
              </div>
              <span className={cn(
                "text-[9px] font-medium transition-colors",
                isActive ? "text-blue-600 dark:text-blue-400" : "text-muted-foreground"
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
