// Renk adından görsel renk bilgisi döndürür
// bg: arka plan rengi (Tailwind veya hex)
// text: yazı rengi
// border: kenarlık rengi

interface ColorStyle {
  bg: string;
  text: string;
  border: string;
  dot: string; // solid dot rengi
}

const COLOR_MAP: Record<string, ColorStyle> = {
  // Temel renkler
  "siyah":        { bg: "bg-zinc-900",        text: "text-white",        border: "border-zinc-700",   dot: "#18181b" },
  "beyaz":        { bg: "bg-white",            text: "text-zinc-800",     border: "border-zinc-300",   dot: "#ffffff" },
  "kırmızı":      { bg: "bg-red-500",          text: "text-white",        border: "border-red-600",    dot: "#ef4444" },
  "mavi":         { bg: "bg-blue-500",         text: "text-white",        border: "border-blue-600",   dot: "#3b82f6" },
  "yeşil":        { bg: "bg-green-500",        text: "text-white",        border: "border-green-600",  dot: "#22c55e" },
  "sarı":         { bg: "bg-yellow-400",       text: "text-zinc-800",     border: "border-yellow-500", dot: "#facc15" },
  "turuncu":      { bg: "bg-orange-500",       text: "text-white",        border: "border-orange-600", dot: "#f97316" },
  "mor":          { bg: "bg-purple-500",       text: "text-white",        border: "border-purple-600", dot: "#a855f7" },
  "pembe":        { bg: "bg-pink-400",         text: "text-white",        border: "border-pink-500",   dot: "#f472b6" },
  "gri":          { bg: "bg-gray-400",         text: "text-white",        border: "border-gray-500",   dot: "#9ca3af" },
  "kahverengi":   { bg: "bg-amber-800",        text: "text-white",        border: "border-amber-900",  dot: "#92400e" },
  "lacivert":     { bg: "bg-blue-900",         text: "text-white",        border: "border-blue-950",   dot: "#1e3a5f" },
  "bordo":        { bg: "bg-rose-900",         text: "text-white",        border: "border-rose-950",   dot: "#881337" },
  "bej":          { bg: "bg-amber-100",        text: "text-amber-900",    border: "border-amber-300",  dot: "#d4b896" },
  "gümüş":        { bg: "bg-slate-300",        text: "text-slate-800",    border: "border-slate-400",  dot: "#c0c0c0" },
  "altın":        { bg: "bg-yellow-500",       text: "text-white",        border: "border-yellow-600", dot: "#d4af37" },
  "krem":         { bg: "bg-amber-50",         text: "text-amber-900",    border: "border-amber-200",  dot: "#fffdd0" },
  "ekru":         { bg: "bg-stone-200",        text: "text-stone-800",    border: "border-stone-300",  dot: "#c2b280" },
  "füme":         { bg: "bg-zinc-600",         text: "text-white",        border: "border-zinc-700",   dot: "#52525b" },
  "antrasit":     { bg: "bg-zinc-700",         text: "text-white",        border: "border-zinc-800",   dot: "#3f3f46" },
  "açık mavi":    { bg: "bg-sky-300",          text: "text-sky-900",      border: "border-sky-400",    dot: "#7dd3fc" },
  "koyu mavi":    { bg: "bg-blue-800",         text: "text-white",        border: "border-blue-900",   dot: "#1e40af" },
  "açık yeşil":   { bg: "bg-green-300",        text: "text-green-900",    border: "border-green-400",  dot: "#86efac" },
  "koyu yeşil":   { bg: "bg-green-800",        text: "text-white",        border: "border-green-900",  dot: "#166534" },
  "açık gri":     { bg: "bg-gray-200",         text: "text-gray-700",     border: "border-gray-300",   dot: "#d1d5db" },
  "koyu gri":     { bg: "bg-gray-600",         text: "text-white",        border: "border-gray-700",   dot: "#4b5563" },
  "neon sarı":    { bg: "bg-yellow-300",       text: "text-yellow-900",   border: "border-yellow-400", dot: "#fde047" },
  "neon yeşil":   { bg: "bg-lime-400",         text: "text-lime-900",     border: "border-lime-500",   dot: "#a3e635" },
  "neon pembe":   { bg: "bg-fuchsia-400",      text: "text-white",        border: "border-fuchsia-500",dot: "#e879f9" },
  "vişne":        { bg: "bg-rose-700",         text: "text-white",        border: "border-rose-800",   dot: "#be123c" },
  "vişne çürüğü": { bg: "bg-rose-950",         text: "text-white",        border: "border-rose-900",   dot: "#4c0519" },
  "turkuaz":      { bg: "bg-teal-400",         text: "text-teal-900",     border: "border-teal-500",   dot: "#2dd4bf" },
  "petrol":       { bg: "bg-teal-700",         text: "text-white",        border: "border-teal-800",   dot: "#0f766e" },
  "indigo":       { bg: "bg-indigo-500",       text: "text-white",        border: "border-indigo-600", dot: "#6366f1" },
  "leylak":       { bg: "bg-violet-300",       text: "text-violet-900",   border: "border-violet-400", dot: "#c4b5fd" },
  "lila":         { bg: "bg-purple-300",       text: "text-purple-900",   border: "border-purple-400", dot: "#d8b4fe" },
  "somon":        { bg: "bg-rose-300",         text: "text-rose-900",     border: "border-rose-400",   dot: "#fda4af" },
  "mercan":       { bg: "bg-orange-400",       text: "text-white",        border: "border-orange-500", dot: "#fb923c" },
  "hardal":       { bg: "bg-yellow-600",       text: "text-white",        border: "border-yellow-700", dot: "#ca8a04" },
  "zeytin":       { bg: "bg-lime-700",         text: "text-white",        border: "border-lime-800",   dot: "#4d7c0f" },
  "kiremit":      { bg: "bg-orange-700",       text: "text-white",        border: "border-orange-800", dot: "#c2410c" },
  "bakır":        { bg: "bg-orange-600",       text: "text-white",        border: "border-orange-700", dot: "#b87333" },
  "bronz":        { bg: "bg-amber-700",        text: "text-white",        border: "border-amber-800",  dot: "#cd7f32" },
  "ten rengi":    { bg: "bg-orange-200",       text: "text-orange-900",   border: "border-orange-300", dot: "#f5cba7" },
  "haiki yeşil":  { bg: "bg-green-700",        text: "text-white",        border: "border-green-800",  dot: "#4a7c59" },
  "sedefli mavi": { bg: "bg-sky-200",          text: "text-sky-900",      border: "border-sky-300",    dot: "#a8d8ea" },
};

// Fallback: renk adından hash ile renk üret
function hashColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  // Pastel ama görünür renkler - saturation ve lightness sabit
  return `hsl(${h}, 55%, 45%)`;
}

// HSL'yi hex'e çevir
function hslToHex(hsl: string): string {
  const match = hsl.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
  if (!match) return "#888888";
  const h = parseInt(match[1]) / 360;
  const s = parseInt(match[2]) / 100;
  const l = parseInt(match[3]) / 100;
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const r = Math.round(hue2rgb(p, q, h + 1/3) * 255);
  const g = Math.round(hue2rgb(p, q, h) * 255);
  const b = Math.round(hue2rgb(p, q, h - 1/3) * 255);
  return `#${r.toString(16).padStart(2,"0")}${g.toString(16).padStart(2,"0")}${b.toString(16).padStart(2,"0")}`;
}

export function getColorStyle(colorName: string): ColorStyle {
  const key = colorName.toLowerCase().trim();
  if (COLOR_MAP[key]) return COLOR_MAP[key];

  // Kısmi eşleşme dene
  for (const [mapKey, style] of Object.entries(COLOR_MAP)) {
    if (key.includes(mapKey) || mapKey.includes(key)) return style;
  }

  // Fallback: hash rengi - her zaman hex döndür
  const hsl = hashColor(colorName);
  const hex = hslToHex(hsl);
  return {
    bg: "",
    text: "text-foreground",
    border: "border-border",
    dot: hex,
  };
}
