/**
 * @file src/app/admin/components/LiveTrackingTabWithGrid.tsx
 * @description Canlı Takip Paneli - Draggable Grid ile
 */
'use client'

import { useState } from 'react'
import { Package, Courier } from '@/types'
import { DraggableGrid } from './DraggableGrid'
import { LiveMapCard } from './dashboard/LiveMapCard'
import { CourierStatusCard } from './dashboard/CourierStatusCard'
import { LiveOrdersCard } from './dashboard/LiveOrdersCard'
import { CourierRoutesCard } from './dashboard/CourierRoutesCard'
import { OrderDrawer } from './OrderDrawer'
import { CourierTransferModal } from './CourierTransferModal'
import { formatTurkishTime } from '@/utils/dateHelpers'
import { 
  Package as PackageIcon, Clock, Circle, ChefHat, CheckCircle2, User, 
  Footprints, Car, PartyPopper, Ban 
} from 'lucide-react'

interface LiveTrackingTabWithGridProps {
  packages: Package[]
  couriers: Courier[]
  restaurants: any[]
  isLoading: boolean
  selectedCouriers: { [key: number]: string }
  longDistancePackages: { [key: number]: boolean }
  assigningIds: Set<number>
  openDropdownId: number | null
  setOpenDropdownId: (id: number | null) => void
  handleCourierChange: (packageId: number, courierId: string) => void
  handleLongDistanceChange: (packageId: number, isLongDistance: boolean) => void
  handleAssignCourier: (packageId: number) => void
  handleCancelOrder: (id: number, details: string) => void
  todayDeliveredCount: number
  onCouriersOrderChange: (couriers: Courier[]) => void
}

const getStatusText = (status: string) => {
  switch (status) {
    case 'new_order': return 'Yeni Sipariş'
    case 'getting_ready': return 'Hazırlanıyor'
    case 'ready': return 'Hazır'
    case 'assigned': return 'Atandı'
    case 'picking_up': return 'Alınıyor'
    case 'on_the_way': return 'Yolda'
    case 'delivered': return 'Teslim Edildi'
    case 'cancelled': return 'İptal Edildi'
    default: return status
  }
}

export function LiveTrackingTabWithGrid({
  packages,
  couriers,
  restaurants,
  isLoading,
  selectedCouriers,
  longDistancePackages,
  assigningIds,
  openDropdownId,
  setOpenDropdownId,
  handleCourierChange,
  handleLongDistanceChange,
  handleAssignCourier,
  handleCancelOrder,
  todayDeliveredCount,
  onCouriersOrderChange
}: LiveTrackingTabWithGridProps) {
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null)
  const [transferPackage, setTransferPackage] = useState<Package | null>(null)
  const [liveCouriersCount, setLiveCouriersCount] = useState(0)
  
  // Kurye atanmış paketler
  const assignedPackages = packages.filter(pkg => pkg.courier_id && pkg.status !== 'cancelled')

  return (
    <>
      {/* KURYE DEVİR MODAL'I */}
      {transferPackage && (
        <CourierTransferModal
          package={transferPackage}
          couriers={couriers}
          onClose={() => setTransferPackage(null)}
          onSuccess={() => {
            console.log('Kurye devri başarılı')
          }}
        />
      )}

      {/* DETAY MODAL */}
      {selectedPackage && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4" onClick={() => setSelectedPackage(null)}>
          <div className="bg-slate-900 rounded-md p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-700 shadow-sm" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4 sticky top-0 bg-slate-900 pb-4 border-b border-slate-700 z-10">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <PackageIcon className="w-5 h-5 text-gray-400" strokeWidth={1.5} />
                Sipariş Detayları
              </h3>
              <button
                onClick={() => setSelectedPackage(null)}
                className="text-slate-400 hover:text-white text-2xl font-bold w-8 h-8 flex items-center justify-center rounded-md hover:bg-slate-800 transition-colors"
              >
                ×
              </button>
            </div>

            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold text-orange-400">
                  {selectedPackage.order_number || '......'}
                </span>
              </div>

              <div className="bg-slate-800 p-4 rounded-md">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-sm">Durum:</span>
                  <span className={`px-3 py-1.5 rounded-full text-sm font-semibold ${
                    selectedPackage.status === 'cancelled' ? 'bg-red-900/50 text-red-300' :
                    selectedPackage.status === 'new_order' ? 'bg-blue-900/50 text-blue-300' :
                    selectedPackage.status === 'getting_ready' ? 'bg-cyan-900/50 text-cyan-300' :
                    selectedPackage.status === 'ready' ? 'bg-teal-900/50 text-teal-300' :
                    selectedPackage.status === 'waiting' ? 'bg-yellow-900/50 text-yellow-300' :
                    selectedPackage.status === 'assigned' ? 'bg-purple-900/50 text-purple-300' :
                    selectedPackage.status === 'picking_up' ? 'bg-orange-900/50 text-orange-300' :
                    selectedPackage.status === 'on_the_way' ? 'bg-yellow-900/50 text-yellow-300' :
                    'bg-green-900/50 text-green-300'
                  }`}>
                    {getStatusText(selectedPackage.status)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-800 p-4 rounded-md">
                  <p className="text-slate-400 text-xs mb-1">Restoran</p>
                  <p className="text-white font-semibold">{selectedPackage.restaurant?.name || 'Bilinmeyen'}</p>
                </div>
                <div className="bg-slate-800 p-4 rounded-md">
                  <p className="text-slate-400 text-xs mb-1">Tutar</p>
                  <p className="text-green-400 font-bold text-xl">{selectedPackage.amount}₺</p>
                </div>
              </div>

              <div className="bg-slate-800 p-4 rounded-md space-y-3">
                <h4 className="text-white font-semibold mb-2">Müşteri Bilgileri</h4>
                <div>
                  <p className="text-slate-400 text-xs mb-1">Ad Soyad</p>
                  <p className="text-white">{selectedPackage.customer_name}</p>
                </div>
                {selectedPackage.customer_phone && (
                  <div>
                    <p className="text-slate-400 text-xs mb-1">Telefon</p>
                    <p className="text-white">{selectedPackage.customer_phone}</p>
                  </div>
                )}
                <div>
                  <p className="text-slate-400 text-xs mb-1">Teslimat Adresi</p>
                  <p className="text-white">{selectedPackage.delivery_address}</p>
                </div>
              </div>

              {selectedPackage.content && (
                <div className="bg-slate-800 p-4 rounded-md">
                  <p className="text-slate-400 text-xs mb-1">Paket İçeriği</p>
                  <p className="text-orange-200">{selectedPackage.content}</p>
                </div>
              )}

              <div className="bg-slate-800 p-4 rounded-md">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-sm">Ödeme Yöntemi:</span>
                  <span className={`px-3 py-1 rounded text-sm font-medium ${
                    selectedPackage.payment_method === 'cash'
                      ? 'bg-green-900/50 text-green-300'
                      : selectedPackage.payment_method === 'iban'
                      ? 'bg-purple-900/50 text-purple-300'
                      : 'bg-orange-900/50 text-orange-300'
                  }`}>
                    {selectedPackage.payment_method === 'cash' ? 'Nakit' : selectedPackage.payment_method === 'iban' ? 'IBAN' : 'Kart'}
                  </span>
                </div>
              </div>

              {selectedPackage.courier_id && (
                <div className="bg-slate-800 p-4 rounded-md">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-slate-400 text-xs mb-1">Atanan Kurye</p>
                      <p className="text-white">{couriers.find(c => c.id === selectedPackage.courier_id)?.full_name || 'Bilinmeyen'}</p>
                    </div>
                    {(selectedPackage.status === 'assigned' || selectedPackage.status === 'picking_up' || selectedPackage.status === 'on_the_way') && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setTransferPackage(selectedPackage)
                        }}
                        className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-2 rounded-md text-xs font-semibold transition-colors flex items-center gap-1"
                      >
                        Kurye Devret
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div className="bg-slate-800 p-4 rounded-md space-y-2">
                <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-400" strokeWidth={1.5} />
                  Zaman Çizelgesi
                </h4>
                
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Oluşturulma:</span>
                  <span className="text-white font-medium">
                    {selectedPackage.created_at ? formatTurkishTime(selectedPackage.created_at) : '-'}
                  </span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Hazırlamaya Başlama:</span>
                  <span className="text-white font-medium">
                    {selectedPackage.getting_ready_at ? formatTurkishTime(selectedPackage.getting_ready_at) : '-'}
                  </span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Hazır Olma:</span>
                  <span className="text-white font-medium">
                    {selectedPackage.ready_at ? formatTurkishTime(selectedPackage.ready_at) : '-'}
                  </span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Kurye Kabul Saati:</span>
                  <span className="text-white font-medium">
                    {selectedPackage.assigned_at ? formatTurkishTime(selectedPackage.assigned_at) : '-'}
                  </span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Esnaftan Alınma:</span>
                  <span className="text-white font-medium">
                    {selectedPackage.picked_up_at ? formatTurkishTime(selectedPackage.picked_up_at) : '-'}
                  </span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Teslim Edilme:</span>
                  <span className="text-white font-medium">
                    {selectedPackage.delivered_at ? formatTurkishTime(selectedPackage.delivered_at) : '-'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DRAWER BUTONU */}
      <OrderDrawer
        packages={assignedPackages}
        couriers={couriers}
        openDropdownId={openDropdownId}
        setOpenDropdownId={setOpenDropdownId}
        handleCancelOrder={handleCancelOrder}
      />
      
      {/* DRAGGABLE GRID */}
      <div className="mt-2 w-full max-w-full min-w-0">
        <DraggableGrid>
          {{
            map: (
              <LiveMapCard
                packages={packages}
                couriers={couriers}
                restaurants={restaurants}
                onLiveCouriersChange={setLiveCouriersCount}
              />
            ),
            courierStatus: (
              <CourierStatusCard
                couriers={couriers}
                assignedPackages={assignedPackages}
                restaurants={restaurants}
                todayDeliveredCount={todayDeliveredCount}
                onCouriersOrderChange={onCouriersOrderChange}
                onPackageClick={setSelectedPackage}
              />
            ),
            orders: (
              <LiveOrdersCard
                packages={packages}
                couriers={couriers}
                isLoading={isLoading}
                selectedCouriers={selectedCouriers}
                longDistancePackages={longDistancePackages}
                assigningIds={assigningIds}
                openDropdownId={openDropdownId}
                setOpenDropdownId={setOpenDropdownId}
                handleCourierChange={handleCourierChange}
                handleLongDistanceChange={handleLongDistanceChange}
                handleAssignCourier={handleAssignCourier}
                handleCancelOrder={handleCancelOrder}
                onPackageClick={setSelectedPackage}
              />
            ),
            courierRoutes: (
              <CourierRoutesCard couriers={couriers} />
            ),
          }}
        </DraggableGrid>
      </div>
    </>
  )
}
