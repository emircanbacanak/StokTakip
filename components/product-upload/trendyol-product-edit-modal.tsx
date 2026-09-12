"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  X,
  Sparkles,
  Upload,
  Trash2,
  MoveLeft,
  MoveRight,
  CheckCircle2,
  AlertCircle,
  Copy,
  Archive,
  Send,
  Loader2,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  Info,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Undo,
  Redo,
  Code,
  Link as LinkIcon,
  Image as ImageIcon,
  RotateCcw,
  Search,
  Tag,
  Package2,
  Palette,
  Eraser,
  CornerDownLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useConfirm } from "@/hooks/use-confirm";
import type { TrendyolListing } from "@/lib/types/database";
import { sanitizeTrendyolDescription } from "@/lib/trendyol-api-client";
import {
  generateSmartStockCode,
  generateEan13Barcode,
} from "@/lib/product-code-generator";
import { TrendyolProductCreateFlow } from "./trendyol-product-create-flow";

// Trendyol Resmi Seçim Değerleri
export const TRENDYOL_CATEGORIES = [
  "Vazo",
  "Saksı",
  "Dekoratif Obje",
  "Mum ve Mumluk",
  "Tablo ve Çerçeve",
  "Biblo ve Heykel",
  "Ev Tekstili",
  "Mutfak Gereçleri",
];

export const TRENDYOL_BRANDS = [
  "ahenk tasarım",
  "Ahenk Tasarımlar",
  "Paşabahçe",
  "Karaca",
  "Madame Coco",
  "English Home",
  "Bella Maison",
  "Porland",
  "Trendyol",
];

export const TRENDYOL_MATERIALS = [
  "Cam",
  "Alçı",
  "Sedef",
  "Beton",
  "Metal",
  "Ahşap",
  "Toprak",
  "Pirinç",
  "Mermer",
  "Reçine",
  "Plastik",
  "Seramik",
  "Akrilik",
  "Taş Tozu",
  "Porselen",
  "Poliresin",
  "Polyester",
  "Belirtilmemiş",
];

export const TRENDYOL_HEIGHTS = [
  "14 cm",
  "20 cm",
  "19 cm",
  "71 - 90",
  "41 - 50",
  "15-16 cm",
  "91 - 110",
  "0 - 10 cm",
  "111 - 150",
  "51 - 80 cm",
  "11 - 30 cm",
  "31 - 45 cm",
  "Belirtilmemiş",
];

export const TRENDYOL_PIECE_COUNTS = [
  "1",
  "2",
  "3",
  "4",
  "5",
  "5+",
  "1 Parça",
  "Belirtilmemiş",
];

export const TRENDYOL_WEB_COLORS = [
  "Mor",
  "Gri",
  "Bej",
  "Inox",
  "Krem",
  "Haki",
  "Ekru",
  "Sarı",
  "Mavi",
  "Bordo",
  "Yeşil",
  "Siyah",
  "Pembe",
  "Gümüş",
  "Beyaz",
  "Altın",
  "Şeffaf",
  "Turuncu",
  "Turkuaz",
  "Metalik",
  "Kırmızı",
  "Lacivert",
  "Çok Renkli",
  "Kahverengi",
  "Parmak İzi Bırakmaz Inox",
  "Parmak İzi Bırakmaz Koyu Inox",
];

export const TRENDYOL_COLORS = [
  "Ekru",
  "Beyaz",
  "Siyah",
  "Gri",
  "Bej",
  "Antrasit",
  "Mavi",
  "Saks Mavi",
  "Gece Mavisi",
  "Su Yeşili",
  "Zümrüt Yeşili",
  "Haki",
  "Terracotta",
  "Kiremit",
  "Hardal",
  "Pudra",
  "Gül Kurusu",
  "Bronz",
  "Altın / Gold",
  "Gümüş / Silver",
];

export const TRENDYOL_ORIGINS = [
  "TR - (Türkiye)",
  "CN - (Çin)",
  "DE - (Almanya)",
  "IT - (İtalya)",
  "ES - (İspanya)",
  "FR - (Fransa)",
  "US - (Amerika Birleşik Devletleri)",
  "GB - (Birleşik Krallık)",
  "NL - (Hollanda)",
  "PL - (Polonya)",
  "JP - (Japonya)",
  "KR - (Güney Kore)",
  "RU - (Rusya)",
  "AZ - (Azerbaycan)",
  "AE - (Birleşik Arap Emirlikleri)",
  "SA - (Suudi Arabistan)",
];

export const TRENDYOL_CARGO_COMPANIES = [
  "PTT Kargo",
  "Aras Kargo",
  "Sürat Kargo",
  "Ceva Tedarik",
  "Kolay Gelsin",
  "Yurtiçi Kargo",
  "DHL eCommerce",
  "CEVA Lojistik",
  "Horoz Lojistik",
];

export const TRENDYOL_PERSONAS = [
  "Minimal comfort",
  "Urban Pop",
  "Classic Heritage",
];

interface TrendyolProductEditModalProps {
  listing: TrendyolListing;
  onClose: () => void;
  onSaved: () => void;
}

export function TrendyolProductEditModal({
  listing,
  onClose,
  onSaved,
}: TrendyolProductEditModalProps) {
  const { toast } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();
  const [activeSection, setActiveSection] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [loading, setLoading] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);

  // Model & Form State
  const [title, setTitle] = useState(listing.title || "");
  const [modelCode, setModelCode] = useState(
    (listing as any).product_main_id ||
    (listing as any).model_code ||
    (listing as any).batch_id ||
    listing.stock_code?.split("-").slice(0, 3).join("-") ||
    listing.stock_code ||
    ""
  );
  const [modelVariantCount, setModelVariantCount] = useState<number | null>(null);

  useEffect(() => {
    if (!modelCode) return;
    let isMounted = true;
    fetch(`/api/trendyol/products?modelCode=${encodeURIComponent(modelCode)}`)
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data.success && typeof data.count === "number") {
          setModelVariantCount(data.count);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [modelCode]);
  const [barcode, setBarcode] = useState(listing.barcode || "");
  const [categoryName, setCategoryName] = useState("Vazo");
  const [categoryId, setCategoryId] = useState<number | null>(1881);
  const [categoryQuery, setCategoryQuery] = useState("Vazo");
  const [categoryResults, setCategoryResults] = useState<{ id: number; name: string; path?: string }[]>([]);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const categoryWrapRef = useRef<HTMLDivElement>(null);
  const categoryCacheRef = useRef<any[] | null>(null);

  const [brandName, setBrandName] = useState(listing.brand_name || "ahenk tasarım");
  const [brandMode, setBrandMode] = useState<"custom" | "no-brand">("custom");
  const [brandQuery, setBrandQuery] = useState(listing.brand_name || "ahenk tasarım");
  const [brandId, setBrandId] = useState<number | null>(1066155);
  const [brandResults, setBrandResults] = useState<{ id: number; name: string }[]>([]);
  const [brandDropdownOpen, setBrandDropdownOpen] = useState(false);
  const [brandLoading, setBrandLoading] = useState(false);
  const brandWrapRef = useRef<HTMLDivElement>(null);
  const isBrandFocusedRef = useRef(false);

  // Trendyol Dinamik Kategori Nitelikleri (Attributes)
  const [dynamicAttributes, setDynamicAttributes] = useState<{
    materials: string[];
    heights: string[];
    pieceCounts: string[];
    webColors: string[];
    origins: string[];
    personas: string[];
  }>({
    materials: TRENDYOL_MATERIALS,
    heights: TRENDYOL_HEIGHTS,
    pieceCounts: TRENDYOL_PIECE_COUNTS,
    webColors: TRENDYOL_WEB_COLORS,
    origins: TRENDYOL_ORIGINS,
    personas: TRENDYOL_PERSONAS,
  });
  const rawCategoryAttributesRef = useRef<any[]>([]);
  const [attributesLoading, setAttributesLoading] = useState(false);
  const [status, setStatus] = useState(
    listing.trendyol_status === "approved"
      ? "Onaylı"
      : listing.trendyol_status === "rejected"
      ? "Reddedildi"
      : "Onay Bekliyor"
  );

  // Görseller
  const [images, setImages] = useState<string[]>(listing.image_urls || []);
  const [newImageUrl, setNewImageUrl] = useState("");
  const [showImageInput, setShowImageInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Açıklama
  const [description, setDescription] = useState(() => {
    const raw = listing.description || "";
    if (raw && raw !== "-") return sanitizeTrendyolDescription(raw);
    return `<p><strong>Ahenk Tasarım'ın Aura serisi ile evinize veya ofisinize modern ve estetik bir dokunuş katın!</strong></p>
  <p>Aura Vazo, sade ama iddialı duruşuyla iç mekân dekorasyonunda fark yaratmak isteyenler için tasarlandı. Çeşitli rengiyle sıcak ve zarif bir hava katan bu dekoratif obje, hem modern hem de klasik tarzdaki ortamlarla kusursuz uyum sağlar.</p>
  
  <p><strong>✨ Neden Aura Vazo?</strong><br/>
  Estetik hatları ve göz alıcı tonuyla Aura Vazo, bulunduğu her ortama şıklık ve karakter katar. Salon, oturma odası, yemek masası, çalışma masası, ofis masası, TV ünitesi, kitaplık, konsol veya vitrin üzerine yerleştirebileceğiniz bu dekoratif vazo, kuru çiçek, yapay çiçek, otantik dallar veya sadece boş haliyle sade bir dekor objesi olarak kullanılabilir.</p>

  <p><strong>📦 Kullanım Alanları:</strong><br/>
  Ev dekorasyonu, ofis dekorasyonu, salon süs eşyası, masa üstü dekor, hediyelik eşya, yeni ev hediyesi, iş yeri açılış hediyesi, doğum günü hediyesi, sevgiliye hediye, anneler günü hediyesi, minimalist dekor tutkunları, modern iç mimari projeleri, kafe ve restoran masa dekoru, vitrin süslemesi için idealdir.</p>

  <p><strong>🎨 Tasarım Detayları:</strong></p>
  <ul>
    <li><strong>Model:</strong> Aura</li>
    <li><strong>Ürün Tipi:</strong> Dekoratif Vazo (Tek Adet)</li>
    <li><strong>Malzeme:</strong> Dayanıklı Plastik</li>
    <li><strong>Yükseklik:</strong> 20 cm</li>
    <li><strong>Parça Sayısı:</strong> 1 Parça</li>
    <li><strong>Üretim Yeri:</strong> Türkiye</li>
  </ul>

  <p><strong>💡 Neden Tercih Etmelisiniz?</strong><br/>
  Hafif yapısı sayesinde kolayca taşınabilir ve istediğiniz her noktaya rahatlıkla konumlandırılabilir. Göz alıcı rengi, hem sıcak hem de nötr iç mekân dekorasyonlarıyla uyum sağlayarak her ortama sofistike bir hava katar. Modern, minimal, İskandinav, bohem veya endüstriyel tarzdaki dekorasyonlara kolayca entegre olabilecek zamansız bir tasarıma sahiptir.</p>`;
  });
  const [showHtml, setShowHtml] = useState(false);
  const contentEditableRef = useRef<HTMLDivElement>(null);
  const editorWrapRef = useRef<HTMLDivElement>(null);
  const [showLinkPopover, setShowLinkPopover] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [showImagePopover, setShowImagePopover] = useState(false);
  const [editorImageUrl, setEditorImageUrl] = useState("");
  const [showColorPopover, setShowColorPopover] = useState(false);
  const [showFontSizeDropdown, setShowFontSizeDropdown] = useState(false);
  const savedSelectionRef = useRef<Range | null>(null);
  const savedSelectionOffsetsRef = useRef<{ start: number; end: number; text: string } | null>(null);
  const isApplyingSizeRef = useRef(false);
  const editorFileInputRef = useRef<HTMLInputElement>(null);
  const [descHistory, setDescHistory] = useState<string[]>([description]);
  const [descHistoryIdx, setDescHistoryIdx] = useState(0);

  // Satış Bilgileri
  const [salePrice, setSalePrice] = useState(String(listing.sale_price || 330));
  const [listPrice, setListPrice] = useState(String(listing.list_price || listing.sale_price || 330));
  const [quantity, setQuantity] = useState(String(listing.quantity || 100));
  const [stockCode, setStockCode] = useState(listing.stock_code || "PTR-TEN-20");
  const [lotNumber, setLotNumber] = useState("");
  const [vatRate, setVatRate] = useState(String(listing.vat_rate || 20));
  const [specialConsumptionTax, setSpecialConsumptionTax] = useState("");
  const [giftWrap, setGiftWrap] = useState("none");
  const [customizable, setCustomizable] = useState("no");

  // Ürün Özellikleri (Trendyol Seçenekli Değerler)
  const [material, setMaterial] = useState("Plastik");
  const [height, setHeight] = useState("20 cm");
  const [pieceCount, setPieceCount] = useState("1");
  const [webColor, setWebColor] = useState("Ekru");
  const [color, setColor] = useState("Ekru");
  const [origin, setOrigin] = useState("TR - (Türkiye)");
  const [persona, setPersona] = useState("");

  // Üretici & İthalatçı Bilgileri (Varsayılan Boş)
  const [producerName, setProducerName] = useState("");
  const [producerMail, setProducerMail] = useState("");
  const [producerAddress, setProducerAddress] = useState("");
  const [importerName, setImporterName] = useState("");
  const [importerMail, setImporterMail] = useState("");
  const [importerAddress, setImporterAddress] = useState("");
  const [historyTab, setHistoryTab] = useState<"approved" | "pending" | "rejected">("approved");

  // Kargo & Teslimat Bilgileri - Anlaşmalı Kargo Şirketi Boş Olarak Varsayılan
  const [desi, setDesi] = useState(String(listing.desi || 2.0));
  const [deliveryDuration, setDeliveryDuration] = useState("0");
  const [shipmentAddress, setShipmentAddress] = useState("Sevkiyat Adresi (8056820)");
  const [returningAddress, setReturningAddress] = useState("İade Adresi (8056819)");
  const [cargoCompany, setCargoCompany] = useState(listing.cargo_company || "");

  // Toplu Güncelleme (Model Kodu)
  const [updateByModelCode, setUpdateByModelCode] = useState(false);

  // İlk Açılış Form Değerleri (Sadece değişen alanları tespit edip diğer varyantlara iletmek için)
  const initialFormValuesRef = useRef<{
    title: string;
    description: string;
    salePrice: string;
    listPrice: string;
    quantity: string;
    stockCode: string;
    desi: string;
    deliveryDuration: string;
    vatRate: string;
    cargoCompany: string;
    material: string;
    pieceCount: string;
    height: string;
    origin: string;
  } | null>(null);

  if (!initialFormValuesRef.current) {
    initialFormValuesRef.current = {
      title: listing.title || "",
      description: sanitizeTrendyolDescription(listing.description || ""),
      salePrice: String(listing.sale_price || 330),
      listPrice: String(listing.list_price || listing.sale_price || 330),
      quantity: String(listing.quantity || 100),
      stockCode: listing.stock_code || "PTR-TEN-20",
      desi: String(listing.desi || 2.0),
      deliveryDuration: "0",
      vatRate: String(listing.vat_rate || 20),
      cargoCompany: listing.cargo_company || "",
      material: "Plastik",
      pieceCount: "1",
      height: "20 cm",
      origin: "TR - (Türkiye)",
    };
  }

  // Değişen alanları tespit et
  const getChangedFields = () => {
    const init = initialFormValuesRef.current;
    if (!init) return [];

    const changes: { key: string; label: string; oldValue: any; newValue: any }[] = [];

    // Açıklama:
    const cleanCurrent = sanitizeTrendyolDescription(description);
    const cleanInit = sanitizeTrendyolDescription(init.description);
    const norm = (str: string) => str.replace(/\s+/g, " ").trim();
    if (norm(cleanCurrent) !== norm(cleanInit)) {
      changes.push({
        key: "description",
        label: "Ürün Açıklaması",
        oldValue: "",
        newValue: "Yeni Açıklama",
      });
    }

    // Satış Fiyatı:
    if (Number(salePrice) !== Number(init.salePrice) && salePrice !== "") {
      changes.push({
        key: "sale_price",
        label: `Satış Fiyatı (${Number(salePrice)} ₺)`,
        oldValue: init.salePrice,
        newValue: salePrice,
      });
    }

    // Piyasa Fiyatı:
    if (Number(listPrice) !== Number(init.listPrice) && listPrice !== "") {
      changes.push({
        key: "list_price",
        label: `Piyasa Satış Fiyatı (${Number(listPrice)} ₺)`,
        oldValue: init.listPrice,
        newValue: listPrice,
      });
    }

    // Stok:
    if (Number(quantity) !== Number(init.quantity) && quantity !== "") {
      changes.push({
        key: "quantity",
        label: `Stok Miktarı (${Number(quantity)} adet)`,
        oldValue: init.quantity,
        newValue: quantity,
      });
    }

    // Desi:
    if (Number(desi) !== Number(init.desi) && desi !== "") {
      changes.push({
        key: "desi",
        label: `Kargo Desi (${Number(desi)} desi)`,
        oldValue: init.desi,
        newValue: desi,
      });
    }

    // Teslimat Süresi:
    if (deliveryDuration !== init.deliveryDuration && deliveryDuration !== "") {
      changes.push({
        key: "delivery_duration",
        label: `Teslimat Süresi (${deliveryDuration} gün)`,
        oldValue: init.deliveryDuration,
        newValue: deliveryDuration,
      });
    }

    // Kargo Şirketi:
    if (cargoCompany !== init.cargoCompany) {
      changes.push({
        key: "cargo_company",
        label: `Kargo Firması (${cargoCompany || "Varsayılan"})`,
        oldValue: init.cargoCompany,
        newValue: cargoCompany,
      });
    }

    // Başlık:
    if (title.trim() !== init.title.trim()) {
      changes.push({
        key: "title",
        label: `Ürün Başlığı (${title.trim()})`,
        oldValue: init.title,
        newValue: title,
      });
    }

    // Kategori Nitelikleri (Ortak):
    if (material !== init.material) {
      changes.push({
        key: "material",
        label: `Materyal (${material})`,
        oldValue: init.material,
        newValue: material,
      });
    }
    if (height !== init.height) {
      changes.push({
        key: "height",
        label: `Yükseklik (${height})`,
        oldValue: init.height,
        newValue: height,
      });
    }
    if (pieceCount !== init.pieceCount) {
      changes.push({
        key: "piece_count",
        label: `Parça Sayısı (${pieceCount})`,
        oldValue: init.pieceCount,
        newValue: pieceCount,
      });
    }
    if (origin !== init.origin) {
      changes.push({
        key: "origin",
        label: `Menşei (${origin})`,
        oldValue: init.origin,
        newValue: origin,
      });
    }

    return changes;
  };

  // Ürünü Kopyala (Yeni Ürün Klonlama / Yeni Renk Ekleme) Modalı
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copyMode, setCopyMode] = useState<"new_color" | "new_product">("new_color");
  const [copyColorName, setCopyColorName] = useState("Beyaz");
  const [copyBarcode, setCopyBarcode] = useState("");
  const [copyStockCode, setCopyStockCode] = useState("");
  const [copyTitle, setCopyTitle] = useState("");
  const [copyImages, setCopyImages] = useState<string[]>([]);
  const [copySalePrice, setCopySalePrice] = useState("");
  const [copyQuantity, setCopyQuantity] = useState("");
  const [copyNewImageUrl, setCopyNewImageUrl] = useState("");
  const [copying, setCopying] = useState(false);

  // Adımlar / Bölümler
  const steps = [
    { id: 0, title: "Ürün Bilgileri" },
    { id: 1, title: "Satış Bilgileri" },
    { id: 2, title: "Ürün Özellikleri" },
    { id: 3, title: "Kargo & Teslimat Bilgileri" },
    { id: 4, title: "Ürün Güncelleme Geçmişi" },
  ];

  // Yumuşak Kaydırma ile Bölüme Git (Anchor Scroll)
  const scrollToSection = (sectionId: number) => {
    setActiveSection(sectionId);
    const target = document.getElementById(`section-${sectionId}`);
    if (target && scrollContainerRef.current) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // Scroll Sırasında Aktif Bölümü Otomatik Yakalama
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const containerScrollTop = container.scrollTop;

    for (let i = steps.length - 1; i >= 0; i--) {
      const el = document.getElementById(`section-${i}`);
      if (el) {
        const offsetTop = el.offsetTop - container.offsetTop;
        if (containerScrollTop >= offsetTop - 120) {
          setActiveSection(i);
          break;
        }
      }
    }
  };

  // Dışarı tıklama ile açılır menüleri kapatma
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (categoryWrapRef.current && !categoryWrapRef.current.contains(e.target as Node)) {
        setCategoryDropdownOpen(false);
      }
      if (brandWrapRef.current && !brandWrapRef.current.contains(e.target as Node)) {
        setBrandDropdownOpen(false);
      }
      if (editorWrapRef.current && !editorWrapRef.current.contains(e.target as Node)) {
        setShowLinkPopover(false);
        setShowImagePopover(false);
        setShowColorPopover(false);
        setShowFontSizeDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Açıklama değiştiğinde contentEditable div'i güncelle
  useEffect(() => {
    if (contentEditableRef.current) {
      if (!contentEditableRef.current.innerHTML && description) {
        contentEditableRef.current.innerHTML = description;
      } else if (contentEditableRef.current.innerHTML !== description && document.activeElement !== contentEditableRef.current) {
        contentEditableRef.current.innerHTML = description;
      }
    }
  }, [description]);

  // Trendyol Kategori Niteliklerini Canlı Çekme (Attributes API)
  const fetchCategoryAttributes = useCallback(async (catId: number) => {
    setAttributesLoading(true);
    try {
      const res = await fetch(`/api/trendyol-meta?type=attributes&categoryId=${catId}`);
      if (res.ok) {
        const data = await res.json();
        const attrs: Array<{
          attribute: { id: number; name: string };
          attributeValues?: Array<{ id: number; name: string }>;
        }> = data.categoryAttributes ?? [];

        rawCategoryAttributesRef.current = attrs;

        const getAttrValues = (attrId: number, fallback: string[]) => {
          const found = attrs.find((a) => a.attribute.id === attrId);
          if (found && found.attributeValues && found.attributeValues.length > 0) {
            return found.attributeValues.map((v) => v.name);
          }
          return fallback;
        };

        setDynamicAttributes({
          materials: getAttrValues(14, TRENDYOL_MATERIALS),
          heights: getAttrValues(286, TRENDYOL_HEIGHTS),
          pieceCounts: getAttrValues(18, TRENDYOL_PIECE_COUNTS),
          webColors: getAttrValues(348, TRENDYOL_WEB_COLORS),
          origins: getAttrValues(1192, TRENDYOL_ORIGINS),
          personas: getAttrValues(870, TRENDYOL_PERSONAS),
        });
      }
    } catch (e) {
      console.warn("Attributes fetch error:", e);
    } finally {
      setAttributesLoading(false);
    }
  }, []);

  // Açılışta veya categoryId değiştiğinde Trendyol'dan özellikleri yükle
  useEffect(() => {
    if (categoryId) {
      fetchCategoryAttributes(categoryId);
    }
  }, [categoryId, fetchCategoryAttributes]);

  // Açılışta Trendyol'dan ürünün güncel canlı özelliklerini (attributes, adresler, desi vb.) çek ve forma doldur
  useEffect(() => {
    if (!listing.barcode) return;
    const fetchLiveDetails = async () => {
      try {
        const res = await fetch(`/api/trendyol/products?barcode=${encodeURIComponent(listing.barcode)}`);
        if (!res.ok) return;
        const data = await res.json();
        const p = data?.product;
        if (!p) return;

        // Trendyol Resmi Model Kodu (productMainId) ve Varyant Stok Kodu
        if (p.productMainId || p.modelCode) {
          setModelCode(p.productMainId || p.modelCode);
        }
        if (p.stockCode) {
          setStockCode(p.stockCode);
        }
        if (p.categoryName) {
          setCategoryName(p.categoryName);
          setCategoryQuery(p.categoryName);
        }
        if (p.categoryId) {
          setCategoryId(p.categoryId);
        }

        if (p.dimensionalWeight) setDesi(String(p.dimensionalWeight));
        if (p.deliveryDuration !== undefined) setDeliveryDuration(String(p.deliveryDuration));
        if (p.shipmentAddressId) setShipmentAddress(`Sevkiyat Adresi (${p.shipmentAddressId})`);
        if (p.returningAddressId) setReturningAddress(`İade Adresi (${p.returningAddressId})`);
        if (p.brandId) setBrandId(p.brandId);
        if (p.brand) {
          setBrandName(p.brand);
          setBrandQuery(p.brand);
        }

        let liveMaterial = "Plastik";
        let livePieceCount = "1";
        let liveHeight = "20 cm";
        let liveOrigin = "TR - (Türkiye)";

        if (Array.isArray(p.attributes)) {
          for (const attr of p.attributes) {
            if (attr.attributeId === 14 && attr.attributeValue) {
              setMaterial(attr.attributeValue);
              liveMaterial = attr.attributeValue;
            }
            if (attr.attributeId === 18 && attr.attributeValue) {
              setPieceCount(attr.attributeValue);
              livePieceCount = attr.attributeValue;
            }
            if (attr.attributeId === 286 && attr.attributeValue) {
              setHeight(attr.attributeValue);
              liveHeight = attr.attributeValue;
            }
            if (attr.attributeId === 348 && attr.attributeValue) setWebColor(attr.attributeValue);
            if (attr.attributeId === 47 && attr.attributeValue) setColor(attr.attributeValue);
            if (attr.attributeId === 1192 && attr.attributeValue) {
              const orig = attr.attributeValue === "TR" ? "TR - (Türkiye)" : attr.attributeValue;
              setOrigin(orig);
              liveOrigin = orig;
            }
            if (attr.attributeId === 870 && attr.attributeValue) setPersona(attr.attributeValue);
          }
        }

        if (initialFormValuesRef.current) {
          initialFormValuesRef.current = {
            ...initialFormValuesRef.current,
            title: p.title || initialFormValuesRef.current.title,
            description: p.description ? sanitizeTrendyolDescription(p.description) : initialFormValuesRef.current.description,
            desi: p.dimensionalWeight ? String(p.dimensionalWeight) : initialFormValuesRef.current.desi,
            deliveryDuration: p.deliveryDuration !== undefined ? String(p.deliveryDuration) : initialFormValuesRef.current.deliveryDuration,
            material: liveMaterial,
            pieceCount: livePieceCount,
            height: liveHeight,
            origin: liveOrigin,
          };
        }
      } catch (e) {
        console.warn("Live product fetch error:", e);
      }
    };
    fetchLiveDetails();
  }, [listing.barcode]);

  // Trendyol Marka Arama (Canlı API)
  useEffect(() => {
    if (brandMode === "no-brand") {
      setBrandName("Genel Markalar");
      setBrandId(109986);
      return;
    }
    const q = brandQuery.trim();
    if (q.length < 2) {
      setBrandResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setBrandLoading(true);
      try {
        const res = await fetch(`/api/trendyol-meta?type=brands&name=${encodeURIComponent(q)}`);
        if (res.ok) {
          const data = await res.json();
          const brands = data.brands ?? [];
          setBrandResults(brands);
          if (brands.length > 0 && isBrandFocusedRef.current) {
            setBrandDropdownOpen(true);
          }
        }
      } catch (e) {
        console.warn("Brand search error:", e);
      } finally {
        setBrandLoading(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [brandQuery, brandMode]);

  // Trendyol Kategori Canlı Arama
  const handleCategorySearch = async (q: string) => {
    setCategoryQuery(q);
    if (!categoryCacheRef.current) {
      setCategoryLoading(true);
      try {
        const res = await fetch("/api/trendyol-meta?type=categories");
        if (res.ok) {
          const data = await res.json();
          categoryCacheRef.current = data.categories ?? [];
        }
      } catch (e) {
        console.warn("Category tree fetch error:", e);
      } finally {
        setCategoryLoading(false);
      }
    }

    if (!categoryCacheRef.current) return;

    const term = q.trim().toLowerCase();
    if (!term) {
      setCategoryResults([]);
      return;
    }

    const matched: { id: number; name: string; path: string }[] = [];
    const walk = (cats: any[], parentPath: string) => {
      for (const c of cats) {
        const path = parentPath ? `${parentPath} › ${c.name}` : c.name;
        if (c.name.toLowerCase().includes(term) || path.toLowerCase().includes(term)) {
          matched.push({ id: c.id, name: c.name, path });
        }
        if (c.subCategories && c.subCategories.length > 0) {
          walk(c.subCategories, path);
        }
      }
    };
    walk(categoryCacheRef.current, "");
    setCategoryResults(matched.slice(0, 15));
    setCategoryDropdownOpen(true);
  };

  const handleSelectCategory = (cat: { id: number; name: string; path?: string }) => {
    setCategoryId(cat.id);
    setCategoryName(cat.name);
    setCategoryQuery(cat.name);
    setCategoryDropdownOpen(false);
    toast({
      title: "Kategori Seçildi",
      description: `${cat.name} (ID: ${cat.id}) nitelikleri Trendyol'dan güncelleniyor...`,
    });
    fetchCategoryAttributes(cat.id);
  };

  const handleSelectBrand = (brand: { id: number; name: string }) => {
    isBrandFocusedRef.current = false;
    setBrandId(brand.id);
    setBrandName(brand.name);
    setBrandQuery(brand.name);
    setBrandDropdownOpen(false);
    toast({
      title: "Marka Seçildi",
      description: `${brand.name} (ID: ${brand.id})`,
    });
  };

  // Görsel Sıralama / Silme
  const moveImage = (index: number, direction: "left" | "right") => {
    const newIdx = direction === "left" ? index - 1 : index + 1;
    if (newIdx < 0 || newIdx >= images.length) return;
    const next = [...images];
    const temp = next[index];
    next[index] = next[newIdx];
    next[newIdx] = temp;
    setImages(next);
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const addImageUrl = () => {
    if (!newImageUrl.trim()) return;
    setImages([...images, newImageUrl.trim()]);
    setNewImageUrl("");
    setShowImageInput(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    toast({ title: "Görsel yükleniyor...", description: "ImgBB servisine aktarılıyor." });
    try {
      const apiKey = process.env.NEXT_PUBLIC_IMGBB_API_KEY;
      if (!apiKey) throw new Error("ImgBB API anahtarı tanımlı değil.");

      for (let i = 0; i < files.length; i++) {
        const formData = new FormData();
        formData.append("image", files[i]);
        const res = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (data.success) {
          setImages((prev) => [...prev, data.data.url]);
        }
      }
      toast({ title: "Başarılı", description: "Görseller eklendi." });
    } catch (err) {
      toast({
        title: "Yükleme hatası",
        description: (err as Error).message,
        variant: "destructive",
      });
    }
  };

  // Açıklamayı Getir (Trendyol'dan Orijinalini Çek)
  const [loadingOriginalDesc, setLoadingOriginalDesc] = useState(false);
  const handleLoadTemplate = async () => {
    setLoadingOriginalDesc(true);
    toast({
      title: "Trendyol'dan Açıklama Çekiliyor...",
      description: `${barcode} barkodlu ürünün orijinal açıklaması getiriliyor.`,
    });

    try {
      // 1. Canlı Trendyol API / Supabase endpointinden çek
      const res = await fetch(`/api/trendyol/products?barcode=${encodeURIComponent(barcode)}`);
      const data = await res.json();

      if (data?.success && data?.description && data.description !== "-") {
        const clean = sanitizeTrendyolDescription(data.description);
        setDescription(clean);
        if (contentEditableRef.current) {
          contentEditableRef.current.innerHTML = clean;
        }
        toast({
          title: "✅ Orijinal Açıklama Getirildi",
          description: "Trendyol'daki orijinal ürün açıklaması başarıyla yüklendi.",
        });
        return;
      }
    } catch (err) {
      console.warn("Trendyol API orijinal açıklama hatası:", err);
    } finally {
      setLoadingOriginalDesc(false);
    }

    // 2. Fallback: listing.description
    const fallback = sanitizeTrendyolDescription(listing.description || "");
    if (fallback && fallback !== "-") {
      setDescription(fallback);
      if (contentEditableRef.current) {
        contentEditableRef.current.innerHTML = fallback;
      }
      toast({
        title: "✅ Açıklama Getirildi",
        description: "Ürünün kayıtlı orijinal açıklaması yüklendi.",
      });
      return;
    }

    // 3. Fallback: Şablon
    const template = `<p><strong>${brandName}'ın ${title.split("-")[0].trim()} serisi ile evinize veya ofisinize modern ve estetik bir dokunuş katın!</strong></p>
  <p>Aura Vazo, sade ama iddialı duruşuyla iç mekân dekorasyonunda fark yaratmak isteyenler için tasarlandı. Çeşitli rengiyle sıcak ve zarif bir hava katan bu dekoratif obje, hem modern hem de klasik tarzdaki ortamlarla kusursuz uyum sağlar.</p>
  <p><strong>✨ Neden Aura Vazo?</strong><br/>
  Estetik hatları ve göz alıcı tonuyla bulunduğu her ortama şıklık ve karakter katar.</p>
  <p><strong>🎨 Tasarım Detayları:</strong></p>
  <ul>
    <li><strong>Model:</strong> ${modelCode}</li>
    <li><strong>Ürün Tipi:</strong> ${categoryName}</li>
    <li><strong>Malzeme:</strong> ${material}</li>
    <li><strong>Yükseklik:</strong> ${height}</li>
    <li><strong>Renk:</strong> ${color}</li>
    <li><strong>Üretim Yeri:</strong> Türkiye</li>
  </ul>`;
    setDescription(template);
    if (contentEditableRef.current) {
      contentEditableRef.current.innerHTML = template;
    }
    toast({ title: "Şablon Yüklendi" });
  };

  // Gemini AI Açıklama Üretici
  const generateAiDescription = async () => {
    setAiGenerating(true);
    toast({
      title: "🤖 Yapay Zeka Hazırlıyor...",
      description: "Ürün başlığı ve özelliklerine göre Trendyol SEO uyumlu açıklama yazılıyor.",
    });

    try {
      const geminiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "AIzaSyBIk49ahTcfrHtajtYxHYBlpM5LMC2zruE";
      const promptText = `Sen profesyonel bir Trendyol e-ticaret uzmanısın. Aşağıdaki ürün için zengin HTML formatında, göz alıcı, maddeli, emoji ve başlıklar içeren profesyonel bir Trendyol ürün açıklaması yaz:
      Ürün Adı: ${title}
      Kategori: ${categoryName}
      Marka: ${brandName}
      Materyal: ${material}
      Yükseklik: ${height}
      Renk: ${color}
      Özellikler: 3D yazıcı teknolojisiyle özel katmanlı üretim, dayanıklı plastik, dekoratif modern tasarım.
      
      Yalnızca temiz HTML formatında (<p>, <b>, <ul>, <li>, <br> vb.) yanıt döndür. Dış div sarmalayıcısı ve Markdown backtick (üç tırnak) kullanma.`;

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
        if (contentEditableRef.current) {
          contentEditableRef.current.innerHTML = cleaned;
        }
        toast({ title: "✅ Açıklama Hazırlandı!" });
      } else {
        throw new Error("Yapay zeka yanıt veremedi");
      }
    } catch (err) {
      toast({
        title: "AI Hatası",
        description: (err as Error).message,
        variant: "destructive",
      });
    } finally {
      setAiGenerating(false);
    }
  };

  // Açıklama Geçmişi (Undo / Redo) & Çift Taraflı Senkronizasyon
  const updateDescriptionWithHistory = (newVal: string) => {
    setDescription(newVal);
    if (contentEditableRef.current && contentEditableRef.current.innerHTML !== newVal && document.activeElement !== contentEditableRef.current) {
      contentEditableRef.current.innerHTML = newVal;
    }
    if (textareaRef.current && textareaRef.current.value !== newVal) {
      textareaRef.current.value = newVal;
    }
    if (descHistory[descHistoryIdx] !== newVal) {
      const next = descHistory.slice(0, descHistoryIdx + 1);
      next.push(newVal);
      if (next.length > 50) next.shift();
      setDescHistory(next);
      setDescHistoryIdx(next.length - 1);
    }
  };

  const handleUndo = () => {
    if (descHistoryIdx > 0) {
      const nextIdx = descHistoryIdx - 1;
      const val = descHistory[nextIdx];
      setDescHistoryIdx(nextIdx);
      setDescription(val);
      if (contentEditableRef.current) {
        contentEditableRef.current.innerHTML = val;
      }
      if (textareaRef.current) {
        textareaRef.current.value = val;
      }
    }
  };

  const handleRedo = () => {
    if (descHistoryIdx < descHistory.length - 1) {
      const nextIdx = descHistoryIdx + 1;
      const val = descHistory[nextIdx];
      setDescHistoryIdx(nextIdx);
      setDescription(val);
      if (contentEditableRef.current) {
        contentEditableRef.current.innerHTML = val;
      }
      if (textareaRef.current) {
        textareaRef.current.value = val;
      }
    }
  };

  const handleEditorKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
      e.preventDefault();
      if (e.shiftKey) {
        handleRedo();
      } else {
        handleUndo();
      }
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
      e.preventDefault();
      handleRedo();
    }
  };

  const handleContentEditableInput = () => {
    if (contentEditableRef.current) {
      const html = contentEditableRef.current.innerHTML;
      setDescription(html);
      if (textareaRef.current && textareaRef.current.value !== html) {
        textareaRef.current.value = html;
      }
      if (descHistory[descHistoryIdx] !== html) {
        const next = descHistory.slice(0, descHistoryIdx + 1);
        next.push(html);
        if (next.length > 50) next.shift();
        setDescHistory(next);
        setDescHistoryIdx(next.length - 1);
      }
      saveSelection();
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
    handleContentEditableInput();
  };

  // Zengin Metin Düzenleyici Seçim Koruma (Hem DOM Range hem Karakter Offset)
  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
      const range = sel.getRangeAt(0);
      const editor = contentEditableRef.current;
      if (editor && (editor.contains(range.commonAncestorContainer) || editor === range.commonAncestorContainer)) {
        savedSelectionRef.current = range.cloneRange();
        try {
          const preRange = range.cloneRange();
          preRange.selectNodeContents(editor);
          preRange.setEnd(range.startContainer, range.startOffset);
          const start = preRange.toString().length;
          const text = range.toString();
          savedSelectionOffsetsRef.current = { start, end: start + text.length, text };
        } catch {
          // ignore
        }
      }
    }
  };

  const restoreSelection = () => {
    const editor = contentEditableRef.current;
    if (!editor) return;
    editor.focus();

    const sel = window.getSelection();
    if (!sel) return;

    // 1. Önce doğrudan Range'i dene
    if (savedSelectionRef.current) {
      try {
        if (editor.contains(savedSelectionRef.current.commonAncestorContainer)) {
          sel.removeAllRanges();
          sel.addRange(savedSelectionRef.current);
          if (!sel.isCollapsed) return;
        }
      } catch {
        // Range DOM'dan kopmuş olabilir
      }
    }

    // 2. Karakter offset tabanlı garantili geri yükleme (DOM düğümleri yenilense bile çalışır)
    if (savedSelectionOffsetsRef.current) {
      const { start, end } = savedSelectionOffsetsRef.current;
      let current = 0;
      let startNode: Node | null = null;
      let startOffset = 0;
      let endNode: Node | null = null;
      let endOffset = 0;

      const walk = (node: Node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          const len = node.textContent?.length || 0;
          if (!startNode && current + len >= start) {
            startNode = node;
            startOffset = Math.max(0, start - current);
          }
          if (!endNode && current + len >= end) {
            endNode = node;
            endOffset = Math.min(len, end - current);
          }
          current += len;
        } else {
          for (let i = 0; i < node.childNodes.length; i++) {
            walk(node.childNodes[i]);
            if (startNode && endNode) break;
          }
        }
      };

      walk(editor);

      if (startNode && endNode) {
        try {
          const newRange = document.createRange();
          newRange.setStart(startNode, startOffset);
          newRange.setEnd(endNode, endOffset);
          sel.removeAllRanges();
          sel.addRange(newRange);
          savedSelectionRef.current = newRange.cloneRange();
        } catch {
          // ignore
        }
      }
    }
  };

  const execEditorCommand = (command: string, value?: string) => {
    restoreSelection();
    document.execCommand(command, false, value);
    saveSelection();
    if (contentEditableRef.current) {
      const updated = contentEditableRef.current.innerHTML;
      updateDescriptionWithHistory(updated);
    }
  };

  // Trendyol Uyumlu Yazı Boyutu Uygulama (<span class="size" style="font-size: var(--bl-font-size-...)">)
  const applyFontSize = (sizeVar: string) => {
    // 1. Textarea (HTML Düzenleme) Açık ve Seçim Varsa
    if (showHtml && textareaRef.current) {
      const ta = textareaRef.current;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      if (typeof start === "number" && typeof end === "number" && start !== end) {
        const val = ta.value;
        const selected = val.substring(start, end);
        let replacement = "";
        const sizeMatch = selected.match(/^<span\s+class="size"\s+style="font-size:\s*var\([^)]+\)"\s*>([\s\S]*)<\/span>$/);
        if (sizeMatch) {
          replacement = `<span class="size" style="font-size: var(${sizeVar})">${sizeMatch[1]}</span>`;
        } else {
          replacement = `<span class="size" style="font-size: var(${sizeVar})">${selected}</span>`;
        }
        const updated = val.substring(0, start) + replacement + val.substring(end);
        updateDescriptionWithHistory(updated);
        if (contentEditableRef.current) {
          contentEditableRef.current.innerHTML = updated;
        }
        setTimeout(() => {
          ta.focus();
          ta.setSelectionRange(start, start + replacement.length);
        }, 10);
        return;
      }
    }

    // 2. Görsel Editör (contentEditable) Modu
    restoreSelection();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    const range = sel.getRangeAt(0);

    // Ebeveyn span.size kontrolü
    let parent = range.commonAncestorContainer as Node | null;
    if (parent && parent.nodeType === Node.TEXT_NODE) {
      parent = parent.parentElement;
    }
    const existingSpan = (parent as HTMLElement)?.closest("span.size, span[style*='font-size']") as HTMLElement | null;

    // İmleç sadece bir span.size içinde duruyorsa (seçim alanı 0 ise), tüm o span'ın boyutunu güncelle
    if (sel.isCollapsed && existingSpan && contentEditableRef.current?.contains(existingSpan)) {
      existingSpan.className = "size";
      existingSpan.style.fontSize = `var(${sizeVar})`;
      if (contentEditableRef.current) {
        const updated = contentEditableRef.current.innerHTML;
        updateDescriptionWithHistory(updated);
      }
      return;
    }

    if (sel.isCollapsed) return;

    // Eğer mevcut bir span.size seçilmişse stilini doğrudan güncelle
    if (
      existingSpan &&
      contentEditableRef.current?.contains(existingSpan) &&
      (existingSpan.textContent?.trim() === range.toString().trim() ||
        existingSpan === range.commonAncestorContainer)
    ) {
      existingSpan.className = "size";
      existingSpan.style.fontSize = `var(${sizeVar})`;
      if (contentEditableRef.current) {
        const updated = contentEditableRef.current.innerHTML;
        updateDescriptionWithHistory(updated);
      }
      return;
    }

    // Genel Durum: Tarayıcının güvenli execCommand("fontSize", false, "7") motorunu kullanarak inline DOM bölme
    try {
      document.execCommand("styleWithCSS", false, "false");
      document.execCommand("fontSize", false, "7");

      if (contentEditableRef.current) {
        const fonts = contentEditableRef.current.querySelectorAll("font[size='7']");
        let lastSpan: HTMLElement | null = null;

        fonts.forEach((font) => {
          const span = document.createElement("span");
          span.className = "size";
          span.style.fontSize = `var(${sizeVar})`;
          span.innerHTML = font.innerHTML;

          // İç içe geçmiş eski font size span'larını temizle
          span.querySelectorAll("span.size, span[style*='font-size']").forEach((nested) => {
            (nested as HTMLElement).style.fontSize = "";
            nested.classList.remove("size");
          });

          // Eğer font zaten bir üst span.size içindeyse ve tüm içeriği kapsıyorsa
          const parentSpan = font.parentElement?.closest("span.size, span[style*='font-size']") as HTMLElement | null;
          if (
            parentSpan &&
            contentEditableRef.current?.contains(parentSpan) &&
            parentSpan.textContent?.trim() === font.textContent?.trim()
          ) {
            parentSpan.replaceWith(span);
          } else {
            font.replaceWith(span);
          }
          lastSpan = span;
        });

        const updated = contentEditableRef.current.innerHTML;
        updateDescriptionWithHistory(updated);

        if (lastSpan) {
          const newRange = document.createRange();
          newRange.selectNodeContents(lastSpan);
          sel.removeAllRanges();
          sel.addRange(newRange);
          saveSelection();
        }
      }
    } catch (e) {
      console.error("Yazı boyutu güncellenirken hata:", e);
    }
  };

  const handleApplyFontSize = (sizeVar: string) => {
    if (isApplyingSizeRef.current) return;
    isApplyingSizeRef.current = true;
    setTimeout(() => {
      isApplyingSizeRef.current = false;
    }, 150);
    applyFontSize(sizeVar);
    setShowFontSizeDropdown(false);
  };

  const handleAddLink = () => {
    if (!linkUrl.trim()) return;
    restoreSelection();
    execEditorCommand("createLink", linkUrl.trim());
    setLinkUrl("");
    setShowLinkPopover(false);
  };

  const handleAddEditorImage = (url: string) => {
    if (!url.trim()) return;
    restoreSelection();
    execEditorCommand("insertImage", url.trim());
    setEditorImageUrl("");
    setShowImagePopover(false);
  };

  const handleEditorFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const apiKey = process.env.NEXT_PUBLIC_IMGBB_API_KEY;
      if (!apiKey) throw new Error("ImgBB API anahtarı tanımlı değil.");
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success && data.data.url) {
        handleAddEditorImage(data.data.url);
        toast({ title: "Görsel Açıklamaya Eklendi" });
      }
    } catch (err) {
      toast({
        title: "Görsel yüklenemedi",
        description: (err as Error).message,
        variant: "destructive",
      });
    }
  };

  // Ürünü Kopyalama Modalı Aç (Yeni Ürün Ekleme Akışı İle Birebir)
  const handleOpenCopyModal = () => {
    setShowCopyModal(true);
  };

  // Kopyalanan Yeni Ürünü Kaydet / Trendyol'a Yeni Renk Olarak Ekle
  const handleConfirmCopy = async () => {
    if (!copyBarcode.trim()) {
      await confirm({
        title: "Eksik Bilgi",
        message: "Barkod alanı zorunludur.",
        confirmText: "Tamam",
        variant: "warning",
      });
      return;
    }
    if (!copyStockCode.trim()) {
      await confirm({
        title: "Eksik Bilgi",
        message: "Stok Kodu (SKU) alanı zorunludur.",
        confirmText: "Tamam",
        variant: "warning",
      });
      return;
    }

    setCopying(true);
    try {
      if (copyMode === "new_color") {
        // Trendyol'a aynı modelin yeni rengini ekle
        const mCode = modelCode || listing.batch_id || stockCode?.split("-")[0] || "MOD";
        const variantImages = copyImages.length > 0 ? copyImages : images;

        const res = await fetch("/api/trendyol-submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model_code: mCode,
            product_main_id: mCode,
            title: `${title} (${copyColorName})`,
            brand_id: 1066155,
            brand_name: brandName,
            category_id: 1881,
            trendyol_category_id: 1881,
            description: description.replace(/Toptan sipari[şs] vermeyin\.?\s*/gi, "").trim(),
            desi: Number(desi) || 2,
            vat_rate: Number(vatRate) || 20,
            cargo_company: cargoCompany || null,
            items: [
              {
                title: `${title} (${copyColorName})`,
                barcode: copyBarcode.trim(),
                stockCode: copyStockCode.trim(),
                salePrice: Number(copySalePrice) || Number(salePrice),
                listPrice: Number(copySalePrice) || Number(listPrice) || Number(salePrice),
                quantity: Number(copyQuantity) || Number(quantity),
                images: variantImages,
                desi: Number(desi) || 2,
                vatRate: Number(vatRate) || 20,
                attributes: [
                  { attributeId: 338, customAttributeValue: material },
                  { attributeId: 1073, customAttributeValue: pieceCount },
                  { attributeId: 1040, customAttributeValue: origin },
                  { attributeId: 47, customAttributeValue: copyColorName },
                  { attributeId: 348, customAttributeValue: copyColorName },
                ],
              },
            ],
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          await confirm({
            title: "Yeni Renk Eklenemedi!",
            message: data.error || "Trendyol API isteği kabul etmedi. Lütfen barkod ve stok kodunu kontrol edin.",
            confirmText: "Düzelt",
            variant: "danger",
          });
          return;
        }

        toast({
          title: "✅ Yeni Renk Varyantı Başarıyla Eklendi",
          description: `Model: ${mCode} - Renk: ${copyColorName} (${copyBarcode}) tek hamlede Trendyol'a iletildi.`,
        });

        setShowCopyModal(false);
        onSaved();
        onClose();
      } else {
        // Yeni ürün olarak klonla
        const res = await fetch("/api/trendyol/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: copyTitle.trim() || `${title} (Kopya)`,
            description: sanitizeTrendyolDescription(description),
            barcode: copyBarcode.trim(),
            stock_code: copyStockCode.trim(),
            brand_name: brandName,
            sale_price: Number(salePrice),
            list_price: Number(listPrice),
            quantity: Number(quantity),
            vat_rate: Number(vatRate),
            desi: Number(desi),
            image_urls: images,
            cargo_company: cargoCompany || null,
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          await confirm({
            title: "Ürün Kopyalanamadı!",
            message: data.error || "Aynı barkod veya stok koduna sahip ürün sistemde zaten kayıtlı. Lütfen farklı bir barkod ve stok kodu belirleyin.",
            confirmText: "Düzelt",
            variant: "danger",
          });
          return;
        }

        toast({
          title: "✅ Ürün Başarıyla Kopyalandı",
          description: `Yeni ürün ("${copyBarcode}") eklendi.`,
        });

        setShowCopyModal(false);
        onSaved();
        onClose();
      }
    } catch (err) {
      await confirm({
        title: "Kopya Hatası",
        message: (err as Error).message || "İşlem sırasında hata meydana geldi.",
        confirmText: "Tamam",
        variant: "danger",
      });
    } finally {
      setCopying(false);
    }
  };

  // Kaydet / Güncelle
  const handleSubmit = async (overrideQuantity?: number) => {
    let changedKeys: string[] = [];

    // Eğer Model Kodu ile toplu varyant güncellemesi seçilmişse
    if (updateByModelCode) {
      const changes = getChangedFields();
      if (changes.length === 0) {
        await confirm({
          title: "Değişiklik Bulunamadı",
          message: "Herhangi bir alanda değişiklik yapmadınız. Diğer varyantlara aktarılacak bir değişiklik bulunmuyor.",
          confirmText: "Tamam",
          variant: "info",
        });
        return;
      }

      const confirmed = await confirm({
        title: "Toplu Varyant Güncelleme",
        message: (
          <div className="space-y-3.5 text-xs">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <span>Hedef Model:</span>
                <span className="px-2 py-0.5 rounded-md bg-orange-500/10 text-orange-600 dark:text-orange-400 font-mono font-bold text-xs border border-orange-500/20">
                  {modelCode}
                </span>
              </div>
              {modelVariantCount !== null && (
                <span className="px-2 py-0.5 rounded-md bg-orange-500/10 text-orange-600 dark:text-orange-400 font-semibold text-xs border border-orange-500/20">
                  {modelVariantCount} Aktif Varyant
                </span>
              )}
            </div>

            <div className="p-3.5 bg-muted/40 rounded-xl border border-border/80 space-y-2">
              <span className="text-[11px] font-bold text-muted-foreground tracking-wide uppercase block">
                Tüm Varyantlara Uygulanacak Değişiklikler:
              </span>
              <div className="space-y-1.5 pl-0.5">
                {changes.map((c, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs font-semibold text-foreground">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />
                    <span>{c.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 bg-emerald-500/10 border border-emerald-500/25 rounded-xl flex items-start gap-2 text-xs text-emerald-800 dark:text-emerald-200 leading-relaxed">
              <span className="text-sm shrink-0 mt-0.5">🛡️</span>
              <div>
                <span className="font-bold">Güvenlik Koruması:</span> Diğer renklerin fotoğrafları, barkodları ve stok kodları kesinlikle korunur, ezilmez.
              </div>
            </div>
          </div>
        ),
        confirmText: "Evet, Varyantları Güncelle",
        cancelText: "Vazgeç",
        variant: "warning",
      });

      if (!confirmed) {
        return;
      }

      changedKeys = changes.map((c) => c.key);
    }

    setLoading(true);
    try {
      const finalQuantity = overrideQuantity !== undefined ? overrideQuantity : Number(quantity);

      // Kategori niteliklerini Trendyol formatında topla
      const finalAttributes: Array<{ attributeId: number; attributeValueId?: number; customAttributeValue?: string | null }> = [];
      const rawAttrs: any[] = rawCategoryAttributesRef.current || [];

      const matchAttr = (attrId: number, valName: string) => {
        if (!valName) return null;
        const foundAttr = rawAttrs.find((a) => a.attribute?.id === attrId);
        if (foundAttr?.attributeValues) {
          const val = foundAttr.attributeValues.find(
            (v: any) =>
              v.name.toLowerCase() === valName.toLowerCase() ||
              v.name.toLowerCase().includes(valName.toLowerCase()) ||
              valName.toLowerCase().includes(v.name.toLowerCase())
          );
          if (val) return { attributeId: attrId, attributeValueId: val.id, customAttributeValue: null };
        }
        return null;
      };

      // 14: Materyal
      const matMatch = matchAttr(14, material);
      if (matMatch) finalAttributes.push(matMatch);
      // 18: Parça Sayısı
      const pieceMatch = matchAttr(18, pieceCount);
      if (pieceMatch) finalAttributes.push(pieceMatch);
      // 1192: Menşei
      const originCode = origin.includes("TR") ? "TR" : origin.split(" ")[0];
      const originMatch = matchAttr(1192, originCode) || matchAttr(1192, "TR");
      if (originMatch) finalAttributes.push(originMatch);
      // 286: Yükseklik
      const heightMatch = matchAttr(286, height);
      if (heightMatch) finalAttributes.push(heightMatch);
      // 348: Web Color
      const webColorMatch = matchAttr(348, webColor);
      if (webColorMatch) finalAttributes.push(webColorMatch);
      // 47: Renk
      if (color || webColor) {
        finalAttributes.push({ attributeId: 47, attributeValueId: null as any, customAttributeValue: color || webColor });
      }
      // 870: Persona
      if (persona) {
        const personaMatch = matchAttr(870, persona);
        if (personaMatch) finalAttributes.push(personaMatch);
      }
      // Üretici Bilgileri
      if (producerName) finalAttributes.push({ attributeId: 1198, customAttributeValue: producerName });
      if (producerMail) finalAttributes.push({ attributeId: 1294, customAttributeValue: producerMail });
      if (producerAddress) finalAttributes.push({ attributeId: 1296, customAttributeValue: producerAddress });
      // İthalatçı Bilgileri
      if (importerName) finalAttributes.push({ attributeId: 1216, customAttributeValue: importerName });
      if (importerMail) finalAttributes.push({ attributeId: 1305, customAttributeValue: importerMail });
      if (importerAddress) finalAttributes.push({ attributeId: 1304, customAttributeValue: importerAddress });

      // Sevkiyat ve İade Adres ID'lerini parse et
      const shipmentMatch = shipmentAddress.match(/\((\d+)\)/);
      const shipmentAddressId = shipmentMatch ? Number(shipmentMatch[1]) : undefined;

      const returningMatch = returningAddress.match(/\((\d+)\)/);
      const returningAddressId = returningMatch ? Number(returningMatch[1]) : undefined;

      const payload = {
        id: listing.id,
        barcode,
        title,
        description: sanitizeTrendyolDescription(description),
        sale_price: Number(salePrice),
        list_price: Number(listPrice),
        quantity: finalQuantity,
        vat_rate: Number(vatRate),
        desi: Number(desi),
        stock_code: stockCode,
        brand_name: brandName,
        brand_id: brandId,
        category_name: categoryName,
        category_id: categoryId,
        image_urls: images,
        cargo_company: cargoCompany || null,
        updateByModelCode,
        modelCode,
        changedFields: changedKeys,
        attributes: finalAttributes,
        delivery_duration: Number(deliveryDuration || 0),
        shipment_address_id: shipmentAddressId,
        returning_address_id: returningAddressId,
        lot_number: lotNumber || null,
        special_consumption_tax: specialConsumptionTax ? Number(specialConsumptionTax) : null,
        gift_wrap: giftWrap,
        customizable: customizable,
      };

      const res = await fetch("/api/trendyol/products", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || data.apiError || "Güncelleme başarısız oldu");
      }

      toast({
        title: "✅ Ürün Başarıyla Güncellendi",
        description: updateByModelCode
          ? `Aynı model koduna (${modelCode}) sahip ${data.updatedCount} varyantın seçilen özellikleri başarıyla güncellendi.`
          : "Ürün bilgileri başarıyla güncellendi.",
      });

      onSaved();
      onClose();
    } catch (err) {
      await confirm({
        title: "Güncelleme Hatası",
        message: (err as Error).message || "Ürün güncellenirken bir hata oluştu.",
        confirmText: "Tamam",
        variant: "danger",
      });
    } finally {
      setLoading(false);
    }
  };

  // Arşive Al
  const handleArchive = async (deleteCompletely = false) => {
    const confirmTitle = deleteCompletely ? "Ürünü Sil" : "Ürünü Pasife Al";
    const confirmMsg = deleteCompletely
      ? "Bu ürünü tamamen silmek istediğinize emin misiniz? Bu işlem geri alınamaz."
      : "Bu ürünü arşive alıp satıştan kaldırmak istediğinize emin misiniz?";

    const confirmed = await confirm({
      title: confirmTitle,
      message: confirmMsg,
      confirmText: deleteCompletely ? "Evet, Sil" : "Evet, Pasife Al",
      cancelText: "Vazgeç",
      variant: deleteCompletely ? "danger" : "warning",
    });
    if (!confirmed) return;

    setLoading(true);
    try {
      const res = await fetch(
        `/api/trendyol/products?id=${listing.id}&barcode=${barcode}&archive=${!deleteCompletely}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "İşlem başarısız");

      toast({
        title: deleteCompletely ? "Ürün Silindi" : "Ürün Arşive Alındı",
        description: "İşlem tamamlandı.",
      });
      onSaved();
      onClose();
    } catch (err) {
      toast({
        title: "Hata",
        description: (err as Error).message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-background border border-border rounded-2xl w-full max-w-7xl shadow-2xl flex flex-col h-[94vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">

        {/* ─── TAM SAYFA KOPYALAMA / YENİ RENK FORMU (YENİ ÜRÜN EKLEME AKIŞI İLE BİREBİR) ─── */}
        {showCopyModal ? (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-muted/20">
            <div className="max-w-6xl mx-auto">
              <TrendyolProductCreateFlow
                modeTitle="Ürün Kopyalama & Yeni Renk Ekleme"
                initialData={{
                  title: title,
                  modelCode: modelCode || listing.batch_id || stockCode?.split("-")[0] || "",
                  categoryId: categoryId || (listing as any).category_id,
                  categoryName: categoryName || (listing as any).category_name || "",
                  brandId: brandId || (listing as any).brand_id,
                  brandName: brandName || (listing as any).brand_name || "",
                  description: description,
                  material: material || "Plastik",
                  pieceCount: pieceCount || "1",
                  height: height || "",
                  origin: origin || "TR - (Türkiye)",
                  desi: desi || "2",
                  images: [],
                  barcode: "",
                  stockCode: "",
                }}
                onSuccess={() => {
                  setShowCopyModal(false);
                  onSaved?.();
                }}
                onClose={() => setShowCopyModal(false)}
              />
            </div>
          </div>
        ) : (
          <>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-border bg-card/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center font-bold">
              TY
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                Ürün Detay & Düzenleme
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400 font-semibold">
                  Trendyol Seller Center
                </span>
              </h3>
              <p className="text-xs text-muted-foreground">
                Barkod: <span className="font-mono text-foreground font-semibold">{barcode}</span> • Model:{" "}
                <span className="font-mono text-foreground font-semibold">{modelCode}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Ana İçerik: Sol Anchor Stepper + Sağ Scrollable Tek Sayfa */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
          {/* Sol Panel: Dikey Anchor Stepper (Trendyol Birebir Çizgili Menü) */}
          <div className="w-full md:w-64 border-r border-border bg-muted/10 p-6 shrink-0 flex flex-col justify-between overflow-y-auto">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">
                Bölümler
              </p>
              <div className="relative pl-1">
                {steps.map((step, idx) => {
                  const isActive = activeSection === step.id;
                  const isPast = activeSection > step.id;
                  return (
                    <div key={step.id} className="relative pb-6 last:pb-0">
                      {/* Çizgi */}
                      {idx < steps.length - 1 && (
                        <div
                          className={`absolute left-[5px] top-3.5 bottom-0 w-[2px] transition-colors ${
                            isPast || isActive ? "bg-orange-500" : "bg-border"
                          }`}
                        />
                      )}
                      {/* Stepper Butonu */}
                      <button
                        type="button"
                        onClick={() => scrollToSection(step.id)}
                        className="flex items-center gap-3 text-left group cursor-pointer w-full text-xs"
                      >
                        <div
                          className={`w-3 h-3 rounded-full border-2 transition-all shrink-0 z-10 ${
                            isActive
                              ? "border-orange-500 bg-orange-500 ring-4 ring-orange-500/20 scale-110"
                              : isPast
                              ? "border-orange-500 bg-orange-500"
                              : "border-muted-foreground/40 bg-card group-hover:border-orange-400"
                          }`}
                        />
                        <span
                          className={`font-semibold transition-colors ${
                            isActive
                              ? "text-orange-600 dark:text-orange-400 font-bold text-[13px]"
                              : "text-muted-foreground group-hover:text-foreground"
                          }`}
                        >
                          {step.title}
                        </span>
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Model Kodu Toplu Güncelleme Bilgi Kutusu */}
              <div className="mt-8 p-3.5 rounded-xl border border-orange-500/30 bg-orange-500/5 space-y-2 text-xs">
                <label className="flex items-start gap-2 cursor-pointer font-semibold text-foreground">
                  <input
                    type="checkbox"
                    checked={updateByModelCode}
                    onChange={(e) => setUpdateByModelCode(e.target.checked)}
                    className="mt-0.5 rounded text-orange-600 focus:ring-orange-500"
                  />
                  <span className="flex items-center gap-1.5 flex-wrap">
                    <span>Aynı Model Koduna ({modelCode}) sahip tüm varyantları da güncelle</span>
                    {modelVariantCount !== null && (
                      <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-orange-500/20 text-orange-600 dark:text-orange-400 font-bold">
                        {modelVariantCount} aktif varyant
                      </span>
                    )}
                  </span>
                </label>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  İşaretlenirse bu modele ait diğer varyantlarda <strong>yalnızca değiştirdiğiniz özellikler</strong> (örn: açıklama veya fiyat) güncellenir. Diğer renklerin fotoğrafları, barkodları ve renk özellikleri kesinlikle korunur.
                </p>
              </div>
            </div>
          </div>

          {/* Sağ Panel: Tek Scrollable Sayfa (Tüm Bölümler Alt Alta) */}
          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="flex-1 p-6 overflow-y-auto space-y-10 scroll-smooth"
          >
            {/* 1. ÜRÜN BİLGİLERİ */}
            <section id="section-0" className="space-y-6 scroll-mt-6">
              <div className="border-b pb-3">
                <h4 className="text-base font-bold text-foreground">1. Ürün Bilgileri</h4>
                <p className="text-xs text-muted-foreground">Temel ürün başlığı, barkod ve görsel medyası</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2 space-y-1.5">
                  <Label className="text-xs font-semibold">Ürün Adı *</Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ürün Başlığı"
                    className="font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Model Kodu *</Label>
                  <Input
                    value={modelCode}
                    onChange={(e) => setModelCode(e.target.value)}
                    placeholder="Örn: PTR-VZO-01"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Barkod *</Label>
                  <Input value={barcode} readOnly disabled className="bg-muted font-mono" />
                </div>

                {/* Trendyol Kategori Seçimi (Canlı API Arama) */}
                <div ref={categoryWrapRef} className="space-y-1.5 relative">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold flex items-center gap-1.5">
                      Kategori *
                      {categoryId && (
                        <span className="text-[10px] font-mono font-normal px-1.5 py-0.5 rounded bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300">
                          ID: {categoryId}
                        </span>
                      )}
                    </Label>
                    {categoryLoading && (
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin text-orange-500" />
                        <span>Kategoriler çekiliyor...</span>
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <Input
                      value={categoryQuery}
                      onChange={(e) => handleCategorySearch(e.target.value)}
                      onFocus={() => {
                        if (categoryResults.length > 0) setCategoryDropdownOpen(true);
                        else handleCategorySearch(categoryQuery);
                      }}
                      placeholder="Kategori arayın (Örn: Vazo, Tabak, Bardak...)"
                      className="text-xs font-medium pr-8"
                    />
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                      {categoryLoading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-500" />
                      ) : (
                        <Search className="w-3.5 h-3.5" />
                      )}
                    </div>
                  </div>

                  {/* Kategori Dropdown Sonuçları */}
                  {categoryDropdownOpen && categoryResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-xl shadow-xl z-50 max-h-64 overflow-y-auto divide-y divide-border">
                      {categoryResults.map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => handleSelectCategory(cat)}
                          className="w-full text-left p-2.5 hover:bg-muted/70 transition-colors flex items-center justify-between group cursor-pointer"
                        >
                          <div className="space-y-0.5 pr-2">
                            <p className="text-xs font-bold text-foreground group-hover:text-orange-600 dark:group-hover:text-orange-400">
                              {cat.name}
                            </p>
                            {cat.path && (
                              <p className="text-[10px] text-muted-foreground line-clamp-1">
                                {cat.path}
                              </p>
                            )}
                          </div>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0 group-hover:bg-orange-100 group-hover:text-orange-700 dark:group-hover:bg-orange-950 dark:group-hover:text-orange-300">
                            #{cat.id}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Trendyol Marka Seçimi (Canlı API Arama + Ürünümün Markası Yok Seçeneği) */}
                <div ref={brandWrapRef} className="space-y-1.5 relative">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold flex items-center gap-1.5">
                      Marka *
                      {brandId && brandMode === "custom" && (
                        <span className="text-[10px] font-mono font-normal px-1.5 py-0.5 rounded bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300">
                          ID: {brandId}
                        </span>
                      )}
                    </Label>
                    {/* Trendyol Seller Center Radio Butonları */}
                    <div className="flex items-center gap-3 text-[11px] font-medium">
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="radio"
                          name="brandMode"
                          checked={brandMode === "custom"}
                          onChange={() => {
                            setBrandMode("custom");
                            setBrandName("ahenk tasarım");
                            setBrandQuery("ahenk tasarım");
                            setBrandId(1066155);
                          }}
                          className="accent-orange-500"
                        />
                        <span>Marka Ekle</span>
                      </label>
                      <label className="flex items-center gap-1 cursor-pointer text-muted-foreground hover:text-foreground">
                        <input
                          type="radio"
                          name="brandMode"
                          checked={brandMode === "no-brand"}
                          onChange={() => {
                            setBrandMode("no-brand");
                            setBrandName("Genel Markalar");
                            setBrandQuery("Genel Markalar");
                            setBrandId(109986);
                            setBrandDropdownOpen(false);
                          }}
                          className="accent-orange-500"
                        />
                        <span>Markasız</span>
                      </label>
                    </div>
                  </div>

                  {brandMode === "no-brand" ? (
                    <div className="h-9 px-3 bg-muted/60 border rounded-md text-xs text-muted-foreground flex items-center justify-between">
                      <span>Marka: <strong>Genel Markalar</strong> (ID: 109986)</span>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">Markasız Ürün</span>
                    </div>
                  ) : (
                    <div className="relative">
                      <Input
                        value={brandQuery}
                        onChange={(e) => {
                          isBrandFocusedRef.current = true;
                          setBrandQuery(e.target.value);
                          setBrandName(e.target.value);
                          setBrandId(null);
                        }}
                        onFocus={() => {
                          isBrandFocusedRef.current = true;
                          if (brandResults.length > 0) setBrandDropdownOpen(true);
                        }}
                        placeholder="En az 2 karakter girmelisiniz (Örn: ahenk tasarım, Paşabahçe...)"
                        className="text-xs font-medium pr-8"
                      />
                      <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                        {brandLoading ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-500" />
                        ) : (
                          <Search className="w-3.5 h-3.5" />
                        )}
                      </div>

                      {/* Marka Dropdown Sonuçları */}
                      {brandDropdownOpen && brandResults.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-xl shadow-xl z-50 max-h-56 overflow-y-auto divide-y divide-border">
                          {brandResults.map((b) => (
                            <button
                              key={b.id}
                              type="button"
                              onClick={() => handleSelectBrand(b)}
                              className="w-full text-left p-2.5 hover:bg-muted/70 transition-colors flex items-center justify-between group cursor-pointer"
                            >
                              <span className="text-xs font-bold text-foreground group-hover:text-orange-600 dark:group-hover:text-orange-400">
                                {b.name}
                              </span>
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground group-hover:bg-orange-100 group-hover:text-orange-700 dark:group-hover:bg-orange-950 dark:group-hover:text-orange-300">
                                #{b.id}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Ürün Medya Galerisi */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-foreground">Ürün Medya Galerisi (Max 8 Görsel)</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowImageInput(!showImageInput)}
                      className="text-xs cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5 mr-1.5" />
                      URL İle Ekle
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs bg-orange-600 hover:bg-orange-700 text-white cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5 mr-1.5" />
                      Görsel Yükle
                    </Button>
                  </div>
                </div>

                {/* URL Giriş Alanı */}
                {showImageInput && (
                  <div className="flex gap-2 p-3 bg-muted/40 rounded-xl border border-border">
                    <Input
                      value={newImageUrl}
                      onChange={(e) => setNewImageUrl(e.target.value)}
                      placeholder="https://... resim linki yapıştırın"
                      className="text-xs flex-1"
                    />
                    <Button size="sm" onClick={addImageUrl} className="cursor-pointer">
                      Ekle
                    </Button>
                  </div>
                )}

                {/* Resim Kartları */}
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
                  {images.map((imgUrl, idx) => (
                    <div
                      key={idx}
                      className="relative group rounded-xl border border-border bg-card overflow-hidden shadow-xs"
                    >
                      <img
                        src={imgUrl}
                        alt={`product-${idx}`}
                        className="w-full h-32 object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            "https://placehold.co/200x200?text=Görsel+Hata";
                        }}
                      />

                      {/* İlk görsel rozeti */}
                      {idx === 0 && (
                        <span className="absolute top-2 left-2 bg-orange-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-xs">
                          Öne Çıkarılan
                        </span>
                      )}

                      {/* Hover İşlem Menüsü */}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                        <div className="flex items-center gap-1.5">
                          {idx > 0 && (
                            <button
                              type="button"
                              onClick={() => moveImage(idx, "left")}
                              className="p-1.5 rounded-lg bg-white/20 hover:bg-white/40 text-white text-xs cursor-pointer"
                              title="Sola taşı"
                            >
                              <MoveLeft className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {idx < images.length - 1 && (
                            <button
                              type="button"
                              onClick={() => moveImage(idx, "right")}
                              className="p-1.5 rounded-lg bg-white/20 hover:bg-white/40 text-white text-xs cursor-pointer"
                              title="Sağa taşı"
                            >
                              <MoveRight className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeImage(idx)}
                          className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs flex items-center gap-1 font-semibold cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" /> Sil
                        </button>
                      </div>
                    </div>
                  ))}

                  {images.length === 0 && (
                    <div className="col-span-full border border-dashed rounded-xl p-8 text-center text-muted-foreground text-sm">
                      Henüz görsel eklenmedi. "Görsel Yükle" veya "URL İle Ekle" butonlarını kullanın.
                    </div>
                  )}
                </div>
              </div>

              {/* ─── TRENDYOL BİREBİR ÜRÜN AÇIKLAMASI WYSIWYG EDİTÖRÜ ─── */}
              <div ref={editorWrapRef} className="space-y-3 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div>
                    <Label className="text-xs font-bold text-foreground">Ürün Açıklaması</Label>
                    <p className="text-[11px] text-muted-foreground">
                      Açık ve detaylı bir ürün açıklaması, <strong>satışlarınızı artırır</strong> ve <strong>iade riskini azaltır.</strong>
                    </p>
                  </div>
                </div>

                {/* Gizli Görsel Dosya Input */}
                <input
                  ref={editorFileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/gif"
                  className="hidden"
                  onChange={handleEditorFileUpload}
                />

                {/* Zengin Editör Konteyneri */}
                <div className="border border-border rounded-xl bg-card overflow-visible shadow-xs relative">
                  {/* Toolbar (Trendyol Birebir Araç Çubuğu) */}
                  <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-[#f8fafc] dark:bg-muted/40 border-b border-border text-xs select-none">
                    {/* Sol: Biçimlendirme Araç Grupları */}
                    <div className="flex flex-wrap items-center gap-1">
                      {/* Grup 1: Kalın, İtalik, Altı Çizili */}
                      <div className="flex items-center bg-background rounded-lg border border-border/80 p-0.5 shadow-2xs">
                        <button
                          type="button"
                          cy-id="editor-tool-bold"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            execEditorCommand("bold");
                          }}
                          onClick={(e) => e.preventDefault()}
                          className="w-7 h-7 rounded hover:bg-muted font-bold flex items-center justify-center cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
                          title="Kalın"
                        >
                          <Bold className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          cy-id="editor-tool-italic"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            execEditorCommand("italic");
                          }}
                          onClick={(e) => e.preventDefault()}
                          className="w-7 h-7 rounded hover:bg-muted italic flex items-center justify-center cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
                          title="İtalik"
                        >
                          <Italic className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          cy-id="editor-tool-underline"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            execEditorCommand("underline");
                          }}
                          onClick={(e) => e.preventDefault()}
                          className="w-7 h-7 rounded hover:bg-muted underline flex items-center justify-center cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
                          title="Altı Çizili"
                        >
                          <Underline className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Grup 2: Hizalama (Sol, Orta, Sağ) */}
                      <div className="flex items-center bg-background rounded-lg border border-border/80 p-0.5 shadow-2xs">
                        <button
                          type="button"
                          cy-id="editor-tool-align-left"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            execEditorCommand("justifyLeft");
                          }}
                          onClick={(e) => e.preventDefault()}
                          className="w-7 h-7 rounded hover:bg-muted flex items-center justify-center cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
                          title="Sola Hizala"
                        >
                          <AlignLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          cy-id="editor-tool-align-center"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            execEditorCommand("justifyCenter");
                          }}
                          onClick={(e) => e.preventDefault()}
                          className="w-7 h-7 rounded hover:bg-muted flex items-center justify-center cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
                          title="Ortala"
                        >
                          <AlignCenter className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          cy-id="editor-tool-align-right"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            execEditorCommand("justifyRight");
                          }}
                          onClick={(e) => e.preventDefault()}
                          className="w-7 h-7 rounded hover:bg-muted flex items-center justify-center cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
                          title="Sağa Hizala"
                        >
                          <AlignRight className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Grup 3: Yazı Boyutu & Renk */}
                      <div className="flex items-center bg-background rounded-lg border border-border/80 p-0.5 shadow-2xs relative">
                        {/* Yazı Boyutu Dropdown */}
                        <div className="relative">
                          <button
                            type="button"
                            cy-id="editor-tool-fontsize"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              saveSelection();
                              setShowFontSizeDropdown(!showFontSizeDropdown);
                              setShowColorPopover(false);
                              setShowLinkPopover(false);
                              setShowImagePopover(false);
                            }}
                            className="h-7 px-2 text-xs flex items-center gap-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground font-medium cursor-pointer"
                            title="Yazı Boyutu"
                          >
                            <span>Yazı Boyutu</span>
                            <ChevronDown className="w-3 h-3 opacity-70" />
                          </button>

                          {showFontSizeDropdown && (
                            <div className="absolute top-full left-0 mt-1.5 w-36 bg-popover border border-border rounded-xl shadow-xl z-50 py-1 divide-y divide-border/60">
                              {[
                                { label: "En küçük", sizeVar: "--bl-font-size-2xs", desc: "10px", cyId: "font-size-1" },
                                { label: "Çok küçük", sizeVar: "--bl-font-size-xs", desc: "12px", cyId: "font-size-2" },
                                { label: "Küçük", sizeVar: "--bl-font-size-s", desc: "14px", cyId: "font-size-3" },
                                { label: "Orta", sizeVar: "--bl-font-size-m", desc: "16px", cyId: "font-size-4" },
                                { label: "Büyük", sizeVar: "--bl-font-size-xl", desc: "20px", cyId: "font-size-5" },
                                { label: "Çok büyük", sizeVar: "--bl-font-size-2xl", desc: "24px", cyId: "font-size-6" },
                                { label: "En büyük", sizeVar: "--bl-font-size-3xl", desc: "32px", cyId: "font-size-7" },
                              ].map((item) => (
                                <button
                                  key={item.sizeVar}
                                  type="button"
                                  cy-id={item.cyId}
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    handleApplyFontSize(item.sizeVar);
                                  }}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    handleApplyFontSize(item.sizeVar);
                                  }}
                                  className="w-full text-left px-3 py-1.5 hover:bg-muted flex items-center justify-between text-xs cursor-pointer group transition-colors"
                                >
                                  <span className="text-foreground group-hover:text-orange-600 font-medium">{item.label}</span>
                                  <span className="text-[10px] text-muted-foreground font-mono">{item.desc}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Renk Paleti Popover */}
                        <div className="relative">
                          <button
                            type="button"
                            cy-id="editor-tool-color"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              saveSelection();
                              setShowColorPopover(!showColorPopover);
                              setShowFontSizeDropdown(false);
                              setShowLinkPopover(false);
                              setShowImagePopover(false);
                            }}
                            className="w-7 h-7 rounded hover:bg-muted flex items-center justify-center cursor-pointer text-muted-foreground hover:text-foreground"
                            title="Yazı Rengi"
                          >
                            <Palette className="w-3.5 h-3.5" />
                          </button>

                          {showColorPopover && (
                            <div className="absolute top-full left-0 mt-1.5 p-2 bg-popover border border-border rounded-xl shadow-xl z-50 grid grid-cols-4 gap-1.5 w-44">
                              {[
                                { name: "Siyah", hex: "#000000" },
                                { name: "Koyu Gri", hex: "#565656" },
                                { name: "Gri", hex: "#999999" },
                                { name: "Kırmızı", hex: "#de001b" },
                                { name: "Mavi", hex: "#1f3897" },
                                { name: "Açık Mavi", hex: "#71b2ff" },
                                { name: "Yeşil", hex: "#7ed321" },
                                { name: "Koyu Yeşil", hex: "#2b7a0b" },
                                { name: "Turuncu", hex: "#f5a623" },
                                { name: "Mor", hex: "#8331cc" },
                                { name: "Pembe", hex: "#ffa8e7" },
                                { name: "Kahverengi", hex: "#8b572a" },
                              ].map((c) => (
                                <button
                                  key={c.hex}
                                  type="button"
                                  title={c.name}
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    restoreSelection();
                                    execEditorCommand("foreColor", c.hex);
                                    setShowColorPopover(false);
                                  }}
                                  onClick={(e) => e.preventDefault()}
                                  style={{ backgroundColor: c.hex }}
                                  className="w-7 h-7 rounded-md border border-black/10 hover:scale-110 transition-transform cursor-pointer shadow-2xs"
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Grup 4: Liste, Satır Bırak, Temizle */}
                      <div className="flex items-center bg-background rounded-lg border border-border/80 p-0.5 shadow-2xs">
                        <button
                          type="button"
                          cy-id="editor-tool-list"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            execEditorCommand("insertUnorderedList");
                          }}
                          onClick={(e) => e.preventDefault()}
                          className="w-7 h-7 rounded hover:bg-muted flex items-center justify-center cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
                          title="Liste"
                        >
                          <List className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          cy-id="editor-tool-line-break"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            execEditorCommand("insertParagraph");
                          }}
                          onClick={(e) => e.preventDefault()}
                          className="w-7 h-7 rounded hover:bg-muted flex items-center justify-center cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
                          title="Satır Bırak"
                        >
                          <CornerDownLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          cy-id="editor-tool-clean"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            execEditorCommand("removeFormat");
                          }}
                          onClick={(e) => e.preventDefault()}
                          className="w-7 h-7 rounded hover:bg-muted flex items-center justify-center cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
                          title="Yazı Denetimi / Biçimi Temizle"
                        >
                          <Eraser className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Grup 5: Link Ekle & Medya Ekle (Popovers) */}
                      <div className="flex items-center bg-background rounded-lg border border-border/80 p-0.5 shadow-2xs relative">
                        {/* Link Ekle Popover */}
                        <div className="relative">
                          <button
                            type="button"
                            cy-id="link-button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              saveSelection();
                              setShowLinkPopover(!showLinkPopover);
                              setShowImagePopover(false);
                              setShowColorPopover(false);
                              setShowFontSizeDropdown(false);
                            }}
                            className="w-7 h-7 rounded hover:bg-muted flex items-center justify-center cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
                            title="Link Ekle"
                          >
                            <LinkIcon className="w-3.5 h-3.5" />
                          </button>

                          {showLinkPopover && (
                            <div className="absolute top-full left-0 mt-1.5 w-72 p-3 bg-popover border border-border rounded-xl shadow-2xl z-50 space-y-2">
                              <p className="text-xs font-bold text-foreground">Link Ekle</p>
                              <Input
                                cy-id="url-input"
                                value={linkUrl}
                                onChange={(e) => setLinkUrl(e.target.value)}
                                placeholder="URL'i ekleyin (https://...)"
                                className="text-xs h-8"
                              />
                              <small className="text-[10px] text-muted-foreground block">
                                'trendyol.com' dışındaki sitelere yönlendirme yapamazsınız.
                              </small>
                              <div className="flex justify-end gap-1.5 pt-1">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setShowLinkPopover(false)}
                                  className="h-7 text-xs cursor-pointer"
                                >
                                  İptal
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  cy-id="add-link-button"
                                  onClick={handleAddLink}
                                  className="h-7 text-xs bg-orange-600 hover:bg-orange-700 text-white cursor-pointer font-semibold"
                                >
                                  Link Ekle
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Medya / Görsel Ekle Popover */}
                        <div className="relative">
                          <button
                            type="button"
                            cy-id="uploadButton"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              saveSelection();
                              setShowImagePopover(!showImagePopover);
                              setShowLinkPopover(false);
                              setShowColorPopover(false);
                              setShowFontSizeDropdown(false);
                            }}
                            className="w-7 h-7 rounded hover:bg-muted flex items-center justify-center cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
                            title="Medya / Görsel Ekle"
                          >
                            <ImageIcon className="w-3.5 h-3.5" />
                          </button>

                          {showImagePopover && (
                            <div className="absolute top-full left-0 mt-1.5 w-80 p-3.5 bg-popover border border-border rounded-xl shadow-2xl z-50 space-y-2.5">
                              <div className="flex items-center justify-between">
                                <p className="text-xs font-bold text-foreground">Görsel Ekle</p>
                                <Button
                                  type="button"
                                  size="sm"
                                  cy-id="selectFile"
                                  variant="outline"
                                  onClick={() => editorFileInputRef.current?.click()}
                                  className="h-7 text-xs border-emerald-600 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 cursor-pointer font-medium flex items-center gap-1"
                                >
                                  <Upload className="w-3 h-3" /> Dosya Yükle
                                </Button>
                              </div>
                              <Input
                                cy-id="add-image-input"
                                value={editorImageUrl}
                                onChange={(e) => setEditorImageUrl(e.target.value)}
                                placeholder="Görsel URL'ini ekleyin (https://...)"
                                className="text-xs h-8"
                              />
                              <small className="text-[10px] text-muted-foreground block">
                                Sadece `.jpg`, `.jpeg`, `.png` veya `.gif` uzantılı görselleri ekleyebilirsiniz.
                              </small>
                              <div className="flex justify-end gap-1.5 pt-1">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setShowImagePopover(false)}
                                  className="h-7 text-xs cursor-pointer"
                                >
                                  İptal
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  cy-id="add-image-button"
                                  onClick={() => handleAddEditorImage(editorImageUrl)}
                                  className="h-7 text-xs bg-orange-600 hover:bg-orange-700 text-white cursor-pointer font-semibold"
                                >
                                  Görsel Ekle
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Grup 6: HTML Göster/Gizle, Geri, İleri */}
                      <div className="flex items-center bg-background rounded-lg border border-border/80 p-0.5 shadow-2xs">
                        <button
                          type="button"
                          cy-id="htmlView"
                          onClick={() => setShowHtml(!showHtml)}
                          className={`h-7 px-2 rounded font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors ${
                            showHtml
                              ? "bg-slate-800 text-white dark:bg-slate-700 shadow-xs"
                              : "hover:bg-muted text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <Code className="w-3.5 h-3.5" />
                          <span>{showHtml ? "Html Gizle" : "Html Göster"}</span>
                        </button>

                        <button
                          type="button"
                          cy-id="editor-tool-undo"
                          disabled={descHistoryIdx <= 0}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleUndo();
                          }}
                          onClick={(e) => {
                            e.preventDefault();
                            handleUndo();
                          }}
                          className={`w-7 h-7 rounded flex items-center justify-center transition-colors ${
                            descHistoryIdx <= 0
                              ? "opacity-30 cursor-not-allowed text-muted-foreground"
                              : "hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                          }`}
                          title="Geri Al (Ctrl+Z)"
                        >
                          <Undo className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          cy-id="editor-tool-redo"
                          disabled={descHistoryIdx >= descHistory.length - 1}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleRedo();
                          }}
                          onClick={(e) => {
                            e.preventDefault();
                            handleRedo();
                          }}
                          className={`w-7 h-7 rounded flex items-center justify-center transition-colors ${
                            descHistoryIdx >= descHistory.length - 1
                              ? "opacity-30 cursor-not-allowed text-muted-foreground"
                              : "hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                          }`}
                          title="İleri Al (Ctrl+Y)"
                        >
                          <Redo className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Sağ: Özel Aksiyon Butonları (Yapay Zeka + Açıklamayı Getir) */}
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        cy-id="create-with-ai"
                        onClick={generateAiDescription}
                        disabled={aiGenerating}
                        className="h-7 px-3 text-xs bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{aiGenerating ? "Yazılıyor..." : "Yapay Zeka ile hızlı açıklama oluştur"}</span>
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        cy-id="get-html-content"
                        onClick={handleLoadTemplate}
                        disabled={loadingOriginalDesc}
                        className="h-7 px-3 text-xs bg-[#f27a1a] hover:bg-[#d9650d] text-white font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        {loadingOriginalDesc ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <RotateCcw className="w-3.5 h-3.5" />
                        )}
                        <span>{loadingOriginalDesc ? "Getiriliyor..." : "Açıklamayı Getir"}</span>
                      </Button>
                    </div>
                  </div>

                  {/* HTML Kod Editörü (Trendyol'daki Siyah Monospace Alan - "Html Göster" tıklandığında) */}
                  {showHtml && (
                    <div className="bg-[#1e1e1e] p-4 text-[#d4d4d4] font-mono text-xs overflow-x-auto border-b border-border">
                      <textarea
                        ref={textareaRef}
                        cy-id="html-editor"
                        value={description}
                        onChange={(e) => updateDescriptionWithHistory(e.target.value)}
                        onKeyDown={handleEditorKeyDown}
                        rows={10}
                        className="w-full bg-transparent border-none text-[#9cdcfe] font-mono text-xs leading-relaxed focus:ring-0 resize-y p-0 outline-hidden"
                        placeholder="<div>...</div>"
                      />
                    </div>
                  )}

                  {/* Gerçek Zengin Metin Alanı (Trendyol contenteditable="true") */}
                  <div className="rt-editor-body p-6 bg-background min-h-[260px]">
                    <style
                      dangerouslySetInnerHTML={{
                        __html: `
                        #rich-content-wrapper,
                        .rt-editor-body {
                          --bl-font-size-2xs: 10px;
                          --bl-font-size-xs: 12px;
                          --bl-font-size-s: 14px;
                          --bl-font-size-m: 16px;
                          --bl-font-size-l: 18px;
                          --bl-font-size-xl: 20px;
                          --bl-font-size-2xl: 24px;
                          --bl-font-size-3xl: 32px;
                          outline: none;
                        }
                        #rich-content-wrapper span.size,
                        #rich-content-wrapper span[style*="font-size"],
                        .rt-editor-body span.size,
                        .rt-editor-body span[style*="font-size"] {
                          display: inline;
                          line-height: normal;
                        }
                        #rich-content-wrapper span[style*="--bl-font-size-2xs"], .rt-editor-body span[style*="--bl-font-size-2xs"] { font-size: 10px !important; line-height: 1.3 !important; }
                        #rich-content-wrapper span[style*="--bl-font-size-xs"], .rt-editor-body span[style*="--bl-font-size-xs"] { font-size: 12px !important; line-height: 1.4 !important; }
                        #rich-content-wrapper span[style*="--bl-font-size-s"], .rt-editor-body span[style*="--bl-font-size-s"] { font-size: 14px !important; line-height: 1.4 !important; }
                        #rich-content-wrapper span[style*="--bl-font-size-m"], .rt-editor-body span[style*="--bl-font-size-m"] { font-size: 16px !important; line-height: 1.5 !important; }
                        #rich-content-wrapper span[style*="--bl-font-size-l"], .rt-editor-body span[style*="--bl-font-size-l"] { font-size: 18px !important; line-height: 1.5 !important; }
                        #rich-content-wrapper span[style*="--bl-font-size-xl"], .rt-editor-body span[style*="--bl-font-size-xl"] { font-size: 20px !important; line-height: 1.5 !important; }
                        #rich-content-wrapper span[style*="--bl-font-size-2xl"], .rt-editor-body span[style*="--bl-font-size-2xl"] { font-size: 24px !important; line-height: 1.4 !important; }
                        #rich-content-wrapper span[style*="--bl-font-size-3xl"], .rt-editor-body span[style*="--bl-font-size-3xl"] { font-size: 32px !important; line-height: 1.3 !important; }
                        #rich-content-wrapper ul {
                          list-style-type: disc !important;
                          margin-top: 8px !important;
                          margin-bottom: 8px !important;
                          padding-left: 24px !important;
                        }
                        #rich-content-wrapper ol {
                          list-style-type: decimal !important;
                          margin-top: 8px !important;
                          margin-bottom: 8px !important;
                          padding-left: 24px !important;
                        }
                        #rich-content-wrapper li {
                          display: list-item !important;
                          list-style-type: disc !important;
                          margin-top: 4px !important;
                          margin-bottom: 4px !important;
                        }
                        #rich-content-wrapper ol li {
                          list-style-type: decimal !important;
                        }
                        #rich-content-wrapper b, #rich-content-wrapper strong {
                          font-weight: 700 !important;
                        }
                        #rich-content-wrapper i, #rich-content-wrapper em {
                          font-style: italic !important;
                        }
                        #rich-content-wrapper u {
                          text-decoration: underline !important;
                        }
                        #rich-content-wrapper p {
                          margin: 6px 0 !important;
                        }
                        #rich-content-wrapper font[size="1"] { font-size: 10px !important; line-height: 1.3 !important; }
                        #rich-content-wrapper font[size="2"] { font-size: 12px !important; line-height: 1.4 !important; }
                        #rich-content-wrapper font[size="3"] { font-size: 14px !important; line-height: 1.4 !important; }
                        #rich-content-wrapper font[size="4"] { font-size: 16px !important; line-height: 1.5 !important; }
                        #rich-content-wrapper font[size="5"] { font-size: 18px !important; line-height: 1.5 !important; }
                        #rich-content-wrapper font[size="6"] { font-size: 24px !important; line-height: 1.4 !important; }
                        #rich-content-wrapper font[size="7"] { font-size: 32px !important; line-height: 1.3 !important; }
                      `,
                      }}
                    />
                    <div
                      ref={contentEditableRef}
                      id="rich-content-wrapper"
                      cy-id="rt-editor-body"
                      contentEditable={true}
                      suppressContentEditableWarning={true}
                      onInput={handleContentEditableInput}
                      onPaste={handlePaste}
                      onKeyDown={handleEditorKeyDown}
                      onMouseUp={saveSelection}
                      onKeyUp={saveSelection}
                      dir="ltr"
                      style={{ textAlign: "left", direction: "ltr" }}
                      className="outline-hidden min-h-[220px] leading-relaxed text-xs sm:text-sm text-foreground max-w-none focus:ring-0 select-text text-left"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* 2. SATIŞ BİLGİLERİ */}
            <section id="section-1" className="space-y-6 pt-6 border-t border-border scroll-mt-6">
              <div className="border-b pb-3">
                <h4 className="text-base font-bold text-foreground">2. Satış Bilgileri</h4>
                <p className="text-xs text-muted-foreground">Fiyatlandırma, stok miktarı ve vergi oranları</p>
              </div>

              {/* Fiyatlandırma ve Komisyon Uyarısı */}
              <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                Platform Kuralları gereği, 1.000.000 TL ve üzerindeki fiyatlarla ürün girişi yapılamamaktadır. Tedarik edememe sebebiyle yapılan iptaller idari yaptırımlara tabidir.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Trendyol Satış Fiyatı (₺) *</Label>
                  <Input
                    type="number"
                    value={salePrice}
                    onChange={(e) => setSalePrice(e.target.value)}
                    placeholder="0.00"
                    className="font-bold text-emerald-600 text-base"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Piyasa Liste Fiyatı (₺)</Label>
                  <Input
                    type="number"
                    value={listPrice}
                    onChange={(e) => setListPrice(e.target.value)}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Stok Miktarı *</Label>
                  <Input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="100"
                    className="font-bold text-base"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Stok Kodu (SKU) *</Label>
                  <Input
                    value={stockCode}
                    onChange={(e) => setStockCode(e.target.value)}
                    placeholder="SKU Kodu"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Komisyon</Label>
                  <Input
                    disabled
                    value={`${((Number(salePrice) || 0) * 0.2058).toFixed(2)} ₺ (%21)`}
                    className="bg-muted font-mono text-xs text-muted-foreground"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">KDV Oranı (%) *</Label>
                  <select
                    value={vatRate}
                    onChange={(e) => setVatRate(e.target.value)}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm font-medium cursor-pointer"
                  >
                    <option value="0">%0</option>
                    <option value="1">%1</option>
                    <option value="10">%10</option>
                    <option value="20">%20</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">ÖTV</Label>
                  <Input
                    value={specialConsumptionTax}
                    onChange={(e) => setSpecialConsumptionTax(e.target.value)}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Parti/Lot/SKT Bilgisi</Label>
                  <Input
                    value={lotNumber}
                    onChange={(e) => setLotNumber(e.target.value)}
                    placeholder="Örn: Lot No: 0301A79"
                  />
                </div>
              </div>

              {/* Hediye Paketi & Kişiselleştirme */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-xl border bg-card/60 space-y-2">
                  <Label className="text-xs font-bold text-foreground">Hediye Paketi</Label>
                  <div className="space-y-2 text-xs">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="giftWrap"
                        checked={giftWrap === "none"}
                        onChange={() => setGiftWrap("none")}
                        className="accent-orange-500"
                      />
                      <span>Hediye paketi istemiyorum</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="giftWrap"
                        checked={giftWrap === "allowed"}
                        onChange={() => setGiftWrap("allowed")}
                        className="accent-orange-500"
                      />
                      <span>Hediye paketi yapılabilir.</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="giftWrap"
                        checked={giftWrap === "allowed_with_note"}
                        onChange={() => setGiftWrap("allowed_with_note")}
                        className="accent-orange-500"
                      />
                      <span>Hediye paketi yapılabilir ve not yazılabilir.</span>
                    </label>
                  </div>
                </div>

                <div className="p-4 rounded-xl border bg-card/60 space-y-2">
                  <Label className="text-xs font-bold text-foreground">Kişiselleştirilmiş Ürün</Label>
                  <div className="space-y-2 text-xs">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="custom"
                        checked={customizable === "no"}
                        onChange={() => setCustomizable("no")}
                        className="accent-orange-500"
                      />
                      <span>Üründe kişiselleştirilme yapılamaz.</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="custom"
                        checked={customizable === "yes"}
                        onChange={() => setCustomizable("yes")}
                        className="accent-orange-500"
                      />
                      <span>Üründe kişiselleştirilme yapılabilir.</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Ürün Fiyat Geçmişi */}
              <div className="p-4 rounded-xl border bg-card/40 space-y-3">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-bold text-foreground">Ürün Fiyat Geçmişi</h5>
                </div>
                <div className="border rounded-lg overflow-hidden text-xs">
                  <table className="w-full">
                    <thead className="bg-muted text-muted-foreground text-[11px]">
                      <tr>
                        <th className="p-2.5 text-left font-medium">İşlem Tarihi</th>
                        <th className="p-2.5 text-left font-medium">Trendyol Satış Fiyatı</th>
                        <th className="p-2.5 text-left font-medium">İşlem Detayı</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      <tr>
                        <td className="p-2.5 text-muted-foreground font-mono">
                          {listing.updated_at ? new Date(listing.updated_at).toLocaleString("tr-TR") : "11/09/2026 12:34"}
                        </td>
                        <td className="p-2.5 font-bold text-emerald-600">₺ {salePrice},00</td>
                        <td className="p-2.5 text-muted-foreground">Ürünün fiyatı güncellenmiştir.</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            {/* 3. ÜRÜN ÖZELLİKLERİ */}
            <section id="section-2" className="space-y-6 pt-6 border-t border-border scroll-mt-6">
              <div className="border-b pb-3 flex items-center justify-between">
                <div>
                  <h4 className="text-base font-bold text-foreground flex items-center gap-2">
                    3. Ürün Özellikleri
                    {attributesLoading && (
                      <span className="text-xs font-normal text-orange-600 dark:text-orange-400 flex items-center gap-1 animate-pulse">
                        <Loader2 className="w-3 h-3 animate-spin" /> Trendyol'dan güncelleniyor...
                      </span>
                    )}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Trendyol filtrelerinde çıkan zorunlu alanlar ({categoryName} kategorisine ait resmi nitelikler)
                  </p>
                </div>
              </div>

              {/* Zorunlu Alanlar */}
              <div className="space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
                  Zorunlu Alanlar
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Materyal *</Label>
                    <select
                      value={material}
                      onChange={(e) => setMaterial(e.target.value)}
                      className="w-full h-10 px-3 rounded-md border border-input bg-background text-xs font-medium cursor-pointer"
                    >
                      {!dynamicAttributes.materials.includes(material) && material && (
                        <option value={material}>{material}</option>
                      )}
                      {dynamicAttributes.materials.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Yükseklik *</Label>
                    <select
                      value={height}
                      onChange={(e) => setHeight(e.target.value)}
                      className="w-full h-10 px-3 rounded-md border border-input bg-background text-xs font-medium cursor-pointer"
                    >
                      {!dynamicAttributes.heights.includes(height) && height && (
                        <option value={height}>{height}</option>
                      )}
                      {dynamicAttributes.heights.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Parça Sayısı *</Label>
                    <select
                      value={pieceCount}
                      onChange={(e) => setPieceCount(e.target.value)}
                      className="w-full h-10 px-3 rounded-md border border-input bg-background text-xs font-medium cursor-pointer"
                    >
                      {!dynamicAttributes.pieceCounts.includes(pieceCount) && pieceCount && (
                        <option value={pieceCount}>{pieceCount}</option>
                      )}
                      {dynamicAttributes.pieceCounts.map((pc) => (
                        <option key={pc} value={pc}>
                          {pc}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Web Color *</Label>
                    <select
                      value={webColor}
                      onChange={(e) => setWebColor(e.target.value)}
                      className="w-full h-10 px-3 rounded-md border border-input bg-background text-xs font-medium cursor-pointer"
                    >
                      {!dynamicAttributes.webColors.includes(webColor) && webColor && (
                        <option value={webColor}>{webColor}</option>
                      )}
                      {dynamicAttributes.webColors.map((wc) => (
                        <option key={wc} value={wc}>
                          {wc}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Renk *</Label>
                    <Input
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      placeholder="Renk"
                      className="text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Menşei *</Label>
                    <select
                      value={origin}
                      onChange={(e) => setOrigin(e.target.value)}
                      className="w-full h-10 px-3 rounded-md border border-input bg-background text-xs font-medium cursor-pointer"
                    >
                      {!dynamicAttributes.origins.includes(origin) && origin && (
                        <option value={origin}>{origin}</option>
                      )}
                      {dynamicAttributes.origins.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Ürün Denetim Bilgileri (Mevzuat Uyarısı + Üretici ve İthalatçı - VARSAYILAN BOŞ) */}
              <div className="space-y-4 pt-4 border-t border-border">
                <div>
                  <h5 className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                    Ürün Denetim Bilgileri
                  </h5>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    01.04.2025 tarihinde yürürlüğe giren "Uzaktan İletişim Araçları Yoluyla Piyasaya Arz Edilen Ürünlerin Piyasa Gözetimi ve Denetimi Yönetmeliği" kapsamındadır.
                  </p>
                </div>

                {/* Üretici Bilgileri (Varsayılan Boş) */}
                <div className="p-4 rounded-xl border bg-card/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">Üretici Bilgileri</span>
                    <span className="text-[11px] text-muted-foreground italic">Varsayılan Boş</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">Üretici Adı</Label>
                      <Input
                        value={producerName}
                        onChange={(e) => setProducerName(e.target.value)}
                        placeholder="Üretici Adı"
                        className="text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">Üretici Mail Adresi</Label>
                      <Input
                        value={producerMail}
                        onChange={(e) => setProducerMail(e.target.value)}
                        placeholder="Üretici Mail Adresi"
                        className="text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">Üretici Adres Bilgisi</Label>
                      <Input
                        value={producerAddress}
                        onChange={(e) => setProducerAddress(e.target.value)}
                        placeholder="Üretici Adres Bilgisi"
                        className="text-xs"
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Türkiye'de yerleşik bulunan üretici bilgisi için sırasıyla üretici ticari unvanı, adresi ve e-posta/KEP adresini ekleyiniz.
                  </p>
                </div>

                {/* İthalatçı Bilgileri (Varsayılan Boş) */}
                <div className="p-4 rounded-xl border bg-card/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">İthalatçı Bilgileri</span>
                    <span className="text-[11px] text-muted-foreground italic">Varsayılan Boş</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">Birincil İthalatçı Adı</Label>
                      <Input
                        value={importerName}
                        onChange={(e) => setImporterName(e.target.value)}
                        placeholder="Birincil İthalatçı Adı"
                        className="text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">Birincil İthalatçı Mail Adresi</Label>
                      <Input
                        value={importerMail}
                        onChange={(e) => setImporterMail(e.target.value)}
                        placeholder="Birincil İthalatçı Mail Adresi"
                        className="text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">Birincil İthalatçı Adres Bilgisi</Label>
                      <Input
                        value={importerAddress}
                        onChange={(e) => setImporterAddress(e.target.value)}
                        placeholder="Birincil İthalatçı Adres Bilgisi"
                        className="text-xs"
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Türkiye'de yerleşik bulunan ithalatçı, yetkili temsilci veya ifa hizmet sağlayıcısı için ticari unvanı, adresi ve e-posta/KEP adresini ekleyiniz.
                  </p>
                </div>

                {/* Opsiyonel Alanlar (Persona) */}
                <div className="p-4 rounded-xl border bg-card/50 space-y-3">
                  <span className="text-xs font-bold text-foreground">Opsiyonel Alanlar</span>
                  <div className="max-w-sm space-y-1">
                    <Label className="text-xs font-medium">Persona</Label>
                    <select
                      value={persona}
                      onChange={(e) => setPersona(e.target.value)}
                      className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs font-medium cursor-pointer"
                    >
                      <option value="">Seçilmedi</option>
                      {dynamicAttributes.personas.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </section>

            {/* 4. KARGO & TESLİMAT BİLGİLERİ */}
            <section id="section-3" className="space-y-6 pt-6 border-t border-border scroll-mt-6">
              <div className="border-b pb-3">
                <h4 className="text-base font-bold text-foreground">4. Kargo & Teslimat Bilgileri</h4>
                <p className="text-xs text-muted-foreground">Desi, kargo firması ve Trendyol entegrasyon adres ID'leri</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Desi Bilgisi *</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={desi}
                    onChange={(e) => setDesi(e.target.value)}
                    placeholder="2.0"
                    className="font-bold text-base"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Termin Süresi (Gün) *</Label>
                  <Input
                    type="number"
                    value={deliveryDuration}
                    onChange={(e) => setDeliveryDuration(e.target.value)}
                    placeholder="0"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Ürün Sevk Adresi *</Label>
                  <Input
                    value={shipmentAddress}
                    onChange={(e) => setShipmentAddress(e.target.value)}
                    className="bg-muted font-mono text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Ürün İade Adresi *</Label>
                  <Input
                    value={returningAddress}
                    onChange={(e) => setReturningAddress(e.target.value)}
                    className="bg-muted font-mono text-xs"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1.5">
                  <Label className="text-xs font-semibold">Anlaşmalı Kargo Şirketi</Label>
                  <select
                    value={cargoCompany}
                    onChange={(e) => setCargoCompany(e.target.value)}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm font-medium cursor-pointer"
                  >
                    <option value="">Seçiniz... (Varsayılan Boş)</option>
                    {TRENDYOL_CARGO_COMPANIES.map((comp) => (
                      <option key={comp} value={comp}>
                        {comp}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            {/* 5. GÜNCELLEME GEÇMİŞİ */}
            <section id="section-4" className="space-y-6 pt-6 border-t border-border scroll-mt-6">
              <div className="border-b pb-3">
                <h4 className="text-base font-bold text-foreground">5. Ürün Güncelleme Geçmişi</h4>
                <p className="text-xs text-muted-foreground">Son yapılan işlemler ve Trendyol onay durumu</p>
              </div>

              {/* Sekmeler / Radio Filtresi */}
              <div className="flex items-center gap-2 p-1 bg-muted/50 rounded-lg w-fit text-xs">
                <button
                  type="button"
                  onClick={() => setHistoryTab("approved")}
                  className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                    historyTab === "approved"
                      ? "bg-card text-foreground shadow-xs font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Onaylanan
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryTab("pending")}
                  className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                    historyTab === "pending"
                      ? "bg-card text-foreground shadow-xs font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Onay Bekleyen
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryTab("rejected")}
                  className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                    historyTab === "rejected"
                      ? "bg-card text-foreground shadow-xs font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Reddedilen
                </button>
              </div>

              {/* Tablo Görünümü */}
              <div className="border rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-muted text-muted-foreground">
                    <tr>
                      <th className="p-3 text-left w-1/4">Tarih</th>
                      <th className="p-3 text-left w-1/2">İşlem</th>
                      <th className="p-3 text-left w-1/4">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {historyTab === "approved" && (
                      <tr>
                        <td className="p-3 font-medium font-mono text-muted-foreground">
                          {listing.updated_at ? new Date(listing.updated_at).toLocaleString("tr-TR") : "11/09/2026 12:34"}
                        </td>
                        <td className="p-3 font-medium text-foreground">
                          Ürün satışta ve bilgileri onaylandı. Fiyat: <strong className="text-emerald-600">₺{salePrice}</strong>, Stok: <strong>{quantity}</strong>
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400 font-semibold text-[11px]">
                            Onaylı
                          </span>
                        </td>
                      </tr>
                    )}
                    {historyTab !== "approved" && (
                      <tr>
                        <td colSpan={3} className="py-8 text-center text-muted-foreground">
                          <div className="flex flex-col items-center justify-center gap-1">
                            <AlertCircle className="w-6 h-6 text-muted-foreground/50" />
                            <p className="font-medium text-xs">Kayıt Bulunamadı.</p>
                            <p className="text-[11px]">Bu filtreye ait herhangi bir işlem geçmişi bulunmamaktadır.</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </div>

        {/* Sticky Footer (Trendyol Birebir Buton Düzeni) */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-3.5 border-t border-border bg-card shrink-0 shadow-lg">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loading}
              onClick={() => handleArchive(false)}
              className="text-xs bg-[#2b354f] hover:bg-[#1f2638] text-white border-none font-bold px-4 py-2 rounded-lg cursor-pointer"
            >
              Ürünü Arşive Al
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loading}
              onClick={() => handleArchive(true)}
              className="text-xs bg-[#2b354f] hover:bg-[#1f2638] text-white border-none font-bold px-4 py-2 rounded-lg cursor-pointer"
            >
              Arşivle ve Sil
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loading}
              onClick={handleOpenCopyModal}
              className="text-xs border-orange-500 text-orange-600 dark:text-orange-400 bg-white dark:bg-card hover:bg-orange-50 font-bold px-4 py-2 rounded-lg cursor-pointer flex items-center gap-1.5"
            >
              <Copy className="w-3.5 h-3.5" />
              Ürünü Kopyala
            </Button>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={loading}
              className="text-xs cursor-pointer"
            >
              Vazgeç
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => handleSubmit()}
              disabled={loading}
              className="bg-[#f27a1a] hover:bg-[#d9650d] text-white font-bold shadow-md px-6 py-2 rounded-lg cursor-pointer text-xs"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  İşleniyor...
                </>
              ) : (
                "Onaya Gönder"
              )}
            </Button>
          </div>
        </div>
        </>
        )}

      {/* ─── ONAY POP-UP MODALI ─── */}
      <ConfirmDialog />
      </div>
    </div>
  );
}
