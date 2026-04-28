"use client";

import { useState } from "react";
import { X, Palette } from "lucide-react";

export function AddColorsDialog({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (count: number) => void;
}) {
  const [count, setCount] = useState("1");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseInt(count);
    if (isNaN(num) || num < 1 || num > 50) {
      return;
    }
    onConfirm(num);
    setCount("1");
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card w-full max-w-sm rounded-2xl border border-border shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
              <Palette className="w-4 h-4 text-violet-600" />
            </div>
            <h2 className="font-bold text-foreground">Renk Ekle</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Content */}
          <div className="p-5 space-y-4">
            <p className="text-sm text-muted-foreground">
              Kaç renk eklemek istiyorsunuz?
            </p>
            <input
              type="number"
              min="1"
              max="50"
              value={count}
              onChange={(e) => setCount(e.target.value)}
              autoFocus
              className="w-full h-12 px-4 rounded-xl border border-border bg-background text-lg font-bold text-center text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
            <p className="text-xs text-muted-foreground text-center">
              1-50 arası bir sayı girin
            </p>
          </div>

          {/* Footer */}
          <div className="px-5 py-4 border-t border-border flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-border text-foreground font-semibold py-2.5 rounded-xl text-sm hover:bg-muted transition-all"
            >
              İptal
            </button>
            <button
              type="submit"
              className="flex-1 bg-gradient-to-r from-violet-500 to-purple-600 text-white font-semibold py-2.5 rounded-xl text-sm shadow-lg hover:shadow-xl transition-all"
            >
              Ekle
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
