"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { CostSettings } from "@/lib/types/database";
import { calculateProductCost, DEFAULT_COST_SETTINGS } from "@/lib/cost-calculator";
import { formatCurrency } from "@/lib/utils";
import { Calculator, TrendingUp, Zap, Flame, Wrench } from "lucide-react";
import { Card } from "@/components/ui/card";

interface ProductCostCalculatorProps {
  weightGrams: number;
  className?: string;
}

export function ProductCostCalculator({ weightGrams, className }: ProductCostCalculatorProps) {
  const [settings, setSettings] = useState<CostSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("cost_settings")
        .select("*")
        .limit(1)
        .single();

      if (error) throw error;
      setSettings(data);
    } catch (error) {
      console.error("Ayarlar yüklenirken hata:", error);
      // Varsayılan ayarları kullan
      setSettings({
        id: "",
        ...DEFAULT_COST_SETTINGS,
        updated_at: new Date().toISOString(),
        updated_by: null,
      });
    } finally {
      setLoading(false);
    }
  }

  if (loading || !settings || weightGrams <= 0) {
    return null;
  }

  const calculation = calculateProductCost(weightGrams, settings);

  return (
    <div className={className}>
      <div className="flex items-center gap-2 mb-4">
        <Calculator className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        <h3 className="text-lg font-semibold text-foreground">Maliyet Hesaplaması</h3>
      </div>

      {/* Maliyet Dökümü */}
      <div className="space-y-3 mb-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Ürün Gramı:</span>
          <span className="font-semibold text-foreground">{weightGrams.toFixed(2)} gr</span>
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Fire Dahil Gramı:</span>
          <span className="font-semibold text-foreground">
            {calculation.weightWithWasteGrams.toFixed(2)} gr
            {settings.waste_enabled && (
              <span className="text-xs text-muted-foreground ml-1">
                (+%{settings.waste_percentage})
              </span>
            )}
          </span>
        </div>

        <div className="h-px bg-border my-3" />

        {calculation.breakdown.map((item, index) => (
          item.enabled && (
            <div key={index} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                {item.label.includes("Filament") && <Flame className="w-4 h-4 text-orange-500" />}
                {item.label.includes("Elektrik") && <Zap className="w-4 h-4 text-yellow-500" />}
                {item.label.includes("Fire") && <TrendingUp className="w-4 h-4 text-red-500" />}
                {item.label.includes("Yıpranma") && <Wrench className="w-4 h-4 text-gray-500" />}
                <span className="text-muted-foreground">{item.label}:</span>
              </div>
              <span className="font-medium text-foreground">{formatCurrency(item.value)}</span>
            </div>
          )
        ))}

        <div className="h-px bg-border my-3" />

        <div className="flex items-center justify-between text-base">
          <span className="font-semibold text-foreground">Toplam Maliyet:</span>
          <span className="font-bold text-lg text-blue-600 dark:text-blue-400">
            {formatCurrency(calculation.totalCost)}
          </span>
        </div>
      </div>

      {/* Önerilen Satış Fiyatları */}
      <div className="bg-gradient-to-br from-blue-50 to-violet-50 dark:from-blue-950/20 dark:to-violet-950/20 rounded-lg p-4 border border-blue-200 dark:border-blue-900">
        <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          Önerilen Satış Fiyatları
        </h4>
        <div className="grid grid-cols-5 gap-2">
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">%{settings.profit_margin_1}</p>
            <p className="font-bold text-sm text-foreground">
              {formatCurrency(calculation.suggestedPrices.margin10)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">%{settings.profit_margin_2}</p>
            <p className="font-bold text-sm text-foreground">
              {formatCurrency(calculation.suggestedPrices.margin20)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">%{settings.profit_margin_3}</p>
            <p className="font-bold text-sm text-emerald-600 dark:text-emerald-400">
              {formatCurrency(calculation.suggestedPrices.margin30)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">%{settings.profit_margin_4}</p>
            <p className="font-bold text-sm text-foreground">
              {formatCurrency(calculation.suggestedPrices.margin40)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">%{settings.profit_margin_5}</p>
            <p className="font-bold text-sm text-foreground">
              {formatCurrency(calculation.suggestedPrices.margin50)}
            </p>
          </div>
        </div>
        {settings.price_rounding_enabled && (
          <p className="text-xs text-muted-foreground mt-2 text-center">
            * Fiyatlar 0 veya 5'e yuvarlanmıştır
          </p>
        )}
      </div>
    </div>
  );
}
