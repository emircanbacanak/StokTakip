"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Truck, Package, ShieldCheck } from "lucide-react";
import {
  HEPSIBURADA_COMPANIES,
  calcShippingCost,
  HEPSIBURADA_BAREM,
  STANDART_CARGO_TABLE,
} from "@/lib/hepsiburada-cargo";

export function CargoPriceCalculator() {
  const [orderAmount, setOrderAmount] = useState<string>("180");
  const [width, setWidth] = useState<string>("25");
  const [height, setHeight] = useState<string>("20");
  const [depth, setDepth] = useState<string>("15");
  const [weightKg, setWeightKg] = useState<string>("1");
  const [selectedCompany, setSelectedCompany] = useState<string>("auto");
  const [fastShipping, setFastShipping] = useState<boolean>(true); // 0-1 gün termin

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
    return calcShippingCost(effectiveDesi * 1000, amount, fastShipping);
  }, [effectiveDesi, amount, fastShipping]);

  const isBarem = fastShipping && amount < 400;

  return (
    <div className="space-y-6">
      {/* 1. Hesaplayıcı Kartı */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Truck className="w-5 h-5 text-orange-600" />
            Hepsiburada Anlaşmalı Kargo ve Barem Hesaplayıcı
          </CardTitle>
          <CardDescription>
            Sipariş tutarı ve desi değerine göre anlaşmalı kargo maliyetlerinizi hesaplayın.
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
                {HEPSIBURADA_COMPANIES.map((c) => (
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
            <div>
              <Label className="text-xs font-semibold">Termin Süresi</Label>
              <select
                value={fastShipping ? "1" : "2"}
                onChange={(e) => setFastShipping(e.target.value === "1")}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="1">⚡ 0 - 1 Gün (Kampanyalı Sabit Fiyat)</option>
                <option value="2">🐢 2+ Gün (Standart Desi)</option>
              </select>
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
                  {isBarem ? "🟢 Şartlı Kargo (400 TL Altı Barem Destekli)" : "📦 Standart Desi Tarifesi"}
                </Badge>
                <span className="text-xs text-muted-foreground">Hesaplanan: {effectiveDesi} Desi</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {isBarem
                  ? "Sipariş 400 TL altında olduğu için Hepsiburada kampanyalı sabit barem fiyatı uygulanır (Desi sınırı yoktur, sabit fiyattır)."
                  : "Sipariş 400 TL üzerinde olduğu için standart desi tarifesi üzerinden faturalandırılır."}
              </p>
            </div>
            <div className="text-right shrink-0">
              <div className="text-xs text-muted-foreground">KDV Dahil Kargo Maliyeti</div>
              <div className="text-2xl font-black text-orange-600 dark:text-orange-400">
                ₺{cost.toFixed(2)}
              </div>
              <div className="text-[11px] text-muted-foreground">
                KDV Hariç: ₺{(cost / 1.20).toFixed(2)}
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
            Hepsiburada Şartlı Kargo Barem Destek Tablosu (400 TL Altı, KDV Hariç)
          </CardTitle>
          <CardDescription>
            0 veya 1 gün terminli siparişlerde geçerli olan kampanyalı sabit kargo fiyatları (Desi sınırı yoktur)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b bg-muted/50 font-semibold">
                  <th className="py-2.5 px-3">Sipariş Tutarı</th>
                  <th className="py-2.5 px-3">KDV Hariç Sabit Ücret</th>
                  <th className="py-2.5 px-3">KDV Dahil Ücret (%20)</th>
                  <th className="py-2.5 px-3">Desi Kısıtlaması</th>
                  <th className="py-2.5 px-3">Termin Şartı</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b hover:bg-muted/30">
                  <td className="py-2.5 px-3 font-semibold text-emerald-600">0 – 199,99 TL</td>
                  <td className="py-2.5 px-3 font-bold text-emerald-600">43,99 TL</td>
                  <td className="py-2.5 px-3 font-semibold">52,79 TL</td>
                  <td className="py-2.5 px-3">Desi sınırı yok (Tüm Desiler)</td>
                  <td className="py-2.5 px-3">0 veya 1 Gün</td>
                </tr>
                <tr className="border-b hover:bg-muted/30">
                  <td className="py-2.5 px-3 font-semibold text-blue-600">200 – 399,99 TL</td>
                  <td className="py-2.5 px-3 font-bold text-blue-600">75,99 TL</td>
                  <td className="py-2.5 px-3 font-semibold">91,19 TL</td>
                  <td className="py-2.5 px-3">Desi sınırı yok (Tüm Desiler)</td>
                  <td className="py-2.5 px-3">0 veya 1 Gün</td>
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
            <Package className="w-5 h-5 text-indigo-500" />
            Hepsiburada Özel Anlaşmalı Kargo Fiyat Listesi (1 - 10 Desi, KDV Hariç)
          </CardTitle>
          <CardDescription>
            400 TL ve üzeri siparişler veya 1 günden uzun terminli standart gönderiler için geçerli fiyatlar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b bg-muted/50 font-semibold">
                  <th className="py-2 px-3">Desi</th>
                  <th className="py-2 px-3">HepsiJET</th>
                  <th className="py-2 px-3">PTT Kargo</th>
                  <th className="py-2 px-3">Aras Kargo</th>
                  <th className="py-2 px-3">Sürat Kargo</th>
                  <th className="py-2 px-3">Yurtiçi Kargo</th>
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((d) => {
                  const base = STANDART_CARGO_TABLE[d] || 75;
                  return (
                    <tr key={d} className="border-b hover:bg-muted/30">
                      <td className="py-2 px-3 font-bold">{d} Desi</td>
                      <td className="py-2 px-3 font-semibold text-emerald-600">{base.toFixed(2)} TL</td>
                      <td className="py-2 px-3">{(base * 1.05).toFixed(2)} TL</td>
                      <td className="py-2 px-3">{(base * 1.08).toFixed(2)} TL</td>
                      <td className="py-2 px-3">{(base * 1.10).toFixed(2)} TL</td>
                      <td className="py-2 px-3">{(base * 1.25).toFixed(2)} TL</td>
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
