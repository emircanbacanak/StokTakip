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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useConfirm } from "@/hooks/use-confirm";
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

// ─── TİPLER ──────────────────────────────────────────────────────────────────
export interface TableVariantRow {
  id: string;
  checked: boolean;
  color: string;
  customColorName: string;
  height: string;
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
  const [colorChips, setColorChips] = useState<Array<{ id: string; webColor: string; customName: string }>>([]);

  // Toplu Güncelleme Çubuğu State
  const [bulkPrice, setBulkPrice] = useState<string>("");
  const [bulkVat, setBulkVat] = useState<string>("%20");
  const [bulkStock, setBulkStock] = useState<string>("");

  // Tablo Satırları (Varyant Listesi)
  const [tableVariants, setTableVariants] = useState<TableVariantRow[]>([]);

  // Görsel Yükleme Modalı / State
  const [activeImageUploadRowId, setActiveImageUploadRowId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Gönderim Durumu
  const [isSubmitting, setIsSubmitting] = useState(false);

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
          const suggestions = flatList.slice(0, 15);
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

  // Renk Ekle
  const handleAddColor = () => {
    const color = inputColorScale;
    const custom = inputColorName.trim() || color;

    // Aynı renk zaten var mı?
    if (colorChips.some((c) => c.webColor === color)) {
      toast({ title: "Uyarı", description: `${color} rengi zaten ekli.`, variant: "destructive" });
      return;
    }

    const newChip = { id: `c-${Date.now()}`, webColor: color, customName: custom };
    setColorChips([...colorChips, newChip]);

    // Tabloya yeni satır ekle (Örn: PTR-TEN-20 ve 999000... barkod)
    const smartStockCode = generateSmartStockCode(modelCode || title, color, selectedHeight, title);
    const smartBarcode = generateEan13Barcode();

    const newRow: TableVariantRow = {
      id: `v-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
      checked: false,
      color: color,
      customColorName: custom,
      height: selectedHeight || "",
      images: [],
      barcode: smartBarcode,
      salePrice: bulkPrice && bulkPrice !== "0,00" ? bulkPrice : "",
      stock: bulkStock && bulkStock !== "0" ? bulkStock : "",
      vatRate: bulkVat || "20",
      otv: "",
      stockCode: smartStockCode,
      lotInfo: "",
    };

    setTableVariants((prev) => [...prev, newRow]);
    setInputColorName("");
    toast({ title: "Renk Eklendi", description: `${color} varyant tablosuna eklendi.` });
  };

  // Renk Çipini ve Tablodaki Satırını Kaldır
  const handleRemoveColorChip = (chipId: string, colorName: string) => {
    setColorChips(colorChips.filter((c) => c.id !== chipId));
    setTableVariants(tableVariants.filter((v) => v.color !== colorName));
  };

  // Tablodan Tek Satır Kaldır
  const handleRemoveVariantRow = (rowId: string) => {
    const row = tableVariants.find((r) => r.id === rowId);
    if (row) {
      setColorChips(colorChips.filter((c) => c.webColor !== row.color));
    }
    setTableVariants(tableVariants.filter((r) => r.id !== rowId));
  };

  // Toplu Güncelleme Uygula (Trendyol Güncelle Butonu)
  const handleApplyBulkUpdate = () => {
    const hasChecked = tableVariants.some((r) => r.checked);
    setTableVariants((prev) =>
      prev.map((row) => {
        if (!hasChecked || row.checked) {
          return {
            ...row,
            salePrice: bulkPrice && bulkPrice !== "0,00" ? bulkPrice : row.salePrice,
            vatRate: bulkVat ? bulkVat : row.vatRate,
            stock: bulkStock && bulkStock !== "0" ? bulkStock : row.stock,
          };
        }
        return row;
      })
    );
    toast({
      title: "Toplu Güncelleme Yapıldı",
      description: hasChecked
        ? "Seçili varyantların Fiyat, KDV ve Stok değerleri güncellendi."
        : "Tüm varyantların Fiyat, KDV ve Stok değerleri güncellendi.",
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

  // Görsel Yükleme (ImgBB / URL)
  const handleUploadImageForVariant = async (file: File) => {
    if (!activeImageUploadRowId) return;
    const apiKey = process.env.NEXT_PUBLIC_IMGBB_API_KEY || "";
    if (!apiKey) {
      toast({
        title: "Hata",
        description: "NEXT_PUBLIC_IMGBB_API_KEY tanımlı değil. Lütfen URL girin.",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(",")[1];
      const formData = new FormData();
      formData.append("image", base64);
      try {
        const res = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (data.success && data.data?.display_url) {
          const imgUrl = data.data.display_url;
          setTableVariants((prev) =>
            prev.map((r) =>
              r.id === activeImageUploadRowId ? { ...r, images: [...r.images, imgUrl] } : r
            )
          );
          toast({ title: "Görsel Yüklendi" });
        } else {
          toast({ title: "Yükleme Hatası", variant: "destructive" });
        }
      } catch {
        toast({ title: "Bağlantı Hatası", variant: "destructive" });
      }
    };
    reader.readAsDataURL(file);
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
      const commonCategoryId = selectedCategory?.id || 1881;

      const baseAttributes = [
        { attributeId: 338, customAttributeValue: material },
        { attributeId: 1073, customAttributeValue: pieceCount },
        { attributeId: 1040, customAttributeValue: origin },
        ...(selectedHeight ? [{ attributeId: 286, customAttributeValue: selectedHeight }] : []),
      ];

      const itemsToSubmit = tableVariants.map((v) => ({
        title: `${title.trim()} (${v.color})`,
        barcode: v.barcode.trim(),
        stockCode: v.stockCode.trim(),
        salePrice: Number(v.salePrice) || 330,
        listPrice: Number(v.salePrice) || 330,
        quantity: Number(v.stock) || 20,
        images: v.images,
        desi: Number(desi) || 2,
        vatRate: Number(v.vatRate) || 20,
        attributes: [
          ...baseAttributes,
          { attributeId: 47, customAttributeValue: v.color },
          { attributeId: 348, customAttributeValue: v.color },
        ],
      }));

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

      await confirm({
        title: "🎉 Ürün Başarıyla Yüklendi!",
        message: `Model Koduna (${modelCode}) bağlı ${itemsToSubmit.length} farklı renk varyantı tek seferde Trendyol'a iletildi.`,
        confirmText: "Yüklü Ürünlerime Git",
        variant: "info",
      });

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

      {/* Gizli Görsel Seçim Inputu */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleUploadImageForVariant(e.target.files[0]);
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
                    placeholder="Kategori aramak için en az 2 harf yazın (Örn: Vazo, Saksı...)"
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
                        onClick={() => {
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
                            onClick={() => {
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
              <div className="flex items-center justify-between border-b border-border pb-4">
                <h3 className="text-base sm:text-lg font-bold text-foreground">
                  Satış ve Varyant Bilgileri
                </h3>
                <a
                  href="https://partner.trendyol.com"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Varyantlı Ürün Ekleme Eğitimi
                </a>
              </div>

              {/* Slicer 1: Yükseklik * */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">
                  Yükseklik <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <select
                    value={selectedHeight}
                    onChange={(e) => {
                      const newHeight = e.target.value;
                      setSelectedHeight(newHeight);
                      setTableVariants((prev) => prev.map((r) => ({ ...r, height: newHeight })));
                    }}
                    className="w-full h-10 px-3 pr-10 text-xs rounded-xl border border-input bg-background font-medium appearance-none focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  >
                    <option value="">Yükseklik Seçin</option>
                    {TRENDYOL_HEIGHTS.map((h) => (
                      <option key={h} value={h}>
                        {h}
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

              {/* Slicer 2: Renk * */}
              <div className="space-y-2">
                <div>
                  <Label className="text-xs font-semibold text-foreground">
                    Renk <span className="text-red-500">*</span>
                  </Label>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                    Müşterilerin filtreleme alanında gösterilecek rengi, renk skalası alanından seçebilirsiniz. Ürünün detaylı renk bilgisini ise renk ismi alanına girebilirsiniz. Bu bilgi, ürün detayında müşterilere gösterilir.
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
                      Renk Ekle
                    </Button>
                  </div>
                </div>

                {/* Eklenen Renk Çipleri (Bej X, Gri X) */}
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
                        {chip.customName || chip.webColor}
                        <button
                          type="button"
                          onClick={() => handleRemoveColorChip(chip.id, chip.webColor)}
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

              {/* ─── VARYANT TABLOSU (TRENDYOL BİREBİR) ─── */}
              <div className="border border-border rounded-xl overflow-hidden bg-background">
                {/* DURUM 1: HENÜZ HİÇBİR VARYANT BULUNMUYOR (SCREENSHOT 1) */}
                {tableVariants.length === 0 ? (
                  <div className="py-16 px-4 flex flex-col items-center justify-center text-center space-y-3">
                    {/* Trendyol Turuncu Paket İllüstrasyonu */}
                    <div className="relative w-20 h-20 flex items-center justify-center">
                      <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shadow-sm">
                        <Store className="w-8 h-8 text-amber-600" />
                      </div>
                      <span className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-orange-600 text-white flex items-center justify-center font-bold text-sm shadow-md">
                        +
                      </span>
                    </div>

                    <div className="space-y-1 max-w-md">
                      <h4 className="text-sm font-bold text-foreground">
                        Henüz hiçbir varyant bulunmuyor!
                      </h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Satış bilgilerini girmek için ürün bilgilerinizi doldurmalısınız. Doldurmanız gereken alanlar <strong>Renk, Yükseklik</strong>
                      </p>
                    </div>
                  </div>
                ) : (
                  /* DURUM 2: VARYANTLAR DOLU TABLO (SCREENSHOT 2) */
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
                          <th className="p-3 whitespace-nowrap min-w-[100px]">Renk</th>
                          <th className="p-3 whitespace-nowrap min-w-[90px]">Yükseklik</th>
                          <th className="p-3 whitespace-nowrap min-w-[120px]">Barkod</th>
                          <th className="p-3 whitespace-nowrap min-w-[120px]">Trendyol Satış Fiyatı</th>
                          <th className="p-3 whitespace-nowrap min-w-[90px]">Stok</th>
                          <th className="p-3 whitespace-nowrap min-w-[80px]">KDV</th>
                          <th className="p-3 whitespace-nowrap min-w-[80px]">
                            <span className="flex items-center gap-1">
                              ÖTV <HelpCircle className="w-3 h-3 opacity-60" />
                            </span>
                          </th>
                          <th className="p-3 whitespace-nowrap min-w-[130px]">Stok Kodu</th>
                          <th className="p-3 whitespace-nowrap min-w-[120px]">
                            <span className="flex items-center gap-1">
                              Parti/Lot/SKT Bilgisi <HelpCircle className="w-3 h-3 opacity-60" />
                            </span>
                          </th>
                          <th className="p-3 w-12 text-center">İşlem</th>
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

                            {/* Görsel Yükleme (Trendyol Turuncu Kesikli Kutu) */}
                            <td className="p-3">
                              {row.images.length === 0 ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveImageUploadRowId(row.id);
                                    fileInputRef.current?.click();
                                  }}
                                  className="w-12 h-12 rounded-lg border-2 border-dashed border-orange-400/80 bg-orange-500/5 hover:bg-orange-500/15 flex flex-col items-center justify-center text-orange-600 cursor-pointer transition-colors shadow-2xs group"
                                  title="Fotoğraf Yükle"
                                >
                                  <Camera className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                </button>
                              ) : (
                                <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-border group">
                                  <img
                                    src={row.images[0]}
                                    alt=""
                                    className="w-full h-full object-cover"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateRowField(row.id, "images", [])}
                                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white cursor-pointer transition-opacity"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                                  </button>
                                </div>
                              )}
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

                            {/* Yükseklik */}
                            <td className="p-3 whitespace-nowrap text-muted-foreground font-medium">
                              {row.height}
                            </td>

                            {/* Barkod */}
                            <td className="p-3">
                              <Input
                                value={row.barcode}
                                onChange={(e) => handleUpdateRowField(row.id, "barcode", e.target.value)}
                                className="h-8 text-xs font-mono font-medium w-28"
                              />
                            </td>

                            {/* Trendyol Satış Fiyatı */}
                            <td className="p-3">
                              <Input
                                type="number"
                                value={row.salePrice}
                                onChange={(e) => handleUpdateRowField(row.id, "salePrice", e.target.value)}
                                className="h-8 text-xs font-medium w-24"
                              />
                            </td>

                            {/* Stok */}
                            <td className="p-3">
                              <Input
                                type="number"
                                value={row.stock}
                                onChange={(e) => handleUpdateRowField(row.id, "stock", e.target.value)}
                                className="h-8 text-xs font-medium w-20"
                              />
                            </td>

                            {/* KDV */}
                            <td className="p-3">
                              <select
                                value={row.vatRate}
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

                            {/* Stok Kodu */}
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

                            {/* İşlem (Sil) */}
                            <td className="p-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveVariantRow(row.id)}
                                className="text-muted-foreground hover:text-red-600 p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                                title="Varyantı Sil"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
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

      {/* ONAY POP-UP MODALI */}
      <ConfirmDialog />
    </div>
  );
}
