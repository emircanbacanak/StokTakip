"use client";

import { useState, useEffect } from "react";
import {
  PackagePlus,
  Layers,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Upload,
  Plus,
  Trash2,
  Check,
  AlertCircle,
  Loader2,
  Image as ImageIcon,
  DollarSign,
  Truck,
  RefreshCw,
  Search,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { generateEan13Barcode, generateSmartModelCode } from "@/lib/product-code-generator";
import { naturalSort } from "@/lib/utils";

interface VariantRow {
  id: string;
  color: string;
  barcode: string;
  stockCode: string;
  stock: number;
  listPrice: number;
  salePrice: number;
}

export function PazaramaProductCreateFlow({
  onSuccess,
}: {
  onSuccess?: () => void;
}) {
  const { toast } = useToast();
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // 1. Temel Bilgiler
  const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [description, setDescription] = useState("");
  const [groupCode, setGroupCode] = useState(() => generateSmartModelCode("PZR"));
  const [code, setCode] = useState(() => generateEan13Barcode());
  const [stockCode, setStockCode] = useState("");

  // Kategori & Marka
  const [categories, setCategories] = useState<any[]>([]);
  const [categorySearch, setCategorySearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [loadingCategories, setLoadingCategories] = useState(false);

  const [brands, setBrands] = useState<{ id: string; name: string }[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState("");

  // 2. Özellikler & Görseller
  const [categoryAttributes, setCategoryAttributes] = useState<any[]>([]);
  const [loadingAttributes, setLoadingAttributes] = useState(false);
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>({});

  const [images, setImages] = useState<string[]>([
    "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800",
  ]);
  const [newImageUrl, setNewImageUrl] = useState("");

  // 3. Fiyat, Stok, KDV & Desi
  const [listPrice, setListPrice] = useState<number>(299.9);
  const [salePrice, setSalePrice] = useState<number>(249.9);
  const [stockCount, setStockCount] = useState<number>(50);
  const [vatRate, setVatRate] = useState<number>(20);
  const [desi, setDesi] = useState<number>(1);

  // Çoklu Varyant Desteği
  const [hasVariants, setHasVariants] = useState(false);
  const [variants, setVariants] = useState<VariantRow[]>([]);

  // Kategorileri ve Markaları Yükle
  useEffect(() => {
    setLoadingCategories(true);
    fetch("/api/pazarama/meta?type=categories")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.categories) {
          // Leaf kategorileri düzleştir
          const flatList: any[] = [];
          const traverse = (node: any) => {
            if (node.leaf) flatList.push(node);
            if (node.subCategories && node.subCategories.length > 0) {
              node.subCategories.forEach(traverse);
            }
          };
          data.categories.forEach(traverse);
          setCategories(flatList);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingCategories(false));

    fetch("/api/pazarama/meta?type=brands&size=200")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.brands) {
          setBrands(data.brands);
          if (data.brands.length > 0) {
            setSelectedBrandId(data.brands[0].id);
          }
        }
      })
      .catch(() => {});
  }, []);

  // Kategori seçildiğinde özellikleri yükle
  useEffect(() => {
    if (!selectedCategory?.id) return;
    setLoadingAttributes(true);
    fetch(`/api/pazarama/meta?type=attributes&categoryId=${selectedCategory.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.attributes) {
          const sortedAttrs = [...data.attributes]
            .sort((a: any, b: any) => {
              if (a.isRequired && !b.isRequired) return -1;
              if (!a.isRequired && b.isRequired) return 1;
              return (a.displayName || a.name || "").localeCompare(b.displayName || b.name || "", "tr");
            })
            .map((attr: any) => ({
              ...attr,
              attributeValues: naturalSort(attr.attributeValues || [], (v: any) => v.value || v.name),
            }));
          setCategoryAttributes(sortedAttrs);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingAttributes(false));
  }, [selectedCategory]);

  // Görsel Ekle
  const handleAddImageUrl = () => {
    if (!newImageUrl.trim()) return;
    if (images.length >= 10) {
      toast({ title: "Görsel Limiti", description: "En fazla 10 görsel ekleyebilirsiniz.", variant: "destructive" });
      return;
    }
    setImages([...images, newImageUrl.trim()]);
    setNewImageUrl("");
  };

  const handleRemoveImage = (index: number) => {
    if (images.length <= 1) {
      toast({ title: "Uyarı", description: "En az 1 adet görsel zorunludur.", variant: "destructive" });
      return;
    }
    setImages(images.filter((_, i) => i !== index));
  };

  // ImgBB Dosya Yükleme
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const apiKey = process.env.NEXT_PUBLIC_IMGBB_API_KEY || "";
    const formData = new FormData();
    formData.append("image", file);

    setUploadingImage(true);
    try {
      const res = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success && data.data?.url) {
        setImages((prev) => [...prev, data.data.url]);
        toast({ title: "Görsel Yüklendi", description: "Fotoğraf ImgBB'ye yüklendi ve eklendi." });
      }
    } catch (err: any) {
      toast({ title: "Yükleme Hatası", description: err.message, variant: "destructive" });
    } finally {
      setUploadingImage(false);
    }
  };

  // Varyant Ekle
  const handleAddVariant = () => {
    const newVariant: VariantRow = {
      id: Math.random().toString(),
      color: "Farklı Renk / Boyut",
      barcode: generateEan13Barcode(),
      stockCode: `${stockCode || groupCode}-${variants.length + 2}`,
      stock: stockCount,
      listPrice,
      salePrice,
    };
    setVariants([...variants, newVariant]);
  };

  // Gönderim
  const handleSubmit = async () => {
    if (!name.trim()) {
      toast({ title: "Eksik Alan", description: "Lütfen ürün adını girin.", variant: "destructive" });
      setActiveStep(1);
      return;
    }
    if (!selectedCategory) {
      toast({ title: "Eksik Kategori", description: "Lütfen bir kategori seçin.", variant: "destructive" });
      setActiveStep(1);
      return;
    }
    if (images.length === 0) {
      toast({ title: "Eksik Görsel", description: "En az bir görsel eklemelisiniz.", variant: "destructive" });
      setActiveStep(2);
      return;
    }
    if (salePrice <= 0 || listPrice <= 0) {
      toast({ title: "Geçersiz Fiyat", description: "Fiyat 0'dan büyük olmalıdır.", variant: "destructive" });
      setActiveStep(3);
      return;
    }

    setSubmitting(true);
    try {
      const attributesPayload = Object.entries(selectedAttributes)
        .filter(([_, val]) => !!val)
        .map(([attrId, valId]) => ({
          attributeId: attrId,
          attributeValueId: valId,
        }));

      // Tekil veya çoklu varyant listesi
      const productsPayload = [];

      // Ana Ürün
      productsPayload.push({
        Name: name,
        DisplayName: displayName || name,
        Description: description || name,
        brandId: selectedBrandId || "0a097abf-3c2e-42c9-fd40-08dbf9534e72",
        groupCode: groupCode || code,
        Code: code,
        stockCode: stockCode || code,
        StockCount: Number(stockCount),
        VatRate: Number(vatRate),
        ListPrice: Number(listPrice),
        SalePrice: Number(salePrice),
        currencyType: "TRY",
        CategoryId: selectedCategory.id,
        Desi: Number(desi),
        images: images.map((url) => ({ imageurl: url })),
        attributes: attributesPayload,
      });

      // Eğer ek varyantlar varsa
      if (hasVariants) {
        variants.forEach((v) => {
          productsPayload.push({
            Name: `${name} (${v.color})`,
            DisplayName: `${displayName || name} - ${v.color}`,
            Description: description || name,
            brandId: selectedBrandId || "0a097abf-3c2e-42c9-fd40-08dbf9534e72",
            groupCode: groupCode || code,
            Code: v.barcode,
            stockCode: v.stockCode,
            StockCount: Number(v.stock),
            VatRate: Number(vatRate),
            ListPrice: Number(v.listPrice),
            SalePrice: Number(v.salePrice),
            currencyType: "TRY",
            CategoryId: selectedCategory.id,
            Desi: Number(desi),
            images: images.map((url) => ({ imageurl: url })),
            attributes: attributesPayload,
          });
        });
      }

      const res = await fetch("/api/pazarama/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ products: productsPayload }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Pazarama ürün yükleme hatası");
      }

      toast({
        title: "Ürün Başarıyla Yüklendi!",
        description: data.message || "Pazarama onay sürecine iletildi.",
      });

      if (onSuccess) onSuccess();
    } catch (err: any) {
      toast({
        title: "Yükleme Başarısız",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredCategories = categories
    .filter((c) => {
      const full = (c.parentCategories?.join(" > ") + " > " + c.name).toLowerCase();
      return full.includes(categorySearch.toLowerCase().trim());
    })
    .slice(0, 50);

  return (
    <div className="bg-card border border-border rounded-2xl p-6 shadow-xs space-y-6 max-w-4xl mx-auto">
      {/* BAŞLIK & İLERLEME ÇUBUĞU */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center font-black">
            PZ
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">Pazarama&apos;ya Yeni Ürün Yükle</h2>
            <p className="text-xs text-muted-foreground">Kategori, nitelikler, fiyat ve görselleri tanımlayın.</p>
          </div>
        </div>

        {/* Adım Göstergesi */}
        <div className="flex items-center gap-2">
          {[1, 2, 3].map((step) => (
            <div
              key={step}
              onClick={() => setActiveStep(step as any)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                activeStep === step
                  ? "bg-blue-600 text-white shadow-xs"
                  : activeStep > step
                  ? "bg-blue-500/10 text-blue-600"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              <span>{step}</span>
              <span className="hidden sm:inline">
                {step === 1 ? "Bilgiler" : step === 2 ? "Özellikler & Görsel" : "Fiyat & Stok"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ADIM 1: TEMEL BİLGİLER & KATEGORİ */}
      {activeStep === 1 && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Ürün Adı *</label>
            <Input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!displayName) setDisplayName(e.target.value);
              }}
              placeholder="Örn: 3D Geometrik Ahşap Duvar Tablosu"
              className="text-sm font-medium"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Görünen Ad (DisplayName)</label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Müşteriye görünecek isim"
              className="text-sm"
            />
          </div>

          {/* Kategori Seçimi */}
          <div className="space-y-2 pt-2 border-t border-border/60">
            <label className="text-xs font-bold text-foreground flex items-center justify-between">
              <span>Pazarama Kategorisi *</span>
              {selectedCategory && (
                <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Seçildi: {selectedCategory.name}
                </span>
              )}
            </label>

            <div className="relative">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
              <Input
                value={categorySearch}
                onChange={(e) => setCategorySearch(e.target.value)}
                placeholder="Kategori adı ile ara (örn: Tablo, Saat, Aksesuar)..."
                className="pl-9 text-xs"
              />
            </div>

            <div className="max-h-48 overflow-y-auto border border-border rounded-xl p-2 bg-muted/20 space-y-1">
              {loadingCategories ? (
                <div className="py-6 text-center text-xs text-muted-foreground">Kategoriler yükleniyor...</div>
              ) : filteredCategories.length === 0 ? (
                <div className="py-6 text-center text-xs text-muted-foreground">Aramanıza uygun kategori bulunamadı.</div>
              ) : (
                filteredCategories.map((cat) => (
                  <div
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat)}
                    className={`p-2 rounded-lg text-xs cursor-pointer transition-all flex items-center justify-between ${
                      selectedCategory?.id === cat.id
                        ? "bg-blue-600 text-white font-bold"
                        : "hover:bg-muted text-foreground"
                    }`}
                  >
                    <span>
                      {cat.parentCategories?.join(" > ")} &gt; <strong>{cat.name}</strong>
                    </span>
                    {selectedCategory?.id === cat.id && <Check className="w-3.5 h-3.5" />}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Marka & Kodlar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground">Marka</label>
              <select
                value={selectedBrandId}
                onChange={(e) => setSelectedBrandId(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {brands.slice(0, 100).map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground">Model Kodu (groupCode) *</label>
              <Input
                value={groupCode}
                onChange={(e) => setGroupCode(e.target.value)}
                className="text-xs font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground">Barkod (Code) *</label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="text-xs font-mono"
              />
            </div>
          </div>

          <div className="space-y-1.5 pt-2">
            <label className="text-xs font-bold text-foreground">Açıklama (Description) *</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Ürününüzün tüm detaylarını, malzemesini, kullanım alanlarını açıklayın..."
              className="w-full rounded-xl border border-input bg-background p-3 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring leading-relaxed"
            />
          </div>

          <div className="flex justify-end pt-4 border-t border-border">
            <Button
              type="button"
              onClick={() => setActiveStep(2)}
              className="bg-blue-600 hover:bg-blue-700 text-white gap-2 font-bold"
            >
              Sonraki Adım (Özellikler & Görsel)
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ADIM 2: KATEGORİ ÖZELLİKLERİ & GÖRSELLER */}
      {activeStep === 2 && (
        <div className="space-y-5">
          {/* Görsel Yönetimi */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-foreground">Ürün Görselleri (En az 1 adet) *</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                placeholder="https://... görsel URL'si yapıştırın"
                className="text-xs"
              />
              <Button
                type="button"
                onClick={handleAddImageUrl}
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                URL Ekle
              </Button>
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={uploadingImage}
                />
                <Button
                  type="button"
                  asChild
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs bg-blue-500/10 border-blue-500/30 text-blue-600 hover:bg-blue-500/20 shrink-0"
                >
                  <span>
                    {uploadingImage ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                    Cihazdan Yükle (ImgBB)
                  </span>
                </Button>
              </label>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3 pt-2">
              {images.map((img, idx) => (
                <div
                  key={idx}
                  className="relative group rounded-xl overflow-hidden border border-border aspect-square bg-muted/20 flex items-center justify-center shadow-xs"
                >
                  <img src={img} alt="" className="w-full h-full object-contain p-1.5" />
                  <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/70 text-white text-[9px] font-bold">
                    {idx === 0 ? "Kapak" : `${idx + 1}`}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(idx)}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Kategori Özellikleri */}
          <div className="space-y-3 pt-4 border-t border-border">
            <label className="text-xs font-bold text-foreground">
              Kategori Özellikleri ({selectedCategory?.name || "Kategori"})
            </label>

            {loadingAttributes ? (
              <div className="py-6 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                Özellikler yükleniyor...
              </div>
            ) : categoryAttributes.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {categoryAttributes.map((attr) => (
                  <div key={attr.id} className="space-y-1">
                    <label className="text-[11px] font-bold text-foreground flex items-center gap-1">
                      {attr.displayName || attr.name}
                      {attr.isRequired && <span className="text-red-500 font-bold">*</span>}
                    </label>
                    <select
                      value={selectedAttributes[attr.id] || ""}
                      onChange={(e) =>
                        setSelectedAttributes((prev) => ({ ...prev, [attr.id]: e.target.value }))
                      }
                      className="w-full h-8 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <option value="">Seçiniz...</option>
                      {naturalSort(attr.attributeValues || [], (val: any) => val.value || val.name).map((val: any) => (
                        <option key={val.id} value={val.id}>
                          {val.value}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Bu kategori için özel nitelik bulunmamaktadır.</p>
            )}
          </div>

          <div className="flex justify-between pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={() => setActiveStep(1)}>
              <ChevronLeft className="w-4 h-4 mr-1" />
              Geri
            </Button>
            <Button
              type="button"
              onClick={() => setActiveStep(3)}
              className="bg-blue-600 hover:bg-blue-700 text-white gap-2 font-bold"
            >
              Sonraki Adım (Fiyat & Stok)
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ADIM 3: FİYAT, STOK & GÖNDERİM */}
      {activeStep === 3 && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Liste Fiyatı (TL) *</label>
              <Input
                type="number"
                step="0.01"
                value={listPrice}
                onChange={(e) => setListPrice(parseFloat(e.target.value) || 0)}
                className="text-sm font-semibold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-emerald-600">Satış Fiyatı (TL) *</label>
              <Input
                type="number"
                step="0.01"
                value={salePrice}
                onChange={(e) => setSalePrice(parseFloat(e.target.value) || 0)}
                className="text-sm font-bold text-emerald-600"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Stok Adedi *</label>
              <Input
                type="number"
                value={stockCount}
                onChange={(e) => setStockCount(parseInt(e.target.value, 10) || 0)}
                className="text-sm font-semibold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">KDV Oranı (%)</label>
              <select
                value={vatRate}
                onChange={(e) => setVatRate(parseInt(e.target.value, 10))}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value={20}>%20</option>
                <option value={10}>%10</option>
                <option value={1}>%1</option>
                <option value={0}>%0</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Desi</label>
              <Input
                type="number"
                step="0.5"
                value={desi}
                onChange={(e) => setDesi(parseFloat(e.target.value) || 1)}
                className="text-sm font-semibold"
              />
            </div>
          </div>

          {/* VARYANT EKLEME SEÇENEĞİ */}
          <div className="space-y-3 pt-4 border-t border-border">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-foreground">Varyantlı Ürünler (Aynı Model Kodu)</h4>
                <p className="text-[11px] text-muted-foreground">
                  Farklı renk veya ölçü varyantları için ekstra barkod satırları ekleyin.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setHasVariants(true);
                  handleAddVariant();
                }}
                className="gap-1 text-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                Varyant Ekle
              </Button>
            </div>

            {hasVariants && variants.length > 0 && (
              <div className="space-y-2 border border-border rounded-xl p-3 bg-muted/20">
                {variants.map((v, i) => (
                  <div key={v.id} className="grid grid-cols-2 sm:grid-cols-5 gap-2 items-end">
                    <div>
                      <label className="text-[10px] text-muted-foreground font-semibold">Varyant Adı</label>
                      <Input
                        value={v.color}
                        onChange={(e) => {
                          const next = [...variants];
                          next[i].color = e.target.value;
                          setVariants(next);
                        }}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground font-semibold">Barkod</label>
                      <Input
                        value={v.barcode}
                        onChange={(e) => {
                          const next = [...variants];
                          next[i].barcode = e.target.value;
                          setVariants(next);
                        }}
                        className="h-8 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground font-semibold">Stok Kodu</label>
                      <Input
                        value={v.stockCode}
                        onChange={(e) => {
                          const next = [...variants];
                          next[i].stockCode = e.target.value;
                          setVariants(next);
                        }}
                        className="h-8 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground font-semibold">Stok</label>
                      <Input
                        type="number"
                        value={v.stock}
                        onChange={(e) => {
                          const next = [...variants];
                          next[i].stock = parseInt(e.target.value, 10) || 0;
                          setVariants(next);
                        }}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setVariants(variants.filter((_, idx) => idx !== i))}
                        className="h-8 px-2 text-rose-600 hover:text-rose-700"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-between pt-6 border-t border-border">
            <Button type="button" variant="outline" onClick={() => setActiveStep(2)}>
              <ChevronLeft className="w-4 h-4 mr-1" />
              Geri
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-blue-600 hover:bg-blue-700 text-white gap-2 font-bold px-6 shadow-md shadow-blue-600/20"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Pazarama&apos;ya Gönderiliyor...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Ürünü Pazarama&apos;da Yayınla
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
