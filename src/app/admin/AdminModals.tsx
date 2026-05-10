/**
 * @file src/app/admin/AdminModals.tsx
 * @description Admin Panel Modal Yöneticisi - URL parametreleri ile kontrol
 * 
 * REFACTOR NOTU: Bu dosya temizlenmiş ve sadeleştirilmiştir.
 * Tüm iş mantığı (business logic) custom hook'lara taşınmıştır.
 * HİÇBİR MANTIK DEĞİŞİKLİĞİ YAPILMAMIŞTIR - Sadece organizasyon iyileştirilmiştir.
 */
'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useAdminData } from './AdminDataProvider'
import { CourierDetailModal } from './components/modals/CourierDetailModal'
import { RestaurantDetailModal } from './components/modals/RestaurantDetailModal'
import { EndOfDayModalNew } from './components/modals/EndOfDayModalNew'
import { PayDebtModal } from './components/modals/PayDebtModal'
import { RestaurantPaymentModal } from './components/modals/RestaurantPaymentModal'
import { RestaurantDebtPayModal } from './components/modals/RestaurantDebtPayModal'
import { getPlatformBadgeClass, getPlatformDisplayName } from '../lib/platformUtils'
import { calculateCashSummary, calculateRestaurantSummary } from '@/utils/adminCalculations'
import { useAdminCourierModal } from './hooks/useAdminCourierModal'
import { useAdminRestaurantModal } from './hooks/useAdminRestaurantModal'

export function AdminModals() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { couriers, restaurants, setSuccessMessage, setErrorMessage, fetchCouriers, fetchRestaurants } = useAdminData()

  const modalType = searchParams.get('modal')
  const courierId = searchParams.get('courierId')
  const restaurantId = searchParams.get('restaurantId')
  
  // 🎯 Ana sayfadan gelen tarih parametrelerini oku
  const parentStartDate = searchParams.get('parentStartDate')
  const parentEndDate = searchParams.get('parentEndDate')

  // Kurye Modal Hook
  const courierModal = useAdminCourierModal({
    courierId,
    modalType,
    setSuccessMessage,
    setErrorMessage,
    fetchCouriers
  })

  // Restoran Modal Hook
  const restaurantModal = useAdminRestaurantModal({
    restaurantId,
    modalType,
    setSuccessMessage,
    setErrorMessage,
    fetchRestaurants,
    parentStartDate, // 🎯 Ana sayfadan gelen başlangıç tarihi
    parentEndDate    // 🎯 Ana sayfadan gelen bitiş tarihi
  })

  const closeModal = () => {
    router.back()
  }

  const courier = couriers.find(c => c.id === courierId)
  const restaurant = restaurants.find(r => r.id === restaurantId)

  return (
    <>
      {/* Courier Detail Modal */}
      {modalType === 'courier' && courierId && (
        <CourierDetailModal
          show={true}
          onClose={closeModal}
          courier={courier}
          selectedCourierId={courierId}
          courierStartDate={courierModal.courierStartDate}
          setCourierStartDate={courierModal.setCourierStartDate}
          courierEndDate={courierModal.courierEndDate}
          setCourierEndDate={courierModal.setCourierEndDate}
          onEndOfDayClick={() => courierModal.setShowEndOfDayModal(true)}
          onPayDebtClick={() => courierModal.setShowPayDebtModal(true)}
          selectedCourierOrders={courierModal.selectedCourierOrders}
          courierDebts={courierModal.courierDebts}
          calculateCashSummary={calculateCashSummary}
          calculateRestaurantSummary={calculateRestaurantSummary}
          getPlatformBadgeClass={getPlatformBadgeClass}
          getPlatformDisplayName={getPlatformDisplayName}
        />
      )}

      {/* End of Day Modal - YENİ VERSİYON */}
      {courierModal.showEndOfDayModal && courier && (
        <EndOfDayModalNew
          show={courierModal.showEndOfDayModal}
          onClose={() => courierModal.setShowEndOfDayModal(false)}
          courier={courier}
          startDate={courierModal.courierStartDate}
          endDate={courierModal.courierEndDate}
          onSuccess={() => {
            setSuccessMessage('✅ Gün sonu mutabakatı başarıyla kaydedildi!')
            courierModal.setShowEndOfDayModal(false)
            // Kurye verilerini yenile
            fetchCouriers()
            if (courierId) {
              courierModal.fetchCourierOrders(courierId)
            }
          }}
        />
      )}

      {/* Pay Debt Modal */}
      <PayDebtModal
        show={courierModal.showPayDebtModal}
        onClose={() => courierModal.setShowPayDebtModal(false)}
        courier={courier}
        selectedCourierId={courierId}
        payDebtAmount={courierModal.payDebtAmount}
        setPayDebtAmount={courierModal.setPayDebtAmount}
        onConfirm={courierModal.handlePayDebt}
        processing={courierModal.payDebtProcessing}
        courierDebts={courierModal.courierDebts}
        loadingDebts={courierModal.loadingDebts}
      />

      {/* Restaurant Detail Modal - 🔥 FORCE REMOUNT with KEY */}
      {modalType === 'restaurant' && restaurantId && restaurant && (
        <RestaurantDetailModal
          key={`${restaurantId}-${restaurantModal.restaurantStartDate}-${restaurantModal.restaurantEndDate}`}
          show={true}
          onClose={closeModal}
          restaurant={restaurant}
          selectedRestaurantId={restaurantId}
          restaurantStartDate={restaurantModal.restaurantStartDate}
          setRestaurantStartDate={restaurantModal.setRestaurantStartDate}
          restaurantEndDate={restaurantModal.restaurantEndDate}
          setRestaurantEndDate={restaurantModal.setRestaurantEndDate}
          onPaymentClick={() => restaurantModal.setShowRestaurantPaymentModal(true)}
          selectedRestaurantOrders={restaurantModal.selectedRestaurantOrders}
          getPlatformBadgeClass={getPlatformBadgeClass}
          getPlatformDisplayName={getPlatformDisplayName}
        />
      )}

      {/* Restaurant Payment Modal */}
      <RestaurantPaymentModal
        show={restaurantModal.showRestaurantPaymentModal}
        onClose={() => restaurantModal.setShowRestaurantPaymentModal(false)}
        restaurant={restaurant}
        selectedRestaurantId={restaurantId}
        restaurantPaymentAmount={restaurantModal.restaurantPaymentAmount}
        setRestaurantPaymentAmount={restaurantModal.setRestaurantPaymentAmount}
        onConfirm={restaurantModal.handleRestaurantPayment}
        processing={restaurantModal.restaurantPaymentProcessing}
        restaurantDebts={restaurantModal.restaurantDebts}
        selectedRestaurantOrders={restaurantModal.selectedRestaurantOrders}
        restaurantStartDate={restaurantModal.restaurantStartDate}
        restaurantEndDate={restaurantModal.restaurantEndDate}
        loadingDebts={restaurantModal.loadingRestaurantDebts}
      />

      {/* Restaurant Debt Pay Modal */}
      <RestaurantDebtPayModal
        show={restaurantModal.showRestaurantDebtPayModal}
        onClose={() => restaurantModal.setShowRestaurantDebtPayModal(false)}
        restaurant={restaurant}
        selectedRestaurantId={restaurantId}
        restaurantDebtPayAmount={restaurantModal.restaurantDebtPayAmount}
        setRestaurantDebtPayAmount={restaurantModal.setRestaurantDebtPayAmount}
        onConfirm={restaurantModal.handleRestaurantDebtPayment}
        processing={restaurantModal.restaurantDebtPayProcessing}
        restaurantDebts={restaurantModal.restaurantDebts}
        loadingDebts={restaurantModal.loadingRestaurantDebts}
      />
    </>
  )
}
