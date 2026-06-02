/**
 * Trendyol Kargo Servisi
 * İş kuralları: 26 Mart 2026 Barem Destek + 22 Mayıs 2026 Standart Kargo Tablosu
 */

// ─── VERİ MODELLERİ ──────────────────────────────────────────────────────────

export type CargoCompany =
  | "TEX/PTT"
  | "Aras"
  | "Sürat"
  | "KolayGelsin"
  | "DHL"
  | "Yurtiçi";

export type CargoTable = 1 | 2; // 1 = Hızlı (termin ≤1 gün), 2 = Yavaş (termin >1 gün)
export type BaremBand = "under200" | "200to350";
export type PricingMode = "barem" | "standart";

export interface CargoInput {
  satisFiyati: number;   // TL
  desi: number;          // hesaplanmış efektif desi
  kargoFirmasi: CargoCompany;
  terminSuresiGun: number;
}

export interface CargoResult {
  mode: PricingMode;
  table: CargoTable | null;       // null → standart mod
  baremBand: BaremBand | null;    // null → standart mod
  exVatPrice: number;             // KDV hariç ham fiyat (TL)
  incVatPrice: number;            // KDV dahil fiyat (TL)
  company: CargoCompany | null;   // standart modda null (en ucuz seçilir)
}

export interface OptimizationSuggestion {
  shouldOptimize: boolean;
  suggestedPrice: number;        // 199.90
  currentNetProfit: number;
  optimizedNetProfit: number;
  profitIncrease: number;
  message: string;
}

// ─── BAREM DESTEK FİYATLARI (KDV HARİÇ, TL) ────────────────────────────────
// Geçerlilik: satisFiyati < 350 VE desi < 10

const BAREM_PRICES: Record<
  CargoTable,
  Record<BaremBand, Record<CargoCompany, number>>
> = {
  1: {
    under200: {
      "TEX/PTT":    34.16,
      "Aras":       42.91,
      "Sürat":      48.74,
      "KolayGelsin":51.24,
      "DHL":        52.08,
      "Yurtiçi":    74.58,
    },
    "200to350": {
      "TEX/PTT":    65.83,
      "Aras":       73.74,
      "Sürat":      79.58,
      "KolayGelsin":82.08,
      "DHL":        82.91,
      "Yurtiçi":   104.58,
    },
  },
  2: {
    under200: {
      "TEX/PTT":    64.58,
      "Aras":       71.66,
      "Sürat":      77.49,
      "KolayGelsin":79.58,
      "DHL":        80.83,
      "Yurtiçi":   101.24,
    },
    "200to350": {
      "TEX/PTT":    72.91,
      "Aras":       79.99,
      "Sürat":      85.83,
      "KolayGelsin":87.91,
      "DHL":        89.16,
      "Yurtiçi":   109.58,
    },
  },
};

// ─── STANDART KARGO TABLOSU (KDV HARİÇ, TL) — 22 Mayıs 2026 ───────────────
// Sütunlar: Aras(0), DHL(1), KolayGelsin(2), PTT(3), Sürat(4), TEX(5),
//           Yurtiçi(6), CEVATedarik(7), CEVA(8), Horoz(9)

const STANDART_CARGO_TABLE: Record<number, (number | null)[]> = {
  0:   [83.93, 92.99, 91.99, 77.54, 89.71, 77.54, 112.77, 468.62, 651.74, 567.76],
  1:   [83.93, 92.99, 91.99, 77.54, 89.71, 77.54, 112.77, 468.62, 651.74, 567.76],
  2:   [83.93, 92.99, 91.99, 77.54, 89.71, 77.54, 112.77, 468.62, 651.74, 567.76],
  3:   [95.12, 103.99, 101.99, 96.00, 99.96, 93.63, 120.56, 468.62, 651.74, 567.76],
  4:  [103.68, 116.99, 112.99, 96.00, 109.30, 101.46, 123.15, 468.62, 651.74, 567.76],
  5:  [111.17, 129.99, 121.99, 100.55, 114.94, 107.98, 142.91, 468.62, 651.74, 567.76],
  6:  [121.12, 141.99, 131.99, 106.83, 126.28, 118.30, 149.82, 468.62, 651.74, 567.76],
  7:  [128.46, 149.99, 140.99, 113.15, 134.85, 125.66, 169.44, 468.62, 651.74, 567.76],
  8:  [137.05, 159.99, 150.99, 125.73, 143.29, 134.21, 175.96, 468.62, 651.74, 567.76],
  9:  [144.91, 169.99, 159.99, 138.34, 151.87, 142.42, 186.86, 468.62, 651.74, 567.76],
  10: [153.48, 176.99, 170.99, 157.26, 160.43, 153.47, 195.12, 468.62, 651.74, 567.76],
  15: [188.82, 226.99, 223.99, 198.22, 200.48, 192.81, 258.72, 468.62, 651.74, 567.76],
  20: [235.60, 309.99, 278.99, 239.76, 251.15, 236.21, 307.46, 468.62, 651.74, 567.76],
  25: [288.32, 429.99, 333.99, 281.27, 302.70, 283.69, 378.43, 468.62, 651.74, 567.76],
  30: [334.54, 554.99, 388.99, 322.78, 351.32, 328.88, 473.40, 468.62, 651.74, 567.76],
  50: [548.66, 1214.79, 588.99, 972.47, 659.65, 593.80, 745.22, 756.49, 803.17, 623.45],
};

// ─── YARDIMCI FONKSİYONLAR ───────────────────────────────────────────────────

/** Desi için en ucuz standart kargo fiyatı (KDV hariç) */
function getStandartCargoExVat(desi: number): number {
  const keys = Object.keys(STANDART_CARGO_TABLE).map(Number).sort((a, b) => a - b);
  const key = keys.find(k => k >= desi) ?? keys[keys.length - 1];
  const row = STANDART_CARGO_TABLE[key];
  const valid = row.filter((v): v is number => v !== null && v > 0);
  return Math.min(...valid);
}

/** Barem bandını belirle */
function getBaremBand(satisFiyati: number): BaremBand {
  return satisFiyati < 200 ? "under200" : "200to350";
}

/** Tablo seç (termin süresine göre) */
function getCargoTable(terminSuresiGun: number): CargoTable {
  return terminSuresiGun <= 1 ? 1 : 2;
}

// ─── ANA SERVİS FONKSİYONLARI ────────────────────────────────────────────────

/**
 * Kargo maliyeti hesapla
 * Kural 1: satisFiyati >= 350 VEYA desi >= 10 → Standart
 * Kural 1: satisFiyati < 350 VE desi < 10 → Barem Destek
 */
export function calcCargoPrice(input: CargoInput): CargoResult {
  const { satisFiyati, desi, kargoFirmasi, terminSuresiGun } = input;

  // Kural 1: Standart mı, Barem mi?
  const isStandart = satisFiyati >= 350 || desi >= 10;

  if (isStandart) {
    const exVat = getStandartCargoExVat(desi);
    return {
      mode: "standart",
      table: null,
      baremBand: null,
      exVatPrice: exVat,
      incVatPrice: exVat * 1.20,
      company: null,
    };
  }

  // Kural 2: Tablo seç
  const table = getCargoTable(terminSuresiGun);

  // Kural 3: Barem bandı
  const band = getBaremBand(satisFiyati);

  // Kural 4: Fiyat tablosundan al
  const exVat = BAREM_PRICES[table][band][kargoFirmasi];

  return {
    mode: "barem",
    table,
    baremBand: band,
    exVatPrice: exVat,
    incVatPrice: exVat * 1.20, // Kural 5: %20 KDV
    company: kargoFirmasi,
  };
}

/**
 * En ucuz kargo firmasını bul (barem modunda)
 */
export function getCheapestBaremCompany(
  satisFiyati: number,
  terminSuresiGun: number
): { company: CargoCompany; exVat: number; incVat: number } {
  const table = getCargoTable(terminSuresiGun);
  const band = getBaremBand(satisFiyati);
  const prices = BAREM_PRICES[table][band];

  let cheapestCompany = "TEX/PTT" as CargoCompany;
  let cheapestPrice = Infinity;

  for (const [company, price] of Object.entries(prices)) {
    if (price < cheapestPrice) {
      cheapestPrice = price;
      cheapestCompany = company as CargoCompany;
    }
  }

  return {
    company: cheapestCompany,
    exVat: cheapestPrice,
    incVat: cheapestPrice * 1.20,
  };
}

/**
 * Mevcut hesaplayıcıyla uyumlu tek fonksiyon:
 * weightGrams + price + fastShipping → KDV dahil kargo maliyeti (TL)
 */
export function calcShippingCost(
  weightGrams: number,
  satisFiyati: number,
  fastShipping: boolean
): number {
  const desi = Math.max(1, Math.ceil(weightGrams / 1000));

  if (satisFiyati >= 350 || desi >= 10) {
    return getStandartCargoExVat(desi) * 1.20;
  }

  const { incVat } = getCheapestBaremCompany(satisFiyati, fastShipping ? 1 : 2);
  return incVat;
}

/**
 * Kural 6: Fiyat Optimizasyon Önerisi
 * 200–215 TL arasındaki fiyatlar için 199.90 TL simülasyonu
 */
export interface NetProfitInput {
  satisFiyati: number;
  productionCost: number;
  weightGrams: number;
  packagingCost: number;
  platformFee: number;    // KDV dahil
  fixedCost: number;
  returnRate: number;     // % (5 gibi)
  commissionRate: number; // % (15 gibi)
  paymentTermFee: number; // % (3 gibi)
  advertisingRate: number;// % (8 gibi, organik ise 0)
  fastShipping: boolean;
}

function calcNetProfit(input: NetProfitInput): number {
  const {
    satisFiyati, productionCost, weightGrams, packagingCost,
    platformFee, fixedCost, returnRate, commissionRate,
    paymentTermFee, advertisingRate, fastShipping,
  } = input;

  const shipping = calcShippingCost(weightGrams, satisFiyati, fastShipping);
  const returnCost = (productionCost + shipping + packagingCost) * (returnRate / 100);
  const baseCost = productionCost + shipping + packagingCost + platformFee + fixedCost + returnCost;
  const priceExVat = satisFiyati / 1.20;
  const commission = satisFiyati * (commissionRate / 100);  // brüt fiyat üzerinden
  const termFee = satisFiyati * (paymentTermFee / 100);     // brüt fiyat üzerinden
  const adCost = satisFiyati * (advertisingRate / 100);
  const totalExpenses = baseCost + commission + termFee + adCost;
  return satisFiyati - totalExpenses;
}

export function checkPriceOptimization(input: NetProfitInput): OptimizationSuggestion {
  const { satisFiyati } = input;
  const OPTIMIZED_PRICE = 199.90;

  // Kural 6: sadece 200–215 TL arasında kontrol et
  const inRange = satisFiyati >= 200 && satisFiyati <= 215;

  if (!inRange) {
    return {
      shouldOptimize: false,
      suggestedPrice: OPTIMIZED_PRICE,
      currentNetProfit: calcNetProfit(input),
      optimizedNetProfit: calcNetProfit({ ...input, satisFiyati: OPTIMIZED_PRICE }),
      profitIncrease: 0,
      message: "",
    };
  }

  const currentProfit = calcNetProfit(input);
  const optimizedProfit = calcNetProfit({ ...input, satisFiyati: OPTIMIZED_PRICE });
  const profitIncrease = optimizedProfit - currentProfit;

  if (profitIncrease > 0) {
    return {
      shouldOptimize: true,
      suggestedPrice: OPTIMIZED_PRICE,
      currentNetProfit: currentProfit,
      optimizedNetProfit: optimizedProfit,
      profitIncrease,
      message: `⚡ Uyarı: Fiyatı ₺199.90 yaparsanız net kârınız ₺${profitIncrease.toFixed(2)} artacaktır (₺${currentProfit.toFixed(2)} → ₺${optimizedProfit.toFixed(2)})`,
    };
  }

  return {
    shouldOptimize: false,
    suggestedPrice: OPTIMIZED_PRICE,
    currentNetProfit: currentProfit,
    optimizedNetProfit: optimizedProfit,
    profitIncrease,
    message: "",
  };
}
