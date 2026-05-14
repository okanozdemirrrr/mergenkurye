/**
 * @file src/app/admin/components/modals/RestaurantDetailModal.tsx
 * @description B2B SaaS Kurallarına Uygun Restoran Finans Paneli (Hero Card Mimarisi)
 */
'use client'

import { useState, useEffect, useCallback } from 'react'
import { Package, Restaurant } from '@/types'
import { supabase } from '@/app/lib/supabase'
import { formatTurkishTime } from '@/utils/dateHelpers'
import { getPlatformBadgeClass, getPlatformDisplayName } from '@/app/lib/platformUtils'
import { getRestaurantFinancials, RestaurantFinancialsV2 } from '@/services/restaurantService'

interface RestaurantDetailModalProps {
  restaurantId: string
  globalStartDate: string
  globalEndDate: string
  onClose: () => void
  onPaymentClick: (guncelBakiye: number) => void
  restaurant: Restaurant
  onRefetch?: number 
}

export function RestaurantDetailModal({
  restaurantId,
  globalStartDate,
  globalEndDate,
  onClose,
  onPaymentClick,
  restaurant,
  onRefetch,
}: RestaurantDetailModalProps) {
  // Sipariş listesi (Periyot Tablosu)
  const [orders, setOrders] = useState<Package[]>([])
  
  // Finansal Veriler (RPC'den gelen)
  const [financials, setFinancials] = useState<RestaurantFinancialsV2 | null>(null)
  
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'orders' | 'payments'>('orders')
  const [paymentHistory, setPaymentHistory] = useState<any[]>([])

  // Veri Çekme
  const fetchData = useCallback(async () => {
    setIsLoading(true)

    try {
      // 1. Süper Hızlı RPC Çağrısı (Kümülatif + Periyot tek seferde)
      const finResult = await getRestaurantFinancials(restaurantId, globalStartDate, globalEndDate)
      if (finResult.success && finResult.data) {
        setFinancials(finResult.data)
      } else {
        console.error('❌ Finansal özet hatası:', finResult.error)
      }

      // 2. Sadece tabloyu doldurmak için gerekli olan dönem siparişleri
      const start = new Date(globalStartDate)
      start.setHours(0, 0, 0, 0)
      const end = new Date(globalEndDate)
      end.setHours(23, 59, 59, 999)

      const { data: deliveredData, error: delErr } = await supabase
        .from('packages')
        .select('*, couriers!delivered_by_courier_id(full_name)')
        .eq('restaurant_id', restaurantId)
        .eq('status', 'delivered')
        .gte('delivered_at', start.toISOString())
        .lte('delivered_at', end.toISOString())

      if (delErr) throw delErr

      const { data: cancelledData, error: canErr } = await supabase
        .from('packages')
        .select('*, couriers!delivered_by_courier_id(full_name)')
        .eq('restaurant_id', restaurantId)
        .eq('status', 'cancelled')
        .eq('is_chargeable_cancellation', true)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())

      if (canErr) throw canErr

      const combined = [
        ...(deliveredData || []),
        ...(cancelledData || []),
      ]
        .map((pkg: any) => ({
          ...pkg,
          courier_name: pkg.couriers?.full_name,
          couriers: undefined,
        }))
        .sort(
          (a, b) =>
            new Date(b.delivered_at || b.created_at || 0).getTime() -
            new Date(a.delivered_at || a.created_at || 0).getTime()
        )

      setOrders(combined)
    } catch (error: any) {
      console.error('❌ Veri hatası:', error.message)
      setOrders([])
    } finally {
      setIsLoading(false)
    }
  }, [restaurantId, globalStartDate, globalEndDate])

  const fetchPaymentHistory = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('restaurant_payment_transactions')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error
      setPaymentHistory(data || [])
    } catch (error: any) {
      console.error('❌ Ödeme geçmişi hatası:', error.message)
      setPaymentHistory([])
    }
  }, [restaurantId])

  useEffect(() => {
    fetchData()
    fetchPaymentHistory()
  }, [fetchData, fetchPaymentHistory])

  useEffect(() => {
    if (onRefetch !== undefined) {
      fetchData()
      fetchPaymentHistory()
    }
  }, [onRefetch])

  const guncelBakiye = financials?.current_balance ?? 0

  return (
    <div
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClose() }}
    >
      <div
        className="bg-slate-950 border border-slate-800 rounded-xl max-w-6xl w-full max-h-[95vh] overflow-hidden shadow-2xl flex flex-col"
        onClick={(e) => { e.preventDefault(); e.stopPropagation() }}
      >
        {/* ── Header Bar ── */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-4 flex-1">
            <h3 className="text-xl font-bold text-slate-100 tracking-tight">
              {restaurant.name} <span className="text-slate-500 font-normal">| Finans Yönetimi</span>
            </h3>

            {/* Tarih Filtresi Barı */}
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg p-1">
              <span className="px-3 py-1.5 text-slate-300 text-sm font-medium">
                {globalStartDate}
              </span>
              <span className="text-slate-600">-</span>
              <span className="px-3 py-1.5 text-slate-300 text-sm font-medium">
                {globalEndDate}
              </span>
            </div>

            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); fetchData(); fetchPaymentHistory() }}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-sm border border-slate-700 transition-colors"
              title="Yenile"
            >
              🔄
            </button>
          </div>

          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClose() }}
            className="flex items-center justify-center w-8 h-8 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded transition-colors text-2xl font-light"
          >
            ×
          </button>
        </div>

        {/* ── Scrollable Content ── */}
        <div className="overflow-y-auto flex-1 admin-scrollbar">
          {isLoading ? (
            <div className="text-center py-24 text-slate-500">
              <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm font-medium">Veriler Hesaplanıyor (RPC)...</p>
            </div>
          ) : (
            <div className="p-6 space-y-6">
              
              {/* ── 1. DEV HERO CARD (GÜNCEL KÜMÜLATİF BAKİYE) ── */}
              <div className={`rounded-2xl p-8 border-2 shadow-2xl relative overflow-hidden ${
                guncelBakiye > 0 
                  ? 'bg-gradient-to-br from-emerald-900/80 to-slate-900 border-emerald-500/50 shadow-emerald-900/20' 
                  : guncelBakiye < 0
                  ? 'bg-gradient-to-br from-rose-900/80 to-slate-900 border-rose-500/50 shadow-rose-900/20'
                  : 'bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 shadow-slate-900/50'
              }`}>
                {/* BG Glow */}
                <div className={`absolute top-0 right-0 w-96 h-96 bg-white opacity-[0.02] blur-3xl rounded-full translate-x-1/3 -translate-y-1/3 pointer-events-none`} />
                
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
                  <div>
                    <h2 className="text-slate-300 font-bold tracking-widest uppercase text-sm mb-2 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
                      Güncel Kümülatif Bakiye
                    </h2>
                    <div className="flex items-baseline gap-2">
                      <span className="text-6xl font-black text-white tracking-tighter">
                        {Math.abs(guncelBakiye).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                      </span>
                      <span className="text-3xl text-white/60 font-bold">₺</span>
                    </div>
                    <p className="text-white/60 text-sm mt-2 font-medium">
                      {guncelBakiye > 0 
                        ? 'Restoranın size ödemesi gereken net tutar' 
                        : guncelBakiye < 0 
                        ? 'Restoranın sizden alacağı tutar (Fazla ödenmiş)'
                        : 'Hesaplar sıfırlandı, borç yok'}
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 min-w-[200px]">
                    <button
                      onClick={() => onPaymentClick(guncelBakiye)}
                      className={`w-full py-4 px-6 rounded-xl font-black text-lg transition-all shadow-lg ${
                        guncelBakiye > 0 
                          ? 'bg-emerald-500 hover:bg-emerald-400 text-emerald-950 shadow-emerald-500/30'
                          : 'bg-slate-100 hover:bg-white text-slate-900 shadow-white/10'
                      }`}
                    >
                      💳 HESAP ÖDE
                    </button>
                    <div className="text-xs text-center text-white/40 font-medium">
                      Tüm zamanların hesabı
                    </div>
                  </div>
                </div>
              </div>

              {/* ── 2. DÖNEM EKSTRESİ BÖLÜMÜ ── */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-slate-200 tracking-tight flex items-center gap-2">
                    📅 Dönem Ekstresi
                    <span className="text-xs font-normal text-slate-500 bg-slate-900 border border-slate-800 px-2 py-1 rounded">
                      {globalStartDate} — {globalEndDate}
                    </span>
                  </h3>
                  
                  {/* Tab Geçişi */}
                  <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-800">
                    <button
                      onClick={() => setActiveTab('orders')}
                      className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                        activeTab === 'orders' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-300'
                      }`}
                    >
                      Siparişler
                    </button>
                    <button
                      onClick={() => setActiveTab('payments')}
                      className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                        activeTab === 'payments' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-300'
                      }`}
                    >
                      Ödemeler
                    </button>
                  </div>
                </div>

                {activeTab === 'orders' ? (
                  <>
                    {/* Periyot Finansal Özet Kartları */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                        <p className="text-xs font-bold text-slate-500 tracking-widest uppercase mb-1">Dönem Cirosu</p>
                        <p className="text-2xl font-black text-slate-200">
                          {(financials?.period.revenue ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                        </p>
                        <p className="text-xs text-slate-500 mt-1">{financials?.period.delivered_count ?? 0} teslim edilen paket</p>
                      </div>
                      
                      <div className="bg-rose-950/20 border border-rose-900/30 rounded-xl p-5">
                        <p className="text-xs font-bold text-rose-500/70 tracking-widest uppercase mb-1">Dönem Masrafı</p>
                        <p className="text-2xl font-black text-rose-400">
                          {(financials?.period.cost ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                        </p>
                        <p className="text-xs text-rose-500/50 mt-1">
                          {financials?.period.total_package_count ?? 0} paket × {financials?.package_fee ?? 0}₺
                        </p>
                      </div>

                      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                        <p className="text-xs font-bold text-slate-500 tracking-widest uppercase mb-1">Net (Sadece Bu Dönem)</p>
                        <p className="text-2xl font-black text-slate-300">
                          {((financials?.period.revenue ?? 0) - (financials?.period.cost ?? 0)).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                        </p>
                        <p className="text-xs text-slate-500 mt-1">Sadece bu tarih aralığındaki kâr</p>
                      </div>
                    </div>

                    {/* Sipariş Tablosu */}
                    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                      {orders.length === 0 ? (
                        <div className="text-center py-16 text-slate-500">
                          <p>Bu tarih aralığında sipariş bulunamadı</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm text-left">
                            <thead className="text-xs text-slate-400 uppercase bg-slate-950/50 border-b border-slate-800">
                              <tr>
                                <th className="px-6 py-4 font-medium">No</th>
                                <th className="px-6 py-4 font-medium">Oluşturulma</th>
                                <th className="px-6 py-4 font-medium">Müşteri</th>
                                <th className="px-6 py-4 font-medium">Kurye</th>
                                <th className="px-6 py-4 font-medium">Tutar</th>
                                <th className="px-6 py-4 font-medium">Teslim Tarihi</th>
                                <th className="px-6 py-4 font-medium text-right">Durum</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50">
                              {orders.map((order) => (
                                <tr key={order.id} className="hover:bg-slate-800/30 transition-colors">
                                  <td className="px-6 py-4 font-medium text-slate-300">
                                    {order.order_number || '......'}
                                  </td>
                                  <td className="px-6 py-4 text-slate-400">
                                    {formatTurkishTime(order.created_at)}
                                  </td>
                                  <td className="px-6 py-4 text-slate-400 truncate max-w-[120px]">{order.customer_name}</td>
                                  <td className="px-6 py-4 text-slate-500">{order.courier_name || '-'}</td>
                                  <td className="px-6 py-4 font-bold text-slate-300 whitespace-nowrap">{order.amount} ₺</td>
                                  <td className="px-6 py-4 text-slate-400 whitespace-nowrap">
                                    {order.delivered_at 
                                      ? new Date(order.delivered_at).toLocaleString('tr-TR', {
                                          day: '2-digit',
                                          month: 'short',
                                          hour: '2-digit',
                                          minute: '2-digit',
                                          timeZone: 'Europe/Istanbul'
                                        }).replace(', ', ' - ')
                                      : '-'}
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                    {order.status === 'cancelled' ? (
                                      <span className="px-2 py-1 bg-rose-500/10 text-rose-400 rounded text-xs font-bold border border-rose-500/20">
                                        İptal (Ücretli)
                                      </span>
                                    ) : (
                                      <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded text-xs font-bold border border-emerald-500/20">
                                        Teslim Edildi
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  /* Ödeme Geçmişi */
                  <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                    {paymentHistory.length === 0 ? (
                      <div className="text-center py-16 text-slate-500">
                        <p>Henüz ödeme kaydı bulunmuyor</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-800/50">
                        {paymentHistory.map((payment) => (
                          <div key={payment.id} className="p-6 flex justify-between items-center hover:bg-slate-800/30">
                            <div>
                              <p className="font-medium text-slate-300">
                                {new Date(payment.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                              </p>
                              {payment.notes && <p className="text-sm text-slate-500 mt-1">{payment.notes}</p>}
                            </div>
                            <div className="text-2xl font-black text-emerald-400">
                              + {payment.amount_paid.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
