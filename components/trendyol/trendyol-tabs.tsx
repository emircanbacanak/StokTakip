"use client";

import { useState } from "react";
import { Store, Truck } from "lucide-react";
import { TrendyolCalculatorClient } from "./trendyol-calculator-client";
import { CargoPriceCalculator } from "./cargo-price-calculator";

const TABS = [
  { id: "calculator", label: "Fiyat Hesaplayıcı", icon: Store },
  { id: "cargo", label: "Kargo Fiyatları", icon: Truck },
];

export function TrendyolTabs() {
  const [activeTab, setActiveTab] = useState("calculator");

  return (
    <div className="space-y-6">
      {/* Tab Bar */}
      <div className="flex gap-1 bg-muted/50 rounded-xl p-1 border border-border">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                isActive
                  ? "bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-md shadow-orange-500/20"
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
      {activeTab === "calculator" && <TrendyolCalculatorClient />}
      {activeTab === "cargo" && (
        <div className="space-y-6">
          <CargoPriceCalculator />
        </div>
      )}
    </div>
  );
}
