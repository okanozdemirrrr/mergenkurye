/**
 * @file src/components/notifications/AdminNotificationWrapper.tsx
 * @description Admin Paneli için Bildirim Wrapper Component
 * 
 * KULLANIM:
 * Admin panelinin ana sayfasına bu component'i ekleyin
 * Sadece giriş yapılmışsa bildirim dinler
 */
'use client'

import { useAdminNotifications } from '@/hooks/useAdminNotifications'
import { AdminOrderPopup } from './AdminOrderPopup'

interface AdminNotificationWrapperProps {
  isLoggedIn?: boolean
}

export function AdminNotificationWrapper({ isLoggedIn = false }: AdminNotificationWrapperProps) {
  const { newOrder, dismissNotification } = useAdminNotifications(isLoggedIn)

  if (!newOrder) return null

  return (
    <AdminOrderPopup
      orderId={newOrder.id}
      orderNumber={newOrder.order_number}
      customerName={newOrder.customer_name}
      customerPhone={newOrder.customer_phone}
      customerAddress={newOrder.delivery_address}
      restaurantName={newOrder.restaurant?.name}
      onDismiss={dismissNotification}
    />
  )
}
