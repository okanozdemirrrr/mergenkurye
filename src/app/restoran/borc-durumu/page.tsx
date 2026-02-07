/**
 * @file src/app/restoran/borc-durumu/page.tsx
 * @description Paket Ücretim (Borç Durumu) sayfası
 */
'use client'

import { useState, useEffect } from 'react'
import { useRestoran } from '../RestoranProvider'
import { supabase } from '@/app/lib/supabase'

export default function BorcDurumuPage() {
  const { restaurantId, packages } = useRestoran()
  const [debtFilter, setDebtFilter] = useState<'today' | 'week' | 'month' | 'all'>('today')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const getFilteredDeliveredPackages = () => {
    const delivered = packages.filter(p => p.status === 'delivered')

    if (debtFilter === 'all') return delivered

    const now = new Date()
    let filterDate = new Date()

    if (debtFilter === 'today') {
      filterDate.setHours(0, 0, 0, 0)
    } else if (debtFilter === 'week') {
      filterDate.setDate(now.getDate() - 7)
    } else if (debtFilter === 'month') {
      filterDate.setMonth(now.getMonth() - 1)
    }

    return delivered.filter(p => {
      if (!p.delivered_at) return false
      return new Date(p.delivered_at) >= filterDate
    })
  }

  const getCustomDateFilteredPackages = () => {
    if (!startDate || !endDate) return []

    const delivered = packages.filter(p => p.status === 'delivered')
    const start = new Date(startDate)
    start.setHours(0, 0, 0, 0)
    const end = new Date(endDate)
    end.setHours(23, 59, 59, 999)

    return delivered.filter(p => {
      if (!p.delivered_at) return false
      const deliveredDate = new Date(p.delivered_at)
      return deliveredDate >= start && deliveredDate <= end
    })
  }

  const filteredPackages = startDate && endDate ? getCustomDateFilteredPackages() : getFilteredDeliveredPackages()
  const totalDebt = filteredPackages.length * 100 // Her paket 100₺

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
        <h2 className="text-2xl font-bold text-white mb-6">💳 Paket Ücretim (Borç Durumu)</h2>

        {/* Filter Buttons */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => {
              setDebtFilter('today')
              setStartDate('')
              setEndDate('')
            }}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              debtFilter === 'today' && !startDate
                ? 'bg-orange-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Bugün
          </button>
          <button
            onClick={() => {
              setDebtFilter('week')
              setStartDate('')
              setEndDate('')
            }}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              debtFilter === 'week' && !startDate
                ? 'bg-orange-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Bu Hafta
          </button>
          <button
            onClick={() => {
              setDebtFilter('month')
              setStartDate('')
              setEndDate('')
            }}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              debtFilter === 'month' && !startDate
                ? 'bg-orange-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Bu Ay
          </button>
          <button
            onClick={() => {
              setDebtFilter('all')
              setStartDate('')
              setEndDate('')
            }}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              debtFilter === 'all' && !startDate
                ? 'bg-orange-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Tümü
          </button>
        </div>

        {/* Custom Date Range */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-slate-400 text-sm mb-2">Başlangıç Tarihi</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full p-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
            />
          </div>
          <div>
            <label className="block text-slate-400 text-sm mb-2">Bitiş Tarihi</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full p-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
            />
          </div>
        </div>

        {/* Summary */}
        <div className="bg-gradient-to-r from-red-500/20 to-orange-500/20 p-6 rounded-xl border-2 border-red-500/50 mb-6">
          <div className="text-center">
            <div className="text-5xl font-black text-white mb-2">{totalDebt.toFixed(2)}₺</div>
            <div className="text-red-300 text-lg font-semibold">Toplam Borcunuz</div>
            <div className="text-slate-400 text-sm mt-2">
              {filteredPackages.length} paket × 100₺
            </div>
          </div>
        </div>

        {/* Package List */}
        <div className="space-y-3">
          <h3 className="text-lg font-bold text-white mb-3">Teslim Edilen Paketler</h3>
          {filteredPackages.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <div className="text-4xl mb-2">📭</div>
              <p>Bu tarih aralığında teslim edilen paket bulunamadı</p>
            </div>
          ) : (
            filteredPackages.map((pkg) => (
              <div key={pkg.id} className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-bold text-white">{pkg.customer_name}</div>
                    <div className="text-sm text-slate-400">{pkg.delivery_address}</div>
                    {pkg.delivered_at && (
                      <div className="text-xs text-slate-500 mt-1">
                        {new Date(pkg.delivered_at).toLocaleString('tr-TR')}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-orange-400">{pkg.amount}₺</div>
                    <div className="text-sm text-red-400">Borç: 100₺</div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Info */}
        <div className="mt-6 bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
          <h3 className="text-lg font-bold text-orange-300 mb-2">ℹ️ Bilgilendirme</h3>
          <div className="text-sm text-slate-300 space-y-2">
            <p>• Her teslim edilen paket için <span className="font-bold text-white">100₺</span> ücret hesaplanır.</p>
            <p>• Borç tutarınız sadece <span className="font-bold text-green-400">teslim edilen</span> paketleri kapsar.</p>
            <p>• İptal edilen veya aktif siparişler borç hesabına dahil değildir.</p>
            <p>• Ödeme yapmak için admin ile iletişime geçiniz.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
