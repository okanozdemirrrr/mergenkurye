/**
 * @file src/components/CourierEarningsStats.tsx
 * @description Kurye Kazanç İstatistikleri Komponenti (Realtime Gün Sonu Mutabakatı ile)
 * 
 * ÖNEMLİ KURALLAR:
 * 1. Nakit, Kart, IBAN değerleri ASLA değişmez (teslim edilen paketlerin MUTLAK toplamı)
 * 2. "Seçili Aralık Toplam" = Kalan Borç (Remaining Debt)
 * 3. Kalan Borç = Math.max(0, Toplam Teslimat - Ödenen Tutar)
 * 4. Realtime: courier_settlements tablosundaki değişiklikler anında yansır
 */
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/app/lib/supabase'

interface CourierEarningsStatsProps {
  courierId: string
  startDate: string
  endDate: string
}

interface Package {
  amount: number
  payment_method: 'cash' | 'card' | 'iban' | null
}

export function CourierEarningsStats({ courierId, startDate, endDate }: CourierEarningsStatsProps) {
  const [cashTotal, setCashTotal] = useState(0)
  const [cardTotal, setCardTotal] = useState(0)
  const [ibanTotal, setIbanTotal] = useState(0)
  const [remainingDebt, setRemainingDebt] = useState(0)
  const [loading, setLoading] = useState(true)

  // Teslim edilen paketlerin toplamını hesapla (GÖRSEL - Tarih aralığına göre)
  const calculateDeliveryTotals = async () => {
    try {
      // datetime-local formatından ISO timestamp'e çevir
      const startDateTime = new Date(startDate).toISOString()
      const endDateTime = new Date(endDate).toISOString()

      const { data, error } = await supabase
        .from('packages')
        .select('amount, payment_method')
        .eq('delivered_by_courier_id', courierId)  // courier_id yerine delivered_by_courier_id
        .eq('status', 'delivered')
        .gte('delivered_at', startDateTime)
        .lte('delivered_at', endDateTime)

      if (error) throw error

      const packages = data || []

      const cash = packages
        .filter(p => p.payment_method === 'cash')
        .reduce((sum, p) => sum + (p.amount || 0), 0)

      const card = packages
        .filter(p => p.payment_method === 'card')
        .reduce((sum, p) => sum + (p.amount || 0), 0)

      const iban = packages
        .filter(p => p.payment_method === 'iban')
        .reduce((sum, p) => sum + (p.amount || 0), 0)

      setCashTotal(cash)
      setCardTotal(card)
      setIbanTotal(iban)

      // Bu değer sadece görsel için, finansal hesaplamada kullanılmaz
      return cash + card + iban
    } catch (error) {
      console.error('❌ Teslimat toplamları hesaplanamadı:', error)
      return 0
    }
  }

  // FİNANSAL HESAPLAMA - TÜM ZAMANLARIN TOPLAMI (TARİH FİLTRESİNDEN BAĞIMSIZ!)
  const calculateLifetimeTotals = async () => {
    try {
      // TÜM ZAMANLARIN teslimatları (tarih filtresi YOK!)
      const { data: allPackages, error: packagesError } = await supabase
        .from('packages')
        .select('amount')
        .eq('delivered_by_courier_id', courierId)  // courier_id yerine delivered_by_courier_id
        .eq('status', 'delivered')
        // ⚠️ TARİH FİLTRESİ YOK - Tüm geçmiş dahil!

      if (packagesError) throw packagesError

      const totalOwed = (allPackages || []).reduce((sum, p) => sum + (p.amount || 0), 0)

      // TÜM ZAMANLARIN ödemeleri (tarih filtresi YOK!)
      const { data: allSettlements, error: settlementsError } = await supabase
        .from('courier_settlements')
        .select('amount_paid')
        .eq('courier_id', courierId)
        // ⚠️ TARİH FİLTRESİ YOK - Tüm geçmiş dahil!

      if (settlementsError) throw settlementsError

      const totalPaid = (allSettlements || []).reduce((sum, s) => sum + (s.amount_paid || 0), 0)

      console.log('💰 CARİ HESAP HESAPLAMASI:', {
        totalOwed: totalOwed.toFixed(2),
        totalPaid: totalPaid.toFixed(2),
        remainingDebt: Math.max(0, totalOwed - totalPaid).toFixed(2)
      })

      return { totalOwed, totalPaid }
    } catch (error) {
      console.error('❌ Finansal hesaplama hatası:', error)
      return { totalOwed: 0, totalPaid: 0 }
    }
  }

  // Kalan borcu hesapla (CARİ HESAP MANTIĞI)
  const calculateRemainingDebt = async () => {
    // Görsel değerleri hesapla (tarih aralığına göre)
    await calculateDeliveryTotals()

    // Finansal değerleri hesapla (tüm geçmiş)
    const { totalOwed, totalPaid } = await calculateLifetimeTotals()

    // Kalan Borç = Toplam Borç - Toplam Ödeme
    // Negatif olamaz (fazla ödeme = bahşiş, borç 0 olur)
    const debt = Math.max(0, totalOwed - totalPaid)
    setRemainingDebt(debt)
    setLoading(false)
  }

  // İlk yükleme
  useEffect(() => {
    calculateRemainingDebt()
  }, [courierId, startDate, endDate])

  // Realtime subscription - courier_settlements tablosunu dinle
  useEffect(() => {
    let pollingInterval: NodeJS.Timeout | null = null

    // Realtime subscription
    const channel = supabase
      .channel('courier-settlements-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'courier_settlements',
          filter: `courier_id=eq.${courierId}`
        },
        (payload) => {
          console.log('🔔 Realtime: Gün sonu mutabakatı güncellendi:', payload)
          // Kalan borcu yeniden hesapla (Nakit/Kart/IBAN değişmez!)
          calculateRemainingDebt()
        }
      )
      .subscribe((status) => {
        console.log('📡 Realtime subscription status:', status)
        
        // Eğer realtime bağlantı kurulamazsa, polling fallback
        if (status === 'SUBSCRIPTION_ERROR' || status === 'CHANNEL_ERROR') {
          console.warn('⚠️ Realtime çalışmıyor, polling fallback aktif')
          
          // Her 5 saniyede bir kontrol et
          pollingInterval = setInterval(() => {
            console.log('🔄 Polling: Kalan borç kontrol ediliyor...')
            calculateRemainingDebt()
          }, 5000)
        }
      })

    return () => {
      supabase.removeChannel(channel)
      if (pollingInterval) {
        clearInterval(pollingInterval)
      }
    }
  }, [courierId, startDate, endDate])

  if (loading) {
    return (
      <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
        <div className="flex items-center justify-center py-4">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
      <div className="grid grid-cols-3 gap-2">
        {/* Nakit - DEĞİŞMEZ */}
        <div className="bg-slate-800/50 px-2 py-2 rounded-lg">
          <p className="text-[10px] text-slate-400 mb-1">💵 Nakit</p>
          <p className="text-base font-bold text-green-400">
            {cashTotal.toFixed(0)}₺
          </p>
        </div>

        {/* Kart - DEĞİŞMEZ */}
        <div className="bg-slate-800/50 px-2 py-2 rounded-lg">
          <p className="text-[10px] text-slate-400 mb-1">💳 Kart</p>
          <p className="text-base font-bold text-blue-400">
            {cardTotal.toFixed(0)}₺
          </p>
        </div>

        {/* IBAN - DEĞİŞMEZ */}
        <div className="bg-slate-800/50 px-2 py-2 rounded-lg">
          <p className="text-[10px] text-slate-400 mb-1">🏦 IBAN</p>
          <p className="text-base font-bold text-orange-400">
            {ibanTotal.toFixed(0)}₺
          </p>
        </div>

        {/* Kalan Borç / Ödenecek Tutar - REALTIME GÜNCELLENEN - VURGULU UI */}
        <div className="bg-gradient-to-br from-orange-900/50 to-red-900/50 border-2 border-orange-500/50 px-3 py-3 rounded-lg col-span-3 shadow-lg">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-bold text-orange-200">💰 Kalan Borç / Ödenecek Tutar</p>
            {remainingDebt === 0 && <span className="text-xs bg-green-500/20 text-green-300 px-2 py-0.5 rounded">✅ Kapatıldı</span>}
          </div>
          <p className="text-2xl font-black text-orange-100">
            {remainingDebt.toFixed(2)}₺
          </p>
          <p className="text-[9px] text-orange-300 mt-1">
            {remainingDebt === 0 
              ? 'Tüm hesaplar kapatıldı, yeni teslimatlar için hazırsınız' 
              : 'Yöneticiye ödemeniz gereken güncel net borç (geçmiş ödemeler düşülmüş)'}
          </p>
        </div>
      </div>
    </div>
  )
}
