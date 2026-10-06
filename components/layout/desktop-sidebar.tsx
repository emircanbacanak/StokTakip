"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  Factory,
  Users,
  Package,
  Palette,
  Calculator,
  Store,
  FileText,
  PackagePlus,
  ShoppingBag,
  Coins,
  ChevronDown,
  Search,
  PanelLeftClose,
  PanelLeft,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./theme-toggle";
import { CommandMenu } from "./command-menu";

interface NavItem {
  href: string;
  label: string;
  icon: any;
  badge?: string;
  badgeColor?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const mainSections: NavSection[] = [
  {
    title: "Genel",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    title: "Operasyon",
    items: [
      { href: "/dashboard/orders", label: "Siparişler", icon: ShoppingCart },
      { href: "/dashboard/production", label: "Üretim Takibi", icon: Factory },
      { href: "/dashboard/buyers", label: "Alıcılar", icon: Users },
    ],
  },
  {
    title: "Envanter & Ürün",
    items: [
      { href: "/dashboard/products", label: "Stok & Katalog", icon: Package },
      { href: "/dashboard/product-maker", label: "Ürün Oluşturucu", icon: Sparkles, badge: "MakerWorld", badgeColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
      { href: "/dashboard/seo-analysis", label: "SEO & Rakip Analizi", icon: Search, badge: "AI", badgeColor: "bg-purple-500/10 text-purple-600 dark:text-purple-400" },
      { href: "/dashboard/product-upload", label: "Ürün Yükleme", icon: PackagePlus, badge: "Hub" },
    ],
  },
  {
    title: "Finans",
    items: [
      { href: "/dashboard/invoicing", label: "Fatura (GİB)", icon: FileText, badge: "e-Arşiv", badgeColor: "bg-red-500/10 text-red-500" },
      { href: "/dashboard/accounting", label: "Muhasebe", icon: Calculator },
    ],
  },
];

const marketplaceItems: NavItem[] = [
  { href: "/dashboard/pricing", label: "Çok Kanallı Fiyat", icon: Coins, badge: "Ana", badgeColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  { href: "/dashboard/trendyol", label: "Trendyol", icon: Store },
  { href: "/dashboard/hepsiburada", label: "Hepsiburada", icon: ShoppingBag },
  { href: "/dashboard/pazarama", label: "Pazarama", icon: Store },
  { href: "/dashboard/n11", label: "N11", icon: Store },
  { href: "/dashboard/trendruum", label: "Trendruum", icon: Store },
  { href: "/dashboard/idefix", label: "İdefix", icon: Store },
];

export function DesktopSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [marketplacesOpen, setMarketplacesOpen] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);

  // Tarayıcı hafızasından daraltma durumunu yükle
  useEffect(() => {
    try {
      const saved = localStorage.getItem("sidebar_collapsed");
      if (saved !== null) {
        setCollapsed(saved === "true");
      }
    } catch {
      // ignore
    }
  }, []);

  const toggleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem("sidebar_collapsed", String(next));
    } catch {
      // ignore
    }
  };

  const isMarketplaceActive = marketplaceItems.some((m) => pathname === m.href);

  return (
    <>
      <aside
        className={cn(
          "hidden lg:flex flex-col border-r border-border bg-card min-h-screen shrink-0 transition-all duration-300 relative select-none",
          collapsed ? "w-20" : "w-64"
        )}
      >
        {/* Logo & Başlık */}
        <div className="px-4 py-4 border-b border-border/60 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 via-indigo-600 to-violet-600 flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
              <Package className="w-5 h-5 text-white" />
            </div>
            {!collapsed && (
              <div className="transition-opacity duration-200">
                <p className="font-bold text-sm tracking-tight text-foreground leading-none">
                  Stok & Sipariş
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">Yönetim Konsolu</p>
              </div>
            )}
          </Link>

          {/* Daraltma / Genişletme Butonu */}
          <button
            onClick={toggleCollapse}
            title={collapsed ? "Menüyü Genişlet" : "Menüyü Daralt"}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
          >
            {collapsed ? (
              <PanelLeft className="w-4 h-4" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Hızlı Arama Butonu */}
        <div className="px-3 pt-3 pb-1">
          <button
            onClick={() => setSearchOpen(true)}
            className={cn(
              "w-full flex items-center gap-2.5 rounded-xl border border-border/80 bg-muted/40 hover:bg-muted hover:border-border transition-all text-muted-foreground hover:text-foreground text-xs font-medium",
              collapsed ? "p-2.5 justify-center" : "px-3 py-2 justify-between"
            )}
            title="Hızlı Arama (Ctrl+K)"
          >
            <div className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 shrink-0" />
              {!collapsed && <span>Hızlı Ara...</span>}
            </div>
            {!collapsed && (
              <kbd className="px-1.5 py-0.5 text-[10px] rounded bg-background border border-border text-muted-foreground font-mono">
                ⌘K
              </kbd>
            )}
          </button>
        </div>

        {/* Kategorize Edilmiş Menü Listesi */}
        <nav className="flex-1 px-3 py-2 space-y-4 overflow-y-auto overflow-x-hidden">
          {mainSections.map((sec) => (
            <div key={sec.title} className="space-y-1">
              {!collapsed && (
                <p className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider px-3 mb-1.5">
                  {sec.title}
                </p>
              )}
              {sec.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all group relative",
                      isActive
                        ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
                      collapsed && "justify-center px-2"
                    )}
                  >
                    <div
                      className={cn(
                        "w-7 h-7 rounded-lg flex items-center justify-center transition-all shrink-0",
                        isActive
                          ? "bg-gradient-to-br from-blue-500 to-violet-600 text-white shadow-sm shadow-blue-500/25"
                          : "bg-muted group-hover:bg-border/70 text-muted-foreground group-hover:text-foreground"
                      )}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </div>

                    {!collapsed && (
                      <span className="truncate flex-1">{item.label}</span>
                    )}

                    {!collapsed && item.badge && (
                      <span
                        className={cn(
                          "ml-auto text-[10px] px-1.5 py-0.5 rounded-md font-medium tracking-tight",
                          item.badgeColor || "bg-muted text-muted-foreground"
                        )}
                      >
                        {item.badge}
                      </span>
                    )}

                    {isActive && (
                      <div className="absolute right-1 w-1 h-5 rounded-full bg-blue-500" />
                    )}
                  </Link>
                );
              })}
            </div>
          ))}

          {/* Pazaryerleri Akordeon Grubu */}
          <div className="space-y-1 pt-1 border-t border-border/50">
            {!collapsed ? (
              <button
                onClick={() => setMarketplacesOpen(!marketplacesOpen)}
                className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider hover:text-foreground transition-colors"
              >
                <span>Pazaryeri Araçları</span>
                <ChevronDown
                  className={cn(
                    "w-3.5 h-3.5 transition-transform duration-200",
                    marketplacesOpen ? "rotate-0" : "-rotate-90"
                  )}
                />
              </button>
            ) : (
              <div className="w-full h-px bg-border/50 my-2" />
            )}

            {(marketplacesOpen || collapsed) && (
              <div className={cn("space-y-1", !collapsed && "pl-1")}>
                {marketplaceItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={collapsed ? item.label : undefined}
                      className={cn(
                        "flex items-center gap-3 px-3 py-1.5 rounded-xl text-sm font-medium transition-all group relative",
                        isActive
                          ? "bg-orange-500/10 text-orange-600 dark:text-orange-400 font-semibold"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
                        collapsed && "justify-center px-2 py-2"
                      )}
                    >
                      <div
                        className={cn(
                          "w-6 h-6 rounded-lg flex items-center justify-center transition-all shrink-0",
                          isActive
                            ? "bg-gradient-to-br from-orange-500 to-amber-600 text-white shadow-sm shadow-orange-500/25"
                            : "bg-muted/70 group-hover:bg-border/70 text-muted-foreground group-hover:text-foreground"
                        )}
                      >
                        <Icon className="w-3 h-3" />
                      </div>

                      {!collapsed && (
                        <span className="truncate flex-1 text-xs">{item.label}</span>
                      )}

                      {!collapsed && item.badge && (
                        <span
                          className={cn(
                            "ml-auto text-[10px] px-1.5 py-0.5 rounded-md font-medium tracking-tight",
                            item.badgeColor || "bg-muted text-muted-foreground"
                          )}
                        >
                          {item.badge}
                        </span>
                      )}

                      {isActive && (
                        <div className="absolute right-1 w-1 h-4 rounded-full bg-orange-500" />
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </nav>

        {/* Alt Bilgi & Tema */}
        <div className="px-3 py-3 border-t border-border/60 bg-muted/20">
          <div
            className={cn(
              "flex items-center",
              collapsed ? "justify-center" : "justify-between px-1"
            )}
          >
            {!collapsed && (
              <div className="flex flex-col">
                <span className="text-[11px] font-medium text-foreground">Tema Seçimi</span>
                <span className="text-[9px] text-muted-foreground">Koyu / Açık</span>
              </div>
            )}
            <ThemeToggle />
          </div>
        </div>
      </aside>

      {/* Komut Paleti Modalı */}
      <CommandMenu open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}
