/**
 * @file src/app/admin/components/modals/RestaurantDetailModal.tsx
 * @description Restoran Detay ve Rapor Modalı - Business Dark Theme.
 * 
 * STATELESS MODAL: Kendi tarih state'i YOK.
 * Sadece parent'tan gelen prop'ları ekrana basar.
 * Açıldığı an Supabase'den veri çeker.
 * Kapatıldığında parent state null olur → DOM'dan silinir.
 */
'use client'

import { useState, useEffect, useCallback } from 'react'
import { Package, Restaurant } from '@/types'
import { supabase } from '@/app/lib/supabase'
import { formatTurkishTime } from '@/utils/dateHelpers'
import { getPlatformBadgeClass, getPlatformDisplayName } from '@/app/lib/platformUtils'

interface RestaurantDetailModalProps {
    restaurantId: string
    globalStartDate: string
    globalEndDate: string
    onClose: () => void
    onPaymentClick: (netAmount: number) => void
    restaurant: Restaurant
    onRefetch?: () => void  // 🔥 Ödeme sonrası refetch callback
}

export function RestaurantDetailModal({
    restaurantId,
    globalStartDate,
    globalEndDate,
    onClose,
    onPaymentClick,
    restaurant,
    onRefetch
}: RestaurantDetailModalProps) {
    // ✅ SADECE veri state'i var - tarih state'i YOK
    const [orders, setOrders] = useState<Package[]>([])
    const [isLoading, setIsLoading] = useState(true)
    
    // 🏦 ÖDEME GEÇMİŞİ STATE'LERİ
    const [activeTab, setActiveTab] = useState<'orders' | 'payments'>('orders')
    const [paymentHistory, setPaymentHistory] = useState<any[]>([])
    const [loadingPayments, setLoadingPayments] = useState(false)

    // 📡 Veri çekme fonksiyonu - ÖNCEKİ ÖDEMELER DAHİL
    const fetchRapor = useCallback(async (resId: string, startDate: string, endDate: string) => {
        setIsLoading(true)
        setLoadingPayments(true)
        try {
            const start = new Date(startDate)
            start.setHours(0, 0, 0, 0)
            const end = new Date(endDate)
            end.setHours(23, 59, 59, 999)

            // Siparişleri çek
            const { data, error } = await supabase
                .from('packages')
                .select('*, couriers!delivered_by_courier_id(full_name)')
                .eq('restaurant_id', resId)
                .or('status.eq.delivered,and(status.eq.cancelled,is_chargeable_cancellation.eq.true)')
                .gte('delivered_at', start.toISOString())
                .lte('delivered_at', end.toISOString())
                .order('delivered_at', { ascending: false })

            if (error) throw error

            const transformedData = (data || []).map((pkg: any) => ({
                ...pkg,
                courier_name: pkg.couriers?.full_name,
                couriers: undefined
            }))

            setOrders(transformedData)
            
            // 🔥 ÖNCEKİ ÖDEMELERİ ÇEK - TÜM ZAMANLAR (FİLTREDEN BAĞIMSIZ!)
            // Cari hesap bakiyesi her zaman GÜNCEL olmalı
            const { data: paymentsData, error: paymentsError } = await supabase
                .from('restaurant_payment_transactions')
                .select('amount_paid')
                .eq('restaurant_id', resId)
                // ❌ TARİH FİLTRESİ YOK! Tüm ödemeleri çek

            if (paymentsError) throw paymentsError

            const totalPaid = (paymentsData || []).reduce((sum, p) => sum + (p.amount_paid || 0), 0)
            setOncekiOdemeler(totalPaid)
            
        } catch (error: any) {
            console.error('Restoran verileri yüklenirken hata:', error.message)
            setOrders([])
            setOncekiOdemeler(0)
        } finally {
            setIsLoading(false)
            setLoadingPayments(false)
        }
    }, [])
    
    // 🏦 ÖDEME GEÇMİŞİNİ ÇEK
    const fetchPaymentHistory = useCallback(async (resId: string) => {
        setLoadingPayments(true)
        try {
            const { data, error } = await supabase
                .from('restaurant_payment_transactions')
                .select('*')
                .eq('restaurant_id', resId)
                .order('created_at', { ascending: false })
                .limit(50) // Son 50 ödeme

            if (error) throw error
            
            console.log('💳 ÖDEME GEÇMİŞİ:', { restaurantId: resId, count: data?.length || 0, data })
            setPaymentHistory(data || [])
        } catch (error: any) {
            console.error('❌ Ödeme geçmişi yüklenemedi:', error.message)
            setPaymentHistory([])
        } finally {
            setLoadingPayments(false)
        }
    }, [])

    // 🔥 AUTO-FETCH: Modal mount olduğu an verileri çek
    useEffect(() => {
        if (restaurantId && globalStartDate && globalEndDate) {
            fetchRapor(restaurantId, globalStartDate, globalEndDate)
            fetchPaymentHistory(restaurantId) // Ödeme geçmişini de çek
        }
    }, [restaurantId, globalStartDate, globalEndDate, fetchRapor, fetchPaymentHistory])
    
    // 🔥 REFETCH: onRefetch callback değiştiğinde yeniden çek
    useEffect(() => {
        if (onRefetch && restaurantId && globalStartDate && globalEndDate) {
            fetchRapor(restaurantId, globalStartDate, globalEndDate)
            fetchPaymentHistory(restaurantId) // Ödeme geçmişini de yenile
        }
    }, [onRefetch])

    // 📊 Finansal Hesaplamalar - YENİ MİMARİ + ÖNCEKİ ÖDEMELER
    const [oncekiOdemeler, setOncekiOdemeler] = useState<number>(0)
    
    const totalOrders = orders.length
    
    // Brüt Ciro: Toplam paket tutarı
    const brutCiro = orders.reduce((sum, o) => sum + (o.amount || 0), 0)
    
    // Toplam Masraf: restaurant_debts'ten gelecek (şimdilik hesaplıyoruz)
    // NOT: Gerçek uygulamada bu değer restaurant_debts tablosundan gelecek
    const packageFee = restaurant.package_fee || 100
    const toplamMasraf = orders.reduce((sum, pkg) => {
        const price = (pkg as any).applied_price ?? packageFee
        return sum + price
    }, 0)
    
    // Net Hakediş: Ciro - Masraf
    const netHakedis = brutCiro - toplamMasraf
    
    // 🔥 NET ÖDENMESİ GEREKEN: Net Hakediş - Önceki Ödemeler
    const netOdenecek = netHakedis - oncekiOdemeler

    return (
        <div
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
            onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onClose()
            }}
        >
            <div 
                className="bg-slate-950 border border-slate-800 rounded-xl max-w-6xl w-full max-h-[90vh] overflow-hidden shadow-2xl"
                onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                }}
            >
                {/* Modal Header - Business Dark */}
                <div className="flex justify-between items-center p-6 border-b border-slate-800">
                    <div className="flex items-center gap-4 flex-1">
                        <h3 className="text-2xl font-bold text-slate-100 tracking-tight">
                            {restaurant.name} - Detaylı Rapor
                        </h3>

                        {/* Tarih Aralığı Gösterimi - SADECE READONLY */}
                        <div className="flex items-center gap-2">
                            <span className="px-3 py-2 bg-slate-900 text-slate-300 rounded border border-slate-800 text-sm">
                                {globalStartDate}
                            </span>
                            <span className="text-slate-600">-</span>
                            <span className="px-3 py-2 bg-slate-900 text-slate-300 rounded border border-slate-800 text-sm">
                                {globalEndDate}
                            </span>
                            
                            {/* 🏦 Geçmiş Ödemeler Butonu */}
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    setActiveTab(activeTab === 'orders' ? 'payments' : 'orders')
                                }}
                                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-sm border border-slate-700 transition-colors flex items-center gap-2"
                                title={activeTab === 'orders' ? 'Ödeme Geçmişini Göster' : 'Siparişlere Dön'}
                            >
                                {activeTab === 'orders' ? (
                                    <>
                                        <span>💳</span>
                                        <span>Geçmiş Ödemeler</span>
                                    </>
                                ) : (
                                    <>
                                        <span>📦</span>
                                        <span>Siparişlere Dön</span>
                                    </>
                                )}
                            </button>
                            
                            {/* Manuel Yenile Butonu */}
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    fetchRapor(restaurantId, globalStartDate, globalEndDate)
                                    fetchPaymentHistory(restaurantId)
                                }}
                                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-sm border border-slate-700 transition-colors"
                                title="Verileri Yenile"
                            >
                                🔄
                            </button>
                        </div>

                        {/* Hesap Öde Butonu */}
                        {orders.length > 0 && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    onPaymentClick(netOdenecek)
                                }}
                                disabled={loadingPayments || netOdenecek <= 0}
                                className="ml-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-medium text-sm border border-emerald-500 transition-colors shadow-lg shadow-emerald-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                💰 Hesap Öde
                            </button>
                        )}
                    </div>

                    {/* 🔥 KUSURSUZ X BUTONU - Event bubbling'i kesin engeller */}
                    <button
                        type="button"
                        onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            onClose()
                        }}
                        className="flex items-center justify-center w-8 h-8 ml-4 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded transition-colors text-2xl font-light"
                    >
                        ×
                    </button>
                </div>

                {/* Modal Content */}
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)] admin-scrollbar">
                    {/* Loading State */}
                    {isLoading ? (
                        <div className="text-center py-12 text-slate-500">
                            <div className="text-4xl mb-2 animate-pulse">⏳</div>
                            <p className="text-sm tracking-tight">Veriler yükleniyor...</p>
                        </div>
                    ) : (
                        <>
                            {/* 🏦 SEKME SİSTEMİ: SİPARİŞLER / ÖDEMELER */}
                            {activeTab === 'orders' ? (
                                <>
                                    {/* 📊 4'LÜ FİNANSAL KART YAPISI - ÖNCEKİ ÖDEMELER DAHİL */}
                                    {orders.length > 0 && (
                                <div className="mb-6">
                                    <h4 className="text-lg font-bold mb-4 text-slate-100 tracking-tight">
                                        💼 Finansal Özet
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                        {/* KART 1: BRÜT CİRO */}
                                        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
                                            <div className="flex items-start justify-between mb-3">
                                                <div>
                                                    <p className="text-xs font-medium text-slate-500 tracking-tight uppercase mb-1">
                                                        Brüt Ciro
                                                    </p>
                                                    <p className="text-2xl font-black text-slate-100 tracking-tight">
                                                        {brutCiro.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺
                                                    </p>
                                                </div>
                                                <div className="text-slate-700 text-2xl">💰</div>
                                            </div>
                                            <p className="text-xs text-slate-600 tracking-tight">
                                                Toplam paket tutarı
                                            </p>
                                        </div>

                                        {/* KART 2: TOPLAM MASRAF (Rose) */}
                                        <div className="bg-slate-900 border border-rose-900/30 rounded-lg p-5">
                                            <div className="flex items-start justify-between mb-3">
                                                <div>
                                                    <p className="text-xs font-medium text-rose-400/70 tracking-tight uppercase mb-1">
                                                        Toplam Masraf
                                                    </p>
                                                    <p className="text-2xl font-black text-rose-300/90 tracking-tight">
                                                        {toplamMasraf.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺
                                                    </p>
                                                </div>
                                                <div className="text-rose-900/50 text-2xl">📦</div>
                                            </div>
                                            <p className="text-xs text-slate-600 tracking-tight">
                                                {totalOrders} Paket × Dinamik Ücret
                                            </p>
                                        </div>

                                        {/* KART 3: ÖNCEKİ ÖDEMELER (Amber) */}
                                        <div className="bg-slate-900 border border-amber-900/30 rounded-lg p-5">
                                            <div className="flex items-start justify-between mb-3">
                                                <div>
                                                    <p className="text-xs font-medium text-amber-400/70 tracking-tight uppercase mb-1">
                                                        Önceki Ödemeler
                                                    </p>
                                                    <p className="text-2xl font-black text-amber-300/90 tracking-tight">
                                                        {loadingPayments ? '...' : oncekiOdemeler.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺
                                                    </p>
                                                </div>
                                                <div className="text-amber-900/50 text-2xl">💳</div>
                                            </div>
                                            <p className="text-xs text-amber-400/60 tracking-tight">
                                                Tüm zamanlar toplamı
                                            </p>
                                        </div>

                                        {/* KART 4: NET ÖDENMESİ GEREKEN (Emerald - DEVASA) */}
                                        <div className="bg-gradient-to-br from-emerald-900/40 to-emerald-950/40 border-2 border-emerald-500/30 rounded-lg p-5 shadow-xl shadow-emerald-900/20">
                                            <div className="flex items-start justify-between mb-3">
                                                <div>
                                                    <p className="text-xs font-medium text-emerald-400/70 tracking-tight uppercase mb-1">
                                                        Net Ödenecek
                                                    </p>
                                                    <p className="text-3xl font-black text-emerald-300 tracking-tight">
                                                        {loadingPayments ? '...' : netOdenecek.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺
                                                    </p>
                                                </div>
                                                <div className="text-emerald-900/50 text-2xl">✓</div>
                                            </div>
                                            <p className="text-xs text-emerald-400/60 tracking-tight">
                                                Hakediş - Ödemeler
                                            </p>
                                        </div>
                                    </div>
                                    
                                    {/* 📝 AÇIKLAYICI NOT */}
                                    <div className="mt-4 px-4 py-3 bg-slate-900 border border-slate-800 rounded-lg">
                                        <p className="text-xs text-slate-500 tracking-tight">
                                            <span className="font-semibold text-slate-400">💡 Not:</span> "Önceki Ödemeler" kartı <span className="text-amber-400">tüm zamanlar</span> toplamını gösterir (tarih filtresinden bağımsız). 
                                            Bugün yaptığınız ödemeler anında bu kartı günceller. Ciro ve Masraf ise seçili tarih aralığına göre hesaplanır.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Sipariş Detay Tablosu - Business Dark */}
                            <div>
                                <h4 className="text-lg font-bold mb-4 text-slate-100 tracking-tight">
                                    Sipariş Detayları
                                </h4>
                                {orders.length === 0 ? (
                                    <div className="text-center py-12 text-slate-600">
                                        <div className="text-4xl mb-2 opacity-30">📭</div>
                                        <p className="text-sm tracking-tight">Bu tarih aralığında sipariş bulunamadı</p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto admin-scrollbar">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b border-slate-800 bg-slate-900">
                                                    <th className="text-left py-3 px-4 font-semibold text-slate-400 tracking-tight">Sipariş No</th>
                                                    <th className="text-left py-3 px-4 font-semibold text-slate-400 tracking-tight">Tarih/Saat</th>
                                                    <th className="text-left py-3 px-4 font-semibold text-slate-400 tracking-tight">Müşteri</th>
                                                    <th className="text-left py-3 px-4 font-semibold text-slate-400 tracking-tight">Kurye</th>
                                                    <th className="text-left py-3 px-4 font-semibold text-slate-400 tracking-tight">Tutar</th>
                                                    <th className="text-left py-3 px-4 font-semibold text-slate-400 tracking-tight">Ödeme</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-800">
                                                {orders.map((order) => (
                                                    <tr key={order.id} className="hover:bg-slate-900/50 transition-colors">
                                                        <td className="py-3 px-4">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-bold text-slate-300 tracking-tight">
                                                                    {order.order_number || '......'}
                                                                </span>
                                                                {order.platform && (
                                                                    <span className={`text-xs py-0.5 px-2 rounded ${getPlatformBadgeClass(order.platform)}`}>
                                                                        {getPlatformDisplayName(order.platform)}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="py-3 px-4">
                                                            <div className="text-sm">
                                                                <div className="font-medium text-slate-400 tracking-tight">
                                                                    {formatTurkishTime(order.delivered_at)}
                                                                </div>
                                                                <div className="text-slate-600 text-xs tracking-tight">
                                                                    {order.delivered_at ? new Date(order.delivered_at).toLocaleDateString('tr-TR') : '-'}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="py-3 px-4 font-medium text-slate-400 tracking-tight">
                                                            {order.customer_name}
                                                        </td>
                                                        <td className="py-3 px-4 text-slate-500 tracking-tight">
                                                            {order.courier_name || 'Bilinmeyen'}
                                                        </td>
                                                        <td className="py-3 px-4">
                                                            <span className="font-bold text-slate-300 tracking-tight">
                                                                {order.amount} ₺
                                                            </span>
                                                        </td>
                                                        <td className="py-3 px-4">
                                                            <span className={`px-2 py-1 rounded text-xs font-medium tracking-tight ${order.payment_method === 'cash'
                                                                ? 'bg-green-900/30 text-green-400/80 border border-green-900/50'
                                                                : 'bg-orange-900/30 text-orange-400/80 border border-orange-900/50'
                                                                }`}>
                                                                {order.payment_method === 'cash' ? '💵 Nakit' : '💳 Kart'}
                                                            </span>
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
                        /* 🏦 ÖDEME GEÇMİŞİ SEKMESİ - BANKA EKSTRESİ GİBİ */
                        <div>
                            <h4 className="text-lg font-bold mb-4 text-slate-100 tracking-tight">
                                💳 Ödeme Geçmişi
                            </h4>
                            
                            {loadingPayments ? (
                                <div className="text-center py-12 text-slate-500">
                                    <div className="text-4xl mb-2 animate-pulse">⏳</div>
                                    <p className="text-sm tracking-tight">Ödeme geçmişi yükleniyor...</p>
                                </div>
                            ) : paymentHistory.length === 0 ? (
                                /* BOŞDURUMU */
                                <div className="text-center py-16 text-slate-600">
                                    <div className="text-6xl mb-4 opacity-20">🧾</div>
                                    <p className="text-sm tracking-tight">
                                        Bu restorana ait henüz bir ödeme kaydı bulunmamaktadır.
                                    </p>
                                </div>
                            ) : (
                                /* ÖDEME LİSTESİ - BANKA EKSTRESİ TARZI */
                                <div className="space-y-0 border border-slate-800 rounded-lg overflow-hidden">
                                    {paymentHistory.map((payment, index) => {
                                        const paymentDate = new Date(payment.created_at)
                                        const formattedDate = paymentDate.toLocaleDateString('tr-TR', {
                                            day: 'numeric',
                                            month: 'long',
                                            year: 'numeric'
                                        })
                                        const formattedTime = paymentDate.toLocaleTimeString('tr-TR', {
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })
                                        
                                        return (
                                            <div
                                                key={payment.id}
                                                className={`flex items-center justify-between px-6 py-4 hover:bg-slate-900/50 transition-colors ${
                                                    index !== paymentHistory.length - 1 ? 'border-b border-slate-800' : ''
                                                }`}
                                            >
                                                {/* Sol: Tarih ve Saat */}
                                                <div className="flex-1">
                                                    <div className="text-sm font-medium text-slate-300 tracking-tight">
                                                        {formattedDate}
                                                    </div>
                                                    <div className="text-xs text-slate-600 tracking-tight mt-0.5">
                                                        {formattedTime}
                                                    </div>
                                                    {payment.notes && (
                                                        <div className="text-xs text-slate-500 tracking-tight mt-1">
                                                            {payment.notes}
                                                        </div>
                                                    )}
                                                </div>
                                                
                                                {/* Orta: Finansal Detaylar (Varsa) */}
                                                {(payment.brut_ciro || payment.toplam_masraf || payment.net_hakedis) && (
                                                    <div className="flex items-center gap-6 mr-6 text-xs">
                                                        {payment.brut_ciro > 0 && (
                                                            <div className="text-center">
                                                                <div className="text-slate-600">Ciro</div>
                                                                <div className="text-slate-400 font-medium">
                                                                    {payment.brut_ciro.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                                                                </div>
                                                            </div>
                                                        )}
                                                        {payment.toplam_masraf > 0 && (
                                                            <div className="text-center">
                                                                <div className="text-slate-600">Masraf</div>
                                                                <div className="text-rose-400/70 font-medium">
                                                                    {payment.toplam_masraf.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                                                                </div>
                                                            </div>
                                                        )}
                                                        {payment.package_count > 0 && (
                                                            <div className="text-center">
                                                                <div className="text-slate-600">Paket</div>
                                                                <div className="text-slate-400 font-medium">
                                                                    {payment.package_count}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                                
                                                {/* Sağ: Ödenen Tutar - YEŞIL VURGU */}
                                                <div className="text-right">
                                                    <div className="text-2xl font-black text-emerald-400 tracking-tight">
                                                        + {payment.amount_paid.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
