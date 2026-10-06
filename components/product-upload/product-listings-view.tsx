"use client";

import { useState } from "react";
import { TrendyolListingsView } from "./trendyol-listings-view";
import { HepsiburadaListingsView } from "./hepsiburada-listings-view";
import { PazaramaListingsView } from "./pazarama-listings-view";
import { N11ProductsClient } from "@/components/n11/n11-products-client";
import { TrendruumProductsClient } from "@/components/trendruum/trendruum-products-client";
import { IdefixProductsClient } from "@/components/idefix/idefix-products-client";

export interface ProductListingsViewProps {
  selectedMarketplaces?: string[];
  activeMarketplace?: string;
  onSelectMarketplace?: (marketplace: string) => void;
}

const MARKETPLACE_CONFIGS: Record<
  string,
  { label: string; badge: string; color: string }
> = {
  trendyol: { label: "Trendyol Listelemeleri", badge: "Canlı", color: "bg-orange-500" },
  hepsiburada: { label: "Hepsiburada Listelemeleri", badge: "Canlı", color: "bg-amber-600" },
  pazarama: { label: "Pazarama Listelemeleri", badge: "Canlı", color: "bg-blue-600" },
  n11: { label: "N11 Listelemeleri", badge: "Canlı REST", color: "bg-indigo-600" },
  trendruum: { label: "Trendruum Listelemeleri", badge: "Canlı OAuth", color: "bg-purple-600" },
  idefix: { label: "İdefix Listelemeleri", badge: "Canlı PIM", color: "bg-rose-600" },
};

export function ProductListingsView({
  selectedMarketplaces = ["trendyol"],
  activeMarketplace,
  onSelectMarketplace,
}: ProductListingsViewProps = {}) {
  const [internalMarketplace, setInternalMarketplace] = useState<string>("trendyol");

  const effectiveMarketplaces =
    selectedMarketplaces && selectedMarketplaces.length > 0
      ? selectedMarketplaces
      : ["trendyol"];

  const currentMarketplace =
    activeMarketplace && effectiveMarketplaces.includes(activeMarketplace)
      ? activeMarketplace
      : effectiveMarketplaces.includes(internalMarketplace)
      ? internalMarketplace
      : effectiveMarketplaces[0];

  const handleSelectMarketplace = (mp: string) => {
    setInternalMarketplace(mp);
    onSelectMarketplace?.(mp);
  };

  return (
    <div className="space-y-4">
      {/* ─── PAZARYERİ SEÇİCİ (Yalnızca birden fazla mağaza seçiliyse gösterilir) ─── */}
      {effectiveMarketplaces.length > 1 && (
        <div className="flex items-center justify-between bg-card border border-border rounded-2xl p-2 shadow-xs overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-2">
            {effectiveMarketplaces.map((mpId) => {
              const cfg = MARKETPLACE_CONFIGS[mpId] || {
                label: `${mpId.toUpperCase()} Listelemeleri`,
                badge: "Canlı",
                color: "bg-orange-500",
              };
              const isSelected = currentMarketplace === mpId;
              return (
                <button
                  key={mpId}
                  type="button"
                  onClick={() => handleSelectMarketplace(mpId)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                    isSelected
                      ? `${cfg.color} text-white shadow-sm`
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <span>{cfg.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      isSelected
                        ? "bg-white/20 text-white"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {cfg.badge}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── AKTİF PAZARYERİ PANELİ ─── */}
      {currentMarketplace === "pazarama" ? (
        <PazaramaListingsView />
      ) : currentMarketplace === "hepsiburada" ? (
        <HepsiburadaListingsView />
      ) : currentMarketplace === "n11" ? (
        <N11ProductsClient />
      ) : currentMarketplace === "trendruum" ? (
        <TrendruumProductsClient />
      ) : currentMarketplace === "idefix" ? (
        <IdefixProductsClient />
      ) : (
        <TrendyolListingsView />
      )}
    </div>
  );
}
