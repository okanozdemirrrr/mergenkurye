'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/app/lib/supabase'

interface Restaurant {
  id: string
  name: string
  current_commission_rate: number
  phone?: string
}

interface WebOrderStats {
  total_revenue: number
  total_commission: number
  total_cost: number
  net_payable: number
  order_count: number
}

export default function UygulamaSiparisleriPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [loading, setLoading] = useState(true)
  const [editingRestaurant, setEditingRestaurant] = useState<Restaurant | null>(null)
  const [newCommissionRate, setNewCommissionRate] = useState('')
  const [updating, setUpdating] = useState(false)
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null)
  const [stats, setStats] = useState<WebOrderStats | null>(null)
  const [loadingStats, setLoadingStats] = useState(false)
  const [orders, setOrders] = useState<any[]>([])
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  // Restoranları çek
  const fetchRestaurants = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select('id, name, current_commission_rate, phone')
        .order('name')

      if (error) throw error
      setRestaurants(data || [])
    } catch (error: any) {
      console.error('Restoran listesi hatası:', error)
      setErrorMessage('Restoranlar yüklenemedi: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  // Web sipariş istatistiklerini çek (RPC kullanarak)
  const fetchWebOrderStats = async (restaurantId: string) => {
    setLoadingStats(true)
    try {
      // RPC ile finansal özet al (server-side hesaplama)
      const { data: statsData, error: statsError } = await supabase
        .rpc('get_restaurant_web_order_stats', {
          p_restaurant_id: restaurantId
        })

      if (statsError) throw statsError

      setStats({
        total_revenue: statsData.total_revenue || 0,
        total_commission: statsData.total_commission || 0,
        total_cost: statsData.total_cost || 0,
        net_payable: statsData.net_payable || 0,
        order_count: statsData.order_count || 0,
      })

      // Sipariş listesi (detay için)
      const { data: orderData, error: orderError } = await supabase
        .from('packages')
        .select('id, order_number, customer_name, amount, commission_amount, applied_commission_rate, delivered_at, created_at')
        .eq('restaurant_id', restaurantId)
        .eq('platform', 'web')
        .eq('status', 'delivered')
        .eq('is_paid_to_restaurant', false)
        .order('delivered_at', { ascending: false })
        .limit(100)

      if (orderError) throw orderError
      setOrders(orderData || [])
    } catch (error: any) {
      console.error('İstatistik hatası:', error)
      setErrorMessage('İstatistikler yüklenemedi: ' + error.message)
    } finally {
      setLoadingStats(false)
    }
  }

  // Komisyon oranını güncelle
  const handleUpdateCommission = async () => {
    if (!editingRestaurant) return

    const rate = parseFloat(newCommissionRate)
    if (isNaN(rate) || rate < 0 || rate > 100) {
      setErrorMessage('Lütfen 0-100 arası geçerli bir oran girin!')
      return
    }

    setUpdating(true)
    setErrorMessage('')

    try {
      const { error } = await supabase
        .from('restaurants')
        .update({ current_commission_rate: rate })
        .eq('id', editingRestaurant.id)

      if (error) throw error

      setSuccessMessage(`✅ ${editingRestaurant.name} için komisyon oranı %${rate} olarak güncellendi!`)
      setTimeout(() => setSuccessMessage(''), 3000)
      setEditingRestaurant(null)
      fetchRestaurants()
    } catch (error: any) {
      console.error('Güncelleme hatası:', error)
      setErrorMessage('Komisyon güncellenemedi: ' + error.message)
    } finally {
      setUpdating(false)
    }
  }

  useEffect(() => {
    fetchRestaurants()
  }, [])

  useEffect(() => {
    if (selectedRestaurant) {
      fetchWebOrderStats(selectedRestaurant.id)
    }
  }, [selectedRestaurant])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            📱 Restoranların Uygulama Siparişleri
          </h1>
          <p className="text-slate-400 text-sm">
            Web platformundan gelen siparişlerin komisyon yönetimi
          </p>
        </div>

        {/* Mesajlar */}
        {successMessage && (
          <div className="mb-4 p-3 bg-green-900/30 border border-green-500 rounded-lg text-green-300">
            {successMessage}
          </div>
        )}
        {errorMessage && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-500 rounded-lg text-red-300">
            {errorMessage}
          </div>
        )}

        {/* Restoran Kartları */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {restaurants.map((restaurant) => (
              <div
                key={restaurant.id}
                className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-5 border border-slate-700/50 hover:border-slate-600 transition-all"
              >
                {/* Restoran Adı */}
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-white mb-1">
                    {restaurant.name}
                  </h3>
                  {restaurant.phone && (
                    <p className="text-xs text-slate-400">📞 {restaurant.phone}</p>
                  )}
                </div>

                {/* Komisyon Oranı Rozeti */}
                <div className="mb-4 inline-flex items-center gap-2 px-3 py-2 bg-purple-500/20 border border-purple-500/30 rounded-lg">
                  <span className="text-purple-300 text-sm font-semibold">Komisyon:</span>
                  <span className="text-purple-100 text-lg font-bold">
                    %{restaurant.current_commission_rate?.toFixed(2) || '10.00'}
                  </span>
                </div>

                {/* Butonlar */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      setEditingRestaurant(restaurant)
                      setNewCommissionRate(restaurant.current_commission_rate?.toString() || '10')
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    ✏️ Komisyon Düzenle
                  </button>
                  <button
                    onClick={() => setSelectedRestaurant(restaurant)}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    📊 Detaylar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Komisyon Düzenleme Modalı */}
        {editingRestaurant && (
          <div
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
            onClick={() => setEditingRestaurant(null)}
          >
            <div
              className="bg-slate-900 rounded-xl p-6 max-w-md w-full border border-slate-700 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-white">
                  ✏️ Komisyon Oranını Düzenle
                </h3>
                <button
                  onClick={() => setEditingRestaurant(null)}
                  className="text-2xl font-bold w-8 h-8 flex items-center justify-center rounded-lg transition-colors text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  ×
                </button>
              </div>

              <div className="mb-4 p-3 rounded-lg bg-slate-800">
                <p className="text-sm text-slate-400">Restoran:</p>
                <p className="font-bold text-purple-400">{editingRestaurant.name}</p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2 text-slate-300">
                  Mevcut Oran
                </label>
                <div className="p-3 rounded-lg bg-slate-800">
                  <p className="text-2xl font-bold text-purple-400">
                    %{editingRestaurant.current_commission_rate?.toFixed(2) || '10.00'}
                  </p>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2 text-slate-300">
                  Yeni Oran (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={newCommissionRate}
                  onChange={(e) => setNewCommissionRate(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border text-lg font-bold bg-slate-800 border-slate-700 text-white focus:border-purple-500 outline-none transition-colors"
                  placeholder="Örn: 15"
                  autoFocus
                />
              </div>

              <div className="mb-4 p-3 bg-amber-900/30 border border-amber-700/50 rounded-lg">
                <p className="text-amber-300 text-xs">
                  ⚠️ <strong>Önemli:</strong> Bu değişiklik sadece <strong>gelecekteki</strong> siparişleri etkiler. 
                  Geçmiş siparişlerin komisyonu değişmez.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setEditingRestaurant(null)}
                  className="flex-1 px-4 py-3 rounded-lg font-semibold transition-colors bg-slate-700 hover:bg-slate-600 text-white"
                >
                  İptal
                </button>
                <button
                  onClick={handleUpdateCommission}
                  disabled={updating}
                  className="flex-1 px-4 py-3 rounded-lg font-semibold transition-colors bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {updating ? '⏳ Güncelleniyor...' : '✅ Güncelle'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Detaylar Paneli */}
        {selectedRestaurant && (
          <div
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 overflow-y-auto"
            onClick={() => setSelectedRestaurant(null)}
          >
            <div
              className="bg-slate-900 rounded-xl max-w-6xl w-full border border-slate-700 shadow-2xl my-8"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex justify-between items-center px-6 py-4 border-b border-slate-700">
                <h3 className="text-xl font-bold text-white">
                  📊 {selectedRestaurant.name} - Uygulama Siparişleri Detayı
                </h3>
                <button
                  onClick={() => setSelectedRestaurant(null)}
                  className="text-2xl font-bold w-8 h-8 flex items-center justify-center rounded-lg transition-colors text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  ×
                </button>
              </div>

              {/* Content */}
              <div className="p-6">
                {loadingStats ? (
                  <div className="flex items-center justify-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
                  </div>
                ) : stats ? (
                  <>
                    {/* Finansal Özet Kartları */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                        <p className="text-xs font-semibold text-blue-300 uppercase mb-1">Toplam Ciro</p>
                        <p className="text-2xl font-bold text-blue-100">
                          {stats.total_revenue.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                        </p>
                        <p className="text-xs text-blue-300/70 mt-1">{stats.order_count} sipariş</p>
                      </div>

                      <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
                        <p className="text-xs font-semibold text-purple-300 uppercase mb-1">Komisyon Tutarı</p>
                        <p className="text-2xl font-bold text-purple-100">
                          {stats.total_commission.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                        </p>
                        <p className="text-xs text-purple-300/70 mt-1">Mühürlenmiş oranlar</p>
                      </div>

                      <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4">
                        <p className="text-xs font-semibold text-rose-300 uppercase mb-1">Kurye Masrafı</p>
                        <p className="text-2xl font-bold text-rose-100">
                          {stats.total_cost.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                        </p>
                        <p className="text-xs text-rose-300/70 mt-1">Paket başı ücret</p>
                      </div>

                      <div className={`border rounded-xl p-4 ${
                        stats.net_payable >= 0 
                          ? 'bg-emerald-500/10 border-emerald-500/30' 
                          : 'bg-red-500/10 border-red-500/30'
                      }`}>
                        <p className={`text-xs font-semibold uppercase mb-1 ${
                          stats.net_payable >= 0 ? 'text-emerald-300' : 'text-red-300'
                        }`}>
                          Net Ödenecek
                        </p>
                        <p className={`text-2xl font-bold ${
                          stats.net_payable >= 0 ? 'text-emerald-100' : 'text-red-100'
                        }`}>
                          {stats.net_payable.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                        </p>
                        <p className={`text-xs mt-1 ${
                          stats.net_payable >= 0 ? 'text-emerald-300/70' : 'text-red-300/70'
                        }`}>
                          Ciro - Komisyon - Masraf
                        </p>
                      </div>
                    </div>

                    {/* Formül Açıklaması */}
                    <div className="mb-6 p-4 bg-slate-800/50 border border-slate-700 rounded-xl">
                      <p className="text-sm text-slate-300 font-mono">
                        <span className="text-blue-400">{stats.total_revenue.toFixed(2)}₺</span>
                        {' '}<span className="text-slate-500">-</span>{' '}
                        <span className="text-purple-400">{stats.total_commission.toFixed(2)}₺</span>
                        {' '}<span className="text-slate-500">-</span>{' '}
                        <span className="text-rose-400">{stats.total_cost.toFixed(2)}₺</span>
                        {' '}<span className="text-slate-500">=</span>{' '}
                        <span className={stats.net_payable >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                          {stats.net_payable.toFixed(2)}₺
                        </span>
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Toplam Ciro - Komisyon Tutarı - Kurye Masrafı = Restorana Ödenecek Net Bakiye
                      </p>
                    </div>

                    {/* Sipariş Listesi */}
                    <div className="bg-slate-800/30 border border-slate-700 rounded-xl overflow-hidden">
                      <div className="px-4 py-3 border-b border-slate-700">
                        <h4 className="text-sm font-bold text-slate-200">
                          Sipariş Listesi ({orders.length})
                        </h4>
                      </div>
                      {orders.length === 0 ? (
                        <div className="text-center py-12 text-slate-500">
                          <p>Ödenmemiş web siparişi bulunamadı</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="text-xs text-slate-400 uppercase bg-slate-900/50 border-b border-slate-700">
                              <tr>
                                <th className="px-4 py-3 text-left">Sipariş No</th>
                                <th className="px-4 py-3 text-left">Müşteri</th>
                                <th className="px-4 py-3 text-right">Tutar</th>
                                <th className="px-4 py-3 text-right">Komisyon Oranı</th>
                                <th className="px-4 py-3 text-right">Komisyon Tutarı</th>
                                <th className="px-4 py-3 text-left">Teslim Tarihi</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700/50">
                              {orders.map((order) => (
                                <tr key={order.id} className="hover:bg-slate-800/30 transition-colors">
                                  <td className="px-4 py-3 font-medium text-slate-300">
                                    {order.order_number || '...'}
                                  </td>
                                  <td className="px-4 py-3 text-slate-400">
                                    {order.customer_name}
                                  </td>
                                  <td className="px-4 py-3 text-right font-bold text-blue-300">
                                    {order.amount.toFixed(2)} ₺
                                  </td>
                                  <td className="px-4 py-3 text-right text-purple-300">
                                    %{order.applied_commission_rate?.toFixed(2) || '0.00'}
                                  </td>
                                  <td className="px-4 py-3 text-right font-bold text-purple-300">
                                    {order.commission_amount?.toFixed(2) || '0.00'} ₺
                                  </td>
                                  <td className="px-4 py-3 text-slate-400 text-xs">
                                    {order.delivered_at 
                                      ? new Date(order.delivered_at).toLocaleString('tr-TR', {
                                          day: '2-digit',
                                          month: 'short',
                                          hour: '2-digit',
                                          minute: '2-digit',
                                        })
                                      : '-'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12 text-slate-500">
                    <p>Veri yüklenemedi</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
