"use client";

import { useState, useEffect } from "react";
import {
  PackagePlus,
  Layers,
  Palette,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Upload,
  Plus,
  Trash2,
  Check,
  AlertCircle,
  Loader2,
  Info,
  ExternalLink,
  RotateCcw,
  Tag,
  Store,
  FileText,
  Truck,
  DollarSign,
  Image as ImageIcon,
  CheckCircle2,
  Copy,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  testHepsiburadaConnection,
  searchHepsiburadaCategories,
  submitProductToHepsiburada,
  type HepsiburadaCategory,
} from "@/lib/hepsiburada-api-client";
import { generateEan13Barcode, generateSmartModelCode } from "@/lib/product-code-generator";

interface TableVariantRow {
  id: string;
  color: string;
  barcode: string;
  merchantSku: string;
  price: string;
  stock: string;
  desi: string;
  vatRate: string;
  images: string[];
}

const COMMON_COLORS = [
  "Beyaz",
  "Siyah",
  "Gri",
  "Antrasit",
  "Bej",
  "Kırmızı",
  "Mavi",
  "Yeşil",
  "Sarı",
  "Turuncu",
  "Pembe",
  "Mor",
  "Kahverengi",
  "Altın",
  "Gümüş",
];

export function HepsiburadaProductCreateFlow({
  onSuccess,
}: {
  onSuccess?: () => void;
}) {
  const { toast } = useToast();

  // Test Ortamı Bağlantı Durumu
  const [connStatus, setConnStatus] = useState<{
    tested: boolean;
    loading: boolean;
    success: boolean;
    message: string;
    listingCount?: number;
  }>({
    tested: false,
    loading: false,
    success: false,
    message: "",
  });

  // Form Adımları
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);

  // 1. Temel Bilgiler
  const [title, setTitle] = useState("");
  const [brand, setBrand] = useState("Ahenk Tasarım");
  const [description, setDescription] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<HepsiburadaCategory | null>(null);
  const [categorySearch, setCategorySearch] = useState("");
  const [categories, setCategories] = useState<HepsiburadaCategory[]>([]);
  const [searchingCategories, setSearchingCategories] = useState(false);

  // 2. Varyantlar (Renk & Stok)
  const [variants, setVariants] = useState<TableVariantRow[]>([
    {
      id: "v-1",
      color: "Beyaz",
      barcode: generateEan13Barcode(),
      merchantSku: `HB-SKU-${Date.now().toString().slice(-6)}-1`,
      price: "299",
      stock: "100",
      desi: "2",
      vatRate: "20",
      images: [],
    },
  ]);

  // 3. Ortak Görseller & Gönderim Durumu
  const [mainImages, setMainImages] = useState<string[]>([]);
  const [imageUrlInput, setImageUrlInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<{
    success: boolean;
    trackingId?: string;
    message?: string;
  } | null>(null);

  // Sayfa açıldığında bağlantıyı test et
  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    setConnStatus((prev) => ({ ...prev, loading: true }));
    const res = await testHepsiburadaConnection();
    setConnStatus({
      tested: true,
      loading: false,
      success: res.success,
      message: res.message,
      listingCount: res.listingCount,
    });
  };

  // Kategori Ara
  const handleSearchCategories = async (query: string) => {
    setCategorySearch(query);
    if (query.trim().length < 2) {
      setCategories([]);
      return;
    }
    setSearchingCategories(true);
    const results = await searchHepsiburadaCategories(query);
    setCategories(results);
    setSearchingCategories(false);
  };

  // Yeni Varyant Ekle
  const addVariant = () => {
    const nextNum = variants.length + 1;
    const newV: TableVariantRow = {
      id: `v-${Date.now()}`,
      color: COMMON_COLORS[nextNum % COMMON_COLORS.length] || "Siyah",
      barcode: generateEan13Barcode(),
      merchantSku: `HB-SKU-${Date.now().toString().slice(-6)}-${nextNum}`,
      price: variants[0]?.price || "299",
      stock: "100",
      desi: "2",
      vatRate: "20",
      images: [],
    };
    setVariants((prev) => [...prev, newV]);
  };

  const removeVariant = (id: string) => {
    if (variants.length <= 1) {
      toast({ title: "En az 1 varyant bulunmalıdır", variant: "destructive" });
      return;
    }
    setVariants((prev) => prev.filter((v) => v.id !== id));
  };

  const updateVariant = (id: string, field: keyof TableVariantRow, val: any) => {
    setVariants((prev) => prev.map((v) => (v.id === id ? { ...v, [field]: val } : v)));
  };

  // Resim Ekle
  const addImage = () => {
    if (!imageUrlInput.trim()) return;
    setMainImages((prev) => [...prev, imageUrlInput.trim()]);
    setImageUrlInput("");
  };

  const removeImage = (idx: number) => {
    setMainImages((prev) => prev.filter((_, i) => i !== idx));
  };

  // Hepsiburada SIT'e Gönder
  const handleSubmit = async () => {
    if (!title.trim()) {
      toast({ title: "Lütfen ürün başlığı girin", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    setSubmissionResult(null);

    const payload = {
      categoryId: selectedCategory?.categoryId || 26012174,
      categoryName: selectedCategory?.name || "Dekoratif Objeler",
      productName: title.trim(),
      description: description.trim() || `${title} - Kaliteli 3D Baskı Tasarım Ürünü`,
      brand: brand.trim() || "Ahenk Tasarım",
      images: mainImages,
      variants: variants.map((v) => ({
        merchantSku: v.merchantSku,
        barcode: v.barcode,
        price: parseFloat(v.price) || 299,
        availableStock: parseInt(v.stock) || 100,
        desi: parseInt(v.desi) || 2,
        vatRate: parseInt(v.vatRate) || 20,
        images: v.images.length > 0 ? v.images : mainImages,
        attributes: {
          Renk: v.color,
        },
      })),
    };

    try {
      const res = await submitProductToHepsiburada(payload);
      setSubmitting(false);

      if (res.success) {
        setSubmissionResult({
          success: true,
          trackingId: res.trackingId,
          message: res.message,
        });
        toast({
          title: "Hepsiburada Test Ortamına Aktarıldı! 🚀",
          description: `Tracking ID: ${res.trackingId}`,
        });
        onSuccess?.();
      } else {
        setSubmissionResult({
          success: false,
          message: res.error || res.message || "Bilinmeyen bir hata oluştu",
        });
        toast({
          title: "Gönderim Sırasında Uyarı",
          description: res.error || res.message,
          variant: "destructive",
        });
      }
    } catch (err: any) {
      setSubmitting(false);
      setSubmissionResult({
        success: false,
        message: err.message,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* ─── 1. SIT (TEST ORTAMI) BİLGİ & BAĞLANTI KARTI ─────────────────── */}
      <div className="bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-red-500/10 border-2 border-orange-500/40 rounded-2xl p-5 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-600 text-white flex items-center justify-center font-black text-sm shadow-md">
              HB
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-foreground">Hepsiburada SIT (Test Ortamı) Aktif</h3>
                <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40 text-[10px]">
                  Test Modu
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Girdiğiniz ürünler doğrudan Hepsiburada Test Portalı&apos;na aktarılır.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={checkConnection}
              disabled={connStatus.loading}
              className="h-8 text-xs font-semibold gap-1.5"
            >
              {connStatus.loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : connStatus.success ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <RotateCcw className="w-3.5 h-3.5" />
              )}
              {connStatus.loading ? "Kontrol Ediliyor..." : "Bağlantıyı Test Et"}
            </Button>

            <Button
              asChild
              variant="default"
              size="sm"
              className="h-8 text-xs font-bold gap-1.5 bg-orange-600 hover:bg-orange-700 text-white shadow-sm"
            >
              <a
                href="https://merchant-sit.hepsiburada.com/v2/login?returnUrl=%2Fv2"
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Merchant SIT Portalı Aç
              </a>
            </Button>
          </div>
        </div>

        {connStatus.tested && (
          <div
            className={`text-xs px-3 py-2 rounded-xl border flex items-center justify-between ${
              connStatus.success
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-200"
                : "bg-red-500/10 border-red-500/30 text-red-800 dark:text-red-200"
            }`}
          >
            <span>{connStatus.message}</span>
            <span className="text-[11px] opacity-80">Merchant ID: e1155e17-cc84...</span>
          </div>
        )}
      </div>

      {/* ─── 2. ADIM SEÇİCİ TAB'LAR ───────────────────────────────────────── */}
      <div className="flex items-center gap-2 p-1.5 bg-muted/40 rounded-xl border">
        {[
          { id: 1, label: "1. Temel Bilgiler & Kategori", icon: Store },
          { id: 2, label: "2. Renkler & Fiyat/Stok", icon: Palette },
          { id: 3, label: "3. Görseller & Gönderim", icon: Upload },
        ].map((st) => {
          const Icon = st.icon;
          const isActive = activeStep === st.id;
          return (
            <button
              key={st.id}
              onClick={() => setActiveStep(st.id as any)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-bold transition-all ${
                isActive
                  ? "bg-card text-foreground shadow-xs border border-border"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-orange-600" : ""}`} />
              <span>{st.label}</span>
            </button>
          );
        })}
      </div>

      {/* ─── ADIM 1: TEMEL BİLGİLER & KATEGORİ ─────────────────────────────── */}
      {activeStep === 1 && (
        <div className="bg-card border rounded-2xl p-6 space-y-5 shadow-sm animate-in fade-in-50 duration-150">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs font-bold">Ürün Başlığı (Hepsiburada)</Label>
              <Input
                placeholder="Örn: 3D Baskı Geometrik Vazo Dekoratif Masa Süsü"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-10 text-sm font-semibold"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Marka</Label>
              <Input
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="Ahenk Tasarım"
                className="h-9 text-xs font-semibold"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Kategori Arama (Hepsiburada Ağacı)</Label>
              <div className="relative">
                <Input
                  placeholder="Kategori ara (örn: Vazo, Dekoratif, Saat...)"
                  value={categorySearch}
                  onChange={(e) => handleSearchCategories(e.target.value)}
                  className="h-9 text-xs"
                />
                {searchingCategories && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin absolute right-3 top-2.5 text-muted-foreground" />
                )}
              </div>

              {selectedCategory && (
                <div className="mt-1 text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20 flex items-center justify-between">
                  <span>
                    Seçili Kategori: <strong>{selectedCategory.displayName || selectedCategory.name}</strong> (ID: {selectedCategory.categoryId})
                  </span>
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className="text-xs text-red-500 hover:underline"
                  >
                    Değiştir
                  </button>
                </div>
              )}

              {categories.length > 0 && !selectedCategory && (
                <div className="mt-1 max-h-40 overflow-y-auto border rounded-lg bg-popover text-popover-foreground text-xs divide-y shadow-md">
                  {categories.map((c) => (
                    <div
                      key={c.categoryId}
                      onClick={() => {
                        setSelectedCategory(c);
                        setCategories([]);
                      }}
                      className="p-2 hover:bg-muted/60 cursor-pointer flex flex-col"
                    >
                      <span className="font-bold">{c.displayName || c.name}</span>
                      {c.paths && (
                        <span className="text-[10px] text-muted-foreground">
                          {c.paths.join(" > ")}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs font-bold">Ürün Açıklaması</Label>
              <Textarea
                placeholder="Ürününüzün boyutları, özellikleri ve malzeme detayları..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="text-xs leading-relaxed"
              />
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t">
            <Button
              onClick={() => setActiveStep(2)}
              className="bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold gap-1.5"
            >
              Sonraki Adım: Renkler & Fiyat
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* ─── ADIM 2: VARYANTLAR & FİYAT / STOK ────────────────────────────── */}
      {activeStep === 2 && (
        <div className="bg-card border rounded-2xl p-6 space-y-5 shadow-sm animate-in fade-in-50 duration-150">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground">Renk & Stok Varyantları</h3>
              <p className="text-xs text-muted-foreground">
                Hepsiburada için her renk seçeneğine özel barkod ve SKU otomatik üretilir.
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={addVariant}
              className="h-8 text-xs font-bold gap-1 border-orange-500/40 text-orange-600 hover:bg-orange-50"
            >
              <Plus className="w-3.5 h-3.5" />
              Yeni Renk Ekle
            </Button>
          </div>

          <div className="space-y-3">
            {variants.map((v, i) => (
              <div
                key={v.id}
                className="p-4 rounded-xl border bg-muted/20 space-y-3 relative group"
              >
                <div className="flex items-center justify-between pb-2 border-b">
                  <span className="text-xs font-bold flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-orange-600 text-white text-[10px] flex items-center justify-center font-black">
                      {i + 1}
                    </span>
                    Varyant #{i + 1}
                  </span>

                  {variants.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeVariant(v.id)}
                      className="h-6 w-6 p-0 text-red-500 hover:bg-red-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
                  <div>
                    <Label className="text-[11px] font-semibold text-muted-foreground">Renk</Label>
                    <select
                      value={v.color}
                      onChange={(e) => updateVariant(v.id, "color", e.target.value)}
                      className="w-full h-8 text-xs font-semibold bg-background border rounded-lg px-2 mt-1"
                    >
                      {COMMON_COLORS.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label className="text-[11px] font-semibold text-muted-foreground">Satış Fiyatı (TL)</Label>
                    <Input
                      type="number"
                      value={v.price}
                      onChange={(e) => updateVariant(v.id, "price", e.target.value)}
                      className="h-8 text-xs font-bold mt-1"
                    />
                  </div>

                  <div>
                    <Label className="text-[11px] font-semibold text-muted-foreground">Stok Adedi</Label>
                    <Input
                      type="number"
                      value={v.stock}
                      onChange={(e) => updateVariant(v.id, "stock", e.target.value)}
                      className="h-8 text-xs mt-1"
                    />
                  </div>

                  <div>
                    <Label className="text-[11px] font-semibold text-muted-foreground">Desi</Label>
                    <Input
                      type="number"
                      value={v.desi}
                      onChange={(e) => updateVariant(v.id, "desi", e.target.value)}
                      className="h-8 text-xs mt-1"
                    />
                  </div>

                  <div>
                    <Label className="text-[11px] font-semibold text-muted-foreground">Barkod (EAN-13)</Label>
                    <Input
                      value={v.barcode}
                      onChange={(e) => updateVariant(v.id, "barcode", e.target.value)}
                      className="h-8 text-xs font-mono mt-1"
                    />
                  </div>

                  <div>
                    <Label className="text-[11px] font-semibold text-muted-foreground">Merchant SKU</Label>
                    <Input
                      value={v.merchantSku}
                      onChange={(e) => updateVariant(v.id, "merchantSku", e.target.value)}
                      className="h-8 text-xs font-mono mt-1"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-3 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveStep(1)}
              className="text-xs font-semibold gap-1.5"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Önceki Adım
            </Button>

            <Button
              onClick={() => setActiveStep(3)}
              className="bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold gap-1.5"
            >
              Sonraki Adım: Görseller & Gönder
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* ─── ADIM 3: GÖRSELLER & GÖNDERİM ─────────────────────────────────── */}
      {activeStep === 3 && (
        <div className="bg-card border rounded-2xl p-6 space-y-5 shadow-sm animate-in fade-in-50 duration-150">
          <div>
            <h3 className="text-sm font-bold text-foreground">Görseller ve Canlı Gönderim</h3>
            <p className="text-xs text-muted-foreground">
              Hepsiburada ürün resim URL&apos;lerini ekleyin ve doğrudan canlı mağazanıza aktarın.
            </p>
          </div>

          {/* Resim URL Ekleme */}
          <div className="flex gap-2">
            <Input
              placeholder="https://i.ibb.co/... veya resim URL'si girin"
              value={imageUrlInput}
              onChange={(e) => setImageUrlInput(e.target.value)}
              className="h-9 text-xs"
              onKeyDown={(e) => e.key === "Enter" && addImage()}
            />
            <Button
              type="button"
              onClick={addImage}
              className="h-9 text-xs font-bold gap-1 shrink-0 bg-muted hover:bg-muted/80 text-foreground"
            >
              <Plus className="w-3.5 h-3.5" />
              Resim Ekle
            </Button>
          </div>

          {/* Eklenen Resimler */}
          {mainImages.length > 0 && (
            <div className="flex flex-wrap gap-3 pt-2">
              {mainImages.map((url, i) => (
                <div
                  key={i}
                  className="relative w-24 h-24 rounded-xl border overflow-hidden bg-muted/40 group shadow-xs"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`Ürün ${i + 1}`} className="w-full h-full object-cover" />
                  <button
                    onClick={() => removeImage(i)}
                    className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Gönderim Sonuç Bildirimi */}
          {submissionResult && (
            <div
              className={`p-4 rounded-xl border text-xs space-y-2 ${
                submissionResult.success
                  ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-800 dark:text-emerald-200"
                  : "bg-red-500/10 border-red-500/40 text-red-800 dark:text-red-200"
              }`}
            >
              <div className="font-bold flex items-center gap-2 text-sm">
                {submissionResult.success ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Hepsiburada Canlı Kataloğuna Başarıyla Gönderildi!
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    Gönderim Hatası
                  </>
                )}
              </div>
              <p>{submissionResult.message}</p>
              {submissionResult.trackingId && (
                <div className="pt-2 border-t border-emerald-500/20 flex items-center justify-between">
                  <span className="font-mono text-xs">Tracking ID: {submissionResult.trackingId}</span>
                  <a
                    href="https://merchant-sit.hepsiburada.com/v2/login?returnUrl=%2Fv2"
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-bold underline flex items-center gap-1 text-emerald-700 dark:text-emerald-300"
                  >
                    Portalda İncele <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between pt-3 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveStep(2)}
              className="text-xs font-semibold gap-1.5"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Önceki Adım
            </Button>

            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold gap-2 px-6 h-10 shadow-md"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Hepsiburada SIT&apos;e Aktarılıyor...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  Hepsiburada Test Ortamına Gönder
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
