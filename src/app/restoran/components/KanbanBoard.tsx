'use client'

import { useState, useCallback, useEffect } from 'react'
import { Package, Courier } from '@/types'
import type { OrderItem } from '@/types/order'
import { getStatusBadgeClass, getStatusLabel } from '@/utils/statusHelpers'
import { supabase } from '@/app/lib/supabase'
import { normalizeOrderItems } from '@/app/lib/orderItems'
import { parseDeliveryAddress } from '@/app/lib/formatDeliveryAddress'
import { formatTurkishTime } from '@/utils/dateHelpers'
import { getPlatformBadgeClass, getPlatformDisplayName } from '@/app/lib/platformUtils'
import UpdateAmountModal from './UpdateAmountModal'
import CancelOrderModal from './CancelOrderModal'
import { stopRestaurantAlert } from '@/hooks/useRestaurantRealtimeNotifications'

const PACKAGE_DETAIL_SELECT =
  'id, order_number, status, created_at, amount, subtotal, delivery_fee, customer_name, customer_phone, delivery_address, payment_method, items, platform, content, courier_id, getting_ready_at, ready_at, assigned_at, picked_up_at, delivered_at'

const formatPrice = (value: number) => `${value.toFixed(2)}₺`

interface KanbanBoardProps {
  packages: Package[]
  onRefresh: () => void
  darkMode: boolean
  couriers?: Courier[]
  restaurantId?: string
  restaurantName?: string
  isPackageDelayed?: (packageId: number) => boolean
  getDelayedMinutes?: (pkg: Package) => number
}

export default function KanbanBoard({ 
  packages, 
  onRefresh, 
  darkMode, 
  couriers = [], 
  restaurantId,
  restaurantName,
  isPackageDelayed = () => false,
  getDelayedMinutes = () => 0
}: KanbanBoardProps) {
  const [loading, setLoading] = useState<number | null>(null)
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null)
  const [detailPackage, setDetailPackage] = useState<Package | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [updateAmountPackage, setUpdateAmountPackage] = useState<Package | null>(null)
  const [cancelPackage, setCancelPackage] = useState<Package | null>(null)

  useEffect(() => {
    if (!selectedPackage) {
      setDetailPackage(null)
      setDetailLoading(false)
      return
    }

    let cancelled = false
    setDetailLoading(true)

    supabase
      .from('packages')
      .select(PACKAGE_DETAIL_SELECT)
      .eq('id', selectedPackage.id)
      .single()
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          console.error('Sipariş detayı yüklenemedi:', error)
          setDetailPackage(selectedPackage)
        } else {
          setDetailPackage({ ...selectedPackage, ...(data as Package) })
        }
        setDetailLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [selectedPackage])

  // Siparişleri duruma göre filtrele
  const newOrders = packages.filter(p => p.status === 'new_order')
  const gettingReady = packages.filter(p => p.status === 'getting_ready')
  const ready = packages.filter(p => ['ready', 'assigned', 'picking_up', 'on_the_way'].includes(p.status))

  const handleStatusChange = useCallback(async (packageId: number, newStatus: 'getting_ready' | 'ready') => {
    stopRestaurantAlert()
    setLoading(packageId)
    
    try {
      const timestampField = newStatus === 'getting_ready' ? 'getting_ready_at' : 'ready_at'
      
      // Durumu güncelle
      const { error } = await supabase
        .from('packages')
        .update({ 
          status: newStatus,
          [timestampField]: new Date().toISOString()
        })
        .eq('id', packageId)

      if (error) {
        console.error('Durum güncellenirken hata:', error)
        throw error
      }

      console.log('✅ Sipariş durumu başarıyla güncellendi')
      onRefresh()
    } catch (error: any) {
      console.error('Durum güncellenirken hata:', error)
      alert('Durum güncellenemedi! Lütfen veritabanı trigger\'ını kontrol edin.')
    } finally {
      setLoading(null)
    }
  }, [onRefresh])

  const formatTime = (dateString?: string) => {
    if (!dateString) return '-'
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return '-'
      return date.toLocaleTimeString('tr-TR', { 
        hour: '2-digit', 
        minute: '2-digit',
        timeZone: 'Europe/Istanbul'
      })
    } catch {
      return '-'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'new_order': return 'Yeni Sipariş'
      case 'getting_ready': return 'Hazırlanıyor'
      case 'ready': return 'Hazır'
      case 'assigned': return 'Kurye Atandı'
      case 'picking_up': return 'Kurye Alıyor'
      case 'on_the_way': return 'Yolda'
      case 'delivered': return 'Teslim Edildi'
      case 'cancelled': return 'İptal Edildi'
      default: return status
    }
  }

  const getStatusBadgeClassDynamic = (status: string) => {
    switch (status) {
      case 'ready':
        return 'bg-teal-900/50 text-teal-300'
      case 'assigned':
        return 'bg-purple-900/50 text-purple-300'
      case 'picking_up':
        return 'bg-orange-900/50 text-orange-300'
      case 'on_the_way':
        return 'bg-yellow-900/50 text-yellow-300'
      default:
        return getStatusBadgeClass(status)
    }
  }

  const OrderCard = ({ pkg, showButton, buttonText, buttonAction }: { 
    pkg: Package
    showButton?: boolean
    buttonText?: string
    buttonAction?: () => void
  }) => {
    // İptal edilebilir mi kontrolü
    const canCancel = ['new_order', 'getting_ready', 'ready', 'assigned', 'picking_up'].includes(pkg.status)
    
    // 🔔 Gecikmiş sipariş kontrolü
    const isDelayed = isPackageDelayed(pkg.id)
    const delayedMinutes = isDelayed ? getDelayedMinutes(pkg) : 0
    const isWebOrder = pkg.platform === 'web'
    
    return (
    <div 
      onClick={() => {
        stopRestaurantAlert()
        setSelectedPackage(pkg)
      }}
      className={`relative p-4 rounded-lg border cursor-pointer ${
        isDelayed
          ? darkMode
            ? 'bg-red-900/30 border-red-700 animate-pulse'
            : 'bg-red-50 border-red-300 animate-pulse'
          : isWebOrder
          ? darkMode
            ? 'bg-amber-900/20 border-yellow-500/30'
            : 'bg-yellow-500/10 border-yellow-500/30'
          : darkMode 
          ? 'bg-slate-800 border-slate-700' 
          : 'bg-white border-gray-200'
      } shadow-sm hover:shadow-md transition-shadow ${
        isDelayed ? 'ring-2 ring-red-500/50' : ''
      }`}
    >
      {/* 🔔 Gecikme Uyarısı Banner */}
      {isDelayed && (
        <div className={`mb-3 p-2 rounded-lg ${
          darkMode ? 'bg-red-800/50 border border-red-700' : 'bg-red-100 border border-red-300'
        }`}>
          <p className={`text-xs font-bold ${darkMode ? 'text-red-300' : 'text-red-700'} flex items-center gap-1`}>
            ⏰ {delayedMinutes} dakikadır bekliyor!
          </p>
          <p className={`text-xs ${darkMode ? 'text-red-400' : 'text-red-600'} mt-1`}>
            Lütfen hazırlık durumunu güncelleyin!
          </p>
        </div>
      )}
      {/* Header */}
      <div className="flex items-start justify-between mb-3 gap-2">
        <div className="min-w-0">
          <h4 className={`font-bold text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {pkg.customer_name}
          </h4>
          <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
            {pkg.customer_phone}
          </p>
        </div>
        <div className="flex items-center gap-2 justify-end shrink-0">
          <span className={`text-xs px-2 py-1 rounded ${getStatusBadgeClassDynamic(pkg.status)}`}>
            {getStatusText(pkg.status)}
          </span>
          {isWebOrder && (
            <span className="px-2 py-0.5 text-xs font-bold bg-yellow-500/20 text-yellow-500 border border-yellow-500/30 rounded-md">
              WEB
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className={`text-xs mb-2 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>
        <p className="font-medium mb-1">📦 {pkg.content}</p>
        <p className="text-xs opacity-75">📍 {parseDeliveryAddress(pkg.delivery_address).address?.substring(0, 50)}...</p>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-700">
        <div>
          <p className={`text-lg font-bold ${darkMode ? 'text-orange-400' : 'text-orange-600'}`}>
            ₺{pkg.amount}
          </p>
          <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>
            {formatTime(pkg.created_at)}
          </p>
        </div>
        
        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
          {showButton && buttonAction && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                buttonAction()
              }}
              disabled={loading === pkg.id}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                darkMode
                  ? 'bg-orange-600 hover:bg-orange-700 text-white'
                  : 'bg-orange-500 hover:bg-orange-600 text-white'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {loading === pkg.id ? '⏳' : buttonText}
            </button>
          )}
          
          {/* İPTAL BUTONU - Sadece izin verilen durumlarda */}
          {canCancel && restaurantId && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                console.log('🔴 İptal butonuna tıklandı:', {
                  pkgId: pkg.id,
                  pkgOrderNumber: pkg.order_number,
                  restaurantId,
                  fullPackage: pkg
                })
                setCancelPackage(pkg)
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-600 hover:bg-red-700 text-white transition-colors"
              title="Siparişi İptal Et"
            >
              ❌
            </button>
          )}
          
          {/* İptal edilemez uyarısı */}
          {!canCancel && (
            <button
              disabled
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-600 text-gray-400 cursor-not-allowed"
              title="Kurye yola çıktığı için iptal edemezsiniz"
            >
              🔒
            </button>
          )}
        </div>
      </div>
    </div>
  )}

  const Column = ({ 
    title, 
    count, 
    icon, 
    color, 
    orders, 
    showButton, 
    buttonText, 
    buttonAction,
  }: {
    title: string
    count: number
    icon: string
    color: string
    orders: Package[]
    showButton?: boolean
    buttonText?: string
    buttonAction?: (pkg: Package) => void
  }) => (
    <div className={`rounded-xl border ${
      darkMode 
        ? 'bg-slate-900 border-slate-800' 
        : 'bg-gray-50 border-gray-200'
    }`}>
      {/* Column Header - Kompakt Tasarım */}
      <div className={`p-3 border-b ${darkMode ? 'border-slate-800' : 'border-gray-200'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">{icon}</span>
            <h3 className={`font-bold text-base ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {title}
            </h3>
          </div>
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${color}`}>
            {count}
          </span>
        </div>
      </div>

      {/* Column Content */}
      <div className="p-4 space-y-3 max-h-[60vh] lg:max-h-[calc(100vh-300px)] overflow-y-auto">
        {orders.length === 0 ? (
          <div className={`text-center py-12 ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>
            <p className="text-4xl mb-2">📭</p>
            <p className="text-sm">Sipariş yok</p>
          </div>
        ) : (
          orders.map(pkg => (
            <OrderCard
              key={pkg.id}
              pkg={pkg}
              showButton={showButton}
              buttonText={buttonText}
              buttonAction={buttonAction ? () => buttonAction(pkg) : undefined}
            />
          ))
        )}
      </div>
    </div>
  )

  return (
    <>
      {/* İPTAL MODALI */}
      {cancelPackage && restaurantId && (
        <CancelOrderModal
          package={cancelPackage}
          restaurantId={restaurantId}
          onClose={() => setCancelPackage(null)}
          onSuccess={() => {
            onRefresh()
            setCancelPackage(null)
          }}
          darkMode={darkMode}
        />
      )}

      {/* TUTAR GÜNCELLEME MODALI */}
      {updateAmountPackage && (
        <UpdateAmountModal
          packageId={updateAmountPackage.id}
          currentAmount={updateAmountPackage.amount}
          packageStatus={updateAmountPackage.status}
          orderNumber={updateAmountPackage.order_number}
          onClose={() => setUpdateAmountPackage(null)}
          onSuccess={() => {
            onRefresh()
            // Başarı mesajı göster (opsiyonel)
          }}
          darkMode={darkMode}
        />
      )}

      {/* DETAY MODAL */}
      {selectedPackage && (() => {
        const pkg = detailPackage || selectedPackage
        const orderItems: OrderItem[] = normalizeOrderItems(pkg.items)
        const { address: displayAddress, tarif: addressTarif } = parseDeliveryAddress(pkg.delivery_address)

        return (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4" onClick={() => setSelectedPackage(null)}>
          <div className={`rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto border shadow-2xl ${
            darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200'
          }`} onClick={(e) => e.stopPropagation()}>
            {/* Başlık ve Kapat Butonu */}
            <div className={`flex justify-between items-center mb-4 sticky top-0 pb-4 border-b z-10 ${
              darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200'
            }`}>
              <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>📦 Sipariş Detayları</h3>
              <button
                onClick={() => setSelectedPackage(null)}
                className={`text-2xl font-bold w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
                  darkMode ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                ×
              </button>
            </div>

            {/* İçerik */}
            <div className="space-y-4 pt-2">
              {/* Sipariş No, Restoran ve Platform */}
              <div className="space-y-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className={`text-lg font-bold ${darkMode ? 'text-orange-400' : 'text-orange-600'}`}>
                    {pkg.order_number || '......'}
                  </span>
                  {pkg.platform && (
                    <span className={`text-sm py-1 px-3 rounded ${getPlatformBadgeClass(pkg.platform)}`}>
                      {getPlatformDisplayName(pkg.platform)}
                    </span>
                  )}
                </div>
                {restaurantName && (
                  <p className={`text-sm ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                    🏪 {restaurantName}
                  </p>
                )}
              </div>

              {/* Durum */}
              <div className={`p-4 rounded-lg ${darkMode ? 'bg-slate-800' : 'bg-gray-50'}`}>
                <div className="flex items-center justify-between">
                  <span className={`text-sm ${darkMode ? 'text-slate-400' : 'text-gray-600'}`}>Durum:</span>
                  <span className={`px-3 py-1.5 rounded-full text-sm font-semibold ${
                    pkg.status === 'cancelled' ? 'bg-red-900/50 text-red-300' :
                    pkg.status === 'new_order' ? 'bg-blue-900/50 text-blue-300' :
                    pkg.status === 'getting_ready' ? 'bg-cyan-900/50 text-cyan-300' :
                    pkg.status === 'ready' ? 'bg-teal-900/50 text-teal-300' :
                    pkg.status === 'assigned' ? 'bg-purple-900/50 text-purple-300' :
                    pkg.status === 'picking_up' ? 'bg-orange-900/50 text-orange-300' :
                    pkg.status === 'on_the_way' ? 'bg-yellow-900/50 text-yellow-300' :
                    'bg-green-900/50 text-green-300'
                  }`}>
                    {getStatusText(pkg.status)}
                  </span>
                </div>
              </div>

              {/* Sipariş İçeriği */}
              <div className={`p-4 rounded-lg border ${
                darkMode ? 'bg-[#0f172a] border-[#475569]' : 'bg-gray-800 border-gray-700'
              }`}>
                <h4 className={`font-semibold mb-3 flex items-center gap-2 ${darkMode ? 'text-orange-400' : 'text-orange-500'}`}>
                  🛒 Sipariş İçeriği
                </h4>
                {detailLoading ? (
                  <div className={`text-sm py-4 text-center ${darkMode ? 'text-slate-400' : 'text-gray-400'}`}>
                    Ürünler yükleniyor...
                  </div>
                ) : orderItems.length === 0 ? (
                  <p className={`text-sm italic ${darkMode ? 'text-slate-400' : 'text-gray-400'}`}>
                    Ürün bilgisi bulunamadı
                  </p>
                ) : (
                  <div className="space-y-4">
                    {orderItems.map((item, index) => {
                      const lineTotal = item.quantity * item.price
                      return (
                        <div
                          key={`${item.product_name}-${index}`}
                          className={`pb-4 ${index < orderItems.length - 1 ? `border-b ${darkMode ? 'border-slate-700' : 'border-gray-600'}` : ''}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <p className={`font-bold ${darkMode ? 'text-white' : 'text-gray-100'}`}>
                                {item.product_name}
                              </p>
                              <p className={`text-xs mt-0.5 ${darkMode ? 'text-slate-400' : 'text-gray-400'}`}>
                                {item.quantity} adet × {formatPrice(item.price)}
                              </p>
                            </div>
                            <p className={`font-bold shrink-0 ${darkMode ? 'text-orange-400' : 'text-orange-500'}`}>
                              {formatPrice(lineTotal)}
                            </p>
                          </div>
                          {item.selected_options.length > 0 && (
                            <ul className={`mt-2 space-y-0.5 text-xs ${darkMode ? 'text-gray-400' : 'text-gray-400'}`}>
                              {item.selected_options.map((opt, optIndex) => {
                                const priceDiff = Number(opt.price_diff ?? 0)
                                const priceSuffix = priceDiff !== 0
                                  ? ` (${priceDiff > 0 ? '+' : ''}${formatPrice(priceDiff)})`
                                  : ''
                                return (
                                  <li key={`${opt.option_id || opt.option_name}-${optIndex}`}>
                                    – {opt.group_name || 'Opsiyon'}: {opt.option_name}{priceSuffix}
                                  </li>
                                )
                              })}
                            </ul>
                          )}
                          {item.item_note && (
                            <p className={`mt-2 text-xs italic ${darkMode ? 'text-slate-300' : 'text-gray-300'}`}>
                              📝 {item.item_note}
                            </p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Müşteri Bilgileri */}
              <div className={`p-4 rounded-lg space-y-3 ${darkMode ? 'bg-slate-800' : 'bg-gray-50'}`}>
                <h4 className={`font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Müşteri Bilgileri</h4>
                <div>
                  <p className={`text-xs mb-1 ${darkMode ? 'text-slate-400' : 'text-gray-600'}`}>Ad Soyad</p>
                  <p className={darkMode ? 'text-white' : 'text-gray-900'}>👤 {pkg.customer_name}</p>
                </div>
                {pkg.customer_phone && (
                  <div>
                    <p className={`text-xs mb-1 ${darkMode ? 'text-slate-400' : 'text-gray-600'}`}>Telefon</p>
                    <p className={darkMode ? 'text-white' : 'text-gray-900'}>📞 {pkg.customer_phone}</p>
                  </div>
                )}
                <div>
                  <p className={`text-xs mb-1 ${darkMode ? 'text-slate-400' : 'text-gray-600'}`}>Teslimat Adresi</p>
                  <p className={darkMode ? 'text-white' : 'text-gray-900'}>📍 {displayAddress}</p>
                </div>
                <div>
                  <p className={`text-xs mb-1 ${darkMode ? 'text-slate-400' : 'text-gray-600'}`}>Adres Tarifi</p>
                  {addressTarif ? (
                    <p className={`italic ${darkMode ? 'text-orange-300' : 'text-orange-700'}`}>🧭 {addressTarif}</p>
                  ) : (
                    <p className={`text-sm italic ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>Tarif girilmemiş</p>
                  )}
                </div>
              </div>

              {/* Tutar */}
              <div className={`p-4 rounded-lg ${darkMode ? 'bg-slate-800' : 'bg-gray-50'}`}>
                <div className="flex items-center justify-between mb-3">
                  <p className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Tutar</p>
                  {!['on_the_way', 'delivered', 'cancelled'].includes(pkg.status) && (
                    <button
                      onClick={() => {
                        setUpdateAmountPackage(pkg)
                        setSelectedPackage(null)
                      }}
                      className={`text-xs px-3 py-1 rounded-lg font-semibold transition-colors ${
                        darkMode
                          ? 'bg-orange-600 hover:bg-orange-700 text-white'
                          : 'bg-orange-500 hover:bg-orange-600 text-white'
                      }`}
                    >
                      ✏️ Güncelle
                    </button>
                  )}
                </div>
                <div className="space-y-2 text-sm">
                  {pkg.subtotal != null && (
                    <div className="flex justify-between">
                      <span className={darkMode ? 'text-slate-400' : 'text-gray-600'}>Ara Toplam</span>
                      <span className={darkMode ? 'text-white' : 'text-gray-900'}>{formatPrice(Number(pkg.subtotal))}</span>
                    </div>
                  )}
                  {pkg.delivery_fee != null && Number(pkg.delivery_fee) > 0 && (
                    <div className="flex justify-between">
                      <span className={darkMode ? 'text-slate-400' : 'text-gray-600'}>Teslimat</span>
                      <span className={darkMode ? 'text-white' : 'text-gray-900'}>{formatPrice(Number(pkg.delivery_fee))}</span>
                    </div>
                  )}
                  <div className={`flex justify-between pt-2 border-t ${darkMode ? 'border-slate-700' : 'border-gray-200'}`}>
                    <span className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Genel Toplam</span>
                    <span className={`font-bold text-xl ${darkMode ? 'text-orange-400' : 'text-orange-600'}`}>
                      {formatPrice(Number(pkg.amount))}
                    </span>
                  </div>
                </div>
                {['on_the_way', 'delivered', 'cancelled'].includes(pkg.status) && (
                  <p className={`text-xs mt-2 ${darkMode ? 'text-slate-500' : 'text-gray-500'}`}>
                    ⚠️ Tutar artık değiştirilemez
                  </p>
                )}
              </div>

              {/* Paket İçeriği */}
              {pkg.content && (
                <div className={`p-4 rounded-lg ${darkMode ? 'bg-slate-800' : 'bg-gray-50'}`}>
                  <p className={`text-xs mb-1 ${darkMode ? 'text-slate-400' : 'text-gray-600'}`}>Paket İçeriği</p>
                  <p className={darkMode ? 'text-orange-200' : 'text-orange-700'}>📝 {pkg.content}</p>
                </div>
              )}

              {/* Ödeme Yöntemi */}
              <div className={`p-4 rounded-lg ${darkMode ? 'bg-slate-800' : 'bg-gray-50'}`}>
                <div className="flex items-center justify-between">
                  <span className={`text-sm ${darkMode ? 'text-slate-400' : 'text-gray-600'}`}>Ödeme Yöntemi:</span>
                  <span className={`px-3 py-1 rounded text-sm font-medium ${
                    pkg.payment_method === 'cash'
                      ? 'bg-green-900/50 text-green-300'
                      : pkg.payment_method === 'iban'
                      ? 'bg-purple-900/50 text-purple-300'
                      : 'bg-orange-900/50 text-orange-300'
                  }`}>
                    {pkg.payment_method === 'cash' ? '💵 Nakit' : pkg.payment_method === 'iban' ? '🏦 IBAN' : '💳 Kart'}
                  </span>
                </div>
              </div>

              {/* Kurye Bilgisi */}
              {pkg.courier_id && (
                <div className={`p-4 rounded-lg ${darkMode ? 'bg-slate-800' : 'bg-gray-50'}`}>
                  <p className={`text-xs mb-1 ${darkMode ? 'text-slate-400' : 'text-gray-600'}`}>Atanan Kurye</p>
                  <p className={darkMode ? 'text-white' : 'text-gray-900'}>🚴 {couriers.find(c => c.id === pkg.courier_id)?.full_name || 'Bilinmeyen'}</p>
                </div>
              )}

              {/* Zaman Bilgileri */}
              <div className={`p-4 rounded-lg space-y-2 ${darkMode ? 'bg-slate-800' : 'bg-gray-50'}`}>
                <h4 className={`font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Zaman Bilgileri</h4>
                <div className="flex justify-between text-sm">
                  <span className={darkMode ? 'text-slate-400' : 'text-gray-600'}>Oluşturulma:</span>
                  <span className={darkMode ? 'text-white' : 'text-gray-900'}>🕐 {formatTurkishTime(pkg.created_at)}</span>
                </div>
                {pkg.getting_ready_at && (
                  <div className="flex justify-between text-sm">
                    <span className={darkMode ? 'text-slate-400' : 'text-gray-600'}>Hazırlanmaya Başlandı:</span>
                    <span className={darkMode ? 'text-white' : 'text-gray-900'}>
                      🕐 {formatTurkishTime(pkg.getting_ready_at)}
                    </span>
                  </div>
                )}
                {pkg.ready_at && (
                  <div className="flex justify-between text-sm">
                    <span className={darkMode ? 'text-slate-400' : 'text-gray-600'}>Hazır Oldu:</span>
                    <span className={darkMode ? 'text-white' : 'text-gray-900'}>🕐 {formatTurkishTime(pkg.ready_at)}</span>
                  </div>
                )}
                {pkg.assigned_at && (
                  <div className="flex justify-between text-sm">
                    <span className={darkMode ? 'text-slate-400' : 'text-gray-600'}>Kuryeye Atandı:</span>
                    <span className={darkMode ? 'text-white' : 'text-gray-900'}>🕐 {formatTurkishTime(pkg.assigned_at)}</span>
                  </div>
                )}
                {pkg.picked_up_at && (
                  <div className="flex justify-between text-sm">
                    <span className={darkMode ? 'text-slate-400' : 'text-gray-600'}>Alındı:</span>
                    <span className={darkMode ? 'text-white' : 'text-gray-900'}>🕐 {formatTurkishTime(pkg.picked_up_at)}</span>
                  </div>
                )}
                {pkg.delivered_at && (
                  <div className="flex justify-between text-sm">
                    <span className={darkMode ? 'text-slate-400' : 'text-gray-600'}>Teslim Edildi:</span>
                    <span className={darkMode ? 'text-white' : 'text-gray-900'}>🕐 {formatTurkishTime(pkg.delivered_at)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        )
      })()}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Yeni Siparişler */}
      <Column
        title="Yeni Siparişler"
        count={newOrders.length}
        icon="🔔"
        color={darkMode ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-700'}
        orders={newOrders}
        showButton={true}
        buttonText="Hazırla"
        buttonAction={(pkg) => handleStatusChange(pkg.id, 'getting_ready')}
      />

      {/* Hazırlanan */}
      <Column
        title="Hazırlanan"
        count={gettingReady.length}
        icon="👨‍🍳"
        color={darkMode ? 'bg-cyan-900/50 text-cyan-300' : 'bg-cyan-100 text-cyan-700'}
        orders={gettingReady}
        showButton={true}
        buttonText="Hazır"
        buttonAction={(pkg) => handleStatusChange(pkg.id, 'ready')}
      />

      {/* Hazır */}
      <Column
        title="Hazır"
        count={ready.length}
        icon="✅"
        color={darkMode ? 'bg-teal-900/50 text-teal-300' : 'bg-teal-100 text-teal-700'}
        orders={ready}
        showButton={false}
      />
    </div>
    </>
  )
}
