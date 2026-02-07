/**
 * @file src/app/restoran/istatistikler/page.tsx
 * @description Paketlerim ve Cirom - İstatistikler sayfası
 */
'use client'

import { useState, useEffect } from 'react'
import { useRestoran } from '../RestoranProvider'
import { supabase } from '@/app/lib/supabase'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export default function IstatistiklerPage() {
  const { restaurantId, packages } = useRestoran()
  const [statisticsTab, setStatisticsTab] = useState<'packages' | 'revenue'>('packages')
  const [statisticsFilter, setStatisticsFilter] = useState<'daily' | 'weekly' | 'monthly'>('daily')
  const [statisticsData, setStatisticsData] = useState<any[]>([])

  const fetchStatisticsData = async () => {
    if (!restaurantId) return

    try {
      let startDate = new Date()
      if (statisticsFilter === 'daily') {
        startDate.setDate(startDate.getDate() - 7)
      } else if (statisticsFilter === 'weekly') {
        startDate.setDate(startDate.getDate() - 28)
      } else if (statisticsFilter === 'monthly') {
        startDate.setMonth(startDate.getMonth() - 6)
      }

      const { data, error } = await supabase
        .from('packages')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .eq('status', 'delivered')
        .gte('delivered_at', startDate.toISOString())
        .order('delivered_at', { ascending: true })

      if (error) throw error

      const groupedData: { [key: string]: { count: number; revenue: number } } = {}

      data?.forEach((pkg: any) => {
        if (!pkg.delivered_at) return

        const date = new Date(pkg.delivered_at)
        let key = ''

        if (statisticsFilter === 'daily') {
          key = date.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' })
        } else if (statisticsFilter === 'weekly') {
          const weekStart = new Date(date)
          weekStart.setDate(date.getDate() - date.getDay())
          key = weekStart.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' })
        } else if (statisticsFilter === 'monthly') {
          key = date.toLocaleDateString('tr-TR', { month: 'short', year: 'numeric' })
        }

        if (!groupedData[key]) {
          groupedData[key] = { count: 0, revenue: 0 }
        }

        groupedData[key].count++
        groupedData[key].revenue += pkg.amount || 0
      })

      const chartData = Object.entries(groupedData).map(([date, data]) => ({
        date,
        paketSayisi: data.count,
        ciro: data.revenue
      }))

      setStatisticsData(chartData)
    } catch (error) {
      console.error('İstatistik verileri yüklenemedi:', error)
    }
  }

  useEffect(() => {
    if (restaurantId) {
      fetchStatisticsData()
    }
  }, [restaurantId, statisticsFilter])

  const deliveredPackages = packages.filter(p => p.status === 'delivered')
  const totalRevenue = deliveredPackages.reduce((sum, p) => sum + (p.amount || 0), 0)

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
        <h2 className="text-2xl font-bold text-white mb-6">📊 Paketlerim ve Cirom</h2>

        {/* Tab Buttons */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setStatisticsTab('packages')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              statisticsTab === 'packages'
                ? 'bg-orange-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            📦 Paket Sayısı
          </button>
          <button
            onClick={() => setStatisticsTab('revenue')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              statisticsTab === 'revenue'
                ? 'bg-orange-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            💰 Ciro
          </button>
        </div>

        {/* Filter Buttons */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setStatisticsFilter('daily')}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              statisticsFilter === 'daily'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Günlük (7 Gün)
          </button>
          <button
            onClick={() => setStatisticsFilter('weekly')}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              statisticsFilter === 'weekly'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Haftalık (4 Hafta)
          </button>
          <button
            onClick={() => setStatisticsFilter('monthly')}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              statisticsFilter === 'monthly'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Aylık (6 Ay)
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-gradient-to-r from-green-500/20 to-green-600/20 p-4 rounded-lg border border-green-500/50">
            <div className="text-3xl font-bold text-white">{deliveredPackages.length}</div>
            <div className="text-green-300 text-sm">Toplam Teslim Edilen Paket</div>
          </div>
          <div className="bg-gradient-to-r from-blue-500/20 to-blue-600/20 p-4 rounded-lg border border-blue-500/50">
            <div className="text-3xl font-bold text-white">{totalRevenue.toFixed(2)}₺</div>
            <div className="text-blue-300 text-sm">Toplam Ciro</div>
          </div>
        </div>

        {/* Chart */}
        <div className="bg-slate-800 p-4 rounded-lg">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={statisticsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
              <XAxis dataKey="date" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #475569',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              {statisticsTab === 'packages' && (
                <Bar dataKey="paketSayisi" fill="#3b82f6" name="Paket Sayısı" />
              )}
              {statisticsTab === 'revenue' && (
                <Bar dataKey="ciro" fill="#10b981" name="Ciro (₺)" />
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
