"use client";

import { useState } from "react";
import { Package, ShoppingCart, Calculator, Truck } from "lucide-react";
import { TrendruumProductsClient } from "./trendruum-products-client";
import { TrendruumOrdersClient } from "./trendruum-orders-client";
import { TrendruumCalculatorClient } from "./trendruum-calculator-client";
import { CargoPriceCalculator } from "./cargo-price-calculator";

const TABS = [
  { id: "products", label: "Mağaza Ürünleri", icon: Package },
  { id: "orders", label: "Siparişler", icon: ShoppingCart },
  { id: "calculator", label: "Fiyat Hesaplayıcı", icon: Calculator },
  { id: "cargo", label: "Kargo Fiyatları", icon: Truck },
];

export function TrendruumTabs() {
  const [activeTab, setActiveTab] = useState("products");

  return (
    <div className="flex-1 overflow-auto">
      {/* Tab Bar */}
      <div className="border-b bg-background sticky top-0 z-10">
        <div className="container mx-auto px-4 lg:px-6 max-w-7xl">
          <div className="flex gap-1 pt-2 overflow-x-auto no-scrollbar">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-colors whitespace-nowrap ${
                    isActive
                      ? "border-purple-500 text-purple-600 dark:text-purple-400 bg-purple-50/50 dark:bg-purple-950/20"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="container mx-auto p-4 lg:p-6 pb-24 lg:pb-6 max-w-7xl">
        {activeTab === "products" && <TrendruumProductsClient />}
        {activeTab === "orders" && <TrendruumOrdersClient />}
        {activeTab === "calculator" && <TrendruumCalculatorClient />}
        {activeTab === "cargo" && (
          <div>
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg">
                  <Truck className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-foreground">Trendruum Kargo Fiyatları</h1>
                  <p className="text-sm text-muted-foreground">
                    Trendruum anlaşmalı kargo fiyatları ve desi barem tablosu
                  </p>
                </div>
              </div>
            </div>
            <CargoPriceCalculator />
          </div>
        )}
      </div>
    </div>
  );
}
