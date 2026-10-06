"use client";

import { useState, useEffect } from "react";
import {
  X,
  Search,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  Tag,
  PackageCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

interface Props {
  initialTrackingId?: string;
  onClose: () => void;
}

export function HepsiburadaTrackingModal({ initialTrackingId = "", onClose }: Props) {
  const { toast } = useToast();
  const [trackingId, setTrackingId] = useState(initialTrackingId);
  const [loading, setLoading] = useState(false);
  const [statusData, setStatusData] = useState<any>(null);

  const fetchStatus = async (id: string) => {
    if (!id.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/hepsiburada/tracking?id=${encodeURIComponent(id.trim())}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Takip durumu sorgulanamadı");
      setStatusData(data);
    } catch (err: any) {
      toast({ title: "Sorgu Hatası", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialTrackingId) {
      fetchStatus(initialTrackingId);
    }
  }, [initialTrackingId]);

  const items = Array.isArray(statusData?.data) ? statusData.data : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-card border border-border rounded-2xl w-full max-w-2xl shadow-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150">
        {/* Modal Başlığı */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/20">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl">
              <PackageCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Hepsiburada Katalog Gönderim Takibi</h3>
              <p className="text-xs text-muted-foreground">
                Katalog import işlemlerinin durumunu ve onay süreçlerini canlı sorgulayın.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Arama / Sorgulama Çubuğu */}
        <div className="p-6 border-b border-border bg-muted/10 space-y-3">
          <label className="text-xs font-semibold text-muted-foreground block">
            Hepsiburada Tracking ID (Gönderim Takip Kodu)
          </label>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={trackingId}
                onChange={(e) => setTrackingId(e.target.value)}
                placeholder="Örn: 26683f84-b2be-4018-9adf-d56ae0ff235a"
                className="pl-9 h-9 text-xs rounded-xl font-mono bg-background"
              />
            </div>
            <Button
              onClick={() => fetchStatus(trackingId)}
              disabled={loading || !trackingId.trim()}
              size="sm"
              className="h-9 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl px-4 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
              {loading ? "Sorgulanıyor..." : "Sorgula"}
            </Button>
          </div>
        </div>

        {/* Sonuç Alanı */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 rounded-xl bg-muted/40 animate-pulse" />
              ))}
            </div>
          ) : !statusData ? (
            <div className="text-center py-8 text-muted-foreground">
              Yukarıya bir Tracking ID girerek durum sorgulayabilirsiniz.
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Bu Tracking ID ile ilgili detay bulunamadı veya henüz işleniyor.
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item: any, idx: number) => {
                const isSuccess = item.importStatus === "SUCCESS";
                return (
                  <div
                    key={idx}
                    className="border border-border rounded-xl p-4 bg-muted/20 space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-bold text-xs text-foreground font-mono flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-amber-600" />
                        <span>SKU: {item.merchantSku || "Yok"}</span>
                      </div>

                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          isSuccess
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-200"
                            : "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400 border-red-200"
                        }`}
                      >
                        {isSuccess ? (
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        ) : (
                          <XCircle className="w-3 h-3 text-red-500" />
                        )}
                        {item.importStatus || "DURUM YOK"}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] bg-background p-3 rounded-lg border border-border/60">
                      <div>
                        <span className="text-muted-foreground">Ürün Adı: </span>
                        <span className="font-semibold text-foreground">{item.productName || "-"}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Barkod: </span>
                        <span className="font-mono text-foreground">{item.barcode || "-"}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Ürün Durumu: </span>
                        <span className="font-bold text-amber-600">{item.productStatus || "-"}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Kategori ID: </span>
                        <span className="font-mono text-foreground">{item.categoryId || "-"}</span>
                      </div>
                    </div>

                    {item.rejectReasonsMessages && item.rejectReasonsMessages.length > 0 && (
                      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-2.5 text-red-700 dark:text-red-300 text-[11px] space-y-1">
                        <div className="font-bold flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Hata / Red Nedenleri:
                        </div>
                        {item.rejectReasonsMessages.map((msg: string, mIdx: number) => (
                          <div key={mIdx}>• {msg}</div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Alt Butonlar */}
        <div className="px-6 py-3 border-t border-border flex items-center justify-between bg-muted/10">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="text-xs"
          >
            <a
              href="https://merchant-sit.hepsiburada.com/v2/login?returnUrl=%2Fv2"
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
              SIT Portalına Git
            </a>
          </Button>

          <Button
            type="button"
            onClick={onClose}
            size="sm"
            className="text-xs font-bold rounded-xl"
          >
            Kapat
          </Button>
        </div>
      </div>
    </div>
  );
}
