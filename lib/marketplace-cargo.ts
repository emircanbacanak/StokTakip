/**
 * Ortak Pazaryeri Kargo Servisi (n11, Pazarama, Trendruum, İdefix vb.)
 */

export const MARKETPLACE_CARGO_COMPANIES: { id: string; label: string }[] = [
  { id: "auto", label: "⚡ En Ucuz Kargo (Otomatik)" },
  { id: "Aras", label: "Aras Kargo" },
  { id: "Sürat", label: "Sürat Kargo" },
  { id: "Yurtiçi", label: "Yurtiçi Kargo" },
  { id: "PTT", label: "PTT Kargo" },
  { id: "MNG", label: "MNG Kargo" },
  { id: "Sendeo", label: "Sendeo Kargo" },
  { id: "KolayGelsin", label: "Kolay Gelsin" },
];

// Barem altı yaklaşık ortalama fiyatlar (KDV Hariç)
const BAREM_PRICES: Record<string, Record<string, number>> = {
  under200: {
    auto: 44.50,
    Aras: 48.33,
    Sürat: 46.50,
    Yurtiçi: 65.00,
    PTT: 42.00,
    MNG: 49.00,
    Sendeo: 43.50,
    KolayGelsin: 55.00,
  },
  "200to350": {
    auto: 75.00,
    Aras: 79.16,
    Sürat: 78.50,
    Yurtiçi: 98.00,
    PTT: 72.00,
    MNG: 80.00,
    Sendeo: 74.00,
    KolayGelsin: 86.00,
  },
};

// Desi tablosu (KDV Hariç)
const DESI_TABLE: Record<number, number> = {
  1: 75.00,
  2: 82.00,
  3: 92.00,
  4: 102.00,
  5: 112.00,
  6: 122.00,
  7: 130.00,
  8: 138.00,
  9: 146.00,
  10: 155.00,
  15: 190.00,
  20: 235.00,
  30: 335.00,
};

export function getMarketplaceCargoExVat(desi: number, company = "auto"): number {
  const keys = Object.keys(DESI_TABLE).map(Number).sort((a, b) => a - b);
  const key = keys.find(k => k >= desi) ?? keys[keys.length - 1];
  const base = DESI_TABLE[key];
  if (company === "Yurtiçi") return base * 1.20;
  if (company === "PTT" || company === "Sendeo") return base * 0.95;
  return base;
}

export function calcMarketplaceShippingCost(
  weightGrams: number,
  satisFiyati: number,
  fastShipping: boolean,
  selectedCompany = "auto"
): number {
  const comp = selectedCompany || "auto";

  // Barem desteği fiyata göredir: Barem içindeyken kaç desi olduğu önemsizdir
  if (satisFiyati < 200) {
    const exVat = BAREM_PRICES.under200[comp] ?? BAREM_PRICES.under200.auto;
    return exVat * 1.20;
  }

  if (satisFiyati < 350) {
    const exVat = BAREM_PRICES["200to350"][comp] ?? BAREM_PRICES["200to350"].auto;
    return exVat * 1.20;
  }

  // 350 TL ve üzeri: Barem dışındadır -> Desi bazlı tarife geçerli
  const desi = Math.max(1, Math.ceil(weightGrams / 1000));
  const exVat = getMarketplaceCargoExVat(desi, comp);
  return exVat * 1.20;
}

export interface OptimizationSuggestion {
  shouldOptimize: boolean;
  suggestedPrice: number;
  currentNetProfit: number;
  optimizedNetProfit: number;
  profitIncrease: number;
  message: string;
}

export interface NetProfitInput {
  satisFiyati: number;
  productionCost: number;
  weightGrams: number;
  packagingCost: number;
  platformFee: number;
  fixedCost: number;
  returnRate: number;
  commissionRate: number;
  paymentTermFee: number;
  advertisingRate: number;
  fastShipping: boolean;
  selectedCompany?: string;
}

export function checkPriceOptimization(input: NetProfitInput): OptimizationSuggestion {
  const { satisFiyati } = input;
  return {
    shouldOptimize: false,
    suggestedPrice: 199.90,
    currentNetProfit: 0,
    optimizedNetProfit: 0,
    profitIncrease: 0,
    message: "",
  };
}

