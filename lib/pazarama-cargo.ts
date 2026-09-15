/**
 * Pazarama Kargo ve Barem Sistemi
 * 
 * Barem Destek (10 desi altı ve 300 TL altı, KDV Hariç):
 * - Aynı Gün (0 Gün):
 *   0 - 149,99 TL: PTT 34.16, Aras 48.33, Sürat 54.58, KolayGelsin 55.83, DHL 57.08, Yurtiçi 83.33
 *   150 - 300 TL:  PTT 65.83, Aras 79.16, Sürat 85.41, KolayGelsin 86.66, DHL 87.91, Yurtiçi 113.33
 * 
 * - Aynı Gün Değilse:
 *   0 - 149,99 TL: PTT 68.74, Aras 80.83, Sürat 87.08, KolayGelsin 88.33, DHL 89.58, Yurtiçi 114.16
 *   150 - 300 TL:  PTT 74.16, Aras 86.24, Sürat 92.49, KolayGelsin 93.74, DHL 94.99, Yurtiçi 119.16
 * 
 * 300 TL üzeri veya 10 desi üzeri standart desi listesi.
 */

export const KDV_RATE = 0.20;

export const PAZARAMA_CARGO_COMPANIES: { id: string; label: string }[] = [
  { id: "auto", label: "⚡ En Ucuz Kargo (Otomatik)" },
  { id: "PTT", label: "PTT Kargo" },
  { id: "Aras", label: "Aras Kargo" },
  { id: "Sürat", label: "Sürat Kargo" },
  { id: "KolayGelsin", label: "Kolay Gelsin" },
  { id: "DHL", label: "DHL eCommerce" },
  { id: "Yurtiçi", label: "Yurtiçi Kargo" },
];

export const PAZARAMA_BAREM_TABLE: {
  sameDay: { under150: Record<string, number>; from150to300: Record<string, number> };
  otherDay: { under150: Record<string, number>; from150to300: Record<string, number> };
} = {
  sameDay: {
    under150: {
      "PTT": 34.16,
      "Aras": 48.33,
      "Sürat": 54.58,
      "KolayGelsin": 55.83,
      "DHL": 57.08,
      "Yurtiçi": 83.33,
    },
    from150to300: {
      "PTT": 65.83,
      "Aras": 79.16,
      "Sürat": 85.41,
      "KolayGelsin": 86.66,
      "DHL": 87.91,
      "Yurtiçi": 113.33,
    },
  },
  otherDay: {
    under150: {
      "PTT": 68.74,
      "Aras": 80.83,
      "Sürat": 87.08,
      "KolayGelsin": 88.33,
      "DHL": 89.58,
      "Yurtiçi": 114.16,
    },
    from150to300: {
      "PTT": 74.16,
      "Aras": 86.24,
      "Sürat": 92.49,
      "KolayGelsin": 93.74,
      "DHL": 94.99,
      "Yurtiçi": 119.16,
    },
  },
};

export const PAZARAMA_DESI_TABLE: Record<number, Record<string, number>> = {
  1:  { "PTT": 81.82,  "Aras": 90.50,  "Sürat": 95.32,  "KolayGelsin": 98.39,  "DHL": 99.16,  "Yurtiçi": 117.84 },
  2:  { "PTT": 81.82,  "Aras": 92.14,  "Sürat": 95.32,  "KolayGelsin": 98.39,  "DHL": 99.16,  "Yurtiçi": 120.83 },
  3:  { "PTT": 101.29, "Aras": 102.81, "Sürat": 107.52, "KolayGelsin": 108.89, "DHL": 112.35, "Yurtiçi": 128.50 },
  4:  { "PTT": 102.88, "Aras": 113.82, "Sürat": 117.25, "KolayGelsin": 120.44, "DHL": 126.03, "Yurtiçi": 131.04 },
  5:  { "PTT": 102.88, "Aras": 122.05, "Sürat": 121.56, "KolayGelsin": 129.89, "DHL": 137.75, "Yurtiçi": 146.32 },
  6:  { "PTT": 106.25, "Aras": 132.97, "Sürat": 133.13, "KolayGelsin": 140.39, "DHL": 151.43, "Yurtiçi": 151.43 },
  7:  { "PTT": 112.16, "Aras": 141.02, "Sürat": 142.44, "KolayGelsin": 149.84, "DHL": 160.22, "Yurtiçi": 171.10 },
  8:  { "PTT": 123.97, "Aras": 150.45, "Sürat": 151.10, "KolayGelsin": 160.34, "DHL": 170.00, "Yurtiçi": 178.31 },
  9:  { "PTT": 135.78, "Aras": 159.07, "Sürat": 160.55, "KolayGelsin": 169.79, "DHL": 181.72, "Yurtiçi": 188.91 },
  10: { "PTT": 153.48, "Aras": 170.09, "Sürat": 169.74, "KolayGelsin": 181.34, "DHL": 191.49, "Yurtiçi": 197.37 },
};

export function gramsToDesi(weightGrams: number): number {
  if (weightGrams <= 500) return 1;
  if (weightGrams <= 1000) return 1;
  if (weightGrams <= 2000) return 2;
  if (weightGrams <= 3000) return 3;
  return Math.max(1, Math.ceil(weightGrams / 1000));
}

export function getPazaramaStandartCargoExVat(desi: number, company?: string): number {
  const roundedDesi = Math.max(1, Math.min(10, Math.ceil(desi)));
  const row = PAZARAMA_DESI_TABLE[roundedDesi] || PAZARAMA_DESI_TABLE[10];

  if (company && company !== "auto" && row[company] !== undefined) {
    let base = row[company];
    if (desi > 10) base += (desi - 10) * 12;
    return base;
  }

  let min = Infinity;
  for (const c of Object.keys(row)) {
    if (row[c] < min) min = row[c];
  }
  if (desi > 10) min += (desi - 10) * 12;
  return min;
}

export function calcPazaramaShippingCost(
  weightGrams: number,
  price: number,
  fastShipping: boolean = true,
  company?: string
): number {
  const desi = gramsToDesi(weightGrams);

  // 300 TL altı için barem desteği (fiyata göre hesaplanır, desi önemsizdir)
  if (price < 300) {
    const table = fastShipping ? PAZARAMA_BAREM_TABLE.sameDay : PAZARAMA_BAREM_TABLE.otherDay;
    const band = price < 150 ? table.under150 : table.from150to300;
    let exVat: number;
    if (company && company !== "auto" && band[company] !== undefined) {
      exVat = band[company];
    } else {
      exVat = Math.min(...Object.values(band));
    }
    return Math.round(exVat * (1 + KDV_RATE) * 100) / 100;
  }

  const exVat = getPazaramaStandartCargoExVat(desi, company);
  return Math.round(exVat * (1 + KDV_RATE) * 100) / 100;
}
