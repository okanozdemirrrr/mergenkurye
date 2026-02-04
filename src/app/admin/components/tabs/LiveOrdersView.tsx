/**
 * @file src/app/admin/components/tabs/LiveOrdersView.tsx
 * @description Canlı Sipariş Takibi Görünümü
 * AŞAMA 1: Sadece görünüm katmanı - Tüm state ve logic ana dosyada kalıyor
 */

import { getPlatformBadgeClass, getPlatformDisplayName } from '@/app/lib/platformUtils'

interface Restaurant {
  id: number | string
  name: string
  phone?: string
  address?: string
  totalOrders?: number
  totalRevenue?: number
  totalDebt?: number
}

interface Package {
  id: number
  order_number?: string
  customer_name: string
  customer_phone?: string
  delivery_address: string
  amount: number
  status: string
  content?: string
  courier_id?: string | null
  payment_method?: 'cash' | 'card' | null
  restaurant_id?: number | string | null
  restaurant?: Restaurant | null
  platform?: string
  created_at?: string
  assigned_at?: string
  picked_up_at?: string
  delivered_at?: string
  settled_at?: string | null
  restaurant_settled_at?: string | null
  courier_name?: string
}

interface Courier {
  id: string
  full_name?: string
  deliveryCount?: number
  todayDeliveryCount?: number
  is_active?: boolean
  activePackageCount?: number
  status?: 'idle' | 'picking_up' | 'on_the_way' | 'assigned' | 'inactive'
  totalDebt?: number
}

interface LiveOrdersViewProps {
  packages: Package[]
  couriers: Courier[]
  isLoading: boolean
  selectedCouriers: { [key: number]: string }
  assigningIds: Set<number>
  formatTurkishTime: (dateString?: string) => string
  handleCourierChange: (packageId: number, courierId: string) => void
  handleAssignCourier: (packageId: number) => Promise<void>
}

export function LiveOrdersView({
  packages,
  couriers,
  isLoading,
  selectedCouriers,
  assigningIds,
  formatTurkishTime,
  handleCourierChange,
  handleAssignCourier
}: LiveOrdersViewProps) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
        <div className="lg:col-span-4 space-y-3">
          {/* SİPARİŞ KARTLARI - PADDING AZALTILDI */}
          <div className="bg-slate-900 shadow-xl rounded-2xl p-4">
            <h2 className="text-xl font-bold mb-4">📦 Canlı Sipariş Takibi</h2>
        
            {/* Sipariş Kartları */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {isLoading ? (
                <div className="col-span-full text-center py-8 text-slate-500">Siparişler yükleniyor...</div>
              ) : packages.length === 0 ? (
                <div className="col-span-full text-center py-8 text-slate-500">Aktif sipariş bulunmuyor.</div>
              ) : (
                packages.map(pkg => (
                  <div key={pkg.id} className={`bg-slate-900 p-3 rounded-lg border-l-4 shadow-sm ${
                    pkg.status === 'pending' || pkg.status === 'waiting' ? 'border-l-yellow-500' :
                    pkg.status === 'assigned' ? 'border-l-blue-500' :
                    pkg.status === 'picking_up' ? 'border-l-orange-500' :
                    'border-l-red-500'
                  } border-r border-t border-b border-slate-200`}>
                    
                    {/* Oluşturulma Saati ve Sipariş No */}
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold px-2 py-1 rounded ${
                          pkg.order_number 
                            ? 'text-orange-600 bg-orange-50'
                            : 'text-slate-400 bg-slate-100 animate-pulse'
                        }`}>
                          {pkg.order_number || '......'}
                        </span>
                        {pkg.platform && (
                          <span className={`text-xs py-0.5 px-2 rounded ${getPlatformBadgeClass(pkg.platform)}`}>
                            {getPlatformDisplayName(pkg.platform)}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        🕐 {formatTurkishTime(pkg.created_at)}
                      </span>
                    </div>

                    {/* Üst Kısım - Restoran ve Durum */}
                    <div className="flex justify-between items-start mb-2">
                      <span className="bg-orange-50 text-orange-700 px-2 py-1 rounded text-sm font-bold">
                        🍽️ {pkg.restaurant?.name || 'Bilinmeyen'}
                      </span>
                      <span className="text-lg font-bold text-green-600">
                        {pkg.amount}₺
                      </span>
                    </div>

                    {/* Durum Rozeti */}
                    <div className="mb-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        pkg.status === 'pending' || pkg.status === 'waiting' ? 'bg-yellow-100 text-yellow-700' :
                        pkg.status === 'assigned' ? 'bg-orange-100 text-orange-700' :
                        pkg.status === 'picking_up' ? 'bg-orange-100 text-orange-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {pkg.status === 'pending' || pkg.status === 'waiting' ? '⏳ Kurye Bekliyor' : 
                         pkg.status === 'assigned' ? '👤 Atandı' :
                         pkg.status === 'picking_up' ? '🏃 Alınıyor' : '🚗 Yolda'}
                      </span>
                    </div>

                    {/* Müşteri Bilgileri */}
                    <div className="space-y-2 mb-3">
                      <h3 className="font-semibold text-sm text-slate-900">
                        👤 {pkg.customer_name}
                      </h3>
                      
                      {pkg.customer_phone && (
                        <p className="text-xs text-slate-600">
                          📞 {pkg.customer_phone}
                        </p>
                      )}
                      
                      {pkg.content && (
                        <div>
                          <p className="text-xs text-slate-600">Paket İçeriği:</p>
                          <p className="text-xs text-slate-800 bg-orange-50 p-1.5 rounded">
                            📝 {pkg.content}
                          </p>
                        </div>
                      )}
                      
                      <div>
                        <p className="text-xs text-slate-600">Adres:</p>
                        <p className="text-xs text-slate-700 overflow-hidden" style={{display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical'}}>
                          📍 {pkg.delivery_address}
                        </p>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          pkg.payment_method === 'cash' 
                            ? 'bg-green-50 text-green-700' 
                            : 'bg-orange-50 text-orange-700'
                        }`}>
                          {pkg.payment_method === 'cash' ? '💵 Nakit' : '💳 Kart'}
                        </span>
                      </div>
                    </div>

                    {/* Kurye Atama */}
                    {(pkg.status === 'pending' || pkg.status === 'waiting') && !pkg.courier_id && (
                      <div className="border-t border-slate-200 pt-2 space-y-2">
                        <select 
                          value={selectedCouriers[pkg.id] || ''}
                          onChange={(e) => handleCourierChange(pkg.id, e.target.value)}
                          className="w-full bg-slate-800 border-slate-700 border-slate-300 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-orange-500 focus:border-transparent"
                          disabled={assigningIds.has(pkg.id)}
                        >
                          <option value="">Kurye Seçin</option>
                          {couriers.filter(c => c.is_active).length === 0 ? (
                            <option disabled>⚠️ Aktif Kurye Bulunmuyor</option>
                          ) : (
                            <>
                              <option disabled>Kurye Seçin (Aktif: {couriers.filter(c => c.is_active).length})</option>
                              {couriers
                                .filter(c => c.is_active)
                                .map(c => (
                                  <option key={c.id} value={c.id}>
                                    {c.full_name} ({c.todayDeliveryCount || 0} bugün, {c.activePackageCount || 0} aktif)
                                  </option>
                                ))
                              }
                            </>
                          )}
                        </select>
                        <button 
                          onClick={() => handleAssignCourier(pkg.id)}
                          disabled={!selectedCouriers[pkg.id] || assigningIds.has(pkg.id)}
                          className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded text-xs font-semibold transition-all"
                        >
                          {assigningIds.has(pkg.id) ? '⏳ Atanıyor...' : '✅ Kurye Ata'}
                        </button>
                      </div>
                    )}

                    {/* Atanmış Kurye Bilgisi */}
                    {pkg.courier_id && (pkg.status === 'assigned' || pkg.status === 'picking_up' || pkg.status === 'on_the_way') && (
                      <div className="border-t border-slate-200 pt-2">
                        <div className="flex items-center justify-center">
                          <span className="bg-orange-50 text-orange-700 px-2 py-1 rounded text-xs font-medium">
                            🚴 {couriers.find(c => c.id === pkg.courier_id)?.full_name || 'Bilinmeyen'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* SAĞ PANEL: KURYELERİN DURUMU - PADDING AZALTILDI */}
        <div className="lg:col-span-1 space-y-3">
          <div className="bg-slate-900 shadow-xl rounded-2xl p-3">
            <h2 className="text-sm font-bold mb-2">🚴 Kurye Durumları</h2>
            <div className="space-y-2">
              {couriers.map(c => {
                // Bu kuryenin paketlerini bul
                const courierPackages = packages.filter(pkg => pkg.courier_id === c.id)
                
                return (
                  <div 
                    key={c.id} 
                    className="p-2 bg-slate-50 rounded-lg border"
                  >
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="font-bold text-xs">{c.full_name}</span>
                      <div className="text-right">
                        <span className="text-[10px] text-green-600 block font-semibold">
                          📦 {c.todayDeliveryCount || 0} bugün
                        </span>
                        <span className="text-[10px] text-orange-600 block font-semibold">
                          🚚 {c.activePackageCount || 0} üzerinde
                        </span>
                      </div>
                    </div>
                    
                    {/* Aktiflik Durumu */}
                    <div className="mb-1.5">
                      {!c.is_active && <span className="text-[9px] bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded font-bold">⚫ AKTİF DEĞİL</span>}
                      {c.is_active && <span className="text-[9px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold">🟢 AKTİF</span>}
                    </div>
                    
                    {/* Paket Durumları */}
                    {courierPackages.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {courierPackages.map(pkg => (
                          <div key={pkg.id} className="text-[10px] flex items-center gap-1">
                            <span className={`px-2 py-0.5 rounded-full font-semibold ${
                              pkg.status === 'pending' || pkg.status === 'waiting' ? 'bg-yellow-100 text-yellow-700' :
                              pkg.status === 'assigned' ? 'bg-orange-100 text-orange-700' :
                              pkg.status === 'picking_up' ? 'bg-orange-100 text-orange-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {pkg.status === 'pending' || pkg.status === 'waiting' ? '⏳ Bekliyor' :
                               pkg.status === 'assigned' ? '👤 Atandı' :
                               pkg.status === 'picking_up' ? '🏃 Alıyor' : '🚗 Yolda'}
                            </span>
                            <span className="text-slate-600 truncate">
                              {pkg.customer_name}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
