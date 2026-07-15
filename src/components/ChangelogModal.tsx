'use client'

import { useEffect, useState } from 'react'
import {
  Rocket, X, Smartphone, Wallet, Clock, CreditCard, Wrench, Sparkles,
} from 'lucide-react'
import { supabase } from '@/app/lib/supabase'

interface ChangelogModalProps {
  userType: 'courier' | 'restaurant' | 'admin'
  userId: string | null
}

const FEATURES = [
  {
    icon: Smartphone,
    title: 'Tam Mobil Uyumluluk',
    description:
      'Restoran paneli artık telefonlarda kusursuz çalışıyor. 3\'lü finansal kartlarla net kârınızı telefondan anında görün.',
  },
  {
    icon: Wallet,
    title: 'Gelişmiş Finansal Mutabakat',
    description:
      'Kurye gün sonu ve hakediş hesaplamaları tamamen şeffaf ve yeni nesil \'Business\' tasarıma geçirildi.',
  },
  {
    icon: Clock,
    title: 'Detaylı Sipariş Zaman Çizelgesi',
    description:
      'Siparişlerin oluşturulma, hazırlanma, kuryeye atanma ve teslim edilme saatleri saniyesi saniyesine geri getirildi.',
  },
  {
    icon: CreditCard,
    title: 'Kurye Kazanç Yönetimi',
    description:
      'Kuryelerin ödenmemiş paketleri ve hakedişleri artık sistem üzerinden tek tıkla (\'Öde\' butonu ile) yönetiliyor.',
  },
  {
    icon: Wrench,
    title: 'Sistem Hızlandırması',
    description:
      'Ekranların kapanmama, donma veya yanlış tarih getirme hataları (bug\'lar) sıfırdan yazılan \'Stateless\' mimariyle kökünden çözüldü.',
  },
]

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
    setIsVisible(false)

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

  if (isChecking || !isVisible) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-white/5 rounded-md shadow-sm max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-slate-900 border-b border-white/5 p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-600/20 rounded-md flex items-center justify-center">
              <Rocket className="w-5 h-5 text-purple-400" strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white">Alda-Gel Kurye v2.0</h2>
              <p className="text-sm text-slate-400">Güncelleme Yayında!</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-white transition-colors p-2 hover:bg-slate-800 rounded-md"
          >
            <X className="w-6 h-6" strokeWidth={1.5} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <p className="text-slate-300 text-lg leading-relaxed">
            Sistemimizi sizin için daha hızlı, daha güvenilir ve daha kullanışlı hale getirdik. İşte yeni özellikler:
          </p>

          <div className="space-y-4">
            {FEATURES.map((feature) => {
              const Icon = feature.icon
              return (
                <div
                  key={feature.title}
                  className="bg-slate-800/50 border border-white/5 rounded-md p-4 hover:border-white/10 transition-colors shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-slate-700/50 rounded-md flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5 text-slate-300" strokeWidth={1.5} />
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-lg mb-1">{feature.title}</h3>
                      <p className="text-slate-400 text-sm leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-white/5 rounded-md p-4 shadow-sm">
            <p className="text-purple-200 text-sm text-center leading-relaxed">
              Daha iyi bir deneyim için çalışmaya devam ediyoruz. Geri bildirimleriniz bizim için çok değerli!
            </p>
          </div>

          <button
            onClick={handleClose}
            className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white text-lg font-bold rounded-md transition-all shadow-sm hover:shadow-sm inline-flex items-center justify-center gap-2"
          >
            <Sparkles size={18} strokeWidth={1.5} />
            Harika, Anladım!
          </button>
        </div>
      </div>
    </div>
  )
}
