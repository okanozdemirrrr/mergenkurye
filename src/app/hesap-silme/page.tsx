/**
 * @file src/app/hesap-silme/page.tsx
 * @description Hesap Silme Talebi Sayfası - Google Play Console Gereksinimi
 */
'use client'

import { Mail, AlertTriangle, Lock, Check, ChevronLeft } from 'lucide-react'

export default function HesapSilmePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      <div className="bg-slate-900 p-8 md:p-12 rounded-md border border-white/5 shadow-sm w-full max-w-2xl">
        <div className="text-center mb-8">
          <img src="/logo.png" alt="Mergen Kurye Logo" className="w-32 h-32 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-white mb-2">Hesap Silme Talebi</h1>
          <p className="text-slate-400 text-sm">Mergen Kurye Sistemi</p>
        </div>

        <div className="space-y-6 text-slate-300">
          <div className="bg-slate-800/50 border border-white/5 rounded-md p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <Mail size={20} strokeWidth={1.5} className="text-orange-400" />
              Hesap Silme Prosedürü
            </h2>
            <p className="mb-4 leading-relaxed">
              Mergen Kurye sistemindeki hesabınızı silmek istiyorsanız, lütfen aşağıdaki e-posta adresine 
              hesap silme talebinizi gönderin:
            </p>
            <div className="bg-slate-900 border border-white/5 rounded-md p-4 mb-4 shadow-sm">
              <a 
                href="mailto:ozdemiribrahimokan@gmail.com?subject=Mergen Kurye - Hesap Silme Talebi"
                className="text-orange-400 hover:text-orange-300 font-medium text-lg transition-colors"
              >
                ozdemiribrahimokan@gmail.com
              </a>
            </div>
            <p className="text-sm text-slate-400">
              E-postanızda lütfen kayıtlı telefon numaranızı veya kullanıcı adınızı belirtin.
            </p>
          </div>

          <div className="bg-red-900/20 border border-red-700/50 rounded-md p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-red-300 mb-4 flex items-center gap-2">
              <AlertTriangle size={20} strokeWidth={1.5} />
              Önemli Bilgilendirme
            </h2>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-red-400 mt-1">•</span>
                <span>
                  Talebinizden sonra <strong className="text-white">7 iş günü içinde</strong> tüm kişisel 
                  verileriniz ve sipariş geçmişiniz kalıcı olarak silinecektir.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400 mt-1">•</span>
                <span>
                  Hesabınız silindikten sonra bu işlem <strong className="text-white">geri alınamaz</strong>.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400 mt-1">•</span>
                <span>
                  Bekleyen ödemeleriniz veya aktif siparişleriniz varsa, bunlar tamamlanana kadar 
                  hesap silme işlemi ertelenebilir.
                </span>
              </li>
            </ul>
          </div>

          <div className="bg-slate-800/50 border border-white/5 rounded-md p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <Lock size={20} strokeWidth={1.5} className="text-slate-400" />
              Silinecek Veriler
            </h2>
            <ul className="space-y-2 text-sm">
              {[
                'Kişisel bilgileriniz (ad, soyad, telefon, e-posta)',
                'Sipariş geçmişiniz',
                'Ödeme kayıtlarınız',
                'Konum geçmişiniz',
                'Hesap ayarlarınız',
              ].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <Check size={14} strokeWidth={1.5} className="text-green-400 flex-shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="text-center pt-4">
            <a 
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-md transition-colors"
            >
              <ChevronLeft size={16} strokeWidth={1.5} />
              Ana Sayfaya Dön
            </a>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-white/5 text-center text-slate-500 text-xs">
          <p>© 2026 Mergen Teknoloji - Tüm hakları saklıdır</p>
          <p className="mt-2">
            Sorularınız için:{' '}
            <a 
              href="mailto:ozdemiribrahimokan@gmail.com" 
              className="text-orange-400 hover:text-orange-300 transition-colors"
            >
              ozdemiribrahimokan@gmail.com
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
