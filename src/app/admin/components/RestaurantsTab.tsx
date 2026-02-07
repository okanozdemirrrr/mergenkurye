/**
 * @file src/app/admin/components/RestaurantsTab.tsx
 * @description Restoran Yönetim Paneli Bileşeni.
 * Restoran listesi, sipariş analizleri (paket dağılımı ve ciro grafikleri) 
 * ve restoran finansal durumlarının (borç ve ödemeler) takip edildiği sekmeyi yönetir. 
 * Paket başı komisyon hesaplamaları ve restoran hakediş raporlarını içerir.
 */
'use client'

import { useState } from 'react'
import { Restaurant, Package } from '@/types'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface RestaurantsTabProps {
    restaurants: Restaurant[]
    restaurantSubTab: string
    deliveredPackages: Package[]
    onRestaurantClick: (id: number | string) => void
    onDebtPayClick?: (id: number | string) => void
    restaurantChartFilter: 'today' | 'week' | 'month'
    setRestaurantChartFilter: (filter: 'today' | 'week' | 'month') => void
}

export function RestaurantsTab({
    restaurants,
    restaurantSubTab,
    deliveredPackages,
    onRestaurantClick,
    onDebtPayClick,
    restaurantChartFilter,
    setRestaurantChartFilter
}: RestaurantsTabProps) {
    // Liste
    if (restaurantSubTab === 'list') {
        return (
            <div className="bg-slate-900 shadow-xl rounded-2xl p-6">
                <h2 className="text-2xl font-bold mb-6">📋 Restoranlar Listesi</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {restaurants.length === 0 ? (
                        <div className="col-span-full text-center py-8 text-slate-500">
                            <div className="text-4xl mb-2">🚫</div>
                            <div className="font-bold">Restoran bulunamadı!</div>
                        </div>
                    ) : (
                        restaurants.map(r => (
                            <div key={r.id} className="bg-slate-50 p-4 rounded-xl border hover:shadow-lg transition-all">
                                <div className="flex justify-between items-start mb-3">
                                    <button
                                        onClick={() => onRestaurantClick(r.id)}
                                        className="font-bold text-lg text-orange-600 hover:text-orange-800:text-orange-300 transition-colors cursor-pointer text-left"
                                    >
                                        🍽️ {r.name}
                                    </button>
                                </div>

                                <div className="space-y-2 text-sm">
                                    {r.phone && (
                                        <div className="text-slate-600">
                                            📞 {r.phone}
                                        </div>
                                    )}
                                    {r.address && (
                                        <div className="text-slate-600 text-xs">
                                            📍 {r.address}
                                        </div>
                                    )}

                                    <button
                                        onClick={() => onRestaurantClick(r.id)}
                                        className="w-full mt-3 text-xs bg-orange-100 text-orange-700 py-2 rounded-lg hover:bg-orange-200:bg-orange-900/50 transition-colors"
                                    >
                                        📊 Detaylı Rapor Görüntüle
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        )
    }

    // Detay (Sipariş Detayları)
    if (restaurantSubTab === 'details') {
        const getFilteredPackages = () => {
            const now = new Date()
            let startDate = new Date()

            if (restaurantChartFilter === 'today') {
                startDate.setHours(0, 0, 0, 0)
            } else if (restaurantChartFilter === 'week') {
                startDate.setDate(now.getDate() - 7)
                startDate.setHours(0, 0, 0, 0)
            } else if (restaurantChartFilter === 'month') {
                startDate.setDate(now.getDate() - 30)
                startDate.setHours(0, 0, 0, 0)
            }

            return deliveredPackages.filter(pkg =>
                pkg.delivered_at && new Date(pkg.delivered_at) >= startDate
            )
        }

        const filteredPackages = getFilteredPackages()

        const restaurantPacketCounts = filteredPackages.reduce((acc, pkg) => {
            const name = pkg.restaurant?.name || 'Bilinmeyen'
            acc[name] = (acc[name] || 0) + 1
            return acc
        }, {} as { [key: string]: number })

        const restaurantRevenues = filteredPackages.reduce((acc, pkg) => {
            const name = pkg.restaurant?.name || 'Bilinmeyen'
            acc[name] = (acc[name] || 0) + (pkg.amount || 0)
            return acc
        }, {} as { [key: string]: number })

        const pieChartData = Object.entries(restaurantPacketCounts)
            .sort(([, a], [, b]) => b - a)
            .map(([name, count]) => ({
                name,
                value: count
            }))

        const barChartData = Object.entries(restaurantRevenues)
            .sort(([, a], [, b]) => b - a)
            .map(([name, revenue]) => ({
                name,
                ciro: revenue
            }))

        const COLORS = ['#3B82F6', '#06B6D4', '#475569', '#0EA5E9', '#64748B', '#0284C7', '#334155']
        const hasData = pieChartData.length > 0

        return (
            <div className="bg-slate-900 shadow-xl rounded-2xl p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">📊 Restoran Sipariş Detayları</h2>
                    <select
                        value={restaurantChartFilter}
                        onChange={(e) => setRestaurantChartFilter(e.target.value as any)}
                        className="px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-sm"
                    >
                        <option value="today">Bugün</option>
                        <option value="week">Bu Hafta</option>
                        <option value="month">Bu Ay</option>
                    </select>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-slate-50 p-4 rounded-xl border">
                        <h3 className="text-lg font-bold mb-4">📦 Restoran Paket Dağılımı</h3>
                        {!hasData ? (
                            <div className="flex items-center justify-center h-[300px] text-slate-500">
                                <div className="text-center">
                                    <div className="text-4xl mb-2">📊</div>
                                    <p className="text-sm">Veri bulunamadı</p>
                                </div>
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={pieChartData}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={({ name, percent }) => `${name}: ${percent ? (percent * 100).toFixed(0) : 0}%`}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        dataKey="value"
                                    >
                                        {pieChartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: '#1e293b',
                                            border: '1px solid #475569',
                                            borderRadius: '8px'
                                        }}
                                        formatter={(value: any) => [`${value} paket`, 'Paket Sayısı']}
                                    />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl border">
                        <h3 className="text-lg font-bold mb-4">💰 Restoran Ciroları</h3>
                        {!hasData ? (
                            <div className="flex items-center justify-center h-[300px] text-slate-500">
                                <div className="text-center">
                                    <div className="text-4xl mb-2">📊</div>
                                    <p className="text-sm">Veri bulunamadı</p>
                                </div>
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={barChartData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                                    <YAxis />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: '#1e293b',
                                            border: '1px solid #475569',
                                            borderRadius: '8px'
                                        }}
                                        formatter={(value: any) => [`${value}₺`, 'Ciro']}
                                    />
                                    <Legend />
                                    <Bar dataKey="ciro" fill="#3B82F6" name="Ciro (₺)" />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>
            </div>
        )
    }

    // Borç
    if (restaurantSubTab === 'debt') {
        const restaurantDebts = restaurants.map(restaurant => {
            const deliveredCount = deliveredPackages.filter(pkg =>
                pkg.restaurant_id === restaurant.id && pkg.status === 'delivered'
            ).length

            const debt = deliveredCount * 100

            return {
                ...restaurant,
                deliveredCount,
                debt
            }
        }).sort((a, b) => b.debt - a.debt)

        const totalDebt = restaurantDebts.reduce((sum, r) => sum + r.debt, 0)
        const totalDeliveries = restaurantDebts.reduce((sum, r) => sum + r.deliveredCount, 0)

        return (
            <div className="bg-slate-900 shadow-xl rounded-2xl p-6">
                <h2 className="text-2xl font-bold mb-6">💳 Restoranların Borcu</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="bg-gradient-to-r from-red-50 to-orange-50 p-4 rounded-xl border-2 border-red-300">
                        <div className="text-center">
                            <div className="text-3xl font-black text-red-700">
                                {totalDebt.toFixed(2)} ₺
                            </div>
                            <div className="text-sm font-semibold text-red-600 mt-1">
                                💳 TOPLAM BORÇ
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-4 rounded-xl border-2 border-orange-300">
                        <div className="text-center">
                            <div className="text-3xl font-black text-orange-700">
                                {totalDeliveries}
                            </div>
                            <div className="text-sm font-semibold text-orange-600 mt-1">
                                📦 TOPLAM TESLİMAT
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-3">
                    {restaurantDebts.length === 0 ? (
                        <div className="text-center py-8 text-slate-500">
                            <div className="text-4xl mb-2">🚫</div>
                            <p>Restoran bulunamadı</p>
                        </div>
                    ) : (
                        restaurantDebts.map((restaurant, index) => (
                            <div
                                key={restaurant.id}
                                className={`p-4 rounded-xl border transition-all ${restaurant.debt > 0
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
                                                🍽️ {restaurant.name}
                                            </h4>
                                            <p className="text-sm text-slate-500">
                                                {restaurant.deliveredCount} paket × 100₺
                                            </p>
                                            {restaurant.phone && (
                                                <p className="text-xs text-slate-400 mt-1">
                                                    📞 {restaurant.phone}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-right flex flex-col items-end gap-2">
                                        <div className="text-3xl font-black text-red-600">
                                            {restaurant.debt.toFixed(2)} ₺
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                onRestaurantClick(restaurant.id)
                                            }}
                                            className="px-4 py-1.5 bg-orange-100 text-orange-700 rounded-lg text-xs font-bold hover:bg-orange-200:bg-orange-800 transition-colors"
                                        >
                                            📊 Rapor
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="mt-6 p-4 bg-orange-50 rounded-lg border border-orange-200">
                    <p className="text-sm text-orange-700">
                        ℹ️ <strong>Not:</strong> Restoran borçları, teslim edilen her paket için 100₺ üzerinden hesaplanmaktadır.
                        Sadece <strong>status = 'delivered'</strong> olan paketler hesaplamaya dahildir.
                        <br />
                        💡 <strong>Kâr Hesabı:</strong> Restoranlardan alınan 100₺ - Kuryelere ödenen 80₺ = 20₺ kâr (paket başına)
                    </p>
                </div>
            </div>
        )
    }

    // Ödemeler
    if (restaurantSubTab === 'payments') {
        // Her restoran için sipariş ve ciro hesapla
        const restaurantsWithStats = restaurants.map(restaurant => {
            const restaurantOrders = deliveredPackages.filter(
                pkg => pkg.restaurant_id === restaurant.id && pkg.status === 'delivered'
            )
            
            const totalOrders = restaurantOrders.length
            const totalRevenue = restaurantOrders.reduce((sum, pkg) => sum + (pkg.amount || 0), 0)
            const totalDebt = totalOrders * 100 // Her paket için 100₺ borç
            
            return {
                ...restaurant,
                totalOrders,
                totalRevenue,
                totalDebt
            }
        })

        return (
            <div className="bg-slate-900 shadow-xl rounded-2xl p-6">
                <h2 className="text-2xl font-bold mb-6">💰 Restoranların Ödemesi</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {restaurants.length === 0 ? (
                        <div className="col-span-full text-center py-8 text-slate-500">
                            <div className="text-4xl mb-2">🚫</div>
                            <div className="font-bold">Restoran bulunamadı!</div>
                        </div>
                    ) : (
                        restaurantsWithStats.map(r => (
                            <div key={r.id} className="bg-slate-50 p-4 rounded-xl border">
                                <div className="flex justify-between items-start mb-3">
                                    <button
                                        onClick={() => onRestaurantClick(r.id)}
                                        className="font-bold text-lg text-orange-600 hover:text-orange-800 transition-colors cursor-pointer text-left"
                                    >
                                        🍽️ {r.name}
                                    </button>
                                </div>

                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-slate-600">Toplam Sipariş:</span>
                                        <span className="font-bold text-orange-600">{r.totalOrders}</span>
                                    </div>

                                    <div className="flex justify-between">
                                        <span className="text-slate-600">Toplam Ciro:</span>
                                        <span className="font-bold text-green-600">{r.totalRevenue.toFixed(2)} ₺</span>
                                    </div>

                                    <div className="flex justify-between">
                                        <span className="text-slate-600">Restorana Borcum:</span>
                                        <span className={`font-bold ${r.totalDebt > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                            {r.totalDebt.toFixed(2)} ₺
                                        </span>
                                    </div>

                                    <div className="mt-3 pt-2 border-t border-slate-200 space-y-2">
                                        <button
                                            onClick={() => onRestaurantClick(r.id)}
                                            className="w-full text-xs bg-orange-100 text-orange-700 py-2 rounded-lg hover:bg-orange-200 transition-colors"
                                        >
                                            📊 Detaylı Rapor Görüntüle
                                        </button>

                                        {r.totalDebt > 0 && onDebtPayClick && (
                                            <button
                                                onClick={() => onDebtPayClick(r.id)}
                                                className="w-full text-xs bg-red-100 text-red-700 py-2 rounded-lg hover:bg-red-200 transition-colors"
                                            >
                                                💳 Borç Öde
                                            </button>
                                        )}
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
