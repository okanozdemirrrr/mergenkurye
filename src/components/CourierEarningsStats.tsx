/**
 * @file src/components/CourierEarningsStats.tsx
 * @description Kurye dönem özeti — admin gün sonu mutabakatı ile aynı (settled_at)
 */
'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/app/lib/supabase'
import { fetchCourierPeriodAccount } from '@/utils/courierAccount'

interface CourierEarningsStatsProps {
  courierId: string
  startDate: string
  endDate: string
}

export function CourierEarningsStats({ courierId, startDate, endDate }: CourierEarningsStatsProps) {
  const [account, setAccount] = useState({
    cash: 0,
    card: 0,
    iban: 0,
    count: 0,
    payableDebt: 0,
  })
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!courierId || !startDate || !endDate) return
    setLoading(true)
    try {
      const data = await fetchCourierPeriodAccount(supabase, courierId, startDate, endDate)
      setAccount({
        cash: data.cash,
        card: data.card,
        iban: data.iban,
        count: data.count,
        payableDebt: data.payableDebt,
      })
    } catch (error) {
      console.error('❌ Dönem özeti hesaplanamadı:', error)
    } finally {
      setLoading(false)
    }
  }, [courierId, startDate, endDate])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    const channel = supabase
      .channel(`courier-settlements-${courierId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'courier_settlements',
          filter: `courier_id=eq.${courierId}`,
        },
        () => refresh()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [courierId, refresh])

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
      <p className="text-[10px] text-slate-500 mb-2 text-center">
        Admin mutabakatı ile aynı · henüz kapatılmamış tahsilat (settled_at boş)
      </p>
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-slate-800/50 px-2 py-2 rounded-lg">
          <p className="text-[10px] text-slate-400 mb-1">📦 Paket</p>
          <p className="text-base font-bold text-blue-400">{account.count}</p>
        </div>
        <div className="bg-slate-800/50 px-2 py-2 rounded-lg">
          <p className="text-[10px] text-slate-400 mb-1">💵 Nakit</p>
          <p className="text-base font-bold text-green-400">{account.cash.toFixed(0)}₺</p>
        </div>
        <div className="bg-slate-800/50 px-2 py-2 rounded-lg">
          <p className="text-[10px] text-slate-400 mb-1">💳 Kart</p>
          <p className="text-base font-bold text-blue-400">{account.card.toFixed(0)}₺</p>
        </div>
        <div className="bg-slate-800/50 px-2 py-2 rounded-lg">
          <p className="text-[10px] text-slate-400 mb-1">🏦 IBAN</p>
          <p className="text-base font-bold text-orange-400">{account.iban.toFixed(0)}₺</p>
        </div>
        <div className="bg-gradient-to-br from-orange-900/50 to-red-900/50 border-2 border-orange-500/50 px-3 py-3 rounded-lg col-span-2 shadow-lg">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-bold text-orange-200">💰 Bu dönem ödenecek</p>
            {account.payableDebt === 0 && (
              <span className="text-xs bg-green-500/20 text-green-300 px-2 py-0.5 rounded">✅ Kapatıldı</span>
            )}
          </div>
          <p className="text-2xl font-black text-orange-100">{account.payableDebt.toFixed(2)}₺</p>
          <p className="text-[9px] text-orange-300 mt-1">
            Nakit + Kart + IBAN − bu dönemdeki mutabakat ödemeleri
          </p>
        </div>
      </div>
    </div>
  )
}
