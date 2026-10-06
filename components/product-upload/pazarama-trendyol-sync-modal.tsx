"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  PlusCircle,
  ArrowRight,
  Sparkles,
  Layers,
  XCircle,
  Tag,
  Boxes,
  Info,
  ChevronDown,
  ChevronUp,
  Search,
} from "lucide-react";
import type { SyncAnalysisResponse } from "@/app/api/pazarama/sync-trendyol/route";

interface PazaramaTrendyolSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function PazaramaTrendyolSyncModal({
  isOpen,
  onClose,
  onSuccess,
}: PazaramaTrendyolSyncModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [analysis, setAnalysis] = useState<SyncAnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [syncChoice, setSyncChoice] = useState<"add_missing" | "skip_missing">("add_missing");
  const [showCommonProducts, setShowCommonProducts] = useState(false);
  const [commonSearch, setCommonSearch] = useState("");
  const [syncResult, setSyncResult] = useState<{
    success: boolean;
    deletedCount: number;
    addedCount: number;
    updatedCount: number;
    stepsCompleted: string[];
    message: string;
  } | null>(null);

  // Analiz verisini çek
  const fetchAnalysis = async () => {
    setLoading(true);
    setError(null);
    setSyncResult(null);
    try {
      const res = await fetch("/api/pazarama/sync-trendyol");
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Katalog analizi yapılamadı.");
      }
      setAnalysis(data);
    } catch (err: any) {
      setError(err.message || "Analiz sırasında bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAnalysis();
    } else {
      setAnalysis(null);
      setError(null);
      setSyncResult(null);
      setSyncing(false);
    }
  }, [isOpen]);

  // Eşitlemeyi Başlat
  const handleExecuteSync = async () => {
    setSyncing(true);
    setError(null);
    try {
      const res = await fetch("/api/pazarama/sync-trendyol", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          addMissing: syncChoice === "add_missing",
          deleteExtra: true,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Eşitleme gerçekleştirilemedi.");
      }

      setSyncResult(data);
      toast({
        title: "Eşitleme Başarıyla Tamamlandı! 🎉",
        description: `${data.deletedCount} fazla silindi, ${data.addedCount} eksik eklendi, ${data.updatedCount} eşitlendi.`,
      });
    } catch (err: any) {
      setError(err.message || "Eşitleme işlemi başarısız oldu.");
      toast({
        title: "Hata Oluştu",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleFinish = () => {
    onClose();
    onSuccess();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !syncing && !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 border border-border rounded-2xl">
        {/* MODAL BAŞLIĞI */}
        <div className="bg-linear-to-r from-orange-500/10 via-amber-500/5 to-blue-500/10 p-6 border-b border-border">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center font-black shadow-sm">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold flex items-center gap-2 text-foreground">
                  Trendyol Bazlı Katalog & Stok Eşitleme
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Trendyol'u ana referans (Single Source of Truth) alarak Pazarama kataloğundaki ürünleri, fiyatları ve stokları eşitler.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="p-6 space-y-6">
          {/* YÜKLENİYOR DURUMU */}
          {loading && (
            <div className="py-16 text-center space-y-4">
              <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <div className="space-y-1">
                <h4 className="font-bold text-base text-foreground">Kataloglar Karşılaştırılıyor...</h4>
                <p className="text-xs text-muted-foreground">
                  Trendyol aktif ürünleri ile Pazarama listesi barkod bazında inceleniyor.
                </p>
              </div>
            </div>
          )}

          {/* HATA DURUMU */}
          {error && !loading && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm">
                <XCircle className="w-4 h-4" />
                Bir Hata Oluştu
              </div>
              <p className="text-xs">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchAnalysis}
                className="mt-2 text-xs h-8 border-red-500/30 hover:bg-red-500/10"
              >
                Tekrar Dene
              </Button>
            </div>
          )}

          {/* BAŞARI RAPORU EKRANI */}
          {syncResult && !loading && (
            <div className="space-y-6 py-2">
              <div className="text-center space-y-2">
                <div className="w-14 h-14 bg-emerald-500/10 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-foreground">Eşitleme Başarıyla Tamamlandı!</h3>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  {syncResult.message}
                </p>
              </div>

              {/* Tamamlanan Adımlar */}
              <div className="bg-muted/40 rounded-xl p-4 border border-border space-y-2.5">
                <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Gerçekleştirilen Adımlar
                </h5>
                <div className="space-y-2">
                  {syncResult.stepsCompleted.map((step, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-foreground font-medium">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  type="button"
                  onClick={handleFinish}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-10 px-6 gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Tamamla ve Listeyi Yenile
                </Button>
              </div>
            </div>
          )}

          {/* ANALİZ SONUCU VE ONAY FORMU */}
          {analysis && !loading && !syncResult && (
            <div className="space-y-6">
              {/* ÜST İSTATİSTİK KARTLARI */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                <div className="bg-orange-500/5 border border-orange-500/20 rounded-xl p-3 text-center">
                  <span className="text-[10px] font-bold text-orange-600 uppercase tracking-wider block">
                    Trendyol (Base)
                  </span>
                  <span className="text-xl font-black text-orange-600 mt-0.5 block">
                    {analysis.trendyolTotal}
                  </span>
                  <span className="text-[10px] text-muted-foreground">Aktif Ürün</span>
                </div>

                <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-3 text-center">
                  <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">
                    Pazarama
                  </span>
                  <span className="text-xl font-black text-blue-600 mt-0.5 block">
                    {analysis.pazaramaTotal}
                  </span>
                  <span className="text-[10px] text-muted-foreground">Kayıtlı Ürün</span>
                </div>

                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3 text-center">
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">
                    Eşitlenecek
                  </span>
                  <span className="text-xl font-black text-emerald-600 mt-0.5 block">
                    {analysis.commonCount}
                  </span>
                  <span className="text-[10px] text-muted-foreground">Ortak Ürün</span>
                </div>

                <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 text-center">
                  <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block">
                    Onay Sürecinde
                  </span>
                  <span className="text-xl font-black text-amber-600 mt-0.5 block">
                    {analysis.underReviewCount || 0}
                  </span>
                  <span className="text-[10px] text-muted-foreground">Bekleyen Ürün</span>
                </div>

                <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-3 text-center col-span-2 sm:col-span-1">
                  <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider block">
                    Silinecek
                  </span>
                  <span className="text-xl font-black text-red-600 mt-0.5 block">
                    {analysis.extraCount}
                  </span>
                  <span className="text-[10px] text-muted-foreground">Fazla Ürün</span>
                </div>
              </div>

              {/* ONAY SÜRECİNDEKİ ÜRÜNLER UYARI VE BİLGİ KUTUSU */}
              {analysis.underReviewCount > 0 && (
                <div className="space-y-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-600 flex items-center justify-center shrink-0 mt-0.5 font-bold">
                      ⏳
                    </div>
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-xs font-bold text-foreground">
                          Pazarama Onay Sürecindeki Ürünler ({analysis.underReviewCount} Adet)
                        </h4>
                        <span className="bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[10px] px-2 py-0.5 rounded-full font-semibold">
                          Onay Sürecinde - İstek Gönderilmez / Hata Üretilmez
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Bu ürünler Pazarama katalog kontrolü ve onay havuzundadır. Sistem bu ürünlere istek atmayarak korumaya almıştır, hata verilmez. Pazarama onayı tamamlanana kadar beklenir.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {analysis.underReviewProducts?.map((p) => (
                      <div
                        key={p.barcode}
                        className="flex items-center gap-2.5 bg-card/80 border border-amber-500/20 rounded-lg p-2.5 text-xs"
                      >
                        {p.imageUrl ? (
                          <img
                            src={p.imageUrl}
                            alt={p.title}
                            className="w-11 h-11 object-cover rounded-md border border-border shrink-0"
                          />
                        ) : (
                          <div className="w-11 h-11 bg-muted rounded-md flex items-center justify-center text-[9px] text-muted-foreground shrink-0">
                            Foto Yok
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-foreground truncate text-[11px]">{p.title}</p>
                          <p className="text-[10px] text-muted-foreground">Barkod: {p.barcode}</p>
                          <span className="inline-flex items-center gap-1 mt-0.5 text-[9px] bg-amber-500/15 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded font-medium">
                            ⏳ {p.reason || "Pazarama Onay Sürecinde"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 4 EŞİTLENECEK ALAN BİLGİLENDİRMESİ VE İNTERAKTİF ÜRÜN LİSTESİ */}
              <div className="bg-muted/30 border border-border rounded-xl p-4 text-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-foreground">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>Var Olan Ürünlerde Eşitlenen 4 Temel Bilgi ({analysis.commonCount} Ürün):</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCommonProducts(!showCommonProducts)}
                    className="flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    {showCommonProducts ? (
                      <>
                        <ChevronUp className="w-3.5 h-3.5" />
                        Listeyi Kapat
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-3.5 h-3.5" />
                        {analysis.commonCount} Ürünü İncele
                      </>
                    )}
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-muted-foreground">
                  <div className="flex items-center gap-1.5 bg-card px-2.5 py-1.5 rounded-lg border border-border">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span className="font-semibold text-foreground">1. Başlık</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-card px-2.5 py-1.5 rounded-lg border border-border">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span className="font-semibold text-foreground">2. Açıklama</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-card px-2.5 py-1.5 rounded-lg border border-border">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span className="font-semibold text-foreground">3. İndirimsiz Fiyat</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-card px-2.5 py-1.5 rounded-lg border border-border">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span className="font-semibold text-foreground">4. Stok</span>
                  </div>
                </div>

                {showCommonProducts && (
                  <div className="pt-2 border-t border-border space-y-2">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Var olan ürünlerde ara (başlık, barkod, stok kodu)..."
                        value={commonSearch}
                        onChange={(e) => setCommonSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 bg-card border border-border rounded-lg text-xs placeholder:text-muted-foreground/60 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                      {analysis.commonProducts
                        ?.filter(
                          (p) =>
                            !commonSearch ||
                            p.title.toLowerCase().includes(commonSearch.toLowerCase()) ||
                            p.barcode.includes(commonSearch) ||
                            (p.stockCode && p.stockCode.toLowerCase().includes(commonSearch.toLowerCase()))
                        )
                        .map((p) => (
                          <div
                            key={p.barcode}
                            className="flex items-center gap-3 bg-card border border-border rounded-lg p-2 text-xs"
                          >
                            {p.imageUrl ? (
                              <img
                                src={p.imageUrl}
                                alt={p.title}
                                className="w-10 h-10 object-cover rounded-md border border-border shrink-0"
                              />
                            ) : (
                              <div className="w-10 h-10 bg-muted rounded-md flex items-center justify-center text-[9px] text-muted-foreground shrink-0">
                                Foto Yok
                              </div>
                            )}
                            <div className="min-w-0 flex-1 space-y-0.5">
                              <p className="font-semibold text-foreground truncate text-[11px]">{p.title}</p>
                              <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                                <span>Barkod: {p.barcode}</span>
                                <span>•</span>
                                <span className="text-emerald-600 font-semibold">{p.salePrice} TL (Liste: {p.listPrice} TL)</span>
                                <span>•</span>
                                <span className="text-blue-600 font-semibold">{p.quantity} Stok</span>
                              </div>
                            </div>
                            <div className="shrink-0 flex items-center gap-1 bg-emerald-500/10 text-emerald-600 px-2 py-1 rounded-md text-[10px] font-bold">
                              <CheckCircle2 className="w-3 h-3" />
                              Eşitlendi
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>

              {/* EKSİK ÜRÜN UYARISI & LİSTESİ */}
              {analysis.missingCount > 0 ? (
                <div className="space-y-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4.5">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-foreground">
                        Dikkat: Trendyol&apos;daki {analysis.missingCount} Ürün Pazarama&apos;da Bulunmuyor!
                      </h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Pazarama&apos;daki fazla ürünler silindiğinde bu {analysis.missingCount} ürün eksik kalacak. 
                        Bu ürünlerin Trendyol&apos;daki başlık, açıklama, fiyat, stok ve görselleriyle Pazarama&apos;ya otomatik eklenmesini ister misiniz?
                      </p>
                    </div>
                  </div>

                  {/* Eksik Ürünlerin Kartları */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    {analysis.missingProducts.map((p) => (
                      <div
                        key={p.barcode}
                        className="flex items-center gap-3 bg-card border border-amber-500/20 rounded-xl p-2.5 shadow-2xs"
                      >
                        {p.imageUrl ? (
                          <img
                            src={p.imageUrl}
                            alt={p.title}
                            className="w-12 h-12 object-cover rounded-lg border border-border shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center text-muted-foreground shrink-0 text-[10px]">
                            Foto Yok
                          </div>
                        )}
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <p className="text-xs font-bold text-foreground line-clamp-1">
                            {p.title}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                            <span>Barkod: {p.barcode}</span>
                            <span>•</span>
                            <span className="font-semibold text-emerald-600">{p.salePrice} TL</span>
                            <span>•</span>
                            <span className="font-semibold text-blue-600">{p.quantity} Stok</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* KULLANICI KARAR SEÇENEKLERİ */}
                  <div className="space-y-2 pt-2 border-t border-amber-500/20">
                    <label
                      onClick={() => setSyncChoice("add_missing")}
                      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        syncChoice === "add_missing"
                          ? "bg-amber-500/10 border-amber-500 shadow-2xs"
                          : "bg-card border-border hover:bg-muted/50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="sync_choice"
                        checked={syncChoice === "add_missing"}
                        onChange={() => setSyncChoice("add_missing")}
                        className="mt-1 text-amber-600 focus:ring-amber-500"
                      />
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <PlusCircle className="w-3.5 h-3.5 text-emerald-600" />
                          Fazlaları Sil + Eksikleri Pazarama&apos;ya Ekle + Ortakları Eşitle (Önerilen)
                        </span>
                        <p className="text-[11px] text-muted-foreground">
                          Önce {analysis.extraCount} fazla ürün silinir. Ardından eksik {analysis.missingCount} ürün Pazarama&apos;ya eklenir ve ortak {analysis.commonCount} ürün eşitlenir. Pazarama tam 39 ürüne dengelenir.
                        </p>
                      </div>
                    </label>

                    <label
                      onClick={() => setSyncChoice("skip_missing")}
                      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        syncChoice === "skip_missing"
                          ? "bg-amber-500/10 border-amber-500 shadow-2xs"
                          : "bg-card border-border hover:bg-muted/50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="sync_choice"
                        checked={syncChoice === "skip_missing"}
                        onChange={() => setSyncChoice("skip_missing")}
                        className="mt-1 text-amber-600 focus:ring-amber-500"
                      />
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <Trash2 className="w-3.5 h-3.5 text-red-600" />
                          Sadece Fazlaları Sil ve Mevcutları Eşitle (Eksikler Eklenmesin)
                        </span>
                        <p className="text-[11px] text-muted-foreground">
                          Eksik ürünler eklenmez. Yalnızca {analysis.extraCount} fazla ürün silinir ve mevcut {analysis.commonCount} ürün eşitlenir. Pazarama&apos;da {analysis.commonCount} ürün kalır.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              ) : (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div className="text-xs text-emerald-950 dark:text-emerald-200">
                    <p className="font-bold">Eksik Ürün Bulunmuyor</p>
                    <p className="text-[11px] opacity-80">
                      Trendyol&apos;daki tüm aktif ürünler Pazarama ile eşleşiyor. {analysis.extraCount} fazla ürün silinecek ve {analysis.commonCount} ürün güncellenecektir.
                    </p>
                  </div>
                </div>
              )}

              {/* AKSİYON BUTONLARI */}
              <div className="flex items-center justify-between pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onClose}
                  disabled={syncing}
                  className="text-xs"
                >
                  Vazgeç
                </Button>

                <Button
                  type="button"
                  onClick={handleExecuteSync}
                  disabled={syncing}
                  className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs h-10 px-5 gap-2 shadow-xs"
                >
                  {syncing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Eşitleme Yürütülüyor...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      {syncChoice === "add_missing"
                        ? "Fazlaları Sil & Eksikleri Ekleyerek Eşitle"
                        : "Fazlaları Sil & Mevcutları Eşitle"}
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
