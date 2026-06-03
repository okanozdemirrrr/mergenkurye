/**
 * @file src/app/admin/AdminModals.tsx
 * @description Admin Panel Modal Yöneticisi
 * 
 * REFACTOR: RestaurantDetailModal artık STATELESS.
 * - Kendi tarih state'i yok → globalStartDate/globalEndDate proplarıyla çalışır
 * - show prop'u yok → conditional render ile açılıp kapanır  
 * - closeModal → router.back() yerine URL temizleme (çifte-back problemi çözüldü)
 * - Auto-fetch: Modal mount olduğu an veri çeker
 */
'use client'

import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useAdminData } from './AdminDataProvider'
import { CourierDetailModal } from './components/modals/CourierDetailModal'
import { RestaurantDetailModal } from './components/modals/RestaurantDetailModal'
import { EndOfDayModalNew } from './components/modals/EndOfDayModalNew'
import { PayDebtModal } from './components/modals/PayDebtModal'
import { RestaurantPaymentModal } from './components/modals/RestaurantPaymentModal'
import { getPlatformBadgeClass, getPlatformDisplayName } from '../lib/platformUtils'
import { calculateCashSummary, calculateRestaurantSummary } from '@/utils/adminCalculations'
import { useAdminCourierModal } from './hooks/useAdminCourierModal'
import { useAdminRestaurantModal } from './hooks/useAdminRestaurantModal'

export function AdminModals() {
  const router = useRouter()
  const pathname = usePathname()
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

  // Restoran Modal Hook (ödeme ve borç modalleri için hâlâ lazım)
  const restaurantModal = useAdminRestaurantModal({
    restaurantId,
    modalType,
    setSuccessMessage,
    setErrorMessage,
    fetchRestaurants,
    parentStartDate,
    parentEndDate
  })

  // 🔥 CLEAN CLOSE: URL parametrelerini temizle, router.back() KULLANMA!
  // router.back() çifte-back sorununa neden oluyordu.
  const closeModal = () => {
    router.replace(pathname, { scroll: false })
  }

  const courier = couriers.find(c => c.id === courierId)
  const restaurant = restaurants.find(r => r.id === restaurantId)

  // 🎯 RestaurantDetailModal için tarih hesaplama
  // Parent'tan tarih geliyorsa onu kullan, yoksa Business Day (05:00) mantığı
  const getGlobalDates = () => {
    if (parentStartDate && parentEndDate) {
      return { start: parentStartDate, end: parentEndDate }
    }
    // Fallback: Business Day (bugün)
    const now = new Date()
    const currentHour = now.getHours()
    const todayStart = new Date(now)
    if (currentHour < 5) {
      todayStart.setDate(todayStart.getDate() - 1)
    }
    todayStart.setHours(5, 0, 0, 0)
    return {
      start: todayStart.toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0]
    }
  }

  const globalDates = getGlobalDates()

  return (
    <>
      {/* Courier Detail Modal */}
      {modalType === 'courier' && courierId && courier && (
        <CourierDetailModal
          key={`${courierId}-${courierModal.courierStartDate}-${courierModal.courierEndDate}`}
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
          key={`eod-${courierId}-${courierModal.courierStartDate}-${courierModal.courierEndDate}`}
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

      {/* 🔥 Restaurant Detail Modal - STATELESS, CONDITIONAL UNMOUNT */}
      {modalType === 'restaurant' && restaurantId && restaurant && (
        <RestaurantDetailModal
          restaurantId={restaurantId}
          globalStartDate={globalDates.start}
          globalEndDate={globalDates.end}
          onClose={closeModal}
          onPaymentClick={(guncelBakiye) => {
            restaurantModal.setGuncelBakiye(guncelBakiye)
            restaurantModal.setShowRestaurantPaymentModal(true)
          }}
          restaurant={restaurant}
          onRefetch={restaurantModal.refetchTrigger}
        />
      )}

      {/* Restaurant Payment Modal - Force Remount with key */}
      {restaurantModal.showRestaurantPaymentModal && (
        <RestaurantPaymentModal
          key={`${restaurantId}_${Date.now()}`}
          show={restaurantModal.showRestaurantPaymentModal}
          onClose={() => restaurantModal.setShowRestaurantPaymentModal(false)}
          restaurant={restaurant}
          selectedRestaurantId={restaurantId}
          guncelBakiye={restaurantModal.guncelBakiye}
          restaurantPaymentAmount={restaurantModal.restaurantPaymentAmount}
          setRestaurantPaymentAmount={restaurantModal.setRestaurantPaymentAmount}
          onConfirm={restaurantModal.handleRestaurantPayment}
          processing={restaurantModal.restaurantPaymentProcessing}
        />
      )}
    </>
  )
}
