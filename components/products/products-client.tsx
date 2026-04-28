"use client";

import { useState } from "react";
import { Package, BarChart2 } from "lucide-react";
import { StockClient } from "./stock-client";
import { ProductCatalogClient } from "./product-catalog-client";

const tabs = [
  { id: "catalog", label: "Ürün Kataloğu", icon: Package },
  { id: "stock", label: "Stok Durumu", icon: BarChart2 },
];

export function ProductsClient() {
  const [tab, setTab] = useState<"catalog" | "stock">("catalog");

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex gap-1 bg-muted/50 rounded-xl p-1 border border-border">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id as "catalog" | "stock")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all ${
                active
                  ? "bg-gradient-to-r from-blue-500 to-violet-600 text-white shadow-md shadow-blue-500/20"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "catalog" ? <ProductCatalogClient /> : <StockClient />}
    </div>
  );
}
