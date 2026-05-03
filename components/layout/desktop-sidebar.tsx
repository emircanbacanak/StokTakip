"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ShoppingCart, Factory, Users, Package, Palette, Calculator } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./theme-toggle";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/orders", label: "Siparişler", icon: ShoppingCart },
  { href: "/dashboard/production", label: "Üretim", icon: Factory },
  { href: "/dashboard/buyers", label: "Alıcılar", icon: Users },
  { href: "/dashboard/products", label: "Stok", icon: Package },
  { href: "/dashboard/colors", label: "Renkler", icon: Palette },
  { href: "/dashboard/accounting", label: "Muhasebe", icon: Calculator },
];

export function DesktopSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex flex-col w-60 border-r border-border bg-card min-h-screen shrink-0">
      {/* Logo */}
      <div className="px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
            <Package className="w-4.5 h-4.5 text-white" style={{ width: 18, height: 18 }} />
          </div>
          <div>
            <p className="font-bold text-sm text-foreground">Stok Takip</p>
            <p className="text-[10px] text-muted-foreground">Yönetim Paneli</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">Menü</p>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group",
                isActive
                  ? "bg-gradient-to-r from-blue-500/10 to-violet-500/10 text-blue-600 dark:text-blue-400"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <div className={cn(
                "w-7 h-7 rounded-lg flex items-center justify-center transition-all",
                isActive
                  ? "bg-gradient-to-br from-blue-500 to-violet-600 shadow-md shadow-blue-500/30"
                  : "bg-muted group-hover:bg-border"
              )}>
                <Icon className={cn("w-3.5 h-3.5", isActive ? "text-white" : "")} />
              </div>
              {item.label}
              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-border">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Tema</p>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}
