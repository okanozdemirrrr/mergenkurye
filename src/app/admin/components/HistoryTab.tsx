/**
 * @file src/app/admin/components/HistoryTab.tsx
 * @description Geçmiş Siparişler Paneli Bileşeni.
 * Server-side pagination ve filtreleme ile veritabanındaki binlerce kaydı Vercel/Supabase
 * limitlerini zorlamadan hızlıca yükler, filtre aralıklarını doğru yansıtır.
 */
'use client'

import { useState, useEffect } from 'react'
import { Package } from '@/types'
import { supabase } from '@/app/lib/supabase'
import { OrderActionMenu } from '@/components/ui/OrderActionMenu'
import { getPlatformBadgeClass, getPlatformDisplayName } from '@/app/lib/platformUtils'
import { formatTurkishTime } from '@/utils/dateHelpers'
import { useAdminData } from '../AdminDataProvider'

interface HistoryTabProps {
    deliveredPackages?: Package[]
    dateFilter: 'today' | 'week' | 'month' | 'all'
    setDateFilter: (filter: 'today' | 'week' | 'month' | 'all') => void
    openDropdownId: number | null
    setOpenDropdownId: (id: number | null) => void
    handleCancelOrder: (id: number, details: string) => void
}

const HISTORY_ITEMS_PER_PAGE = 50

export function HistoryTab({
    dateFilter,
    setDateFilter,
    openDropdownId,
    setOpenDropdownId,
    handleCancelOrder
}: HistoryTabProps) {
    const { couriers } = useAdminData()
    const [selectedPackage, setSelectedPackage] = useState<Package | null>(null)
    const [statusFilter, setStatusFilter] = useState<'all' | 'delivered' | 'cancelled'>('all')
    
    // Tarih aralığı state'leri - Varsayılan olarak bugün (Türkiye saat dilimi)
    const getTodayInTurkey = () => {
        const now = new Date()
        const turkeyDate = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Istanbul' }))
        return turkeyDate.toISOString().split('T')[0]
    }
    const today = getTodayInTurkey()
    const [startDate, setStartDate] = useState<string | null>(today)
    const [endDate, setEndDate] = useState<string | null>(today)
    
    // Sunucudan çekilen veriler ve sayfalama state'leri
    const [packagesList, setPackagesList] = useState<Package[]>([])
    const [totalCount, setTotalCount] = useState(0)
    const [currentPage, setCurrentPage] = useState(1)
    const [isLoading, setIsLoading] = useState(true)
    const [refreshKey, setRefreshKey] = useState(0)

    // İstatistik state'i (Nakit, kart, genel toplam)
    const [stats, setStats] = useState({
        totalAmount: 0,
        cashAmount: 0,
        cardAmount: 0
    })

    // Sunucudan (Supabase) verileri filtreleme koşullarına göre çekme
    useEffect(() => {
        let active = true

        async function fetchHistoryData() {
            setIsLoading(true)
            try {
                // 1. ANA PAGINATED SORGU: range ve count ile
                let query = supabase
                    .from('packages')
                    .select(
                        `
                            id, 
                            order_number, 
                            status, 
                            amount, 
                            payment_method, 
                            customer_name, 
                            customer_phone, 
                            delivery_address, 
                            content, 
                            created_at, 
                            getting_ready_at, 
                            ready_at, 
                            assigned_at, 
                            picked_up_at, 
                            delivered_at, 
                            cancelled_at, 
                            courier_id, 
                            restaurant_id, 
                            applied_price, 
                            delivered_by_courier_id, 
                            restaurants(id, name), 
                            couriers!packages_courier_id_fkey(id, full_name)
                        `,
                        { count: 'exact' }
                    )

                // Kategorik durum filtresi
                if (statusFilter === 'all') {
                    query = query.in('status', ['delivered', 'cancelled'])
                } else {
                    query = query.eq('status', statusFilter)
                }

                // ⚡ TARİH ARALIĞI FİLTRESİ SORGUDAN BYPASS (NULL/BOŞ KONTROLÜ)
                if (startDate && startDate !== '') {
                    const start = new Date(startDate)
                    start.setHours(0, 0, 0, 0)
                    query = query.gte('created_at', start.toISOString())
                }
                if (endDate && endDate !== '') {
                    const end = new Date(endDate)
                    end.setHours(23, 59, 59, 999)
                    query = query.lte('created_at', end.toISOString())
                }

                // Sıralama
                query = query.order('created_at', { ascending: false })

                // Server-Side Sayfalama Range hesabı
                const from = (currentPage - 1) * HISTORY_ITEMS_PER_PAGE
                const to = from + HISTORY_ITEMS_PER_PAGE - 1
                query = query.range(from, to)

                // 2. İSTATİSTİK SORGUSU: range sınırlaması olmadan sadece özet alanlar
                let statsQuery = supabase
                    .from('packages')
                    .select('amount, payment_method, status')

                if (statusFilter === 'all') {
                    statsQuery = statsQuery.in('status', ['delivered', 'cancelled'])
                } else {
                    statsQuery = statsQuery.eq('status', statusFilter)
                }

                if (startDate && startDate !== '') {
                    const start = new Date(startDate)
                    start.setHours(0, 0, 0, 0)
                    statsQuery = statsQuery.gte('created_at', start.toISOString())
                }
                if (endDate && endDate !== '') {
                    const end = new Date(endDate)
                    end.setHours(23, 59, 59, 999)
                    statsQuery = statsQuery.lte('created_at', end.toISOString())
                }

                // Paralel API çağrıları
                const [mainResult, statsResult] = await Promise.all([query, statsQuery])

                if (!active) return

                if (mainResult.error) throw mainResult.error
                if (statsResult.error) throw statsResult.error

                // Veri dönüşümü (Transform)
                const transformedData = (mainResult.data || []).map((pkg: any) => ({
                    ...pkg,
                    restaurant: pkg.restaurants,
                    courier_name: pkg.couriers?.full_name,
                    restaurants: undefined,
                    couriers: undefined
                }))

                // Tarihe göre ekstra sıralama güvencesi
                transformedData.sort((a, b) => {
                    const dateA = a.status === 'cancelled' && a.cancelled_at
                        ? new Date(a.cancelled_at).getTime()
                        : a.delivered_at
                            ? new Date(a.delivered_at).getTime()
                            : a.created_at
                                ? new Date(a.created_at).getTime()
                                : 0
                    const dateB = b.status === 'cancelled' && b.cancelled_at
                        ? new Date(b.cancelled_at).getTime()
                        : b.delivered_at
                            ? new Date(b.delivered_at).getTime()
                            : b.created_at
                                ? new Date(b.created_at).getTime()
                                : 0
                    return dateB - dateA
                })

                setPackagesList(transformedData)
                setTotalCount(mainResult.count || 0)

                // İstatistik hesaplama (İptaller hariç)
                const statsData = statsResult.data || []
                const totalAmt = statsData
                    .filter(p => p.status !== 'cancelled')
                    .reduce((sum, p) => sum + (p.amount || 0), 0)
                const cashAmt = statsData
                    .filter(p => p.payment_method === 'cash' && p.status !== 'cancelled')
                    .reduce((sum, p) => sum + (p.amount || 0), 0)
                const cardAmt = statsData
                    .filter(p => p.payment_method === 'card' && p.status !== 'cancelled')
                    .reduce((sum, p) => sum + (p.amount || 0), 0)
                const ibanAmt = statsData
                    .filter(p => p.payment_method === 'iban' && p.status !== 'cancelled')
                    .reduce((sum, p) => sum + (p.amount || 0), 0)

                setStats({
                    totalAmount: totalAmt,
                    cashAmount: cashAmt,
                    cardAmount: cardAmt + ibanAmt
                })

            } catch (error) {
                console.error('⚠️ Geçmiş siparişler çekilirken hata oluştu:', error)
            } finally {
                if (active) {
                    setIsLoading(false)
                }
            }
        }

        fetchHistoryData()

        return () => {
            active = false
        }
    }, [statusFilter, startDate, endDate, currentPage, refreshKey])

    // Sayfalama hesaplaması
    const totalPages = Math.ceil(totalCount / HISTORY_ITEMS_PER_PAGE)

    const handlePageChange = (page: number) => {
        setCurrentPage(page)
        document.getElementById('history-container')?.scrollIntoView({ behavior: 'smooth' })
    }
    
    const handleFilterChange = (newFilter: 'all' | 'delivered' | 'cancelled') => {
        setStatusFilter(newFilter)
        setCurrentPage(1)
    }
    
    const handleDateFilterChange = (start: string | null, end: string | null) => {
        setStartDate(start)
        setEndDate(end)
        setCurrentPage(1)
    }

    const handleCancelWrapper = async (id: number, reason: string) => {
        await handleCancelOrder(id, reason)
        setRefreshKey(prev => prev + 1)
    }

    const getStatusText = (status: string) => {
        switch (status) {
            case 'waiting': return 'Beklemede'
            case 'assigned': return 'Atandı'
            case 'picking_up': return 'Alınıyor'
            case 'on_the_way': return 'Yolda'
            case 'delivered': return 'Teslim Edildi'
            case 'cancelled': return 'İptal Edildi'
            default: return status
        }
    }

    return (
        <>
            {/* DETAY MODAL */}
            {selectedPackage && (
                <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4" onClick={() => setSelectedPackage(null)}>
                    <div className="bg-slate-900 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-700 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4 sticky top-0 bg-slate-900 pb-4 border-b border-slate-700 z-10">
                            <h3 className="text-xl font-bold text-white">📦 Sipariş Detayları</h3>
                            <button
                                onClick={() => setSelectedPackage(null)}
                                className="text-slate-400 hover:text-white text-2xl font-bold w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-800 transition-colors"
                            >
                                ×
                            </button>
                        </div>

                        <div className="space-y-4 pt-2">
                            <div className="flex items-center gap-3">
                                <span className="text-lg font-bold text-orange-400">
                                    {selectedPackage.order_number || '......'}
                                </span>
                                {selectedPackage.platform && (
                                    <span className={`text-sm py-1 px-3 rounded ${getPlatformBadgeClass(selectedPackage.platform)}`}>
                                        {getPlatformDisplayName(selectedPackage.platform)}
                                    </span>
                                )}
                            </div>

                            <div className="bg-slate-800 p-4 rounded-lg">
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-400 text-sm">Durum:</span>
                                    <span className={`px-3 py-1.5 rounded-full text-sm font-semibold ${
                                        selectedPackage.status === 'cancelled' ? 'bg-red-900/50 text-red-300' :
                                        selectedPackage.status === 'assigned' ? 'bg-orange-900/50 text-orange-300' :
                                        selectedPackage.status === 'picking_up' ? 'bg-orange-900/50 text-orange-300' :
                                        selectedPackage.status === 'on_the_way' ? 'bg-blue-900/50 text-blue-300' :
                                        'bg-green-900/50 text-green-300'
                                    }`}>
                                        {getStatusText(selectedPackage.status)}
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-800 p-4 rounded-lg">
                                    <p className="text-slate-400 text-xs mb-1">Restoran</p>
                                    <p className="text-white font-semibold">🍽️ {selectedPackage.restaurant?.name || 'Bilinmeyen'}</p>
                                </div>
                                <div className="bg-slate-800 p-4 rounded-lg">
                                    <p className="text-slate-400 text-xs mb-1">Tutar</p>
                                    <p className="text-green-400 font-bold text-xl">{selectedPackage.amount}₺</p>
                                </div>
                            </div>

                            <div className="bg-slate-800 p-4 rounded-lg space-y-3">
                                <h4 className="text-white font-semibold mb-2">Müşteri Bilgileri</h4>
                                <div>
                                    <p className="text-slate-400 text-xs mb-1">Ad Soyad</p>
                                    <p className="text-white">👤 {selectedPackage.customer_name}</p>
                                </div>
                                {selectedPackage.customer_phone && (
                                    <div>
                                        <p className="text-slate-400 text-xs mb-1">Telefon</p>
                                        <p className="text-white">📞 {selectedPackage.customer_phone}</p>
                                    </div>
                                )}
                                <div>
                                    <p className="text-slate-400 text-xs mb-1">Teslimat Adresi</p>
                                    <p className="text-white">📍 {selectedPackage.delivery_address}</p>
                                </div>
                            </div>

                            {selectedPackage.content && (
                                <div className="bg-slate-800 p-4 rounded-lg">
                                    <p className="text-slate-400 text-xs mb-1">Paket İçeriği</p>
                                    <p className="text-orange-200">📝 {selectedPackage.content}</p>
                                </div>
                            )}

                            <div className="bg-slate-800 p-4 rounded-lg">
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-400 text-sm">Ödeme Yöntemi:</span>
                                    <span className={`px-3 py-1 rounded text-sm font-medium ${
                                        selectedPackage.payment_method === 'cash'
                                            ? 'bg-green-900/50 text-green-300'
                                            : selectedPackage.payment_method === 'iban'
                                            ? 'bg-purple-900/50 text-purple-300'
                                            : 'bg-orange-900/50 text-orange-300'
                                    }`}>
                                        {selectedPackage.payment_method === 'cash' ? '💵 Nakit' : selectedPackage.payment_method === 'iban' ? '🏦 IBAN' : '💳 Kart'}
                                    </span>
                                </div>
                            </div>

                            {selectedPackage.courier_id && (
                                <div className="bg-slate-800 p-4 rounded-lg">
                                    <p className="text-slate-400 text-xs mb-1">Atanan Kurye</p>
                                    <p className="text-white">🚴 {couriers.find(c => c.id === selectedPackage.courier_id)?.full_name || selectedPackage.courier_name || 'Bilinmeyen'}</p>
                                </div>
                            )}

                            <div className="bg-slate-800 p-4 rounded-lg space-y-2">
                                <h4 className="text-white font-semibold mb-2">⏱️ Zaman Çizelgesi</h4>
                                
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-400">📝 Oluşturulma:</span>
                                    <span className="text-white font-medium">
                                        {selectedPackage.created_at ? formatTurkishTime(selectedPackage.created_at) : '-'}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-400">👨‍🍳 Hazırlamaya Başlama:</span>
                                    <span className="text-white font-medium">
                                        {selectedPackage.getting_ready_at ? formatTurkishTime(selectedPackage.getting_ready_at) : '-'}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-400">✅ Hazır Olma:</span>
                                    <span className="text-white font-medium">
                                        {selectedPackage.ready_at ? formatTurkishTime(selectedPackage.ready_at) : '-'}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-400">✔️ Kurye Kabul Saati:</span>
                                    <span className="text-white font-medium">
                                        {selectedPackage.assigned_at ? formatTurkishTime(selectedPackage.assigned_at) : '-'}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-400">🏪 Esnaftan Alınma:</span>
                                    <span className="text-white font-medium">
                                        {selectedPackage.picked_up_at ? formatTurkishTime(selectedPackage.picked_up_at) : '-'}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-400">🎯 Teslim Edilme:</span>
                                    <span className="text-white font-medium">
                                        {selectedPackage.delivered_at ? formatTurkishTime(selectedPackage.delivered_at) : '-'}
                                    </span>
                                </div>
                                {selectedPackage.cancelled_at && (
                                    <div className="flex justify-between text-sm border-t border-slate-700 pt-2 mt-2">
                                        <span className="text-red-400">❌ İptal:</span>
                                        <span className="text-red-300 font-medium">
                                            {formatTurkishTime(selectedPackage.cancelled_at)}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {selectedPackage.status === 'cancelled' && (
                                <div className="bg-red-900/20 p-4 rounded-lg border border-red-700">
                                    <h4 className="text-red-300 font-semibold mb-2">İptal Bilgileri</h4>
                                    {selectedPackage.cancelled_by && (
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="text-red-400">İptal Eden:</span>
                                            <span className="text-red-300">{selectedPackage.cancelled_by === 'admin' ? 'Admin' : selectedPackage.cancelled_by === 'restaurant' ? 'Restoran' : 'Bilinmeyen'}</span>
                                        </div>
                                    )}
                                    {selectedPackage.cancellation_reason && (
                                        <div className="text-sm mt-2">
                                            <span className="text-red-400">Sebep:</span>
                                            <p className="text-red-300 mt-1">{selectedPackage.cancellation_reason}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div id="history-container" className="bg-slate-900 shadow-xl rounded-2xl p-6">
                <div className="flex flex-col gap-4 mb-6">
                    {/* Başlık ve Kategorik Filtre */}
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <h2 className="text-2xl font-bold">📋 Geçmiş Siparişler</h2>
                            
                            {/* Kategorik Filtre Butonları */}
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleFilterChange('all')}
                                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${statusFilter === 'all'
                                        ? 'bg-orange-600 text-white shadow-lg'
                                        : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700 hover:text-white'
                                        }`}
                                >
                                    📦 Tümü
                                </button>
                                <button
                                    onClick={() => handleFilterChange('delivered')}
                                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${statusFilter === 'delivered'
                                        ? 'bg-green-600 text-white shadow-lg'
                                        : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700 hover:text-white'
                                        }`}
                                >
                                    ✅ Teslim Edilen
                                </button>
                                <button
                                    onClick={() => handleFilterChange('cancelled')}
                                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${statusFilter === 'cancelled'
                                        ? 'bg-red-600 text-white shadow-lg'
                                        : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700 hover:text-white'
                                        }`}
                                >
                                    🚫 İptal Edilen
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Tarih Aralığı Filtresi */}
                    <div className="flex items-center gap-3 flex-wrap">
                        <label className="text-sm font-medium text-slate-300">
                            Tarih Aralığı:
                        </label>
                        
                        {/* Hızlı Tarih Seçim Butonları */}
                        <div className="flex gap-2">
                            <button
                                onClick={() => {
                                    const now = new Date()
                                    const turkeyDate = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Istanbul' }))
                                    const todayStr = turkeyDate.toISOString().split('T')[0]
                                    handleDateFilterChange(todayStr, todayStr)
                                }}
                                className="px-3 py-1 bg-orange-950/40 text-orange-400 border border-orange-900/60 rounded-lg text-sm font-medium hover:bg-orange-950/60 transition-colors"
                            >
                                Bugün
                            </button>
                            <button
                                onClick={() => {
                                    const now = new Date()
                                    const turkeyDate = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Istanbul' }))
                                    turkeyDate.setDate(turkeyDate.getDate() - 1)
                                    const yesterdayStr = turkeyDate.toISOString().split('T')[0]
                                    handleDateFilterChange(yesterdayStr, yesterdayStr)
                                }}
                                className="px-3 py-1 bg-slate-800 text-slate-300 border border-slate-700 rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors"
                            >
                                Dün
                            </button>
                            <button
                                onClick={() => {
                                    const now = new Date()
                                    const turkeyToday = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Istanbul' }))
                                    const turkeyWeekAgo = new Date(turkeyToday)
                                    turkeyWeekAgo.setDate(turkeyToday.getDate() - 7)
                                    handleDateFilterChange(turkeyWeekAgo.toISOString().split('T')[0], turkeyToday.toISOString().split('T')[0])
                                }}
                                className="px-3 py-1 bg-slate-800 text-slate-300 border border-slate-700 rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors"
                            >
                                Son 7 Gün
                            </button>
                        </div>
                        
                        <input
                            type="date"
                            value={startDate || ''}
                            onChange={(e) => handleDateFilterChange(e.target.value || null, endDate)}
                            className="px-3 py-2 bg-slate-850 border border-slate-700 rounded-lg text-sm text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                            placeholder="Başlangıç"
                        />
                        <span className="text-slate-500">-</span>
                        <input
                            type="date"
                            value={endDate || ''}
                            onChange={(e) => handleDateFilterChange(startDate, e.target.value || null)}
                            className="px-3 py-2 bg-slate-850 border border-slate-700 rounded-lg text-sm text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                            placeholder="Bitiş"
                        />
                        <button
                            onClick={() => handleDateFilterChange(null, null)}
                            className="px-3 py-2 bg-slate-800 text-white border border-slate-700 rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors"
                        >
                            🗓️ Tüm Tarihler
                        </button>
                    </div>
                </div>

                {/* İstatistikler */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                    <div className="bg-slate-800 border border-slate-700/60 p-4 rounded-xl shadow-md">
                        <div className="text-xs text-orange-400 font-medium uppercase tracking-wider mb-1">Toplam Sipariş</div>
                        <div className="text-2xl font-bold text-white">{totalCount}</div>
                    </div>
                    <div className="bg-slate-800 border border-slate-700/60 p-4 rounded-xl shadow-md">
                        <div className="text-xs text-blue-400 font-medium uppercase tracking-wider mb-1">Sayfa</div>
                        <div className="text-2xl font-bold text-white">{currentPage} / {totalPages || 1}</div>
                    </div>
                    <div className="bg-slate-800 border border-slate-700/60 p-4 rounded-xl shadow-md">
                        <div className="text-xs text-green-400 font-medium uppercase tracking-wider mb-1">Toplam Tutar</div>
                        <div className="text-2xl font-bold text-green-400">{stats.totalAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺</div>
                    </div>
                    <div className="bg-slate-800 border border-slate-700/60 p-4 rounded-xl shadow-md">
                        <div className="text-xs text-emerald-400 font-medium uppercase tracking-wider mb-1">Nakit</div>
                        <div className="text-2xl font-bold text-white">{stats.cashAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺</div>
                    </div>
                    <div className="bg-slate-800 border border-slate-700/60 p-4 rounded-xl shadow-md">
                        <div className="text-xs text-sky-400 font-medium uppercase tracking-wider mb-1">Kart / IBAN</div>
                        <div className="text-2xl font-bold text-white">{stats.cardAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺</div>
                    </div>
                </div>

                <div className="overflow-x-auto admin-scrollbar">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-750 text-slate-400">
                                <th className="text-left py-3 px-4 w-8"></th>
                                <th className="text-left py-3 px-4">Sipariş No</th>
                                <th className="text-left py-3 px-4">Tarih/Saat</th>
                                <th className="text-left py-3 px-4">Müşteri</th>
                                <th className="text-left py-3 px-4">Restoran</th>
                                <th className="text-left py-3 px-4">Kurye</th>
                                <th className="text-left py-3 px-4">Durum</th>
                                <th className="text-left py-3 px-4">Tutar</th>
                                <th className="text-left py-3 px-4">Ödeme</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan={9} className="text-center py-16 text-slate-400">
                                        <div className="flex flex-col items-center justify-center gap-3">
                                            <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                                            <span className="text-sm font-medium">Sipariş geçmişi yükleniyor...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : packagesList.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="text-center py-12 text-slate-500">
                                        {startDate && endDate 
                                            ? 'Bu tarih aralığında sipariş bulunamadı.'
                                            : statusFilter === 'delivered'
                                                ? 'Henüz teslim edilen sipariş yok.'
                                                : statusFilter === 'cancelled'
                                                    ? 'Henüz iptal edilen sipariş yok.'
                                                    : 'Henüz sipariş yok.'
                                        }
                                    </td>
                                </tr>
                            ) : (
                                packagesList.map(pkg => (
                                    <tr 
                                        key={pkg.id} 
                                        onClick={() => setSelectedPackage(pkg)}
                                        className={`border-b border-slate-800/80 hover:bg-slate-800/60 cursor-pointer transition-colors ${pkg.status === 'cancelled'
                                        ? 'opacity-60 bg-red-900/10'
                                        : ''
                                        }`}
                                    >
                                        <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                                            <div className="relative">
                                                <OrderActionMenu
                                                    package={pkg}
                                                    isOpen={openDropdownId === pkg.id}
                                                    onToggle={() => setOpenDropdownId(openDropdownId === pkg.id ? null : pkg.id)}
                                                    onCancel={handleCancelWrapper}
                                                />
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 text-white">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-orange-450">
                                                    {pkg.order_number || '......'}
                                                </span>
                                                {pkg.platform && (
                                                    <span className={`text-xs py-0.5 px-2 rounded ${getPlatformBadgeClass(pkg.platform)}`}>
                                                        {getPlatformDisplayName(pkg.platform)}
                                                    </span>
                                                )}
                                                {pkg.status === 'cancelled' && (
                                                    <span className="text-xs py-0.5 px-2 rounded bg-red-900/40 text-red-300 font-semibold">
                                                        🚫 İPTAL
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 text-white">
                                            <div className="text-sm">
                                                <div className="font-medium">
                                                    {pkg.status === 'cancelled'
                                                        ? formatTurkishTime(pkg.cancelled_at || undefined)
                                                        : formatTurkishTime(pkg.delivered_at)}
                                                </div>
                                                <div className="text-slate-400 text-xs">
                                                    {pkg.status === 'cancelled' && pkg.cancelled_at
                                                        ? new Date(pkg.cancelled_at).toLocaleDateString('tr-TR')
                                                        : pkg.delivered_at
                                                            ? new Date(pkg.delivered_at).toLocaleDateString('tr-TR')
                                                            : '-'}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 font-medium text-white">
                                            <div>{pkg.customer_name}</div>
                                            {pkg.customer_phone && (
                                                <div className="text-xs text-slate-400 mt-1">📞 {pkg.customer_phone}</div>
                                            )}
                                        </td>
                                        <td className="py-3 px-4 text-white">{pkg.restaurant?.name}</td>
                                        <td className="py-3 px-4 text-white">
                                            {pkg.status === 'cancelled' ? (
                                                <span className="text-slate-400 italic">-</span>
                                            ) : (
                                                pkg.courier_name || 'Bilinmeyen'
                                            )}
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className={`px-2 py-1 rounded text-xs font-semibold ${pkg.status === 'delivered'
                                                ? 'bg-green-950/60 text-green-400 border border-green-900/30'
                                                : pkg.status === 'cancelled'
                                                    ? 'bg-red-950/60 text-red-400 border border-red-900/30'
                                                    : 'bg-slate-800 text-slate-300'
                                                }`}>
                                                {pkg.status === 'delivered' ? '✅ Teslim Edildi' : pkg.status === 'cancelled' ? '🚫 İptal Edildi' : pkg.status}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className={`font-bold ${pkg.status === 'cancelled'
                                                ? 'text-slate-500 line-through'
                                                : 'text-green-400 font-extrabold text-base'
                                                }`}>
                                                {pkg.amount}₺
                                            </span>
                                        </td>
                                        <td className="py-3 px-4">
                                            {pkg.status === 'cancelled' ? (
                                                <span className="text-xs text-slate-500 italic">İptal</span>
                                            ) : (
                                                <span className={`px-2 py-1 rounded text-xs font-medium ${pkg.payment_method === 'cash'
                                                    ? 'bg-green-950/60 text-green-400 border border-green-900/30'
                                                    : pkg.payment_method === 'iban'
                                                    ? 'bg-purple-950/60 text-purple-400 border border-purple-900/30'
                                                    : 'bg-orange-950/60 text-orange-400 border border-orange-900/30'
                                                    }`}>
                                                    {pkg.payment_method === 'cash' ? '💵 Nakit' : pkg.payment_method === 'iban' ? '🏦 IBAN' : '💳 Kart'}
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                
                {/* Sayfalama */}
                {!isLoading && totalPages > 1 && (
                    <div className="flex justify-center items-center gap-2 mt-6">
                        {/* Önceki Sayfa */}
                        <button
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                currentPage === 1
                                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                                    : 'bg-slate-700 text-white hover:bg-slate-600 border border-slate-600'
                            }`}
                        >
                            ← Önceki
                        </button>

                        {/* Sayfa Numaraları */}
                        <div className="flex gap-1">
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => {
                                const showPage = 
                                    pageNum <= 3 || 
                                    pageNum > totalPages - 3 || 
                                    Math.abs(pageNum - currentPage) <= 2

                                if (!showPage) {
                                    if (pageNum === 4 && currentPage > 6) {
                                        return <span key={pageNum} className="px-2 py-2 text-slate-500">...</span>
                                    }
                                    if (pageNum === totalPages - 3 && currentPage < totalPages - 5) {
                                        return <span key={pageNum} className="px-2 py-2 text-slate-500">...</span>
                                    }
                                    return null
                                }

                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => handlePageChange(pageNum)}
                                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                            currentPage === pageNum
                                                ? 'bg-orange-600 text-white shadow-lg'
                                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                                        }`}
                                    >
                                        {pageNum}
                                    </button>
                                )
                            })}
                        </div>

                        {/* Sonraki Sayfa */}
                        <button
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                currentPage === totalPages
                                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                                    : 'bg-slate-700 text-white hover:bg-slate-600 border border-slate-600'
                            }`}
                        >
                            Sonraki →
                        </button>
                    </div>
                )}
            </div>
        </>
    )
}
