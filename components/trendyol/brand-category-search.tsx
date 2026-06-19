"use client";

/**
 * BrandSearch + CategorySearch
 *
 * Marka: Trendyol GET /brands/suggestions?name=X  (Bearer auth)
 * Kategori: Trendyol GET /product-categories (ağaç, önbellekli)
 *           + local filter ile debounced arama
 *
 * API erişimi için Next.js API Route kullanılır (credentials client'a açılmaz).
 * Route: /api/trendyol-meta
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Search, Tag, Package2 } from "lucide-react";

// ─── TİPLER ─────────────────────────────────────────────────────────────────
export interface TrendyolBrand {
  id: number;
  name: string;
}

export interface TrendyolCategory {
  id: number;
  name: string;
  parentId: number | null;
  subCategories: TrendyolCategory[];
  // hesaplanan yol: "Ev & Yaşam > Dekorasyon > Vazolar"
  path?: string;
}

// ─── BRAND SEARCH ────────────────────────────────────────────────────────────
interface BrandSearchProps {
  value: string;            // Seçili marka adı (gösterim için)
  brandId?: number | null;  // Seçili marka ID
  onChange: (name: string, id: number | null) => void;
}

export function BrandSearch({ value, brandId, onChange }: BrandSearchProps) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<TrendyolBrand[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const debRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Dışa tıklama
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // Harici value değişirse sync et
  useEffect(() => { setQuery(value); }, [value]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setResults([]); return; }
    if (debRef.current) clearTimeout(debRef.current);
    debRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/trendyol-meta?type=brands&name=${encodeURIComponent(q)}`);
        if (res.ok) {
          const data = await res.json();
          const brands: TrendyolBrand[] = data.brands ?? [];

          // Önbellek yükleniyorsa (boş döndü, _loading flag var) → tekrar dene
          if (brands.length === 0 && data._loading) {
            // 2 saniye bekle ve tekrar dene
            await new Promise(r => setTimeout(r, 2000));
            const res2 = await fetch(`/api/trendyol-meta?type=brands&name=${encodeURIComponent(q)}`);
            if (res2.ok) {
              const data2 = await res2.json();
              const brands2: TrendyolBrand[] = data2.brands ?? [];
              setResults(brands2);
              if (brands2.length > 0) setOpen(true);
            }
            return;
          }

          // Tam eşleşen önce
          const sorted = brands.sort((a, b) => {
            const al = a.name.toLowerCase(); const bl = b.name.toLowerCase(); const ql = q.toLowerCase();
            const aE = al === ql ? 0 : al.startsWith(ql) ? 1 : 2;
            const bE = bl === ql ? 0 : bl.startsWith(ql) ? 1 : 2;
            return aE - bE || a.name.localeCompare(b.name, "tr");
          });
          setResults(sorted);
          if (sorted.length > 0) setOpen(true);
          else setOpen(brands.length === 0 && q.length >= 2); // "bulunamadı" göster
        }
      } catch { /* ignore */ } finally {
        setLoading(false);
      }
    }, 350);
    return () => { if (debRef.current) clearTimeout(debRef.current); };
  }, [query]);

  const pick = (b: TrendyolBrand) => {
    onChange(b.name, b.id);
    setQuery(b.name);
    setOpen(false);
    setResults([]);
  };

  return (
    <div ref={wrapRef} className="relative">
      <Label htmlFor="brand-search" className="flex items-center gap-1.5 mb-1.5">
        <Tag className="w-3.5 h-3.5 text-orange-500" />
        Marka
      </Label>
      <div className="relative">
        <Input
          id="brand-search"
          value={query}
          onChange={e => {
            setQuery(e.target.value);
            onChange(e.target.value, null); // id'yi sıfırla, kullanıcı tekrar arayacak
          }}
          placeholder="Marka adı yazın…"
          autoComplete="off"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
        )}
        {!loading && query.length >= 2 && (
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-xl max-h-52 overflow-y-auto">
          {results.map(b => (
            <button
              key={b.id}
              type="button"
              onClick={() => pick(b)}
              className="w-full text-left px-3 py-2 hover:bg-muted/60 transition-colors flex items-center justify-between border-b border-border/40 last:border-0"
            >
              <span className="text-sm font-medium">{b.name}</span>
              <span className="text-xs text-muted-foreground font-mono">#{b.id}</span>
            </button>
          ))}
        </div>
      )}

      {open && results.length === 0 && !loading && query.length >= 2 && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-xl px-3 py-2 text-sm text-muted-foreground">
          Marka bulunamadı — &quot;Yok&quot; olarak devam edebilirsiniz
        </div>
      )}

      {brandId && (
        <p className="text-xs text-muted-foreground mt-1">
          Trendyol ID: <span className="font-mono">{brandId}</span>
        </p>
      )}
    </div>
  );
}

// ─── CATEGORY SEARCH ─────────────────────────────────────────────────────────
interface CategorySearchProps {
  value: string;              // Seçili kategori adı (gösterim)
  categoryId?: number | null; // Trendyol kategori ID
  localCategoryId?: string;   // Supabase DB kategori ID (opsiyonel)
  onChange: (name: string, trendyolId: number | null) => void;
}

// Kategori ağacını düzleştir ve yol ekle
function flattenCategories(cats: TrendyolCategory[], parentPath = ""): TrendyolCategory[] {
  return cats.flatMap(cat => {
    const path = parentPath ? `${parentPath} › ${cat.name}` : cat.name;
    const flat: TrendyolCategory = { ...cat, path, subCategories: [] };
    if (cat.subCategories?.length) {
      return [flat, ...flattenCategories(cat.subCategories, path)];
    }
    return [flat];
  });
}

// Sadece yaprak kategorileri döndür (alt kategorisi olmayanlar)
function leafCategories(cats: TrendyolCategory[]): TrendyolCategory[] {
  return flattenCategories(cats).filter(c => !c.subCategories?.length);
}

// Basit skor: query'nin kaç karakteri eşleşiyor
function scoreMatch(text: string, query: string): number {
  const t = text.toLowerCase();
  const q = query.toLowerCase();
  if (t === q) return 100;
  if (t.startsWith(q)) return 80;
  if (t.includes(q)) return 60;
  // Kelime bazlı
  const words = q.split(/\s+/);
  const matched = words.filter(w => t.includes(w)).length;
  return (matched / words.length) * 40;
}

let categoryCache: TrendyolCategory[] | null = null;
let categoryCacheFlat: TrendyolCategory[] | null = null;

export function CategorySearch({ value, categoryId, onChange }: CategorySearchProps) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<TrendyolCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const debRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Dışa tıklama
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => { setQuery(value); }, [value]);

  // Kategorileri önbelleğe al (ilk aramada)
  const loadCategories = useCallback(async () => {
    if (categoryCache) return categoryCache;
    setLoading(true);
    try {
      const res = await fetch("/api/trendyol-meta?type=categories");
      if (res.ok) {
        const data = await res.json();
        categoryCache = data.categories ?? [];
        categoryCacheFlat = leafCategories(categoryCache!);
      }
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
    return categoryCache;
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 1) { setResults([]); return; }
    if (debRef.current) clearTimeout(debRef.current);
    debRef.current = setTimeout(async () => {
      await loadCategories();
      if (!categoryCacheFlat) return;
      const scored = categoryCacheFlat
        .map(c => ({ cat: c, score: scoreMatch(c.path ?? c.name, q) }))
        .filter(x => x.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 12)
        .map(x => x.cat);
      setResults(scored);
      setOpen(true);
    }, 250);
    return () => { if (debRef.current) clearTimeout(debRef.current); };
  }, [query, loadCategories]);

  const pick = (c: TrendyolCategory) => {
    onChange(c.path ?? c.name, c.id);
    setQuery(c.path ?? c.name);
    setOpen(false);
    setResults([]);
  };

  return (
    <div ref={wrapRef} className="relative">
      <Label htmlFor="category-search" className="flex items-center gap-1.5 mb-1.5">
        <Package2 className="w-3.5 h-3.5 text-orange-500" />
        Kategori
        <span className="text-xs text-muted-foreground font-normal">(Trendyol kategorisi)</span>
      </Label>
      <div className="relative">
        <Input
          id="category-search"
          value={query}
          onChange={e => {
            setQuery(e.target.value);
            onChange(e.target.value, null);
          }}
          onFocus={() => { if (results.length) setOpen(true); }}
          placeholder="Kategori adı yazın, örn: Vazo"
          autoComplete="off"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-xl max-h-64 overflow-y-auto">
          {results.map(c => (
            <button
              key={c.id}
              type="button"
              onClick={() => pick(c)}
              className="w-full text-left px-3 py-2.5 hover:bg-muted/60 transition-colors border-b border-border/40 last:border-0"
            >
              <div className="text-sm font-medium truncate">{c.name}</div>
              <div className="text-xs text-muted-foreground truncate">{c.path}</div>
              <div className="text-xs text-orange-500 font-mono mt-0.5">ID: {c.id}</div>
            </button>
          ))}
        </div>
      )}

      {open && results.length === 0 && !loading && query.length >= 1 && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-xl px-3 py-2 text-sm text-muted-foreground">
          Kategori bulunamadı
        </div>
      )}

      {categoryId && (
        <p className="text-xs text-muted-foreground mt-1">
          Trendyol Kategori ID: <span className="font-mono text-orange-600">{categoryId}</span>
        </p>
      )}
    </div>
  );
}
