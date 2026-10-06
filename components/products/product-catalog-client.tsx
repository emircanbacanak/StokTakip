"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
  Plus, 
  Trash2, 
  ImageIcon, 
  Loader2, 
  Package, 
  Pencil, 
  X, 
  Check, 
  Scale, 
  Ruler, 
  ChevronDown,
  Sparkles,
  Tag,
  Calculator,
  Info,
  Layers,
  Image as ImageIcon2,
  Store,
  ShoppingBag
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useConfirm } from "@/hooks/use-confirm";
import type { Product, CostSettings, ProductSize } from "@/lib/types/database";
import { calculateProductCost, DEFAULT_COST_SETTINGS } from "@/lib/cost-calculator";
import { formatCurrency } from "@/lib/utils";
import { ProductGallery } from "./product-gallery";
import { generateSmartModelCode } from "@/lib/product-code-generator";

const inputCls =
  "w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all";

const PRODUCT_CATEGORIES = [
  { id: "other", label: "Diğer", icon: "📦", desc: "Varsayılan Kategori" },
  { id: "sugar-bowl", label: "Şekerlik", icon: "🍬" },
  { id: "snack-bowl", label: "Çerezlik", icon: "🥜" },
  { id: "fruit-bowl", label: "Meyvelik", icon: "🍎" },
  { id: "container", label: "Kap", icon: "🥣" },
  { id: "strainer", label: "Süzgeç", icon: "🥄" },
  { id: "spice-holder", label: "Baharatlık", icon: "🌶️" },
  { id: "towel-holder", label: "Havluluk", icon: "🧺" },
  { id: "brush-holder", label: "Fırçalık", icon: "🪥" },
  { id: "pot", label: "Saksı", icon: "🪴" },
  { id: "toy", label: "Oyuncak", icon: "🧸" },
  { id: "decor", label: "Dekor", icon: "🎨" },
  { id: "holder", label: "Tutacak", icon: "📎" },
  { id: "gpu-support", label: "GPU Desteği", icon: "🖥️" },
  { id: "bookmark", label: "Kitap Ayracı", icon: "🔖" },
  { id: "pencil-holder", label: "Kalemlik", icon: "✏️" },
  { id: "plate-holder", label: "Plakalık", icon: "🏷️" },
  { id: "organizer", label: "Düzenleyici", icon: "🗃️" },
] as const;

async function removeBackgroundWithAPI(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('image', file);

  const response = await fetch('/api/remove-bg', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Background removal failed');
  }

  const data = await response.json();
  return data.imageUrl;
}

async function uploadProductImage(
  supabase: ReturnType<typeof createClient>,
  dataUrl: string,
  productId: string
): Promise<string | null> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  
  const isPng = blob.type === "image/png" || dataUrl.startsWith("data:image/png");
  const ext = isPng ? "png" : "jpg";
  const path = `products/${productId}.${ext}`;

  console.log('Upload ediliyor:', { path, size: blob.size, type: blob.type, isPng });

  const { error } = await supabase.storage
    .from("product-images")
    .upload(path, blob, { 
      upsert: true, 
      contentType: isPng ? "image/png" : blob.type,
      cacheControl: '0'
    });

  if (error) {
    console.error("Resim yükleme hatası:", error);
    return null;
  }

  const { data } = supabase.storage.from("product-images").getPublicUrl(path);
  const urlWithCacheBust = `${data.publicUrl}?t=${Date.now()}`;
  return urlWithCacheBust;
}

interface ProductFormProps {
  initial?: Product;
  onSave: () => void;
  onCancel: () => void;
}

function ProductForm({ initial, onSave, onCancel }: ProductFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [weightGrams, setWeightGrams] = useState<string>(
    initial?.weight_grams ? String(initial.weight_grams) : ""
  );
  const [hasSizes, setHasSizes] = useState(initial?.has_sizes ?? false);
  const [isCandleholder, setIsCandleholder] = useState(initial?.is_candleholder ?? false);
  const [isKeychain, setIsKeychain] = useState(initial?.is_keychain ?? false);
  const [isSoapdish, setIsSoapdish] = useState(initial?.is_soapdish ?? false);
  const [isSolidSoapDish, setIsSolidSoapDish] = useState(initial?.is_solid_soap_dish ?? false);
  const [isSugarBowl, setIsSugarBowl] = useState(initial?.is_sugar_bowl ?? false);
  const [isSnackBowl, setIsSnackBowl] = useState(initial?.is_snack_bowl ?? false);
  const [isFruitBowl, setIsFruitBowl] = useState(initial?.is_fruit_bowl ?? false);
  const [isContainer, setIsContainer] = useState(initial?.is_container ?? false);
  const [isStrainer, setIsStrainer] = useState(initial?.is_strainer ?? false);
  const [isSpiceHolder, setIsSpiceHolder] = useState(initial?.is_spice_holder ?? false);
  const [isTowelHolder, setIsTowelHolder] = useState(initial?.is_towel_holder ?? false);
  const [isBrushHolder, setIsBrushHolder] = useState(initial?.is_brush_holder ?? false);
  const [isPot, setIsPot] = useState(initial?.is_pot ?? false);
  const [isToy, setIsToy] = useState(initial?.is_toy ?? false);
  const [isDecor, setIsDecor] = useState(initial?.is_decor ?? false);
  const [isHolder, setIsHolder] = useState(initial?.is_holder ?? false);
  const [isGpuSupport, setIsGpuSupport] = useState(initial?.is_gpu_support ?? false);
  const [isBookmark, setIsBookmark] = useState(initial?.is_bookmark ?? false);
  const [isPencilHolder, setIsPencilHolder] = useState(initial?.is_pencil_holder ?? false);
  const [isPlateHolder, setIsPlateHolder] = useState(initial?.is_plate_holder ?? false);
  const [isOrganizer, setIsOrganizer] = useState(initial?.is_organizer ?? false);
  const [sizes, setSizes] = useState<Array<{ id?: string; size_name: string; weight_grams: string }>>([]);
  const [imagePreview, setImagePreview] = useState<string | null>(initial?.image_url ?? null);
  const [originalImage, setOriginalImage] = useState<string | null>(initial?.image_url ?? null);
  const [removedBgImage, setRemovedBgImage] = useState<string | null>(null);
  const [useOriginal, setUseOriginal] = useState(true);
  const [removingBg, setRemovingBg] = useState(false);
  const [saving, setSaving] = useState(false);
  const [costSettings, setCostSettings] = useState<CostSettings | null>(null);
  const [manualCandleholderOverride, setManualCandleholderOverride] = useState(false);
  const [manualKeychainOverride, setManualKeychainOverride] = useState(false);
  const [manualSoapdishOverride, setManualSoapdishOverride] = useState(false);
  const [manualSolidSoapDishOverride, setManualSolidSoapDishOverride] = useState(false);
  const [manualSizeOverride, setManualSizeOverride] = useState(false);
  const [manualPotOverride, setManualPotOverride] = useState(false);
  const [manualToyOverride, setManualToyOverride] = useState(false);
  const [manualDecorOverride, setManualDecorOverride] = useState(false);
  const [manualHolderOverride, setManualHolderOverride] = useState(false);
  const [manualGpuSupportOverride, setManualGpuSupportOverride] = useState(false);
  const [manualBookmarkOverride, setManualBookmarkOverride] = useState(false);
  const [manualPencilHolderOverride, setManualPencilHolderOverride] = useState(false);
  const [manualPlateHolderOverride, setManualPlateHolderOverride] = useState(false);
  const [manualOrganizerOverride, setManualOrganizerOverride] = useState(false);

  // Açılır menü (Accordion) durumları
  const [sizesOpen, setSizesOpen] = useState(initial?.has_sizes ?? false);
  const [accessoriesOpen, setAccessoriesOpen] = useState(
    Boolean(initial?.is_candleholder || initial?.is_keychain || initial?.is_soapdish || initial?.is_solid_soap_dish)
  );
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [costPreviewOpen, setCostPreviewOpen] = useState(true);

  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Aktif kategoriyi bul
  const getActiveCategoryId = useCallback(() => {
    if (isSugarBowl) return "sugar-bowl";
    if (isSnackBowl) return "snack-bowl";
    if (isFruitBowl) return "fruit-bowl";
    if (isContainer) return "container";
    if (isStrainer) return "strainer";
    if (isSpiceHolder) return "spice-holder";
    if (isTowelHolder) return "towel-holder";
    if (isBrushHolder) return "brush-holder";
    if (isPot) return "pot";
    if (isToy) return "toy";
    if (isDecor) return "decor";
    if (isHolder) return "holder";
    if (isGpuSupport) return "gpu-support";
    if (isBookmark) return "bookmark";
    if (isPencilHolder) return "pencil-holder";
    if (isPlateHolder) return "plate-holder";
    if (isOrganizer) return "organizer";
    return "other";
  }, [
    isSugarBowl, isSnackBowl, isFruitBowl, isContainer, isStrainer, isSpiceHolder,
    isTowelHolder, isBrushHolder, isPot, isToy, isDecor, isHolder, isGpuSupport,
    isBookmark, isPencilHolder, isPlateHolder, isOrganizer
  ]);

  const activeCategoryId = getActiveCategoryId();
  const currentCategoryInfo = PRODUCT_CATEGORIES.find(c => c.id === activeCategoryId) || PRODUCT_CATEGORIES[0];

  // Kategori seçimi fonksiyonu
  const handleCategorySelect = (catId: string) => {
    setIsSugarBowl(catId === "sugar-bowl");
    setIsSnackBowl(catId === "snack-bowl");
    setIsFruitBowl(catId === "fruit-bowl");
    setIsContainer(catId === "container");
    setIsStrainer(catId === "strainer");
    setIsSpiceHolder(catId === "spice-holder");
    setIsTowelHolder(catId === "towel-holder");
    setIsBrushHolder(catId === "brush-holder");
    setIsPot(catId === "pot");
    setIsToy(catId === "toy");
    setIsDecor(catId === "decor");
    setIsHolder(catId === "holder");
    setIsGpuSupport(catId === "gpu-support");
    setIsBookmark(catId === "bookmark");
    setIsPencilHolder(catId === "pencil-holder");
    setIsPlateHolder(catId === "plate-holder");
    setIsOrganizer(catId === "organizer");

    setManualPotOverride(true);
    setManualToyOverride(true);
    setManualDecorOverride(true);
    setManualHolderOverride(true);
    setManualGpuSupportOverride(true);
    setManualBookmarkOverride(true);
    setManualPencilHolderOverride(true);
    setManualPlateHolderOverride(true);
    setManualOrganizerOverride(true);
  };

  // Ürün adı değiştiğinde otomatik algılama
  useEffect(() => {
    if (!name.trim()) return;

    const nameLower = name.toLowerCase();
    
    // Mumluk otomatik algılama - sadece yeni ürün eklerken
    if (!initial && !manualCandleholderOverride) {
      const isCandleholderName = nameLower.includes('mumluk') || nameLower.includes('candleholder');
      if (isCandleholderName !== isCandleholder) {
        setIsCandleholder(isCandleholderName);
        if (isCandleholderName) setAccessoriesOpen(true);
      }
    }

    // Anahtarlık otomatik algılama - sadece yeni ürün eklerken
    if (!initial && !manualKeychainOverride) {
      const isKeychainName = nameLower.includes('anahtarlık') || nameLower.includes('keychain') || nameLower.includes('key chain');
      if (isKeychainName !== isKeychain) {
        setIsKeychain(isKeychainName);
        if (isKeychainName) setAccessoriesOpen(true);
      }
    }

    // Sabunluk otomatik algılama - sadece yeni ürün eklerken
    if (!initial && !manualSoapdishOverride && !manualSolidSoapDishOverride) {
      const hasSoapdishInName = nameLower.includes('sabunluk') || nameLower.includes('soap dish') || nameLower.includes('soapdish');
      
      if (hasSoapdishInName) {
        if (!isSoapdish && !isSolidSoapDish) {
          setIsSoapdish(true);
          setAccessoriesOpen(true);
        }
      } else {
        if (isSoapdish) setIsSoapdish(false);
        if (isSolidSoapDish) setIsSolidSoapDish(false);
      }
    }

    // Yeni kategoriler için otomatik algılama - sadece yeni ürün eklerken
    if (!initial) {
      const hasSugarBowl = nameLower.includes('şekerlik') || nameLower.includes('sugar bowl');
      if (hasSugarBowl !== isSugarBowl) setIsSugarBowl(hasSugarBowl);
      
      const hasSnackBowl = nameLower.includes('çerezlik') || nameLower.includes('snack bowl');
      if (hasSnackBowl !== isSnackBowl) setIsSnackBowl(hasSnackBowl);
      
      const hasFruitBowl = nameLower.includes('meyvelik') || nameLower.includes('fruit bowl');
      if (hasFruitBowl !== isFruitBowl) setIsFruitBowl(hasFruitBowl);
      
      const hasContainer = nameLower.includes('kap') || nameLower.includes('container');
      if (hasContainer !== isContainer) setIsContainer(hasContainer);
      
      const hasStrainer = nameLower.includes('süzgeç') || nameLower.includes('süzgec') || nameLower.includes('strainer');
      if (hasStrainer !== isStrainer) setIsStrainer(hasStrainer);
      
      const hasSpiceHolder = nameLower.includes('baharatlık') || nameLower.includes('spice holder');
      if (hasSpiceHolder !== isSpiceHolder) setIsSpiceHolder(hasSpiceHolder);
      
      const hasTowelHolder = nameLower.includes('havluluk') || nameLower.includes('towel holder');
      if (hasTowelHolder !== isTowelHolder) setIsTowelHolder(hasTowelHolder);
      
      const hasBrushHolder = nameLower.includes('fırçalık') || nameLower.includes('brush holder');
      if (hasBrushHolder !== isBrushHolder) setIsBrushHolder(hasBrushHolder);

      if (!manualPotOverride) {
        const hasPot = nameLower.includes('saksı') || nameLower.includes('pot') || nameLower.includes('planter');
        if (hasPot !== isPot) setIsPot(hasPot);
      }

      if (!manualGpuSupportOverride) {
        const hasGpuSupport = nameLower.includes('gpu desteği') || nameLower.includes('gpu destek') || nameLower.includes('gpu support');
        if (hasGpuSupport !== isGpuSupport) setIsGpuSupport(hasGpuSupport);
      }

      if (!manualBookmarkOverride) {
        const hasBookmark = nameLower.includes('kitap ayracı') || nameLower.includes('kitap ayraci') || nameLower.includes('bookmark');
        if (hasBookmark !== isBookmark) setIsBookmark(hasBookmark);
      }

      if (!manualPencilHolderOverride) {
        const hasPencilHolder = nameLower.includes('kalemlik') || nameLower.includes('pencil holder');
        if (hasPencilHolder !== isPencilHolder) setIsPencilHolder(hasPencilHolder);
      }

      if (!manualPlateHolderOverride) {
        const hasPlateHolder = (nameLower.includes('plakalık') || nameLower.includes('plaka') || nameLower.includes('plakalik')) && !nameLower.includes('anahtarlık');
        if (hasPlateHolder !== isPlateHolder) setIsPlateHolder(hasPlateHolder);
      }

      if (!manualOrganizerOverride) {
        const hasOrganizer = nameLower.includes('düzenleyici') || nameLower.includes('organizer') || nameLower.includes('duzenleyici');
        if (hasOrganizer !== isOrganizer) setIsOrganizer(hasOrganizer);
      }

      if (!manualHolderOverride) {
        const hasHolder = (nameLower.includes('tutacak') || nameLower.includes('holder') || nameLower.includes('stand')) && !nameLower.includes('gpu');
        if (hasHolder !== isHolder) setIsHolder(hasHolder);
      }

      if (!manualToyOverride) {
        const hasToy = (
          nameLower.includes('oyuncak') || 
          nameLower.includes('toy') || 
          nameLower.includes('axolotl') || 
          nameLower.includes('dragon') || 
          nameLower.includes('ejderha') || 
          nameLower.includes('ahtapot') || 
          nameLower.includes('pokemon') || 
          nameLower.includes('pikachu') || 
          nameLower.includes('bulbasaur') || 
          nameLower.includes('squirtle') || 
          nameLower.includes('timsah') || 
          nameLower.includes('tavşan') || 
          nameLower.includes('tilki') || 
          nameLower.includes('örümcek') || 
          nameLower.includes('uzaylı') || 
          nameLower.includes('katana') || 
          nameLower.includes('karambit') || 
          nameLower.includes('articulated') || 
          nameLower.includes('flexi')
        ) && !nameLower.includes('dekor') && !nameLower.includes('biblo') && !nameLower.includes('mumluk') && !nameLower.includes('anahtarlık');
        if (hasToy !== isToy) setIsToy(hasToy);
      }

      if (!manualDecorOverride) {
        const hasDecor = (
          nameLower.includes('dekor') || 
          nameLower.includes('biblo') || 
          nameLower.includes('heykel') || 
          nameLower.includes('duvar') || 
          nameLower.includes('figür') || 
          nameLower.includes('panter') || 
          nameLower.includes('büst') || 
          nameLower.includes('süs') || 
          nameLower.includes('gül') || 
          nameLower.includes('zambak') || 
          nameLower.includes('güvercin') || 
          nameLower.includes('kuş') || 
          nameLower.includes('kurt') || 
          nameLower.includes('papatya') || 
          nameLower.includes('salyangoz') || 
          nameLower.includes('samuray') || 
          nameLower.includes('yel değirmeni') ||
          nameLower.includes('tavan') ||
          (nameLower.includes('ayıcık') && nameLower.includes('dekor')) ||
          (nameLower.includes('tilki') && nameLower.includes('dekor')) ||
          (nameLower.includes('köpek') && nameLower.includes('dekor'))
        ) && 
        !nameLower.includes('oyuncak') && 
        !nameLower.includes('saksı') && 
        !nameLower.includes('kitap ayracı') && 
        !nameLower.includes('kalemlik') && 
        !nameLower.includes('plaka') && 
        !nameLower.includes('düzenleyici') && 
        !nameLower.includes('tutacak') && 
        !nameLower.includes('mumluk') && 
        !nameLower.includes('anahtarlık');
        if (hasDecor !== isDecor) setIsDecor(hasDecor);
      }
    }

    // Vazo otomatik algılama
    if (!initial && !manualSizeOverride) {
      const isVase = nameLower.includes('vazo') || nameLower.includes('vase');
      if (isVase && !hasSizes) {
        setHasSizes(true);
        setSizesOpen(true);
        setSizes([
          { size_name: '13cm', weight_grams: '' },
          { size_name: '15cm', weight_grams: '' },
          { size_name: '17cm', weight_grams: '' }
        ]);
      }
    }
  }, [
    name, isCandleholder, isKeychain, isSoapdish, isSolidSoapDish, isSugarBowl, isSnackBowl, isFruitBowl, isContainer, isStrainer, isSpiceHolder, isTowelHolder, isBrushHolder,
    isPot, isToy, isDecor, isHolder, isGpuSupport, isBookmark, isPencilHolder, isPlateHolder, isOrganizer,
    hasSizes, manualCandleholderOverride, manualKeychainOverride, manualSoapdishOverride, manualSolidSoapDishOverride, manualSizeOverride,
    manualPotOverride, manualToyOverride, manualDecorOverride, manualHolderOverride, manualGpuSupportOverride, manualBookmarkOverride, manualPencilHolderOverride, manualPlateHolderOverride, manualOrganizerOverride,
    initial
  ]);

  // Mevcut boyutları yükle
  useEffect(() => {
    if (initial?.id && initial.has_sizes) {
      const sb = createClient();
      sb.from("product_sizes")
        .select("*")
        .eq("product_id", initial.id)
        .order("sort_order")
        .then(({ data }) => {
          if (data) {
            setSizes(data.map(s => ({ id: s.id, size_name: s.size_name, weight_grams: String(s.weight_grams) })));
          }
        });
    }
  }, [initial]);

  // Maliyet ayarlarını yükle
  useEffect(() => {
    async function loadSettings() {
      try {
        const sb = createClient();
        const { data } = await sb.from("cost_settings").select("*").limit(1).single();
        if (data) setCostSettings(data);
      } catch {
        setCostSettings({ id: "", ...DEFAULT_COST_SETTINGS, updated_at: "", updated_by: null });
      }
    }
    loadSettings();
  }, []);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const original = URL.createObjectURL(file);
    setOriginalImage(original);
    setImagePreview(original);
    setUseOriginal(true);
    setRemovedBgImage(null);
  }

  async function handleRemoveBackground() {
    if (!originalImage) return;
    setRemovingBg(true);
    await new Promise(resolve => setTimeout(resolve, 50));
    
    try {
      const res = await fetch(originalImage);
      const blob = await res.blob();
      const file = new File([blob], "image.jpg", { type: blob.type });
      
      const result = await removeBackgroundWithAPI(file);
      setRemovedBgImage(result);
      setImagePreview(result);
      setUseOriginal(false);
      toast({ title: "Arkaplan kaldırıldı ✓" });
    } catch (error) {
      console.error("Arkaplan kaldırma hatası:", error);
      toast({ 
        title: "Arkaplan kaldırılamadı", 
        description: error instanceof Error ? error.message : "Bilinmeyen hata",
        variant: "destructive" 
      });
    } finally {
      setRemovingBg(false);
    }
  }

  function switchToOriginal() {
    if (originalImage) {
      setImagePreview(originalImage);
      setUseOriginal(true);
    }
  }

  function switchToRemoved() {
    if (removedBgImage) {
      setImagePreview(removedBgImage);
      setUseOriginal(false);
    }
  }

  // Hızlı boyut ekleme fonksiyonu
  const addQuickSize = (sizeName: string) => {
    setSizes(prev => {
      if (prev.some(s => s.size_name.toLowerCase() === sizeName.toLowerCase())) {
        return prev;
      }
      return [...prev, { size_name: sizeName, weight_grams: "" }];
    });
  };

  async function save() {
    if (!name.trim()) {
      toast({ title: "Ürün adı gerekli", variant: "destructive" });
      return;
    }

    if (hasSizes) {
      if (sizes.length === 0) {
        toast({ title: "En az bir boyut eklemelisiniz", variant: "destructive" });
        return;
      }
      if (sizes.some(s => !s.size_name.trim() || !s.weight_grams.trim())) {
        toast({ title: "Tüm boyut bilgilerini doldurun", variant: "destructive" });
        return;
      }
    }

    setSaving(true);
    let sb: ReturnType<typeof createClient>;
    try { sb = createClient(); } catch { setSaving(false); return; }

    const id = initial?.id ?? crypto.randomUUID();
    let imageUrl = initial?.image_url ?? null;

    const imageToSave = useOriginal ? originalImage : removedBgImage;
    
    if (imageToSave && imageToSave !== initial?.image_url) {
      if (initial?.image_url && imageToSave.startsWith('data:image/png')) {
        try {
          const oldPath = initial.image_url.split('/').pop()?.split('?')[0];
          if (oldPath) {
            await sb.storage.from("product-images").remove([`products/${oldPath}`]);
          }
        } catch (e) {
          console.log('Eski resim silinemedi (sorun değil):', e);
        }
      }
      
      const uploaded = await uploadProductImage(sb, imageToSave, id);
      if (uploaded) {
        imageUrl = uploaded.split('?')[0];
      } else {
        imageUrl = imageToSave;
      }
    } else if (!imageToSave && !originalImage && !removedBgImage && imagePreview === null) {
      imageUrl = null;
    } else if (imageToSave === initial?.image_url) {
      imageUrl = initial?.image_url ?? null;
    }

    const parsedWeight = weightGrams.trim() === "" ? 0 : parseFloat(weightGrams);
    const finalWeight = isNaN(parsedWeight) || parsedWeight < 0 ? 0 : parsedWeight;

    const productData = {
      name: name.trim(),
      description: description.trim() || "",
      image_url: imageUrl,
      weight_grams: hasSizes ? 0 : finalWeight,
      has_sizes: hasSizes,
      is_candleholder: isCandleholder,
      is_keychain: isKeychain,
      is_soapdish: isSoapdish,
      is_solid_soap_dish: isSolidSoapDish,
      is_sugar_bowl: isSugarBowl,
      is_snack_bowl: isSnackBowl,
      is_fruit_bowl: isFruitBowl,
      is_container: isContainer,
      is_strainer: isStrainer,
      is_spice_holder: isSpiceHolder,
      is_towel_holder: isTowelHolder,
      is_brush_holder: isBrushHolder,
      is_pot: isPot,
      is_toy: isToy,
      is_decor: isDecor,
      is_holder: isHolder,
      is_gpu_support: isGpuSupport,
      is_bookmark: isBookmark,
      is_pencil_holder: isPencilHolder,
      is_plate_holder: isPlateHolder,
      is_organizer: isOrganizer,
    };

    let dbError: any = null;

    if (initial) {
      const { error } = await sb.from("products").update(productData).eq("id", initial.id);
      dbError = error;
    } else {
      const { error } = await sb.from("products").insert({ id, ...productData });
      dbError = error;
    }

    if (dbError) {
      console.error("Ürün kaydetme hatası:", dbError);
      const errorMsg = dbError.message || dbError.hint || JSON.stringify(dbError);
      toast({ 
        title: "Kaydetme hatası", 
        description: errorMsg.includes('is_solid_soap_dish') 
          ? "Veritabanı migration'ı eksik. Lütfen add_solid_soap_dish.sql dosyasını Supabase'de çalıştırın."
          : errorMsg,
        variant: "destructive" 
      });
      setSaving(false);
      return;
    }

    if (hasSizes) {
      if (initial?.id) {
        await sb.from("product_sizes").delete().eq("product_id", id);
      }
      
      const sizesToInsert = sizes.map((s, idx) => ({
        product_id: id,
        size_name: s.size_name.trim(),
        weight_grams: parseFloat(s.weight_grams),
        sort_order: idx,
      }));

      const { error: sizeError } = await sb.from("product_sizes").insert(sizesToInsert);
      if (sizeError) {
        console.error("Boyut kaydetme hatası:", sizeError);
        toast({ title: "Boyut kaydetme hatası", description: sizeError.message, variant: "destructive" });
        setSaving(false);
        return;
      }
    } else {
      if (initial?.id) {
        await sb.from("product_sizes").delete().eq("product_id", id);
      }
    }

    toast({ title: initial ? "Ürün güncellendi ✓" : "Ürün eklendi ✓" });
    setSaving(false);
    onSave();
  }

  // Aktif aksesuar sayısı ve özet bilgisi
  const activeAccessories = [
    isCandleholder && "🕯️ Mumluk",
    isKeychain && "🔑 Zincir",
    isSoapdish && "🧼 Sıvı Sabunluk",
    isSolidSoapDish && "🧴 Katı Sabunluk",
  ].filter(Boolean) as string[];

  return (
    <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm">
      {/* Form Başlığı */}
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-md shadow-blue-500/20">
            <Package className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="font-bold text-base text-foreground block">
              {initial ? "Ürünü Düzenle" : "Yeni Ürün Ekle"}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {initial ? `${initial.name} detaylarını güncelleyin` : "Kataloğa yeni bir ürün tanımı ekleyin"}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all"
          title="Kapat"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 1. Bölüm: Resim Yükleme ve Temel Bilgiler */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
        {/* Görsel Yükleme Alanı */}
        <div className="md:col-span-4 space-y-2">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
            Ürün Görseli
          </label>
          <div
            onClick={() => !removingBg && fileRef.current?.click()}
            className={`relative w-full h-44 rounded-xl border-2 border-dashed border-border hover:border-blue-500/50 transition-all ${
              removingBg ? 'cursor-wait' : 'cursor-pointer'
            } flex items-center justify-center overflow-hidden bg-muted/20 group`}
          >
            {imagePreview && !removingBg && (
              <>
                <img src={imagePreview} alt="preview" className="relative max-h-40 max-w-full object-contain p-2" />
                <button
                  type="button"
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    setImagePreview(null); 
                    setOriginalImage(null); 
                    setRemovedBgImage(null);
                    setUseOriginal(true);
                    if (fileRef.current) fileRef.current.value = '';
                  }}
                  className="absolute top-2 right-2 w-6 h-6 bg-red-500/90 rounded-full flex items-center justify-center text-white hover:bg-red-600 transition-colors shadow-sm"
                  title="Görseli Kaldır"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </>
            )}
            {removingBg && (
              <div className="absolute inset-0 bg-background/90 backdrop-blur-sm flex flex-col items-center justify-center gap-2 z-10">
                <Loader2 className="w-7 h-7 animate-spin text-violet-500" />
                <span className="text-xs font-semibold text-foreground">Arkaplan kaldırılıyor...</span>
              </div>
            )}
            {!imagePreview && !removingBg && (
              <div className="flex flex-col items-center gap-1.5 text-muted-foreground text-center p-3">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center group-hover:scale-110 transition-transform">
                  <ImageIcon className="w-5 h-5 opacity-60 text-blue-500" />
                </div>
                <span className="text-xs font-semibold text-foreground">Fotoğraf Seç veya Sürükle</span>
                <span className="text-[10px] text-muted-foreground">PNG, JPG formatı</span>
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
          
          {originalImage && (
            <div className="flex gap-1.5 pt-1">
              <button
                type="button"
                onClick={switchToOriginal}
                disabled={removingBg}
                className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-semibold transition-all ${
                  useOriginal
                    ? "bg-blue-500 text-white shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/70"
                }`}
              >
                Orijinal
              </button>
              {removedBgImage ? (
                <button
                  type="button"
                  onClick={switchToRemoved}
                  disabled={removingBg}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-semibold transition-all ${
                    !useOriginal
                      ? "bg-violet-500 text-white shadow-sm"
                      : "bg-muted text-muted-foreground hover:bg-muted/70"
                  }`}
                >
                  Arkaplansız
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleRemoveBackground}
                  disabled={removingBg}
                  className="flex-1 py-1.5 px-2 rounded-lg text-[11px] font-semibold bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:shadow-sm transition-all disabled:opacity-50"
                >
                  {removingBg ? "Kaldırılıyor..." : "Arkaplan Kaldır"}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Temel Metin Bilgileri */}
        <div className="md:col-span-8 space-y-3">
          <div>
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block">
              Ürün Adı <span className="text-red-500">*</span>
            </label>
            <input 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="Örn: Origami Burgulu Vazo" 
              className={inputCls} 
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block">
              Açıklama <span className="text-muted-foreground/60 font-normal">(Opsiyonel)</span>
            </label>
            <textarea 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              placeholder="Ürün hakkında kısa açıklama..." 
              rows={2} 
              className={inputCls + " resize-none text-xs"} 
            />
          </div>

          {/* Tek Boyut için Gramaj Girişi */}
          {!hasSizes && (
            <div className="bg-muted/20 border border-border rounded-xl p-3">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5 text-blue-500" />
                  Ürün Gramajı (gr) <span className="text-red-500">*</span>
                </label>
                <span className="text-[11px] text-muted-foreground">Maliyet hesabı için kullanılır</span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={weightGrams}
                  onChange={(e) => setWeightGrams(e.target.value)}
                  onWheel={(e) => (e.target as HTMLInputElement).blur()}
                  placeholder="Örn: 45"
                  className={inputCls + " pr-12 font-medium"}
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground pointer-events-none">
                  gram
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. Modül: Açılır Menü - BOYUT SEÇENEKLERİ */}
      <div className="border border-border rounded-xl bg-card overflow-hidden transition-all">
        <button
          type="button"
          onClick={() => setSizesOpen(!sizesOpen)}
          className="w-full flex items-center justify-between p-3.5 bg-muted/20 hover:bg-muted/40 transition-colors text-left"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Ruler className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-sm font-bold text-foreground block">
                Boyut ve Varyant Seçenekleri
              </span>
              <span className="text-[11px] text-muted-foreground">
                {hasSizes 
                  ? `${sizes.length} farklı boyut tanımlı (${sizes.map(s => s.size_name || '?').join(', ') || 'boyut eklenmedi'})`
                  : `Tek boyutlu ürün (${weightGrams ? `${weightGrams} gr` : 'gramaj girilmedi'})`
                }
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              hasSizes 
                ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20" 
                : "bg-muted text-muted-foreground"
            }`}>
              {hasSizes ? `${sizes.length} Boyut` : "Tek Boyut"}
            </span>
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${sizesOpen ? "rotate-180" : ""}`} />
          </div>
        </button>

        {sizesOpen && (
          <div className="p-4 border-t border-border space-y-4 bg-muted/5">
            {/* Farklı boyutlar var mı toggle switch */}
            <div className="flex items-center justify-between bg-card p-3 rounded-xl border border-border">
              <div className="flex items-center gap-2.5">
                <span className="text-base">📏</span>
                <div>
                  <label htmlFor="toggle-sizes" className="text-xs font-bold text-foreground block cursor-pointer">
                    Bu ürünün farklı boyutları var
                  </label>
                  <p className="text-[11px] text-muted-foreground">
                    Örn: 13cm, 15cm, 17cm gibi farklı boyutlar ve her boyut için ayrı gramaj
                  </p>
                </div>
              </div>
              <input
                id="toggle-sizes"
                type="checkbox"
                checked={hasSizes}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setHasSizes(checked);
                  setManualSizeOverride(true);
                  if (checked && sizes.length === 0) {
                    setSizes([
                      { size_name: '13cm', weight_grams: '' },
                      { size_name: '15cm', weight_grams: '' },
                      { size_name: '17cm', weight_grams: '' }
                    ]);
                  }
                }}
                className="w-5 h-5 rounded border-border text-blue-500 focus:ring-2 focus:ring-blue-500/50 cursor-pointer"
              />
            </div>

            {hasSizes && (
              <div className="space-y-3 bg-card p-3.5 rounded-xl border border-border">
                {/* Hızlı Boyut Ekleme Butonları */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase mr-1">Hızlı Ekle:</span>
                  {["10cm", "13cm", "15cm", "17cm", "20cm", "25cm"].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => addQuickSize(preset)}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-muted hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400 border border-border transition-all"
                    >
                      + {preset}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setSizes([...sizes, { size_name: "", weight_grams: "" }])}
                    className="ml-auto text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Yeni Boyut Satırı
                  </button>
                </div>

                {/* Boyut Listesi */}
                <div className="space-y-2 pt-1">
                  {sizes.map((size, idx) => (
                    <div key={idx} className="grid grid-cols-[1fr,130px,36px] gap-2 items-center bg-muted/20 p-2 rounded-xl border border-border/60">
                      <div>
                        {idx === 0 && <label className="text-[9px] font-bold text-muted-foreground uppercase block mb-1">Boyut Adı</label>}
                        <input
                          type="text"
                          value={size.size_name}
                          onChange={(e) => {
                            const next = [...sizes];
                            next[idx].size_name = e.target.value;
                            setSizes(next);
                          }}
                          placeholder="Örn: 15cm"
                          className={inputCls + " text-xs py-2"}
                        />
                      </div>
                      <div>
                        {idx === 0 && <label className="text-[9px] font-bold text-muted-foreground uppercase block mb-1">Gramaj (gr)</label>}
                        <div className="relative">
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            value={size.weight_grams}
                            onChange={(e) => {
                              const next = [...sizes];
                              next[idx].weight_grams = e.target.value;
                              setSizes(next);
                            }}
                            onWheel={(e) => (e.target as HTMLInputElement).blur()}
                            placeholder="40"
                            className={inputCls + " text-xs py-2 pr-7 font-medium"}
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground pointer-events-none">
                            gr
                          </span>
                        </div>
                      </div>
                      <div className={idx === 0 ? "pt-4" : ""}>
                        <button
                          type="button"
                          onClick={() => setSizes(sizes.filter((_, i) => i !== idx))}
                          className="w-9 h-9 flex items-center justify-center text-red-500 hover:text-red-600 hover:bg-red-500/10 rounded-lg transition-all"
                          title="Bu boyutu sil"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. Modül: Açılır Menü - EK MALZEME & MALİYET SEÇENEKLERİ (Mum, Zincir, Sabunluk) */}
      <div className="border border-border rounded-xl bg-card overflow-hidden transition-all">
        <button
          type="button"
          onClick={() => setAccessoriesOpen(!accessoriesOpen)}
          className="w-full flex items-center justify-between p-3.5 bg-muted/20 hover:bg-muted/40 transition-colors text-left"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-sm font-bold text-foreground block">
                Ek Malzeme & Maliyet Seçenekleri
              </span>
              <span className="text-[11px] text-muted-foreground">
                {activeAccessories.length > 0 
                  ? activeAccessories.join(" • ")
                  : "Mum, Zincir, Sabunluk pompası vb. ek maliyetli parçalar"
                }
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {activeAccessories.length > 0 ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                {activeAccessories.length} Seçili
              </span>
            ) : (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                Standart
              </span>
            )}
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${accessoriesOpen ? "rotate-180" : ""}`} />
          </div>
        </button>

        {accessoriesOpen && (
          <div className="p-4 border-t border-border space-y-3 bg-muted/5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* 🕯️ Mumluk */}
              <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                isCandleholder 
                  ? "bg-amber-500/10 border-amber-500/40 shadow-sm" 
                  : "bg-card border-border hover:border-border/80"
              }`}>
                <input
                  type="checkbox"
                  checked={isCandleholder}
                  onChange={(e) => {
                    setIsCandleholder(e.target.checked);
                    setManualCandleholderOverride(true);
                  }}
                  className="w-4 h-4 mt-0.5 rounded border-border text-amber-500 focus:ring-2 focus:ring-amber-500/50"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-base">🕯️</span>
                    <span className="text-xs font-bold text-foreground">Mum kullanılıyor mu?</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">
                    Bu ürün mumluk ise işaretleyin. Maliyet hesaplamasına mumluk ücreti eklenecektir.
                  </p>
                </div>
              </label>

              {/* 🔑 Anahtarlık */}
              <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                isKeychain 
                  ? "bg-blue-500/10 border-blue-500/40 shadow-sm" 
                  : "bg-card border-border hover:border-border/80"
              }`}>
                <input
                  type="checkbox"
                  checked={isKeychain}
                  onChange={(e) => {
                    setIsKeychain(e.target.checked);
                    setManualKeychainOverride(true);
                  }}
                  className="w-4 h-4 mt-0.5 rounded border-border text-blue-500 focus:ring-2 focus:ring-blue-500/50"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-base">🔑</span>
                    <span className="text-xs font-bold text-foreground">Zincir kullanılıyor mu?</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">
                    Bu ürün anahtarlık ise işaretleyin. Maliyet hesaplamasına zincir ücreti eklenecektir.
                  </p>
                </div>
              </label>

              {/* 🧼 Sıvı Sabunluk (Pompalı) */}
              <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                isSoapdish 
                  ? "bg-emerald-500/10 border-emerald-500/40 shadow-sm" 
                  : "bg-card border-border hover:border-border/80"
              }`}>
                <input
                  type="checkbox"
                  checked={isSoapdish}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setIsSoapdish(checked);
                    if (checked) setIsSolidSoapDish(false);
                    setManualSoapdishOverride(true);
                    setManualSolidSoapDishOverride(true);
                  }}
                  className="w-4 h-4 mt-0.5 rounded border-border text-emerald-500 focus:ring-2 focus:ring-emerald-500/50"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-base">🧼</span>
                    <span className="text-xs font-bold text-foreground">Sıvı Sabunluk mu? (Pompalı)</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">
                    Sıvı sabun için pompalı sabunluk ise işaretleyin. Maliyet hesaplamasına pompa ücreti eklenecektir.
                  </p>
                </div>
              </label>

              {/* 🧴 Katı Sabunluk */}
              <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                isSolidSoapDish 
                  ? "bg-teal-500/10 border-teal-500/40 shadow-sm" 
                  : "bg-card border-border hover:border-border/80"
              }`}>
                <input
                  type="checkbox"
                  checked={isSolidSoapDish}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setIsSolidSoapDish(checked);
                    if (checked) setIsSoapdish(false);
                    setManualSolidSoapDishOverride(true);
                    setManualSoapdishOverride(true);
                  }}
                  className="w-4 h-4 mt-0.5 rounded border-border text-teal-500 focus:ring-2 focus:ring-teal-500/50"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-base">🧴</span>
                    <span className="text-xs font-bold text-foreground">Katı Sabunluk mu?</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">
                    Katı sabun için sabunluk ise işaretleyin. Pompa gerektirmez, ekstra maliyet eklenmez.
                  </p>
                </div>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* 4. Modül: Açılır Menü - ÜRÜN KATEGORİSİ SEÇİMİ */}
      <div className="border border-border rounded-xl bg-card overflow-hidden transition-all">
        <button
          type="button"
          onClick={() => setCategoryOpen(!categoryOpen)}
          className="w-full flex items-center justify-between p-3.5 bg-muted/20 hover:bg-muted/40 transition-colors text-left"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center">
              <Tag className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-sm font-bold text-foreground block">
                Ürün Kategorisi
              </span>
              <span className="text-[11px] text-muted-foreground">
                Seçili Kategori: <strong className="text-foreground font-semibold">{currentCategoryInfo.icon} {currentCategoryInfo.label}</strong>
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20">
              {currentCategoryInfo.icon} {currentCategoryInfo.label}
            </span>
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${categoryOpen ? "rotate-180" : ""}`} />
          </div>
        </button>

        {categoryOpen && (
          <div className="p-4 border-t border-border space-y-3.5 bg-muted/5">
            {/* Açılır Dropdown Menü Seçimi */}
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Hızlı Kategori Seçimi (Açılır Menü)
              </label>
              <select
                value={activeCategoryId}
                onChange={(e) => handleCategorySelect(e.target.value)}
                className={inputCls + " font-medium cursor-pointer text-xs py-2.5"}
              >
                {PRODUCT_CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.icon} {cat.label} {cat.id === "other" ? "(Varsayılan)" : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Görsel Kategori Butonları (Grid) */}
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 block">
                Veya Tıklayarak Kategori Belirleyin:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {PRODUCT_CATEGORIES.map((cat) => {
                  const isSelected = activeCategoryId === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => handleCategorySelect(cat.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all text-left ${
                        isSelected
                          ? "bg-gradient-to-r from-blue-500 to-violet-600 text-white border-transparent shadow-md shadow-blue-500/20 scale-[1.02]"
                          : "bg-card border-border text-foreground hover:bg-muted/70"
                      }`}
                    >
                      <span className="text-base">{cat.icon}</span>
                      <span className="truncate">{cat.label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 ml-auto shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <p className="text-[10px] text-muted-foreground pt-2 border-t border-border/50 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <span>İşaretlenmeyen tüm ürünler varsayılan olarak <strong>Diğer 📦</strong> kategorisinde listelenir.</span>
            </p>
          </div>
        )}
      </div>

      {/* 5. Modül: Açılır Menü - MALİYET & FİYATLANDIRMA ÖNİZLEMESİ */}
      {costSettings && (
        <div className="border border-border rounded-xl bg-card overflow-hidden transition-all">
          <button
            type="button"
            onClick={() => setCostPreviewOpen(!costPreviewOpen)}
            className="w-full flex items-center justify-between p-3.5 bg-gradient-to-r from-blue-50/50 to-violet-50/50 dark:from-blue-950/10 dark:to-violet-950/10 hover:opacity-90 transition-opacity text-left"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Calculator className="w-3.5 h-3.5" />
              </div>
              <div>
                <span className="text-sm font-bold text-foreground block">
                  Maliyet ve Önerilen Fiyat Hesaplaması
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Gramaj ve ek malzemelere göre otomatik maliyet dökümü
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                Canlı Önizleme
              </span>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${costPreviewOpen ? "rotate-180" : ""}`} />
            </div>
          </button>

          {costPreviewOpen && (
            <div className="p-4 border-t border-border bg-gradient-to-br from-blue-50/20 to-violet-50/20 dark:from-blue-950/5 dark:to-violet-950/5">
              {!hasSizes && parseFloat(weightGrams) > 0 && (() => {
                const w = parseFloat(weightGrams);
                const calc = calculateProductCost(w, costSettings, isCandleholder, isKeychain, isSoapdish);
                return (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div className="bg-card p-2.5 rounded-xl border border-border">
                        <span className="text-[10px] text-muted-foreground block">Ham Gramaj</span>
                        <span className="text-sm font-bold text-foreground">{w.toFixed(1)} gr</span>
                      </div>
                      {costSettings.waste_enabled && (
                        <div className="bg-card p-2.5 rounded-xl border border-border">
                          <span className="text-[10px] text-muted-foreground block">Fireli Gramaj (%{costSettings.waste_percentage})</span>
                          <span className="text-sm font-bold text-orange-600 dark:text-orange-400">{calc.weightWithWasteGrams.toFixed(1)} gr</span>
                        </div>
                      )}
                      <div className="bg-card p-2.5 rounded-xl border border-border">
                        <span className="text-[10px] text-muted-foreground block">Ek Malzemeler</span>
                        <span className="text-sm font-bold text-foreground">
                          {activeAccessories.length > 0 ? activeAccessories.join(', ') : 'Yok'}
                        </span>
                      </div>
                      <div className="bg-blue-500/10 p-2.5 rounded-xl border border-blue-500/20">
                        <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold block">Toplam Maliyet</span>
                        <span className="text-base font-extrabold text-blue-600 dark:text-blue-400">{formatCurrency(calc.totalCost)}</span>
                      </div>
                    </div>

                    {/* Maliyet Kalemleri Dökümü */}
                    <div className="bg-card p-3 rounded-xl border border-border space-y-1.5 text-xs">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Maliyet Kalemleri</span>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {calc.breakdown.filter(b => b.enabled).map((b, i) => (
                          <div key={i} className="flex justify-between p-1.5 bg-muted/20 rounded-lg text-muted-foreground text-[11px]">
                            <span>{b.label.split('(')[0].trim()}:</span>
                            <span className="font-semibold text-foreground">{formatCurrency(b.value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Önerilen Satış Fiyatları */}
                    <div className="bg-card p-3 rounded-xl border border-border">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-2">Önerilen Satış Fiyatları (Kâr Marjına Göre)</span>
                      <div className="grid grid-cols-5 gap-1.5 text-center">
                        {[
                          { label: `%${costSettings.profit_margin_1}`, price: calc.suggestedPrices.margin10 },
                          { label: `%${costSettings.profit_margin_2}`, price: calc.suggestedPrices.margin20 },
                          { label: `%${costSettings.profit_margin_3}`, price: calc.suggestedPrices.margin30 },
                          { label: `%${costSettings.profit_margin_4}`, price: calc.suggestedPrices.margin40 },
                          { label: `%${costSettings.profit_margin_5}`, price: calc.suggestedPrices.margin50 },
                        ].map((item, i) => (
                          <div key={i} className="p-2 rounded-lg bg-muted/20 border border-border/60">
                            <p className="text-[10px] font-semibold text-muted-foreground">{item.label}</p>
                            <p className="text-xs font-bold text-foreground mt-0.5">{formatCurrency(item.price)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {hasSizes && sizes.length > 0 && (
                <div className="space-y-3">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                    Tanımlı Boyutlara Göre Hesaplama
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {sizes.map((size, idx) => {
                      const w = parseFloat(size.weight_grams);
                      if (isNaN(w) || w <= 0) return (
                        <div key={idx} className="bg-card p-3 rounded-xl border border-dashed border-border text-center text-xs text-muted-foreground">
                          {size.size_name || `Boyut ${idx + 1}`} için gramaj bekleniyor...
                        </div>
                      );
                      const calc = calculateProductCost(w, costSettings, isCandleholder, isKeychain, isSoapdish);
                      return (
                        <div key={idx} className="bg-card rounded-xl p-3 border border-border space-y-2">
                          <div className="flex items-center justify-between border-b border-border pb-1.5">
                            <span className="text-xs font-bold text-foreground flex items-center gap-1">
                              <Ruler className="w-3 h-3 text-blue-500" />
                              {size.size_name || `Boyut ${idx + 1}`}
                            </span>
                            <span className="text-[11px] font-semibold text-muted-foreground">{w.toFixed(1)} gr</span>
                          </div>
                          
                          <div className="flex justify-between items-center py-1">
                            <span className="text-[11px] text-muted-foreground">Toplam Maliyet:</span>
                            <span className="text-sm font-extrabold text-blue-600 dark:text-blue-400">{formatCurrency(calc.totalCost)}</span>
                          </div>

                          <div className="grid grid-cols-3 gap-1 pt-1.5 border-t border-border text-center">
                            {[
                              { label: `%${costSettings.profit_margin_2}`, price: calc.suggestedPrices.margin20 },
                              { label: `%${costSettings.profit_margin_3}`, price: calc.suggestedPrices.margin30 },
                              { label: `%${costSettings.profit_margin_4}`, price: calc.suggestedPrices.margin40 },
                            ].map((item, i) => (
                              <div key={i} className="p-1 rounded bg-muted/30">
                                <p className="text-[9px] text-muted-foreground">{item.label}</p>
                                <p className="text-[11px] font-bold text-foreground">{formatCurrency(item.price)}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {((!hasSizes && (!weightGrams || parseFloat(weightGrams) <= 0)) || (hasSizes && sizes.length === 0)) && (
                <div className="text-center py-4 text-xs text-muted-foreground flex items-center justify-center gap-1.5">
                  <Info className="w-4 h-4 text-blue-500" />
                  Maliyet hesaplamasını görebilmek için lütfen gramaj veya boyut bilgilerini doldurun.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Kaydet & İptal Butonları */}
      <div className="flex gap-2.5 pt-2 border-t border-border">
        <button 
          type="button"
          onClick={onCancel} 
          className="flex-1 border border-border text-foreground font-semibold py-2.5 rounded-xl text-sm hover:bg-muted transition-all"
        >
          İptal
        </button>
        <button 
          type="button"
          onClick={save} 
          disabled={saving} 
          className="flex-1 bg-gradient-to-r from-blue-500 to-violet-600 text-white font-bold py-2.5 rounded-xl text-sm shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Kaydediliyor...
            </>
          ) : (
            <>
              <Check className="w-4 h-4" />
              {initial ? "Değişiklikleri Kaydet" : "Ürünü Kataloğa Ekle"}
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export function ProductCatalogClient() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [galleryProductId, setGalleryProductId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "no-image">("all");
  const [categoryFilter, setCategoryFilter] = useState<"all" | "candleholder" | "keychain" | "other" | "soapdish" | "solid-soap-dish" | "sugar-bowl" | "snack-bowl" | "fruit-bowl" | "container" | "strainer" | "spice-holder" | "towel-holder" | "brush-holder" | "pot" | "toy" | "decor" | "holder" | "gpu-support" | "bookmark" | "pencil-holder" | "plate-holder" | "organizer">("all");
  const { toast } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();
  const topRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    let sb: ReturnType<typeof createClient>;
    try { sb = createClient(); } catch { setLoading(false); return; }
    const { data, error } = await sb.from("products").select("*").order("name");
    if (error) {
      console.error("Ürünler yüklenirken hata:", error);
    }
    setProducts(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Scroll pozisyonunu kaydet
  const savedScrollY = useRef(0);

  function startEdit(p: Product) {
    savedScrollY.current = window.scrollY;
    if (editing) {
      setEditing(null);
      setTimeout(() => {
        setEditing(p);
        setTimeout(() => window.scrollTo({ top: 0, behavior: "instant" }), 0);
      }, 50);
    } else {
      setShowForm(false);
      setEditing(p);
      setTimeout(() => window.scrollTo({ top: 0, behavior: "instant" }), 0);
    }
  }

  function startAdd() {
    savedScrollY.current = window.scrollY;
    setEditing(null);
    setShowForm(true);
    setTimeout(() => window.scrollTo({ top: 0, behavior: "instant" }), 0);
  }

  function closeForm() {
    setShowForm(false);
    setEditing(null);
    setTimeout(() => window.scrollTo({ top: savedScrollY.current, behavior: "instant" }), 0);
  }

  async function handleSendToTrendyol(p: Product) {
    try {
      toast({
        title: "Trendyol'a Aktarılıyor",
        description: `"${p.name}" bilgileri hazırlanıyor...`,
      });

      let sb: ReturnType<typeof createClient>;
      let sizesList: any[] = [];
      let galleryImages: string[] = [];

      try {
        sb = createClient();
        if (p.has_sizes) {
          const { data: sData } = await sb.from("product_sizes").select("*").eq("product_id", p.id);
          if (sData) sizesList = sData;
        }
        const { data: imgData } = await sb.from("product_images").select("image_url").eq("product_id", p.id).order("display_order", { ascending: true });
        if (imgData) {
          galleryImages = imgData.map((img: any) => img.image_url).filter(Boolean);
        }
      } catch (err) {
        console.error("Ek ürün verileri çekilemedi:", err);
      }

      const allImgs: string[] = [];
      if (p.image_url) allImgs.push(p.image_url);
      galleryImages.forEach((url) => {
        if (!allImgs.includes(url)) allImgs.push(url);
      });

      const descHtml = p.description
        ? `<p><strong>${p.name}</strong></p><p>${p.description.replace(/\n/g, "<br/>")}</p>`
        : `<p><strong>${p.name}</strong></p><p>3D Yazıcı ile yüksek hassasiyet ve dayanıklı malzeme kullanılarak üretilmiştir.</p>`;

      const payload = {
        title: p.name,
        description: descHtml,
        images: allImgs,
        weightGrams: p.weight_grams || 0,
        sizes: sizesList.map((s) => ({ name: s.size_name, weight: s.weight_grams })),
        height: sizesList.length > 0 ? sizesList[0].size_name : "",
        price: "199",
        stock: "10",
        modelCode: generateSmartModelCode(p.name),
        material: "Plastik",
        source: "catalog",
      };

      sessionStorage.setItem("trendyol_prefill_data", JSON.stringify(payload));
      setTimeout(() => {
        router.push("/dashboard/product-upload?tab=single&mp=trendyol");
      }, 250);
    } catch (err) {
      toast({
        title: "Hata",
        description: "Trendyol'a aktarılırken bir hata oluştu.",
        variant: "destructive",
      });
    }
  }

  async function del(id: string) {
    const confirmed = await confirm({
      title: "Ürünü Sil",
      message: "Bu ürünü silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.",
      confirmText: "Sil",
      cancelText: "İptal",
      variant: "danger",
    });
    
    if (!confirmed) return;
    
    const sb = createClient();
    await sb.from("products").delete().eq("id", id);
    toast({ title: "Ürün silindi" });
    load();
  }

  // Filtreleme
  let filteredProducts = filter === "no-image" 
    ? products.filter(p => !p.image_url)
    : products;
  
  // Kategori filtreleme
  if (categoryFilter === "candleholder") {
    filteredProducts = filteredProducts.filter(p => p.is_candleholder);
  } else if (categoryFilter === "keychain") {
    filteredProducts = filteredProducts.filter(p => p.is_keychain);
  } else if (categoryFilter === "soapdish") {
    filteredProducts = filteredProducts.filter(p => p.is_soapdish);
  } else if (categoryFilter === "solid-soap-dish") {
    filteredProducts = filteredProducts.filter(p => p.is_solid_soap_dish);
  } else if (categoryFilter === "sugar-bowl") {
    filteredProducts = filteredProducts.filter(p => p.is_sugar_bowl);
  } else if (categoryFilter === "snack-bowl") {
    filteredProducts = filteredProducts.filter(p => p.is_snack_bowl);
  } else if (categoryFilter === "fruit-bowl") {
    filteredProducts = filteredProducts.filter(p => p.is_fruit_bowl);
  } else if (categoryFilter === "container") {
    filteredProducts = filteredProducts.filter(p => p.is_container);
  } else if (categoryFilter === "strainer") {
    filteredProducts = filteredProducts.filter(p => p.is_strainer);
  } else if (categoryFilter === "spice-holder") {
    filteredProducts = filteredProducts.filter(p => p.is_spice_holder);
  } else if (categoryFilter === "towel-holder") {
    filteredProducts = filteredProducts.filter(p => p.is_towel_holder);
  } else if (categoryFilter === "brush-holder") {
    filteredProducts = filteredProducts.filter(p => p.is_brush_holder);
  } else if (categoryFilter === "pot") {
    filteredProducts = filteredProducts.filter(p => p.is_pot);
  } else if (categoryFilter === "toy") {
    filteredProducts = filteredProducts.filter(p => p.is_toy);
  } else if (categoryFilter === "decor") {
    filteredProducts = filteredProducts.filter(p => p.is_decor);
  } else if (categoryFilter === "holder") {
    filteredProducts = filteredProducts.filter(p => p.is_holder);
  } else if (categoryFilter === "gpu-support") {
    filteredProducts = filteredProducts.filter(p => p.is_gpu_support);
  } else if (categoryFilter === "bookmark") {
    filteredProducts = filteredProducts.filter(p => p.is_bookmark);
  } else if (categoryFilter === "pencil-holder") {
    filteredProducts = filteredProducts.filter(p => p.is_pencil_holder);
  } else if (categoryFilter === "plate-holder") {
    filteredProducts = filteredProducts.filter(p => p.is_plate_holder);
  } else if (categoryFilter === "organizer") {
    filteredProducts = filteredProducts.filter(p => p.is_organizer);
  } else if (categoryFilter === "other") {
    filteredProducts = filteredProducts.filter(p => 
      !p.is_candleholder && !p.is_keychain && !p.is_soapdish && !p.is_solid_soap_dish &&
      !p.is_sugar_bowl && !p.is_snack_bowl && !p.is_fruit_bowl && !p.is_container && !p.is_strainer &&
      !p.is_spice_holder && !p.is_towel_holder && !p.is_brush_holder &&
      !p.is_pot && !p.is_toy && !p.is_decor && !p.is_holder && !p.is_gpu_support &&
      !p.is_bookmark && !p.is_pencil_holder && !p.is_plate_holder && !p.is_organizer
    );
  }
  
  const noImageCount = products.filter(p => !p.image_url).length;
  const candleholderCount = products.filter(p => p.is_candleholder).length;
  const keychainCount = products.filter(p => p.is_keychain).length;
  const soapdishCount = products.filter(p => p.is_soapdish).length;
  const solidSoapDishCount = products.filter(p => p.is_solid_soap_dish).length;
  const sugarBowlCount = products.filter(p => p.is_sugar_bowl).length;
  const snackBowlCount = products.filter(p => p.is_snack_bowl).length;
  const fruitBowlCount = products.filter(p => p.is_fruit_bowl).length;
  const containerCount = products.filter(p => p.is_container).length;
  const strainerCount = products.filter(p => p.is_strainer).length;
  const spiceHolderCount = products.filter(p => p.is_spice_holder).length;
  const towelHolderCount = products.filter(p => p.is_towel_holder).length;
  const brushHolderCount = products.filter(p => p.is_brush_holder).length;
  
  const potCount = products.filter(p => p.is_pot).length;
  const toyCount = products.filter(p => p.is_toy).length;
  const decorCount = products.filter(p => p.is_decor).length;
  const holderCount = products.filter(p => p.is_holder).length;
  const gpuSupportCount = products.filter(p => p.is_gpu_support).length;
  const bookmarkCount = products.filter(p => p.is_bookmark).length;
  const pencilHolderCount = products.filter(p => p.is_pencil_holder).length;
  const plateHolderCount = products.filter(p => p.is_plate_holder).length;
  const organizerCount = products.filter(p => p.is_organizer).length;

  const otherCount = products.filter(p => 
    !p.is_candleholder && !p.is_keychain && !p.is_soapdish && !p.is_solid_soap_dish &&
    !p.is_sugar_bowl && !p.is_snack_bowl && !p.is_fruit_bowl && !p.is_container && !p.is_strainer &&
    !p.is_spice_holder && !p.is_towel_holder && !p.is_brush_holder &&
    !p.is_pot && !p.is_toy && !p.is_decor && !p.is_holder && !p.is_gpu_support &&
    !p.is_bookmark && !p.is_pencil_holder && !p.is_plate_holder && !p.is_organizer
  ).length;

  return (
    <div className="space-y-4">
      <div ref={topRef} className="space-y-2">
        {/* Üst Satır: Ürün Sayısı, Resim Filtresi, Ürün Ekle Butonu */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <p className="text-sm text-muted-foreground">{filteredProducts.length} ürün</p>
            
            {/* Resim Filtresi */}
            {noImageCount > 0 && (
              <div className="flex gap-1">
                <button
                  onClick={() => setFilter("all")}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap ${
                    filter === "all"
                      ? "bg-blue-500 text-white shadow-sm"
                      : "bg-muted text-muted-foreground hover:bg-muted/70"
                  }`}
                >
                  Tümü
                </button>
                <button
                  onClick={() => setFilter("no-image")}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap ${
                    filter === "no-image"
                      ? "bg-amber-500 text-white shadow-sm"
                      : "bg-muted text-muted-foreground hover:bg-muted/70"
                  }`}
                >
                  Resim Bekleyen ({noImageCount})
                </button>
              </div>
            )}
          </div>
          
          {!showForm && !editing && (
            <button
              onClick={startAdd}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-violet-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <Plus className="w-4 h-4" /> Ürün Ekle
            </button>
          )}
        </div>
        
        {/* Alt Satır: Kategori Filtreleri - Scrollable */}
        <div className="overflow-x-auto pb-2 -mx-4 px-4">
          <div className="flex gap-1 min-w-max">
            <button
              onClick={() => setCategoryFilter("all")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap ${
                categoryFilter === "all"
                  ? "bg-gradient-to-r from-blue-500 to-violet-600 text-white shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-muted/70"
              }`}
            >
              Tümü ({products.length})
            </button>
            {candleholderCount > 0 && (
              <button
                onClick={() => setCategoryFilter("candleholder")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap ${
                  categoryFilter === "candleholder"
                    ? "bg-amber-500 text-white shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/70"
                }`}
              >
                🕯️ Mumluklar ({candleholderCount})
              </button>
            )}
            {keychainCount > 0 && (
              <button
                onClick={() => setCategoryFilter("keychain")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap ${
                  categoryFilter === "keychain"
                    ? "bg-violet-500 text-white shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/70"
                }`}
              >
                🔑 Anahtarlıklar ({keychainCount})
              </button>
            )}
            {soapdishCount > 0 && (
              <button
                onClick={() => setCategoryFilter("soapdish")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap ${
                  categoryFilter === "soapdish"
                    ? "bg-green-500 text-white shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/70"
                }`}
              >
                🧼 Sıvı Sabunluklar ({soapdishCount})
              </button>
            )}
            {solidSoapDishCount > 0 && (
              <button
                onClick={() => setCategoryFilter("solid-soap-dish")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap ${
                  categoryFilter === "solid-soap-dish"
                    ? "bg-teal-500 text-white shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/70"
                }`}
              >
                🧴 Katı Sabunluklar ({solidSoapDishCount})
              </button>
            )}
            {sugarBowlCount > 0 && (
              <button
                onClick={() => setCategoryFilter("sugar-bowl")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap ${
                  categoryFilter === "sugar-bowl"
                    ? "bg-pink-500 text-white shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/70"
                }`}
              >
                🍬 Şekerlikler ({sugarBowlCount})
              </button>
            )}
            {snackBowlCount > 0 && (
              <button
                onClick={() => setCategoryFilter("snack-bowl")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap ${
                  categoryFilter === "snack-bowl"
                    ? "bg-orange-500 text-white shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/70"
                }`}
              >
                🥜 Çerezlikler ({snackBowlCount})
              </button>
            )}
            {fruitBowlCount > 0 && (
              <button
                onClick={() => setCategoryFilter("fruit-bowl")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap ${
                  categoryFilter === "fruit-bowl"
                    ? "bg-red-500 text-white shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/70"
                }`}
              >
                🍎 Meyvelikler ({fruitBowlCount})
              </button>
            )}
            {containerCount > 0 && (
              <button
                onClick={() => setCategoryFilter("container")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap ${
                  categoryFilter === "container"
                    ? "bg-slate-500 text-white shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/70"
                }`}
              >
                🥣 Kaplar ({containerCount})
              </button>
            )}
            {strainerCount > 0 && (
              <button
                onClick={() => setCategoryFilter("strainer")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap ${
                  categoryFilter === "strainer"
                    ? "bg-cyan-500 text-white shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/70"
                }`}
              >
                🥄 Süzgeçler ({strainerCount})
              </button>
            )}
            {spiceHolderCount > 0 && (
              <button
                onClick={() => setCategoryFilter("spice-holder")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap ${
                  categoryFilter === "spice-holder"
                    ? "bg-yellow-500 text-white shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/70"
                }`}
              >
                🌶️ Baharatlıklar ({spiceHolderCount})
              </button>
            )}
            {towelHolderCount > 0 && (
              <button
                onClick={() => setCategoryFilter("towel-holder")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap ${
                  categoryFilter === "towel-holder"
                    ? "bg-indigo-500 text-white shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/70"
                }`}
              >
                🧺 Havluluklar ({towelHolderCount})
              </button>
            )}
            {brushHolderCount > 0 && (
              <button
                onClick={() => setCategoryFilter("brush-holder")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap ${
                  categoryFilter === "brush-holder"
                    ? "bg-purple-500 text-white shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/70"
                }`}
              >
                🪥 Fırçalıklar ({brushHolderCount})
              </button>
            )}
            {potCount > 0 && (
              <button
                onClick={() => setCategoryFilter("pot")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap ${
                  categoryFilter === "pot"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/70"
                }`}
              >
                🪴 Saksılar ({potCount})
              </button>
            )}
            {toyCount > 0 && (
              <button
                onClick={() => setCategoryFilter("toy")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap ${
                  categoryFilter === "toy"
                    ? "bg-amber-500 text-white shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/70"
                }`}
              >
                🧸 Oyuncaklar ({toyCount})
              </button>
            )}
            {decorCount > 0 && (
              <button
                onClick={() => setCategoryFilter("decor")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap ${
                  categoryFilter === "decor"
                    ? "bg-pink-600 text-white shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/70"
                }`}
              >
                🎨 Dekorlar ({decorCount})
              </button>
            )}
            {holderCount > 0 && (
              <button
                onClick={() => setCategoryFilter("holder")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap ${
                  categoryFilter === "holder"
                    ? "bg-neutral-600 text-white shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/70"
                }`}
              >
                📎 Tutacaklar ({holderCount})
              </button>
            )}
            {gpuSupportCount > 0 && (
              <button
                onClick={() => setCategoryFilter("gpu-support")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap ${
                  categoryFilter === "gpu-support"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/70"
                }`}
              >
                🖥️ GPU Destekleri ({gpuSupportCount})
              </button>
            )}
            {bookmarkCount > 0 && (
              <button
                onClick={() => setCategoryFilter("bookmark")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap ${
                  categoryFilter === "bookmark"
                    ? "bg-red-600 text-white shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/70"
                }`}
              >
                🔖 Kitap Ayraçları ({bookmarkCount})
              </button>
            )}
            {pencilHolderCount > 0 && (
              <button
                onClick={() => setCategoryFilter("pencil-holder")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap ${
                  categoryFilter === "pencil-holder"
                    ? "bg-yellow-600 text-white shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/70"
                }`}
              >
                ✏️ Kalemlikler ({pencilHolderCount})
              </button>
            )}
            {plateHolderCount > 0 && (
              <button
                onClick={() => setCategoryFilter("plate-holder")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap ${
                  categoryFilter === "plate-holder"
                    ? "bg-teal-600 text-white shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/70"
                }`}
              >
                🏷️ Plakalıklar ({plateHolderCount})
              </button>
            )}
            {organizerCount > 0 && (
              <button
                onClick={() => setCategoryFilter("organizer")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap ${
                  categoryFilter === "organizer"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/70"
                }`}
              >
                🗃️ Düzenleyiciler ({organizerCount})
              </button>
            )}
            {otherCount > 0 && (
              <button
                onClick={() => setCategoryFilter("other")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap ${
                  categoryFilter === "other"
                    ? "bg-slate-600 text-white shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/70"
                }`}
              >
                📦 Diğer ({otherCount})
              </button>
            )}
          </div>
        </div>
      </div>

      {(showForm) && (
        <ProductForm
          onSave={() => { closeForm(); load(); }}
          onCancel={closeForm}
        />
      )}

      {galleryProductId && (
        <ProductGallery 
          productId={galleryProductId} 
          onClose={() => setGalleryProductId(null)} 
        />
      )}

      {editing && (
        <ProductForm
          initial={editing}
          onSave={() => { closeForm(); load(); }}
          onCancel={closeForm}
        />
      )}

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => <div key={i} className="h-40 bg-card rounded-2xl animate-pulse border border-border" />)}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/10 to-violet-500/10 flex items-center justify-center mx-auto mb-4">
            <Package className="w-7 h-7 text-blue-500" />
          </div>
          <p className="font-semibold text-foreground mb-1">
            {filter === "no-image" ? "Tüm ürünlerin resmi var" : "Henüz ürün yok"}
          </p>
          <p className="text-sm text-muted-foreground mb-5">
            {filter === "no-image" ? "Harika! Tüm ürünlerinizin fotoğrafı mevcut" : "Ürün kataloğunuzu oluşturun"}
          </p>
          {filter === "no-image" ? (
            <button onClick={() => setFilter("all")} className="bg-gradient-to-r from-blue-500 to-violet-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl shadow-lg shadow-blue-500/25">
              Tüm Ürünleri Göster
            </button>
          ) : (
            <button onClick={() => setShowForm(true)} className="bg-gradient-to-r from-blue-500 to-violet-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl shadow-lg shadow-blue-500/25">
              İlk Ürünü Ekle
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {filteredProducts.map((p) => (
            <div key={p.id} className="bg-card rounded-2xl border border-border overflow-hidden hover:border-blue-500/30 hover:shadow-md hover:shadow-blue-500/5 transition-all group">
              {/* Image area */}
              <div className="relative h-40 bg-muted overflow-hidden">
                {p.image_url ? (
                  <img 
                    src={p.image_url} 
                    alt={p.name} 
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Package className="w-10 h-10 text-muted-foreground/30" />
                  </div>
                )}
                {/* Actions overlay - sadece desktop hover'da */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:flex items-center justify-center gap-1.5">
                  <button
                    onClick={() => handleSendToTrendyol(p)}
                    className="w-8 h-8 bg-orange-600/90 rounded-lg flex items-center justify-center text-white hover:bg-orange-600 transition-colors shadow-sm"
                    title="Trendyol'a Yükle / Aktar"
                  >
                    <Store className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => { setGalleryProductId(p.id); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                    className="w-8 h-8 bg-violet-500/90 rounded-lg flex items-center justify-center text-white hover:bg-violet-500 transition-colors"
                    title="Galeri (Çoklu Resim)"
                  >
                    <ImageIcon2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => { startEdit(p); }}
                    className="w-8 h-8 bg-card/90 dark:bg-card/90 rounded-lg flex items-center justify-center text-foreground hover:bg-card transition-colors border border-border"
                    title="Düzenle"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => del(p.id)}
                    className="w-8 h-8 bg-red-500/90 rounded-lg flex items-center justify-center text-white hover:bg-red-500 transition-colors"
                    title="Sil"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="p-3">
                <p className="font-semibold text-sm text-foreground truncate">{p.name}</p>
                {p.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{p.description}</p>}
                {p.has_sizes ? (
                  <p className="text-xs text-violet-600 dark:text-violet-400 font-medium mt-1 flex items-center gap-1">
                    <Ruler className="w-3 h-3" />
                    Farklı boyutlar mevcut
                  </p>
                ) : p.weight_grams > 0 ? (
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mt-1 flex items-center gap-1">
                    <Scale className="w-3 h-3" />
                    {p.weight_grams} gr
                  </p>
                ) : null}
                {/* Mobil butonlar */}
                <div className="flex flex-wrap gap-1.5 mt-2 sm:hidden">
                  <button
                    onClick={() => handleSendToTrendyol(p)}
                    className="flex-1 min-w-[70px] flex items-center justify-center gap-1 py-1.5 rounded-lg border border-orange-500/40 text-xs font-semibold text-orange-600 dark:text-orange-400 hover:bg-orange-500/10 transition-colors"
                  >
                    <Store className="w-3 h-3" /> TY Yükle
                  </button>
                  <button
                    onClick={() => { setGalleryProductId(p.id); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                    className="flex-1 min-w-[60px] flex items-center justify-center gap-1 py-1.5 rounded-lg border border-violet-500/30 text-xs font-medium text-violet-500 hover:bg-violet-500/10 transition-colors"
                  >
                    <ImageIcon2 className="w-3 h-3" /> Galeri
                  </button>
                  <button
                    onClick={() => startEdit(p)}
                    className="flex-1 min-w-[60px] flex items-center justify-center gap-1 py-1.5 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-muted transition-colors"
                  >
                    <Pencil className="w-3 h-3" /> Düzenle
                  </button>
                  <button
                    onClick={() => del(p.id)}
                    className="w-8 flex items-center justify-center py-1.5 rounded-lg border border-red-500/30 text-xs font-medium text-red-500 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <ConfirmDialog />
    </div>
  );
}
