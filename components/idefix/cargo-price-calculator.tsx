"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Truck, Package, ShieldCheck } from "lucide-react";
import {
  IDEFIX_CARGO_COMPANIES,
  calcIdefixShippingCost,
  IDEFIX_DESI_TABLE,
  getIdefixCargoExVat,
  KDV_RATE,
} from "@/lib/idefix-cargo";

export function CargoPriceCalculator() {
  const [orderAmount, setOrderAmount] = useState<string>("120");
  const [width, setWidth] = useState<string>("25");
  const [height, setHeight] = useState<string>("20");
  const [depth, setDepth] = useState<string>("15");
  const [weightKg, setWeightKg] = useState<string>("1");
  const [selectedCompany, setSelectedCompany] = useState<string>("auto");

  const desi = useMemo(() => {
    const w = parseFloat(width) || 0;
    const h = parseFloat(height) || 0;
    const d = parseFloat(depth) || 0;
    if (w <= 0 || h <= 0 || d <= 0) return 1;
    return Math.max(1, Math.ceil((w * h * d) / 3000));
  }, [width, height, depth]);

  const effectiveDesi = useMemo(() => {
    const wt = parseFloat(weightKg) || 0;
    return Math.max(0, desi, Math.ceil(wt));
  }, [desi, weightKg]);

  const amount = parseFloat(orderAmount) || 0;

  const cost = useMemo(() => {
    return calcIdefixShippingCost(effectiveDesi * 1000, amount, true, selectedCompany);
  }, [effectiveDesi, amount, selectedCompany]);

  const supportAmount = amount < 150 ? 50 : amount < 300 ? 20 : 0;
  const isBarem = amount < 300;

  return (
    <div className="space-y-6">
      {/* 1. Hesaplayıcı Kartı */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Truck className="w-5 h-5 text-red-500" />
            İdefix Anlaşmalı Kargo ve Barem Hesaplayıcı
          </CardTitle>
          <CardDescription>
            11/09/2026 Tarihli güncel fiyat listesi ve 50 TL / 20 TL barem desteği hesaplaması
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs font-semibold">Sipariş Satış Fiyatı (TL)</Label>
              <Input
                type="number"
                value={orderAmount}
                onChange={(e) => setOrderAmount(e.target.value)}
                placeholder="Örn: 120"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Kargo Firması</Label>
              <select
                value={selectedCompany}
                onChange={(e) => setSelectedCompany(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {IDEFIX_CARGO_COMPANIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs font-semibold">Ağırlık (kg)</Label>
              <Input
                type="number"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                placeholder="Örn: 1"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">En (cm)</Label>
              <Input
                type="number"
                value={width}
                onChange={(e) => setWidth(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Boy (cm)</Label>
              <Input
                type="number"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Yükseklik (cm)</Label>
              <Input
                type="number"
                value={depth}
                onChange={(e) => setDepth(e.target.value)}
              />
            </div>
          </div>

          {/* Sonuç Kartı */}
          <div className="p-4 rounded-xl border bg-card/60 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant={isBarem ? "default" : "secondary"}>
                  {isBarem
                    ? `🟢 ${supportAmount} TL Barem Desteği Uygulandı`
                    : "📦 Standart Desi Tarifesi"}
                </Badge>
                <span className="text-xs text-muted-foreground">Hesaplanan: {effectiveDesi} Desi</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {amount < 150
                  ? "Sipariş 150 TL altında olduğu için İdefix 50 TL barem desteği sağlar (Kaç desi olduğu önemsiz sabit barem fiyatı)."
                  : amount < 300
                  ? "Sipariş 150 - 300 TL arasında olduğu için İdefix 20 TL barem desteği sağlar (Kaç desi olduğu önemsiz sabit barem fiyatı)."
                  : `Sipariş 300 TL üzerinde olduğu için barem dışıdır ve ürünün ${effectiveDesi} desi tarifesi uygulanır.`}
              </p>
            </div>
            <div className="text-right shrink-0">
              <div className="text-xs text-muted-foreground">Ödenecek Net Kargo (KDV Dahil)</div>
              <div className="text-2xl font-black text-red-600 dark:text-red-400">
                ₺{cost.toFixed(2)}
              </div>
              <div className="text-[11px] text-muted-foreground">
                KDV Hariç: ₺{(cost / (1 + KDV_RATE)).toFixed(2)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Barem Destek Tablosu */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-500" />
            İdefix Şartlı Kargo Barem Destek Tablosu (300 TL Altı, KDV Hariç)
          </CardTitle>
          <CardDescription>
            150 TL altına 50 TL, 150-300 TL arasına 20 TL barem desteği ve net kargo maliyetleri
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b bg-muted/50 font-semibold">
                  <th className="py-2.5 px-3">Sipariş Tutarı</th>
                  <th className="py-2.5 px-3">İdefix Desteği</th>
                  <th className="py-2.5 px-3">HepsiJET Net (KDV Dahil)</th>
                  <th className="py-2.5 px-3">PTT Net (KDV Dahil)</th>
                  <th className="py-2.5 px-3">Aras Net (KDV Dahil)</th>
                  <th className="py-2.5 px-3">Desi Kısıtlaması</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b hover:bg-muted/30">
                  <td className="py-2.5 px-3 font-semibold text-emerald-600">0 – 149,99 TL</td>
                  <td className="py-2.5 px-3 font-bold text-emerald-600">50,00 TL Destek</td>
                  <td className="py-2.5 px-3 font-bold text-foreground">₺53,60</td>
                  <td className="py-2.5 px-3">₺60,00</td>
                  <td className="py-2.5 px-3">₺62,33</td>
                  <td className="py-2.5 px-3">Desi sınırı yok (Sabit Barem)</td>
                </tr>
                <tr className="border-b hover:bg-muted/30">
                  <td className="py-2.5 px-3 font-semibold text-blue-600">150 – 299,99 TL</td>
                  <td className="py-2.5 px-3 font-bold text-blue-600">20,00 TL Destek</td>
                  <td className="py-2.5 px-3 font-bold text-foreground">₺83,60</td>
                  <td className="py-2.5 px-3">₺90,00</td>
                  <td className="py-2.5 px-3">₺92,33</td>
                  <td className="py-2.5 px-3">Desi sınırı yok (Sabit Barem)</td>
                </tr>
                <tr className="border-b hover:bg-muted/30">
                  <td className="py-2.5 px-3 font-semibold text-muted-foreground">300 TL ve Üzeri</td>
                  <td className="py-2.5 px-3">Destek Yok (Barem Dışı)</td>
                  <td className="py-2.5 px-3">Desi tarifesi</td>
                  <td className="py-2.5 px-3">Desi tarifesi</td>
                  <td className="py-2.5 px-3">Desi tarifesi</td>
                  <td className="py-2.5 px-3">Gönderi desisine göre</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 3. Standart Desi Tablosu */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="w-5 h-5 text-red-500" />
            İdefix Özel Anlaşmalı Kargo Fiyat Listesi (1 - 10 Desi, KDV Hariç)
          </CardTitle>
          <CardDescription>
            300 TL ve üzeri siparişler için geçerli standart desi bazlı fiyat tarifesi (Posta hizmet bedeli %2.35 dahil, KDV hariç)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b bg-muted/50 font-semibold">
                  <th className="py-2.5 px-3">Desi</th>
                  <th className="py-2.5 px-3">HepsiJET</th>
                  <th className="py-2.5 px-3">PTT Kargo</th>
                  <th className="py-2.5 px-3">Aras Kargo</th>
                  <th className="py-2.5 px-3">Sürat Kargo</th>
                  <th className="py-2.5 px-3">DHL eCommerce</th>
                  <th className="py-2.5 px-3">Yurtiçi Kargo</th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(IDEFIX_DESI_TABLE).map((desiKey) => {
                  const d = Number(desiKey);
                  const row = IDEFIX_DESI_TABLE[d];
                  return (
                    <tr key={d} className="border-b hover:bg-muted/30">
                      <td className="py-2 px-3 font-bold">{d} Desi</td>
                      <td className="py-2 px-3 font-semibold text-emerald-600">{row.Hepsijet.toFixed(2)} TL</td>
                      <td className="py-2 px-3 font-semibold text-blue-600">{row.PTT.toFixed(2)} TL</td>
                      <td className="py-2 px-3">{row.Aras.toFixed(2)} TL</td>
                      <td className="py-2 px-3">{row.Surat.toFixed(2)} TL</td>
                      <td className="py-2 px-3">{row.DHL.toFixed(2)} TL</td>
                      <td className="py-2 px-3">{row.Yurtici.toFixed(2)} TL</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
