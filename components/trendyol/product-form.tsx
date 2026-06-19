"use client";

/**
 * ProductForm v4
 *
 * Değişiklikler:
 * - Filtre: ithalatçı/üretici adres alanları gizlendi, sadece gerçek ürün özellikleri gösteriliyor
 * - Web Color → Renk slicer seçilince yanında otomatik çıkıyor (bağımlı)
 * - Ortak fiyat/KDV/stok: her varyant için ayrı değil, üst kısımda 1 kez giriliyor
 * - KDV varsayılan %20, Stok 100
 * - Liste fiyatı = Satış fiyatı (otomatik)
 * - Varyant sadece Renk + Yükseklik (slicer) seçimlerinden oluşuyor
 * - Her varyant için ayrı görsel
 */

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertCircle, CheckCircle2, Loader2, Package, Send, Plus,
  Trash2, ChevronDown, ChevronUp, Palette, Layers,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";
import { submitProductToTrendyol, type SubmitProductResult } from "@/lib/trendyol-api-client";
import type { Product } from "@/lib/types/database";
import { ImageUploader } from "./image-uploader";
import { RichEditor } from "./rich-editor";
import { BrandSearch, CategorySearch } from "./brand-category-search";

// ─── SABITLER ────────────────────────────────────────────────────────────────
const VAT_RATES = [0, 1, 8, 10, 20];
const CARGO_COMPANIES = ["TEX/PTT", "Aras", "Sürat", "KolayGelsin", "DHL", "Yurtiçi"];

// Gizlenecek attribute adları (ithalatçı/üretici bilgileri)
const HIDDEN_ATTR_NAMES = new Set([
  "Üretici Mail Adresi",
  "İkincil İthalatçı Mail Adresi",
  "Birincil İthalatçı Mail Adresi",
  "Birincil İthalatçı Adı",
  "Birincil İthalatçı Adres Bilgisi",
  "Üçüncül İthalatçı Adres Bilgisi",
  "Üçüncül İthalatçı Adı",
  "Üretici Adres Bilgisi",
  "Üretici Adı",
  "İkincil İthalatçı Adı",
  "Üçüncül İthalatçı Mail Adresi",
  "İkincil İthalatçı Adres Bilgisi",
  "Üretici Adres Bilgisi",
  "Üretici Mail Adresi",
]);

// Web Color attribute ID (Trendyol'da 348)
const WEB_COLOR_ATTR_ID = 348;
// Renk attribute ID (Trendyol'da 47)
const RENK_ATTR_ID = 47;

// ─── TİPLER ──────────────────────────────────────────────────────────────────
interface AttributeValue { id: number; name: string; }
interface CategoryAttribute {
  attribute: { id: number; name: string; };
  attributeValues: AttributeValue[];
  required: boolean;
  varianter: boolean;
  slicer: boolean;
  allowCustom: boolean;
  allowMultipleAttributeValues: boolean;
}

interface Variant {
  id: string;
  // Slicer değerleri: Renk, Yükseklik vb.
  slicerValues: Record<number, { valueId: number | null; customValue: string; }>;
  // Web Color — Renk seçilince yanında gösterilir
  webColorId: number | null;
  image_urls: string[];
}

function newVariant(slicerAttrs: CategoryAttribute[]): Variant {
  const slicerValues: Variant["slicerValues"] = {};
  slicerAttrs.forEach(a => {
    slicerValues[a.attribute.id] = { valueId: null, customValue: "" };
  });
  return {
    id: `v-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    slicerValues,
    webColorId: null,
    image_urls: [],
  };
}

interface ProductFormProps {
  onSuccess?: (listingId: string) => void;
  listingId?: string;
}

// ─── BİLEŞEN ─────────────────────────────────────────────────────────────────
export function ProductForm({ onSuccess, listingId }: ProductFormProps) {
  const { toast } = useToast();

  // Temel bilgiler
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("<p></p>");
  const [brandName, setBrandName] = useState("");
  const [brandId, setBrandId] = useState<number | null>(null);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [categoryName, setCategoryName] = useState("");
  const [desi, setDesi] = useState("");
  const [warrantyMonths, setWarrantyMonths] = useState("0");
  const [cargoCompany, setCargoCompany] = useState("TEX/PTT");
  const [productId, setProductId] = useState("");

  // Ortak fiyat/KDV/stok (tüm varyantlar için aynı)
  const [salePrice, setSalePrice] = useState("");
  const [vatRate, setVatRate] = useState(20);          // varsayılan %20
  const [quantity, setQuantity] = useState("100");     // varsayılan 100

  // Kategori attribute'ları
  const [attributes, setAttributes] = useState<CategoryAttribute[]>([]);
  const [attrLoading, setAttrLoading] = useState(false);

  // Non-slicer attribute değerleri (Menşei, Materyal, Parça Sayısı…)
  const [attrValues, setAttrValues] = useState<Record<number, { valueId: number | null; customValue: string }>>({});

  // Varyantlar
  const [variants, setVariants] = useState<Variant[]>([]);
  const [expandedVariant, setExpandedVariant] = useState<string | null>(null);

  // Gönderim
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<SubmitProductResult | null>(null);

  // Ürün adı autocomplete
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [sugOpen, setSugOpen] = useState(false);
  const suggRef = useRef<HTMLDivElement>(null);
  const debRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Dışa tıklama ──────────────────────────────────────────────────────────
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (suggRef.current && !suggRef.current.contains(e.target as Node)) setSugOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // ── Ürün adı autocomplete ──────────────────────────────────────────────────
  useEffect(() => {
    const q = title.trim();
    if (q.length < 2) { setSuggestions([]); return; }
    if (debRef.current) clearTimeout(debRef.current);
    debRef.current = setTimeout(async () => {
      try {
        const sb = createClient();
        const { data } = await sb.from("products").select("*").ilike("name", `%${q}%`).limit(8).order("name");
        if (data?.length) { setSuggestions(data as Product[]); setSugOpen(true); }
      } catch { /* ignore */ }
    }, 220);
    return () => { if (debRef.current) clearTimeout(debRef.current); };
  }, [title]);

  const pickSuggestion = useCallback((p: Product) => {
    const prod = p as unknown as Record<string, unknown>;
    setTitle((prod.name as string) ?? "");
    setProductId((prod.id as string) ?? "");
    setDesi(String(prod.weight_grams ? Math.ceil((prod.weight_grams as number) / 1000) : ""));
    setSugOpen(false);
    setSuggestions([]);
  }, []);

  // ── Kategori seçilince attribute'ları yükle ────────────────────────────────
  useEffect(() => {
    if (!categoryId) { setAttributes([]); setAttrValues({}); setVariants([]); return; }
    setAttrLoading(true);
    fetch(`/api/trendyol-meta?type=attributes&categoryId=${categoryId}`)
      .then(r => r.json())
      .then(data => {
        const attrs: CategoryAttribute[] = data.categoryAttributes ?? [];
        setAttributes(attrs);

        const initVals: typeof attrValues = {};
        attrs
          .filter(a => !a.slicer && a.attribute.id !== WEB_COLOR_ATTR_ID && !HIDDEN_ATTR_NAMES.has(a.attribute.name))
          .forEach(a => {
            // Menşei → otomatik TR
            if (a.attribute.name === "Menşei" || a.attribute.id === 1192) {
              const trVal = a.attributeValues.find(v => v.name === "TR" || v.name === "Türkiye");
              initVals[a.attribute.id] = { valueId: trVal?.id ?? null, customValue: "" };
            }
            // Materyal → otomatik Plastik
            else if (a.attribute.name === "Materyal" || a.attribute.id === 14) {
              const plastikVal = a.attributeValues.find(v => v.name === "Plastik");
              initVals[a.attribute.id] = { valueId: plastikVal?.id ?? null, customValue: "" };
            }
            else {
              initVals[a.attribute.id] = { valueId: null, customValue: "" };
            }
          });
        setAttrValues(initVals);

        const slicers = attrs.filter(a => a.slicer);
        if (slicers.length > 0) {
          const v = newVariant(slicers);
          setVariants([v]);
          setExpandedVariant(v.id);
        } else {
          setVariants([]);
        }
      })
      .catch(() => setAttributes([]))
      .finally(() => setAttrLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId]);

  // Hesaplanan attribute grupları
  const slicerAttrs = attributes.filter(a => a.slicer);
  const webColorAttr = attributes.find(a => a.attribute.id === WEB_COLOR_ATTR_ID);
  const renkAttr = slicerAttrs.find(a => a.attribute.id === RENK_ATTR_ID);
  const visibleNonSlicerAttrs = attributes.filter(
    a => !a.slicer && a.attribute.id !== WEB_COLOR_ATTR_ID && !HIDDEN_ATTR_NAMES.has(a.attribute.name)
  );
  const hasVariants = slicerAttrs.length > 0;

  // ── Varyant yönetimi ──────────────────────────────────────────────────────
  const updVariant = (id: string, patch: Partial<Variant>) =>
    setVariants(prev => prev.map(v => v.id === id ? { ...v, ...patch } : v));

  const addVariant = () => {
    const v = newVariant(slicerAttrs);
    setVariants(prev => [...prev, v]);
    setExpandedVariant(v.id);
  };

  const removeVariant = (id: string) =>
    setVariants(prev => prev.filter(v => v.id !== id));

  // Varyant başlık etiketi — Renk İsmi + diğer slicerlar
  const variantLabel = (v: Variant) => {
    const parts: string[] = [];

    // Renk İsmi önce
    if (renkAttr) {
      const sv = v.slicerValues[renkAttr.attribute.id];
      const renkIsmi = sv?.customValue?.trim();
      const webColorName = webColorAttr?.attributeValues.find(av => av.id === v.webColorId)?.name;
      if (renkIsmi) parts.push(renkIsmi);
      else if (webColorName) parts.push(webColorName);
    }

    // Diğer slicer'lar (Yükseklik vb.)
    slicerAttrs
      .filter(a => a.attribute.id !== RENK_ATTR_ID)
      .forEach(attr => {
        const sv = v.slicerValues[attr.attribute.id];
        if (!sv) return;
        const name = sv.customValue || attr.attributeValues.find(av => av.id === sv.valueId)?.name;
        if (name) parts.push(name);
      });

    return parts.join(" / ") || "Yeni Varyant";
  };

  // ── Gönder ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast({ title: "Hata", description: "Ürün başlığı zorunludur", variant: "destructive" });
      return;
    }
    if (!salePrice || parseFloat(salePrice) <= 0) {
      toast({ title: "Hata", description: "Satış fiyatı giriniz", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    setSubmitResult(null);
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

      const images = hasVariants ? (variants[0]?.image_urls ?? []) : [];
      const result = await submitProductToTrendyol(
        {
          listing_id: listingId,
          product_id: productId || undefined,
          title,
          description: description.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() || "-",
          brand_name: brandName || "Yok",
          list_price: parseFloat(salePrice),
          sale_price: parseFloat(salePrice),
          vat_rate: vatRate,
          quantity: parseInt(quantity) || 100,
          image_urls: images,
          cargo_company: cargoCompany || undefined,
          desi: desi ? parseFloat(desi) : undefined,
          warranty_months: parseInt(warrantyMonths) || 0,
        },
        supabaseUrl,
        anonKey
      );

      setSubmitResult(result);

      if (result.success) {
        toast({
          title: result.simulation ? "Simülasyon — Kaydedildi" : "Trendyol'a Gönderildi ✓",
          description: `Barkod: ${result.barcode}`,
        });
        onSuccess?.(result.listing_id ?? "");
      } else if ((result as { saved_as_draft?: boolean }).saved_as_draft) {
        // Taslak kaydedildi — kısmen başarılı, yıkıcı değil
        toast({
          title: "Taslak kaydedildi",
          description: "Trendyol servisi şu an erişilemiyor. Listelerim'den yeniden gönderebilirsiniz.",
        });
      } else {
        toast({ title: "Gönderim Hatası", description: result.error, variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Bağlantı Hatası", description: (err as Error).message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  // ─── RENDER ──────────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* ── 1. Ürün Temel Bilgileri ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Package className="w-4 h-4 text-orange-500" />
            Ürün Bilgileri
          </CardTitle>
          <CardDescription>Başlık yazınca katalogdan otomatik tamamlar</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">

          {/* Başlık */}
          <div ref={suggRef} className="relative">
            <Label className="mb-1.5 block">Ürün Başlığı *</Label>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Örn: Aura Vazo 20cm Dekoratif"
              autoComplete="off" required
            />
            {sugOpen && suggestions.length > 0 && (
              <div className="absolute z-50 left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-xl max-h-52 overflow-y-auto">
                {suggestions.map(p => {
                  const prod = p as unknown as Record<string, unknown>;
                  return (
                    <button key={prod.id as string} type="button"
                      className="w-full text-left px-3 py-2.5 hover:bg-muted/60 transition-colors border-b border-border/40 last:border-0"
                      onClick={() => pickSuggestion(p)}>
                      <div className="text-sm font-medium">{prod.name as string}</div>
                      <div className="text-xs text-muted-foreground">
                        {prod.weight_grams ? `${prod.weight_grams} gr` : ""}
                        {prod.price ? ` · ₺${(prod.price as number).toFixed(2)}` : ""}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Marka + Kategori */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <BrandSearch
              value={brandName}
              brandId={brandId}
              onChange={(name, id) => { setBrandName(name); setBrandId(id); }}
            />
            <CategorySearch
              value={categoryName}
              categoryId={categoryId}
              onChange={(name, id) => { setCategoryName(name); setCategoryId(id); }}
            />
          </div>

          {/* Açıklama */}
          <div>
            <Label className="mb-1.5 block">
              Açıklama
              <span className="ml-2 text-xs text-muted-foreground font-normal">Bold · İtalik · Liste · Başlık</span>
            </Label>
            <RichEditor value={description} onChange={setDescription} minHeight={140}
              placeholder="Ürün özelliklerini, boyutlarını ve kullanım bilgilerini buraya yazın..." />
          </div>
        </CardContent>
      </Card>

      {/* ── 2. Ortak Fiyat / KDV / Stok ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Fiyat &amp; Stok</CardTitle>
          <CardDescription>Tüm varyantlar için ortak</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <Label className="mb-1.5 block">Satış Fiyatı (₺) *</Label>
              <Input
                type="number" step="0.01" min="0"
                value={salePrice}
                onChange={e => setSalePrice(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>
            <div>
              <Label className="mb-1.5 block">KDV (%)</Label>
              <Select value={String(vatRate)} onValueChange={v => setVatRate(parseInt(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {VAT_RATES.map(r => (
                    <SelectItem key={r} value={String(r)}>%{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block">Stok</Label>
              <Input
                type="number" min="0"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
              />
            </div>
          </div>
          {/* Liste fiyatı bilgi notu */}
          {salePrice && (
            <p className="text-xs text-muted-foreground mt-2">
              Liste fiyatı otomatik olarak satış fiyatı ile aynı gönderilir: <strong>₺{salePrice}</strong>
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── 3. Kategori Özellikleri (non-slicer, filtreli) ── */}
      {attrLoading && (
        <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground bg-muted/20 rounded-xl">
          <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
          Kategori özellikleri yükleniyor…
        </div>
      )}

      {!attrLoading && visibleNonSlicerAttrs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Layers className="w-4 h-4 text-orange-500" />
              Ürün Özellikleri
              <span className="text-xs text-muted-foreground font-normal ml-1">({categoryName})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {visibleNonSlicerAttrs.map(attr => {
                const val = attrValues[attr.attribute.id] ?? { valueId: null, customValue: "" };
                const hasValues = attr.attributeValues.length > 0;
                return (
                  <div key={attr.attribute.id}>
                    <Label className="mb-1.5 block text-sm">
                      {attr.attribute.name}
                      {attr.required && <span className="text-orange-500 ml-1">*</span>}
                    </Label>
                    {hasValues ? (
                      <Select
                        value={val.valueId ? String(val.valueId) : ""}
                        onValueChange={v => setAttrValues(prev => ({
                          ...prev, [attr.attribute.id]: { valueId: parseInt(v), customValue: "" },
                        }))}
                      >
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue placeholder="Seçin…" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          {attr.attributeValues.map(av => (
                            <SelectItem key={av.id} value={String(av.id)}>{av.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : attr.allowCustom ? (
                      <Input className="h-9 text-sm" value={val.customValue}
                        onChange={e => setAttrValues(prev => ({
                          ...prev, [attr.attribute.id]: { valueId: null, customValue: e.target.value },
                        }))}
                        placeholder={attr.attribute.name}
                      />
                    ) : null}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── 4. Varyantlar ── */}
      {!attrLoading && hasVariants && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Palette className="w-4 h-4 text-orange-500" />
                Satış ve Varyant Bilgileri
                <span className="text-xs text-muted-foreground font-normal">
                  {slicerAttrs.map(a => a.attribute.name).join(" · ")}
                </span>
              </CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addVariant}
                className="text-orange-600 border-orange-200 hover:bg-orange-50 dark:hover:bg-orange-950/20">
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Varyant Ekle
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {variants.map((variant, idx) => {
              const isExpanded = expandedVariant === variant.id;
              const label = variantLabel(variant);

              // Bu varyanttaki Renk seçimi — Web Color bağlı
              const renkSv = renkAttr ? variant.slicerValues[renkAttr.attribute.id] : null;
              const hasRenkSelected = renkSv && (renkSv.valueId || renkSv.customValue);

              return (
                <div key={variant.id} className="border border-border rounded-xl overflow-hidden">
                  {/* Başlık satırı */}
                  <div
                    className="flex items-center gap-3 px-4 py-3 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors select-none"
                    onClick={() => setExpandedVariant(isExpanded ? null : variant.id)}
                  >
                    {/* Renk önizleme dairesi (Renk varsa) */}
                    <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-xs font-bold text-orange-600 shrink-0">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {variant.image_urls.length} görsel
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {variants.length > 1 && (
                        <button type="button"
                          onClick={e => { e.stopPropagation(); removeVariant(variant.id); }}
                          className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    </div>
                  </div>

                  {/* İçerik — CSS ile gizle/göster, unmount etme (yükleme kesilmesin) */}
                  <div className={`border-t border-border ${isExpanded ? "" : "hidden"}`}>
                    <div className="p-4 space-y-5">

                      {/* Slicer alanları — Renk Skalası+İsmi önce, sonra diğerleri (Yükseklik vb.) */}
                      <div className="space-y-4">

                        {/* ── Renk bloğu: Skalası + İsmi yan yana ── */}
                        {renkAttr && webColorAttr && (
                          <div className="p-3.5 rounded-xl border border-orange-200 bg-orange-50/40 dark:border-orange-800/40 dark:bg-orange-950/10 space-y-3">
                            <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-orange-500 inline-block" />
                              Renk Bilgisi
                              <span className="text-orange-500 text-xs">*</span>
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {/* Renk Skalası — Web Color listesinden seçim */}
                              <div>
                                <Label className="mb-1.5 block text-sm">
                                  Renk Skalası
                                  <span className="text-orange-500 ml-1">*</span>
                                </Label>
                                <Select
                                  value={variant.webColorId ? String(variant.webColorId) : ""}
                                  onValueChange={val => {
                                    const selectedName = webColorAttr.attributeValues.find(
                                      av => av.id === parseInt(val)
                                    )?.name ?? "";
                                    // Renk Skalası seçilince Renk İsmi otomatik dolar
                                    updVariant(variant.id, {
                                      webColorId: parseInt(val),
                                      slicerValues: {
                                        ...variant.slicerValues,
                                        [renkAttr.attribute.id]: {
                                          valueId: null,
                                          // Eğer Renk İsmi boşsa otomatik doldur, doluysa dokunma
                                          customValue: variant.slicerValues[renkAttr.attribute.id]?.customValue || selectedName,
                                        },
                                      },
                                    });
                                  }}
                                >
                                  <SelectTrigger className="h-9 text-sm bg-background">
                                    <SelectValue placeholder="Renk skalası seçin" />
                                  </SelectTrigger>
                                  <SelectContent className="max-h-72">
                                    {webColorAttr.attributeValues.map(av => (
                                      <SelectItem key={av.id} value={String(av.id)}>
                                        {av.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              {/* Renk İsmi — serbest metin, Skaladan otomatik dolar ama düzenlenebilir */}
                              <div>
                                <Label className="mb-1.5 block text-sm">
                                  Renk İsmi
                                  <span className="text-orange-500 ml-1">*</span>
                                  <span className="ml-1.5 text-xs text-muted-foreground font-normal">
                                    (düzenleyebilirsiniz)
                                  </span>
                                </Label>
                                <Input
                                  className="h-9 text-sm bg-background"
                                  value={variant.slicerValues[renkAttr.attribute.id]?.customValue ?? ""}
                                  onChange={e => updVariant(variant.id, {
                                    slicerValues: {
                                      ...variant.slicerValues,
                                      [renkAttr.attribute.id]: { valueId: null, customValue: e.target.value },
                                    },
                                  })}
                                  placeholder="Renk skalası seçince otomatik dolar"
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Renk Skalası yoksa (farklı kategoriler) sadece Renk İsmi text alanı */}
                        {renkAttr && !webColorAttr && (
                          <div>
                            <Label className="mb-1.5 block text-sm font-medium">
                              Renk
                              {renkAttr.required && <span className="text-orange-500 ml-1">*</span>}
                            </Label>
                            <Input
                              className="h-9 text-sm"
                              value={variant.slicerValues[renkAttr.attribute.id]?.customValue ?? ""}
                              onChange={e => updVariant(variant.id, {
                                slicerValues: {
                                  ...variant.slicerValues,
                                  [renkAttr.attribute.id]: { valueId: null, customValue: e.target.value },
                                },
                              })}
                              placeholder="Örn: Beyaz, Bej, Siyah…"
                            />
                          </div>
                        )}

                        {/* Diğer slicer'lar (Yükseklik vb.) — Renk hariç */}
                        {slicerAttrs
                          .filter(a => a.attribute.id !== RENK_ATTR_ID)
                          .map(attr => {
                            const sv = variant.slicerValues[attr.attribute.id] ?? { valueId: null, customValue: "" };
                            const hasValueList = attr.attributeValues.length > 0;
                            return (
                              <div key={attr.attribute.id}>
                                <Label className="mb-1.5 block text-sm font-medium">
                                  {attr.attribute.name}
                                  {attr.required && <span className="text-orange-500 ml-1">*</span>}
                                </Label>
                                {hasValueList ? (
                                  <Select
                                    value={sv.valueId ? String(sv.valueId) : ""}
                                    onValueChange={val => updVariant(variant.id, {
                                      slicerValues: {
                                        ...variant.slicerValues,
                                        [attr.attribute.id]: { valueId: parseInt(val), customValue: "" },
                                      },
                                    })}
                                  >
                                    <SelectTrigger className="h-9 text-sm">
                                      <SelectValue placeholder={`${attr.attribute.name} seçin`} />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-60">
                                      {attr.attributeValues.map(av => (
                                        <SelectItem key={av.id} value={String(av.id)}>{av.name}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <Input
                                    className="h-9 text-sm"
                                    value={sv.customValue}
                                    onChange={e => updVariant(variant.id, {
                                      slicerValues: {
                                        ...variant.slicerValues,
                                        [attr.attribute.id]: { valueId: null, customValue: e.target.value },
                                      },
                                    })}
                                    placeholder={attr.attribute.name}
                                  />
                                )}
                              </div>
                            );
                          })}
                      </div>

                      {/* Görsel yükleme */}
                      <div>
                        <Label className="mb-2 block text-sm font-medium">
                          Görseller
                          <span className="ml-1.5 text-xs text-muted-foreground font-normal">
                            {label !== "Yeni Varyant" ? `— ${label}` : ""} için
                          </span>
                        </Label>
                        <ImageUploader
                          value={variant.image_urls}
                          onChange={urls => updVariant(variant.id, { image_urls: urls })}
                          maxImages={8}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Özet tablo — 2+ varyant varsa */}
            {variants.length > 1 && (
              <div className="overflow-x-auto rounded-lg border border-border mt-2">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50">
                    <tr>
                      {webColorAttr && <th className="px-3 py-2 text-left font-semibold">Renk Skalası</th>}
                      {renkAttr && <th className="px-3 py-2 text-left font-semibold">Renk İsmi</th>}
                      {slicerAttrs
                        .filter(a => a.attribute.id !== RENK_ATTR_ID)
                        .map(a => (
                          <th key={a.attribute.id} className="px-3 py-2 text-left font-semibold">{a.attribute.name}</th>
                        ))}
                      <th className="px-3 py-2 text-left font-semibold">Görsel</th>
                    </tr>
                  </thead>
                  <tbody>
                    {variants.map((v, i) => (
                      <tr key={v.id} className={i % 2 === 0 ? "" : "bg-muted/20"}>
                        {webColorAttr && (
                          <td className="px-3 py-2">
                            {webColorAttr.attributeValues.find(av => av.id === v.webColorId)?.name ?? "—"}
                          </td>
                        )}
                        {renkAttr && (
                          <td className="px-3 py-2">
                            {v.slicerValues[renkAttr.attribute.id]?.customValue || "—"}
                          </td>
                        )}
                        {slicerAttrs
                          .filter(a => a.attribute.id !== RENK_ATTR_ID)
                          .map(attr => {
                            const sv = v.slicerValues[attr.attribute.id];
                            const name = sv?.customValue || attr.attributeValues.find(av => av.id === sv?.valueId)?.name || "—";
                            return <td key={attr.attribute.id} className="px-3 py-2">{name}</td>;
                          })}
                        <td className="px-3 py-2">{v.image_urls.length} adet</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── 5. Kategori seçilmemişse görsel alanı ── */}
      {!hasVariants && !attrLoading && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Görseller
              <span className="ml-2 text-xs text-muted-foreground font-normal">
                {categoryId ? "Varyant yok — genel görseller" : "Kategori seçince varyantlar çıkacak"}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ImageUploader value={[]} onChange={() => {}} maxImages={8} />
          </CardContent>
        </Card>
      )}

      {/* ── 6. Kargo & Garanti ── */}
      <Card>
        <CardHeader><CardTitle className="text-base">Kargo &amp; Garanti</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <Label className="mb-1.5 block">Kargo Firması</Label>
            <Select value={cargoCompany} onValueChange={setCargoCompany}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CARGO_COMPANIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-1.5 block">Desi</Label>
            <Input type="number" step="0.1" min="0.1" value={desi}
              onChange={e => setDesi(e.target.value)} placeholder="1" />
          </div>
          <div>
            <Label className="mb-1.5 block">Garanti (ay)</Label>
            <Input type="number" min="0" value={warrantyMonths}
              onChange={e => setWarrantyMonths(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* ── Sonuç ── */}
      {submitResult && (
        <div className={`flex items-start gap-3 p-4 rounded-xl border ${
          submitResult.success
            ? "bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800"
            : submitResult.saved_as_draft
            ? "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-700"
            : "bg-destructive/10 border-destructive/30"
        }`}>
          {submitResult.success
            ? <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
            : submitResult.saved_as_draft
            ? <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            : <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          }
          <div className="text-sm">
            {submitResult.success ? (
              <>
                <p className="font-semibold text-green-700 dark:text-green-400">
                  {submitResult.simulation ? "Simülasyon — kaydedildi" : "Trendyol'a gönderildi! ✓"}
                </p>
                <p className="text-muted-foreground mt-0.5">
                  Barkod: <code className="font-mono text-xs">{submitResult.barcode}</code>
                  {" · "}SKU: <code className="font-mono text-xs">{submitResult.stock_code}</code>
                </p>
              </>
            ) : submitResult.saved_as_draft ? (
              <>
                <p className="font-semibold text-amber-700 dark:text-amber-400">
                  Taslak olarak kaydedildi
                </p>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  Trendyol ürün servisi şu an erişilemiyor.
                  <strong className="text-foreground"> "Listelerim"</strong> sekmesinden
                  Trendyol düzelince <strong className="text-foreground">"Yeniden Gönder"</strong> butonunu kullanabilirsiniz.
                </p>
                {submitResult.barcode && (
                  <p className="text-muted-foreground mt-1 text-xs">
                    Taslak Barkod: <code className="font-mono">{submitResult.barcode}</code>
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="font-semibold text-destructive">Gönderim başarısız</p>
                <p className="text-muted-foreground mt-0.5 text-xs">{submitResult.error}</p>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Gönder ── */}
      <Button type="submit" disabled={submitting}
        className="w-full bg-orange-500 hover:bg-orange-600 text-white text-base h-12">
        {submitting
          ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Gönderiliyor…</>
          : <><Send className="w-4 h-4 mr-2" />Trendyol&apos;a Gönder</>}
      </Button>
    </form>
  );
}
