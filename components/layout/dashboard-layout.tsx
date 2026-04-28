"use client";

import { ThemeToggle } from "./theme-toggle";

interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

export function DashboardLayout({ children, title, subtitle }: DashboardLayoutProps) {
  return (
    <>
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-3 lg:px-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold text-foreground lg:text-lg">{title}</h1>
            {subtitle && <p className="text-xs text-muted-foreground hidden lg:block">{subtitle}</p>}
          </div>
          <div className="lg:hidden">
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main className="flex-1 p-4 pb-28 lg:p-6 lg:pb-6 max-w-5xl w-full mx-auto">
        {children}
      </main>
    </>
  );
}
