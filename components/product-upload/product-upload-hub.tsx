"use client";

import { useState, useEffect } from "react";
import {
  PackagePlus,
  Package,
  FileSpreadsheet,
  Store,
  Check,
  AlertCircle,
  Sparkles,
  Zap,
} from "lucide-react";
import { ProductListingsView } from "./product-listings-view";
import { TrendyolProductCreateFlow } from "./trendyol-product-create-flow";
import { HepsiburadaProductCreateFlow } from "./hepsiburada-product-create-flow";
import { PazaramaProductCreateFlow } from "./pazarama-product-create-flow";
import { N11ProductsClient } from "@/components/n11/n11-products-client";
import { TrendruumProductsClient } from "@/components/trendruum/trendruum-products-client";
import { IdefixProductsClient } from "@/components/idefix/idefix-products-client";
import { ExcelUpload } from "@/components/trendyol/excel-upload";

interface Marketplace {
  id: string;
  name: string;
  iconText: string;
  colorClass: string;
  badge?: string;
  active: boolean;
}

const MARKETPLACES: Marketplace[] = [
  {
    id: "trendyol",
    name: "Trendyol",
    iconText: "TY",
    colorClass: "from-orange-500 to-amber-600 border-orange-500/40 text-orange-600",
    active: true,
  },
  {
    id: "hepsiburada",
    name: "Hepsiburada",
    iconText: "HB",
    colorClass: "from-orange-600 to-red-600 border-orange-500/40 text-orange-600",
    badge: "Canlı",
    active: true,
  },
  {
    id: "pazarama",
    name: "Pazarama",
    iconText: "PZ",
    colorClass: "from-blue-600 to-cyan-700 border-blue-500/40 text-blue-600",
    active: true,
  },
  {
    id: "n11",
    name: "N11",
    iconText: "N11",
    colorClass: "from-blue-600 to-indigo-700 border-blue-500/40 text-blue-600",
    badge: "Canlı REST",
    active: true,
  },
  {
    id: "idefix",
    name: "İdefix",
    iconText: "İD",
    colorClass: "from-orange-500 to-amber-600 border-orange-500/40 text-orange-600",
    badge: "Canlı PIM",
    active: true,
  },
  {
    id: "trendruum",
    name: "Trendruum",
    iconText: "TR",
    colorClass: "from-purple-600 to-pink-600 border-purple-500/40 text-purple-600",
    badge: "Canlı OAuth",
    active: true,
  },
];

export function ProductUploadHub() {
  const [selectedMarketplaces, setSelectedMarketplaces] = useState<string[]>([
    "trendyol",
  ]);
  const [activeMarketplaceTab, setActiveMarketplaceTab] = useState<string>("trendyol");
  const [activeTab, setActiveTab] = useState<"listings" | "single" | "bulk">("listings");
  const [initialDraftData, setInitialDraftData] = useState<any>(null);

  // Sayfa açıldığında veya yönlendirmede önceden aktarılan ürün verisi var mı kontrol et
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("trendyol_prefill_data");
      if (stored) {
        const parsed = JSON.parse(stored);
        setInitialDraftData(parsed);
        setSelectedMarketplaces(["trendyol"]);
        setActiveMarketplaceTab("trendyol");
        setActiveTab("single");
        sessionStorage.removeItem("trendyol_prefill_data");
      }
    } catch (e) {
      console.error("Ön yükleme verisi okunamadı:", e);
    }
  }, []);

  const isAllSelected = selectedMarketplaces.length === MARKETPLACES.length;

  // Kartın gövdesine tıklandığında: Yalnızca o mağazayı seçer ve panelini doğrudan açar!
  const handleSelectSingleMarketplace = (id: string, active: boolean) => {
    if (!active) return;
    setSelectedMarketplaces([id]);
    setActiveMarketplaceTab(id);
  };

  // Kutucuğa (checkbox) tıklandığında: Çoklu seçim için listeye ekler / çıkarır
  const handleToggleCheckbox = (id: string, active: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!active) return;

    if (selectedMarketplaces.includes(id)) {
      if (selectedMarketplaces.length > 1) {
        const next = selectedMarketplaces.filter((m) => m !== id);
        setSelectedMarketplaces(next);
        if (activeMarketplaceTab === id) {
          setActiveMarketplaceTab(next[0]);
        }
      }
    } else {
      const next = [...selectedMarketplaces, id];
      setSelectedMarketplaces(next);
      setActiveMarketplaceTab(id);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedMarketplaces(MARKETPLACES.map((m) => m.id));
    } else {
      setSelectedMarketplaces(["trendyol"]);
      setActiveMarketplaceTab("trendyol");
    }
  };

  return (
    <div className="space-y-6">
      {/* ─── PAZARYERİ / MAĞAZA SEÇİM BARI ─────────────────────────── */}
      <div className="bg-card border border-border rounded-2xl p-6 lg:p-7 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-orange-600 flex items-center justify-center font-bold shadow-xs">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2.5">
                Pazaryeri & Mağaza Seçimi
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/20">
                  {selectedMarketplaces.length === 1
                    ? `${MARKETPLACES.find((m) => m.id === selectedMarketplaces[0])?.name || ""} Paneli Açık`
                    : `${selectedMarketplaces.length} Mağaza Seçili (Çoklu Panel)`}
                </span>
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Karta tıklayarak mağaza panelini doğrudan açın veya kutucuklardan birden fazla mağaza seçin.
              </p>
            </div>
          </div>

          {/* Tümünü Seç */}
          <label className="flex items-center gap-2.5 text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer select-none bg-muted/40 hover:bg-muted/70 px-4 py-2 rounded-xl border border-border transition-colors">
            <input
              type="checkbox"
              checked={isAllSelected}
              onChange={(e) => handleSelectAll(e.target.checked)}
              className="rounded text-orange-600 focus:ring-orange-500 w-4 h-4 cursor-pointer"
            />
            <span>Tümünü Çoklu Seç ({MARKETPLACES.length})</span>
          </label>
        </div>

        {/* Pazaryeri Kartları */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          {MARKETPLACES.map((mp) => {
            const isSelected = selectedMarketplaces.includes(mp.id);
            const isAllowed = mp.active;

            return (
              <div
                key={mp.id}
                onClick={() => handleSelectSingleMarketplace(mp.id, mp.active)}
                className={`relative flex items-center gap-3 p-3.5 rounded-xl border transition-all select-none group cursor-pointer ${
                  isAllowed
                    ? isSelected
                      ? "bg-orange-500/10 border-orange-500 shadow-xs ring-1 ring-orange-500/30"
                      : "bg-card border-border hover:border-orange-500/40 hover:bg-muted/30"
                    : "bg-muted/40 border-border/60 opacity-60 cursor-not-allowed"
                }`}
                title="Tıklayarak bu mağaza panelini açın"
              >
                {/* Checkbox Icon (Çoklu seçim kutucuğu) */}
                <div
                  onClick={(e) => handleToggleCheckbox(mp.id, mp.active, e)}
                  className={`w-5 h-5 rounded-md flex items-center justify-center border text-[10px] shrink-0 transition-colors hover:scale-110 cursor-pointer ${
                    isSelected && isAllowed
                      ? "bg-orange-600 border-orange-600 text-white"
                      : "border-muted-foreground/40 bg-background/80 hover:border-orange-500"
                  }`}
                  title="Çoklu seçime ekle/çıkar"
                >
                  {isSelected && isAllowed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-foreground truncate">{mp.name}</p>
                  {mp.badge && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                      {mp.badge}
                    </span>
                  )}
                  {mp.active && !mp.badge && (
                    <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 mt-0.5">
                      ● Canlı
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── ALT SEKMELER: YÜKLÜ ÜRÜNLERİM / TEKİL EKLE / TOPLU YÜKLEME ─── */}
      <div className="flex items-center gap-2 border-b border-border pb-1">
        <button
          onClick={() => setActiveTab("listings")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === "listings"
              ? "bg-orange-500 text-white shadow-md shadow-orange-500/20"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <Package className="w-4 h-4" />
          Yüklü Ürünlerim
        </button>

        <button
          onClick={() => setActiveTab("single")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === "single"
              ? "bg-orange-500 text-white shadow-md shadow-orange-500/20"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <PackagePlus className="w-4 h-4" />
          Tekil Ürün Ekle
        </button>

        <button
          onClick={() => setActiveTab("bulk")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === "bulk"
              ? "bg-orange-500 text-white shadow-md shadow-orange-500/20"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          Toplu Yükleme (Excel)
        </button>
      </div>

      {/* ─── SEKME İÇERİKLERİ ────────────────────────────────────────── */}
      {activeTab === "listings" && (
        <ProductListingsView
          selectedMarketplaces={selectedMarketplaces}
          activeMarketplace={activeMarketplaceTab}
          onSelectMarketplace={(mp) => setActiveMarketplaceTab(mp)}
        />
      )}

      {activeTab === "single" && (
        <div className="w-full py-2 space-y-4">
          {/* Tekil ürün ekleme sekme çubuğu - SADECE birden fazla mağaza seçiliyse gösterilir */}
          {selectedMarketplaces.length > 1 && (
            <div className="flex flex-wrap items-center gap-2 p-1.5 bg-muted/40 rounded-xl border max-w-2xl">
              {[
                { id: "trendyol", label: "Trendyol", tag: "TY", color: "bg-orange-500" },
                { id: "hepsiburada", label: "Hepsiburada", tag: "HB", color: "bg-orange-600" },
                { id: "pazarama", label: "Pazarama", tag: "PZ", color: "bg-blue-600" },
                { id: "n11", label: "N11", tag: "N11", color: "bg-red-600" },
                { id: "trendruum", label: "Trendruum", tag: "TR", color: "bg-purple-600" },
                { id: "idefix", label: "İdefix", tag: "İD", color: "bg-amber-600" },
              ]
                .filter((item) => selectedMarketplaces.includes(item.id))
                .map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveMarketplaceTab(item.id)}
                    className={`flex-1 min-w-[120px] py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                      activeMarketplaceTab === item.id
                        ? "bg-card text-foreground shadow-xs border"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span className={`w-5 h-5 rounded-md ${item.color} text-white flex items-center justify-center text-[10px] font-black`}>
                      {item.tag}
                    </span>
                    {item.label}&apos;a Yükle
                  </button>
                ))}
            </div>
          )}

          {activeMarketplaceTab === "trendyol" && (
            <TrendyolProductCreateFlow
              initialData={initialDraftData}
              onSuccess={() => {
                setActiveTab("listings");
              }}
            />
          )}

          {activeMarketplaceTab === "hepsiburada" && (
            <HepsiburadaProductCreateFlow
              onSuccess={() => {
                setActiveTab("listings");
              }}
            />
          )}

          {activeMarketplaceTab === "pazarama" && (
            <PazaramaProductCreateFlow
              onSuccess={() => {
                setActiveTab("listings");
              }}
            />
          )}

          {activeMarketplaceTab === "n11" && (
            <div className="space-y-4">
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs flex items-center justify-between">
                <span className="text-red-700 dark:text-red-300 font-semibold">
                  N11 Entegrasyonu: Canlı REST API ile ürün listesi ve katalog yönetimi.
                </span>
              </div>
              <N11ProductsClient />
            </div>
          )}

          {activeMarketplaceTab === "trendruum" && (
            <div className="space-y-4">
              <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-xl text-xs flex items-center justify-between">
                <span className="text-purple-700 dark:text-purple-300 font-semibold">
                  Trendruum Entegrasyonu: Canlı OAuth2 API ile ürün ve stok yönetimi.
                </span>
              </div>
              <TrendruumProductsClient />
            </div>
          )}

          {activeMarketplaceTab === "idefix" && (
            <div className="space-y-4">
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs flex items-center justify-between">
                <span className="text-amber-700 dark:text-amber-300 font-semibold">
                  İdefix Entegrasyonu: Satıcı PIM API ile ürün ve sipariş yönetimi.
                </span>
              </div>
              <IdefixProductsClient />
            </div>
          )}
        </div>
      )}

      {activeTab === "bulk" && (
        <div className="max-w-4xl mx-auto py-2">
          <ExcelUpload />
        </div>
      )}
    </div>
  );
}
