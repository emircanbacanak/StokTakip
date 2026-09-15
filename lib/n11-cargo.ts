/**
 * n11 Kargo ve Barem Sistemi
 * 
 * Barem Destek (Şartlı Kargo - 300 TL Altı Sepet, KDV Hariç):
 * - 0 - 149,99 TL:
 *   PTT: 38.74, Aras: 48.33, Sürat: 54.58, Kolay Gelsin: 55.83, DHL: 57.08, Yurtiçi: 83.33
 * - 150 - 299,99 TL:
 *   PTT: 70.41, Aras: 79.16, Sürat: 85.41, Kolay Gelsin: 86.66, DHL: 87.91, Yurtiçi: 113.33
 * 
 * 300 TL ve Üzeri / 10 Desi Üzeri:
 * - n11 Özel Anlaşmalı KDV Hariç Desi Tablosu uygulanır.
 */

export const KDV_RATE = 0.20;

export const N11_CARGO_COMPANIES: { id: string; label: string }[] = [
  { id: "auto", label: "⚡ En Ucuz Kargo (Otomatik)" },
  { id: "PTT", label: "PTT Kargo" },
  { id: "Aras", label: "Aras Kargo" },
  { id: "Sürat", label: "Sürat Kargo" },
  { id: "KolayGelsin", label: "Kolay Gelsin" },
  { id: "DHL", label: "DHL eCommerce" },
  { id: "Yurtiçi", label: "Yurtiçi Kargo" },
];

export const N11_BAREM_TABLE: {
  under150: Record<string, number>;
  from150to300: Record<string, number>;
} = {
  under150: {
    "PTT": 38.74,
    "Aras": 48.33,
    "Sürat": 54.58,
    "KolayGelsin": 55.83,
    "DHL": 57.08,
    "Yurtiçi": 83.33,
  },
  from150to300: {
    "PTT": 70.41,
    "Aras": 79.16,
    "Sürat": 85.41,
    "KolayGelsin": 86.66,
    "DHL": 87.91,
    "Yurtiçi": 113.33,
  },
};

// n11 KDV Hariç Desi Tablosu (1..10 Desi)
export const N11_DESI_TABLE: Record<number, Record<string, number>> = {
  1:  { "Aras": 90.50,  "Sürat": 95.32,  "PTT": 81.82,  "Yurtiçi": 117.84, "KolayGelsin": 98.39,  "DHL": 99.16 },
  2:  { "Aras": 92.14,  "Sürat": 95.32,  "PTT": 81.82,  "Yurtiçi": 120.83, "KolayGelsin": 98.39,  "DHL": 99.16 },
  3:  { "Aras": 102.81, "Sürat": 107.52, "PTT": 101.29, "Yurtiçi": 128.50, "KolayGelsin": 108.89, "DHL": 112.35 },
  4:  { "Aras": 113.82, "Sürat": 117.25, "PTT": 102.88, "Yurtiçi": 131.04, "KolayGelsin": 120.44, "DHL": 126.03 },
  5:  { "Aras": 122.05, "Sürat": 121.56, "PTT": 102.88, "Yurtiçi": 146.32, "KolayGelsin": 129.89, "DHL": 137.75 },
  6:  { "Aras": 132.97, "Sürat": 133.13, "PTT": 106.25, "Yurtiçi": 151.43, "KolayGelsin": 140.39, "DHL": 151.43 },
  7:  { "Aras": 141.02, "Sürat": 142.44, "PTT": 112.16, "Yurtiçi": 171.10, "KolayGelsin": 149.84, "DHL": 160.22 },
  8:  { "Aras": 150.45, "Sürat": 151.10, "PTT": 123.97, "Yurtiçi": 178.31, "KolayGelsin": 160.34, "DHL": 170.00 },
  9:  { "Aras": 159.07, "Sürat": 160.55, "PTT": 135.78, "Yurtiçi": 188.91, "KolayGelsin": 169.79, "DHL": 181.72 },
  10: { "Aras": 170.09, "Sürat": 169.74, "PTT": 153.48, "Yurtiçi": 197.37, "KolayGelsin": 181.34, "DHL": 191.49 },
};

export function gramsToDesi(weightGrams: number): number {
  if (weightGrams <= 500) return 1;
  if (weightGrams <= 1000) return 1;
  if (weightGrams <= 2000) return 2;
  if (weightGrams <= 3000) return 3;
  return Math.max(1, Math.ceil(weightGrams / 1000));
}

export function getN11StandartCargoExVat(desi: number, company?: string): number {
  const roundedDesi = Math.max(1, Math.min(10, Math.ceil(desi)));
  const row = N11_DESI_TABLE[roundedDesi] || N11_DESI_TABLE[10];
  
  if (company && company !== "auto" && row[company] !== undefined) {
    let base = row[company];
    if (desi > 10) base += (desi - 10) * 12; // 10 desi üzeri ek desi
    return base;
  }
  
  // En ucuz firma
  let min = Infinity;
  for (const c of Object.keys(row)) {
    if (row[c] < min) min = row[c];
  }
  if (desi > 10) min += (desi - 10) * 12;
  return min;
}

export function calcN11ShippingCost(
  weightGrams: number,
  price: number,
  fastShipping: boolean = true,
  company?: string
): number {
  const desi = gramsToDesi(weightGrams);

  // 300 TL altı için barem desteği (fiyata göre hesaplanır, desi önemsizdir)
  if (price < 300) {
    const band = price < 150 ? N11_BAREM_TABLE.under150 : N11_BAREM_TABLE.from150to300;
    let exVat: number;
    if (company && company !== "auto" && band[company] !== undefined) {
      exVat = band[company];
    } else {
      exVat = Math.min(...Object.values(band));
    }
    return Math.round(exVat * (1 + KDV_RATE) * 100) / 100;
  }

  // 300 TL ve üzeri: Barem desteği dışındadır -> Standart desi tablosu
  const exVat = getN11StandartCargoExVat(desi, company);
  return Math.round(exVat * (1 + KDV_RATE) * 100) / 100;
}
