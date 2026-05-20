'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/app/lib/supabase'

interface CommissionData {
  restaurant_id: number
  restaurant_name: string
  total_web_orders: number
  total_web_amount: number
}

type DateFilter = 'today' | 'week' | 'month' | 'all' | 'custom'

export default function KomisyonPage() {
  const [data, setData] = useState<CommissionData[]>([])
  const [loading, setLoading] = useState(true)
  const [dateFilter, setDateFilter] = useState<DateFilter>('today')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')

  // Tarih aralığını hesapla
  const getDateRange = () => {
    const now = new Date()
    let startDate: Date | null = null
    let endDate: Date | null = null

    switch (dateFilter) {
      case 'today':
        startDate = new Date(now.setHours(0, 0, 0, 0))
        endDate = new Date(now.setHours(23, 59, 59, 999))
        break
      case 'week':
        startDate = new Date(now.setDate(now.getDate() - 7))
        endDate = new Date()
        break
      case 'month':
        startDate = new Date(now.setDate(now.getDate() - 30))
        endDate = new Date()
        break
      case 'custom':
        if (customStartDate && customEndDate) {
          startDate = new Date(customStartDate)
          endDate = new Date(customEndDate)
          endDate.setHours(23, 59, 59, 999)
        }
        break
      case 'all':
      default:
        startDate = null
        endDate = null
    }

    return { startDate, endDate }
  }

  // Veriyi çek
  const fetchCommissionData = async () => {
    setLoading(true)
    try {
      const { startDate, endDate } = getDateRange()

      const { data: result, error } = await supabase.rpc('get_platform_commissions', {
        p_start_date: startDate?.toISOString() || null,
        p_end_date: endDate?.toISOString() || null,
      })

      if (error) {
        console.error('Komisyon verisi çekilemedi:', error)
        return
      }

      setData(result || [])
    } catch (err) {
      console.error('Beklenmeyen hata:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCommissionData()
  }, [dateFilter, customStartDate, customEndDate])

  // Toplam hesaplamalar
  const totalOrders = data.reduce((sum, item) => sum + Number(item.total_web_orders), 0)
  const totalRevenue = data.reduce((sum, item) => sum + Number(item.total_web_amount), 0)
  const totalCommission = totalRevenue * 0.1

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            🌐 Web Platform Komisyon Raporu
          </h1>
          <p className="text-slate-400 text-sm">
            Alda Gel platformundan gelen siparişlerin komisyon analizi
          </p>
        </div>

        {/* Filtreler */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 mb-6 border border-slate-700/50">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Hızlı Filtreler */}
            <div className="flex gap-2 flex-wrap">
              {(['today', 'week', 'month', 'all'] as DateFilter[]).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setDateFilter(filter)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    dateFilter === filter
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                      : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {filter === 'today' && '📅 Bugün'}
                  {filter === 'week' && '📊 Son 7 Gün'}
                  {filter === 'month' && '📈 Son 30 Gün'}
                  {filter === 'all' && '🌍 Tüm Zamanlar'}
                </button>
              ))}
              <button
                onClick={() => setDateFilter('custom')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  dateFilter === 'custom'
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                    : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                }`}
              >
                🗓️ Özel Tarih
              </button>
            </div>

            {/* Özel Tarih Seçici */}
            {dateFilter === 'custom' && (
              <div className="flex gap-2 items-center">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-3 py-2 bg-slate-700 text-white rounded-lg text-sm border border-slate-600 focus:border-purple-500 focus:outline-none"
                />
                <span className="text-slate-400">-</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-3 py-2 bg-slate-700 text-white rounded-lg text-sm border border-slate-600 focus:border-purple-500 focus:outline-none"
                />
              </div>
            )}
          </div>
        </div>

        {/* Özet Kartlar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-blue-100 text-sm font-medium">Toplam Sipariş</span>
              <span className="text-2xl">📦</span>
            </div>
            <p className="text-3xl font-bold text-white">{totalOrders}</p>
            <p className="text-blue-100 text-xs mt-1">Web platformundan</p>
          </div>

          <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-green-100 text-sm font-medium">Toplam Ciro</span>
              <span className="text-2xl">💰</span>
            </div>
            <p className="text-3xl font-bold text-white">{totalRevenue.toFixed(2)}₺</p>
            <p className="text-green-100 text-xs mt-1">Teslim edilen siparişler</p>
          </div>

          <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-purple-100 text-sm font-medium">Toplam Komisyon</span>
              <span className="text-2xl">🎯</span>
            </div>
            <p className="text-3xl font-bold text-white">{totalCommission.toFixed(2)}₺</p>
            <p className="text-purple-100 text-xs mt-1">%10 komisyon oranı</p>
          </div>
        </div>

        {/* Tablo */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          ) : data.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-slate-400 text-lg">📭 Seçilen tarih aralığında veri bulunamadı</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-700/50 border-b border-slate-600">
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Restoran Adı
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Web Sipariş Sayısı
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Web Cirosu
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Komisyon (%10)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {data.map((item, index) => {
                    const commission = Number(item.total_web_amount) * 0.1
                    return (
                      <tr
                        key={item.restaurant_id}
                        className="hover:bg-slate-700/30 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white text-sm font-bold">
                              {index + 1}
                            </div>
                            <span className="text-white font-medium">{item.restaurant_name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-sm font-semibold">
                            📦 {item.total_web_orders}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-green-400 font-bold text-lg">
                            {Number(item.total_web_amount).toFixed(2)}₺
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-purple-400 font-bold text-lg">
                            {commission.toFixed(2)}₺
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-700/70 border-t-2 border-slate-600">
                    <td className="px-6 py-4 text-left">
                      <span className="text-white font-bold text-lg">TOPLAM</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded-full text-sm font-bold">
                        📦 {totalOrders}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-green-400 font-bold text-xl">
                        {totalRevenue.toFixed(2)}₺
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-purple-400 font-bold text-xl">
                        {totalCommission.toFixed(2)}₺
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {/* Bilgi Notu */}
        <div className="mt-6 bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">ℹ️</span>
            <div>
              <p className="text-blue-300 font-semibold mb-1">Komisyon Hesaplama Kuralları</p>
              <ul className="text-blue-200 text-sm space-y-1">
                <li>• Sadece <strong>platform = 'web'</strong> olan siparişler dahildir</li>
                <li>• Sadece <strong>status = 'delivered'</strong> (teslim edilmiş) siparişler hesaplanır</li>
                <li>• Komisyon oranı: <strong>%10</strong></li>
                <li>• Tüm hesaplamalar Supabase tarafında yapılır (Egress optimizasyonu)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
