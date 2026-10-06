"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  LayoutDashboard,
  ShoppingCart,
  Factory,
  Users,
  Package,
  Palette,
  FileText,
  Calculator,
  PackagePlus,
  Coins,
  Store,
  ShoppingBag,
  ArrowRight,
  X,
  Sparkles,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface CommandItem {
  title: string;
  category: "Genel" | "Operasyon" | "Ürün & Stok" | "Finans" | "Pazaryeri";
  href: string;
  icon: any;
  keywords?: string[];
}

const COMMANDS: CommandItem[] = [
  {
    title: "Dashboard / Genel Bakış",
    category: "Genel",
    href: "/dashboard",
    icon: LayoutDashboard,
    keywords: ["ana sayfa", "özet", "istatistik"],
  },
  {
    title: "Siparişler",
    category: "Operasyon",
    href: "/dashboard/orders",
    icon: ShoppingCart,
    keywords: ["sipariş", "alıcı", "müşteri", "teslimat"],
  },
  {
    title: "Üretim Takibi",
    category: "Operasyon",
    href: "/dashboard/production",
    icon: Factory,
    keywords: ["üretim", "imalat", "atölye"],
  },
  {
    title: "Alıcılar",
    category: "Operasyon",
    href: "/dashboard/buyers",
    icon: Users,
    keywords: ["müşteriler", "toptancı", "cari"],
  },
  {
    title: "Stok Durumu & Katalog",
    category: "Ürün & Stok",
    href: "/dashboard/products",
    icon: Package,
    keywords: ["ürünler", "stok", "envanter", "katalog"],
  },
  {
    title: "Ürün Oluşturucu (MakerWorld Scraper)",
    category: "Ürün & Stok",
    href: "/dashboard/product-maker",
    icon: Sparkles,
    keywords: ["makerworld", "ürün oluşturucu", "scraper", "bambu", "3d model", "gramaj", "bambu lab"],
  },
  {
    title: "Trendyol SEO & Rakip Analizi",
    category: "Ürün & Stok",
    href: "/dashboard/seo-analysis",
    icon: Search,
    keywords: ["seo", "rakip analizi", "trendyol seo", "başlık üretici", "açıklama", "3d baskı", "en çok satan", "fiyat analizi"],
  },
  {
    title: "Ürün Yükleme Hub",
    category: "Ürün & Stok",
    href: "/dashboard/product-upload",
    icon: PackagePlus,
    keywords: ["ürün ekle", "pazaryeri yükleme", "excel yükle"],
  },
  {
    title: "Fatura Yönetimi (GİB e-Arşiv)",
    category: "Finans",
    href: "/dashboard/invoicing",
    icon: FileText,
    keywords: ["fatura", "gib", "e-arşiv", "vergi"],
  },
  {
    title: "Muhasebe & Maliyet Analizi",
    category: "Finans",
    href: "/dashboard/accounting",
    icon: Calculator,
    keywords: ["muhasebe", "maliyet", "gelir", "gider", "kâr"],
  },
  {
    title: "Çok Kanallı Fiyatlandırma",
    category: "Pazaryeri",
    href: "/dashboard/pricing",
    icon: Coins,
    keywords: ["fiyat", "komisyon", "kargo", "kâr marjı"],
  },
  {
    title: "Trendyol Hesaplayıcı & Kargo",
    category: "Pazaryeri",
    href: "/dashboard/trendyol",
    icon: Store,
    keywords: ["trendyol", "komisyon", "kargo", "ty"],
  },
  {
    title: "Hepsiburada Hesaplayıcı & Kargo",
    category: "Pazaryeri",
    href: "/dashboard/hepsiburada",
    icon: ShoppingBag,
    keywords: ["hepsiburada", "hb", "komisyon"],
  },
  {
    title: "Pazarama Hesaplayıcı & Kargo",
    category: "Pazaryeri",
    href: "/dashboard/pazarama",
    icon: Store,
    keywords: ["pazarama", "pz"],
  },
  {
    title: "N11 Hesaplayıcı & Kargo",
    category: "Pazaryeri",
    href: "/dashboard/n11",
    icon: Store,
    keywords: ["n11"],
  },
  {
    title: "Trendruum",
    category: "Pazaryeri",
    href: "/dashboard/trendruum",
    icon: Store,
    keywords: ["trendruum"],
  },
  {
    title: "İdefix",
    category: "Pazaryeri",
    href: "/dashboard/idefix",
    icon: Store,
    keywords: ["idefix"],
  },
];

interface CommandMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandMenu({ open, onOpenChange }: CommandMenuProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Filtreleme
  const filtered = COMMANDS.filter((cmd) => {
    const q = query.toLowerCase().trim();
    if (!q) return true;
    const inTitle = cmd.title.toLowerCase().includes(q);
    const inCategory = cmd.category.toLowerCase().includes(q);
    const inKeywords = cmd.keywords?.some((k) => k.toLowerCase().includes(q));
    return inTitle || inCategory || inKeywords;
  });

  // Seçili eleman sınır kontrolü
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Klavye kısayolları
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  const handleSelect = (href: string) => {
    onOpenChange(false);
    router.push(href);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (filtered.length || 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + (filtered.length || 1)) % (filtered.length || 1));
    } else if (e.key === "Enter" && filtered[selectedIndex]) {
      e.preventDefault();
      handleSelect(filtered[selectedIndex].href);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 max-w-xl overflow-hidden border-border bg-card shadow-2xl rounded-2xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Hızlı Arama Menüsü</DialogTitle>
        </DialogHeader>

        {/* Arama Inputu */}
        <div className="flex items-center px-4 border-b border-border bg-muted/20">
          <Search className="w-5 h-5 text-muted-foreground mr-3 shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Sayfa veya işlem arayın... (Örn: Siparişler, GİB, Stok)"
            className="w-full py-4 text-sm bg-transparent placeholder:text-muted-foreground focus:outline-none text-foreground"
            autoFocus
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-1 ml-2 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground bg-muted border border-border rounded">
            ESC
          </kbd>
        </div>

        {/* Sonuç Listesi */}
        <div className="max-h-80 overflow-y-auto p-2 divide-y divide-border/40">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              <Sparkles className="w-6 h-6 mx-auto mb-2 text-muted-foreground/40" />
              "{query}" ile eşleşen sayfa veya işlem bulunamadı.
            </div>
          ) : (
            filtered.map((item, index) => {
              const Icon = item.icon;
              const isSelected = index === selectedIndex;
              return (
                <button
                  key={item.href}
                  onClick={() => handleSelect(item.href)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all ${
                    isSelected
                      ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium"
                      : "text-foreground hover:bg-muted"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                        isSelected
                          ? "bg-blue-600 text-white shadow-sm"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{item.title}</p>
                      <span className="text-[11px] text-muted-foreground font-normal">
                        {item.category}
                      </span>
                    </div>
                  </div>
                  <ArrowRight
                    className={`w-4 h-4 transition-opacity ${
                      isSelected ? "opacity-100 text-blue-500" : "opacity-0"
                    }`}
                  />
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-muted/40 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>Seçmek için:</span>
            <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border text-[10px]">
              ↑
            </kbd>
            <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border text-[10px]">
              ↓
            </kbd>
            <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border text-[10px]">
              ↵ Enter
            </kbd>
          </div>
          <span className="text-[11px]">Hızlı Erişim Paleti</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
