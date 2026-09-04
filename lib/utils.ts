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
