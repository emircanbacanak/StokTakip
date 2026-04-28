"use client";

import { X, AlertTriangle } from "lucide-react";

export function ConfirmDialog({
  open,
  title,
  message,
  confirmText = "Evet",
  cancelText = "İptal",
  variant = "danger",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info";
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  const variantStyles = {
    danger: {
      icon: "bg-red-500/10 text-red-600",
      button: "bg-gradient-to-r from-red-500 to-red-600",
    },
    warning: {
      icon: "bg-amber-500/10 text-amber-600",
      button: "bg-gradient-to-r from-amber-500 to-amber-600",
    },
    info: {
      icon: "bg-blue-500/10 text-blue-600",
      button: "bg-gradient-to-r from-blue-500 to-blue-600",
    },
  };

  const style = variantStyles[variant];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-card w-full max-w-md rounded-2xl border border-border shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${style.icon}`}>
              <AlertTriangle className="w-4 h-4" />
            </div>
            <h2 className="font-bold text-foreground">{title}</h2>
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 border border-border text-foreground font-semibold py-2.5 rounded-xl text-sm hover:bg-muted transition-all"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 ${style.button} text-white font-semibold py-2.5 rounded-xl text-sm shadow-lg hover:shadow-xl transition-all`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
