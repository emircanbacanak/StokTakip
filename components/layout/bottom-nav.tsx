"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  FileText,
  Menu,
  X,
  Factory,
  Users,
  Palette,
  Calculator,
  Coins,
  Store,
  ShoppingBag,
  PackagePlus,
  Search,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./theme-toggle";
import { CommandMenu } from "./command-menu";

const primaryNavItems = [
  { href: "/dashboard", label: "Ana Sayfa", icon: LayoutDashboard },
  { href: "/dashboard/orders", label: "Siparişler", icon: ShoppingCart },
  { href: "/dashboard/products", label: "Stok", icon: Package },
  { href: "/dashboard/invoicing", label: "Fatura", icon: FileText },
];

const secondaryMenuGroups = [
  {
    title: "Operasyon & Üretim",
    items: [
      { href: "/dashboard/product-maker", label: "Ürün Oluşturucu (MakerWorld)", icon: Sparkles },
      { href: "/dashboard/seo-analysis", label: "Trendyol SEO & Rakip Analizi", icon: Search },
      { href: "/dashboard/production", label: "Üretim Takibi", icon: Factory },
      { href: "/dashboard/buyers", label: "Alıcılar", icon: Users },
      { href: "/dashboard/product-upload", label: "Ürün Yükleme Hub", icon: PackagePlus },
    ],
  },
  {
    title: "Finans & Raporlama",
    items: [
      { href: "/dashboard/accounting", label: "Muhasebe & Maliyet", icon: Calculator },
      { href: "/dashboard/pricing", label: "Çok Kanallı Fiyatlandırma", icon: Coins },
    ],
  },
  {
    title: "Pazaryerleri & Komisyon",
    items: [
      { href: "/dashboard/trendyol", label: "Trendyol", icon: Store },
      { href: "/dashboard/hepsiburada", label: "Hepsiburada", icon: ShoppingBag },
      { href: "/dashboard/pazarama", label: "Pazarama", icon: Store },
      { href: "/dashboard/n11", label: "N11", icon: Store },
      { href: "/dashboard/trendruum", label: "Trendruum", icon: Store },
      { href: "/dashboard/idefix", label: "İdefix", icon: Store },
    ],
  },
];

export function BottomNav() {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <>
      {/* Mobil Alt Çubuk - 4 Temel Buton + 1 Menü Butonu */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden">
        <div className="absolute inset-0 bg-background/90 backdrop-blur-xl border-t border-border shadow-2xl" />
        <div className="relative flex items-center justify-around px-2 py-1.5 safe-area-bottom">
          {primaryNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-1 flex-col items-center justify-center py-1.5 gap-1 group"
              >
                <div
                  className={cn(
                    "w-9 h-9 rounded-xl flex items-center justify-center transition-all",
                    isActive
                      ? "bg-gradient-to-br from-blue-500 to-violet-600 shadow-md shadow-blue-500/30 text-white"
                      : "text-muted-foreground group-active:scale-95"
                  )}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <span
                  className={cn(
                    "text-[10px] font-semibold transition-colors",
                    isActive
                      ? "text-blue-600 dark:text-blue-400"
                      : "text-muted-foreground"
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}

          {/* Menü Açıcı Buton */}
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex flex-1 flex-col items-center justify-center py-1.5 gap-1 group"
          >
            <div
              className={cn(
                "w-9 h-9 rounded-xl flex items-center justify-center transition-all",
                drawerOpen
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground group-active:scale-95"
              )}
            >
              <Menu className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-semibold text-muted-foreground">
              Menü
            </span>
          </button>
        </div>
      </nav>

      {/* Mobil Çekmece (Drawer / Sheet) */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden animate-in fade-in duration-200">
          {/* Karartma Arka Plan */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />

          {/* Çekmece Paneli */}
          <div className="absolute bottom-0 left-0 right-0 max-h-[85vh] bg-card rounded-t-3xl border-t border-border shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300">
            {/* Çekmece Başlığı */}
            <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-muted/20">
              <div>
                <p className="font-bold text-base text-foreground">Tüm Modüller & Menü</p>
                <p className="text-xs text-muted-foreground">Hızlı sayfa geçişi ve ayarlar</p>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-2 rounded-xl bg-muted text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Arama Butonu */}
            <div className="p-4 border-b border-border/50">
              <button
                onClick={() => {
                  setDrawerOpen(false);
                  setSearchOpen(true);
                }}
                className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-muted/60 border border-border text-xs text-muted-foreground font-medium"
              >
                <div className="flex items-center gap-2">
                  <Search className="w-4 h-4" />
                  <span>Modül veya sayfa arayın...</span>
                </div>
                <span className="text-[10px] bg-background px-2 py-0.5 rounded border border-border">Ara</span>
              </button>
            </div>

            {/* Çekmece İçeriği */}
            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              {secondaryMenuGroups.map((group) => (
                <div key={group.title} className="space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-1">
                    {group.title}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = pathname === item.href;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setDrawerOpen(false)}
                          className={cn(
                            "flex items-center gap-2.5 p-3 rounded-xl border text-xs font-semibold transition-all",
                            isActive
                              ? "bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400"
                              : "bg-muted/30 border-border/60 text-foreground hover:bg-muted"
                          )}
                        >
                          <div
                            className={cn(
                              "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
                              isActive
                                ? "bg-blue-600 text-white"
                                : "bg-muted text-muted-foreground"
                            )}
                          >
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <span className="truncate">{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Çekmece Altı / Tema & Bilgi */}
            <div className="p-4 border-t border-border bg-muted/30 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-foreground">Görünüm Teması</span>
                <span className="text-[10px] text-muted-foreground">Koyu veya açık mod</span>
              </div>
              <ThemeToggle />
            </div>
          </div>
        </div>
      )}

      {/* Komut Paleti */}
      <CommandMenu open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}
