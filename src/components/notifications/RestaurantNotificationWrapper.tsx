/**
 * @file src/components/notifications/RestaurantNotificationWrapper.tsx
 * @description Restoran Paneli için Bildirim Wrapper Component
 * 
 * KULLANIM:
 * Restoran panelinin ana sayfasına bu component'i ekleyin
 */
'use client'

import { useRestaurantNotifications } from '@/hooks/useRestaurantNotifications'
import { RestaurantOrderPopup } from './RestaurantOrderPopup'

interface RestaurantNotificationWrapperProps {
  restaurantId: number | null
  restaurantName: string
  isLoggedIn?: boolean
}

export function RestaurantNotificationWrapper({
  restaurantId,
  restaurantName,
  isLoggedIn = false
}: RestaurantNotificationWrapperProps) {
  const { newOrder, dismissNotification } = useRestaurantNotifications(restaurantId, isLoggedIn)

  if (!newOrder) return null

  return (
    <RestaurantOrderPopup
      orderId={newOrder.id}
      orderNumber={newOrder.order_number}
      customerName={newOrder.customer_name}
      customerPhone={newOrder.customer_phone}
      customerAddress={newOrder.delivery_address}
      restaurantName={restaurantName}
      onDismiss={dismissNotification}
    />
  )
}
