"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Trash2, Palette, X, Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useConfirm } from "@/hooks/use-confirm";
import { getColorStyle } from "@/lib/color-map";
import type { Color } from "@/lib/types/database";

const inputCls = "w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all";

export function ColorsClient() {
  const [colors, setColors] = useState<Color[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Color | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();

  const load = useCallback(async () => {
    let sb; try { sb = createClient(); } catch { setLoading(false); return; }
    const { data } = await sb.from("colors").select("*").order("usage_count", { ascending: false }).order("name");
    if (data) setColors(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function openNew() { setEditing(null); setName(""); setOpen(true); }
  function openEdit(c: Color) { setEditing(c); setName(c.name); setOpen(true); }
  function closeDialog() { setOpen(false); setEditing(null); setName(""); }

  async function save() {
    const trimmed = name.trim();
    if (!trimmed) { toast({ title: "Renk adı zorunludur", variant: "destructive" }); return; }
    if (colors.some((c) => c.name.toLowerCase() === trimmed.toLowerCase() && c.id !== editing?.id)) {
      toast({ title: "Bu renk zaten mevcut", variant: "destructive" });
      return;
    }
    setSaving(true);
    const sb = createClient();

    if (editing) {
      const { error } = await sb.from("colors").update({ name: trimmed }).eq("id", editing.id);
      if (error) { toast({ title: "Hata oluştu", variant: "destructive" }); }
      else { toast({ title: "Renk güncellendi ✓" }); closeDialog(); load(); }
    } else {
      const { error } = await sb.from("colors").insert({ name: trimmed });
      if (error) { toast({ title: "Hata oluştu", variant: "destructive" }); }
      else { toast({ title: "Renk eklendi ✓" }); closeDialog(); load(); }
    }
    setSaving(false);
  }

  async function del(id: string, colorName: string) {
    const confirmed = await confirm({
      title: "Rengi Sil",
      message: `"${colorName}" rengini silmek istediğinizden emin misiniz?`,
      confirmText: "Sil",
      cancelText: "İptal",
      variant: "danger",
    });
    if (!confirmed) return;
    const sb = createClient();
    await sb.from("colors").delete().eq("id", id);
    toast({ title: "Renk silindi" });
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{colors.length} renk</p>
        <button
          onClick={openNew}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-violet-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <Plus className="w-4 h-4" /> Yeni Renk
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {[...Array(8)].map((_, i) => <div key={i} className="h-14 bg-card rounded-2xl animate-pulse border border-border" />)}
        </div>
      ) : colors.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/10 to-violet-500/10 flex items-center justify-center mx-auto mb-4">
            <Palette className="w-7 h-7 text-blue-500" />
          </div>
          <p className="font-semibold text-foreground mb-1">Henüz renk yok</p>
          <p className="text-sm text-muted-foreground mb-5">İlk renginizi ekleyin</p>
          <button onClick={openNew} className="bg-gradient-to-r from-blue-500 to-violet-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl shadow-lg shadow-blue-500/25">
            Renk Ekle
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {colors.map((c) => (
            <div
              key={c.id}
              className="bg-card rounded-2xl border border-border px-4 py-3 flex items-center gap-3 hover:border-blue-500/30 hover:shadow-md hover:shadow-blue-500/5 transition-all group"
            >
              <div
                className="w-6 h-6 rounded-full shrink-0 border border-black/10 dark:border-white/10"
                style={{ backgroundColor: getColorStyle(c.name).dot }}
              />
              <span className="flex-1 text-sm font-medium text-foreground truncate">{c.name}</span>
              {c.usage_count > 0 && (
                <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full shrink-0">
                  {c.usage_count}x
                </span>
              )}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                <button
                  onClick={() => openEdit(c)}
                  className="p-1 text-muted-foreground/50 hover:text-blue-500 hover:bg-blue-500/10 rounded-lg transition-all"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => del(c.id, c.name)}
                  className="p-1 text-muted-foreground/30 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Dialog */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeDialog} />
          <div className="relative bg-card w-full sm:max-w-sm sm:rounded-2xl rounded-t-3xl border border-border shadow-2xl">
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="w-10 h-1 rounded-full bg-border" />
            </div>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
                  <Palette className="w-4 h-4 text-white" />
                </div>
                <h2 className="font-bold text-foreground">{editing ? "Rengi Düzenle" : "Yeni Renk"}</h2>
              </div>
              <button onClick={closeDialog} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Renk Adı *</label>
              <input
                autoFocus
                placeholder="Örn: Açık Mavi, Neon Sarı..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && save()}
                className={inputCls}
              />
            </div>
            <div className="px-5 py-4 border-t border-border flex gap-3">
              <button onClick={closeDialog} className="flex-1 border border-border text-foreground font-semibold py-3 rounded-xl text-sm hover:bg-muted transition-all">İptal</button>
              <button
                onClick={save}
                disabled={saving}
                className="flex-1 bg-gradient-to-r from-blue-500 to-violet-600 text-white font-semibold py-3 rounded-xl text-sm shadow-lg shadow-blue-500/25 disabled:opacity-50 transition-all"
              >
                {saving ? "Kaydediliyor..." : editing ? "Güncelle" : "Kaydet"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog />
    </div>
  );
}
