'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/app/lib/supabase'
import { Bell, X, CheckCheck } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'

interface Notification {
  id: string
  title: string
  message: string
  type: 'order_reply' | 'campaign' | 'system' | 'order_update'
  is_read: boolean
  action_url: string | null
  created_at: string
  related_order_id: number | null
}

export default function NotificationBell() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadNotifications()
    subscribeToNotifications()

    // Dışarı tıklandığında kapat
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const loadNotifications = async () => {
    try {
      const customerId = localStorage.getItem('customer_id')
      if (!customerId) return

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error

      setNotifications(data || [])
      setUnreadCount(data?.filter(n => !n.is_read).length || 0)
    } catch (error) {
      console.error('Bildirimler yüklenemedi:', error)
    }
  }

  const subscribeToNotifications = () => {
    const customerId = localStorage.getItem('customer_id')
    if (!customerId) {
      console.log('❌ Customer ID bulunamadı, subscription başlatılamadı')
      return
    }

    console.log('🔌 Realtime subscription başlatılıyor...', customerId)

    const channel = supabase
      .channel('notifications-channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `customer_id=eq.${customerId}`
        },
        (payload) => {
          console.log('🔔 Yeni bildirim geldi!', payload.new)
          const newNotification = payload.new as Notification
          
          setNotifications(prev => [newNotification, ...prev])
          setUnreadCount(prev => prev + 1)

          // Tarayıcı bildirimi gönder
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(newNotification.title, {
              body: newNotification.message,
              icon: '/icon-192x192.png',
              badge: '/icon-192x192.png',
              tag: newNotification.id
            })
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Subscription durumu:', status)
        if (status === 'SUBSCRIBED') {
          console.log('✅ Realtime bağlantısı başarılı!')
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Realtime bağlantı hatası!')
        } else if (status === 'TIMED_OUT') {
          console.error('⏱️ Realtime bağlantı zaman aşımı!')
        }
      })

    return () => {
      console.log('🔌 Realtime subscription kapatılıyor...')
      supabase.removeChannel(channel)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId)

      if (error) throw error

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Bildirim güncellenemedi:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      setLoading(true)
      const customerId = localStorage.getItem('customer_id')
      if (!customerId) return

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('customer_id', customerId)
        .eq('is_read', false)

      if (error) throw error

      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      setUnreadCount(0)
    } catch (error) {
      console.error('Bildirimler güncellenemedi:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id)
    setIsOpen(false)

    if (notification.action_url) {
      router.push(notification.action_url)
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'order_reply':
        return '💬'
      case 'order_update':
        return '📦'
      case 'campaign':
        return '🎉'
      case 'system':
        return '🔔'
      default:
        return '📢'
    }
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Şimdi'
    if (diffMins < 60) return `${diffMins} dk önce`
    if (diffHours < 24) return `${diffHours} saat önce`
    if (diffDays < 7) return `${diffDays} gün önce`
    return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-[#f7f7f7] rounded-lg transition-colors"
      >
        <Bell size={22} className="text-[#3c4043]" />
        
        {/* Unread Badge */}
        {unreadCount > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </motion.div>
        )}
      </button>

      {/* Dropdown Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-[380px] max-w-[calc(100vw-32px)] bg-white rounded-xl shadow-2xl border border-[#e8e8e8] z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#e8e8e8] bg-gradient-to-r from-orange-50 to-orange-100">
              <div className="flex items-center gap-2">
                <Bell size={18} className="text-[#f59e0b]" />
                <h3 className="font-bold text-[15px] text-[#3c4043]">
                  Bildirimler
                </h3>
                {unreadCount > 0 && (
                  <span className="text-[11px] bg-red-500 text-white px-2 py-0.5 rounded-full font-semibold">
                    {unreadCount}
                  </span>
                )}
              </div>
              
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  disabled={loading}
                  className="text-[12px] text-[#f59e0b] hover:text-[#d97706] font-semibold flex items-center gap-1 disabled:opacity-50"
                >
                  <CheckCheck size={14} />
                  Tümünü Okundu İşaretle
                </button>
              )}
            </div>

            {/* Notifications List */}
            <div className="max-h-[400px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <div className="text-5xl mb-3">🔔</div>
                  <p className="text-[14px] font-semibold text-[#3c4043] mb-1">
                    Henüz Bildirim Yok
                  </p>
                  <p className="text-[12px] text-[#6f6f6f]">
                    Yeni bildirimler burada görünecek
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-[#e8e8e8]">
                  {notifications.map((notification) => (
                    <motion.button
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`w-full text-left px-4 py-3 hover:bg-[#f7f7f7] transition-colors ${
                        !notification.is_read ? 'bg-orange-50/50' : ''
                      }`}
                      whileHover={{ x: 4 }}
                    >
                      <div className="flex items-start gap-3">
                        {/* Icon */}
                        <div className="flex-shrink-0 text-2xl mt-0.5">
                          {getNotificationIcon(notification.type)}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h4 className={`text-[13px] font-semibold ${
                              !notification.is_read ? 'text-[#3c4043]' : 'text-[#6f6f6f]'
                            }`}>
                              {notification.title}
                            </h4>
                            {!notification.is_read && (
                              <div className="flex-shrink-0 w-2 h-2 bg-[#f59e0b] rounded-full mt-1" />
                            )}
                          </div>
                          <p className="text-[12px] text-[#6f6f6f] line-clamp-2 mb-1">
                            {notification.message}
                          </p>
                          <span className="text-[11px] text-[#9f9f9f]">
                            {formatTime(notification.created_at)}
                          </span>
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="border-t border-[#e8e8e8] px-4 py-2 bg-[#f7f7f7]">
                <button
                  onClick={() => {
                    setIsOpen(false)
                    router.push('/musteri/bildirimler')
                  }}
                  className="text-[12px] text-[#f59e0b] hover:text-[#d97706] font-semibold w-full text-center"
                >
                  Tüm Bildirimleri Gör
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
