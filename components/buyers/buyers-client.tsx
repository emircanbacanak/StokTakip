"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Phone, MapPin, Trash2, User, X, Users, Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useConfirm } from "@/hooks/use-confirm";
import type { Buyer } from "@/lib/types/database";

const inputCls = "w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all";

const AVATAR_COLORS = [
  "from-blue-500 to-violet-600",
  "from-emerald-500 to-teal-600",
  "from-orange-500 to-amber-600",
  "from-pink-500 to-rose-600",
  "from-cyan-500 to-blue-600",
];

export function BuyersClient() {
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Buyer | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();

  const load = useCallback(async () => {
    let sb; try { sb = createClient(); } catch { setLoading(false); return; }
    const { data } = await sb.from("buyers").select("*").order("name");
    if (data) setBuyers(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function openNew() {
    setEditing(null);
    setName(""); setPhone(""); setAddress("");
    setOpen(true);
  }

  function openEdit(b: Buyer) {
    setEditing(b);
    setName(b.name);
    setPhone(b.phone || "");
    setAddress(b.address || "");
    setOpen(true);
  }

  function closeDialog() {
    setOpen(false);
    setEditing(null);
    setName(""); setPhone(""); setAddress("");
  }

  async function save() {
    if (!name.trim()) { toast({ title: "Ad zorunludur", variant: "destructive" }); return; }
    setSaving(true);
    let sb; try { sb = createClient(); } catch { setSaving(false); return; }

    if (editing) {
      const { error } = await sb.from("buyers").update({
        name: name.trim(),
        phone: phone.trim() || null,
        address: address.trim() || null,
      }).eq("id", editing.id);
      if (error) { toast({ title: "Hata oluştu", variant: "destructive" }); setSaving(false); return; }
      toast({ title: "Alıcı güncellendi ✓" });
    } else {
      await sb.from("buyers").insert({ name: name.trim(), phone: phone.trim() || null, address: address.trim() || null });
      toast({ title: "Alıcı eklendi ✓" });
    }

    setSaving(false);
    closeDialog();
    load();
  }

  async function del(id: string) {
    const confirmed = await confirm({
      title: "Alıcıyı Sil",
      message: "Bu alıcıyı silmek istediğinizden emin misiniz? Alıcının siparişleri varsa silinemez.",
      confirmText: "Sil",
      cancelText: "İptal",
      variant: "danger",
    });
    if (!confirmed) return;
    let sb; try { sb = createClient(); } catch { return; }
    const { error } = await sb.from("buyers").delete().eq("id", id);
    if (error) toast({ title: "Silinemedi — siparişleri olabilir", variant: "destructive" });
    else { toast({ title: "Silindi" }); load(); }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{buyers.length} alıcı</p>
        <button onClick={openNew}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-violet-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all">
          <Plus className="w-4 h-4" /> Yeni Alıcı
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-card rounded-2xl animate-pulse border border-border" />)}
        </div>
      ) : buyers.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/10 to-violet-500/10 flex items-center justify-center mx-auto mb-4">
            <Users className="w-7 h-7 text-blue-500" />
          </div>
          <p className="font-semibold text-foreground mb-1">Henüz alıcı yok</p>
          <p className="text-sm text-muted-foreground mb-5">İlk alıcınızı ekleyin</p>
          <button onClick={openNew} className="bg-gradient-to-r from-blue-500 to-violet-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl shadow-lg shadow-blue-500/25">
            Alıcı Ekle
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {buyers.map((b, i) => (
            <div key={b.id} className="bg-card rounded-2xl border border-border p-4 flex items-start gap-3 hover:border-blue-500/30 hover:shadow-md hover:shadow-blue-500/5 transition-all group">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${AVATAR_COLORS[i % AVATAR_COLORS.length]} flex items-center justify-center shrink-0 shadow-md`}>
                <span className="text-sm font-bold text-white">{b.name.charAt(0).toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground truncate">{b.name}</p>
                {b.phone && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                    <Phone className="w-3 h-3" /> {b.phone}
                  </div>
                )}
                {b.address && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                    <MapPin className="w-3 h-3" /> <span className="truncate">{b.address}</span>
                  </div>
                )}
                <p className="text-[10px] text-muted-foreground/60 mt-1.5">{formatDate(b.created_at)}</p>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                <button
                  onClick={() => openEdit(b)}
                  className="p-1.5 text-muted-foreground/50 hover:text-blue-500 hover:bg-blue-500/10 rounded-lg transition-all"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => del(b.id)}
                  className="p-1.5 text-muted-foreground/30 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeDialog} />
          <div className="relative bg-card w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl border border-border shadow-2xl">
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="w-10 h-1 rounded-full bg-border" />
            </div>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <h2 className="font-bold text-foreground">
                  {editing ? "Alıcıyı Düzenle" : "Yeni Alıcı"}
                </h2>
              </div>
              <button onClick={closeDialog} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Ad Soyad *</label>
                <input placeholder="Alıcı adı" value={name} onChange={(e) => setName(e.target.value)} className={inputCls} autoFocus />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Telefon</label>
                <input placeholder="0555 000 00 00" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Adres</label>
                <textarea placeholder="Adres..." value={address} onChange={(e) => setAddress(e.target.value)} rows={2} className={inputCls + " resize-none"} />
              </div>
            </div>
            <div className="px-5 py-4 border-t border-border flex gap-3">
              <button onClick={closeDialog} className="flex-1 border border-border text-foreground font-semibold py-3 rounded-xl text-sm hover:bg-muted transition-all">İptal</button>
              <button onClick={save} disabled={saving}
                className="flex-1 bg-gradient-to-r from-blue-500 to-violet-600 text-white font-semibold py-3 rounded-xl text-sm shadow-lg shadow-blue-500/25 disabled:opacity-50 transition-all">
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
