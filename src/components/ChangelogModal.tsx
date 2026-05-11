'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabase'

interface ChangelogModalProps {
  userType: 'courier' | 'restaurant' | 'admin'
  userId: string | null
}

export default function ChangelogModal({ userType, userId }: ChangelogModalProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    checkIfShouldShow()
  }, [userId, userType])

  const checkIfShouldShow = async () => {
    if (!userId) {
      setIsChecking(false)
      return
    }

    try {
      // Kullanıcı tipine göre doğru tabloyu seç
      const tableName = userType === 'courier' ? 'couriers' : userType === 'restaurant' ? 'restaurants' : 'admins'
      
      const { data, error } = await supabase
        .from(tableName)
        .select('has_seen_v2_update')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Changelog kontrol hatası:', error)
        setIsChecking(false)
        return
      }

      // Eğer kullanıcı henüz görmemişse modalı göster
      if (data && data.has_seen_v2_update === false) {
        setIsVisible(true)
      }
    } catch (error) {
      console.error('Changelog kontrol hatası:', error)
    } finally {
      setIsChecking(false)
    }
  }

  const handleClose = async () => {
    // Optimistic UI: Modalı ANINDA kapat
    setIsVisible(false)

    // Arka planda veritabanını güncelle
    if (!userId) return

    try {
      const tableName = userType === 'courier' ? 'couriers' : userType === 'restaurant' ? 'restaurants' : 'admins'
      
      await supabase
        .from(tableName)
        .update({ has_seen_v2_update: true })
        .eq('id', userId)

      console.log('✅ Changelog görüldü olarak işaretlendi')
    } catch (error) {
      console.error('❌ Changelog güncelleme hatası:', error)
    }
  }

  // Kontrol devam ediyorsa veya modal görünmeyecekse hiçbir şey render etme
  if (isChecking || !isVisible) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-slate-900 border-b border-slate-800 p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-4xl">🚀</span>
            <div>
              <h2 className="text-2xl font-black text-white">Alda-Gel Kurye v2.0</h2>
              <p className="text-sm text-slate-400">Güncelleme Yayında!</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-white transition-colors p-2 hover:bg-slate-800 rounded-lg"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          <p className="text-slate-300 text-lg leading-relaxed">
            Sistemimizi sizin için daha hızlı, daha güvenilir ve daha kullanışlı hale getirdik. İşte yeni özellikler:
          </p>

          {/* Özellikler Listesi */}
          <div className="space-y-4">
            {/* Özellik 1 */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 hover:border-slate-600 transition-colors">
              <div className="flex items-start gap-3">
                <span className="text-3xl flex-shrink-0">📱</span>
                <div>
                  <h3 className="text-white font-bold text-lg mb-1">Tam Mobil Uyumluluk</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    Restoran paneli artık telefonlarda kusursuz çalışıyor. 3'lü finansal kartlarla net kârınızı telefondan anında görün.
                  </p>
                </div>
              </div>
            </div>

            {/* Özellik 2 */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 hover:border-slate-600 transition-colors">
              <div className="flex items-start gap-3">
                <span className="text-3xl flex-shrink-0">💰</span>
                <div>
                  <h3 className="text-white font-bold text-lg mb-1">Gelişmiş Finansal Mutabakat</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    Kurye gün sonu ve hakediş hesaplamaları tamamen şeffaf ve yeni nesil 'Business' tasarıma geçirildi.
                  </p>
                </div>
              </div>
            </div>

            {/* Özellik 3 */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 hover:border-slate-600 transition-colors">
              <div className="flex items-start gap-3">
                <span className="text-3xl flex-shrink-0">⏱️</span>
                <div>
                  <h3 className="text-white font-bold text-lg mb-1">Detaylı Sipariş Zaman Çizelgesi</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    Siparişlerin oluşturulma, hazırlanma, kuryeye atanma ve teslim edilme saatleri saniyesi saniyesine geri getirildi.
                  </p>
                </div>
              </div>
            </div>

            {/* Özellik 4 */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 hover:border-slate-600 transition-colors">
              <div className="flex items-start gap-3">
                <span className="text-3xl flex-shrink-0">💳</span>
                <div>
                  <h3 className="text-white font-bold text-lg mb-1">Kurye Kazanç Yönetimi</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    Kuryelerin ödenmemiş paketleri ve hakedişleri artık sistem üzerinden tek tıkla ('Öde' butonu ile) yönetiliyor.
                  </p>
                </div>
              </div>
            </div>

            {/* Özellik 5 */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 hover:border-slate-600 transition-colors">
              <div className="flex items-start gap-3">
                <span className="text-3xl flex-shrink-0">🛠️</span>
                <div>
                  <h3 className="text-white font-bold text-lg mb-1">Sistem Hızlandırması</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    Ekranların kapanmama, donma veya yanlış tarih getirme hataları (bug'lar) sıfırdan yazılan 'Stateless' mimariyle kökünden çözüldü.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Mesajı */}
          <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-700/50 rounded-xl p-4">
            <p className="text-purple-200 text-sm text-center leading-relaxed">
              💜 Daha iyi bir deneyim için çalışmaya devam ediyoruz. Geri bildirimleriniz bizim için çok değerli!
            </p>
          </div>

          {/* Kapat Butonu */}
          <button
            onClick={handleClose}
            className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white text-lg font-bold rounded-xl transition-all shadow-lg hover:shadow-xl"
          >
            ✨ Harika, Anladım!
          </button>
        </div>
      </div>
    </div>
  )
}
