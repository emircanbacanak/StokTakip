"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Truck, Package, Calculator, CheckCircle2, ShieldCheck } from "lucide-react";
import {
  N11_CARGO_COMPANIES,
  calcN11ShippingCost,
  N11_BAREM_TABLE,
  N11_DESI_TABLE,
  KDV_RATE,
} from "@/lib/n11-cargo";

export function CargoPriceCalculator() {
  const [orderAmount, setOrderAmount] = useState<string>("180");
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
    return Math.max(1, desi, Math.ceil(wt));
  }, [desi, weightKg]);

  const amount = parseFloat(orderAmount) || 0;

  const cost = useMemo(() => {
    return calcN11ShippingCost(effectiveDesi * 1000, amount, true, selectedCompany);
  }, [effectiveDesi, amount, selectedCompany]);

  const isBarem = amount < 300;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Truck className="w-5 h-5 text-orange-500" />
            n11 Anlaşmalı Kargo ve Barem Hesaplayıcı
          </CardTitle>
          <CardDescription>
            Sipariş tutarı ve desi değerine göre anlaşmalı kargo maliyetlerinizi hesaplayın.
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
                placeholder="Örn: 180"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Kargo Firması</Label>
              <select
                value={selectedCompany}
                onChange={(e) => setSelectedCompany(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {N11_CARGO_COMPANIES.map((c) => (
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
                  {isBarem ? "🟢 Şartlı Kargo (300 TL Altı Barem Destekli)" : "📦 Standart Desi Tarifesi"}
                </Badge>
                <span className="text-xs text-muted-foreground">Hesaplanan: {effectiveDesi} Desi</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {isBarem
                  ? "Sipariş 300 TL altında olduğu için barem desteği uygulanır (Kaç desi olduğu önemsiz sabit barem fiyatı)."
                  : "Sipariş 300 TL üzerinde olduğu için n11 desi tarifesi üzerinden faturalandırılır."}
              </p>
            </div>
            <div className="text-right shrink-0">
              <div className="text-xs text-muted-foreground">KDV Dahil Kargo Maliyeti</div>
              <div className="text-2xl font-black text-orange-600 dark:text-orange-400">
                ₺{cost.toFixed(2)}
              </div>
              <div className="text-[11px] text-muted-foreground">
                KDV Hariç: ₺{(cost / (1 + KDV_RATE)).toFixed(2)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Şartlı Kargo Barem Tablosu */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-500" />
            n11 Şartlı Kargo Barem Destek Tablosu (300 TL Altı, KDV Hariç)
          </CardTitle>
          <CardDescription>
            300 TL altı siparişlerde geçerli olan kargo firması bazlı sabit fiyatlar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b bg-muted/50 font-semibold">
                  <th className="py-2.5 px-3">Sepet Aralığı</th>
                  <th className="py-2.5 px-3">PTT Kargo</th>
                  <th className="py-2.5 px-3">Aras Kargo</th>
                  <th className="py-2.5 px-3">Sürat Kargo</th>
                  <th className="py-2.5 px-3">Kolay Gelsin</th>
                  <th className="py-2.5 px-3">DHL eCommerce</th>
                  <th className="py-2.5 px-3">Yurtiçi Kargo</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b hover:bg-muted/30">
                  <td className="py-2.5 px-3 font-semibold text-emerald-600">0 - 149,99 TL</td>
                  <td className="py-2.5 px-3 font-bold">38,74 TL</td>
                  <td className="py-2.5 px-3">48,33 TL</td>
                  <td className="py-2.5 px-3">54,58 TL</td>
                  <td className="py-2.5 px-3">55,83 TL</td>
                  <td className="py-2.5 px-3">57,08 TL</td>
                  <td className="py-2.5 px-3">83,33 TL</td>
                </tr>
                <tr className="border-b hover:bg-muted/30">
                  <td className="py-2.5 px-3 font-semibold text-blue-600">149,99 - 299,99 TL</td>
                  <td className="py-2.5 px-3 font-bold">70,41 TL</td>
                  <td className="py-2.5 px-3">79,16 TL</td>
                  <td className="py-2.5 px-3">85,41 TL</td>
                  <td className="py-2.5 px-3">86,66 TL</td>
                  <td className="py-2.5 px-3">87,91 TL</td>
                  <td className="py-2.5 px-3">113,33 TL</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Standart Desi Tablosu */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="w-5 h-5 text-indigo-500" />
            n11 Özel Anlaşmalı Kargo Fiyat Listesi (1 - 10 Desi, KDV Hariç)
          </CardTitle>
          <CardDescription>
            300 TL ve üzeri siparişler veya 10 desi üzeri gönderiler için geçerli fiyatlar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b bg-muted/50 font-semibold">
                  <th className="py-2 px-3">Desi</th>
                  <th className="py-2 px-3">PTT Kargo</th>
                  <th className="py-2 px-3">Aras Kargo</th>
                  <th className="py-2 px-3">Sürat Kargo</th>
                  <th className="py-2 px-3">Kolay Gelsin</th>
                  <th className="py-2 px-3">DHL eCommerce</th>
                  <th className="py-2 px-3">Yurtiçi Kargo</th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(N11_DESI_TABLE).map((desiKey) => {
                  const d = Number(desiKey);
                  const row = N11_DESI_TABLE[d];
                  return (
                    <tr key={d} className="border-b hover:bg-muted/30">
                      <td className="py-2 px-3 font-bold">{d} Desi</td>
                      <td className="py-2 px-3 font-semibold text-emerald-600">{row.PTT.toFixed(2)} TL</td>
                      <td className="py-2 px-3">{row.Aras.toFixed(2)} TL</td>
                      <td className="py-2 px-3">{row.Sürat.toFixed(2)} TL</td>
                      <td className="py-2 px-3">{row.KolayGelsin.toFixed(2)} TL</td>
                      <td className="py-2 px-3">{row.DHL.toFixed(2)} TL</td>
                      <td className="py-2 px-3">{row.Yurtiçi.toFixed(2)} TL</td>
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
