"use client";

import { AlertTriangle } from "lucide-react";

export function SetupBanner() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl border border-orange-500/20 shadow-sm p-6 max-w-md w-full">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-orange-500/10 rounded-xl flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
          </div>
          <h2 className="font-bold text-foreground">Supabase Kurulumu Gerekli</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Uygulamayı kullanmak için Supabase bağlantısını yapılandırmanız gerekiyor.
        </p>
        <div className="bg-muted rounded-xl p-4 space-y-3 text-sm">
          <p className="font-semibold text-foreground">Adımlar:</p>
          <ol className="space-y-2 text-muted-foreground list-decimal list-inside">
            <li>
              <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-blue-600 dark:text-blue-400 underline">supabase.com</a> adresinde proje oluşturun
            </li>
            <li>SQL Editor&apos;da <code className="bg-muted px-1 rounded border border-border">supabase/schema.sql</code> dosyasını çalıştırın</li>
            <li>Settings → API sayfasından URL ve anon key&apos;i kopyalayın</li>
            <li>
              Proje klasöründe <code className="bg-muted px-1 rounded border border-border">.env.local</code> dosyası oluşturun:
              <pre className="bg-muted border border-border text-emerald-600 dark:text-emerald-400 rounded-lg p-3 mt-2 text-xs overflow-x-auto">
{`NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...`}
              </pre>
            </li>
            <li>Terminalde <code className="bg-muted px-1 rounded border border-border">npm run dev</code> ile yeniden başlatın</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
