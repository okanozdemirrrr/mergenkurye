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
import { getRestaurantPeriodFinancials, PeriodFinancials } from '@/services/restaurantService'

// 📌 KATMAN 3: Saniye Saniye Paket Yaşam Döngüsü (Vertical Timeline)
function DrawerOrderRow({ pkg }: { pkg: Package }) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Saniye saniye zaman damgalarını biçimlendir (Güvenli Tarih Formatlama)
  const formatTimelineTime = (isoString?: string | null) => {
    if (!isoString) return null
    try {
      const date = new Date(isoString)
      if (isNaN(date.getTime())) return null
      return {
        time: date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
        date: date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })
      }
    } catch (e) {
      return null
    }
  }

  // Kart başlığındaki tarihi güvenli biçimlendir
  const safeFormatHeaderDate = (isoString?: string | null) => {
    if (!isoString) return '-'
    try {
      const date = new Date(isoString)
      if (isNaN(date.getTime())) return '-'
      return date.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
    } catch (e) {
      return '-'
    }
  }

  // Accordion içeriğini güvenli şekilde render eden fonksiyon (Try-Catch Sarmalı)
  const renderAccordionContent = () => {
    try {
      // Akış aşamaları (Optional Chaining & Fallback)
      const steps = [
        { label: 'Siparişin Sisteme Düşmesi (Yeni Sipariş)', time: pkg?.created_at, icon: '📥', color: 'emerald' },
        { label: 'Hazırlanmaya Başlanması', time: pkg?.getting_ready_at, icon: '👨‍🍳', color: 'emerald' },
        { label: 'Hazır Olması', time: pkg?.ready_at, icon: '✅', color: 'emerald' },
        { label: 'Kuryenin Kabul Etmesi', time: pkg?.assigned_at, icon: '🛵', color: 'emerald' },
        { label: 'Kuryenin Restorandan Teslim Alması', time: pkg?.picked_up_at, icon: '📦', color: 'emerald' },
        pkg?.status === 'cancelled'
          ? { label: 'Siparişin İptal Edilmesi', time: pkg?.cancelled_at, icon: '❌', color: 'rose' }
          : { label: 'Müşteriye Teslim Edilmesi', time: pkg?.delivered_at, icon: '🏁', color: 'emerald' },
      ]

      return (
        <div className="p-4 border-t border-slate-850 bg-slate-950/40 space-y-4">
          {/* Müşteri ve Sipariş Detay Bilgisi (Optional Chaining & Fallback) */}
          <div className="grid grid-cols-2 gap-3 bg-slate-900/60 p-3 rounded-lg border border-slate-800/80 text-xs">
            <div>
              <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">👤 Müşteri Bilgileri</p>
              <p className="text-slate-300 font-semibold">{pkg?.customer_name ?? 'Bilinmeyen Müşteri'}</p>
              {pkg?.customer_phone && (
                <p className="text-slate-400 mt-0.5 font-medium">{pkg.customer_phone}</p>
              )}
            </div>
            <div>
              <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">🛵 Teslimat Bilgisi</p>
              <p className="text-slate-300 font-semibold">{pkg?.courier_name ?? 'Atanmadı'}</p>
              <p className="text-slate-400 truncate mt-0.5 font-medium" title={pkg?.delivery_address ?? 'Adres Belirtilmemiş'}>
                📍 {pkg?.delivery_address ?? 'Adres Belirtilmemiş'}
              </p>
            </div>
          </div>

          {/* Dikey Zaman Çizelgesi */}
          <div className="pl-1 pr-1 py-1">
            <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-3">🕒 DENETİM İZİ (AUDIT LOG)</p>
            <div className="relative border-l border-slate-850 ml-3 space-y-5">
              {steps.map((step, idx) => {
                const formatted = formatTimelineTime(step.time)
                const isCompleted = !!formatted

                return (
                  <div key={idx} className="relative pl-6">
                    {/* Durum Dairesi */}
                    <span 
                      className={`absolute -left-3 top-0.5 w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] z-10 transition-all ${
                        isCompleted 
                          ? step.color === 'rose'
                            ? 'bg-rose-950/80 border-rose-500 text-rose-400'
                            : 'bg-emerald-950/80 border-emerald-500 text-emerald-400'
                          : 'bg-slate-950 border-slate-850 text-slate-600'
                      }`}
                    >
                      {step.icon}
                    </span>

                    {/* Çizgi rengini bağlama */}
                    {idx < steps.length - 1 && (
                      <span 
                        className={`absolute left-[-1px] top-6 w-[2px] h-[calc(100%+12px)] pointer-events-none -translate-x-1/2 z-0 ${
                          isCompleted && !!steps[idx + 1]?.time
                            ? 'bg-emerald-500/40'
                            : 'bg-slate-850'
                        }`}
                      />
                    )}

                    {/* Aşama Başlığı ve Tarihi */}
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-1">
                      <p className={`text-xs font-semibold ${isCompleted ? 'text-slate-200' : 'text-slate-500'}`}>
                        {step.label}
                      </p>
                      {isCompleted ? (
                        <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                          <span className="bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 text-slate-300">
                            {formatted.time}
                          </span>
                          <span className="text-slate-500">
                            {formatted.date}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-600 italic">Gerçekleşmedi</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )
    } catch (err: any) {
      console.error("❌ Accordion render hatası:", err)
      return (
        <div className="p-4 border-t border-slate-850 bg-rose-950/10 text-rose-400 text-xs rounded-b-xl">
          ⚠️ Sipariş detayları yüklenirken bir hata oluştu. Bazı veriler eksik veya bozuk olabilir.
        </div>
      )
    }
  }

  return (
    <div className="bg-slate-900 border border-slate-800/80 rounded-xl overflow-hidden transition-all duration-200">
      {/* Kart Başlığı (Accordion Toggle) */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-slate-800/40 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-slate-300">
            #{pkg?.order_number || pkg?.id}
          </span>
          <span className="text-xs text-slate-500 font-medium">
            {safeFormatHeaderDate(pkg?.created_at)}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="font-extrabold text-slate-200 text-sm">
            {(pkg?.amount ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
          </span>
          {pkg?.status === 'cancelled' ? (
            <span className="px-2 py-0.5 bg-rose-500/10 text-rose-400 rounded text-[10px] font-bold border border-rose-500/20 uppercase tracking-wider">
              İptal (Ücretli)
            </span>
          ) : (
            <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded text-[10px] font-bold border border-emerald-500/20 uppercase tracking-wider">
              Teslim Edildi
            </span>
          )}
          <span className={`text-slate-400 text-xs transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </div>
      </button>

      {/* Accordion Detayı */}
      {isExpanded && renderAccordionContent()}
    </div>
  )
}

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
  
  // Finansal Veriler (Yeni Paket Bazlı Sistem)
  const [financials, setFinancials] = useState<PeriodFinancials | null>(null)
  
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'orders' | 'payments'>('orders')
  const [paymentHistory, setPaymentHistory] = useState<any[]>([])

  // ── KATMAN 2: İlgili Dönemin Paket Listesi (Sliding Drawer) State'leri ──
  const [selectedPaymentForDetails, setSelectedPaymentForDetails] = useState<any | null>(null)
  const [drawerOrders, setDrawerOrders] = useState<Package[]>([])
  const [loadingDrawerOrders, setLoadingDrawerOrders] = useState(false)

  const fetchDrawerOrders = useCallback(async (payment: any) => {
    setLoadingDrawerOrders(true)
    try {
      // Ödemenin kapsadığı tarih aralığı
      const start = payment.period_start 
        ? new Date(payment.period_start) 
        : new Date(new Date(payment.created_at).getTime() - 14 * 24 * 60 * 60 * 1000) // Fallback 14 gün öncesi
      start.setHours(0, 0, 0, 0)

      const end = payment.period_end 
        ? new Date(payment.period_end) 
        : new Date(payment.created_at)
      end.setHours(23, 59, 59, 999)

      // Teslim edilen siparişler
      const { data: deliveredData, error: delErr } = await supabase
        .from('packages')
        .select('*, couriers!delivered_by_courier_id(full_name)')
        .eq('restaurant_id', restaurantId)
        .eq('status', 'delivered')
        .gte('delivered_at', start.toISOString())
        .lte('delivered_at', end.toISOString())

      if (delErr) throw delErr

      // Ücretli iptal edilen siparişler
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

      setDrawerOrders(combined)
    } catch (err: any) {
      console.error('❌ Drawer sipariş verisi hatası:', err.message)
      setDrawerOrders([])
    } finally {
      setLoadingDrawerOrders(false)
    }
  }, [restaurantId])

  useEffect(() => {
    if (selectedPaymentForDetails) {
      fetchDrawerOrders(selectedPaymentForDetails)
    } else {
      setDrawerOrders([])
    }
  }, [selectedPaymentForDetails, fetchDrawerOrders])

  // Veri Çekme
  const fetchData = useCallback(async () => {
    setIsLoading(true)

    try {
      // 1. Dönem Finansalları (Paket Bazlı is_paid Sistemi)
      const finResult = await getRestaurantPeriodFinancials(restaurantId, globalStartDate, globalEndDate)
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

  // 🔥 KRİTİK: onRefetch değiştiğinde (ödeme sonrası) verileri yeniden çek
  const [prevRefetch, setPrevRefetch] = useState<number | undefined>(onRefetch)
  useEffect(() => {
    if (onRefetch !== undefined && onRefetch !== prevRefetch) {
      setPrevRefetch(onRefetch)
      console.log('🔄 Ödeme sonrası refetch tetiklendi, RPC yeniden çağrılıyor...')
      fetchData()
      fetchPaymentHistory()
    }
  }, [onRefetch])

  const guncelBakiye = financials?.net_payable ?? 0
  const unpaidCount = financials?.unpaid_package_count ?? 0

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
              
              {/* ── 1. DEV HERO CARD (DÖNEM ÖDENMEMİŞ BAKİYE) ── */}
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
                      Dönem Ödenmemiş Bakiye
                    </h2>
                    <div className="flex items-baseline gap-2">
                      <span className="text-6xl font-black text-white tracking-tighter">
                        {Math.abs(guncelBakiye).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                      </span>
                      <span className="text-3xl text-white/60 font-bold">₺</span>
                    </div>
                    <p className="text-white/60 text-sm mt-2 font-medium">
                      {unpaidCount > 0 
                        ? `${unpaidCount} ödenmemiş paket (${globalStartDate} — ${globalEndDate})` 
                        : 'Bu dönemde ödenmemiş paket yok ✓'}
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 min-w-[200px]">
                    <button
                      onClick={() => onPaymentClick(guncelBakiye)}
                      disabled={unpaidCount === 0}
                      className={`w-full py-4 px-6 rounded-xl font-black text-lg transition-all shadow-lg ${
                        unpaidCount > 0 
                          ? 'bg-emerald-500 hover:bg-emerald-400 text-emerald-950 shadow-emerald-500/30'
                          : 'bg-slate-700 text-slate-400 cursor-not-allowed shadow-none'
                      }`}
                    >
                      {unpaidCount > 0 ? '💳 HESAP ÖDE' : '✓ ÖDENDİ'}
                    </button>
                    <div className="text-xs text-center text-white/40 font-medium">
                      Bitiş tarihine ({globalEndDate}) kadar olan tüm ödenmemiş bakiyeyi kapatır
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
                    {/* Dönem Finansal Özet Kartları (Paket Bazlı) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                        <p className="text-xs font-bold text-slate-500 tracking-widest uppercase mb-1">Ödenmemiş Ciro</p>
                        <p className="text-2xl font-black text-slate-200">
                          {(financials?.unpaid_revenue ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                        </p>
                        <p className="text-xs text-slate-500 mt-1">{financials?.unpaid_package_count ?? 0} ödenmemiş paket</p>
                      </div>
                      
                      <div className="bg-rose-950/20 border border-rose-900/30 rounded-xl p-5">
                        <p className="text-xs font-bold text-rose-500/70 tracking-widest uppercase mb-1">Kurye Masrafı</p>
                        <p className="text-2xl font-black text-rose-400">
                          {(financials?.unpaid_cost ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                        </p>
                        <p className="text-xs text-rose-500/50 mt-1">
                          {financials?.unpaid_package_count ?? 0} paket × {financials?.package_fee ?? 0}₺
                        </p>
                      </div>

                      <div className="bg-rose-950/20 border border-rose-900/30 rounded-xl p-5">
                        <p className="text-xs font-bold text-rose-500/70 tracking-widest uppercase mb-1">KOMİSYON KESİNTİSİ</p>
                        <p className="text-2xl font-black text-rose-400">
                          {(financials?.unpaid_commission ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                        </p>
                        <p className="text-xs text-rose-500/50 mt-1">Sistem komisyon kesintisi</p>
                      </div>

                      <div className={`border rounded-xl p-5 ${
                        (financials?.net_payable ?? 0) > 0 
                          ? 'bg-emerald-950/20 border-emerald-900/30' 
                          : 'bg-slate-900/50 border-slate-800'
                      }`}>
                        <p className="text-xs font-bold text-emerald-500/70 tracking-widest uppercase mb-1">Net Ödenecek</p>
                        <p className={`text-2xl font-black ${
                          (financials?.net_payable ?? 0) > 0 ? 'text-emerald-400' : 'text-slate-400'
                        }`}>
                          {(financials?.net_payable ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                        </p>
                        <p className="text-xs text-emerald-500/50 mt-1">Ciro - Masraf - Komisyon</p>
                      </div>

                      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                        <p className="text-xs font-bold text-slate-500 tracking-widest uppercase mb-1">Ödenmiş</p>
                        <p className="text-2xl font-black text-slate-500">
                          {(financials?.paid_revenue ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                        </p>
                        <p className="text-xs text-slate-600 mt-1">{financials?.paid_package_count ?? 0} ödenmiş paket ✓</p>
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
                      <div className="divide-y divide-slate-800/50 space-y-2 p-4">
                        {paymentHistory.map((payment) => (
                          <div 
                            key={payment.id} 
                            onClick={() => setSelectedPaymentForDetails(payment)}
                            className="p-6 flex justify-between items-center bg-slate-900/30 border border-slate-800 hover:bg-slate-850/40 hover:border-slate-700 rounded-xl cursor-pointer transition-all duration-200"
                          >
                            <div className="flex-1 pr-4">
                              <p className="font-bold text-slate-200 text-base">
                                {new Date(payment.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                              </p>
                              {payment.notes && <p className="text-sm text-slate-400 mt-1 font-medium">{payment.notes}</p>}
                              
                              {/* Kapsanan Tarih Dönemi (Katman 1) */}
                              <p className="text-xs text-slate-500 mt-2.5 flex items-center gap-1 font-medium bg-slate-950/60 border border-slate-900 px-2.5 py-1 rounded-md w-fit">
                                📅 Kapsanan Dönem: {payment.period_start && payment.period_end ? (
                                  <>
                                    <span className="text-slate-400 font-semibold">
                                      {new Date(payment.period_start).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </span>
                                    <span className="text-slate-600">-</span>
                                    <span className="text-slate-400 font-semibold">
                                      {new Date(payment.period_end).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </span>
                                  </>
                                ) : (
                                  <span className="text-slate-500 font-semibold italic">Tüm Zamanlar / Belirtilmemiş</span>
                                )}
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <span className="text-2xl font-black text-emerald-400 tracking-tight">
                                  + {payment.amount_paid.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                                </span>
                              </div>
                              <span className="text-slate-500 text-lg transition-transform hover:translate-x-1 duration-200">
                                ➔
                              </span>
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

      {/* Backdrop */}
      {selectedPaymentForDetails && (
        <div 
          className="fixed inset-0 bg-black/60 z-[60] backdrop-blur-sm transition-opacity duration-300"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSelectedPaymentForDetails(null) }}
        />
      )}

      {/* ── KATMAN 2 & 3: Sliding Drawer ve Vertical Timeline ── */}
      <div 
        className={`fixed inset-y-0 right-0 max-w-2xl w-full bg-slate-950 border-l border-slate-850 h-full flex flex-col shadow-2xl z-[70] transition-transform duration-300 ease-in-out transform ${
          selectedPaymentForDetails ? 'translate-x-0' : 'translate-x-full'
        }`}
        onClick={(e) => { e.preventDefault(); e.stopPropagation() }}
      >
        {selectedPaymentForDetails && (
          <>
            {/* Drawer Header */}
            <div className="flex justify-between items-center p-6 border-b border-slate-850 bg-slate-900/40">
              <div>
                <h4 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  <span>💰 Dönem Ekstresi Detayı</span>
                </h4>
                <p className="text-xs text-slate-500 mt-1 font-medium">
                  {selectedPaymentForDetails.period_start && selectedPaymentForDetails.period_end ? (
                    `Kapsanan Dönem: ${new Date(selectedPaymentForDetails.period_start).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })} - ${new Date(selectedPaymentForDetails.period_end).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}`
                  ) : (
                    `Kapsanan Dönem: Tüm Zamanlar (Maksimum 14 Gün)`
                  )}
                </p>
              </div>
              <button 
                onClick={() => setSelectedPaymentForDetails(null)}
                className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-slate-900 rounded-lg transition-colors text-2xl"
              >
                ×
              </button>
            </div>

            {/* Drawer Body (Siparişler Listesi) */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 admin-scrollbar bg-slate-950/40">
              <div className="bg-slate-900/40 border border-slate-850/80 rounded-2xl p-6 mb-2">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-xs text-slate-500 font-extrabold uppercase tracking-wider">Makbuz Tutarı</span>
                    <h5 className="text-3xl font-black text-emerald-400 mt-1">
                      {selectedPaymentForDetails.amount_paid.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                    </h5>
                  </div>
                  <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-2 rounded-xl text-xs font-black uppercase">
                    Tam Ödeme
                  </div>
                </div>
                {selectedPaymentForDetails.notes && (
                  <p className="text-xs text-slate-400 mt-4 border-t border-slate-800/80 pt-3">
                    <span className="text-slate-500 font-bold uppercase tracking-wider block mb-1">Açıklama / Not:</span>
                    {selectedPaymentForDetails.notes}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between mt-6 mb-2">
                <h5 className="text-xs font-bold text-slate-400 uppercase tracking-widest">📦 İlgili Dönemin Paketleri</h5>
                <span className="text-[10px] font-extrabold text-slate-500 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-full">
                  {drawerOrders.length} Paket
                </span>
              </div>

              {loadingDrawerOrders ? (
                <div className="text-center py-20 text-slate-500">
                  <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-xs font-medium">Sipariş Denetim İzi Çekiliyor...</p>
                </div>
              ) : drawerOrders.length === 0 ? (
                <div className="text-center py-20 text-slate-500 bg-slate-900/20 rounded-xl border border-slate-900 border-dashed">
                  <p className="text-sm">Bu ödeme dönemine ait paket bulunamadı</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {drawerOrders.map((pkg) => (
                    <DrawerOrderRow key={pkg.id} pkg={pkg} />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
