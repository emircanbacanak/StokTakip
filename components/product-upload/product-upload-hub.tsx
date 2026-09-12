"use client";

import { useState } from "react";
import {
  PackagePlus,
  Package,
  FileSpreadsheet,
  Store,
  Check,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { ProductListingsView } from "./product-listings-view";
import { TrendyolProductCreateFlow } from "./trendyol-product-create-flow";
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
    colorClass: "from-orange-600 to-red-600 border-orange-500/20 text-orange-600",
    badge: "Yakında",
    active: false,
  },
  {
    id: "n11",
    name: "N11",
    iconText: "N11",
    colorClass: "from-red-600 to-rose-700 border-red-500/20 text-red-600",
    badge: "Yakında",
    active: false,
  },
  {
    id: "idefix",
    name: "İdefix",
    iconText: "İD",
    colorClass: "from-purple-600 to-indigo-600 border-purple-500/20 text-purple-600",
    badge: "Yakında",
    active: false,
  },
  {
    id: "trendruum",
    name: "Trendruum",
    iconText: "TR",
    colorClass: "from-emerald-600 to-teal-700 border-emerald-500/20 text-emerald-600",
    badge: "Yakında",
    active: false,
  },
  {
    id: "pazarama",
    name: "Pazarama",
    iconText: "PZ",
    colorClass: "from-blue-600 to-cyan-700 border-blue-500/20 text-blue-600",
    badge: "Yakında",
    active: false,
  },
];

export function ProductUploadHub() {
  const [selectedMarketplaces, setSelectedMarketplaces] = useState<string[]>(["trendyol"]);
  const [selectAll, setSelectAll] = useState(false);
  const [activeTab, setActiveTab] = useState<"listings" | "single" | "bulk">("listings");

  const toggleMarketplace = (id: string, active: boolean) => {
    if (!active) return; // Şuan sadece Trendyol aktif
    if (selectedMarketplaces.includes(id)) {
      if (selectedMarketplaces.length > 1) {
        setSelectedMarketplaces(selectedMarketplaces.filter((m) => m !== id));
      }
    } else {
      setSelectedMarketplaces([...selectedMarketplaces, id]);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedMarketplaces(["trendyol"]); // Şimdilik sadece Trendyol aktif
    } else {
      setSelectedMarketplaces(["trendyol"]);
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
                  Trendyol Aktif
                </span>
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Ürünlerin yükleneceği, senkronize edileceği ve yönetileceği pazar yerlerini ve mağazalarınızı seçin.
              </p>
            </div>
          </div>

          {/* Tümünü Seç */}
          <label className="flex items-center gap-2.5 text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer select-none bg-muted/40 hover:bg-muted/70 px-4 py-2 rounded-xl border border-border transition-colors">
            <input
              type="checkbox"
              checked={selectAll}
              onChange={(e) => handleSelectAll(e.target.checked)}
              className="rounded text-orange-600 focus:ring-orange-500 w-4 h-4 cursor-pointer"
            />
            <span>Tümünü Seç</span>
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
                onClick={() => toggleMarketplace(mp.id, mp.active)}
                className={`relative flex items-center gap-3 p-3.5 rounded-xl border transition-all select-none ${
                  isAllowed
                    ? isSelected
                      ? "bg-orange-500/10 border-orange-500 shadow-xs cursor-pointer ring-1 ring-orange-500/30"
                      : "bg-card border-border hover:border-orange-500/40 cursor-pointer"
                    : "bg-muted/40 border-border/60 opacity-60 cursor-not-allowed"
                }`}
              >
                {/* Checkbox Icon */}
                <div
                  className={`w-4 h-4 rounded flex items-center justify-center border text-[10px] shrink-0 ${
                    isSelected && isAllowed
                      ? "bg-orange-600 border-orange-600 text-white"
                      : "border-muted-foreground/40"
                  }`}
                >
                  {isSelected && isAllowed && <Check className="w-3 h-3 stroke-[3]" />}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-foreground truncate">{mp.name}</p>
                  {mp.badge && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded font-semibold bg-muted text-muted-foreground">
                      {mp.badge}
                    </span>
                  )}
                  {mp.active && (
                    <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 mt-0.5">
                      ● Aktif
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
      {activeTab === "listings" && <ProductListingsView />}

      {activeTab === "single" && (
        <div className="w-full py-2">
          <TrendyolProductCreateFlow
            onSuccess={() => {
              setActiveTab("listings");
            }}
          />
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
