/**
 * Ürün Maliyet Hesaplama Yardımcı Fonksiyonları
 * 
 * Bu modül ürün maliyetlerini, kar marjlarını ve satış fiyatlarını hesaplar.
 */

import type { CostSettings, ProductCost } from "./types/database";

/**
 * Maliyet hesaplama sonucu
 */
export interface CostCalculationResult {
  // Ham maliyetler
  rawFilamentCost: number;
  electricityCost: number;
  wasteCost: number;
  depreciationCost: number;
  totalCost: number;
  
  // Gramaj bilgileri
  weightGrams: number;
  weightWithWasteGrams: number;
  
  // Önerilen satış fiyatları
  suggestedPrices: {
    margin10: number;
    margin20: number;
    margin30: number;
    margin40: number;
    margin50: number;
  };
  
  // Maliyet dökümü (görüntüleme için)
  breakdown: {
    label: string;
    value: number;
    enabled: boolean;
  }[];
}

/**
 * Sipariş maliyet analizi sonucu
 */
export interface OrderCostAnalysisResult {
  // Toplam miktarlar
  totalItemsCount: number;
  totalQuantity: number;
  totalWeightGrams: number;
  totalWeightWithWasteGrams: number;
  
  // Toplam maliyetler
  totalFilamentCost: number;
  totalElectricityCost: number;
  totalWasteCost: number;
  totalDepreciationCost: number;
  totalProductionCost: number;
  
  // Gelir analizi
  totalRevenue: number;
  totalProfit: number;
  profitMarginPercentage: number;
  
  // Maliyet dökümü
  breakdown: {
    label: string;
    value: number;
    percentage: number;
  }[];
}

/**
 * Fiyatı 0 veya 5'e yuvarlar
 */
export function roundToNearest5(price: number): number {
  // Önce en yakın tam sayıya yuvarla
  let rounded = Math.round(price);
  
  // Son basamağı kontrol et
  const lastDigit = rounded % 10;
  
  if (lastDigit === 1 || lastDigit === 2) {
    rounded = Math.floor(rounded / 10) * 10;
  } else if (lastDigit === 3 || lastDigit === 4 || lastDigit === 6 || lastDigit === 7) {
    rounded = Math.floor(rounded / 10) * 10 + 5;
  } else if (lastDigit === 8 || lastDigit === 9) {
    rounded = Math.ceil(rounded / 10) * 10;
  }
  
  return rounded;
}

/**
 * Tek bir ürün için maliyet hesaplar
 * 
 * Mantık: Fire dahil gramaj = gerçekte harcanan filament miktarı
 * Örnek: 40 gr ürün, %10 fire → 44 gr filament harcanır
 * Tüm maliyetler 44 gr üzerinden hesaplanır.
 */
export function calculateProductCost(
  weightGrams: number,
  settings: CostSettings
): CostCalculationResult {
  // Fire dahil gramaj = gerçekte harcanan toplam filament
  // 40 gr ürün + %10 fire = 44 gr filament harcanır
  const weightWithWaste = settings.waste_enabled
    ? weightGrams * (1 + settings.waste_percentage / 100)
    : weightGrams;

  // Saf filament maliyeti: fire dahil gramaj üzerinden (gerçekte bu kadar filament harcanıyor)
  // 44 gr × (650 TL / 1000 gr) = 28.60 TL
  const rawFilamentCost = settings.filament_enabled
    ? (weightWithWaste / 1000) * settings.filament_price_per_kg
    : 0;

  // Elektrik maliyeti: fire dahil gramaj üzerinden (makine o kadar çalışıyor)
  // 44 gr × 0.1 TL/gr = 4.40 TL
  const electricityCost = settings.electricity_enabled
    ? weightWithWaste * settings.electricity_cost_per_gram
    : 0;

  // Yıpranma maliyeti: fire dahil gramaj üzerinden (makine o kadar çalışıyor)
  // 44 gr × 0.05 TL/gr = 2.20 TL
  const depreciationCost = settings.depreciation_enabled
    ? weightWithWaste * settings.depreciation_cost_per_gram
    : 0;

  // Toplam maliyet (fire ayrı kalem yok — zaten filament içinde)
  const totalCost = rawFilamentCost + electricityCost + depreciationCost;

  // Önerilen satış fiyatları (kar marjlı)
  let price10 = totalCost * (1 + settings.profit_margin_1 / 100);
  let price20 = totalCost * (1 + settings.profit_margin_2 / 100);
  let price30 = totalCost * (1 + settings.profit_margin_3 / 100);
  let price40 = totalCost * (1 + settings.profit_margin_4 / 100);
  let price50 = totalCost * (1 + settings.profit_margin_5 / 100);

  // Fiyat yuvarlama
  if (settings.price_rounding_enabled) {
    price10 = roundToNearest5(price10);
    price20 = roundToNearest5(price20);
    price30 = roundToNearest5(price30);
    price40 = roundToNearest5(price40);
    price50 = roundToNearest5(price50);
  }

  return {
    rawFilamentCost,
    electricityCost,
    wasteCost: 0, // artık ayrı kalem değil, filament içinde
    depreciationCost,
    totalCost,
    weightGrams,
    weightWithWasteGrams: weightWithWaste,
    suggestedPrices: {
      margin10: price10,
      margin20: price20,
      margin30: price30,
      margin40: price40,
      margin50: price50,
    },
    breakdown: [
      {
        label: `Filament Gideri (${weightWithWaste.toFixed(1)} gr × ${settings.filament_price_per_kg} TL/kg)`,
        value: rawFilamentCost,
        enabled: settings.filament_enabled,
      },
      {
        label: `Elektrik (${weightWithWaste.toFixed(1)} gr × ${settings.electricity_cost_per_gram} TL/gr)`,
        value: electricityCost,
        enabled: settings.electricity_enabled,
      },
      {
        label: `Yıpranma (${weightWithWaste.toFixed(1)} gr × ${settings.depreciation_cost_per_gram} TL/gr)`,
        value: depreciationCost,
        enabled: settings.depreciation_enabled,
      },
    ],
  };
}

/**
 * Sipariş için toplam maliyet analizi hesaplar
 */
export function calculateOrderCostAnalysis(
  items: Array<{ productName: string; quantity: number; weightGrams: number; unitPrice: number }>,
  settings: CostSettings
): OrderCostAnalysisResult {
  let totalWeight = 0;
  let totalWeightWithWaste = 0;
  let totalFilament = 0;
  let totalElectricity = 0;
  let totalWaste = 0;
  let totalDepreciation = 0;
  let totalRevenue = 0;
  
  // Her kalem için hesapla
  items.forEach((item) => {
    const itemWeight = item.weightGrams * item.quantity;
    // Fire dahil = gerçekte harcanan filament
    const itemWeightWithWaste = settings.waste_enabled
      ? itemWeight * (1 + settings.waste_percentage / 100)
      : itemWeight;

    totalWeight += itemWeight;
    totalWeightWithWaste += itemWeightWithWaste;

    // Filament: fire dahil gramaj üzerinden (gerçekte bu kadar harcanıyor)
    if (settings.filament_enabled) {
      totalFilament += (itemWeightWithWaste / 1000) * settings.filament_price_per_kg;
    }

    // Elektrik: fire dahil gramaj üzerinden
    if (settings.electricity_enabled) {
      totalElectricity += itemWeightWithWaste * settings.electricity_cost_per_gram;
    }

    // Yıpranma: fire dahil gramaj üzerinden
    if (settings.depreciation_enabled) {
      totalDepreciation += itemWeightWithWaste * settings.depreciation_cost_per_gram;
    }

    // Gelir
    totalRevenue += item.quantity * item.unitPrice;
  });
  
  const totalCost = totalFilament + totalElectricity + totalWaste + totalDepreciation;
  const totalProfit = totalRevenue - totalCost;
  const profitMarginPercentage = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
  
  return {
    totalItemsCount: items.length,
    totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
    totalWeightGrams: totalWeight,
    totalWeightWithWasteGrams: totalWeightWithWaste,
    totalFilamentCost: totalFilament,
    totalElectricityCost: totalElectricity,
    totalWasteCost: totalWaste,
    totalDepreciationCost: totalDepreciation,
    totalProductionCost: totalCost,
    totalRevenue,
    totalProfit,
    profitMarginPercentage,
    breakdown: [
      {
        label: "Filament",
        value: totalFilament,
        percentage: totalCost > 0 ? (totalFilament / totalCost) * 100 : 0,
      },
      {
        label: "Elektrik",
        value: totalElectricity,
        percentage: totalCost > 0 ? (totalElectricity / totalCost) * 100 : 0,
      },
      {
        label: "Fire",
        value: totalWaste,
        percentage: totalCost > 0 ? (totalWaste / totalCost) * 100 : 0,
      },
      {
        label: "Yıpranma",
        value: totalDepreciation,
        percentage: totalCost > 0 ? (totalDepreciation / totalCost) * 100 : 0,
      },
    ],
  };
}

/**
 * Kar marjına göre satış fiyatı hesaplar
 */
export function calculateSalePrice(
  cost: number,
  profitMarginPercentage: number,
  roundToFive: boolean = true
): number {
  const price = cost * (1 + profitMarginPercentage / 100);
  return roundToFive ? roundToNearest5(price) : price;
}

/**
 * Satış fiyatından kar marjını hesaplar
 */
export function calculateProfitMargin(cost: number, salePrice: number): number {
  if (cost === 0) return 0;
  return ((salePrice - cost) / cost) * 100;
}

/**
 * Satış fiyatından kar miktarını hesaplar
 */
export function calculateProfit(cost: number, salePrice: number): number {
  return salePrice - cost;
}

/**
 * Maliyet dökümünü formatlar (görüntüleme için)
 */
export function formatCostBreakdown(breakdown: CostCalculationResult["breakdown"]): string {
  return breakdown
    .filter((item) => item.enabled)
    .map((item) => `${item.label}: ${item.value.toFixed(2)} TL`)
    .join("\n");
}

/**
 * Gramajı kilogram cinsine çevirir
 */
export function gramsToKilograms(grams: number): number {
  return grams / 1000;
}

/**
 * Kilogramı gram cinsine çevirir
 */
export function kilogramsToGrams(kilograms: number): number {
  return kilograms * 1000;
}

/**
 * Varsayılan maliyet ayarları
 */
export const DEFAULT_COST_SETTINGS: Omit<CostSettings, "id" | "updated_at" | "updated_by"> = {
  filament_price_per_kg: 650.0,
  filament_enabled: true,
  electricity_cost_per_gram: 0.1,
  electricity_enabled: true,
  waste_percentage: 10.0,
  waste_enabled: true,
  depreciation_cost_per_gram: 0.05,
  depreciation_enabled: true,
  profit_margin_1: 10.0,
  profit_margin_2: 20.0,
  profit_margin_3: 30.0,
  profit_margin_4: 40.0,
  profit_margin_5: 50.0,
  price_rounding_enabled: true,
};
