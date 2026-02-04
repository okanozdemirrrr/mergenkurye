/**
 * @file src/app/admin/components/CouriersTab.tsx
 * @description Kurye Yönetim Paneli Bileşeni.
 * Kuryelerin listelendiği, performans grafiklerinin (son 30 gün) ve 
 * hakediş (kazanç) raporlarının yönetildiği çok fonksiyonlu sekmeyi oluşturur. 
 * Kuryelerin aktiflik durumu, günlük teslimat sayıları ve borç takibi burada yapılır.
 */
'use client'

import { useState, useEffect } from 'react'
import { Courier, Package } from '@/types'
import { supabase } from '@/app/lib/supabase'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface CouriersTabProps {
    couriers: Courier[]
    courierSubTab: string
    deliveredPackages: Package[]
    onCourierClick: (id: string) => void
    courierEarningsFilter: 'today' | 'week' | 'month'
    setCourierEarningsFilter: (filter: 'today' | 'week' | 'month') => void
}

export function CouriersTab({
    couriers,
    courierSubTab,
    deliveredPackages,
    onCourierClick,
    courierEarningsFilter,
    setCourierEarningsFilter
}: CouriersTabProps) {
    // Kurye Hesapları
    if (courierSubTab === 'accounts') {
        return (
            <div className="bg-white shadow-xl rounded-2xl p-6">
                <h2 className="text-2xl font-bold mb-6">👥 Kurye Listesi</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {couriers.length === 0 ? (
                        <div className="col-span-full text-center py-8 text-slate-500">
                            <div className="text-4xl mb-2">🚫</div>
                            <div className="font-bold">Kurye bulunamadı!</div>
                        </div>
                    ) : (
                        couriers.map(courier => (
                            <div
                                key={courier.id}
                                onClick={() => onCourierClick(courier.id)}
                                className="bg-gradient-to-br from-slate-50 to-slate-100 p-5 rounded-xl border-2 border-slate-200 shadow-lg hover:shadow-xl transition-all cursor-pointer hover:scale-105"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="font-bold text-lg text-slate-900">
                                            {courier.full_name}
                                        </h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            <div className={`w-2 h-2 rounded-full ${courier.is_active ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                            <span className={`text-xs font-medium ${courier.is_active ? 'text-green-600' : 'text-red-600'}`}>
                                                {courier.is_active ? 'Aktif' : 'Pasif'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-white p-3 rounded-lg">
                                        <div className="text-xs text-slate-600 mb-1">Bugün</div>
                                        <div className="text-xl font-bold text-green-600">
                                            {courier.todayDeliveryCount || 0}
                                        </div>
                                    </div>
                                    <div className="bg-white p-3 rounded-lg">
                                        <div className="text-xs text-slate-600 mb-1">Aktif</div>
                                        <div className="text-xl font-bold text-blue-600">
                                            {courier.activePackageCount || 0}
                                        </div>
                                    </div>
                                    <div className="bg-white p-3 rounded-lg">
                                        <div className="text-xs text-slate-600 mb-1">Toplam</div>
                                        <div className="text-xl font-bold text-indigo-600">
                                            {courier.deliveryCount || 0}
                                        </div>
                                    </div>
                                    <div className="bg-white p-3 rounded-lg">
                                        <div className="text-xs text-slate-600 mb-1">Borç</div>
                                        <div className={`text-xl font-bold ${(courier.totalDebt || 0) > 0
                                            ? 'text-red-600'
                                            : 'text-green-600'
                                            }`}>
                                            {(courier.totalDebt || 0).toFixed(2)}₺
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        onCourierClick(courier.id)
                                    }}
                                    className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium transition-colors"
                                >
                                    📊 Detaylı Rapor Görüntüle
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        )
    }

    // Kurye Performansları
    if (courierSubTab === 'performance') {
        const [selectedCourierId, setSelectedCourierId] = useState<string>('')
        const [performanceData, setPerformanceData] = useState<{ date: string; count: number }[]>([])
        const [loadingPerformance, setLoadingPerformance] = useState(false)

        useEffect(() => {
            if (selectedCourierId) {
                fetchCourierPerformance(selectedCourierId)
            }
        }, [selectedCourierId])

        const fetchCourierPerformance = async (courierId: string) => {
            setLoadingPerformance(true)
            try {
                const endDate = new Date()
                endDate.setHours(23, 59, 59, 999)

                const startDate = new Date()
                startDate.setDate(startDate.getDate() - 29)
                startDate.setHours(0, 0, 0, 0)

                const { data, error } = await supabase
                    .from('packages')
                    .select('delivered_at')
                    .eq('courier_id', courierId)
                    .eq('status', 'delivered')
                    .gte('delivered_at', startDate.toISOString())
                    .lte('delivered_at', endDate.toISOString())
                    .order('delivered_at', { ascending: true })

                if (error) throw error

                const dailyData: { [key: string]: number } = {}

                for (let i = 0; i < 30; i++) {
                    const date = new Date()
                    date.setDate(date.getDate() - (29 - i))
                    const turkeyDate = new Date(date.getTime() + (3 * 60 * 60 * 1000))
                    const dateKey = turkeyDate.toISOString().split('T')[0]
                    dailyData[dateKey] = 0
                }

                data?.forEach(pkg => {
                    if (pkg.delivered_at) {
                        const utcDate = new Date(pkg.delivered_at)
                        const turkeyDate = new Date(utcDate.getTime() + (3 * 60 * 60 * 1000))
                        const dateKey = turkeyDate.toISOString().split('T')[0]

                        if (dailyData.hasOwnProperty(dateKey)) {
                            dailyData[dateKey]++
                        }
                    }
                })

                const chartData = Object.keys(dailyData)
                    .sort()
                    .map(dateKey => {
                        const date = new Date(dateKey)
                        const formattedDate = `${date.getDate()} ${date.toLocaleDateString('tr-TR', { month: 'short' })}`
                        return {
                            date: formattedDate,
                            count: dailyData[dateKey]
                        }
                    })

                setPerformanceData(chartData)
            } catch (error) {
                console.error('Performans verisi çekilirken hata:', error)
                setPerformanceData([])
            } finally {
                setLoadingPerformance(false)
            }
        }

        return (
            <div className="bg-white shadow-xl rounded-2xl p-6">
                <h2 className="text-2xl font-bold mb-6">📊 Kurye Performansları</h2>

                <div className="mb-8">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                        Performansını görüntülemek istediğiniz kuryeyi seçin
                    </label>
                    <select
                        value={selectedCourierId}
                        onChange={(e) => setSelectedCourierId(e.target.value)}
                        className="w-full max-w-md px-4 py-3 bg-slate-50 text-slate-900 rounded-xl border-2 border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-base font-medium"
                    >
                        <option value="">-- Kurye Seçin --</option>
                        {couriers.map(courier => (
                            <option key={courier.id} value={courier.id}>
                                {courier.full_name} {courier.is_active ? '✓' : '(Pasif)'}
                            </option>
                        ))}
                    </select>
                </div>

                {!selectedCourierId && (
                    <div className="text-center py-16 text-slate-500">
                        <div className="text-6xl mb-4">📈</div>
                        <p className="text-lg font-medium">Lütfen bir kurye seçin</p>
                        <p className="text-sm mt-2">Seçilen kuryenin son 30 günlük performansı burada görünecek</p>
                    </div>
                )}

                {selectedCourierId && loadingPerformance && (
                    <div className="text-center py-16">
                        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-slate-500">Performans verileri yükleniyor...</p>
                    </div>
                )}

                {selectedCourierId && !loadingPerformance && performanceData.length > 0 && (
                    <div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border-2 border-blue-200">
                                <div className="text-sm font-medium text-blue-700 mb-1">
                                    Toplam Teslimat (30 Gün)
                                </div>
                                <div className="text-3xl font-black text-blue-600">
                                    {performanceData.reduce((sum, d) => sum + d.count, 0)}
                                </div>
                            </div>

                            <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl border-2 border-green-200">
                                <div className="text-sm font-medium text-green-700 mb-1">
                                    Günlük Ortalama
                                </div>
                                <div className="text-3xl font-black text-green-600">
                                    {(performanceData.reduce((sum, d) => sum + d.count, 0) / 30).toFixed(1)}
                                </div>
                            </div>

                            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl border-2 border-purple-200">
                                <div className="text-sm font-medium text-purple-700 mb-1">
                                    En Yüksek Günlük
                                </div>
                                <div className="text-3xl font-black text-purple-600">
                                    {Math.max(...performanceData.map(d => d.count))}
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-50 p-6 rounded-xl border-2 border-slate-200">
                            <h3 className="text-lg font-bold mb-4 text-slate-900">
                                Son 30 Günlük Performans Trendi
                            </h3>
                            <ResponsiveContainer width="100%" height={400}>
                                <LineChart data={performanceData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                                    <XAxis
                                        dataKey="date"
                                        stroke="#9CA3AF"
                                        tick={{ fill: '#9CA3AF', fontSize: 12 }}
                                        angle={-45}
                                        textAnchor="end"
                                        height={80}
                                    />
                                    <YAxis
                                        stroke="#9CA3AF"
                                        tick={{ fill: '#9CA3AF', fontSize: 12 }}
                                        label={{ value: 'Paket Sayısı', angle: -90, position: 'insideLeft', fill: '#9CA3AF' }}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: '#1e293b',
                                            border: '2px solid #3b82f6',
                                            borderRadius: '8px',
                                            color: '#ffffff'
                                        }}
                                        labelStyle={{ color: '#ffffff', fontWeight: 'bold' }}
                                    />
                                    <Legend
                                        wrapperStyle={{ paddingTop: '20px' }}
                                        iconType="line"
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="count"
                                        name="Teslimat Sayısı"
                                        stroke="#3b82f6"
                                        strokeWidth={3}
                                        dot={{ fill: '#3b82f6', r: 4 }}
                                        activeDot={{ r: 6, fill: '#2563eb' }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="mt-6 bg-white rounded-xl border-2 border-slate-200 overflow-hidden">
                            <div className="p-4 bg-slate-100 border-b border-slate-200">
                                <h3 className="text-lg font-bold text-slate-900">
                                    📋 Günlük Detay
                                </h3>
                            </div>
                            <div className="max-h-96 overflow-y-auto">
                                <table className="w-full text-sm">
                                    <thead className="sticky top-0 bg-slate-50 border-b-2 border-slate-200">
                                        <tr>
                                            <th className="text-left py-3 px-4 font-semibold">Tarih</th>
                                            <th className="text-right py-3 px-4 font-semibold">Teslimat Sayısı</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {performanceData.slice().reverse().map((day, index) => (
                                            <tr
                                                key={index}
                                                className={`border-b border-slate-200 hover:bg-slate-50:bg-slate-700/30 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                                                    }`}
                                            >
                                                <td className="py-3 px-4 font-medium">{day.date}</td>
                                                <td className="py-3 px-4 text-right">
                                                    <span className={`font-bold ${day.count > 0
                                                        ? 'text-green-600'
                                                        : 'text-slate-400'
                                                        }`}>
                                                        {day.count}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        )
    }

    // Kurye Kazançları
    if (courierSubTab === 'earnings') {
        const getStartDate = () => {
            const now = new Date()
            const start = new Date()

            if (courierEarningsFilter === 'today') {
                start.setHours(0, 0, 0, 0)
            } else if (courierEarningsFilter === 'week') {
                start.setDate(now.getDate() - 7)
            } else if (courierEarningsFilter === 'month') {
                start.setDate(now.getDate() - 30)
            }

            return start
        }

        const courierEarnings = couriers.map(courier => {
            const startDate = getStartDate()

            const deliveredCount = deliveredPackages.filter(pkg =>
                pkg.courier_id === courier.id &&
                pkg.delivered_at &&
                new Date(pkg.delivered_at) >= startDate
            ).length

            const earnings = deliveredCount * 80

            return {
                ...courier,
                deliveredCount,
                earnings
            }
        }).sort((a, b) => b.earnings - a.earnings)

        const totalEarnings = courierEarnings.reduce((sum, c) => sum + c.earnings, 0)
        const totalDeliveries = courierEarnings.reduce((sum, c) => sum + c.deliveredCount, 0)

        return (
            <div className="bg-white shadow-xl rounded-2xl p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">💰 Kurye Kazançları (Hakediş)</h2>

                    <select
                        value={courierEarningsFilter}
                        onChange={(e) => setCourierEarningsFilter(e.target.value as 'today' | 'week' | 'month')}
                        className="px-4 py-2 bg-slate-100 text-slate-900 rounded-lg border border-slate-300 font-medium"
                    >
                        <option value="today">📅 Bugün</option>
                        <option value="week">📅 Haftalık (7 Gün)</option>
                        <option value="month">📅 Aylık (30 Gün)</option>
                    </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-xl border-2 border-green-300">
                        <div className="text-center">
                            <div className="text-3xl font-black text-green-700">
                                {totalEarnings.toFixed(2)} ₺
                            </div>
                            <div className="text-sm font-semibold text-green-600 mt-1">
                                💰 TOPLAM HAKEDİŞ
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-4 rounded-xl border-2 border-blue-300">
                        <div className="text-center">
                            <div className="text-3xl font-black text-blue-700">
                                {totalDeliveries}
                            </div>
                            <div className="text-sm font-semibold text-blue-600 mt-1">
                                📦 TOPLAM TESLİMAT
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-xl border-2 border-purple-300">
                        <div className="text-center">
                            <div className="text-3xl font-black text-purple-700">
                                {couriers.length}
                            </div>
                            <div className="text-sm font-semibold text-purple-600 mt-1">
                                👥 TOPLAM KURYE
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-3">
                    {courierEarnings.length === 0 ? (
                        <div className="text-center py-8 text-slate-500">
                            <div className="text-4xl mb-2">🚫</div>
                            <p>Kurye bulunamadı</p>
                        </div>
                    ) : (
                        courierEarnings.map((courier, index) => (
                            <div
                                key={courier.id}
                                className={`p-4 rounded-xl border transition-all ${courier.earnings > 0
                                    ? 'bg-slate-50 border-slate-200'
                                    : 'bg-slate-100 border-slate-300 opacity-60'
                                    }`}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="text-2xl font-bold text-slate-400">
                                            #{index + 1}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                                                {courier.full_name}
                                                {courier.is_active && (
                                                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                                                        Aktif
                                                    </span>
                                                )}
                                            </h4>
                                            <p className="text-sm text-slate-500">
                                                {courier.deliveredCount} paket × 80₺
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right flex flex-col items-end gap-2">
                                        <div className="text-3xl font-black text-green-600">
                                            {courier.earnings.toFixed(2)} ₺
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                onCourierClick(courier.id)
                                            }}
                                            className="px-4 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-xs font-bold hover:bg-blue-200:bg-blue-800 transition-colors"
                                        >
                                            📊 Rapor
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        )
    }

    return null
}
