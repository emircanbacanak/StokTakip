import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(dateString: string): string {
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

export function formatDateTime(dateString: string): string {
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function formatDateShort(dateString: string): string {
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

export function cleanProductName(name: string): string {
  if (!name) return "Ürün";

  let clean = name.trim();

  // 1. Ebat / beden / varyant eklerini temizle (ör. ", one size", ", tek ebat")
  clean = clean.replace(/,\s*(one\s*size|tek\s*ebat|standart|standard|tek\s*beden|std)\b/gi, "");

  // 2. Tire (" - ") veya dikey çizgi (" | ") ile ayrılmış uzun SEO açıklamalarını temizle
  if (clean.includes(" - ")) {
    const parts = clean.split(" - ");
    if (parts[0].trim().length >= 3) {
      clean = parts[0].trim();
    }
  } else if (clean.includes(" | ")) {
    const parts = clean.split(" | ");
    if (parts[0].trim().length >= 3) {
      clean = parts[0].trim();
    }
  }

  // 3. Sondaki virgül veya gereksiz boşlukları temizle
  clean = clean.replace(/,\s*$/, "").trim();

  return clean || name;
}

/**
 * Akıllı Doğal Sıralama (Natural Sort)
 * Türkçe karakterleri (ç, ğ, ı, ö, ş, ü vb.) ve sayıları/ölçüleri (10 cm, 15 cm, 20 cm, vb.) doğru sıraya dizer.
 * "Belirtilmemiş", "Diğer" gibi özel alanları listenin en sonuna atar.
 */
export function naturalSort<T>(
  items: T[],
  getText: (item: T) => string = (x) => String(x)
): T[] {
  if (!items || !Array.isArray(items)) return [];

  return [...items].sort((a, b) => {
    const textA = (getText(a) || "").trim();
    const textB = (getText(b) || "").trim();

    // Özel etiketler en sona gelsin
    const isSpecialA = /belirtilme|diğer/i.test(textA);
    const isSpecialB = /belirtilme|diğer/i.test(textB);
    if (isSpecialA && !isSpecialB) return 1;
    if (!isSpecialA && isSpecialB) return -1;

    // Metindeki ilk sayıyı çıkar (örn: "15 cm" -> 15, "0 - 10 cm" -> 0, "5+" -> 5)
    const numMatchA = textA.match(/\d+(?:[.,]\d+)?/);
    const numMatchB = textB.match(/\d+(?:[.,]\d+)?/);
    const numA = numMatchA ? parseFloat(numMatchA[0].replace(",", ".")) : null;
    const numB = numMatchB ? parseFloat(numMatchB[0].replace(",", ".")) : null;

    if (numA !== null && numB !== null) {
      if (numA !== numB) return numA - numB;
    } else if (numA !== null && numB === null) {
      return -1;
    } else if (numA === null && numB !== null) {
      return 1;
    }

    return textA.localeCompare(textB, "tr", { numeric: true, sensitivity: "base" });
  });
}

