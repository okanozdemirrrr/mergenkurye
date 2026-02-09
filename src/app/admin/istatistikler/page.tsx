/**
 * @file src/app/admin/istatistikler/page.tsx
 * @description Genel İstatistikler Sayfası - Ödeme yöntemleri dağılımı ve pasta grafiği
 */
'use client'

import { useState, useEffect } from 'react'
import { useAdminData } from '../AdminDataProvider'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'

type TimeFilter = 'today' | 'week' | 'month'

interface PaymentStats {
  cash: number
  card: number
  iban: number
  total: number
}

interface CourierStats {
  courier_id: string
  courier_name: string
  packageCount: number
  totalAmount: number
}

export default function IstatistiklerPage() {
  const { packages, deliveredPackages, couriers } = useAdminData()
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('today')
  const [stats, setStats] = useState<PaymentStats>({ cash: 0, card: 0, iban: 0, total: 0 })
  const [courierStats, setCourierStats] = useState<CourierStats[]>([])

  // Otomatik yenileme - 30 saniyede bir
  useEffect(() => {
    calculateStats()
    calculateCourierStats()
    const interval = setInterval(() => {
      calculateStats()
      calculateCourierStats()
    }, 30000) // 30 saniye

    return () => clearInterval(interval)
  }, [deliveredPackages, couriers, timeFilter])

  const calculateStats = () => {
    const now = new Date()
    let startDate: Date

    // Zaman filtresine göre başlangıç tarihi
    switch (timeFilter) {
      case 'today':
        startDate = new Date(now.setHours(0, 0, 0, 0))
        break
      case 'week':
        startDate = new Date(now.setDate(now.getDate() - 7))
        break
      case 'month':
        startDate = new Date(now.setMonth(now.getMonth() - 1))
        break
      default:
        startDate = new Date(now.setHours(0, 0, 0, 0))
    }

    console.log('📊 İstatistik Hesaplama:', {
      timeFilter,
      startDate: startDate.toISOString(),
      totalDeliveredPackages: deliveredPackages.length,
      deliveredPackagesSample: deliveredPackages.slice(0, 3)
    })

    // Teslim edilmiş paketleri filtrele
    const filteredPackages = deliveredPackages.filter(pkg => {
      if (pkg.status !== 'delivered') return false
      if (!pkg.delivered_at) return false
      
      const deliveredDate = new Date(pkg.delivered_at)
      return deliveredDate >= startDate
    })

    console.log('📊 Filtrelenmiş Paketler:', {
      count: filteredPackages.length,
      packages: filteredPackages.map(p => ({
        id: p.id,
        amount: p.amount,
        payment_method: p.payment_method,
        delivered_at: p.delivered_at
      }))
    })

    // Ödeme yöntemlerine göre topla
    const cashTotal = filteredPackages
      .filter(p => p.payment_method === 'cash')
      .reduce((sum, p) => sum + (p.amount || 0), 0)

    const cardTotal = filteredPackages
      .filter(p => p.payment_method === 'card')
      .reduce((sum, p) => sum + (p.amount || 0), 0)

    const ibanTotal = filteredPackages
      .filter(p => p.payment_method === 'iban')
      .reduce((sum, p) => sum + (p.amount || 0), 0)

    console.log('📊 Hesaplanan Toplamlar:', {
      cashTotal,
      cardTotal,
      ibanTotal,
      total: cashTotal + cardTotal + ibanTotal
    })

    setStats({
      cash: cashTotal,
      card: cardTotal,
      iban: ibanTotal,
      total: cashTotal + cardTotal + ibanTotal
    })
  }

  const calculateCourierStats = () => {
    const now = new Date()
    let startDate: Date

    // Zaman filtresine göre başlangıç tarihi
    switch (timeFilter) {
      case 'today':
        startDate = new Date(now.setHours(0, 0, 0, 0))
        break
      case 'week':
        startDate = new Date(now.setDate(now.getDate() - 7))
        break
      case 'month':
        startDate = new Date(now.setMonth(now.getMonth() - 1))
        break
      default:
        startDate = new Date(now.setHours(0, 0, 0, 0))
    }

    // Teslim edilmiş paketleri filtrele
    const filteredPackages = deliveredPackages.filter(pkg => {
      if (pkg.status !== 'delivered') return false
      if (!pkg.delivered_at) return false
      if (!pkg.courier_id) return false
      
      const deliveredDate = new Date(pkg.delivered_at)
      return deliveredDate >= startDate
    })

    // Kurye bazında grupla
    const courierMap = new Map<string, { name: string, count: number, amount: number }>()

    filteredPackages.forEach(pkg => {
      if (!pkg.courier_id) return

      const existing = courierMap.get(pkg.courier_id)
      const courierName = couriers.find(c => c.id === pkg.courier_id)?.full_name || 'Bilinmeyen Kurye'

      if (existing) {
        existing.count += 1
        existing.amount += pkg.amount || 0
      } else {
        courierMap.set(pkg.courier_id, {
          name: courierName,
          count: 1,
          amount: pkg.amount || 0
        })
      }
    })

    // Array'e çevir ve sırala
    const courierArray: CourierStats[] = Array.from(courierMap.entries())
      .map(([courier_id, data]) => ({
        courier_id,
        courier_name: data.name,
        packageCount: data.count,
        totalAmount: data.amount
      }))
      .sort((a, b) => b.packageCount - a.packageCount) // En çok teslimat yapandan başla

    console.log('📊 Kurye İstatistikleri:', courierArray)
    setCourierStats(courierArray)
  }

  // Pasta grafiği için veri
  const pieData = [
    { name: 'Nakit', value: stats.cash, color: '#10b981' }, // Yeşil
    { name: 'Kart', value: stats.card, color: '#3b82f6' },  // Mavi
    { name: 'IBAN', value: stats.iban, color: '#f59e0b' }   // Turuncu/Altın
  ].filter(item => item.value > 0) // Sadece 0'dan büyük olanları göster

  // Kurye pasta grafiği için veri
  const courierPieData = courierStats.map((courier, index) => {
    const colors = ['#8b5cf6', '#ec4899', '#f97316', '#14b8a6', '#06b6d4', '#6366f1', '#a855f7', '#f43f5e']
    return {
      name: courier.courier_name,
      value: courier.packageCount,
      color: colors[index % colors.length]
    }
  })

  // Yüzde hesaplama
  const getPercentage = (value: number) => {
    if (stats.total === 0) return 0
    return ((value / stats.total) * 100).toFixed(1)
  }

  // Custom label renderer
  const renderCustomLabel = (entry: any) => {
    const percent = getPercentage(entry.value)
    return `${percent}%`
  }

  return (
    <div className="min-h-screen bg-slate-950 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">📊 Genel İstatistikler</h1>
          <p className="text-slate-400 text-sm">Ödeme yöntemleri dağılımı ve finansal özet</p>
        </div>

        {/* Zaman Filtreleri */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 mb-6">
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setTimeFilter('today')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                timeFilter === 'today'
                  ? 'bg-orange-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              📅 Bugün
            </button>
            <button
              onClick={() => setTimeFilter('week')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                timeFilter === 'week'
                  ? 'bg-orange-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              📆 Haftalık
            </button>
            <button
              onClick={() => setTimeFilter('month')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                timeFilter === 'month'
                  ? 'bg-orange-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              📊 Aylık
            </button>
          </div>
          <p className="text-slate-500 text-xs mt-2">
            ⏱️ Otomatik yenileme: 30 saniye
          </p>
        </div>

        {/* İstatistik Kartları */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl border border-slate-700 p-6">
            <div className="text-slate-400 text-sm mb-2">💰 Toplam Ciro</div>
            <div className="text-3xl font-bold text-white">{stats.total.toFixed(2)} ₺</div>
          </div>

          <div className="bg-gradient-to-br from-green-900/30 to-green-800/20 rounded-xl border border-green-700/50 p-6">
            <div className="text-green-400 text-sm mb-2">💵 Nakit</div>
            <div className="text-3xl font-bold text-green-300">{stats.cash.toFixed(2)} ₺</div>
            <div className="text-green-500 text-xs mt-1">{getPercentage(stats.cash)}%</div>
          </div>

          <div className="bg-gradient-to-br from-blue-900/30 to-blue-800/20 rounded-xl border border-blue-700/50 p-6">
            <div className="text-blue-400 text-sm mb-2">💳 Kart</div>
            <div className="text-3xl font-bold text-blue-300">{stats.card.toFixed(2)} ₺</div>
            <div className="text-blue-500 text-xs mt-1">{getPercentage(stats.card)}%</div>
          </div>

          <div className="bg-gradient-to-br from-orange-900/30 to-orange-800/20 rounded-xl border border-orange-700/50 p-6">
            <div className="text-orange-400 text-sm mb-2">🏦 IBAN</div>
            <div className="text-3xl font-bold text-orange-300">{stats.iban.toFixed(2)} ₺</div>
            <div className="text-orange-500 text-xs mt-1">{getPercentage(stats.iban)}%</div>
            <div className="text-orange-600 text-[10px] mt-1">İbrahim Okan Özdemir</div>
          </div>
        </div>

        {/* Pasta Grafiği */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
          <h2 className="text-xl font-bold text-white mb-4">📈 Ödeme Yöntemleri Dağılımı</h2>
          
          {stats.total === 0 ? (
            <div className="text-center py-20">
              <p className="text-slate-500 text-lg">Henüz veri yok</p>
              <p className="text-slate-600 text-sm mt-2">Seçili zaman aralığında teslim edilmiş sipariş bulunmuyor</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              {/* Pasta Grafiği */}
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={renderCustomLabel}
                      outerRadius={120}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => `${value.toFixed(2)} ₺`}
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '8px',
                        color: '#fff'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Detaylı Liste */}
              <div className="space-y-4">
                <div className="bg-green-900/20 border border-green-700/50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                      <span className="text-white font-medium">💵 Nakit</span>
                    </div>
                    <span className="text-green-400 font-bold">{getPercentage(stats.cash)}%</span>
                  </div>
                  <div className="text-2xl font-bold text-green-300">{stats.cash.toFixed(2)} ₺</div>
                </div>

                <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                      <span className="text-white font-medium">💳 Kart</span>
                    </div>
                    <span className="text-blue-400 font-bold">{getPercentage(stats.card)}%</span>
                  </div>
                  <div className="text-2xl font-bold text-blue-300">{stats.card.toFixed(2)} ₺</div>
                </div>

                <div className="bg-orange-900/20 border border-orange-700/50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-orange-500 rounded-full"></div>
                      <span className="text-white font-medium">🏦 IBAN</span>
                    </div>
                    <span className="text-orange-400 font-bold">{getPercentage(stats.iban)}%</span>
                  </div>
                  <div className="text-2xl font-bold text-orange-300">{stats.iban.toFixed(2)} ₺</div>
                  <div className="text-orange-500 text-xs mt-1">İbrahim Okan Özdemir</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Kurye Performans Grafiği */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 mt-6">
          <h2 className="text-xl font-bold text-white mb-4">🚴 Kurye Performansı</h2>
          
          {courierStats.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-slate-500 text-lg">Henüz veri yok</p>
              <p className="text-slate-600 text-sm mt-2">Seçili zaman aralığında kurye teslimatı bulunmuyor</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              {/* Kurye Pasta Grafiği */}
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={courierPieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.value}`}
                      outerRadius={120}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {courierPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => `${value} paket`}
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '8px',
                        color: '#fff'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Kurye Detaylı Liste */}
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {courierStats.map((courier, index) => {
                  const colors = [
                    { bg: 'bg-purple-900/20', border: 'border-purple-700/50', text: 'text-purple-300', dot: 'bg-purple-500' },
                    { bg: 'bg-pink-900/20', border: 'border-pink-700/50', text: 'text-pink-300', dot: 'bg-pink-500' },
                    { bg: 'bg-orange-900/20', border: 'border-orange-700/50', text: 'text-orange-300', dot: 'bg-orange-500' },
                    { bg: 'bg-teal-900/20', border: 'border-teal-700/50', text: 'text-teal-300', dot: 'bg-teal-500' },
                    { bg: 'bg-cyan-900/20', border: 'border-cyan-700/50', text: 'text-cyan-300', dot: 'bg-cyan-500' },
                    { bg: 'bg-indigo-900/20', border: 'border-indigo-700/50', text: 'text-indigo-300', dot: 'bg-indigo-500' },
                    { bg: 'bg-violet-900/20', border: 'border-violet-700/50', text: 'text-violet-300', dot: 'bg-violet-500' },
                    { bg: 'bg-rose-900/20', border: 'border-rose-700/50', text: 'text-rose-300', dot: 'bg-rose-500' }
                  ]
                  const colorSet = colors[index % colors.length]
                  
                  const totalPackages = courierStats.reduce((sum, c) => sum + c.packageCount, 0)
                  const percentage = ((courier.packageCount / totalPackages) * 100).toFixed(1)

                  return (
                    <div key={courier.courier_id} className={`${colorSet.bg} border ${colorSet.border} rounded-lg p-4`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-4 h-4 ${colorSet.dot} rounded-full`}></div>
                          <span className="text-white font-medium">{courier.courier_name}</span>
                        </div>
                        <span className={`${colorSet.text} font-bold`}>{percentage}%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <div>
                          <div className={`text-2xl font-bold ${colorSet.text}`}>{courier.packageCount} paket</div>
                          <div className="text-slate-400 text-sm mt-1">{courier.totalAmount.toFixed(2)} ₺</div>
                        </div>
                        <div className="text-right">
                          <div className="text-slate-500 text-xs">Ortalama</div>
                          <div className="text-slate-300 text-sm font-medium">
                            {(courier.totalAmount / courier.packageCount).toFixed(2)} ₺
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
