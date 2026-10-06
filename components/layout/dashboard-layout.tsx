"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Search, ChevronRight } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { CommandMenu } from "./command-menu";
import { cn } from "@/lib/utils";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  maxWidth?: string;
  backHref?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
}

export function DashboardLayout({
  children,
  title,
  subtitle,
  maxWidth = "max-w-[1720px]",
  backHref,
  breadcrumbs,
  actions,
}: DashboardLayoutProps) {
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <>
      {/* Standart Üst Çubuk (Topbar) */}
      <header className="sticky top-0 z-30 bg-background/85 backdrop-blur-xl border-b border-border/80 px-4 py-3 lg:px-8 transition-all">
        <div className="flex items-center justify-between gap-4">
          {/* Sol Taraf: Geri Butonu + Breadcrumbs + Başlık */}
          <div className="flex items-center gap-3 min-w-0">
            {backHref && (
              <button
                onClick={() => router.push(backHref)}
                className="p-2 -ml-1 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
                title="Geri Dön"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}

            <div className="min-w-0">
              {breadcrumbs && breadcrumbs.length > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-0.5 overflow-hidden">
                  {breadcrumbs.map((b, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 shrink-0">
                      {idx > 0 && <ChevronRight className="w-3 h-3 text-muted-foreground/40" />}
                      {b.href ? (
                        <Link
                          href={b.href}
                          className="hover:text-foreground transition-colors truncate"
                        >
                          {b.label}
                        </Link>
                      ) : (
                        <span className="text-foreground font-medium truncate">
                          {b.label}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2">
                <h1 className="text-lg lg:text-xl font-bold tracking-tight text-foreground truncate">
                  {title}
                </h1>
              </div>

              {subtitle && (
                <p className="text-xs text-muted-foreground hidden sm:block truncate mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {/* Sağ Taraf: Sayfa Aksiyonları + Hızlı Arama + Tema */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Sayfaya Özel Aksiyon Butonları (Örn: Yeni Sipariş, Dışa Aktar) */}
            {actions && <div className="flex items-center gap-2">{actions}</div>}

            {/* Hızlı Arama Butonu (Tablet ve Masaüstü) */}
            <button
              onClick={() => setSearchOpen(true)}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground text-xs font-medium transition-all"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Ara</span>
              <kbd className="px-1.5 py-0.5 text-[9px] rounded bg-background border border-border text-muted-foreground font-mono">
                ⌘K
              </kbd>
            </button>

            {/* Tema Butonu */}
            <div className="lg:hidden">
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* Ana İçerik */}
      <main className={cn("flex-1 p-4 pb-28 lg:p-8 lg:pb-12 w-full mx-auto animate-in fade-in duration-150", maxWidth)}>
        {children}
      </main>

      {/* Hızlı Arama Paleti */}
      <CommandMenu open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}
