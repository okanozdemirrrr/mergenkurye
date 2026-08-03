'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRestoran } from '../RestoranProvider'
import { supabase } from '@/app/lib/supabase'
import { parseFilterInputToUtcIso } from '@/utils/calculations'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { BarChart3, Package, Wallet, Bike, Sparkles, Inbox, AlertTriangle } from 'lucide-react'

const ISTANBUL_TZ = 'Europe/Istanbul'

/** Admin mutabakat / RPC ile aynı: Europe/Istanbul takvim günü */
function getIstanbulTodayStr(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: ISTANBUL_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

function formatIstanbulChartDate(iso: string): string {
  return new Date(iso).toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: ISTANBUL_TZ,
  })
}

type StatsPackage = {
  id: number
  amount: number | null
  delivered_at: string | null
  created_at: string | null
  status: string
  is_chargeable_cancellation: boolean | null
  applied_price: number | null
}

export default function IstatistiklerPage() {
  const { restaurantId, restaurant } = useRestoran()
  
  const [startDate, setStartDate] = useState(getIstanbulTodayStr)
  const [endDate, setEndDate] = useState(getIstanbulTodayStr)
  
  const [statisticsTab, setStatisticsTab] = useState<'packages' | 'revenue'>('packages')
  const [statisticsData, setStatisticsData] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  const [summary, setSummary] = useState({
    totalPackages: 0,
    totalRevenue: 0,
    courierCost: 0,
    netProfit: 0
  })

  /**
   * Admin process_restaurant_settlement / get_restaurant_period_financials ile birebir:
   * - Tarih: Europe/Istanbul duvar saati → UTC (parseFilterInputToUtcIso)
   * - delivered → delivered_at aralığı
   * - ücretli iptal → created_at aralığı
   * - Paket sayısı / kurye masrafı: ikisi de dahil
   * - Ciro: yalnızca delivered
   */
  const fetchStatisticsData = useCallback(async () => {
    if (!restaurantId) return
    setIsLoading(true)

    try {
      const startIso = parseFilterInputToUtcIso(startDate, 'start')
      const endIso = parseFilterInputToUtcIso(endDate, 'end')

      const selectCols =
        'id, amount, delivered_at, created_at, status, is_chargeable_cancellation, applied_price'

      const [deliveredRes, cancelledRes] = await Promise.all([
        supabase
          .from('packages')
          .select(selectCols)
          .eq('restaurant_id', restaurantId)
          .eq('status', 'delivered')
          .gte('delivered_at', startIso)
          .lte('delivered_at', endIso)
          .order('delivered_at', { ascending: true }),
        supabase
          .from('packages')
          .select(selectCols)
          .eq('restaurant_id', restaurantId)
          .eq('status', 'cancelled')
          .eq('is_chargeable_cancellation', true)
          .gte('created_at', startIso)
          .lte('created_at', endIso)
          .order('created_at', { ascending: true }),
      ])

      if (deliveredRes.error) throw deliveredRes.error
      if (cancelledRes.error) throw cancelledRes.error

      const data: StatsPackage[] = [
        ...((deliveredRes.data || []) as StatsPackage[]),
        ...((cancelledRes.data || []) as StatsPackage[]),
      ]

      const groupedData: { [key: string]: { count: number; revenue: number } } = {}
      let totalP = 0
      let totalR = 0
      let totalCourierCost = 0

      const packageFee = restaurant?.package_fee || 0

      data.forEach((pkg) => {
        // Admin RPC: teslim → delivered_at, ücretli iptal → created_at
        const eventAt =
          pkg.status === 'delivered' ? pkg.delivered_at : pkg.created_at
        if (!eventAt) return

        const key = formatIstanbulChartDate(eventAt)

        if (!groupedData[key]) {
          groupedData[key] = { count: 0, revenue: 0 }
        }

        // Mutabakat package_count = COUNT(*) (teslim + ücretli iptal)
        groupedData[key].count++
        totalP++

        if (pkg.status === 'delivered') {
          groupedData[key].revenue += pkg.amount || 0
          totalR += pkg.amount || 0
        }

        totalCourierCost += pkg.applied_price ?? packageFee
      })

      const chartData = Object.entries(groupedData)
        .sort(([a], [b]) => {
          const [da, ma, ya] = a.split('.').map(Number)
          const [db, mb, yb] = b.split('.').map(Number)
          return new Date(ya, ma - 1, da).getTime() - new Date(yb, mb - 1, db).getTime()
        })
        .map(([date, d]) => ({
          date,
          paketSayisi: d.count,
          ciro: d.revenue,
        }))

      const netProfit = totalR - totalCourierCost

      setStatisticsData(chartData)
      setSummary({
        totalPackages: totalP,
        totalRevenue: totalR,
        courierCost: totalCourierCost,
        netProfit: netProfit
      })
    } catch (error) {
      console.error('İstatistik verileri yüklenemedi:', error)
    } finally {
      setIsLoading(false)
    }
  }, [restaurantId, startDate, endDate, restaurant?.package_fee])

  useEffect(() => {
    fetchStatisticsData()
  }, [fetchStatisticsData])

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto min-h-screen">
      <div className="saas-card bg-slate-900 p-6 border border-slate-800 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <h2 className="text-2xl font-black text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-gray-400" strokeWidth={1.5} />
            Paketlerim ve Cirom
          </h2>

          <div className="flex flex-wrap items-center gap-3 bg-slate-800/50 p-3 rounded-md border border-slate-700">
            <div className="flex flex-col">
              <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 ml-1">Başlangıç</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-white text-sm rounded-md px-3 py-2 outline-none focus:border-orange-500 transition-colors"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 ml-1">Bitiş</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-white text-sm rounded-md px-3 py-2 outline-none focus:border-orange-500 transition-colors"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-2 mb-8 bg-slate-800/30 p-1.5 rounded-md w-fit">
          <button
            onClick={() => setStatisticsTab('packages')}
            className={`px-6 py-2.5 rounded-md font-bold text-sm transition-all flex items-center gap-2 ${
              statisticsTab === 'packages'
                ? 'bg-orange-600 text-white shadow-sm shadow-orange-900/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Package className="w-4 h-4" strokeWidth={1.5} />
            Paket Sayısı
          </button>
          <button
            onClick={() => setStatisticsTab('revenue')}
            className={`px-6 py-2.5 rounded-md font-bold text-sm transition-all flex items-center gap-2 ${
              statisticsTab === 'revenue'
                ? 'bg-orange-600 text-white shadow-sm shadow-orange-900/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Wallet className="w-4 h-4" strokeWidth={1.5} />
            Ciro (₺)
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="saas-card bg-slate-900 p-4 md:p-6 border border-slate-800 relative overflow-hidden group">
            <Wallet className="absolute top-4 right-4 w-8 h-8 text-gray-400 opacity-20" strokeWidth={1.5} />
            <div className="relative z-10">
              <p className="saas-stat-value">
                {isLoading ? '...' : summary.totalRevenue.toLocaleString('tr-TR')}₺
              </p>
              <p className="saas-stat-label">Toplam Ciro</p>
            </div>
          </div>
          
          <div className="saas-card bg-slate-900 p-4 md:p-6 border border-slate-800 relative overflow-hidden group">
            <Bike className="absolute top-4 right-4 w-8 h-8 text-gray-400 opacity-20" strokeWidth={1.5} />
            <div className="relative z-10">
              <p className="saas-stat-value text-rose-500">
                {isLoading ? '...' : summary.courierCost.toLocaleString('tr-TR')}₺
              </p>
              <p className="saas-stat-label">Kurye Masrafı</p>
              {!isLoading && restaurant?.package_fee ? (
                <div className="text-[10px] text-slate-500 font-medium mt-1">
                  {summary.totalPackages} Paket × {restaurant.package_fee}₺
                </div>
              ) : !isLoading && !restaurant?.package_fee ? (
                <div className="text-[10px] text-amber-500 font-medium mt-1 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" strokeWidth={1.5} />
                  Ücret Girilmemiş
                </div>
              ) : null}
            </div>
          </div>
          
          <div className="saas-card bg-slate-900 p-4 md:p-6 border border-emerald-500/30 relative overflow-hidden group shadow-sm shadow-emerald-900/10">
            <Sparkles className="absolute top-4 right-4 w-8 h-8 text-gray-400 opacity-20" strokeWidth={1.5} />
            <div className="relative z-10">
              <p className="saas-stat-value saas-stat-value-accent-green">
                {isLoading ? '...' : summary.netProfit.toLocaleString('tr-TR')}₺
              </p>
              <p className="saas-stat-label text-emerald-400">Net Kâr (Size Kalan)</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 p-6 rounded-md border border-slate-700">
          <div className="h-[400px] w-full">
            {isLoading ? (
              <div className="w-full h-full flex items-center justify-center text-slate-500 font-medium">
                Veriler yükleniyor...
              </div>
            ) : statisticsData.length === 0 ? (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-500">
                <Inbox className="w-8 h-8 mb-4 text-gray-400" strokeWidth={1.5} />
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
                      borderRadius: '6px',
                      padding: '12px',
                      boxShadow: '0 1px 2px 0 rgba(0,0,0,0.3)'
                    }}
                    itemStyle={{ fontWeight: 'bold' }}
                  />
                  {statisticsTab === 'packages' && (
                    <Bar 
                      dataKey="paketSayisi" 
                      fill="#3b82f6" 
                      name="Paket Sayısı" 
                      radius={[4, 4, 0, 0]}
                      barSize={40}
                    />
                  )}
                  {statisticsTab === 'revenue' && (
                    <Bar 
                      dataKey="ciro" 
                      fill="#10b981" 
                      name="Ciro (₺)" 
                      radius={[4, 4, 0, 0]}
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
