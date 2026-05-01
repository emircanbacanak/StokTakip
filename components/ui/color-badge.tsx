"use client";

import { getColorStyle } from "@/lib/color-map";
import { useEffect, useState } from "react";

// Arka plan renginin açık mı koyu mu olduğunu belirle
function isLightColor(hex: string): boolean {
  const h = hex.replace("#", "");
  if (h.length < 6) return true;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  // Luminance hesabı
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55;
}

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  if (h.length < 6) return `rgba(128,128,128,${alpha})`;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// Hex rengi koyulaştır
function darkenHex(hex: string, amount: number): string {
  const h = hex.replace("#", "");
  if (h.length < 6) return "#1a1a1a";
  const r = Math.max(0, Math.round(parseInt(h.slice(0, 2), 16) * (1 - amount)));
  const g = Math.max(0, Math.round(parseInt(h.slice(2, 4), 16) * (1 - amount)));
  const b = Math.max(0, Math.round(parseInt(h.slice(4, 6), 16) * (1 - amount)));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

// Hex rengi açıklaştır
function lightenHex(hex: string, amount: number): string {
  const h = hex.replace("#", "");
  if (h.length < 6) return "#f0f0f0";
  const r = Math.min(255, Math.round(parseInt(h.slice(0, 2), 16) + (255 - parseInt(h.slice(0, 2), 16)) * amount));
  const g = Math.min(255, Math.round(parseInt(h.slice(2, 4), 16) + (255 - parseInt(h.slice(2, 4), 16)) * amount));
  const b = Math.min(255, Math.round(parseInt(h.slice(4, 6), 16) + (255 - parseInt(h.slice(4, 6), 16)) * amount));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

export function ColorBadge({ color, size = "md" }: { color: string; size?: "sm" | "md" | "lg" }) {
  const [isDark, setIsDark] = useState(false);
  
  useEffect(() => {
    // Check dark mode on mount
    setIsDark(document.documentElement.classList.contains('dark'));
    
    // Watch for theme changes
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });
    
    return () => observer.disconnect();
  }, []);
  
  const style = getColorStyle(color);
  const dot = style.dot;

  const light = isLightColor(dot);
  const bgColor = hexToRgba(dot, 0.15);
  
  // Dinamik renk seçimi - dark mode'da maksimum kontrast
  const textColor = isDark
    ? (light ? darkenHex(dot, 0.4) : lightenHex(dot, 0.95)) // Dark mode - çok açık yazılar
    : (light ? darkenHex(dot, 0.6) : darkenHex(dot, 0.1)); // Light mode
  
  const borderColor = hexToRgba(dot, 0.35);

  const sizeClass = {
    sm:  { dotSize: "6px",  fontSize: "10px", padding: "2px 7px 2px 5px", gap: "4px", borderRadius: "20px" },
    md:  { dotSize: "8px",  fontSize: "11px", padding: "3px 9px 3px 6px", gap: "5px", borderRadius: "20px" },
    lg:  { dotSize: "10px", fontSize: "12px", padding: "4px 11px 4px 7px", gap: "6px", borderRadius: "20px" },
  }[size];

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: sizeClass.gap,
        backgroundColor: bgColor,
        color: textColor,
        border: `1px solid ${borderColor}`,
        borderRadius: sizeClass.borderRadius,
        padding: sizeClass.padding,
        fontSize: sizeClass.fontSize,
        fontWeight: 600,
        lineHeight: 1.4,
        whiteSpace: "nowrap",
      }}
    >
      <span
        style={{
          width: sizeClass.dotSize,
          height: sizeClass.dotSize,
          borderRadius: "50%",
          backgroundColor: dot,
          border: `1px solid ${hexToRgba(dot, 0.4)}`,
          flexShrink: 0,
          display: "inline-block",
        }}
      />
      {color}
    </span>
  );
}
