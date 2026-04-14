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
      const { data, error } = await supabase
        .from('packages')
        .select('amount, payment_method')
        .eq('courier_id', courierId)
        .eq('status', 'delivered')
        .gte('delivered_at', `${startDate}T00:00:00`)
        .lte('delivered_at', `${endDate}T23:59:59`)

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

  // FİNANSAL HESAPLAMA - Tüm geçmiş (startDate KULLANILMAZ!)
  const calculateLifetimeTotals = async () => {
    try {
      // Tüm teslimatlar (başlangıçtan endDate'e kadar)
      const { data: allPackages, error: packagesError } = await supabase
        .from('packages')
        .select('amount')
        .eq('courier_id', courierId)
        .eq('status', 'delivered')
        .lte('delivered_at', `${endDate}T23:59:59`) // Sadece endDate kullan!

      if (packagesError) throw packagesError

      const totalOwed = (allPackages || []).reduce((sum, p) => sum + (p.amount || 0), 0)

      // Tüm ödemeler (başlangıçtan endDate'e kadar)
      const { data: allSettlements, error: settlementsError } = await supabase
        .from('courier_settlements')
        .select('amount_paid')
        .eq('courier_id', courierId)
        .lte('created_at', `${endDate}T23:59:59`) // Sadece endDate kullan!

      if (settlementsError) throw settlementsError

      const totalPaid = (allSettlements || []).reduce((sum, s) => sum + (s.amount_paid || 0), 0)

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

        {/* Kalan Borç (Seçili Aralık Toplam) - REALTIME GÜNCELLENEN */}
        <div className="bg-slate-800/50 px-2 py-2 rounded-lg col-span-3">
          <p className="text-[10px] text-slate-400 mb-1">💰 Kalan Borç</p>
          <p className="text-base font-bold text-purple-400">
            {remainingDebt.toFixed(2)}₺
          </p>
          <p className="text-[8px] text-slate-500 mt-1">
            {remainingDebt === 0 ? '✅ Hesap kapatıldı' : '⏳ Ödeme bekleniyor'}
          </p>
        </div>
      </div>
    </div>
  )
}
