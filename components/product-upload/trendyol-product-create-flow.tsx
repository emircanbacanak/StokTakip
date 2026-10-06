"use client";

import { useState, useEffect, useRef } from "react";
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
  Code,
  Eye,
  X,
  RefreshCw,
  Camera,
  ChevronDown,
  HelpCircle,
  ArrowLeft,
  ArrowRight,
  Star,
  Copy,
  Link as LinkIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useConfirm } from "@/hooks/use-confirm";
import { createClient } from "@/lib/supabase/client";
import {
  TRENDYOL_WEB_COLORS,
  TRENDYOL_MATERIALS,
  TRENDYOL_HEIGHTS,
  TRENDYOL_PIECE_COUNTS,
  TRENDYOL_ORIGINS,
} from "./trendyol-product-edit-modal";
import {
  getColorCode,
  extractSizeCode,
  extractProductPrefix,
  generateSmartModelCode,
  generateSmartStockCode,
  generateEan13Barcode,
} from "@/lib/product-code-generator";
import { sanitizeTrendyolDescription } from "@/lib/trendyol-api-client";
import { detectCategoryFromProduct } from "@/lib/trendyol-categories-static";
import { compressImagesParallel } from "@/lib/image-compressor";

// ─── RENK KODU RENK DAİRESİ EŞLEŞTİRMESİ ──────────────────────────────────────
const COLOR_HEX_MAP: Record<string, string> = {
  Bej: "#E8D8C8",
  Gri: "#9E9E9E",
  Siyah: "#212121",
  Beyaz: "#FFFFFF",
  Antrasit: "#37474F",
  Mavi: "#2196F3",
  Kırmızı: "#F44336",
  Sarı: "#FFEB3B",
  Yeşil: "#4CAF50",
  Kahverengi: "#795548",
  Pembe: "#E91E63",
  Mor: "#9C27B0",
  Turuncu: "#FF9800",
  Turkuaz: "#00BCD4",
  Ekru: "#F5F5DC",
  Haki: "#556B2F",
  Bordo: "#800000",
  Altın: "#FFD700",
  Gümüş: "#C0C0C0",
  Inox: "#B0BEC5",
  Krem: "#FFFDD0",
  Lacivert: "#1A237E",
  "Çok Renkli": "linear-gradient(45deg, #f44336, #ffeb3b, #4caf50, #2196f3)",
  Şeffaf: "#E0F7FA",
};

// ─── BARKOD & MODEL KODU ÜRETECİLERİ ──────────────────────────────────────────
function generateUniqueBarcode(): string {
  return generateEan13Barcode();
}

function generateDefaultModelCode(title: string): string {
  return generateSmartModelCode(title);
}

// ─── BOYUT HESAPLAYICI (10cm altı: Mini, 10-20cm: Midi, 20cm+: Büyük Boy) ───
export function determineSizeFromHeight(heightStr: string): string {
  if (!heightStr) return "";
  const match = heightStr.match(/\d+(\.\d+)?/);
  if (!match) return "";
  const num = parseFloat(match[0]);
  if (num < 10) return "Mini";
  if (num <= 20) return "Midi";
  return "Büyük Boy";
}

// ─── TİPLER ──────────────────────────────────────────────────────────────────
export interface TableVariantRow {
  id: string;
  checked: boolean;
  title?: string; // Özelleştirilmiş ürün adı
  color: string;
  customColorName: string;
  height: string;
  size?: string; // "Mini" | "Midi" | "Büyük Boy"
  images: string[];
  barcode: string;
  salePrice: string;
  stock: string;
  vatRate: string;
  otv: string;
  stockCode: string;
  lotInfo: string;
}

interface TrendyolProductCreateFlowProps {
  onSuccess?: () => void;
  initialData?: any;
  onClose?: () => void;
  modeTitle?: string;
}

export function TrendyolProductCreateFlow({
  onSuccess,
  initialData,
  onClose,
  modeTitle,
}: TrendyolProductCreateFlowProps) {
  const { toast } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();

  // ─── ADIM YÖNETİMİ (Trendyol Panel Stili) ──────────────────────────────────
  const [currentStep, setCurrentStep] = useState<number>(0);

  const steps = [
    { id: 0, title: "Ürün Bilgileri", desc: "Temel bilgiler, model kodu, kategori ve marka" },
    { id: 1, title: "Ürün Açıklaması", desc: "Zengin metin editörü ve yapay zeka desteği" },
    { id: 2, title: "Ürün Özellikleri & Kargo", desc: "Materyal, parça sayısı, desi ve adresler" },
    { id: 3, title: "Satış ve Varyant Bilgileri", desc: "Renk, Yükseklik, Fiyat ve Varyant Tablosu" },
  ];

  // ─── ADIM 0: ÜRÜN BİLGİLERİ ───────────────────────────────────────────────
  const [title, setTitle] = useState(initialData?.title || "");
  const [modelCode, setModelCode] = useState(initialData?.modelCode || "");
  const [categorySearchQuery, setCategorySearchQuery] = useState(initialData?.categoryName || "");
  const [selectedCategory, setSelectedCategory] = useState<{ id: number; name: string } | null>(
    initialData?.categoryId ? { id: initialData.categoryId, name: initialData.categoryName || "Kategori" } : null
  );
  const [categorySuggestions, setCategorySuggestions] = useState<Array<{ id: number; name: string }>>([]);
  const [isSearchingCategory, setIsSearchingCategory] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [categoryAttributes, setCategoryAttributes] = useState<any[]>([]);
  const [isLoadingAttributes, setIsLoadingAttributes] = useState(false);
  const [hasCategorySlicers, setHasCategorySlicers] = useState<boolean>(true);
  const categoryContainerRef = useRef<HTMLDivElement>(null);
  const isCategoryFocusedRef = useRef(false);

  // Marka Bilgisi
  const [brandType, setBrandType] = useState<"custom" | "nobrand">(initialData?.brandName === "Genel Markalar" ? "nobrand" : "custom");
  const [brandSearchQuery, setBrandSearchQuery] = useState(initialData?.brandName || "");
  const [selectedBrand, setSelectedBrand] = useState<{ id: number; name: string } | null>(
    initialData?.brandId ? { id: initialData.brandId, name: initialData.brandName || "" } : null
  );
  const [brandSuggestions, setBrandSuggestions] = useState<Array<{ id: number; name: string }>>([]);
  const [isSearchingBrand, setIsSearchingBrand] = useState(false);
  const [showBrandDropdown, setShowBrandDropdown] = useState(false);
  const brandContainerRef = useRef<HTMLDivElement>(null);
  const isBrandFocusedRef = useRef(false);

  // ─── ADIM 1: ÜRÜN AÇIKLAMASI ───────────────────────────────────────────────
  const [description, setDescription] = useState(initialData?.description || "");
  const [isHtmlView, setIsHtmlView] = useState(false);
  const [htmlContent, setHtmlContent] = useState(description);
  const editorRef = useRef<HTMLDivElement>(null);
  const [isAiGenerating, setIsAiGenerating] = useState(false);

  // ─── ADIM 2: ÖZELLİKLER & KARGO ───────────────────────────────────────────
  const [material, setMaterial] = useState(initialData?.material || "Plastik");
  const [pieceCount, setPieceCount] = useState(initialData?.pieceCount || "1");
  const [height, setHeight] = useState(initialData?.height || "");
  const [origin, setOrigin] = useState(initialData?.origin || "TR - (Türkiye)");
  const [desi, setDesi] = useState(initialData?.desi?.toString() || "");
  const [leadTime, setLeadTime] = useState(initialData?.leadTime || "");
  const [shipmentAddress, setShipmentAddress] = useState(initialData?.shipmentAddress || "");
  const [returnAddress, setReturnAddress] = useState(initialData?.returnAddress || "");
  const [cargoCompany, setCargoCompany] = useState(initialData?.cargoCompany || "");

  // ─── ADIM 3: SATIŞ VE VARYANT BİLGİLERİ (TRENDYOL BİREBİR ARAYÜZ) ──────────
  const [selectedHeight, setSelectedHeight] = useState<string>(initialData?.height || "");
  const [inputColorScale, setInputColorScale] = useState<string>("");
  const [inputColorName, setInputColorName] = useState<string>("");
  const [colorChips, setColorChips] = useState<Array<{ id: string; webColor: string; customName: string; height?: string }>>([]);

  // Toplu Güncelleme Çubuğu State
  const [bulkPrice, setBulkPrice] = useState<string>("");
  const [bulkVat, setBulkVat] = useState<string>("%20");
  const [bulkStock, setBulkStock] = useState<string>("");
  const [bulkHeight, setBulkHeight] = useState<string>("");

  // Tablo Satırları (Varyant Listesi)
  const [tableVariants, setTableVariants] = useState<TableVariantRow[]>([]);

  // Çoklu Görsel Yükleme & Yönetim Modalı / State
  const [activeImageUploadRowId, setActiveImageUploadRowId] = useState<string | null>(null);
  const [isImageManagerOpen, setIsImageManagerOpen] = useState(false);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [inputImageUrl, setInputImageUrl] = useState("");
  const multiFileInputRef = useRef<HTMLInputElement>(null);

  // Gönderim Durumu
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ─── INITIALDATA (MakerWorld veya Ürün Kataloğundan Aktarım) ──────────────
  const [importedSource, setImportedSource] = useState<string | null>(initialData?.source || null);

  useEffect(() => {
    if (!initialData) return;

    if (initialData.title) setTitle(initialData.title);
    if (initialData.modelCode) setModelCode(initialData.modelCode);
    if (initialData.description) {
      setDescription(initialData.description);
      setHtmlContent(initialData.description);
      if (editorRef.current) {
        editorRef.current.innerHTML = initialData.description;
      }
    }
    if (initialData.material) setMaterial(initialData.material);
    if (initialData.pieceCount) setPieceCount(initialData.pieceCount);
    if (initialData.height) {
      setHeight(initialData.height);
      setSelectedHeight(initialData.height);
    }
    if (initialData.price) {
      setBulkPrice(initialData.price.toString());
    }
    if (initialData.stock) {
      setBulkStock(initialData.stock.toString());
    }
    if (initialData.source) {
      setImportedSource(initialData.source);
    }

    // Kategori tespiti
    const detected = detectCategoryFromProduct({
      title: initialData.title,
      categoryName: initialData.categoryName || initialData.category_name,
      category_id: initialData.categoryId || initialData.category_id,
    });
    if (detected) {
      setSelectedCategory(detected);
      setCategorySearchQuery(detected.name);
    }

    // Marka ("Genel Markalar" varsayılanı)
    if (initialData.brandId) {
      setSelectedBrand({ id: initialData.brandId, name: initialData.brandName || "Genel Markalar" });
      setBrandType("custom");
    } else {
      setSelectedBrand({ id: 1066155, name: "Genel Markalar" });
      setBrandType("nobrand");
    }

    // Görseller
    const rawImages = initialData.images || initialData.image_urls || (initialData.image_url ? [initialData.image_url] : []) || [];
    const validImages = Array.isArray(rawImages) ? rawImages.filter(Boolean) : [];

    // Varyant Satırları Oluşturma
    const sizes = Array.isArray(initialData.sizes) && initialData.sizes.length > 0 ? initialData.sizes : null;

    if (sizes && sizes.length > 0) {
      const generatedChips: Array<{ id: string; webColor: string; customName: string; height?: string }> = [];
      const generatedRows: TableVariantRow[] = [];

      sizes.forEach((s: any, idx: number) => {
        const sizeName = typeof s === "string" ? s : s.name || s.size_name || "";
        const rowId = `v-init-${Date.now()}-${idx}`;
        const smartBarcode = generateEan13Barcode();
        const smartStockCode = generateSmartStockCode(
          initialData.modelCode || initialData.title || "MOD",
          "Beyaz",
          sizeName,
          initialData.title || ""
        );

        generatedChips.push({
          id: rowId,
          webColor: "Beyaz",
          customName: "Beyaz",
          height: sizeName,
        });

        generatedRows.push({
          id: rowId,
          checked: false,
          color: "Beyaz",
          customColorName: "Beyaz",
          height: sizeName,
          size: determineSizeFromHeight(sizeName),
          images: validImages,
          barcode: smartBarcode,
          salePrice: initialData.price ? initialData.price.toString() : "",
          stock: initialData.stock ? initialData.stock.toString() : "10",
          vatRate: "20",
          otv: "",
          stockCode: smartStockCode,
          lotInfo: "",
        });
      });

      setColorChips(generatedChips);
      setTableVariants(generatedRows);
    } else if (validImages.length > 0 || initialData.title) {
      const rowId = `v-init-${Date.now()}-0`;
      const smartBarcode = generateEan13Barcode();
      const smartStockCode = generateSmartStockCode(
        initialData.modelCode || initialData.title || "MOD",
        "Beyaz",
        initialData.height || "",
        initialData.title || ""
      );

      setColorChips([
        {
          id: rowId,
          webColor: "Beyaz",
          customName: "Beyaz",
          height: initialData.height || "",
        },
      ]);

      setTableVariants([
        {
          id: rowId,
          checked: false,
          color: "Beyaz",
          customColorName: "Beyaz",
          height: initialData.height || "",
          size: determineSizeFromHeight(initialData.height || ""),
          images: validImages,
          barcode: smartBarcode,
          salePrice: initialData.price ? initialData.price.toString() : "",
          stock: initialData.stock ? initialData.stock.toString() : "10",
          vatRate: "20",
          otv: "",
          stockCode: smartStockCode,
          lotInfo: "",
        },
      ]);
    }
  }, [initialData]);

  // ─── MODEL KODU OTOMATİK DOLDURMA ─────────────────────────────────────────
  useEffect(() => {
    if (!modelCode && title.trim().length > 3) {
      const generated = generateSmartModelCode(title, selectedCategory?.name || "");
      setModelCode(generated);
      // Tablodaki stok kodlarını da akıllı güncelle (Örn: PTR-TEN-20)
      setTableVariants((prev) =>
        prev.map((r) => {
          const sCode = generateSmartStockCode(generated, r.color, r.height || selectedHeight, title);
          return { ...r, stockCode: sCode };
        })
      );
    }
  }, [title]);

  // ─── KATEGORİ OTOMATİK TESPİTİ (Title veya Arama teriminden) ──────────────
  useEffect(() => {
    if (!selectedCategory && title.trim().length > 2) {
      const titleLower = title.toLowerCase();
      if (
        titleLower.includes("figür") ||
        titleLower.includes("figur") ||
        titleLower.includes("biblo") ||
        titleLower.includes("anime") ||
        titleLower.includes("karakter") ||
        titleLower.includes("heykel") ||
        titleLower.includes("gojo")
      ) {
        setSelectedCategory({ id: 833, name: "Figür" });
        setCategorySearchQuery("Figür");
      }
    }
  }, [title]);

  // ─── DIŞARI TIKLAMA İLE AÇILIR MENÜLERİ KAPATMA ───────────────────────────
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (categoryContainerRef.current && !categoryContainerRef.current.contains(e.target as Node)) {
        setShowCategoryDropdown(false);
        isCategoryFocusedRef.current = false;
      }
      if (brandContainerRef.current && !brandContainerRef.current.contains(e.target as Node)) {
        setShowBrandDropdown(false);
        isBrandFocusedRef.current = false;
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // ─── KATEGORİ CANLI ARAMA (API: /api/trendyol-meta?type=categories) ──────────
  useEffect(() => {
    if (selectedCategory) {
      setShowCategoryDropdown(false);
      return;
    }
    if (categorySearchQuery.trim().length < 2) {
      setCategorySuggestions([]);
      setShowCategoryDropdown(false);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearchingCategory(true);
      try {
        const res = await fetch(`/api/trendyol-meta?type=categories`);
        if (res.ok) {
          const data = await res.json();
          const q = categorySearchQuery.toLowerCase();
          const flatList: Array<{ id: number; name: string }> = [];

          const flatten = (cats: any[], prefix = "") => {
            for (const c of cats) {
              const fullPath = prefix ? `${prefix} > ${c.name}` : c.name;
              if (c.name.toLowerCase().includes(q) || fullPath.toLowerCase().includes(q)) {
                flatList.push({ id: c.id, name: fullPath });
              }
              if (c.subCategories && c.subCategories.length > 0) {
                flatten(c.subCategories, fullPath);
              }
            }
          };

          flatten(data.categories || []);
          const suggestions = flatList.slice(0, 20);
          setCategorySuggestions(suggestions);
          // Sadece kullanıcı alana odaklandıysa ve kategori seçili değilse aç
          if (suggestions.length > 0 && isCategoryFocusedRef.current && !selectedCategory) {
            setShowCategoryDropdown(true);
          }
        }
      } catch (err) {
        console.error("Kategori arama hatası:", err);
      } finally {
        setIsSearchingCategory(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [categorySearchQuery, selectedCategory?.id]);

  // Dropdown dışına tıklandığında menüleri kapat
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoryContainerRef.current && !categoryContainerRef.current.contains(event.target as Node)) {
        setShowCategoryDropdown(false);
        isCategoryFocusedRef.current = false;
      }
      if (brandContainerRef.current && !brandContainerRef.current.contains(event.target as Node)) {
        setShowBrandDropdown(false);
        isBrandFocusedRef.current = false;
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // ─── KATEGORİ ÖZELLİKLERİ VE VARYANT/SLICER BİLGİSİNİ ÇEK ─────────────────
  useEffect(() => {
    if (!selectedCategory?.id) {
      setCategoryAttributes([]);
      setHasCategorySlicers(true);
      return;
    }

    const fetchAttrs = async () => {
      setIsLoadingAttributes(true);
      try {
        const res = await fetch(`/api/trendyol-meta?type=attributes&categoryId=${selectedCategory.id}`);
        if (res.ok) {
          const data = await res.json();
          const attrs = data.categoryAttributes || [];
          setCategoryAttributes(attrs);

          // Trendyol'da bu kategoride slicer / varyant var mı kontrol et
          const slicerAttrs = attrs.filter((a: any) => a.slicer || a.varianter);
          setHasCategorySlicers(slicerAttrs.length > 0);
        }
      } catch (err) {
        console.error("Kategori özellikleri alınamadı:", err);
      } finally {
        setIsLoadingAttributes(false);
      }
    };

    fetchAttrs();
  }, [selectedCategory?.id]);

  // ─── MARKA CANLI ARAMA (API: /api/trendyol-meta?type=brands&name=...) ────────
  useEffect(() => {
    if (brandType === "nobrand") {
      if (selectedBrand?.id !== 1066155) {
        setSelectedBrand({ id: 1066155, name: "Genel Markalar" });
      }
      setShowBrandDropdown(false);
      return;
    }
    // Eğer marka zaten seçildiyse dropdown'ı kapalı tut ve arama yapma
    if (selectedBrand) {
      setShowBrandDropdown(false);
      return;
    }
    if (brandSearchQuery.trim().length < 2) {
      setBrandSuggestions([]);
      setShowBrandDropdown(false);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearchingBrand(true);
      try {
        const res = await fetch(`/api/trendyol-meta?type=brands&name=${encodeURIComponent(brandSearchQuery.trim())}`);
        if (res.ok) {
          const data = await res.json();
          const brands = data.brands || [];
          setBrandSuggestions(brands);
          // Sadece kullanıcı alana tıklayıp odaklandıysa ve marka henüz seçilmediyse aç
          if (brands.length > 0 && isBrandFocusedRef.current && !selectedBrand) {
            setShowBrandDropdown(true);
          }
        }
      } catch (e) {
        console.error("Marka arama hatası:", e);
      } finally {
        setIsSearchingBrand(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [brandSearchQuery, brandType, selectedBrand?.id]);

  // ─── ZENGİN METİN EDİTÖRÜ ARAÇLARI ─────────────────────────────────────────
  const executeCommand = (command: string, value: string | undefined = undefined) => {
    if (isHtmlView) return;
    document.execCommand(command, false, value);
    if (editorRef.current) {
      setDescription(editorRef.current.innerHTML);
    }
  };

  const handleEditorInput = () => {
    if (editorRef.current) {
      setDescription(editorRef.current.innerHTML);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const html = e.clipboardData.getData("text/html");
    const text = e.clipboardData.getData("text/plain");
    if (html) {
      const sanitized = sanitizeTrendyolDescription(html)
        .replace(/^<div[^>]*>\n?/, "")
        .replace(/\n?<\/div>$/, "");
      document.execCommand("insertHTML", false, sanitized);
    } else if (text) {
      document.execCommand("insertText", false, text);
    }
    if (editorRef.current) {
      setDescription(editorRef.current.innerHTML);
    }
  };

  const toggleHtmlMode = () => {
    if (isHtmlView) {
      setDescription(htmlContent);
      if (editorRef.current) {
        editorRef.current.innerHTML = htmlContent;
      }
      setIsHtmlView(false);
    } else {
      setHtmlContent(description);
      setIsHtmlView(true);
    }
  };

  const handleGenerateAiDescription = async () => {
    setIsAiGenerating(true);
    try {
      const prodName = title.trim() || "Dekoratif Tasarım Ürünü";
      const catName = selectedCategory?.name || "Ev & Yaşam";
      const generatedHtml = `
<p><strong>${prodName}</strong></p>
<p>Yaşam alanlarınıza modern zarafet ve estetik katmak için özenle tasarlanmış ${catName} koleksiyonumuzun seçkin bir parçasıdır.</p>
<p><strong>Öne Çıkan Ürün Özellikleri:</strong></p>
<ul>
  <li><strong>Birinci Sınıf Malzeme:</strong> Yüksek dayanıklılığa sahip kaliteli malzemeden üretilmiştir, uzun ömürlü kullanım sunar.</li>
  <li><strong>Zarif ve Şık Görünüm:</strong> Minimalist hatları ve modern dokusuyla her türlü ev ve ofis dekorasyonuna kusursuz uyum sağlar.</li>
  <li><strong>El İşçiliği & Detay:</strong> Her bir detay titizlikle işlenmiş olup pürüzsüz yüzey dokusuna sahiptir.</li>
  <li><strong>Güvenli Paketleme:</strong> Darbelere karşı ekstra korumalı özel ambalajında hasarsız olarak tarafınıza ulaştırılır.</li>
</ul>
<p><em>Not:</em> Ürün doğrudan üreticisinden özenle paketlenerek sevk edilmektedir. Keyifli alışverişler dileriz.</p>
      `.trim();

      setDescription(generatedHtml);
      setHtmlContent(generatedHtml);
      if (editorRef.current) {
        editorRef.current.innerHTML = generatedHtml;
      }
      toast({
        title: "✨ Açıklama Hazırlandı",
        description: "Yapay zeka ürününüz için profesyonel açıklama oluşturdu.",
      });
    } catch {
      toast({ title: "Hata", description: "Açıklama üretilirken sorun oluştu.", variant: "destructive" });
    } finally {
      setIsAiGenerating(false);
    }
  };

  // Açıklama değiştiğinde contentEditable div'i güncelle (kullanıcı yazmıyorken ters yazmayı önler)
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== description) {
      if (document.activeElement !== editorRef.current) {
        editorRef.current.innerHTML = description;
      }
    }
  }, [description]);

  // Step 1 açıldığında veya ilk yüklemede div'e içeriği ver
  useEffect(() => {
    if (currentStep === 1 && editorRef.current && !editorRef.current.innerHTML && description) {
      editorRef.current.innerHTML = description;
    }
  }, [currentStep, description]);

  // ─── VARYANT TABLOSU İŞLEMLERİ (TRENDYOL BİREBİR) ──────────────────────────

  // ─── VARYANT TABLOSU İŞLEMLERİ (TRENDYOL BİREBİR) ──────────────────────────

  // Varyant (Renk + Yükseklik) Ekle
  const handleAddColor = () => {
    const color = inputColorScale;
    const custom = inputColorName.trim() || color;
    const currentVariantHeight = selectedHeight || height || "";

    // Aynı renk ve aynı yükseklik kombinasyonu var mı kontrol et
    const isDuplicate = tableVariants.some(
      (v) => v.color === color && (v.height || "") === currentVariantHeight
    );

    if (isDuplicate) {
      toast({
        title: "Varyant Zaten Ekli",
        description: `${color}${currentVariantHeight ? ` (${currentVariantHeight})` : ""} varyantı tabloda zaten mevcut.`,
        variant: "destructive",
      });
      return;
    }

    const rowId = `v-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const newChip = {
      id: rowId,
      webColor: color,
      customName: custom,
      height: currentVariantHeight,
    };
    
    const smartBarcode = generateEan13Barcode();
    const smartStockCode = generateSmartStockCode(modelCode || title, color, currentVariantHeight, title);
    const initialImages = initialData?.image_urls || initialData?.images || [];
    const sourceImages = Array.isArray(initialImages) && initialImages.length > 0 ? [...initialImages] : [];

    const newRow: TableVariantRow = {
      id: rowId,
      checked: false,
      title: "",
      color,
      customColorName: custom,
      height: currentVariantHeight,
      size: determineSizeFromHeight(currentVariantHeight),
      images: sourceImages,
      barcode: smartBarcode,
      salePrice: "",
      stock: "",
      vatRate: "20",
      otv: "",
      stockCode: smartStockCode,
      lotInfo: "",
    };

    const isSingleEmptyPlaceholder =
      tableVariants.length === 1 &&
      tableVariants[0].id.startsWith("v-init-") &&
      !tableVariants[0].salePrice;

    if (isSingleEmptyPlaceholder) {
      setColorChips([newChip]);
      setTableVariants([newRow]);
    } else {
      setColorChips((prev) => [...prev, newChip]);
      setTableVariants((prev) => [...prev, newRow]);
    }

    setInputColorName("");
    toast({
      title: "Varyant Eklendi",
      description: `${color}${currentVariantHeight ? ` (${currentVariantHeight})` : ""} varyant tablosuna eklendi.`,
    });
  };

  // Yeni Bağımsız Ürün / Kopya Satırı Ekle (Aynı Model Kodu Altında)
  const handleAddNewCloneRow = (sourceRow?: TableVariantRow) => {
    const defaultColor = sourceRow?.color || inputColorScale || "Beyaz";
    const defaultHeight = sourceRow?.height || selectedHeight || height || "";
    const defaultSize = sourceRow?.size || determineSizeFromHeight(defaultHeight);
    const rowId = `v-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const smartBarcode = generateEan13Barcode();
    const smartStockCode = generateSmartStockCode(modelCode || title, defaultColor, defaultHeight, title);

    const initialImages = initialData?.image_urls || initialData?.images || [];
    const sourceImages =
      sourceRow?.images && sourceRow.images.length > 0
        ? [...sourceRow.images]
        : Array.isArray(initialImages) && initialImages.length > 0
        ? [...initialImages]
        : [];

    const newRow: TableVariantRow = {
      id: rowId,
      checked: false,
      title: "", // Kullanıcı kendisi girecek
      color: defaultColor,
      customColorName: sourceRow?.customColorName || defaultColor,
      height: defaultHeight,
      size: defaultSize,
      images: sourceImages,
      barcode: smartBarcode, // Otomatik EAN-13
      salePrice: "", // Fiyat boş olacak, kullanıcı girecek
      stock: "", // Stok boş olacak, kullanıcı girecek
      vatRate: "20", // KDV her zaman %20
      otv: "",
      stockCode: smartStockCode, // Otomatik stok kodu
      lotInfo: "",
    };

    const isSingleEmptyPlaceholder =
      tableVariants.length === 1 &&
      tableVariants[0].id.startsWith("v-init-") &&
      !tableVariants[0].salePrice;

    if (isSingleEmptyPlaceholder) {
      setTableVariants([newRow]);
    } else {
      setTableVariants((prev) => [...prev, newRow]);
    }
    toast({
      title: "Yeni Ürün / Kopya Eklendi",
      description: "Yeni satır oluşturuldu. Barkod, stok kodu ve KDV (%20) hazır; başlık, fiyat ve stok girebilirsiniz.",
    });
  };

  // Renk / Varyant Çipini ve Tablodaki Satırını Kaldır
  const handleRemoveColorChip = (chipId: string) => {
    setColorChips((prev) => prev.filter((c) => c.id !== chipId));
    setTableVariants((prev) => prev.filter((v) => v.id !== chipId));
  };

  // Tablodan Tek Satır Kaldır
  const handleRemoveVariantRow = (rowId: string) => {
    setColorChips((prev) => prev.filter((c) => c.id !== rowId));
    setTableVariants((prev) => prev.filter((r) => r.id !== rowId));
  };

  // Satırda Yükseklik Değiştirildiğinde (Otomatik Boyut Hesaplama: <10cm Mini, 10-20cm Midi, >20cm Büyük Boy)
  const handleUpdateVariantHeight = (rowId: string, newHeight: string) => {
    const calculatedSize = determineSizeFromHeight(newHeight);
    setTableVariants((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r;
        const updatedStockCode = generateSmartStockCode(modelCode || title, r.color, newHeight, title);
        return {
          ...r,
          height: newHeight,
          size: calculatedSize || r.size,
          stockCode: updatedStockCode,
        };
      })
    );
    setColorChips((prev) =>
      prev.map((c) => (c.id === rowId ? { ...c, height: newHeight } : c))
    );
  };

  // Toplu Güncelleme Uygula (Trendyol Güncelle Butonu)
  const handleApplyBulkUpdate = () => {
    const hasChecked = tableVariants.some((r) => r.checked);
    setTableVariants((prev) =>
      prev.map((row) => {
        if (!hasChecked || row.checked) {
          const newHeight = bulkHeight ? bulkHeight : row.height;
          const updatedStockCode = bulkHeight
            ? generateSmartStockCode(modelCode || title, row.color, newHeight, title)
            : row.stockCode;

          return {
            ...row,
            height: newHeight,
            stockCode: updatedStockCode,
            salePrice: bulkPrice && bulkPrice !== "0,00" ? bulkPrice : row.salePrice,
            vatRate: bulkVat ? bulkVat : row.vatRate,
            stock: bulkStock && bulkStock !== "0" ? bulkStock : row.stock,
          };
        }
        return row;
      })
    );
    if (bulkHeight) {
      setColorChips((prev) =>
        prev.map((c) => {
          const row = tableVariants.find((r) => r.id === c.id);
          if (!hasChecked || (row && row.checked)) {
            return { ...c, height: bulkHeight };
          }
          return c;
        })
      );
    }
    toast({
      title: "Toplu Güncelleme Yapıldı",
      description: hasChecked
        ? "Seçili varyantların bilgileri güncellendi."
        : "Tüm varyantların bilgileri güncellendi.",
    });
  };

  // Satır Değerini Güncelle
  const handleUpdateRowField = (rowId: string, field: keyof TableVariantRow, val: any) => {
    setTableVariants((prev) =>
      prev.map((r) => (r.id === rowId ? { ...r, [field]: val } : r))
    );
  };

  // Tümünü Seç / Kaldır
  const handleToggleSelectAll = (checked: boolean) => {
    setTableVariants((prev) => prev.map((r) => ({ ...r, checked })));
  };

  // ─── ÇOKLU GÖRSEL YÜKLEME VE YÖNETİM METODLARI ──────────────────────────
  const handleUploadFiles = async (files: FileList | File[]) => {
    if (!activeImageUploadRowId) return;
    const currentVariant = tableVariants.find((r) => r.id === activeImageUploadRowId);
    if (!currentVariant) return;

    if (currentVariant.images.length >= 8) {
      toast({
        title: "Maksimum Görsel Limiti",
        description: "Trendyol için en fazla 8 adet görsel eklenebilir.",
        variant: "destructive",
      });
      return;
    }

    const availableSlots = 8 - currentVariant.images.length;
    const filesToUpload = Array.from(files).slice(0, availableSlots);
    if (filesToUpload.length === 0) return;

    setIsUploadingImages(true);
    const supabase = createClient();
    const apiKey = process.env.NEXT_PUBLIC_IMGBB_API_KEY || "";

    try {
      // 1. İstemci taraflı paralel ultra hızlı sıkıştırma (10MB -> 200KB)
      const compressedFiles = await compressImagesParallel(filesToUpload, {
        maxWidth: 1600,
        maxHeight: 1600,
        quality: 0.85,
        format: "image/jpeg",
      });

      // 2. Paralel olarak hepsini aynı anda yükle (Promise.all)
      const uploadPromises = compressedFiles.map(async (file) => {
        const cleanName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.jpg`;
        const filePath = `products/trendyol/${cleanName}`;

        // Supabase Storage dene
        try {
          const { error: sbErr } = await supabase.storage
            .from("product-images")
            .upload(filePath, file, { cacheControl: "31536000", upsert: false });

          if (!sbErr) {
            const { data: publicData } = supabase.storage.from("product-images").getPublicUrl(filePath);
            if (publicData?.publicUrl) {
              return { success: true, url: publicData.publicUrl, name: file.name };
            }
          }
        } catch (err) {
          console.warn("Supabase Storage yükleme denemesi:", err);
        }

        // ImgBB Fallback
        if (apiKey) {
          try {
            const base64 = await new Promise<string>((resolve, reject) => {
              const fr = new FileReader();
              fr.onload = () => resolve((fr.result as string).split(",")[1]);
              fr.onerror = reject;
              fr.readAsDataURL(file);
            });
            const formData = new FormData();
            formData.append("image", base64);
            const res = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
              method: "POST",
              body: formData,
            });
            const data = await res.json();
            if (data.success && data.data?.display_url) {
              return { success: true, url: data.data.display_url, name: file.name };
            }
          } catch (err) {
            console.warn("ImgBB yükleme denemesi:", err);
          }
        }

        return { success: false, url: null, name: file.name };
      });

      const results = await Promise.all(uploadPromises);
      const uploadedUrls = results.filter((r) => r.success && r.url).map((r) => r.url as string);
      const errors = results.filter((r) => !r.success).map((r) => r.name);

      if (uploadedUrls.length > 0) {
        setTableVariants((prev) =>
          prev.map((r) =>
            r.id === activeImageUploadRowId
              ? { ...r, images: [...r.images, ...uploadedUrls].slice(0, 8) }
              : r
          )
        );
        toast({
          title: "Görseller Eklendi",
          description: `${uploadedUrls.length} adet görsel başarıyla yüklendi.`,
        });
      }

      if (errors.length > 0) {
        toast({
          title: "Bazı Dosyalar Yüklenemedi",
          description: `Yüklenemeyenler: ${errors.join(", ")}. Doğrudan URL ile eklemeyi deneyebilirsiniz.`,
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Görsel yükleme genel hatası:", err);
      toast({
        title: "Yükleme Hatası",
        description: "Görseller işlenirken bir sorun oluştu.",
        variant: "destructive",
      });
    } finally {
      setIsUploadingImages(false);
    }
  };

  // URL ile Görsel Ekleme (Tekli veya çoklu satır)
  const handleAddImageUrl = () => {
    if (!activeImageUploadRowId || !inputImageUrl.trim()) return;
    const currentVariant = tableVariants.find((r) => r.id === activeImageUploadRowId);
    if (!currentVariant) return;

    if (currentVariant.images.length >= 8) {
      toast({
        title: "Limit Dolu",
        description: "Trendyol için maksimum 8 görsel ekleyebilirsiniz.",
        variant: "destructive",
      });
      return;
    }

    const urls = inputImageUrl
      .split(/[\n,]+/)
      .map((u) => u.trim())
      .filter((u) => u.startsWith("http://") || u.startsWith("https://"));

    if (urls.length === 0) {
      toast({
        title: "Geçersiz URL",
        description: "Lütfen geçerli bir resim linki (http/https) girin.",
        variant: "destructive",
      });
      return;
    }

    const availableSlots = 8 - currentVariant.images.length;
    const addedUrls = urls.slice(0, availableSlots);

    setTableVariants((prev) =>
      prev.map((r) =>
        r.id === activeImageUploadRowId
          ? { ...r, images: [...r.images, ...addedUrls] }
          : r
      )
    );

    setInputImageUrl("");
    toast({
      title: "Görsel URL Eklendi",
      description: `${addedUrls.length} adet görsel listeye eklendi.`,
    });
  };

  const handleRemoveImageFromVariant = (variantId: string, index: number) => {
    setTableVariants((prev) =>
      prev.map((r) =>
        r.id === variantId
          ? { ...r, images: r.images.filter((_, idx) => idx !== index) }
          : r
      )
    );
  };

  const handleSetCoverImage = (variantId: string, index: number) => {
    if (index === 0) return;
    setTableVariants((prev) =>
      prev.map((r) => {
        if (r.id !== variantId) return r;
        const newImages = [...r.images];
        const [target] = newImages.splice(index, 1);
        newImages.unshift(target);
        return { ...r, images: newImages };
      })
    );
    toast({ title: "Kapak Görseli Seçildi", description: "Görsel 1. sıraya (Kapak) taşındı." });
  };

  const handleMoveImage = (variantId: string, fromIndex: number, toIndex: number) => {
    setTableVariants((prev) =>
      prev.map((r) => {
        if (r.id !== variantId) return r;
        if (toIndex < 0 || toIndex >= r.images.length) return r;
        const newImages = [...r.images];
        const [moved] = newImages.splice(fromIndex, 1);
        newImages.splice(toIndex, 0, moved);
        return { ...r, images: newImages };
      })
    );
  };

  const handleCopyImagesToAllVariants = (sourceVariantId: string) => {
    const source = tableVariants.find((r) => r.id === sourceVariantId);
    if (!source || source.images.length === 0) {
      toast({
        title: "Kopyalanacak Görsel Yok",
        description: "Bu varyantta henüz görsel bulunmuyor.",
        variant: "destructive",
      });
      return;
    }

    setTableVariants((prev) =>
      prev.map((r) => ({ ...r, images: [...source.images] }))
    );

    toast({
      title: "Tüm Varyantlara Kopyalandı",
      description: `${source.images.length} adet görsel tüm renk varyantlarına uygulandı.`,
    });
  };

  const handleClearVariantImages = (variantId: string) => {
    setTableVariants((prev) =>
      prev.map((r) => (r.id === variantId ? { ...r, images: [] } : r))
    );
    toast({ title: "Görseller Temizlendi" });
  };

  // ─── ADIM DOĞRULAMA VE İLERLEME ────────────────────────────────────────────
  const validateStep = (stepIndex: number): boolean => {
    if (stepIndex === 0) {
      if (!title.trim()) {
        toast({ title: "Eksik Alan", description: "Lütfen ürün adı giriniz.", variant: "destructive" });
        return false;
      }
      if (!modelCode.trim()) {
        toast({ title: "Eksik Alan", description: "Lütfen model kodu giriniz.", variant: "destructive" });
        return false;
      }
      if (!selectedCategory?.id) {
        toast({ title: "Eksik Alan", description: "Lütfen bir kategori seçiniz.", variant: "destructive" });
        return false;
      }
      if (brandType === "custom" && !selectedBrand?.id && !brandSearchQuery.trim()) {
        toast({ title: "Eksik Alan", description: "Lütfen bir marka seçiniz.", variant: "destructive" });
        return false;
      }
    }
    if (stepIndex === 1) {
      if (!description.trim() || description === "<p></p>") {
        toast({ title: "Eksik Alan", description: "Lütfen ürün açıklaması giriniz.", variant: "destructive" });
        return false;
      }
    }
    if (stepIndex === 2) {
      if (!material) {
        toast({ title: "Eksik Alan", description: "Lütfen Materyal seçiniz.", variant: "destructive" });
        return false;
      }
      if (!pieceCount) {
        toast({ title: "Eksik Alan", description: "Lütfen Parça Sayısı seçiniz.", variant: "destructive" });
        return false;
      }
      if (!origin) {
        toast({ title: "Eksik Alan", description: "Lütfen Menşei seçiniz.", variant: "destructive" });
        return false;
      }
      if (!desi || Number(desi) <= 0) {
        toast({ title: "Eksik Alan", description: "Lütfen geçerli bir Desi giriniz (örn: 2).", variant: "destructive" });
        return false;
      }
    }
    return true;
  };

  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handlePrevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ─── TRENDYOL'A GÖNDER (BÜTÜN VARYANTLAR BİR ARADA) ─────────────────────────
  const handleSubmitAll = async () => {
    if (tableVariants.length === 0) {
      toast({
        title: "Varyant Bulunamadı",
        description: "Lütfen en az 1 renk seçip 'Renk Ekle' butonuna basarak varyant tablosunu doldurunuz.",
        variant: "destructive",
      });
      return;
    }

    // Barkod, Stok ve Fiyat kontrolleri
    for (const v of tableVariants) {
      if (!v.barcode.trim()) {
        toast({ title: "Eksik Barkod", description: `${v.color} varyantı için barkod girilmelidir.`, variant: "destructive" });
        return;
      }
      if (!v.stockCode.trim()) {
        toast({ title: "Eksik Stok Kodu", description: `${v.color} varyantı için stok kodu girilmelidir.`, variant: "destructive" });
        return;
      }
      if (!v.salePrice || Number(v.salePrice) <= 0) {
        toast({ title: "Eksik Fiyat", description: `${v.color} varyantı için geçerli satış fiyatı giriniz.`, variant: "destructive" });
        return;
      }
      if (v.images.length === 0) {
        const proceed = await confirm({
          title: `Görsel Uyarısı: ${v.color}`,
          message: `${v.color} renk varyantı için fotoğraf eklemediniz. Trendyol fotoğralsız ürünleri reddedebilir. Yine de devam edilsin mi?`,
          confirmText: "Yine de Gönder",
          cancelText: "Fotoğraf Ekle",
          variant: "warning",
        });
        if (!proceed) return;
      }
    }

    setIsSubmitting(true);

    try {
      const commonBrandId = selectedBrand?.id || 1066155;
      const commonBrandName = selectedBrand?.name || brandSearchQuery || "ahenk tasarım";
      const detectedCat = detectCategoryFromProduct({
        title,
        categoryName: selectedCategory?.name || categorySearchQuery,
        category_id: selectedCategory?.id,
      });
      const commonCategoryId = selectedCategory?.id || detectedCat.id;

      const itemsToSubmit = tableVariants.map((v, idx) => {
        const vHeight = v.height?.trim() || "";
        const vSize = v.size || determineSizeFromHeight(vHeight);
        // Eğer satırda özel girilmiş ürün başlığı varsa onu kullan, yoksa ana başlığı doğrudan kullan (arkasına parantez içi boyut/renk ekleme)
        const finalTitle = v.title?.trim() ? v.title.trim() : title.trim();

        // Kategori niteliklerine göre dinamik ve güvenli attribute eşleştirmesi
        let variantAttributes: any[] = [];

        if (Array.isArray(categoryAttributes) && categoryAttributes.length > 0) {
          // Kategoride tanımlı attribute'lar varsa, sadece kategoride olanları eşleştir:
          for (const catAttr of categoryAttributes) {
            const attrId = catAttr.attribute?.id;
            const attrName = (catAttr.attribute?.name || "").toLowerCase();
            const values = catAttr.attributeValues || [];

            // Değer bulucu yardımcı
            const findValId = (valStr: string) => {
              if (!valStr) return null;
              const clean = valStr.trim().toLowerCase();
              const matched = values.find(
                (val: any) => (val.name || val.value || "").trim().toLowerCase() === clean
              );
              return matched?.id;
            };

            // 1. Renk
            if (attrName.includes("renk") || attrId === 47 || attrId === 348) {
              const targetColor = v.color || "Beyaz";
              const valId = findValId(targetColor);
              if (valId) {
                variantAttributes.push({ attributeId: attrId, attributeValueId: valId });
              } else {
                variantAttributes.push({ attributeId: attrId, customAttributeValue: targetColor });
              }
              continue;
            }

            // 2. Materyal / Malzeme
            if (attrName.includes("materyal") || attrName.includes("malzeme") || attrId === 338) {
              const targetMat = material || "Plastik";
              const valId = findValId(targetMat);
              if (valId) {
                variantAttributes.push({ attributeId: attrId, attributeValueId: valId });
              } else {
                variantAttributes.push({ attributeId: attrId, customAttributeValue: targetMat });
              }
              continue;
            }

            // 3. Parça Sayısı
            if (attrName.includes("parça") || attrId === 1073) {
              const targetCount = pieceCount || "1";
              const valId = findValId(targetCount);
              if (valId) {
                variantAttributes.push({ attributeId: attrId, attributeValueId: valId });
              } else {
                variantAttributes.push({ attributeId: attrId, customAttributeValue: targetCount });
              }
              continue;
            }

            // 4. Menşei
            if (attrName.includes("menşe") || attrId === 1040) {
              const targetOrigin = origin || "TR - (Türkiye)";
              const valId = findValId(targetOrigin) || findValId("Türkiye") || findValId("TR");
              if (valId) {
                variantAttributes.push({ attributeId: attrId, attributeValueId: valId });
              } else {
                variantAttributes.push({ attributeId: attrId, customAttributeValue: targetOrigin });
              }
              continue;
            }

            // 5. Boyut / Ebat (Mini, Midi, Büyük Boy)
            if (attrName.includes("boyut") || attrName.includes("ebat") || attrId === 4402) {
              const targetSize = vSize || "Midi";
              const valId = findValId(targetSize);
              if (valId) {
                variantAttributes.push({ attributeId: attrId, attributeValueId: valId });
              } else {
                variantAttributes.push({ attributeId: attrId, customAttributeValue: targetSize });
              }
              continue;
            }

            // 6. Yükseklik / Boy
            if ((attrName.includes("yükseklik") || attrName === "boy") && vHeight) {
              const valId = findValId(vHeight);
              if (valId) {
                variantAttributes.push({ attributeId: attrId, attributeValueId: valId });
              } else {
                variantAttributes.push({ attributeId: attrId, customAttributeValue: vHeight });
              }
              continue;
            }

            // 7. Zorunlu (required/mandatory) alan olup yukarıdakilerle eşleşmediyse ilk geçerli değeri ver
            if ((catAttr.required || catAttr.mandatory) && values.length > 0) {
              variantAttributes.push({
                attributeId: attrId,
                attributeValueId: values[0].id,
              });
            }
          }
        } else {
          // Kategoride HİÇBİR attribute tanımlı DEĞİLSE (Örn: Figür kategorisi gibi):
          // Boş bırakılır çünkü tanımsız attributeId göndermek Trendyol API hatasına sebep olur
          variantAttributes = [];
        }

        const effectiveModelCode = (!hasCategorySlicers && tableVariants.length > 1)
          ? (v.stockCode.trim() || `${modelCode.trim()}-${vHeight || v.color || (idx + 1)}`)
          : modelCode.trim();

        return {
          title: finalTitle,
          barcode: v.barcode.trim(),
          stockCode: v.stockCode.trim(),
          modelCode: effectiveModelCode,
          productMainId: effectiveModelCode,
          salePrice: Number(v.salePrice) || 330,
          listPrice: Number((v as any).listPrice || v.salePrice) || 330,
          quantity: Math.min(Math.max(Number(v.stock) || 20, 1), 10000),
          images: v.images,
          desi: Number(desi) || 2,
          vatRate: Number(v.vatRate) || 20,
          attributes: variantAttributes,
        };
      });

      const payload = {
        model_code: modelCode.trim(),
        product_main_id: modelCode.trim(),
        title: title.trim(),
        brand_id: commonBrandId,
        brand_name: commonBrandName,
        category_id: commonCategoryId,
        trendyol_category_id: commonCategoryId,
        description: sanitizeTrendyolDescription(description),
        desi: Number(desi) || 2,
        vat_rate: Number(bulkVat) || 20,
        cargo_company: cargoCompany,
        items: itemsToSubmit,
      };

      const res = await fetch("/api/trendyol-submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        await confirm({
          title: "Trendyol Gönderim Uyarısı",
          message:
            data.error ||
            "Trendyol API isteği kabul etmedi. Lütfen barkod ve model kodu bilgilerini kontrol edip tekrar deneyin.",
          confirmText: "Tamam",
          variant: "danger",
        });
        return;
      }

      if (data.status === "approved") {
        await confirm({
          title: "🎉 Ürün Trendyol Tarafından Onaylandı!",
          message: `Model Koduna (${modelCode}) bağlı ${itemsToSubmit.length} adet ürün Trendyol kataloğuna onaylı olarak eklendi ve yayına alındı.`,
          confirmText: "Yüklü Ürünlerime Git",
          variant: "info",
        });
      } else {
        await confirm({
          title: "🚀 Ürün Trendyol'a İletildi",
          message: `Model Koduna (${modelCode}) bağlı ${itemsToSubmit.length} adet ürün Trendyol sistemine başarıyla kaydedildi (Takip Kodu: ${data.batch_id || "Kayıtlı"}). Trendyol'un ürünleri listelemesi birkaç dakika sürebilir.`,
          confirmText: "Yüklü Ürünlerime Git",
          variant: "info",
        });
      }

      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      await confirm({
        title: "Sistem Hatası",
        message: (err as Error).message || "Ürün yüklenirken beklenmedik bir hata oluştu.",
        confirmText: "Tamam",
        variant: "danger",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const allChecked = tableVariants.length > 0 && tableVariants.every((r) => r.checked);

  return (
    <div className="space-y-6 pb-20">
      {/* Kopyalama Modu veya Özel Başlık Varsa Üst Bilgi Başlığı */}
      {modeTitle && (
        <div className="flex items-center justify-between p-4 bg-orange-500/10 border border-orange-500/20 rounded-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/20 text-orange-600 flex items-center justify-center">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                {modeTitle}
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400 font-semibold">
                  Trendyol Panel
                </span>
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Mevcut ürünün tüm özellikleri kopyalandı • Resim, barkod ve stok kodu boş bırakıldı.
              </p>
            </div>
          </div>
          {onClose && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs h-9 font-bold cursor-pointer"
            >
              ← Geri Dön
            </Button>
          )}
        </div>
      )}

      {/* Gizli Çoklu Görsel Seçim Inputu */}
      <input
        type="file"
        ref={multiFileInputRef}
        multiple
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleUploadFiles(e.target.files);
            e.target.value = "";
          }
        }}
      />

      {/* ─── TRENDYOL PANELİ FORM ALANI (Sol Adımlar + Sağ İçerik) ────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* SOL: STEPS CONTAINER (Trendyol Seller Center Birebir) */}
        <div className="lg:col-span-3 bg-card border border-border rounded-2xl p-4 shadow-sm sticky top-4 space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-2 pb-1">
            İşlem Adımları
          </p>

          <ul className="space-y-1">
            {steps.map((step, idx) => {
              const isActive = currentStep === step.id;
              const isPast = currentStep > step.id;

              return (
                <li
                  key={step.id}
                  onClick={() => {
                    if (isPast || isActive || validateStep(currentStep)) {
                      setCurrentStep(step.id);
                    }
                  }}
                  className={`relative flex items-start gap-3 p-3 rounded-xl transition-all cursor-pointer select-none ${
                    isActive
                      ? "bg-orange-500/15 text-orange-600 border border-orange-500/40 shadow-xs font-bold"
                      : isPast
                      ? "text-foreground hover:bg-muted/60 font-medium"
                      : "text-muted-foreground/60 hover:text-muted-foreground hover:bg-muted/30 font-medium"
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 transition-colors ${
                      isActive
                        ? "bg-orange-600 text-white shadow-xs"
                        : isPast
                        ? "bg-emerald-500 text-white"
                        : "bg-muted text-muted-foreground border border-border"
                    }`}
                  >
                    {isPast ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : idx + 1}
                  </div>

                  <div className="flex-1 min-w-0">
                    <span className={`text-xs truncate block ${isActive ? "text-orange-600 dark:text-orange-400 font-bold" : ""}`}>
                      {step.title}
                    </span>
                    <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                      {step.desc}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="pt-3 border-t border-border mt-3 px-2">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1.5">
              <span>İlerleme</span>
              <span className="font-bold text-foreground">
                %{Math.round(((currentStep + 1) / steps.length) * 100)}
              </span>
            </div>
            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-orange-600 transition-all duration-300 rounded-full"
                style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* SAĞ: İÇERİK BÖLÜMÜ (single-product__right) */}
        <div className="lg:col-span-9 space-y-6">
          {importedSource && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-orange-500/5 border border-orange-500/30 flex items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
                  {importedSource === "makerworld" ? "MW" : "STK"}
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground flex items-center gap-2">
                    {importedSource === "makerworld"
                      ? "MakerWorld'den Ürün Bilgileri Aktarıldı"
                      : "Stok Kataloğundan Ürün Bilgileri Aktarıldı"}
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-700 dark:text-orange-300 font-semibold">
                      Hazır Taslak
                    </span>
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Görseller, başlık, açıklama ve fiyat bilgileri yüklendi. Bilgileri düzenleyebilir ve eksik Trendyol alanlarını onaylayabilirsiniz.
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setImportedSource(null)}
                className="h-7 text-xs text-muted-foreground hover:text-foreground"
              >
                Gizle
              </Button>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              ADIM 0: ÜRÜN BİLGİLERİ
             ═══════════════════════════════════════════════════════════════ */}
          {currentStep === 0 && (
            <div className="bg-card border border-border rounded-2xl p-6 sm:p-7 shadow-sm space-y-6 animate-in fade-in duration-200">
              <div className="border-b border-border pb-4">
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <PackagePlus className="w-5 h-5 text-orange-600" />
                  Ürün Bilgileri
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Ürün bilgileri, ürününüzle ilgili temel kimlik bilgilerini içerir.
                </p>
              </div>

              {/* Ürün Adı */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-foreground flex items-center gap-1">
                    Ürün Adı <span className="text-red-500">*</span>
                  </Label>
                  <span className="text-[10px] text-muted-foreground">{title.length}/100</span>
                </div>
                <Input
                  value={title}
                  maxLength={100}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Örn: Ahenk Tasarım Modern El Yapımı Alçı Vazo"
                  className="text-xs h-10 font-medium"
                />
              </div>

              {/* Model Kodu */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-foreground flex items-center gap-1">
                    Model Kodu <span className="text-red-500">*</span>
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setModelCode(generateDefaultModelCode(title || "MOD"))}
                    className="h-6 text-[11px] text-orange-600 hover:text-orange-700 px-2 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Yeni Kod Üret
                  </Button>
                </div>
                <Input
                  value={modelCode}
                  onChange={(e) => setModelCode(e.target.value)}
                  placeholder="Örn: MOD-AHENK-VAZ-01"
                  className="text-xs h-10 font-mono font-bold uppercase tracking-wider"
                />
                <p className="text-[11px] text-muted-foreground">
                  Farklı renk varyantları bu model kodu altında gruplanır.
                </p>
              </div>

              {/* Kategori Seçimi */}
              <div ref={categoryContainerRef} className="space-y-1.5 relative">
                <Label className="text-xs font-bold text-foreground flex items-center gap-1">
                  Kategori <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    value={selectedCategory ? selectedCategory.name : categorySearchQuery}
                    onChange={(e) => {
                      isCategoryFocusedRef.current = true;
                      setSelectedCategory(null);
                      setCategorySearchQuery(e.target.value);
                    }}
                    onFocus={() => {
                      isCategoryFocusedRef.current = true;
                      if (!selectedCategory && categorySuggestions.length > 0) {
                        setShowCategoryDropdown(true);
                      }
                    }}
                    placeholder="Kategori aramak için en az 2 harf yazın (Örn: Figür, Vazo, Biblo...)"
                    className="text-xs h-10 pr-16"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                    {selectedCategory && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCategory(null);
                          setCategorySearchQuery("");
                          setCategorySuggestions([]);
                          setShowCategoryDropdown(false);
                          isCategoryFocusedRef.current = false;
                        }}
                        className="text-muted-foreground hover:text-foreground text-xs p-1 rounded-full hover:bg-muted cursor-pointer"
                        title="Kategoriyi Temizle"
                      >
                        ✕
                      </button>
                    )}
                    {isSearchingCategory ? (
                      <Loader2 className="w-4 h-4 animate-spin text-orange-600" />
                    ) : (
                      <Tag className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                </div>

                {showCategoryDropdown && categorySuggestions.length > 0 && !selectedCategory && (
                  <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-background border border-border rounded-xl shadow-xl max-h-60 overflow-y-auto p-1.5 space-y-1">
                    {categorySuggestions.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setSelectedCategory(cat);
                          setCategorySearchQuery(cat.name);
                          setShowCategoryDropdown(false);
                          isCategoryFocusedRef.current = false;
                        }}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setSelectedCategory(cat);
                          setCategorySearchQuery(cat.name);
                          setShowCategoryDropdown(false);
                          isCategoryFocusedRef.current = false;
                        }}
                        className="w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-orange-500/10 hover:text-orange-600 transition-colors flex items-center justify-between cursor-pointer"
                      >
                        <span className="font-medium">{cat.name}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">ID: {cat.id}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Marka Seçimi */}
              <div className="space-y-3 pt-2">
                <Label className="text-xs font-bold text-foreground flex items-center gap-1">
                  Ürün Markası <span className="text-red-500">*</span>
                </Label>

                <div className="flex items-center gap-4 text-xs font-semibold">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="radio"
                      name="brandType"
                      checked={brandType === "custom"}
                      onChange={() => {
                        setBrandType("custom");
                        setSelectedBrand({ id: 1066155, name: "ahenk tasarım" });
                        setBrandSearchQuery("ahenk tasarım");
                        setShowBrandDropdown(false);
                        isBrandFocusedRef.current = false;
                      }}
                      className="text-orange-600 focus:ring-orange-500"
                    />
                    <span>Marka Seç / Ara</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none text-muted-foreground hover:text-foreground">
                    <input
                      type="radio"
                      name="brandType"
                      checked={brandType === "nobrand"}
                      onChange={() => {
                        setBrandType("nobrand");
                        setSelectedBrand({ id: 1066155, name: "Genel Markalar" });
                        setShowBrandDropdown(false);
                        isBrandFocusedRef.current = false;
                      }}
                      className="text-orange-600 focus:ring-orange-500"
                    />
                    <span>Ürünümün markası yok (Genel Markalar)</span>
                  </label>
                </div>

                {brandType === "custom" && (
                  <div ref={brandContainerRef} className="relative">
                    <Input
                      value={selectedBrand ? selectedBrand.name : brandSearchQuery}
                      onChange={(e) => {
                        isBrandFocusedRef.current = true;
                        setSelectedBrand(null);
                        setBrandSearchQuery(e.target.value);
                      }}
                      onFocus={() => {
                        isBrandFocusedRef.current = true;
                        if (!selectedBrand && brandSuggestions.length > 0) {
                          setShowBrandDropdown(true);
                        }
                      }}
                      placeholder="Marka aramak için en az 2 harf girin (Örn: ahenk tasarım, Karaca...)"
                      className="text-xs h-10 pr-16 font-medium"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                      {selectedBrand && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedBrand(null);
                            setBrandSearchQuery("");
                            setBrandSuggestions([]);
                            setShowBrandDropdown(false);
                            isBrandFocusedRef.current = false;
                          }}
                          className="text-muted-foreground hover:text-foreground text-xs p-1 rounded-full hover:bg-muted cursor-pointer"
                          title="Markayı Temizle"
                        >
                          ✕
                        </button>
                      )}
                      {isSearchingBrand ? (
                        <Loader2 className="w-4 h-4 animate-spin text-orange-600" />
                      ) : (
                        <Store className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>

                    {showBrandDropdown && brandSuggestions.length > 0 && !selectedBrand && (
                      <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-background border border-border rounded-xl shadow-xl max-h-52 overflow-y-auto p-1.5 space-y-1">
                        {brandSuggestions.map((brand) => (
                          <button
                            key={brand.id}
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setSelectedBrand(brand);
                              setBrandSearchQuery(brand.name);
                              setShowBrandDropdown(false);
                              isBrandFocusedRef.current = false;
                            }}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setSelectedBrand(brand);
                              setBrandSearchQuery(brand.name);
                              setShowBrandDropdown(false);
                              isBrandFocusedRef.current = false;
                            }}
                            className="w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-orange-500/10 hover:text-orange-600 transition-colors flex items-center justify-between cursor-pointer"
                          >
                            <span className="font-semibold">{brand.name}</span>
                            <span className="text-[10px] text-muted-foreground font-mono">ID: {brand.id}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              ADIM 1: ÜRÜN AÇIKLAMASI
             ═══════════════════════════════════════════════════════════════ */}
          {currentStep === 1 && (
            <div className="bg-card border border-border rounded-2xl p-6 sm:p-7 shadow-sm space-y-6 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
                <div>
                  <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                    <FileText className="w-5 h-5 text-orange-600" />
                    Ürün Açıklaması
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Açık ve detaylı bir ürün açıklaması, <strong>satışlarınızı artırır</strong> ve <strong>iade riskini azaltır.</strong>
                  </p>
                </div>

                <Button
                  type="button"
                  size="sm"
                  onClick={handleGenerateAiDescription}
                  disabled={isAiGenerating}
                  className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs h-9 px-4 rounded-xl shadow-md cursor-pointer shrink-0"
                >
                  {isAiGenerating ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      Oluşturuluyor...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                      Yapay Zeka ile Hızlı Açıklama Oluştur
                    </>
                  )}
                </Button>
              </div>

              {/* Araç Çubuğu */}
              <div className="border border-border rounded-xl overflow-hidden bg-background shadow-2xs">
                <div className="flex flex-wrap items-center justify-between gap-1 p-2 bg-muted/40 border-b border-border text-xs">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      title="Kalın"
                      onClick={() => executeCommand("bold")}
                      className="p-1.5 hover:bg-muted rounded-md text-foreground cursor-pointer font-bold w-7 h-7 flex items-center justify-center"
                    >
                      B
                    </button>
                    <button
                      type="button"
                      title="İtalik"
                      onClick={() => executeCommand("italic")}
                      className="p-1.5 hover:bg-muted rounded-md text-foreground cursor-pointer italic w-7 h-7 flex items-center justify-center font-serif"
                    >
                      I
                    </button>
                    <button
                      type="button"
                      title="Altı Çizili"
                      onClick={() => executeCommand("underline")}
                      className="p-1.5 hover:bg-muted rounded-md text-foreground cursor-pointer underline w-7 h-7 flex items-center justify-center"
                    >
                      U
                    </button>

                    <div className="w-px h-4 bg-border mx-1" />

                    <button
                      type="button"
                      title="Sola Hizala"
                      onClick={() => executeCommand("justifyLeft")}
                      className="p-1.5 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      L
                    </button>
                    <button
                      type="button"
                      title="Ortala"
                      onClick={() => executeCommand("justifyCenter")}
                      className="p-1.5 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      C
                    </button>
                    <button
                      type="button"
                      title="Sağa Hizala"
                      onClick={() => executeCommand("justifyRight")}
                      className="p-1.5 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      R
                    </button>

                    <div className="w-px h-4 bg-border mx-1" />

                    <button
                      type="button"
                      title="Madde İşaretli Liste"
                      onClick={() => executeCommand("insertUnorderedList")}
                      className="p-1.5 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground cursor-pointer font-bold text-xs"
                    >
                      • Liste
                    </button>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={toggleHtmlMode}
                    className="h-7 text-[11px] font-bold px-2.5 cursor-pointer"
                  >
                    {isHtmlView ? (
                      <>
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        Görsel Editör
                      </>
                    ) : (
                      <>
                        <Code className="w-3.5 h-3.5 mr-1" />
                        HTML Göster
                      </>
                    )}
                  </Button>
                </div>

                {isHtmlView ? (
                  <Textarea
                    value={htmlContent}
                    onChange={(e) => setHtmlContent(e.target.value)}
                    rows={12}
                    className="w-full p-4 font-mono text-xs border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-muted/20"
                  />
                ) : (
                  <div
                    ref={editorRef}
                    contentEditable
                    suppressContentEditableWarning
                    onInput={handleEditorInput}
                    onPaste={handlePaste}
                    dir="ltr"
                    className="p-4 min-h-[220px] text-xs leading-relaxed focus:outline-none prose prose-sm dark:prose-invert max-w-none text-left"
                    style={{ textAlign: "left", direction: "ltr" }}
                  />
                )}
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              ADIM 2: ÜRÜN ÖZELLİKLERİ & KARGO
             ═══════════════════════════════════════════════════════════════ */}
          {currentStep === 2 && (
            <div className="bg-card border border-border rounded-2xl p-6 sm:p-7 shadow-sm space-y-6 animate-in fade-in duration-200">
              <div className="border-b border-border pb-4">
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Layers className="w-5 h-5 text-orange-600" />
                  Ürün Özellikleri & Kargo Bilgileri
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Kategori nitelikleri ve kargo desi parametreleri.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">Materyal *</Label>
                  <select
                    value={material}
                    onChange={(e) => setMaterial(e.target.value)}
                    className="w-full h-10 px-3 text-xs rounded-xl border border-input bg-background font-medium focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  >
                    <option value="">Materyal Seçin</option>
                    {TRENDYOL_MATERIALS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">Parça Sayısı *</Label>
                  <select
                    value={pieceCount}
                    onChange={(e) => setPieceCount(e.target.value)}
                    className="w-full h-10 px-3 text-xs rounded-xl border border-input bg-background font-medium focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  >
                    <option value="">Parça Sayısı Seçin</option>
                    {TRENDYOL_PIECE_COUNTS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">Menşei *</Label>
                  <select
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                    className="w-full h-10 px-3 text-xs rounded-xl border border-input bg-background font-medium focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  >
                    <option value="">Menşei Seçin</option>
                    {TRENDYOL_ORIGINS.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">Desi Bilgisi *</Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={desi}
                    onChange={(e) => setDesi(e.target.value)}
                    placeholder="Örn: 2"
                    className="text-xs h-10"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              ADIM 3: SATIŞ VE VARYANT BİLGİLERİ (TRENDYOL BİREBİR EKRANI)
             ═══════════════════════════════════════════════════════════════ */}
          {currentStep === 3 && (
            <div className="bg-card border border-border rounded-2xl p-6 sm:p-7 shadow-sm space-y-6 animate-in fade-in duration-200">
              {/* Başlık ve Sağdaki Eğitim Linki */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-4">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
                    <Store className="w-5 h-5 text-orange-600" />
                    Satış ve Varyant Bilgileri
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Model Kodu: <span className="font-mono font-bold text-foreground">{modelCode || "Belirtilmedi"}</span> | Kategori: <span className="font-medium text-foreground">{selectedCategory?.name || "Kategori Seçilmedi"}</span>
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    onClick={() => handleAddNewCloneRow()}
                    className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs h-9 px-4 rounded-xl shadow-sm cursor-pointer"
                  >
                    <Plus className="w-4 h-4 mr-1.5" />
                    + Yeni Ürün / Kopya Ekle
                  </Button>
                  <a
                    href="https://partner.trendyol.com"
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Trendyol Rehberi
                  </a>
                </div>
              </div>

              {/* ─── KATEGORİ VARYANT (SLICER) DESTEĞİ KONTROLÜ & TEK TEK EKLEME BANNERI ─── */}
              {!hasCategorySlicers && (
                <div className="p-4 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-500/10 dark:bg-amber-950/25 space-y-3">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <h4 className="text-xs sm:text-sm font-bold text-amber-900 dark:text-amber-300">
                        Bu Kategoride Trendyol Varyant Eklemeye İzin Vermiyor!
                      </h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Seçilen <strong className="text-foreground">{selectedCategory?.name}</strong> kategorisinde (Figür, Biblo vb.) Trendyol renk/beden gibi doğrudan varyant girişini desteklemez.
                      </p>
                      <p className="text-xs font-semibold text-foreground pt-0.5">
                        Farklı renk ve boyutlardaki ürünlerinizi aynı Model Kodu (<span className="font-mono text-orange-600 font-bold">{modelCode || "OTOMATİK"}</span>) altında <strong>Tek Tek</strong> eklemek ister misiniz?
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-amber-200/70 dark:border-amber-900/50">
                    <Button
                      type="button"
                      onClick={() => handleAddNewCloneRow()}
                      className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs h-9 px-4 rounded-lg shadow-sm cursor-pointer"
                    >
                      <Plus className="w-4 h-4 mr-1.5" />
                      Evet, Tek Tek / Kopya Ürün Ekle
                    </Button>
                    <span className="text-[11px] text-muted-foreground">
                      Her kopya bağımsız barkod, stok kodu, %20 KDV, TR menşei ve kendi görseliyle oluşturulur; ürün adı, fiyat ve stok bilgilerini siz girersiniz.
                    </span>
                  </div>
                </div>
              )}

              {/* ─── EN ÇOK FİLTRELENEN ALANLAR (ÖNERİLEN): BOYUT ─── */}
              <div className="border border-border/80 rounded-xl p-4 bg-muted/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-foreground">En Çok Filtrelenen Alanlar</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-400 border border-orange-200 dark:border-orange-800">
                      Önerilen
                    </span>
                  </div>
                  <span className="text-[11px] text-muted-foreground font-medium">
                    10 cm altı: <strong>Mini</strong> | 10 - 20 cm: <strong>Midi</strong> | 20 cm+: <strong>Büyük Boy</strong>
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Bu kategoride müşteriler en çok <strong>Boyut</strong> özelliğine göre filtreleme yapıyor. Yükseklik seçtiğinizde ürün boyutu otomatik hesaplanır veya tablodan kendiniz belirleyebilirsiniz.
                </p>
              </div>

              {/* Slicer 1: Yükseklik */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">
                  Varsayılan Yükseklik Seçimi
                </Label>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Aşağıda eklenecek yeni ürünler ve varyantlar için varsayılan yükseklik belirleyin (Tablodan her satırın yüksekliğini tek tek değiştirebilirsiniz).
                </p>
                <div className="relative">
                  <select
                    value={selectedHeight}
                    onChange={(e) => {
                      setSelectedHeight(e.target.value);
                    }}
                    className="w-full h-10 px-3 pr-10 text-xs rounded-xl border border-input bg-background font-medium appearance-none focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  >
                    <option value="">Yükseklik Seçin (Örn: 10 cm, 15 cm, 20 cm, 25 cm)</option>
                    {selectedHeight && !TRENDYOL_HEIGHTS.includes(selectedHeight) && (
                      <option value={selectedHeight}>
                        {selectedHeight} {determineSizeFromHeight(selectedHeight) ? `(${determineSizeFromHeight(selectedHeight)})` : ""}
                      </option>
                    )}
                    {TRENDYOL_HEIGHTS.map((h) => (
                      <option key={h} value={h}>
                        {h} {determineSizeFromHeight(h) ? `(${determineSizeFromHeight(h)})` : ""}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none text-muted-foreground">
                    {selectedHeight && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedHeight("");
                        }}
                        className="pointer-events-auto hover:text-foreground cursor-pointer p-0.5"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <ChevronDown className="w-4 h-4 opacity-70" />
                  </div>
                </div>
              </div>

              {/* Slicer 2: Renk (Kategori destekliyorsa veya serbest renk seçimi) */}
              <div className="space-y-2">
                <div>
                  <Label className="text-xs font-semibold text-foreground">
                    Renk Seçimi & Varyant Ekleme
                  </Label>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                    Müşterilerin filtreleme alanında gösterilecek rengi skaladan seçin. Ürünün detaylı renk bilgisini ise renk ismi alanına girebilirsiniz.
                  </p>
                </div>

                {/* Renk Skalası + Renk İsmi + Renk Ekle Butonu */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                  <div className="sm:col-span-5">
                    <select
                      value={inputColorScale}
                      onChange={(e) => {
                        const val = e.target.value;
                        setInputColorScale(val);
                        setInputColorName(val);
                      }}
                      className="w-full h-10 px-3 text-xs rounded-xl border border-input bg-background font-medium focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    >
                      <option value="">Renk Skalası</option>
                      {TRENDYOL_WEB_COLORS.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-5">
                    <Input
                      value={inputColorName}
                      onChange={(e) => setInputColorName(e.target.value)}
                      placeholder="Renk İsmi (Örn: Açık Bej, Koyu Gri)"
                      className="text-xs h-10"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAddColor}
                      disabled={!inputColorScale}
                      className="w-full h-10 text-xs font-bold border-border hover:border-orange-500/60 hover:text-orange-600 cursor-pointer"
                    >
                      Varyant Ekle
                    </Button>
                  </div>
                </div>

                {/* Eklenen Renk/Varyant Çipleri */}
                {colorChips.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    {colorChips.map((chip) => (
                      <span
                        key={chip.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-border bg-muted/40 text-xs font-semibold text-foreground shadow-2xs"
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full border border-black/10 shrink-0"
                          style={{
                            backgroundColor: COLOR_HEX_MAP[chip.webColor] || "#9e9e9e",
                          }}
                        />
                        <span>{chip.customName || chip.webColor}</span>
                        {chip.height && (
                          <span className="text-[10px] text-muted-foreground font-medium bg-background/80 px-1.5 py-0.5 rounded border border-border/50">
                            {chip.height}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveColorChip(chip.id)}
                          className="hover:text-red-500 cursor-pointer ml-0.5"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* ─── TOPLU GÜNCELLEME ÇUBUĞU (Trendyol Birebir) ─── */}
              {tableVariants.length > 0 && (
                <div className="pt-2">
                  <div className="flex flex-wrap items-end gap-3 p-3.5 bg-muted/30 border border-border rounded-xl">
                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold text-muted-foreground">Trendyol Satış Fiyatı</Label>
                      <Input
                        value={bulkPrice}
                        onChange={(e) => setBulkPrice(e.target.value)}
                        placeholder="0,00"
                        className="text-xs h-9 w-28 bg-background font-medium"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold text-muted-foreground">KDV</Label>
                      <select
                        value={bulkVat}
                        onChange={(e) => setBulkVat(e.target.value)}
                        className="h-9 px-3 text-xs rounded-md border border-input bg-background font-medium w-24 focus:outline-none"
                      >
                        <option value="20">%20</option>
                        <option value="10">%10</option>
                        <option value="1">%1</option>
                        <option value="0">%0</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold text-muted-foreground">Stok</Label>
                      <Input
                        value={bulkStock}
                        onChange={(e) => setBulkStock(e.target.value)}
                        placeholder="0"
                        className="text-xs h-9 w-24 bg-background font-medium"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold text-muted-foreground">Toplu Yükseklik</Label>
                      <select
                        value={bulkHeight}
                        onChange={(e) => setBulkHeight(e.target.value)}
                        className="h-9 px-3 text-xs rounded-md border border-input bg-background font-medium w-32 focus:outline-none"
                      >
                        <option value="">Değiştirme</option>
                        {bulkHeight && !TRENDYOL_HEIGHTS.includes(bulkHeight) && (
                          <option value={bulkHeight}>{bulkHeight}</option>
                        )}
                        {TRENDYOL_HEIGHTS.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleApplyBulkUpdate}
                      className="h-9 px-4 text-xs font-bold border-border hover:bg-muted cursor-pointer"
                    >
                      Güncelle
                    </Button>
                  </div>
                </div>
              )}

              {/* ─── VARYANT / ÜRÜN TABLOSU ─── */}
              <div className="border border-border rounded-xl overflow-hidden bg-background">
                {tableVariants.length === 0 ? (
                  <div className="py-16 px-4 flex flex-col items-center justify-center text-center space-y-4">
                    <div className="relative w-20 h-20 flex items-center justify-center">
                      <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shadow-sm">
                        <Store className="w-8 h-8 text-amber-600" />
                      </div>
                      <span className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-orange-600 text-white flex items-center justify-center font-bold text-sm shadow-md">
                        +
                      </span>
                    </div>

                    <div className="space-y-1.5 max-w-md">
                      <h4 className="text-sm font-bold text-foreground">
                        Henüz ürün veya varyant eklenmedi!
                      </h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {!hasCategorySlicers
                          ? "Bu kategoride varyant eklenmiyor. Aynı model kodu altında tek tek ürün girişi yapmak için butona tıklayın."
                          : "Satış bilgilerini girmek için yukarıdan Renk seçip Varyant Ekle'ye basabilir veya doğrudan kopya ürün ekleyebilirsiniz."}
                      </p>
                    </div>

                    <Button
                      type="button"
                      onClick={() => handleAddNewCloneRow()}
                      className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs h-10 px-5 rounded-xl shadow-md cursor-pointer"
                    >
                      <Plus className="w-4 h-4 mr-1.5" />
                      {hasCategorySlicers ? "+ Yeni Ürün Satırı Ekle" : "+ İlk Ürünü / Kopyayı Ekle"}
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="bg-[#f8fafc] dark:bg-muted/50 border-b border-border text-muted-foreground font-bold select-none">
                          <th className="p-3 w-10 text-center">
                            <input
                              type="checkbox"
                              checked={allChecked}
                              onChange={(e) => handleToggleSelectAll(e.target.checked)}
                              className="rounded text-orange-600 focus:ring-orange-500 cursor-pointer"
                            />
                          </th>
                          <th className="p-3 whitespace-nowrap min-w-[70px]">Görsel</th>
                          <th className="p-3 whitespace-nowrap min-w-[170px]">Ürün Başlığı</th>
                          <th className="p-3 whitespace-nowrap min-w-[100px]">Renk</th>
                          <th className="p-3 whitespace-nowrap min-w-[95px]">Yükseklik</th>
                          <th className="p-3 whitespace-nowrap min-w-[100px]">
                            <span className="flex items-center gap-1">
                              Boyut <span className="text-[10px] font-normal text-orange-600">(Filtre)</span>
                            </span>
                          </th>
                          <th className="p-3 whitespace-nowrap min-w-[120px]">Barkod</th>
                          <th className="p-3 whitespace-nowrap min-w-[120px]">Trendyol Satış Fiyatı</th>
                          <th className="p-3 whitespace-nowrap min-w-[85px]">Stok</th>
                          <th className="p-3 whitespace-nowrap min-w-[75px]">KDV</th>
                          <th className="p-3 whitespace-nowrap min-w-[75px]">
                            <span className="flex items-center gap-1">
                              ÖTV <HelpCircle className="w-3 h-3 opacity-60" />
                            </span>
                          </th>
                          <th className="p-3 whitespace-nowrap min-w-[130px]">Stok Kodu</th>
                          <th className="p-3 whitespace-nowrap min-w-[110px]">
                            <span className="flex items-center gap-1">
                              Parti/Lot <HelpCircle className="w-3 h-3 opacity-60" />
                            </span>
                          </th>
                          <th className="p-3 w-20 text-center">İşlem</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {tableVariants.map((row) => (
                          <tr key={row.id} className="hover:bg-muted/20 transition-colors">
                            {/* Checkbox */}
                            <td className="p-3 text-center">
                              <input
                                type="checkbox"
                                checked={row.checked}
                                onChange={(e) => handleUpdateRowField(row.id, "checked", e.target.checked)}
                                className="rounded text-orange-600 focus:ring-orange-500 cursor-pointer"
                              />
                            </td>

                            {/* Görsel Yükleme / Değiştirme */}
                            <td className="p-3">
                              {row.images.length === 0 ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveImageUploadRowId(row.id);
                                    setIsImageManagerOpen(true);
                                  }}
                                  className="w-14 h-14 rounded-xl border-2 border-dashed border-orange-400/80 bg-orange-500/5 hover:bg-orange-500/15 flex flex-col items-center justify-center text-orange-600 cursor-pointer transition-all shadow-2xs group hover:scale-105"
                                  title="Fotoğraf Ekle & Yönet"
                                >
                                  <Camera className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                  <span className="text-[9px] font-bold mt-0.5">Görsel Ekle</span>
                                </button>
                              ) : (
                                <div
                                  onClick={() => {
                                    setActiveImageUploadRowId(row.id);
                                    setIsImageManagerOpen(true);
                                  }}
                                  className="relative w-14 h-14 rounded-xl overflow-hidden border-2 border-orange-500/50 hover:border-orange-600 group cursor-pointer shadow-sm transition-all hover:scale-105"
                                  title="Görselleri Değiştirmek / Yönetmek İçin Tıklayın"
                                >
                                  <img
                                    src={row.images[0]}
                                    alt=""
                                    loading="lazy"
                                    decoding="async"
                                    className="w-full h-full object-cover transition-opacity duration-200"
                                  />
                                  <span className="absolute bottom-0 inset-x-0 bg-black/75 text-white text-[9px] font-bold text-center py-0.5 tracking-tight backdrop-blur-xs">
                                    {row.images.length} Görsel
                                  </span>
                                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1 text-white transition-opacity">
                                    <Eye className="w-4 h-4" />
                                  </div>
                                </div>
                              )}
                            </td>

                            {/* Ürün Başlığı (Tek tek veya varyant başlığı) */}
                            <td className="p-3">
                              <Input
                                value={row.title || ""}
                                onChange={(e) => handleUpdateRowField(row.id, "title", e.target.value)}
                                placeholder={title || "Ürün Adı (Boşsa ana başlık kullanılır)"}
                                className="h-8 text-xs font-medium w-48"
                              />
                            </td>

                            {/* Renk (Daire + Metin) */}
                            <td className="p-3 font-medium">
                              <div className="flex items-center gap-1.5 whitespace-nowrap">
                                <span
                                  className="w-3 h-3 rounded-full border border-black/10 shrink-0"
                                  style={{
                                    backgroundColor: COLOR_HEX_MAP[row.color] || "#9e9e9e",
                                  }}
                                />
                                <span>{row.customColorName || row.color}</span>
                              </div>
                            </td>

                            {/* Yükseklik (Satır Bazlı Seçilebilir Dropdown) */}
                            <td className="p-3 whitespace-nowrap">
                              <select
                                value={row.height || ""}
                                onChange={(e) => handleUpdateVariantHeight(row.id, e.target.value)}
                                className="h-8 px-2 text-xs rounded-md border border-input bg-background font-medium w-28 focus:ring-1 focus:ring-orange-500 focus:outline-none"
                              >
                                <option value="">Seçiniz</option>
                                {row.height && !TRENDYOL_HEIGHTS.includes(row.height) && (
                                  <option value={row.height}>{row.height}</option>
                                )}
                                {TRENDYOL_HEIGHTS.map((h) => (
                                  <option key={h} value={h}>
                                    {h}
                                  </option>
                                ))}
                              </select>
                            </td>

                            {/* Boyut (Mini, Midi, Büyük Boy) */}
                            <td className="p-3 whitespace-nowrap">
                              <select
                                value={row.size || determineSizeFromHeight(row.height || "")}
                                onChange={(e) => handleUpdateRowField(row.id, "size", e.target.value)}
                                className="h-8 px-2 text-xs rounded-md border border-orange-300 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-950/20 font-bold text-orange-700 dark:text-orange-400 w-24 focus:ring-1 focus:ring-orange-500 focus:outline-none"
                              >
                                <option value="">Seçiniz</option>
                                <option value="Mini">Mini (&lt;10cm)</option>
                                <option value="Midi">Midi (10-20cm)</option>
                                <option value="Büyük Boy">Büyük Boy (20cm+)</option>
                              </select>
                            </td>

                            {/* Barkod (Otomatik EAN-13, düzenlenebilir) */}
                            <td className="p-3">
                              <Input
                                value={row.barcode}
                                onChange={(e) => handleUpdateRowField(row.id, "barcode", e.target.value)}
                                className="h-8 text-xs font-mono font-medium w-28"
                              />
                            </td>

                            {/* Trendyol Satış Fiyatı (Boş, kullanıcı girer) */}
                            <td className="p-3">
                              <Input
                                type="number"
                                value={row.salePrice}
                                onChange={(e) => handleUpdateRowField(row.id, "salePrice", e.target.value)}
                                placeholder="0,00"
                                className="h-8 text-xs font-medium w-24"
                              />
                            </td>

                            {/* Stok (Boş, kullanıcı girer) */}
                            <td className="p-3">
                              <Input
                                type="number"
                                value={row.stock}
                                onChange={(e) => handleUpdateRowField(row.id, "stock", e.target.value)}
                                placeholder="0"
                                className="h-8 text-xs font-medium w-20"
                              />
                            </td>

                            {/* KDV (Sabit %20) */}
                            <td className="p-3">
                              <select
                                value={row.vatRate || "20"}
                                onChange={(e) => handleUpdateRowField(row.id, "vatRate", e.target.value)}
                                className="h-8 px-2 text-xs rounded-md border border-input bg-background font-medium w-16 focus:outline-none"
                              >
                                <option value="20">20</option>
                                <option value="10">10</option>
                                <option value="1">1</option>
                                <option value="0">0</option>
                              </select>
                            </td>

                            {/* ÖTV */}
                            <td className="p-3">
                              <Input
                                value={row.otv}
                                onChange={(e) => handleUpdateRowField(row.id, "otv", e.target.value)}
                                placeholder="0"
                                className="h-8 text-xs font-medium w-16"
                              />
                            </td>

                            {/* Stok Kodu (Otomatik üretilir, düzenlenebilir) */}
                            <td className="p-3">
                              <Input
                                value={row.stockCode}
                                onChange={(e) => handleUpdateRowField(row.id, "stockCode", e.target.value)}
                                className="h-8 text-xs font-mono font-medium w-32"
                              />
                            </td>

                            {/* Parti/Lot/SKT */}
                            <td className="p-3">
                              <Input
                                value={row.lotInfo}
                                onChange={(e) => handleUpdateRowField(row.id, "lotInfo", e.target.value)}
                                className="h-8 text-xs font-medium w-24"
                              />
                            </td>

                            {/* İşlemler: Kopya Oluştur (+1) ve Sil */}
                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleAddNewCloneRow(row)}
                                  className="text-muted-foreground hover:text-orange-600 p-1.5 rounded-md hover:bg-orange-50 dark:hover:bg-orange-950/30 transition-colors cursor-pointer"
                                  title="Bu Ürünün Kopyasını Oluştur (+1)"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveVariantRow(row.id)}
                                  className="text-muted-foreground hover:text-red-600 p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                                  title="Varyantı Sil"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              ALT GEZİNME VE GÖNDERİM ÇUBUĞU (FOOTER NAVIGATION)
             ═══════════════════════════════════════════════════════════════ */}
          <div className="flex items-center justify-between gap-4 pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePrevStep}
              disabled={currentStep === 0 || isSubmitting}
              className="text-xs h-10 px-4 font-bold cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4 mr-1.5" />
              Önceki Adım
            </Button>

            <div className="flex items-center gap-3">
              {currentStep < steps.length - 1 ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleNextStep}
                  className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs h-10 px-6 rounded-xl shadow-md cursor-pointer"
                >
                  Sonraki Adım
                  <ChevronRight className="w-4 h-4 ml-1.5" />
                </Button>
              ) : (
                /* TRENDYOL BİREBİR "ÜRÜNÜ ONAYA GÖNDER" BUTONU (SCREENSHOT SAĞ ALT) */
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSubmitAll}
                  disabled={isSubmitting}
                  className="bg-[#f27a1a] hover:bg-[#d9650d] text-white font-bold text-xs sm:text-sm h-11 px-8 rounded-lg shadow-lg cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Onaya Gönderiliyor...
                    </>
                  ) : (
                    "Ürünü Onaya Gönder"
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── ÇOKLU GÖRSEL YÖNETİMİ MODALI (Trendyol Max 8 Görsel) ─── */}
      <Dialog
        open={isImageManagerOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsImageManagerOpen(false);
            setActiveImageUploadRowId(null);
            setInputImageUrl("");
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {(() => {
            const currentVariant = tableVariants.find((r) => r.id === activeImageUploadRowId);
            if (!currentVariant) return null;

            return (
              <div className="space-y-5">
                <DialogHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <DialogTitle className="text-base font-bold flex items-center gap-2">
                        <ImageIcon className="w-5 h-5 text-orange-600" />
                        Görsel Yönetimi & Çoklu Yükleme
                      </DialogTitle>
                      <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                        <span className="font-semibold text-foreground">
                          {currentVariant.customColorName || currentVariant.color}
                        </span>{" "}
                        varyantı için görselleri düzenleyin (İlk görsel ana kapak görselidir).
                      </DialogDescription>
                    </div>
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-bold border ${
                        currentVariant.images.length === 0
                          ? "border-amber-500/40 text-amber-600 bg-amber-500/10"
                          : currentVariant.images.length >= 8
                          ? "border-emerald-500/40 text-emerald-600 bg-emerald-500/10"
                          : "border-orange-500/40 text-orange-600 bg-orange-500/10"
                      }`}
                    >
                      {currentVariant.images.length} / 8 Görsel
                    </span>
                  </div>
                </DialogHeader>

                {/* YÜKLEME SEÇENEKLERİ (Dosya Seç + URL ile Ekle) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3.5 bg-muted/30 border border-border rounded-xl">
                  {/* Dosyadan Çoklu Yükle */}
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                        handleUploadFiles(e.dataTransfer.files);
                      }
                    }}
                    className="space-y-2"
                  >
                    <input
                      type="file"
                      ref={multiFileInputRef}
                      multiple
                      accept="image/png,image/jpeg,image/webp,image/jpg"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          handleUploadFiles(e.target.files);
                          e.target.value = "";
                        }
                      }}
                    />
                    <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Upload className="w-3.5 h-3.5 text-orange-600" />
                      Bilgisayardan Yükle / Sürükle Bırak
                    </Label>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isUploadingImages || currentVariant.images.length >= 8}
                      onClick={() => multiFileInputRef.current?.click()}
                      className="w-full h-10 text-xs font-semibold border-dashed border-orange-400/80 hover:bg-orange-500/10 hover:border-orange-500 text-orange-700 dark:text-orange-300 cursor-pointer"
                    >
                      {isUploadingImages ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin text-orange-600" />
                          Hızlı Sıkıştırılıyor & Yükleniyor...
                        </>
                      ) : (
                        <>
                          <Camera className="w-4 h-4 mr-2" />
                          Fotoğrafları Seç veya Sürükle (Çoklu)
                        </>
                      )}
                    </Button>
                    <p className="text-[10px] text-muted-foreground">
                      PNG, JPG, WebP formatında birden fazla resim seçebilir veya sürükleyebilirsiniz (Otomatik optimize edilir).
                    </p>
                  </div>

                  {/* URL ile Ekle */}
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <LinkIcon className="w-3.5 h-3.5 text-blue-600" />
                      URL ile Görsel Ekle
                    </Label>
                    <div className="flex gap-1.5">
                      <Input
                        value={inputImageUrl}
                        onChange={(e) => setInputImageUrl(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddImageUrl();
                          }
                        }}
                        placeholder="https://... (veya virgülle çoklu)"
                        className="h-10 text-xs"
                        disabled={currentVariant.images.length >= 8}
                      />
                      <Button
                        type="button"
                        onClick={handleAddImageUrl}
                        disabled={!inputImageUrl.trim() || currentVariant.images.length >= 8}
                        className="h-10 px-3.5 text-xs font-bold bg-orange-600 hover:bg-orange-700 text-white shrink-0 cursor-pointer"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Ekle
                      </Button>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Doğrudan görsel linki yapıştırıp Ekle'ye basabilirsiniz.
                    </p>
                  </div>
                </div>

                {/* YÜKLENEN GÖRSELLER LİSTESİ (Galeri Görünümü) */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-muted-foreground" />
                      Yüklü Görseller ({currentVariant.images.length})
                    </h4>
                    {currentVariant.images.length > 0 && (
                      <button
                        type="button"
                        onClick={() => handleClearVariantImages(currentVariant.id)}
                        className="text-[11px] font-semibold text-red-500 hover:text-red-600 hover:underline cursor-pointer"
                      >
                        Tümünü Temizle
                      </button>
                    )}
                  </div>

                  {currentVariant.images.length === 0 ? (
                    <div className="py-10 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center text-center p-4">
                      <div className="w-12 h-12 rounded-xl bg-muted/60 flex items-center justify-center text-muted-foreground mb-2">
                        <ImageIcon className="w-6 h-6" />
                      </div>
                      <p className="text-xs font-semibold text-foreground">Henüz görsel eklenmedi</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Yukarıdaki butonlarla bilgisayarınızdan çoklu resim yükleyin veya link yapıştırın.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {currentVariant.images.map((imgUrl, idx) => {
                        const isCover = idx === 0;
                        return (
                          <div
                            key={idx}
                            className={`group relative rounded-xl overflow-hidden border-2 transition-all bg-card ${
                              isCover
                                ? "border-orange-500 shadow-md ring-2 ring-orange-500/20"
                                : "border-border hover:border-border/80"
                            }`}
                          >
                            {/* Resim Önizleme */}
                            <div className="aspect-square relative overflow-hidden bg-muted/20">
                              <img
                                src={imgUrl}
                                alt={`Görsel ${idx + 1}`}
                                loading="lazy"
                                decoding="async"
                                className="w-full h-full object-cover transition-opacity duration-200"
                              />
                              {/* Kapak Rozeti */}
                              {isCover ? (
                                <span className="absolute top-1.5 left-1.5 bg-orange-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                                  <Star className="w-2.5 h-2.5 fill-white" />
                                  Kapak Görseli
                                </span>
                              ) : (
                                <span className="absolute top-1.5 left-1.5 bg-black/60 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md">
                                  #{idx + 1}
                                </span>
                              )}

                              {/* Hover Aksiyonları */}
                              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                                <div className="flex justify-end">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveImageFromVariant(currentVariant.id, idx)}
                                    className="w-7 h-7 rounded-lg bg-red-600 hover:bg-red-700 text-white flex items-center justify-center cursor-pointer shadow-sm"
                                    title="Görseli Sil"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>

                                <div className="flex items-center justify-between gap-1">
                                  {idx > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => handleMoveImage(currentVariant.id, idx, idx - 1)}
                                      className="w-7 h-7 rounded-lg bg-white/20 hover:bg-white/40 text-white flex items-center justify-center cursor-pointer"
                                      title="Sola Taşı"
                                    >
                                      <ArrowLeft className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  {!isCover && (
                                    <button
                                      type="button"
                                      onClick={() => handleSetCoverImage(currentVariant.id, idx)}
                                      className="flex-1 py-1 px-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-[10px] font-bold text-center cursor-pointer"
                                      title="Kapak Görseli Yap"
                                    >
                                      Kapak Yap
                                    </button>
                                  )}
                                  {idx < currentVariant.images.length - 1 && (
                                    <button
                                      type="button"
                                      onClick={() => handleMoveImage(currentVariant.id, idx, idx + 1)}
                                      className="w-7 h-7 rounded-lg bg-white/20 hover:bg-white/40 text-white flex items-center justify-center cursor-pointer"
                                      title="Sağa Taşı"
                                    >
                                      <ArrowRight className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* ALT KONTROLLER: Tüm varyantlara kopyalama ve kapatma */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-border">
                  {tableVariants.length > 1 && currentVariant.images.length > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyImagesToAllVariants(currentVariant.id)}
                      className="text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5 mr-1.5" />
                      Bu Görselleri Tüm Varyantlara Kopyala
                    </Button>
                  )}

                  <div className="flex items-center gap-2 ml-auto">
                    <Button
                      type="button"
                      onClick={() => {
                        setIsImageManagerOpen(false);
                        setActiveImageUploadRowId(null);
                      }}
                      className="bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold px-5 h-9 rounded-xl cursor-pointer"
                    >
                      <Check className="w-4 h-4 mr-1.5" />
                      Tamamla
                    </Button>
                  </div>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ONAY POP-UP MODALI */}
      <ConfirmDialog />
    </div>
  );
}
