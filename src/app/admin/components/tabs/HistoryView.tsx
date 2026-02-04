/**
 * @file src/app/admin/components/tabs/HistoryView.tsx
 * @description Geçmiş Siparişler Görünümü
 * AŞAMA 1: Sadece görünüm katmanı - Tüm state ve logic ana dosyada kalıyor
 */

import { getPlatformBadgeClass, getPlatformDisplayName } from '@/app/lib/platformUtils'

interface Restaurant {
  id: number | string
  name: string
  phone?: string
  address?: string
}

interface Package {
  id: number
  order_number?: string
  customer_name: string
  customer_phone?: string
  delivery_address: string
  amount: number
  status: string
  payment_method?: 'cash' | 'card' | null
  restaurant?: Restaurant | null
  platform?: string
  delivered_at?: string
  courier_name?: string
}

interface HistoryViewProps {
  deliveredPackages: Package[]
  dateFilter: 'today' | 'week' | 'month' | 'all'
  setDateFilter: (filter: 'today' | 'week' | 'month' | 'all') => void
  historyCurrentPage: number
  setHistoryCurrentPage: (page: number) => void
  HISTORY_ITEMS_PER_PAGE: number
  formatTurkishTime: (dateString?: string) => string
}

export function HistoryView({
  deliveredPackages,
  dateFilter,
  setDateFilter,
  historyCurrentPage,
  setHistoryCurrentPage,
  HISTORY_ITEMS_PER_PAGE,
  formatTurkishTime
}: HistoryViewProps) {
  // Client-side filtreleme
  const getFilteredHistory = () => {
    if (dateFilter === 'all') return deliveredPackages
    
    const now = new Date()
    let startDate = new Date()
    
    if (dateFilter === 'today') {
      startDate.setHours(now.getHours() - 24)
    } else if (dateFilter === 'week') {
      startDate.setDate(now.getDate() - 7)
    } else if (dateFilter === 'month') {
      startDate.setDate(now.getDate() - 30)
    }
    
    return deliveredPackages.filter(pkg => 
      pkg.delivered_at && new Date(pkg.delivered_at) >= startDate
    )
  }
  
  const filteredHistory = getFilteredHistory()
  
  // Toplam tutar hesapla (filtrelenmiş TÜM veriden - sadece mevcut sayfa değil)
  const totalAmount = filteredHistory.reduce((sum, pkg) => sum + (pkg.amount || 0), 0)
  const cashAmount = filteredHistory.filter(p => p.payment_method === 'cash').reduce((sum, pkg) => sum + (pkg.amount || 0), 0)
  const cardAmount = filteredHistory.filter(p => p.payment_method === 'card').reduce((sum, pkg) => sum + (pkg.amount || 0), 0)

  // Sayfalama hesaplamaları
  const totalPages = Math.ceil(filteredHistory.length / HISTORY_ITEMS_PER_PAGE)
  const startIndex = (historyCurrentPage - 1) * HISTORY_ITEMS_PER_PAGE
  const endIndex = startIndex + HISTORY_ITEMS_PER_PAGE
  const currentPageData = filteredHistory.slice(startIndex, endIndex)

  // Sayfa değiştirme fonksiyonu
  const handlePageChange = (newPage: number) => {
    setHistoryCurrentPage(newPage)
    // Yumuşak scroll to top
    const container = document.getElementById('history-container')
    if (container) {
      container.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  // Sayfa butonları oluştur
  const renderPageButtons = () => {
    const buttons = []
    const maxVisibleButtons = 7
    
    if (totalPages <= maxVisibleButtons) {
      // Tüm sayfaları göster
      for (let i = 1; i <= totalPages; i++) {
        buttons.push(
          <button
            key={i}
            onClick={() => handlePageChange(i)}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              historyCurrentPage === i
                ? 'bg-blue-600 text-white shadow-lg scale-105'
                : 'bg-slate-200 text-slate-700 hover:bg-slate-300:bg-slate-600'
            }`}
          >
            {i}
          </button>
        )
      }
    } else {
      // İlk sayfa
      buttons.push(
        <button
          key={1}
          onClick={() => handlePageChange(1)}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            historyCurrentPage === 1
              ? 'bg-blue-600 text-white shadow-lg scale-105'
              : 'bg-slate-200 text-slate-700 hover:bg-slate-300:bg-slate-600'
          }`}
        >
          1
        </button>
      )

      // Başlangıç elipsis
      if (historyCurrentPage > 3) {
        buttons.push(
          <span key="start-ellipsis" className="px-2 text-slate-500">...</span>
        )
      }

      // Ortadaki sayfalar
      const startPage = Math.max(2, historyCurrentPage - 1)
      const endPage = Math.min(totalPages - 1, historyCurrentPage + 1)
      
      for (let i = startPage; i <= endPage; i++) {
        buttons.push(
          <button
            key={i}
            onClick={() => handlePageChange(i)}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              historyCurrentPage === i
                ? 'bg-blue-600 text-white shadow-lg scale-105'
                : 'bg-slate-200 text-slate-700 hover:bg-slate-300:bg-slate-600'
            }`}
          >
            {i}
          </button>
        )
      }

      // Bitiş elipsis
      if (historyCurrentPage < totalPages - 2) {
        buttons.push(
          <span key="end-ellipsis" className="px-2 text-slate-500">...</span>
        )
      }

      // Son sayfa
      buttons.push(
        <button
          key={totalPages}
          onClick={() => handlePageChange(totalPages)}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            historyCurrentPage === totalPages
              ? 'bg-blue-600 text-white shadow-lg scale-105'
              : 'bg-slate-200 text-slate-700 hover:bg-slate-300:bg-slate-600'
          }`}
        >
          {totalPages}
        </button>
      )
    }

    return buttons
  }

  return (
    <div id="history-container" className="bg-white shadow-xl rounded-2xl p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">📋 Geçmiş Siparişler</h2>
        
        {/* Tarih Filtresi Dropdown */}
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-slate-700">
            Filtrele:
          </label>
          <select
            value={dateFilter}
            onChange={(e) => {
              setDateFilter(e.target.value as 'today' | 'week' | 'month' | 'all')
              setHistoryCurrentPage(1) // Filtre değiştiğinde sayfa 1'e dön
            }}
            className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="today">📅 Son 24 Saat</option>
            <option value="week">📅 Son 7 Gün</option>
            <option value="month">📅 Son 30 Gün</option>
            <option value="all">📅 Tümü</option>
          </select>
        </div>
      </div>

      {/* İstatistikler - TÜM filtrelenmiş veriden hesaplanıyor - PADDING AZALTILDI */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
        <div className="bg-blue-50 p-3 rounded-xl">
          <div className="text-xs text-blue-600 font-medium">Toplam Sipariş</div>
          <div className="text-xl font-bold text-blue-700">{filteredHistory.length}</div>
          <div className="text-[10px] text-slate-500 mt-1">
            Sayfa {historyCurrentPage} / {totalPages || 1}
          </div>
        </div>
        <div className="bg-green-50 p-3 rounded-xl">
          <div className="text-xs text-green-600 font-medium">Toplam Tutar</div>
          <div className="text-xl font-bold text-green-700">{totalAmount.toFixed(2)} ₺</div>
        </div>
        <div className="bg-emerald-50 p-3 rounded-xl">
          <div className="text-xs text-emerald-600 font-medium">Nakit</div>
          <div className="text-xl font-bold text-emerald-700">{cashAmount.toFixed(2)} ₺</div>
        </div>
        <div className="bg-sky-50 p-3 rounded-xl">
          <div className="text-xs text-sky-600 font-medium">Kart</div>
          <div className="text-xl font-bold text-sky-700">{cardAmount.toFixed(2)} ₺</div>
        </div>
      </div>

      <div className="overflow-x-auto admin-scrollbar">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-3 px-4">Sipariş No</th>
              <th className="text-left py-3 px-4">Tarih/Saat</th>
              <th className="text-left py-3 px-4">Müşteri</th>
              <th className="text-left py-3 px-4">Restoran</th>
              <th className="text-left py-3 px-4">Kurye</th>
              <th className="text-left py-3 px-4">Tutar</th>
              <th className="text-left py-3 px-4">Ödeme</th>
            </tr>
          </thead>
          <tbody>
            {currentPageData.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-slate-500">
                  Bu tarih aralığında sipariş bulunamadı.
                </td>
              </tr>
            ) : (
              currentPageData.map(pkg => (
                <tr key={pkg.id} className="border-b hover:bg-slate-50:bg-slate-700/50">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-blue-600">
                        {pkg.order_number || '......'}
                      </span>
                      {pkg.platform && (
                        <span className={`text-xs py-0.5 px-2 rounded ${getPlatformBadgeClass(pkg.platform)}`}>
                          {getPlatformDisplayName(pkg.platform)}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-sm">
                      <div className="font-medium">{formatTurkishTime(pkg.delivered_at)}</div>
                      <div className="text-slate-500 text-xs">
                        {pkg.delivered_at ? new Date(pkg.delivered_at).toLocaleDateString('tr-TR') : '-'}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 font-medium">
                    <div>{pkg.customer_name}</div>
                    {pkg.customer_phone && (
                      <div className="text-xs text-slate-500 mt-1">📞 {pkg.customer_phone}</div>
                    )}
                  </td>
                  <td className="py-3 px-4">{pkg.restaurant?.name}</td>
                  <td className="py-3 px-4">{pkg.courier_name || 'Bilinmeyen'}</td>
                  <td className="py-3 px-4 font-bold text-green-600">{pkg.amount}₺</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      pkg.payment_method === 'cash' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {pkg.payment_method === 'cash' ? '💵 Nakit' : '💳 Kart'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Sayfalama Butonları */}
      {totalPages > 1 && (
        <div className="mt-6 flex justify-center items-center gap-2 flex-wrap">
          {/* Önceki Sayfa */}
          <button
            onClick={() => handlePageChange(Math.max(1, historyCurrentPage - 1))}
            disabled={historyCurrentPage === 1}
            className="px-4 py-2 rounded-lg font-medium transition-all bg-slate-200 text-slate-700 hover:bg-slate-300:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ← Önceki
          </button>

          {/* Sayfa Numaraları */}
          {renderPageButtons()}

          {/* Sonraki Sayfa */}
          <button
            onClick={() => handlePageChange(Math.min(totalPages, historyCurrentPage + 1))}
            disabled={historyCurrentPage === totalPages}
            className="px-4 py-2 rounded-lg font-medium transition-all bg-slate-200 text-slate-700 hover:bg-slate-300:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Sonraki →
          </button>
        </div>
      )}

      {/* Sayfa Bilgisi */}
      {totalPages > 1 && (
        <div className="mt-4 text-center text-sm text-slate-500">
          Gösterilen: {startIndex + 1}-{Math.min(endIndex, filteredHistory.length)} / Toplam: {filteredHistory.length} sipariş
        </div>
      )}
    </div>
  )
}
