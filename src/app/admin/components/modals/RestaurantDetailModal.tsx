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
    onPaymentClick: () => void
    restaurant: Restaurant
}

export function RestaurantDetailModal({
    restaurantId,
    globalStartDate,
    globalEndDate,
    onClose,
    onPaymentClick,
    restaurant
}: RestaurantDetailModalProps) {
    // ✅ SADECE veri state'i var - tarih state'i YOK
    const [orders, setOrders] = useState<Package[]>([])
    const [isLoading, setIsLoading] = useState(true)

    // 📡 Veri çekme fonksiyonu
    const fetchRapor = useCallback(async (resId: string, startDate: string, endDate: string) => {
        setIsLoading(true)
        try {
            const start = new Date(startDate)
            start.setHours(0, 0, 0, 0)
            const end = new Date(endDate)
            end.setHours(23, 59, 59, 999)

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
        } catch (error: any) {
            console.error('Restoran siparişleri yüklenirken hata:', error.message)
            setOrders([])
        } finally {
            setIsLoading(false)
        }
    }, [])

    // 🔥 AUTO-FETCH: Modal mount olduğu an verileri çek
    useEffect(() => {
        if (restaurantId && globalStartDate && globalEndDate) {
            fetchRapor(restaurantId, globalStartDate, globalEndDate)
        }
    }, [restaurantId, globalStartDate, globalEndDate, fetchRapor])

    // 📊 Finansal Hesaplamalar
    const totalOrders = orders.length
    const totalRevenue = orders.reduce((sum, o) => sum + (o.amount || 0), 0)
    const packageFee = restaurant.package_fee || 100
    const totalDebt = orders.reduce((sum, pkg) => {
        const price = (pkg as any).applied_price ?? packageFee
        return sum + price
    }, 0)
    const netPayment = totalRevenue - totalDebt

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
                            {/* Manuel Yenile Butonu */}
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    fetchRapor(restaurantId, globalStartDate, globalEndDate)
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
                                    onPaymentClick()
                                }}
                                className="ml-auto px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-medium text-sm border border-slate-700 transition-colors"
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
                            {/* 📊 3'LÜ FİNANSAL KART YAPISI */}
                            {orders.length > 0 && (
                                <div className="mb-6">
                                    <h4 className="text-lg font-bold mb-4 text-slate-100 tracking-tight">
                                        Ödenmesi Gereken Hesap
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {/* KART 1: TOPLAM CİRO */}
                                        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
                                            <div className="flex items-start justify-between mb-3">
                                                <div>
                                                    <p className="text-xs font-medium text-slate-500 tracking-tight uppercase mb-1">
                                                        Toplam Ciro
                                                    </p>
                                                    <p className="text-3xl font-black text-slate-100 tracking-tight">
                                                        {totalRevenue.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺
                                                    </p>
                                                </div>
                                                <div className="text-slate-700 text-2xl">💰</div>
                                            </div>
                                            <p className="text-xs text-slate-600 tracking-tight">
                                                Nakit + Kart ödemeleri
                                            </p>
                                        </div>

                                        {/* KART 2: PAKET MASRAFI (Muted Rose) */}
                                        <div className="bg-slate-900 border border-rose-900/30 rounded-lg p-5">
                                            <div className="flex items-start justify-between mb-3">
                                                <div>
                                                    <p className="text-xs font-medium text-rose-400/70 tracking-tight uppercase mb-1">
                                                        Paket Masrafı
                                                    </p>
                                                    <p className="text-3xl font-black text-rose-300/90 tracking-tight">
                                                        {totalDebt.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺
                                                    </p>
                                                </div>
                                                <div className="text-rose-900/50 text-2xl">📦</div>
                                            </div>
                                            <p className="text-xs text-slate-600 tracking-tight">
                                                {totalOrders} Paket × {packageFee}₺
                                            </p>
                                        </div>

                                        {/* KART 3: RESTORANA ÖDENECEK NET (Koyu Emerald) */}
                                        <div className="bg-emerald-900/30 border border-emerald-900/40 rounded-lg p-5">
                                            <div className="flex items-start justify-between mb-3">
                                                <div>
                                                    <p className="text-xs font-medium text-emerald-400/70 tracking-tight uppercase mb-1">
                                                        Restorana Ödenecek Net
                                                    </p>
                                                    <p className="text-3xl font-black text-emerald-300/90 tracking-tight">
                                                        {netPayment.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺
                                                    </p>
                                                </div>
                                                <div className="text-emerald-900/50 text-2xl">✓</div>
                                            </div>
                                            <p className="text-xs text-slate-600 tracking-tight">
                                                Ciro - Paket Masrafı
                                            </p>
                                        </div>
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
                    )}
                </div>
            </div>
        </div>
    )
}
