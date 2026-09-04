"use client";

import { useState } from "react";
import { X, ShieldCheck, Send, CheckCircle2, AlertCircle, RefreshCw, KeyRound, Smartphone, FileText } from "lucide-react";
import { formatCurrency, cleanProductName } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";

interface OrderItem {
  product_name: string;
  quantity: number;
  price: number;
}

interface GibEarsivModalProps {
  orders: any[];
  onClose: () => void;
  onSuccess: () => void;
}

export function GibEarsivModal({ orders, onClose, onSuccess }: GibEarsivModalProps) {
  const [step, setStep] = useState<"login" | "sms" | "processing" | "success">("login");
  const [username, setUsername] = useState("12911762");
  const [password, setPassword] = useState("973973");
  const [smsCode, setSmsCode] = useState("");
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: orders.length, currentOrder: "" });
  const [results, setResults] = useState<{ successCount: number; failCount: number; errors: string[] }>({
    successCount: 0,
    failCount: 0,
    errors: [],
  });
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/gib-earsiv/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.token) {
        throw new Error(data.error || "GİB Giriş başarısız. Kullanıcı kodu ve şifrenizi kontrol edin.");
      }

      setToken(data.token);

      if (data.requiresSms) {
        setStep("sms");
        toast({ title: "SMS Gönderildi", description: "Lütfen telefonunuza gelen onay kodunu girin." });
      } else {
        // Doğrudan faturaları kesmeye başla
        startInvoiceCreation(data.token);
      }
    } catch (err) {
      toast({
        title: "Giriş Hatası",
        description: err instanceof Error ? err.message : "GİB portalına bağlanılamadı",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySms = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/gib-earsiv/verify-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, smsCode }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "SMS Kodu geçersiz");

      startInvoiceCreation(token);
    } catch (err) {
      toast({
        title: "Doğrulama Hatası",
        description: err instanceof Error ? err.message : "SMS Kodu doğrulanamadı",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const startInvoiceCreation = async (authToken: string) => {
    setStep("processing");
    setLoading(true);
    let success = 0;
    let fail = 0;
    const errorsList: string[] = [];

    const sb = createClient();

    for (let i = 0; i < orders.length; i++) {
      const ord = orders[i];
      setProgress({
        current: i + 1,
        total: orders.length,
        currentOrder: ord.order_number,
      });

      try {
        const res = await fetch("/api/gib-earsiv/create-invoices", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token: authToken,
            order: ord,
          }),
        });

        const data = await res.json();

        if (res.ok && data.success) {
          success++;
          // DB'de Invoiced olarak işaretle
          await sb
            .from("trendyol_orders")
            .update({
              invoice_status: "Invoiced",
              invoiced: true,
              invoiced_at: new Date().toISOString(),
            })
            .eq("id", ord.id);
        } else {
          fail++;
          errorsList.push(`#${ord.order_number}: ${data.error || "Hata oluştu"}`);
        }
      } catch (err) {
        fail++;
        errorsList.push(`#${ord.order_number}: ${err instanceof Error ? err.message : "Bağlantı hatası"}`);
      }
    }

    setResults({
      successCount: success,
      failCount: fail,
      errors: errorsList,
    });
    setStep("success");
    setLoading(false);
  };

  const handleLaunchLiveBrowser = async () => {
    setLoading(true);
    setStep("processing");

    try {
      const res = await fetch("/api/gib-earsiv/launch-browser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          password,
          orders,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || "Canlı tarayıcı başlatılamadı");
      }

      // DB'de Invoiced olarak işaretle
      const sb = createClient();
      for (const ord of orders) {
        await sb
          .from("trendyol_orders")
          .update({
            invoice_status: "Invoiced",
            invoiced: true,
            invoiced_at: new Date().toISOString(),
          })
          .eq("id", ord.id);
      }

      setResults({
        successCount: data.successCount || orders.length,
        failCount: data.failCount || 0,
        errors: data.errors || [],
      });
      setStep("success");
    } catch (err) {
      toast({
        title: "Canlı Tarayıcı Hatası",
        description: err instanceof Error ? err.message : "Hata oluştu",
        variant: "destructive",
      });
      setStep("login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-card rounded-3xl border border-border shadow-2xl max-w-xl w-full p-6 sm:p-8 relative flex flex-col">
        {/* Kapat Butonu */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-muted-foreground hover:bg-muted transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-600 to-rose-700 flex items-center justify-center shadow-lg shadow-red-500/20 shrink-0">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">GİB e-Arşiv Portal Otomasyonu</h2>
            <p className="text-xs text-muted-foreground">
              Resmi ücretsiz e-Arşiv sistemine otomatik fatura taslakları oluşturur
            </p>
          </div>
        </div>

        {/* 1. ADIM: GİB Giriş ve Mod Seçimi */}
        {step === "login" && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="p-4 rounded-2xl bg-muted/50 border border-border">
              <p className="text-xs font-medium text-muted-foreground mb-1">Faturalandırılacak Sipariş Sayısı:</p>
              <p className="text-2xl font-bold text-foreground">
                {orders.length} <span className="text-sm font-normal text-muted-foreground">adet teslim edilmiş sipariş</span>
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  İnteraktif Vergi Dairesi / GİB Kullanıcı Kodu
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    placeholder="12911762"
                    className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  GİB Şifre / Parola
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••"
                    className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 space-y-2.5">
              {/* Canlı Tarayıcı Açma Butonu */}
              <button
                type="button"
                onClick={handleLaunchLiveBrowser}
                disabled={loading || orders.length === 0}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white font-bold text-sm hover:opacity-95 transition-all shadow-md shadow-blue-500/20 disabled:opacity-50 flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99]"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Canlı Tarayıcı Açılıyor...
                  </>
                ) : (
                  <>
                    <span className="text-base">🌐</span>
                    Canlı Tarayıcı Aç (Ekranda Sırayla Doldursun)
                  </>
                )}
              </button>

              {/* Arka Planda Hızlı Gönder Butonu */}
              <button
                type="submit"
                disabled={loading || orders.length === 0}
                className="w-full py-3 rounded-xl bg-muted hover:bg-muted/80 text-foreground font-semibold text-xs transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Send className="w-3.5 h-3.5" />
                Arka Planda Sessizce Gönder ({orders.length} Adet)
              </button>
            </div>
          </form>
        )}

        {/* 2. ADIM: SMS Doğrulama */}
        {step === "sms" && (
          <form onSubmit={handleVerifySms} className="space-y-4">
            <div className="p-5 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-center">
              <Smartphone className="w-10 h-10 text-blue-500 mx-auto mb-2" />
              <p className="font-semibold text-sm text-foreground">GİB SMS Onay Kodu</p>
              <p className="text-xs text-muted-foreground mt-1">
                GİB sistemine kayıtlı cep telefonunuza gönderilen 6 haneli kodu giriniz.
              </p>
            </div>

            <div>
              <input
                type="text"
                maxLength={6}
                value={smsCode}
                onChange={(e) => setSmsCode(e.target.value)}
                required
                placeholder="Örn: 123456"
                className="w-full text-center tracking-widest text-2xl font-bold py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading || smsCode.length < 4}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-sm hover:opacity-90 transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Onayla ve Faturaları Oluştur"}
            </button>
          </form>
        )}

        {/* 3. ADIM: İşlem İlerlemesi */}
        {step === "processing" && (
          <div className="py-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
              <RefreshCw className="w-8 h-8 text-red-500 animate-spin" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">Faturalar GİB e-Arşiv'e Aktarılıyor...</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Şu anda işleniyor: <strong className="text-foreground">#{progress.currentOrder}</strong>
              </p>
            </div>

            {/* İlerleme Çubuğu */}
            <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-red-500 to-rose-600 h-full transition-all duration-300"
                style={{ width: `${Math.round((progress.current / progress.total) * 100)}%` }}
              />
            </div>

            <p className="text-xs font-semibold text-muted-foreground">
              {progress.current} / {progress.total} Tamamlandı (%{Math.round((progress.current / progress.total) * 100)})
            </p>
          </div>
        )}

        {/* 4. ADIM: Sonuç */}
        {step === "success" && (
          <div className="py-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-9 h-9 text-emerald-500" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground">İşlem Tamamlandı!</h3>
              <p className="text-sm text-muted-foreground mt-1">
                ✅ <strong>{results.successCount}</strong> adet fatura başarıyla GİB e-Arşiv Taslaklar'a aktarıldı.
              </p>
              {results.failCount > 0 && (
                <p className="text-xs text-red-500 mt-1">
                  ⚠️ {results.failCount} adet siparişte hata oluştu.
                </p>
              )}
            </div>

            {results.errors.length > 0 && (
              <div className="p-3 bg-red-500/10 rounded-xl text-left max-h-32 overflow-y-auto text-xs text-red-600 dark:text-red-400">
                {results.errors.map((e, idx) => (
                  <p key={idx}>{e}</p>
                ))}
              </div>
            )}

            <button
              onClick={() => {
                onSuccess();
                onClose();
              }}
              className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition-all"
            >
              Tamamla ve Listeyi Yenile
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
