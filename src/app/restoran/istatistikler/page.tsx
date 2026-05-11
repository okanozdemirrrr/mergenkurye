'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRestoran } from '../RestoranProvider'
import { supabase } from '@/app/lib/supabase'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export default function IstatistiklerPage() {
  const { restaurantId, restaurant } = useRestoran()
  
  // Varsayılan tarihler: Bugün 00:00 - Bugün 23:59
  const getTodayStr = () => new Date().toISOString().split('T')[0]
  
  const [startDate, setStartDate] = useState(getTodayStr())
  const [endDate, setEndDate] = useState(getTodayStr())
  
  const [statisticsTab, setStatisticsTab] = useState<'packages' | 'revenue'>('packages')
  const [statisticsData, setStatisticsData] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // Özet İstatistikleri - 3'lü Finansal Sistem
  const [summary, setSummary] = useState({
    totalPackages: 0,
    totalRevenue: 0,
    courierCost: 0,
    netProfit: 0
  })

  const fetchStatisticsData = useCallback(async () => {
    if (!restaurantId) return
    setIsLoading(true)

    try {
      // Bitiş tarihini günün sonuna ayarla (23:59:59)
      const start = new Date(startDate)
      start.setHours(0, 0, 0, 0)
      
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)

      const { data, error } = await supabase
        .from('packages')
        .select('id, amount, delivered_at')
        .eq('restaurant_id', restaurantId)
        .eq('status', 'delivered')
        .gte('delivered_at', start.toISOString())
        .lte('delivered_at', end.toISOString())
        .order('delivered_at', { ascending: true })

      if (error) throw error

      const groupedData: { [key: string]: { count: number; revenue: number } } = {}
      let totalP = 0
      let totalR = 0

      data?.forEach((pkg: any) => {
        if (!pkg.delivered_at) return

        const date = new Date(pkg.delivered_at)
        // Her zaman günlük grupla (Date Range için en mantıklısı)
        const key = date.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })

        if (!groupedData[key]) {
          groupedData[key] = { count: 0, revenue: 0 }
        }

        groupedData[key].count++
        groupedData[key].revenue += pkg.amount || 0
        
        totalP++
        totalR += pkg.amount || 0
      })

      const chartData = Object.entries(groupedData).map(([date, d]) => ({
        date,
        paketSayisi: d.count,
        ciro: d.revenue
      }))

      // Finansal Hesaplamalar
      const packageFee = restaurant?.package_fee || 0
      const courierCost = totalP * packageFee
      const netProfit = totalR - courierCost

      setStatisticsData(chartData)
      setSummary({
        totalPackages: totalP,
        totalRevenue: totalR,
        courierCost: courierCost,
        netProfit: netProfit
      })
    } catch (error) {
      console.error('İstatistik verileri yüklenemedi:', error)
    } finally {
      setIsLoading(false)
    }
  }, [restaurantId, startDate, endDate])

  useEffect(() => {
    fetchStatisticsData()
  }, [fetchStatisticsData])

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto min-h-screen">
      <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <h2 className="text-2xl font-black text-white flex items-center gap-2">
            <span className="text-orange-500">📊</span> Paketlerim ve Cirom
          </h2>

          {/* Tarih Filtreleri */}
          <div className="flex flex-wrap items-center gap-3 bg-slate-800/50 p-3 rounded-xl border border-slate-700">
            <div className="flex flex-col">
              <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 ml-1">Başlangıç</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-orange-500 transition-colors"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 ml-1">Bitiş</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-orange-500 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex gap-2 mb-8 bg-slate-800/30 p-1.5 rounded-xl w-fit">
          <button
            onClick={() => setStatisticsTab('packages')}
            className={`px-6 py-2.5 rounded-lg font-bold text-sm transition-all ${
              statisticsTab === 'packages'
                ? 'bg-orange-600 text-white shadow-lg shadow-orange-900/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            📦 Paket Sayısı
          </button>
          <button
            onClick={() => setStatisticsTab('revenue')}
            className={`px-6 py-2.5 rounded-lg font-bold text-sm transition-all ${
              statisticsTab === 'revenue'
                ? 'bg-orange-600 text-white shadow-lg shadow-orange-900/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            💰 Ciro (₺)
          </button>
        </div>

        {/* 3'lü Finansal Kart Sistemi */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {/* KART 1: TOPLAM CİRO */}
          <div className="bg-slate-900 p-4 md:p-6 rounded-2xl border border-slate-800 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <span className="text-6xl">💰</span>
            </div>
            <div className="relative z-10">
              <div className="text-3xl md:text-4xl font-black text-white mb-1">
                {isLoading ? '...' : summary.totalRevenue.toLocaleString('tr-TR')}₺
              </div>
              <div className="text-slate-400 text-xs font-bold uppercase tracking-wider">Toplam Ciro</div>
            </div>
          </div>
          
          {/* KART 2: KURYE MASRAFI */}
          <div className="bg-slate-900 p-4 md:p-6 rounded-2xl border border-slate-800 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <span className="text-6xl">🚴</span>
            </div>
            <div className="relative z-10">
              <div className="text-3xl md:text-4xl font-black text-rose-500 mb-1">
                {isLoading ? '...' : summary.courierCost.toLocaleString('tr-TR')}₺
              </div>
              <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Kurye Masrafı</div>
              {!isLoading && restaurant?.package_fee ? (
                <div className="text-[10px] text-slate-500 font-medium">
                  {summary.totalPackages} Paket × {restaurant.package_fee}₺
                </div>
              ) : !isLoading && !restaurant?.package_fee ? (
                <div className="text-[10px] text-amber-500 font-medium">
                  ⚠️ Ücret Girilmemiş
                </div>
              ) : null}
            </div>
          </div>
          
          {/* KART 3: NET KÂR (Size Kalan) */}
          <div className="bg-slate-900 p-4 md:p-6 rounded-2xl border border-emerald-500/30 relative overflow-hidden group shadow-lg shadow-emerald-900/10">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <span className="text-6xl">✨</span>
            </div>
            <div className="relative z-10">
              <div className="text-3xl md:text-4xl font-black text-emerald-500 mb-1">
                {isLoading ? '...' : summary.netProfit.toLocaleString('tr-TR')}₺
              </div>
              <div className="text-emerald-400 text-xs font-bold uppercase tracking-wider">Net Kâr (Size Kalan)</div>
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
          <div className="h-[400px] w-full">
            {isLoading ? (
              <div className="w-full h-full flex items-center justify-center text-slate-500 font-medium">
                Veriler yükleniyor...
              </div>
            ) : statisticsData.length === 0 ? (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-500">
                <span className="text-5xl mb-4">📭</span>
                <p>Bu tarih aralığında veri bulunamadı.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statisticsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    stroke="#64748b" 
                    fontSize={12} 
                    fontWeight={600}
                    tickLine={false}
                    axisLine={false}
                    dy={10}
                  />
                  <YAxis 
                    stroke="#64748b" 
                    fontSize={12} 
                    fontWeight={600}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '12px',
                      padding: '12px',
                      boxShadow: '0 10px 15px -3px rgba(0,0,0,0.5)'
                    }}
                    itemStyle={{ fontWeight: 'bold' }}
                  />
                  {statisticsTab === 'packages' && (
                    <Bar 
                      dataKey="paketSayisi" 
                      fill="#3b82f6" 
                      name="Paket Sayısı" 
                      radius={[6, 6, 0, 0]}
                      barSize={40}
                    />
                  )}
                  {statisticsTab === 'revenue' && (
                    <Bar 
                      dataKey="ciro" 
                      fill="#10b981" 
                      name="Ciro (₺)" 
                      radius={[6, 6, 0, 0]}
                      barSize={40}
                    />
                  )}
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
