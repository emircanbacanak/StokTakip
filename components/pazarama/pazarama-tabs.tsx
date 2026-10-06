"use client";

import { useState } from "react";
import { Store, Truck, Package, PackagePlus } from "lucide-react";
import { PazaramaCalculatorClient } from "./pazarama-calculator-client";
import { CargoPriceCalculator } from "./cargo-price-calculator";
import { PazaramaListingsView } from "@/components/product-upload/pazarama-listings-view";
import { PazaramaProductCreateFlow } from "@/components/product-upload/pazarama-product-create-flow";

const TABS = [
  { id: "listings", label: "Ürünlerim", icon: Package },
  { id: "create", label: "Yeni Ürün Ekle", icon: PackagePlus },
  { id: "calculator", label: "Fiyat Hesaplayıcı", icon: Store },
  { id: "cargo", label: "Kargo Fiyatları", icon: Truck },
];

export function PazaramaTabs() {
  const [activeTab, setActiveTab] = useState("listings");

  return (
    <div className="space-y-6">
      {/* Tab Bar */}
      <div className="flex gap-1 bg-muted/50 rounded-xl p-1 border border-border overflow-x-auto">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                isActive
                  ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md shadow-blue-500/20"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === "listings" && <PazaramaListingsView />}

        {activeTab === "create" && (
          <PazaramaProductCreateFlow
            onSuccess={() => {
              setActiveTab("listings");
            }}
          />
        )}

        {activeTab === "calculator" && <PazaramaCalculatorClient />}

        {activeTab === "cargo" && <CargoPriceCalculator />}
      </div>
    </div>
  );
}
