"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface FilamentInputDialogProps {
  orderId: string;
  buyerName: string;
  currentFilamentKg: number;
  onClose: () => void;
  onSuccess: () => void;
}

export function FilamentInputDialog({
  orderId,
  buyerName,
  currentFilamentKg,
  onClose,
  onSuccess,
}: FilamentInputDialogProps) {
  const { toast } = useToast();
  const [filamentKg, setFilamentKg] = useState(currentFilamentKg.toString());
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    const kg = parseFloat(filamentKg) || 0;
    if (kg < 0) {
      toast({ title: "Hata", description: "Filament miktarı negatif olamaz", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const sb = createClient();
      
      // Update orders table
      const { error: orderError } = await sb
        .from("orders")
        .update({ filament_kg: kg })
        .eq("id", orderId);

      if (orderError) throw orderError;

      // Upsert filament_usage table
      const { error: usageError } = await sb
        .from("filament_usage")
        .upsert({
          order_id: orderId,
          filament_kg: kg,
          notes: notes || null,
        }, {
          onConflict: "order_id"
        });

      if (usageError) throw usageError;

      toast({ title: "Filament kaydedildi ✓" });
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error saving filament:", error);
      toast({ title: "Hata", description: "Filament kaydedilemedi", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card w-full max-w-md rounded-2xl border border-border shadow-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-lg text-foreground">Filament Girişi</h3>
            <p className="text-sm text-muted-foreground mt-1">{buyerName} - Sipariş</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="filament-kg">Toplam Filament Miktarı (kg)</Label>
            <Input
              id="filament-kg"
              type="number"
              step="0.01"
              min="0"
              value={filamentKg}
              onChange={(e) => setFilamentKg(e.target.value)}
              placeholder="0.00"
              className="mt-1.5"
              autoFocus
            />
            <p className="text-xs text-muted-foreground mt-1.5">
              Bu sipariş için kullanılan toplam filament miktarını kg cinsinden girin
            </p>
          </div>

          <div>
            <Label htmlFor="notes">Not (Opsiyonel)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Örn: Beyaz PLA, 2 makara"
              className="mt-1.5"
              rows={2}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={saving}
            >
              İptal
            </Button>
            <Button
              onClick={handleSave}
              className="flex-1"
              disabled={saving}
            >
              {saving ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
