"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Truck, Package, Calculator, CheckCircle2, ShieldCheck, Zap } from "lucide-react";
import {
  PAZARAMA_CARGO_COMPANIES,
  calcPazaramaShippingCost,
  PAZARAMA_BAREM_TABLE,
  PAZARAMA_DESI_TABLE,
  KDV_RATE,
} from "@/lib/pazarama-cargo";

export function CargoPriceCalculator() {
  const [orderAmount, setOrderAmount] = useState<string>("180");
  const [width, setWidth] = useState<string>("25");
  const [height, setHeight] = useState<string>("20");
  const [depth, setDepth] = useState<string>("15");
  const [weightKg, setWeightKg] = useState<string>("1");
  const [selectedCompany, setSelectedCompany] = useState<string>("auto");
  const [isSameDay, setIsSameDay] = useState<boolean>(true);

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
    return calcPazaramaShippingCost(effectiveDesi * 1000, amount, isSameDay, selectedCompany);
  }, [effectiveDesi, amount, isSameDay, selectedCompany]);

  const isBarem = amount < 300;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Truck className="w-5 h-5 text-blue-500" />
            Pazarama Anlaşmalı Kargo ve Barem Hesaplayıcı
          </CardTitle>
          <CardDescription>
            Aynı Gün (0 gün) ve normal terminli kargo barem maliyetlerinizi hesaplayın.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                {PAZARAMA_CARGO_COMPANIES.map((c) => (
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
            <div className="flex flex-col justify-end">
              <label className="flex items-center gap-2 p-2.5 border rounded-lg cursor-pointer bg-card hover:bg-muted/40 transition-colors">
                <input
                  type="checkbox"
                  checked={isSameDay}
                  onChange={(e) => setIsSameDay(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600"
                />
                <span className="text-xs font-semibold">⚡ Aynı Gün (0 Gün) Gönderi</span>
              </label>
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
                    ? isSameDay
                      ? "🟢 Aynı Gün Barem Destekli (<300 TL)"
                      : "🔵 Normal Barem Destekli (<300 TL)"
                    : "📦 Standart Desi Tarifesi"}
                </Badge>
                <span className="text-xs text-muted-foreground">Hesaplanan: {effectiveDesi} Desi</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {isBarem
                  ? `Sipariş 300 TL altında olduğu için Pazarama ${isSameDay ? "Aynı Gün (0 Gün)" : "Normal"} barem desteği uygulanır (Kaç desi olduğu önemsiz sabit barem fiyatı).`
                  : "Sipariş 300 TL üzerinde olduğu için Pazarama anlaşmalı desi tarifesi uygulanır."}
              </p>
            </div>
            <div className="text-right shrink-0">
              <div className="text-xs text-muted-foreground">KDV Dahil Kargo Maliyeti</div>
              <div className="text-2xl font-black text-blue-600 dark:text-blue-400">
                ₺{cost.toFixed(2)}
              </div>
              <div className="text-[11px] text-muted-foreground">
                KDV Hariç: ₺{(cost / (1 + KDV_RATE)).toFixed(2)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Aynı Gün Barem Destek Tablosu */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="w-5 h-5 text-emerald-500" />
            Pazarama Aynı Gün (0 Gün) Barem Destek Tablosu (KDV Hariç)
          </CardTitle>
          <CardDescription>
            Teslimat şablonunda Aynı Gün seçili ve süresinde kargolanan siparişler için indirimli fiyatlar
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
                  <td className="py-2.5 px-3 font-bold text-emerald-600">34,16 TL</td>
                  <td className="py-2.5 px-3">48,33 TL</td>
                  <td className="py-2.5 px-3">54,58 TL</td>
                  <td className="py-2.5 px-3">55,83 TL</td>
                  <td className="py-2.5 px-3">57,08 TL</td>
                  <td className="py-2.5 px-3">83,33 TL</td>
                </tr>
                <tr className="border-b hover:bg-muted/30">
                  <td className="py-2.5 px-3 font-semibold text-blue-600">150 - 300 TL</td>
                  <td className="py-2.5 px-3 font-bold text-emerald-600">65,83 TL</td>
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

      {/* Aynı Gün Değilse Tablosu */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-amber-500" />
            Pazarama Aynı Gün Değilse Barem Destek Tablosu (KDV Hariç)
          </CardTitle>
          <CardDescription>
            Termini 1 günden fazla olan siparişler için geçerli barem fiyatları
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
                  <td className="py-2.5 px-3 font-bold">68,74 TL</td>
                  <td className="py-2.5 px-3">80,83 TL</td>
                  <td className="py-2.5 px-3">87,08 TL</td>
                  <td className="py-2.5 px-3">88,33 TL</td>
                  <td className="py-2.5 px-3">89,58 TL</td>
                  <td className="py-2.5 px-3">114,16 TL</td>
                </tr>
                <tr className="border-b hover:bg-muted/30">
                  <td className="py-2.5 px-3 font-semibold text-blue-600">150 - 300 TL</td>
                  <td className="py-2.5 px-3 font-bold">74,16 TL</td>
                  <td className="py-2.5 px-3">86,24 TL</td>
                  <td className="py-2.5 px-3">92,49 TL</td>
                  <td className="py-2.5 px-3">93,74 TL</td>
                  <td className="py-2.5 px-3">94,99 TL</td>
                  <td className="py-2.5 px-3">119,16 TL</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
