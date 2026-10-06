"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import {
  Sparkles,
  Search,
  Upload,
  Image as ImageIcon,
  TrendingUp,
  Award,
  DollarSign,
  Tag,
  Copy,
  Check,
  ExternalLink,
  ShieldAlert,
  HelpCircle,
  BarChart3,
  Layers,
  Flame,
  Star,
  ShoppingBag,
  RefreshCw,
  SlidersHorizontal,
  ChevronRight,
  Eye,
  Info,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  FileText,
  Code,
  ArrowRight,
} from "lucide-react";
import { CompetitorProduct, KeywordFrequency, MarketStats, TrendyolScrapeResult } from "@/lib/trendyol-market-scraper";
import { VisionAnalysisResult, SeoGeneratedContent } from "@/lib/seo-ai-generator";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";

export function SeoAnalysisClient() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Girdi State'leri
  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState<"ALL" | "BEST_SELLER" | "MOST_RATED" | "MOST_FAVOURITE" | "DEFAULT">("ALL");
  const [brandName, setBrandName] = useState("");
  const [customNotes, setCustomNotes] = useState("");
  const [customApiKey, setCustomApiKey] = useState("");
  const [showKeyModal, setShowKeyModal] = useState(false);

  // Görsel State'leri
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [analyzingImage, setAnalyzingImage] = useState(false);
  const [visionData, setVisionData] = useState<VisionAnalysisResult | null>(null);

  // Analiz & Yükleme State'leri
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState<"idle" | "vision" | "scraping" | "nlp" | "generating" | "done">("idle");
  const [progressPercent, setProgressPercent] = useState(0);

  // Sonuç State'leri
  const [scrapeResult, setScrapeResult] = useState<TrendyolScrapeResult | null>(null);
  const [seoResult, setSeoResult] = useState<SeoGeneratedContent | null>(null);

  // UI Tab State
  const [activeTab, setActiveTab] = useState<"ai_content" | "competitors" | "keywords" | "pricing" | "gap_analysis">("ai_content");
  const [competitorSubFilter, setCompetitorSubFilter] = useState<"all" | "bestseller" | "most_rated" | "most_favorited" | "recommended">("all");
  const [selectedTitleIdx, setSelectedTitleIdx] = useState(0);
  const [descriptionViewMode, setDescriptionViewMode] = useState<"preview" | "code">("preview");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Panoya Kopyalama Fonksiyonu
  const copyToClipboard = (text: string, keyId: string, label = "Kopyalandı") => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyId);
    toast({
      title: "Panoya Kopyalandı",
      description: `${label} başarıyla panoya kopyalandı.`,
    });
    setTimeout(() => {
      setCopiedKey((prev) => (prev === keyId ? null : prev));
    }, 2500);
  };

  // Görsel Seçme ve AI Vision İle Ön Analiz
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      setSelectedImage(base64);
      setAnalyzingImage(true);
      setVisionData(null);

      toast({
        title: "👁️ Görsel Analiz Ediliyor",
        description: "Yapay zeka ürünün tarzını, 3D geometrisini ve detaylarını inceliyor...",
      });

      try {
        const res = await fetch("/api/seo-analysis/vision", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageBase64: base64,
            mimeType: file.type || "image/jpeg",
          }),
        });

        const data = await res.json();
        if (res.ok && data.success && data.data) {
          const vision = data.data;
          setVisionData(vision);

          // Arama terimini ve Özel Ürün Notlarını otomatik doldur
          if (vision.suggestedSearchQuery) {
            setSearchQuery(vision.suggestedSearchQuery);
          }
          if (vision.suggestedNotes) {
            setCustomNotes(vision.suggestedNotes);
          }

          toast({
            title: vision.characterOrTheme ? `🎯 ${vision.characterOrTheme} Tespit Edildi!` : "✅ Ürün Tanımlandı!",
            description: `${vision.productType} (${vision.categorySuggestion})`,
          });
        } else {
          throw new Error(data.error || "Görsel tanımlanamadı");
        }
      } catch (err: any) {
        toast({
          title: "Görsel Analizi Uyarısı",
          description: err.message || "Görsel analizi yapılamadı, manuel arama yapabilirsiniz.",
          variant: "destructive",
        });
      } finally {
        setAnalyzingImage(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Tam Kapsamlı SEO ve Rakip Analizini Başlat
  const handleStartAnalysis = async () => {
    const queryToSearch = searchQuery.trim() || visionData?.suggestedSearchQuery;
    if (!queryToSearch) {
      toast({
        title: "Eksik Bilgi",
        description: "Lütfen bir ürün adı yazın veya ürün fotoğrafı yükleyin.",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    setProgressPercent(15);
    setAnalysisStep(selectedImage && !visionData ? "vision" : "scraping");

    try {
      // 1. ADIM: Görsel Varsa ve Henüz Analiz Edilmediyse Analiz Et
      let currentVision = visionData;
      if (selectedImage && !currentVision) {
        setAnalysisStep("vision");
        setProgressPercent(25);
        const vRes = await fetch("/api/seo-analysis/vision", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64: selectedImage }),
        });
        const vData = await vRes.json();
        if (vRes.ok && vData.data) {
          currentVision = vData.data;
          setVisionData(vData.data);
        }
      }

      // 2. ADIM: Canlı Trendyol Pazar Taraması
      setAnalysisStep("scraping");
      setProgressPercent(45);
      toast({
        title: "🔍 Trendyol Taranıyor",
        description: `[${queryToSearch}] için en çok satan lider rakipler ve fiyatlar toplanıyor...`,
      });

      const scrapeRes = await fetch("/api/seo-analysis/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: queryToSearch,
          sort: sortMode,
          limit: 30,
        }),
      });

      const scrapeData = await scrapeRes.json();
      if (!scrapeRes.ok || !scrapeData.success) {
        throw new Error(scrapeData.error || "Trendyol pazar verisi taranamadı");
      }

      const scrapedMarket: TrendyolScrapeResult = scrapeData.data;
      setScrapeResult(scrapedMarket);

      // 3. ADIM: Anahtar Kelime & TF-IDF Hesaplaması
      setAnalysisStep("nlp");
      setProgressPercent(70);

      // 4. ADIM: Yapay Zeka ile 1. Sıra Odaklı SEO Paketi Üretimi
      setAnalysisStep("generating");
      setProgressPercent(85);

      const genRes = await fetch("/api/seo-analysis/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productTitleOrQuery: queryToSearch,
          visionData: currentVision,
          competitors: scrapedMarket.products,
          keywords: scrapedMarket.keywords,
          stats: scrapedMarket.stats,
          brandName: brandName.trim() || undefined,
          customNotes: customNotes || currentVision?.suggestedNotes,
          suggestions: scrapedMarket.suggestions || [],
        }),
      });

      const genData = await genRes.json();
      if (!genRes.ok || !genData.success) {
        throw new Error(genData.error || "SEO içerik paketi üretilemedi");
      }

      setSeoResult(genData.data);
      setProgressPercent(100);
      setAnalysisStep("done");
      setActiveTab("ai_content");

      toast({
        title: "🎉 Analiz Başarıyla Tamamlandı!",
        description: "1. Sıra odaklı başlıklar, zengin açıklama ve rakip istatistikleri hazır!",
      });
    } catch (err: any) {
      toast({
        title: "Analiz Hatası",
        description: err.message || "İşlem sırasında beklenmeyen bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-24">
      {/* Üst Başlık Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-950 border border-purple-800/30 p-6 sm:p-8 text-white shadow-2xl">
        <div className="absolute -right-10 -top-10 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-1/3 -bottom-10 w-60 h-60 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-400/30 text-xs font-semibold text-purple-300">
              <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
              <span>Yapay Zeka Destekli Trendyol 1. Sıra SEO Motoru</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-purple-200">
              Trendyol Akıllı SEO & Canlı Rakip Analizi
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              Ürün fotoğrafınızı yükleyin veya arama terimini girin. Yapay zeka canlı Trendyol pazarını tarar, en çok satan ve sepete atılan lider rakipleri inceler, anahtar kelime frekanslarını çıkarır ve 1. sıraya oynayan SEO başlıkları ile 3D baskı bakım uyarılarını hazırlar.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex flex-col items-end text-xs text-slate-400">
              <span className="text-purple-300 font-semibold">Gemini 2.0 Vision + Puppeteer</span>
              <span>Canlı Pazar & Çoklu N-Gram TF-IDF</span>
            </div>
          </div>
        </div>
      </div>

      {/* Girdi ve Kontrol Paneli */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sol Taraf: Görsel Yükleme Dropzone (4 Kolon) */}
        <div className="lg:col-span-4 bg-card rounded-3xl border border-border p-5 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-bold text-foreground flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-primary" />
                Ürün Fotoğrafı (Opsiyonel)
              </label>
              {selectedImage && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedImage(null);
                    setVisionData(null);
                  }}
                  className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                >
                  Kaldır
                </button>
              )}
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageSelect}
              accept="image/*"
              className="hidden"
            />

            {!selectedImage ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="group relative border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 rounded-2xl p-6 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center min-h-[190px]"
              >
                <div className="w-12 h-12 rounded-2xl bg-muted group-hover:bg-primary/10 flex items-center justify-center mb-3 transition-colors">
                  <Upload className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <p className="text-sm font-semibold text-foreground">Görsel Seç veya Sürükle</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Yapay zeka tavla, biblo, vazo vb. 3D tasarım detaylarını otomatik tanır
                </p>
              </div>
            ) : (
              <div className="relative rounded-2xl overflow-hidden border border-border group bg-muted/40">
                <div className="relative aspect-video w-full">
                  <Image
                    src={selectedImage}
                    alt="Yüklenen Ürün"
                    fill
                    className="object-contain p-2"
                  />
                </div>

                {analyzingImage && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-white text-xs gap-2 p-4 text-center">
                    <RefreshCw className="w-6 h-6 animate-spin text-purple-400" />
                    <span>Görsel Yapay Zeka ile İnceleniyor...</span>
                  </div>
                )}
              </div>
            )}

            {/* Vision Tespit Sonuç Rozetleri */}
            {visionData && (
              <div className="mt-4 p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-xs space-y-2">
                <div className="flex items-center justify-between font-bold text-purple-600 dark:text-purple-400">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    AI Görsel Analizi
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20">
                    {visionData.style || "Özel Tasarım"}
                  </span>
                </div>
                <p className="font-semibold text-foreground text-xs leading-snug">
                  {visionData.productType}
                </p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {visionData.colors?.map((c, idx) => (
                    <span key={idx} className="px-2 py-0.5 rounded-md bg-background/80 border border-border text-[11px] text-muted-foreground">
                      🎨 {c}
                    </span>
                  ))}
                  {visionData.materials?.map((m, idx) => (
                    <span key={idx} className="px-2 py-0.5 rounded-md bg-background/80 border border-border text-[11px] text-muted-foreground">
                      🧵 {m}
                    </span>
                  ))}
                  {visionData.dimensionsEstimated && (
                    <span className="px-2 py-0.5 rounded-md bg-background/80 border border-border text-[11px] text-muted-foreground">
                      📐 {visionData.dimensionsEstimated}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="text-[11px] text-muted-foreground pt-2 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-primary shrink-0" />
            <span>Fotoğraf yüklendiğinde malzeme ve ebat analizi otomatik yapılır.</span>
          </div>
        </div>

        {/* Sağ Taraf: Arama, Sıralama ve Başlatma Formu (8 Kolon) */}
        <div className="lg:col-span-8 bg-card rounded-3xl border border-border p-5 sm:p-6 shadow-sm flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            {/* Arama Kutusu */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-bold text-foreground flex items-center gap-1.5">
                  <Search className="w-4 h-4 text-primary" />
                  Hedef Ürün Adı / Anahtar Kelime
                </label>
                {visionData?.suggestedSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery(visionData.suggestedSearchQuery)}
                    className="text-xs text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
                  >
                    <span>Görselden doldur: <strong>{visionData.suggestedSearchQuery}</strong></span>
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Örn: 3d baskı tavla, geometrik vazo, dragon figür, masaüstü organizer..."
                  className="w-full pl-4 pr-10 py-3.5 bg-background border border-border rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary shadow-inner"
                />
                <Search className="w-5 h-5 absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            {/* Ayarlar Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Sıralama / Pazar Analiz Modu */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                  Hedef Pazar ve Rakip Filtresi
                </label>
                <select
                  value={sortMode}
                  onChange={(e: any) => setSortMode(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary font-semibold text-foreground"
                >
                  <option value="ALL">🌟 Hepsini Birlikte Analiz Et (360° Süper Pazar Taraması)</option>
                  <option value="BEST_SELLER">🔥 Sadece En Çok Satanlar (Best Sellers)</option>
                  <option value="MOST_RATED">⭐ Sadece En Çok Değerlendirilenler / Yorum Alanlar</option>
                  <option value="MOST_FAVOURITE">🧡 Sadece En Çok Favorilenenler / Sepete Atılanlar</option>
                  <option value="DEFAULT">🎯 Sadece Trendyol Önerilen Sıralama</option>
                </select>
              </div>

              {/* Marka Adı (Opsiyonel) */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                  Marka Adı (Opsiyonel - Boş Bırakabilirsiniz)
                </label>
                <input
                  type="text"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder="Örn: Varsa markanız (Yoksa boş bırakın)"
                  className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            {/* Ek Notlar / Özel Vurgular (AI Otomatik Doldurur) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-muted-foreground">
                  Özel Ürün Notları / Eklemek İstediğiniz Vurgular (Yapay Zeka Otomatik Doldurur)
                </label>
                {visionData?.suggestedNotes && (
                  <button
                    type="button"
                    onClick={() => setCustomNotes(visionData.suggestedNotes)}
                    className="text-[11px] text-purple-600 dark:text-purple-400 font-bold hover:underline flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    Görselden Yeniden Doldur
                  </button>
                )}
              </div>
              <textarea
                rows={2}
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                placeholder="Görsel yüklediğinizde yapay zeka burayı ürün ve karakter detaylarıyla otomatik doldurur. İsterseniz ekleme/düzenleme yapabilirsiniz..."
                className="w-full px-3.5 py-2 bg-background border border-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary resize-none leading-relaxed"
              />
              {visionData?.characterOrTheme && (
                <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-purple-600 dark:text-purple-300 font-bold bg-purple-500/10 px-2.5 py-1 rounded-lg border border-purple-500/20">
                  <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                  <span>Tespit Edilen Karakter / Tema: <strong>{visionData.characterOrTheme}</strong></span>
                </div>
              )}
            </div>
          </div>

          {/* Aksiyon Butonu ve Durum */}
          <div className="pt-2 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-muted-foreground flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-500" />
              <span>Canlı Trendyol arama sonuçlarından anlık veriler çekilir.</span>
            </div>

            <button
              type="button"
              onClick={handleStartAnalysis}
              disabled={isAnalyzing || (!searchQuery.trim() && !selectedImage)}
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white font-bold text-sm hover:opacity-95 transition-all shadow-lg shadow-purple-500/25 disabled:opacity-50 flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99]"
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Analiz Yapılıyor (%{progressPercent})...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Canlı Analizi & SEO Paketini Başlat</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Analiz Yüklenme / İlerleme Çubuğu */}
      {isAnalyzing && (
        <div className="p-6 rounded-3xl bg-card border border-purple-500/30 shadow-xl space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                <RefreshCw className="w-5 h-5 text-purple-500 animate-spin" />
              </div>
              <div>
                <h3 className="font-bold text-foreground text-sm">
                  {analysisStep === "vision" && "1/4 Görsel Analizi Yapılıyor (Tasarım & 3D Özellikleri)..."}
                  {analysisStep === "scraping" && (visionData ? "2/4 Trendyol Canlı Pazar Taranıyor (Görsel Analizi Tamamlandı ✓)..." : "1/3 Trendyol Canlı Pazar Taranıyor (Lider Rakipler, Fiyatlar & Rozetler)...")}
                  {analysisStep === "nlp" && "3/4 TF-IDF & Çoklu Anahtar Kelime Frekansları Hesaplanıyor..."}
                  {analysisStep === "generating" && "4/4 Yapay Zeka 1. Sıra Başlıkları & 3D Bakım Kılavuzunu Üretiyor..."}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Gerçek Trendyol verileri inceleniyor ve dönüşüm stratejisi oluşturuluyor.
                </p>
              </div>
            </div>
            <span className="text-sm font-extrabold text-purple-600 dark:text-purple-400">%{progressPercent}</span>
          </div>

          <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-purple-500 via-indigo-500 to-blue-500 h-full transition-all duration-500 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* SONUÇ DASHBOARD'U */}
      {scrapeResult && seoResult && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Metrik Kartları Barı */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            {/* Ortalama Fiyat */}
            <div className="p-4 rounded-2xl bg-card border border-border shadow-sm">
              <p className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-blue-500" />
                Ortalama Fiyat
              </p>
              <p className="text-lg sm:text-xl font-bold text-foreground mt-1">
                {scrapeResult.stats.avgPrice.toLocaleString("tr-TR")} TL
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Min: {scrapeResult.stats.minPrice} TL • Max: {scrapeResult.stats.maxPrice} TL
              </p>
            </div>

            {/* Önerilen Satış Fiyatı */}
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 shadow-sm">
              <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" />
                Önerilen Fiyat
              </p>
              <p className="text-lg sm:text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                {scrapeResult.stats.recommendedPrice.toLocaleString("tr-TR")} TL
              </p>
              <p className="text-[10px] text-emerald-700/80 dark:text-emerald-400/80 mt-0.5">
                Rekabetçi tatlı nokta
              </p>
            </div>

            {/* İncelenen Rakip Sayısı */}
            <div className="p-4 rounded-2xl bg-card border border-border shadow-sm">
              <p className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-purple-500" />
                İncelenen Liderler
              </p>
              <p className="text-lg sm:text-xl font-bold text-foreground mt-1">
                {scrapeResult.products.length} Ürün
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {scrapeResult.stats.bestsellerCount} Adet En Çok Satan
              </p>
            </div>

            {/* Ortalama Puan */}
            <div className="p-4 rounded-2xl bg-card border border-border shadow-sm">
              <p className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                Ortalama Puan
              </p>
              <p className="text-lg sm:text-xl font-bold text-foreground mt-1">
                {scrapeResult.stats.avgRating} / 5.0
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Toplam {scrapeResult.stats.totalReviews.toLocaleString("tr-TR")} yorum
              </p>
            </div>

            {/* Anahtar Kelime Sayısı */}
            <div className="p-4 rounded-2xl bg-card border border-border shadow-sm">
              <p className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-pink-500" />
                Tespit Edilen Kelime
              </p>
              <p className="text-lg sm:text-xl font-bold text-foreground mt-1">
                {scrapeResult.keywords.length} Adet
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                1-Gram & Çoklu Kalıplar
              </p>
            </div>

            {/* SEO Kalite Skoru */}
            <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/30 shadow-sm">
              <p className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 flex items-center gap-1">
                <Award className="w-3.5 h-3.5" />
                SEO Kalite Puanı
              </p>
              <p className="text-lg sm:text-xl font-extrabold text-purple-600 dark:text-purple-400 mt-1">
                {seoResult.seoScore} / 100
              </p>
              <p className="text-[10px] text-purple-700/80 dark:text-purple-400/80 mt-0.5">
                1. Sıra Algoritma Uyumlu
              </p>
            </div>
          </div>

          {/* Sekme Seçici (Tabs) */}
          <div className="flex items-center gap-2 border-b border-border pb-3 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveTab("ai_content")}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
                activeTab === "ai_content"
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI SEO İçerik Stüdyosu</span>
            </button>

            <button
              onClick={() => setActiveTab("competitors")}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
                activeTab === "competitors"
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground"
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Canlı Rakipler ({scrapeResult.products.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("keywords")}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
                activeTab === "keywords"
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground"
              }`}
            >
              <Tag className="w-3.5 h-3.5" />
              <span>Anahtar Kelime Analizi ({scrapeResult.keywords.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("pricing")}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
                activeTab === "pricing"
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground"
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Fiyat & Pazar Dağılımı</span>
            </button>

            <button
              onClick={() => setActiveTab("gap_analysis")}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
                activeTab === "gap_analysis"
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground"
              }`}
            >
              <Lightbulb className="w-3.5 h-3.5" />
              <span>Fırsat & Rakip Zayıflık Raporu</span>
            </button>
          </div>

          {/* SEKME 1: AI SEO İÇERİK STÜDYOSU */}
          {activeTab === "ai_content" && (
            <div className="space-y-6">
              {/* 1. KISIM: 5 FARKLI BAŞLIK ALTERNATİFİ */}
              <div className="bg-card rounded-3xl border border-border p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-foreground text-base flex items-center gap-2">
                      <Award className="w-5 h-5 text-purple-500" />
                      1. Sıraya Oynayan SEO Ürün Başlıkları
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Trendyol arama algoritması için en çok tıklama ve arama hacmi yakalayacak formüllerle hazırlanmıştır.
                    </p>
                  </div>
                  <span className="text-xs px-3 py-1 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 font-semibold">
                    5 Stratejik Varyasyon
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {seoResult.titles.map((t, idx) => {
                    const isSelected = selectedTitleIdx === idx;
                    return (
                      <div
                        key={idx}
                        onClick={() => setSelectedTitleIdx(idx)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          isSelected
                            ? "bg-purple-500/5 border-purple-500 ring-1 ring-purple-500"
                            : "bg-background hover:bg-muted/40 border-border"
                        }`}
                      >
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary">
                              {t.label}
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              {t.characterCount} Karakter (Trendyol limiti ~100)
                            </span>
                          </div>
                          <p className="font-bold text-foreground text-sm leading-snug">
                            {t.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            💡 {t.explanation}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              copyToClipboard(t.title, `title-${idx}`, "Başlık");
                            }}
                            className="px-3.5 py-2 rounded-xl bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold flex items-center gap-1.5 transition-colors"
                          >
                            {copiedKey === `title-${idx}` ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                                <span className="text-emerald-500">Kopyalandı</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Kopyala</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 2. KISIM: ZENGİN HTML ÜRÜN AÇIKLAMASI & 3D UYARILARI */}
              <div className="bg-card rounded-3xl border border-border p-6 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
                  <div>
                    <h3 className="font-bold text-foreground text-base flex items-center gap-2">
                      <FileText className="w-5 h-5 text-blue-500" />
                      Trendyol Zengin HTML Açıklama Metni
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Tablolar, maddeler, emojiler ve detaylı 3D üretim & bakım yönergeleri içerir.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Görünüm Modu Değiştirici */}
                    <div className="p-1 rounded-xl bg-muted flex items-center text-xs">
                      <button
                        onClick={() => setDescriptionViewMode("preview")}
                        className={`px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1.5 ${
                          descriptionViewMode === "preview" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                        }`}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Önizleme
                      </button>
                      <button
                        onClick={() => setDescriptionViewMode("code")}
                        className={`px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1.5 ${
                          descriptionViewMode === "code" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                        }`}
                      >
                        <Code className="w-3.5 h-3.5" />
                        HTML Kod
                      </button>
                    </div>

                    {/* Kopyalama Butonu */}
                    <button
                      type="button"
                      onClick={() =>
                        copyToClipboard(
                          descriptionViewMode === "code" ? seoResult.htmlDescription : seoResult.plainTextDescription,
                          "desc-copy",
                          descriptionViewMode === "code" ? "HTML Açıklama" : "Metin Açıklama"
                        )
                      }
                      className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold flex items-center gap-1.5 hover:opacity-90 transition-opacity shadow-sm"
                    >
                      {copiedKey === "desc-copy" ? (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Kopyalandı</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span>{descriptionViewMode === "code" ? "HTML Olarak Kopyala" : "Metni Kopyala"}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Açıklama İçerik Kutusu */}
                {descriptionViewMode === "preview" ? (
                  <div
                    className="p-6 rounded-2xl bg-background border border-border prose dark:prose-invert max-w-none text-xs sm:text-sm overflow-x-auto"
                    dangerouslySetInnerHTML={{ __html: seoResult.htmlDescription }}
                  />
                ) : (
                  <pre className="p-4 rounded-2xl bg-muted/60 border border-border text-[11px] font-mono text-foreground overflow-x-auto whitespace-pre-wrap max-h-96">
                    {seoResult.htmlDescription}
                  </pre>
                )}
              </div>

              {/* 3. KISIM: 3D BASKI ÖZEL BAKIM & UYARI KILAVUZU KARTLARI */}
              <div className="bg-card rounded-3xl border border-border p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-foreground text-base flex items-center gap-2">
                      <ShieldAlert className="w-5 h-5 text-amber-500" />
                      3D Üretim Özel Kullanım, Yıkama & Bakım Kılavuzu
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Müşterilerin iade oranını düşürmek ve doğru kullanım sağlamak için ürün kutusu veya açıklamasına eklenecek maddeler.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const text = seoResult.careAndWarningGuide
                        .map((g) => `${g.icon} ${g.title}: ${g.description}`)
                        .join("\n\n");
                      copyToClipboard(text, "care-guide", "Bakım Kılavuzu");
                    }}
                    className="text-xs text-primary hover:underline flex items-center gap-1 font-semibold"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Tümünü Kopyala
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {seoResult.careAndWarningGuide.map((item, idx) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-2xl border flex items-start gap-3.5 ${
                        item.cautionLevel === "high"
                          ? "bg-red-500/5 border-red-500/20"
                          : item.cautionLevel === "medium"
                          ? "bg-amber-500/5 border-amber-500/20"
                          : "bg-blue-500/5 border-blue-500/20"
                      }`}
                    >
                      <span className="text-2xl shrink-0 p-2 rounded-xl bg-background border border-border/60">
                        {item.icon}
                      </span>
                      <div className="space-y-1">
                        <h4 className="font-bold text-foreground text-xs sm:text-sm flex items-center gap-2">
                          {item.title}
                          {item.cautionLevel === "high" && (
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-red-500/10 text-red-600 dark:text-red-400 font-extrabold">
                              ÖNEMLİ
                            </span>
                          )}
                        </h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 4. KISIM: TRENDYOL ARAMA ETİKETLERİ (TAGS) */}
              <div className="bg-card rounded-3xl border border-border p-6 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
                    <Tag className="w-4 h-4 text-pink-500" />
                    Önerilen Trendyol Arama Etiketleri ({seoResult.tags.length} Adet)
                  </h3>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(seoResult.tags.join(", "), "tags-copy", "Etiketler")}
                    className="text-xs text-primary hover:underline font-semibold flex items-center gap-1"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Virgülle Kopyala
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {seoResult.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      onClick={() => copyToClipboard(tag, `tag-${idx}`, tag)}
                      className="px-3 py-1.5 rounded-xl bg-muted hover:bg-muted/80 border border-border text-xs font-semibold text-foreground cursor-pointer transition-all hover:scale-105"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* SEKME 2: CANLI RAKİPLER GALERİSİ */}
          {activeTab === "competitors" && (
            <div className="bg-card rounded-3xl border border-border p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
                <div>
                  <h3 className="font-bold text-foreground text-base">
                    Trendyol Canlı Rakip Pazar Tablosu ({scrapeResult.products.length} Ürün)
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Sorgu: <strong>&ldquo;{scrapeResult.query}&rdquo;</strong> • Mod: <strong>{scrapeResult.sort === "ALL" ? "360° Süper Pazar Taraması" : scrapeResult.sort}</strong>
                  </p>
                </div>

                {/* Alt Filtre Butonları (En Çok Satan / Yorum Alan / Favori) */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar p-1 bg-muted rounded-2xl text-xs font-semibold">
                  <button
                    onClick={() => setCompetitorSubFilter("all")}
                    className={`px-3 py-1.5 rounded-xl transition-colors shrink-0 ${
                      competitorSubFilter === "all" ? "bg-background text-foreground shadow-sm font-bold" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Tümü ({scrapeResult.products.length})
                  </button>
                  <button
                    onClick={() => setCompetitorSubFilter("bestseller")}
                    className={`px-3 py-1.5 rounded-xl transition-colors shrink-0 flex items-center gap-1 ${
                      competitorSubFilter === "bestseller" ? "bg-background text-amber-600 dark:text-amber-400 shadow-sm font-bold" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Flame className="w-3 h-3 text-amber-500" />
                    En Çok Satanlar ({scrapeResult.bestSellers?.length || scrapeResult.products.filter(p => p.isBestseller).length})
                  </button>
                  <button
                    onClick={() => setCompetitorSubFilter("most_rated")}
                    className={`px-3 py-1.5 rounded-xl transition-colors shrink-0 flex items-center gap-1 ${
                      competitorSubFilter === "most_rated" ? "bg-background text-blue-600 dark:text-blue-400 shadow-sm font-bold" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                    Çok Değerlendirilenler ({scrapeResult.mostRated?.length || scrapeResult.products.filter(p => p.isMostRated).length})
                  </button>
                  <button
                    onClick={() => setCompetitorSubFilter("most_favorited")}
                    className={`px-3 py-1.5 rounded-xl transition-colors shrink-0 flex items-center gap-1 ${
                      competitorSubFilter === "most_favorited" ? "bg-background text-pink-600 dark:text-pink-400 shadow-sm font-bold" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span>🧡</span>
                    Favoriler / Sepettekiler ({scrapeResult.mostFavorited?.length || scrapeResult.products.filter(p => p.isMostFavorited).length})
                  </button>
                </div>
              </div>

              {/* Ürün Listesi Grid */}
              {(() => {
                const displayedProducts =
                  competitorSubFilter === "bestseller"
                    ? (scrapeResult.bestSellers?.length ? scrapeResult.bestSellers : scrapeResult.products.filter((p) => p.isBestseller))
                    : competitorSubFilter === "most_rated"
                    ? (scrapeResult.mostRated?.length ? scrapeResult.mostRated : scrapeResult.products.filter((p) => p.isMostRated))
                    : competitorSubFilter === "most_favorited"
                    ? (scrapeResult.mostFavorited?.length ? scrapeResult.mostFavorited : scrapeResult.products.filter((p) => p.isMostFavorited))
                    : scrapeResult.products;

                if (displayedProducts.length === 0) {
                  return (
                    <div className="py-12 text-center text-muted-foreground text-xs">
                      Bu filtreye ait ürün bulunamadı.
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {displayedProducts.map((prod) => {
                      const productUrl =
                        prod.link && prod.link.startsWith("http")
                          ? prod.link
                          : prod.link
                          ? `https://www.trendyol.com${prod.link.startsWith("/") ? "" : "/"}${prod.link}`
                          : `https://www.trendyol.com/sr?q=${encodeURIComponent(prod.title || prod.brand)}`;

                      return (
                        <div
                          key={prod.id}
                          className="bg-background rounded-2xl border border-border p-3.5 flex flex-col justify-between space-y-3 hover:shadow-md transition-all hover:border-primary/40 group"
                        >
                          <div className="space-y-2.5">
                            {/* Ürün Görseli & Sıralama Rozeti */}
                            <a
                              href={productUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="relative aspect-square w-full rounded-xl overflow-hidden bg-muted block cursor-pointer"
                              title="Trendyol'da Görüntüle"
                            >
                              <Image
                                src={prod.image}
                                alt={prod.title}
                                fill
                                unoptimized
                                className="object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                              <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-sm text-white font-extrabold text-[10px]">
                                #{prod.rank}
                              </span>

                              <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
                                {prod.isBestseller && (
                                  <span className="px-2 py-0.5 rounded-md bg-amber-500 text-black font-extrabold text-[9px] flex items-center gap-1 shadow-sm">
                                    <Flame className="w-2.5 h-2.5 fill-black" />
                                    En Çok Satan
                                  </span>
                                )}
                                {prod.isMostRated && !prod.isBestseller && (
                                  <span className="px-2 py-0.5 rounded-md bg-blue-600 text-white font-extrabold text-[9px] flex items-center gap-1 shadow-sm">
                                    <Star className="w-2.5 h-2.5 fill-white" />
                                    Çok Değerlendirilen
                                  </span>
                                )}
                              </div>
                            </a>

                            {/* Başlık & Marka */}
                            <div>
                              <span className="text-[11px] font-bold text-primary">{prod.brand}</span>
                              <a
                                href={productUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block text-xs font-semibold text-foreground line-clamp-2 leading-snug mt-0.5 hover:text-primary transition-colors cursor-pointer"
                                title={prod.title}
                              >
                                {prod.title}
                              </a>
                            </div>

                            {/* Sosyal Kanıtlar & Rozetler */}
                            {prod.socialProof && (
                              <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                <span>🚀</span>
                                <span>{prod.socialProof}</span>
                              </p>
                            )}
                          </div>

                          {/* Fiyat & Değerlendirme & Link */}
                          <div className="pt-2 border-t border-border flex items-center justify-between">
                            <div>
                              <p className="text-sm font-extrabold text-foreground">
                                {prod.formattedPrice}
                              </p>
                              {prod.reviewCount > 0 && (
                                <p className="text-[10px] text-muted-foreground flex items-center gap-0.5 mt-0.5">
                                  <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                                  <span>{prod.ratingScore}</span>
                                  <span>({prod.reviewCount})</span>
                                </p>
                              )}
                            </div>

                            <a
                              href={productUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 rounded-xl bg-muted hover:bg-primary hover:text-white text-foreground transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95"
                              title="Trendyol'da Yeni Sekmede Aç"
                              onClick={(e) => {
                                e.stopPropagation();
                              }}
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}

          {/* SEKME 3: ANAHTAR KELİME ANALİZİ (TF-IDF & ÖNERİLER) */}
          {activeTab === "keywords" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Sol: Rakiplerin En Çok Kullandığı Anahtar Kelimeler (8 Kolon) */}
              <div className="lg:col-span-8 bg-card rounded-3xl border border-border p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div>
                    <h3 className="font-bold text-foreground text-base">
                      Rakip Başlıklarındaki Anahtar Kelime Frekansları
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Lider rakiplerin başlıklarında en çok yer alan tekil ve çoklu arama kalıpları.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const text = scrapeResult.keywords.map((k) => k.keyword).join(", ");
                      copyToClipboard(text, "all-keywords", "Tüm Anahtar Kelimeler");
                    }}
                    className="text-xs text-primary font-semibold hover:underline flex items-center gap-1"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Tümünü Kopyala
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {scrapeResult.keywords.map((kw, idx) => (
                    <div
                      key={idx}
                      onClick={() => copyToClipboard(kw.keyword, `kw-${idx}`, kw.keyword)}
                      className="p-3 rounded-xl bg-background border border-border hover:border-primary/40 flex items-center justify-between cursor-pointer transition-all hover:bg-muted/40"
                    >
                      <div className="space-y-0.5">
                        <p className="font-bold text-xs text-foreground flex items-center gap-1.5">
                          <span>{kw.keyword}</span>
                          {kw.type === "phrase" && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/10 text-purple-600 font-bold">
                              2-Gram
                            </span>
                          )}
                          {kw.type === "longtail" && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-600 font-bold">
                              3-Gram
                            </span>
                          )}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {kw.count} rakip başlığında geçiyor
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-extrabold text-primary">%{kw.percentage}</span>
                        <div className="w-12 bg-muted rounded-full h-1 mt-1 overflow-hidden">
                          <div className="bg-primary h-full rounded-full" style={{ width: `${kw.percentage}%` }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sağ: Arama Motoru Tamamlama ve Long-Tail Önerileri (4 Kolon) */}
              <div className="lg:col-span-4 bg-card rounded-3xl border border-border p-6 shadow-sm space-y-4">
                <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
                  <Search className="w-4 h-4 text-primary" />
                  Trendyol & Google Canlı Arama Önerileri
                </h3>
                <p className="text-xs text-muted-foreground">
                  Müşterilerin Trendyol arama çubuğuna yazarken en çok tamamladığı aramalar.
                </p>

                <div className="space-y-2">
                  {scrapeResult.suggestions.length > 0 ? (
                    scrapeResult.suggestions.map((sug, idx) => (
                      <div
                        key={idx}
                        onClick={() => copyToClipboard(sug, `sug-${idx}`, sug)}
                        className="p-2.5 rounded-xl bg-background border border-border hover:border-primary/40 text-xs font-semibold text-foreground flex items-center justify-between cursor-pointer transition-colors"
                      >
                        <span>{sug}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground italic">Öneri bulunamadı.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* SEKME 4: FİYAT & PAZAR DAĞILIMI */}
          {activeTab === "pricing" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Fiyat Dağılım Aralıkları */}
              <div className="lg:col-span-7 bg-card rounded-3xl border border-border p-6 shadow-sm space-y-4">
                <h3 className="font-bold text-foreground text-base flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-500" />
                  Trendyol Pazar Fiyat Kümeleri
                </h3>
                <p className="text-xs text-muted-foreground">
                  Rakiplerin hangi fiyat bantlarında yoğunlaştığını gösterir.
                </p>

                <div className="space-y-4 pt-2">
                  {scrapeResult.stats.priceDistribution.map((dist, idx) => (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-foreground">{dist.range}</span>
                        <span className="text-muted-foreground">
                          {dist.count} Ürün (%{dist.percentage})
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full rounded-full transition-all duration-500"
                          style={{ width: `${dist.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-4 rounded-2xl bg-muted/50 border border-border text-xs space-y-1.5 mt-4">
                  <p className="font-bold text-foreground">💡 Fiyatlandırma Tavsiyesi:</p>
                  <p className="text-muted-foreground leading-relaxed">
                    Pazarın en yoğun olduğu küme incelenerek, 3D baskı maliyetiniz ve platform komisyonu hesaplanmalı; önerilen <strong>{scrapeResult.stats.recommendedPrice} TL</strong> seviyesi ile hızlı satış ve ilk değerlendirmeleri toplamak hedeflenmelidir.
                  </p>
                </div>
              </div>

              {/* Lider Markalar Dağılımı */}
              <div className="lg:col-span-5 bg-card rounded-3xl border border-border p-6 shadow-sm space-y-4">
                <h3 className="font-bold text-foreground text-base">Pazar Payı En Yüksek Markalar</h3>
                <p className="text-xs text-muted-foreground">
                  İlk sayfa arama sonuçlarını domine eden üretici ve satıcılar.
                </p>

                <div className="space-y-3 pt-2">
                  {scrapeResult.stats.topBrands.map((brand, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-background border border-border flex items-center justify-between"
                    >
                      <span className="text-xs font-bold text-foreground">
                        {idx + 1}. {brand.name}
                      </span>
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary">
                        {brand.count} Ürün
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* SEKME 5: FIRSAT & RAKİP ZAYIFLIK RAPORU (GAP ANALYSIS) */}
          {activeTab === "gap_analysis" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Rakiplerin Zayıf Noktaları */}
              <div className="bg-card rounded-3xl border border-red-500/20 p-6 shadow-sm space-y-4 bg-red-500/5">
                <h3 className="font-bold text-red-600 dark:text-red-400 text-base flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Rakiplerin Eksik ve Zayıf Yönleri
                </h3>
                <p className="text-xs text-muted-foreground">
                  Trendyol müşterilerinin diğer ürünlerde karşılaştığı eksiklikler ve şikayetler:
                </p>

                <div className="space-y-2.5">
                  {seoResult.competitorGapAnalysis.competitorWeaknesses.map((weakness, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-background border border-border text-xs flex items-start gap-2.5 text-foreground">
                      <span className="text-red-500 font-bold shrink-0">✕</span>
                      <span>{weakness}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bizim 3D Ürünümüzün Üstün Avantajları */}
              <div className="bg-card rounded-3xl border border-emerald-500/20 p-6 shadow-sm space-y-4 bg-emerald-500/5">
                <h3 className="font-bold text-emerald-600 dark:text-emerald-400 text-base flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  3D Üretimimizin Sunduğu Eşsiz Avantajlar
                </h3>
                <p className="text-xs text-muted-foreground">
                  Açıklamada ve görsellerde özellikle öne çıkarılması gereken güçlü yönlerimiz:
                </p>

                <div className="space-y-2.5">
                  {seoResult.competitorGapAnalysis.yourUniqueAdvantages.map((adv, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-background border border-border text-xs flex items-start gap-2.5 text-foreground">
                      <span className="text-emerald-500 font-bold shrink-0">✓</span>
                      <span>{adv}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Stratejik Odaklanılacak Long-tail Terimler */}
              <div className="md:col-span-2 bg-card rounded-3xl border border-border p-6 shadow-sm space-y-3">
                <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-500" />
                  Rekabette Kolayca 1. Sıraya Geçiren Odak Kelimeler
                </h3>
                <div className="flex flex-wrap gap-2">
                  {seoResult.competitorGapAnalysis.suggestedFocusKeywords.map((fk, idx) => (
                    <span
                      key={idx}
                      onClick={() => copyToClipboard(fk, `fk-${idx}`, fk)}
                      className="px-3.5 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 font-bold text-xs cursor-pointer hover:bg-purple-500/20 transition-colors"
                    >
                      🎯 {fk}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
