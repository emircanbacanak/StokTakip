"use client";

import { useState, useEffect, useRef } from "react";
import {
  X,
  Save,
  Trash2,
  Plus,
  Image as ImageIcon,
  DollarSign,
  Package,
  Truck,
  Layers,
  Sparkles,
  Upload,
  RefreshCw,
  Check,
  ChevronDown,
  Info,
  Wand2,
  Eye,
  Code,
  FileText,
  Bold,
  Italic,
  List,
  ListOrdered,
  Undo,
  Redo,
  Eraser,
  Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import type { PazaramaListing } from "@/lib/pazarama-api";
import { naturalSort } from "@/lib/utils";

interface Props {
  listing: PazaramaListing;
  onClose: () => void;
  onSaved: () => void;
}

interface AttributeValueSelection {
  attributeId: string;
  attributeValueId: string;
  attributeName?: string;
  attributeValue?: string;
}

export function PazaramaProductEditModal({ listing, onClose, onSaved }: Props) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Sekmeler
  const [activeTab, setActiveTab] = useState<"general" | "pricing" | "images" | "attributes">("general");

  // Form State
  const [name, setName] = useState(listing.name || "");
  const [displayName, setDisplayName] = useState(listing.displayName || listing.name || "");
  const [description, setDescription] = useState(listing.description || "");
  const [descViewMode, setDescViewMode] = useState<"visual" | "html">("visual");
  const [groupCode, setGroupCode] = useState(listing.groupCode || "");
  const [code, setCode] = useState(listing.code || "");
  const [stockCode, setStockCode] = useState(listing.stockCode || listing.code || "");
  const [brandId, setBrandId] = useState(listing.brandId || "");
  const [brandName, setBrandName] = useState(listing.brandName || "");
  const [categoryId, setCategoryId] = useState(listing.categoryId || "");
  const [categoryName, setCategoryName] = useState(listing.categoryName || "");

  // Fiyat & Stok
  const [listPrice, setListPrice] = useState<number>(listing.listPrice || 0);
  const [salePrice, setSalePrice] = useState<number>(listing.salePrice || 0);
  const [stockCount, setStockCount] = useState<number>(listing.stockCount ?? 0);
  const [vatRate, setVatRate] = useState<number>(listing.vatRate ?? 20);
  const [desi, setDesi] = useState<number>(listing.desi ?? 1);

  // Görseller
  const [images, setImages] = useState<string[]>(
    listing.images && listing.images.length > 0
      ? listing.images
      : []
  );
  const [newImageUrl, setNewImageUrl] = useState("");

  // Kategori Nitelikleri
  const [attributes, setAttributes] = useState<AttributeValueSelection[]>(
    (listing.attributes || []).map((a) => ({
      attributeId: a.attributeId,
      attributeValueId: a.attributeValueId,
      attributeName: a.attributeName,
      attributeValue: a.attributeValue,
    }))
  );
  const [categoryAttributesList, setCategoryAttributesList] = useState<any[]>([]);
  const [loadingAttributes, setLoadingAttributes] = useState(false);

  // Markalar Listesi
  const [brandsList, setBrandsList] = useState<{ id: string; name: string }[]>([]);
  const [brandSearch, setBrandSearch] = useState("");

  // Açıklama Yardımcıları
  const [fetchingTrendyolDesc, setFetchingTrendyolDesc] = useState(false);
  const [generatingAiDesc, setGeneratingAiDesc] = useState(false);

  // 🌟 TOPLU MODEL KODU GÜNCELLEME TOGGLE'I
  const [syncAllVariants, setSyncAllVariants] = useState(true);

  // İnteraktif Zengin Metin Düzenleyici Ref
  const contentEditableRef = useRef<HTMLDivElement>(null);

  // Açıklama değiştiğinde contentEditable alanını güncelle (Kullanıcı yazarken ters çevirmemesi için odak kontrolü)
  useEffect(() => {
    if (contentEditableRef.current && descViewMode === "visual") {
      if (document.activeElement !== contentEditableRef.current) {
        if (contentEditableRef.current.innerHTML !== description) {
          contentEditableRef.current.innerHTML = description || "";
        }
      }
    }
  }, [description, descViewMode]);

  const execFormat = (cmd: string, val: string | undefined = undefined) => {
    document.execCommand(cmd, false, val);
    if (contentEditableRef.current) {
      setDescription(contentEditableRef.current.innerHTML);
    }
  };

  // Açıklama boşsa Trendyol'dan otomatik çek
  useEffect(() => {
    const bc = listing.code || listing.stockCode;
    if (!description && bc) {
      fetch(`/api/trendyol/products?barcode=${encodeURIComponent(bc)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data?.product?.description) {
            setDescription(data.product.description);
            if (contentEditableRef.current) {
              contentEditableRef.current.innerHTML = data.product.description;
            }
          }
        })
        .catch(() => {});
    }
  }, [listing.code, listing.stockCode, description]);

  // Kategori niteliklerini ve markaları yükle
  useEffect(() => {
    // Markalar
    fetch("/api/pazarama/meta?type=brands&size=200")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.brands) {
          const sortedBrands = naturalSort(data.brands, (b: any) => b.name || "");
          setBrandsList(sortedBrands);
          if (!brandId && sortedBrands.length > 0) {
            // Varsayılan marka eşleştirme
            const found = sortedBrands.find(
              (b: any) => (b.name || "").toLowerCase() === (listing.brandName || "").toLowerCase()
            );
            if (found) {
              setBrandId(found.id);
              setBrandName(found.name);
            }
          }
        }
      })
      .catch(() => {});

    // Kategori Nitelikleri
    if (categoryId) {
      setLoadingAttributes(true);
      fetch(`/api/pazarama/meta?type=attributes&categoryId=${categoryId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.attributes) {
            // Zorunlu alanlar önce, ardından alfabetik ve her özelliğin değerleri doğal sıralı
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
            setCategoryAttributesList(sortedAttrs);
          }
        })
        .catch(() => {})
        .finally(() => setLoadingAttributes(false));
    }
  }, [categoryId, listing.brandName, brandId]);

  // Görsel URL Ekle
  const handleAddImageUrl = () => {
    if (!newImageUrl.trim()) return;
    if (images.length >= 10) {
      toast({ title: "Görsel Limiti", description: "En fazla 10 görsel ekleyebilirsiniz.", variant: "destructive" });
      return;
    }
    setImages([...images, newImageUrl.trim()]);
    setNewImageUrl("");
    toast({ title: "Görsel Eklendi", description: "Görsel listeye eklendi." });
  };

  // Görsel Sil
  const handleRemoveImage = (index: number) => {
    if (images.length <= 1) {
      toast({ title: "Uyarı", description: "Pazarama için en az 1 görsel zorunludur.", variant: "destructive" });
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
      } else {
        throw new Error(data.error?.message || "Yükleme başarısız");
      }
    } catch (err: any) {
      toast({ title: "Yükleme Hatası", description: err.message, variant: "destructive" });
    } finally {
      setUploadingImage(false);
    }
  };

  // Nitelik Seçimi Güncelle
  const handleAttributeChange = (attrId: string, valId: string) => {
    const existingIndex = attributes.findIndex((a) => a.attributeId === attrId);
    if (existingIndex > -1) {
      const next = [...attributes];
      next[existingIndex] = { attributeId: attrId, attributeValueId: valId };
      setAttributes(next);
    } else {
      setAttributes([...attributes, { attributeId: attrId, attributeValueId: valId }]);
    }
  };

  // Trendyol'dan Canlı Açıklama Çek
  const handleFetchTrendyolDescription = async () => {
    const bc = code || stockCode || listing.code || listing.stockCode;
    if (!bc) {
      toast({
        title: "Barkod Eksik",
        description: "Trendyol araması için geçerli bir barkod gereklidir.",
        variant: "destructive",
      });
      return;
    }

    setFetchingTrendyolDesc(true);
    toast({
      title: "Trendyol'dan Çekiliyor...",
      description: "Orijinal ürün açıklaması yükleniyor.",
    });

    try {
      const res = await fetch(`/api/trendyol/products?barcode=${encodeURIComponent(bc)}`);
      const data = await res.json();
      if (data?.product?.description) {
        setDescription(data.product.description);
        toast({
          title: "Açıklama Başarıyla Çekildi",
          description: "Trendyol'daki zengin ürün açıklaması forma dolduruldu.",
        });
      } else {
        toast({
          title: "Açıklama Bulunamadı",
          description: "Trendyol kataloğunda bu barkoda ait açıklama bulunamadı.",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({
        title: "Hata",
        description: err.message || "Trendyol açıklaması alınırken hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setFetchingTrendyolDesc(false);
    }
  };

  // Gemini AI Açıklama Üretici
  const handleGenerateAiDescription = async () => {
    setGeneratingAiDesc(true);
    toast({
      title: "🤖 Yapay Zeka Hazırlıyor...",
      description: "Ürün bilgileri analiz edilerek SEO uyumlu zengin açıklama yazılıyor.",
    });

    try {
      const geminiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";
      const promptText = `Sen profesyonel bir e-ticaret ve Pazarama uzmanısın. Aşağıdaki ürün için zengin HTML formatında, göz alıcı, maddeli ve başlıklar içeren profesyonel bir ürün açıklaması yaz:
      Ürün Adı: ${name || listing.name}
      Kategori: ${categoryName || listing.categoryName}
      Marka: ${brandName || listing.brandName || "Ahenk Tasarım"}
      Özellikler: 3D yazıcı teknolojisiyle özel katmanlı üretim, dayanıklı ve kaliteli malzeme, dekoratif modern tasarım.
      
      Yalnızca temiz HTML formatında (<p>, <b>, <ul>, <li>, <br> vb.) yanıt döndür. Dış div sarmalayıcısı ve Markdown backtick (\`\`\`) kullanma.`;

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: promptText }] }],
          }),
        }
      );

      const data = await res.json();
      const generated = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (generated) {
        const cleaned = generated.replace(/```html|```/g, "").trim();
        setDescription(cleaned);
        toast({ title: "✅ Yapay Zeka Açıklaması Hazırlandı!" });
      } else {
        throw new Error("Yapay zeka yanıt veremedi");
      }
    } catch {
      // Fallback zengin şablon
      const fallbackDesc = `<p><b>${name || listing.name}</b> ile yaşam alanlarınıza şıklık ve zarafet katın!</p>\n\n<p><b>Öne Çıkan Özellikler:</b></p>\n<ul>\n  <li>3D üretim teknolojisi ile yüksek hassasiyette ve dayanıklı malzemeden üretilmiştir.</li>\n  <li>Modern, estetik ve dekoratif tasarımıyla ev, ofis ve salon dekorasyonuna kusursuz uyum sağlar.</li>\n  <li>Özel yüzey dokusu ve zarif hatlarıyla mekanlarınıza sıcak bir atmosfer katar.</li>\n</ul>\n\n<p><b>Kullanım ve Bakım:</b></p>\n<p>Nemli ve yumuşak bir bezle kolayca temizlenebilir. Doğrudan yüksek ısı kaynaklarına maruz bırakılmaması tavsiye edilir.</p>`;
      setDescription(fallbackDesc);
      toast({
        title: "Açıklama Oluşturuldu",
        description: "Standart zengin açıklama şablonu uygulandı.",
      });
    } finally {
      setGeneratingAiDesc(false);
    }
  };

  // Açıklamayı Panoya Kopyala
  const handleCopyDescription = () => {
    if (!description) {
      toast({ title: "Açıklama Boş", description: "Kopyalanacak açıklama bulunamadı.", variant: "destructive" });
      return;
    }
    navigator.clipboard.writeText(description);
    toast({
      title: "📋 Açıklama Panoya Kopyalandı",
      description: "Pazarama satıcı paneline doğrudan yapıştırabilirsiniz.",
    });
  };

  // Kaydet
  const handleSave = async () => {
    if (!name.trim()) {
      toast({ title: "Eksik Alan", description: "Ürün adı zorunludur.", variant: "destructive" });
      return;
    }
    if (!code.trim()) {
      toast({ title: "Eksik Alan", description: "Barkod zorunludur.", variant: "destructive" });
      return;
    }
    if (salePrice <= 0 || listPrice <= 0) {
      toast({ title: "Eksik Alan", description: "Fiyat 0'dan büyük olmalıdır.", variant: "destructive" });
      return;
    }
    if (images.length === 0) {
      toast({ title: "Eksik Alan", description: "En az 1 adet görsel zorunludur.", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      // 🌟 DEĞİŞTİRİLEN ALANLARI TESPİT ET
      const changedFields: string[] = [];
      if (name.trim() !== (listing.name || "").trim()) changedFields.push("Name");
      if (displayName.trim() !== (listing.displayName || listing.name || "").trim()) changedFields.push("DisplayName");
      if (description.trim() !== (listing.description || "").trim() || description.trim().length > 0) changedFields.push("Description");
      if (brandId && brandId !== listing.brandId) changedFields.push("brandId");
      if (categoryId && categoryId !== listing.categoryId) changedFields.push("CategoryId");
      if (Number(listPrice) !== Number(listing.listPrice)) changedFields.push("ListPrice");
      if (Number(salePrice) !== Number(listing.salePrice)) changedFields.push("SalePrice");
      if (Number(stockCount) !== Number(listing.stockCount)) changedFields.push("StockCount");
      if (Number(vatRate) !== Number(listing.vatRate)) changedFields.push("VatRate");
      if (Number(desi) !== Number(listing.desi)) changedFields.push("Desi");
      if (JSON.stringify(images) !== JSON.stringify(listing.images || [])) changedFields.push("images");
      if (JSON.stringify(attributes) !== JSON.stringify(listing.attributes || [])) changedFields.push("attributes");

      const productPayload = {
        Name: name,
        DisplayName: displayName || name,
        Description: description || name,
        brandId: brandId || "0a097abf-3c2e-42c9-fd40-08dbf9534e72",
        groupCode: groupCode || listing.groupCode || code,
        Code: code,
        stockCode: stockCode || code,
        StockCount: Number(stockCount),
        VatRate: Number(vatRate),
        ListPrice: Number(listPrice),
        SalePrice: Number(salePrice),
        currencyType: "TRY",
        CategoryId: categoryId || "9a0415a7-3048-4085-afb8-ada7b6871092",
        Desi: Number(desi || 1),
        images: images.map((url) => ({ imageurl: url })),
        attributes: attributes.map((a) => ({
          attributeId: a.attributeId,
          attributeValueId: a.attributeValueId,
        })),
      };

      const res = await fetch("/api/pazarama/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product: productPayload,
          syncAllVariants,
          groupCode: groupCode || listing.groupCode || listing.modelTitle,
          changedFields,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Pazarama güncelleme hatası");
      }

      toast({
        title: "Pazarama Güncellendi",
        description: data.message || "Ürün başarıyla güncellendi.",
      });

      onSaved();
      onClose();
    } catch (err: any) {
      toast({
        title: "Güncelleme Başarısız",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-card border border-border w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col">
        {/* MODAL HEADER */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/20 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center shrink-0">
              <span className="font-black text-xs">PZ</span>
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-foreground truncate">
                {name || "Pazarama Ürün Düzenleme"}
              </h2>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                <span>Barkod: <strong className="text-foreground font-mono">{code}</strong></span>
                <span>•</span>
                <span>Model Kodu: <strong className="text-blue-600 font-mono">{groupCode || "-"}</strong></span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 🌟 TOPLU VARYANT GÜNCELLEME BANNERI */}
        <div className="px-6 py-2.5 bg-blue-500/10 border-b border-blue-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 text-xs text-blue-900 dark:text-blue-200">
            <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              <strong>Akıllı Varyant Eşitleme:</strong> Sadece değiştirdiğiniz alanlar (örneğin yalnızca açıklama) diğer renklere aktarılır; siyah/beyaz gibi diğer renklerin kendi stokları veya dokunmadığınız alanları korunur.
            </span>
          </div>
          <label className="flex items-center gap-2 text-xs font-bold text-blue-700 dark:text-blue-300 cursor-pointer select-none bg-blue-500/15 hover:bg-blue-500/25 px-3 py-1.5 rounded-lg border border-blue-500/30 transition-colors shrink-0">
            <input
              type="checkbox"
              checked={syncAllVariants}
              onChange={(e) => setSyncAllVariants(e.target.checked)}
              className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
            />
            <span>Değişenleri Tüm Varyantlara Uygula</span>
          </label>
        </div>

        {/* SEKME BAŞLIKLARI */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-border bg-card shrink-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("general")}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all shrink-0 ${
              activeTab === "general"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Genel Bilgiler
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("pricing")}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all shrink-0 ${
              activeTab === "pricing"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Fiyat & Stok
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("images")}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all shrink-0 flex items-center gap-1.5 ${
              activeTab === "images"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <span>Görseller</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-500/10 text-blue-600 font-bold">
              {images.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("attributes")}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all shrink-0 ${
              activeTab === "attributes"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Kategori Özellikleri
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* 1. GENEL BİLGİLER */}
          {activeTab === "general" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold text-foreground">Ürün Adı (Name) *</label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Örn: Geometrik 3D Ahşap Tablo Seti"
                    className="text-sm font-medium"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold text-foreground">Görünen Ad (DisplayName)</label>
                  <Input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Müşterinin göreceği başlık"
                    className="text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Model / Grup Kodu (groupCode) *</label>
                  <Input
                    value={groupCode}
                    onChange={(e) => setGroupCode(e.target.value)}
                    placeholder="Örn: MODEL-A100"
                    className="text-sm font-mono"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Aynı modele ait varyantlar bu kod ile gruplanır.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Ürün Barkodu (Code) *</label>
                  <Input
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Örn: 8680001234567"
                    className="text-sm font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Stok Kodu (stockCode)</label>
                  <Input
                    value={stockCode}
                    onChange={(e) => setStockCode(e.target.value)}
                    placeholder="Örn: STK-001-RED"
                    className="text-sm font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Marka (Brand)</label>
                  <select
                    value={brandId}
                    onChange={(e) => {
                      setBrandId(e.target.value);
                      const b = brandsList.find((x) => x.id === e.target.value);
                      if (b) setBrandName(b.name);
                    }}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="">{brandName || "Marka Seçiniz..."}</option>
                    {brandsList.slice(0, 50).map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      Ürün Açıklaması (Description) <span className="text-red-500 font-bold">*</span>
                      {description ? (
                        <span className="text-[10px] font-normal text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                          {description.length} karakter
                        </span>
                      ) : (
                        <span className="text-[10px] text-amber-600 font-medium animate-pulse">
                          (Boş bırakılamaz)
                        </span>
                      )}
                    </label>

                    {/* HTML & Görsel Görünüm Sekmesi */}
                    <div className="flex items-center bg-muted/80 p-0.5 rounded-lg border border-border text-xs ml-1">
                      <button
                        type="button"
                        onClick={() => setDescViewMode("visual")}
                        className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                          descViewMode === "visual"
                            ? "bg-card text-blue-600 dark:text-blue-400 shadow-xs border border-border/50 font-bold"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <Eye className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        Yazıyı Görüntüle
                      </button>
                      <button
                        type="button"
                        onClick={() => setDescViewMode("html")}
                        className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                          descViewMode === "html"
                            ? "bg-card text-orange-600 dark:text-orange-400 shadow-xs border border-border/50 font-bold"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <Code className="w-3.5 h-3.5 text-orange-500" />
                        HTML Kodu
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleFetchTrendyolDescription}
                      disabled={fetchingTrendyolDesc}
                      className="h-7 px-2 text-[11px] gap-1 border-orange-500/30 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/30 font-semibold"
                      title="Trendyol'daki orijinal ürün açıklamasını çekip doldurur"
                    >
                      <Sparkles className={`w-3 h-3 text-orange-500 ${fetchingTrendyolDesc ? "animate-spin" : ""}`} />
                      {fetchingTrendyolDesc ? "Çekiliyor..." : "Trendyol'dan Çek"}
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleGenerateAiDescription}
                      disabled={generatingAiDesc}
                      className="h-7 px-2 text-[11px] gap-1 border-blue-500/30 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 font-semibold"
                      title="Yapay zeka ile SEO uyumlu profesyonel açıklama üretir"
                    >
                      <Wand2 className={`w-3 h-3 text-blue-500 ${generatingAiDesc ? "animate-spin" : ""}`} />
                      {generatingAiDesc ? "Yazılıyor..." : "Yapay Zeka ile Yaz"}
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleCopyDescription}
                      className="h-7 px-2 text-[11px] gap-1 border-border text-foreground hover:bg-muted font-semibold"
                      title="Açıklamayı panoya kopyalar"
                    >
                      <Copy className="w-3 h-3 text-muted-foreground" />
                      Kopyala
                    </Button>
                  </div>
                </div>

                {descViewMode === "visual" ? (
                  <div className="space-y-1.5">
                    {/* Zengin Metin Biçimlendirme Araç Çubuğu */}
                    <div className="flex flex-wrap items-center gap-1 p-1 bg-muted/60 border border-input rounded-t-xl text-xs">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => execFormat("bold")}
                        className="h-7 w-7 p-0 font-bold hover:bg-background"
                        title="Kalın (Ctrl+B)"
                      >
                        <Bold className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => execFormat("italic")}
                        className="h-7 w-7 p-0 italic hover:bg-background"
                        title="İtalik (Ctrl+I)"
                      >
                        <Italic className="w-3.5 h-3.5" />
                      </Button>
                      <div className="h-4 w-[1px] bg-border mx-0.5" />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => execFormat("insertUnorderedList")}
                        className="h-7 w-7 p-0 hover:bg-background"
                        title="Madde İşaretli Liste"
                      >
                        <List className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => execFormat("insertOrderedList")}
                        className="h-7 w-7 p-0 hover:bg-background"
                        title="Numaralı Liste"
                      >
                        <ListOrdered className="w-3.5 h-3.5" />
                      </Button>
                      <div className="h-4 w-[1px] bg-border mx-0.5" />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => execFormat("undo")}
                        className="h-7 w-7 p-0 hover:bg-background"
                        title="Geri Al (Ctrl+Z)"
                      >
                        <Undo className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => execFormat("redo")}
                        className="h-7 w-7 p-0 hover:bg-background"
                        title="İleri Al (Ctrl+Y)"
                      >
                        <Redo className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => execFormat("removeFormat")}
                        className="h-7 w-7 p-0 hover:bg-background"
                        title="Biçimlendirmeyi Temizle"
                      >
                        <Eraser className="w-3.5 h-3.5" />
                      </Button>
                    </div>

                    {/* İnteraktif Zengin Metin Alanı */}
                    <div
                      ref={contentEditableRef}
                      contentEditable={true}
                      suppressContentEditableWarning={true}
                      onInput={(e) => setDescription(e.currentTarget.innerHTML)}
                      onBlur={(e) => setDescription(e.currentTarget.innerHTML)}
                      className="w-full min-h-[220px] max-h-[360px] overflow-y-auto rounded-b-xl border border-input border-t-0 bg-background p-4 text-xs sm:text-sm text-foreground focus-visible:outline-none focus:ring-1 focus:ring-primary leading-relaxed shadow-xs [&_p]:my-1.5 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2 [&_li]:my-0.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_b]:font-bold [&_strong]:font-bold [&_b]:text-foreground"
                    />

                    <div className="flex items-center justify-between px-1 text-[11px] text-muted-foreground">
                      <span>✏️ Metne tıklayarak doğrudan yazabilir, silebilir ve yukarıdaki butonlarla biçimlendirebilirsiniz.</span>
                      <button
                        type="button"
                        onClick={() => setDescViewMode("html")}
                        className="text-blue-600 dark:text-blue-400 hover:underline font-semibold cursor-pointer"
                      >
                        HTML kodunu düzenle
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={10}
                      placeholder="<p>Ürün açıklaması HTML formatında...</p>"
                      className="w-full rounded-xl border border-input bg-background p-3 text-xs font-mono focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring leading-relaxed"
                    />
                    <div className="flex items-center justify-between px-1 text-[11px] text-muted-foreground">
                      <span>💡 &lt;p&gt;, &lt;b&gt;, &lt;ul&gt;, &lt;li&gt;, &lt;br&gt; etiketlerini buradan düzenleyebilirsiniz.</span>
                      <button
                        type="button"
                        onClick={() => setDescViewMode("visual")}
                        className="text-blue-600 dark:text-blue-400 hover:underline font-semibold cursor-pointer"
                      >
                        Yazı görünümüne geç
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 2. FİYAT & STOK */}
          {activeTab === "pricing" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Liste / Üstü Çizili Fiyat (TL) *</label>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.01"
                    value={listPrice}
                    onChange={(e) => setListPrice(parseFloat(e.target.value) || 0)}
                    className="text-sm pl-8 font-semibold"
                  />
                  <span className="absolute left-2.5 top-2.5 text-xs text-muted-foreground font-bold">₺</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  Satış Fiyatı (TL) *
                </label>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.01"
                    value={salePrice}
                    onChange={(e) => setSalePrice(parseFloat(e.target.value) || 0)}
                    className="text-sm pl-8 font-bold text-emerald-700 dark:text-emerald-400"
                  />
                  <span className="absolute left-2.5 top-2.5 text-xs text-emerald-600 font-bold">₺</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Mevcut Stok Adedi *</label>
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
                  <option value={20}>%20 (Standart)</option>
                  <option value={10}>%10 (İndirimli)</option>
                  <option value={1}>%1 (Temel Gıda vb.)</option>
                  <option value={0}>%0 (Muaf)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Desi Değeri</label>
                <Input
                  type="number"
                  step="0.5"
                  value={desi}
                  onChange={(e) => setDesi(parseFloat(e.target.value) || 1)}
                  className="text-sm font-semibold"
                />
              </div>
            </div>
          )}

          {/* 3. GÖRSELLER */}
          {activeTab === "images" && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex-1 relative">
                  <Input
                    value={newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                    placeholder="https://... görsel URL'si yapıştırın"
                    className="text-xs"
                  />
                </div>
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
                      {uploadingImage ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Upload className="w-3.5 h-3.5" />
                      )}
                      Cihazdan Yükle
                    </span>
                  </Button>
                </label>
              </div>

              {/* Görsel Izgarası */}
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3.5">
                {images.map((imgUrl, idx) => (
                  <div
                    key={idx}
                    className="relative group rounded-xl overflow-hidden border border-border aspect-square bg-muted/30 flex items-center justify-center shadow-xs"
                  >
                    <img
                      src={imgUrl}
                      alt={`Görsel ${idx + 1}`}
                      className="w-full h-full object-contain p-1.5"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          "https://placehold.co/400x400?text=Hatalı+URL";
                      }}
                    />
                    <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/70 text-white text-[10px] font-bold">
                      {idx === 0 ? "Kapak" : `${idx + 1}`}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-red-600/90 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700"
                      title="Görseli Sil"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {images.length === 0 && (
                <div className="text-center py-8 text-muted-foreground border-2 border-dashed border-border rounded-xl">
                  <ImageIcon className="w-8 h-8 mx-auto opacity-30 mb-2" />
                  <p className="text-xs">Henüz görsel eklenmedi. Lütfen en az 1 görsel ekleyin.</p>
                </div>
              )}
            </div>
          )}

          {/* 4. KATEGORİ ÖZELLİKLERİ (ATTRIBUTES) */}
          {activeTab === "attributes" && (
            <div className="space-y-4">
              {loadingAttributes ? (
                <div className="flex items-center justify-center py-8 gap-2 text-xs text-muted-foreground">
                  <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                  Kategori özellikleri yükleniyor...
                </div>
              ) : categoryAttributesList.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {categoryAttributesList.map((attr) => {
                    const currentSelection = attributes.find((a) => a.attributeId === attr.id);
                    return (
                      <div key={attr.id} className="space-y-1.5">
                        <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          {attr.displayName || attr.name}
                          {attr.isRequired && (
                            <span className="text-[10px] text-red-500 font-bold">* Zorunlu</span>
                          )}
                        </label>
                        <select
                          value={currentSelection?.attributeValueId || ""}
                          onChange={(e) => handleAttributeChange(attr.id, e.target.value)}
                          className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        >
                          <option value="">Seçiniz...</option>
                          {naturalSort(attr.attributeValues || [], (val: any) => val.value || val.name).map((val: any) => (
                            <option key={val.id} value={val.id}>
                              {val.value}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground border border-border rounded-xl">
                  <Layers className="w-8 h-8 mx-auto opacity-30 mb-2" />
                  <p className="text-xs">
                    Bu kategori için tanımlanmış özel nitelik bulunamadı veya henüz kategori seçilmedi.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="px-6 py-4 border-t border-border bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-muted-foreground">
            {syncAllVariants ? (
              <span className="text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Aynı model kodundaki tüm varyantlar eşzamanlı güncellenecektir.
              </span>
            ) : (
              <span>Yalnızca bu barkoda ({code}) sahip ürün güncellenecektir.</span>
            )}
          </div>

          <div className="flex items-center gap-2.5 justify-end">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={saving}>
              İptal
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 text-white gap-2 font-bold shadow-md shadow-blue-600/20"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Pazarama&apos;ya Gönderiliyor...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {syncAllVariants ? "Tüm Varyantları Güncelle" : "Pazarama'da Güncelle"}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
