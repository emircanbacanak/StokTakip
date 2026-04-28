"use client";

import { AlertTriangle } from "lucide-react";

export function SetupBanner() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-orange-200 shadow-sm p-6 max-w-md w-full">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
          </div>
          <h2 className="font-bold text-gray-900">Supabase Kurulumu Gerekli</h2>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Uygulamayı kullanmak için Supabase bağlantısını yapılandırmanız gerekiyor.
        </p>
        <div className="bg-gray-50 rounded-xl p-4 space-y-3 text-sm">
          <p className="font-semibold text-gray-700">Adımlar:</p>
          <ol className="space-y-2 text-gray-600 list-decimal list-inside">
            <li>
              <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-blue-600 underline">supabase.com</a> adresinde proje oluşturun
            </li>
            <li>SQL Editor&apos;da <code className="bg-gray-200 px-1 rounded">supabase/schema.sql</code> dosyasını çalıştırın</li>
            <li>Settings → API sayfasından URL ve anon key&apos;i kopyalayın</li>
            <li>
              Proje klasöründe <code className="bg-gray-200 px-1 rounded">.env.local</code> dosyası oluşturun:
              <pre className="bg-gray-800 text-green-400 rounded-lg p-3 mt-2 text-xs overflow-x-auto">
{`NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...`}
              </pre>
            </li>
            <li>Terminalde <code className="bg-gray-200 px-1 rounded">npm run dev</code> ile yeniden başlatın</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
