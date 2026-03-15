'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'
import { ArrowLeft, Bell, CheckCheck, Trash2 } from 'lucide-react'
import { motion } from 'framer-motion'

interface Notification {
  id: string
  title: string
  message: string
  type: 'order_reply' | 'campaign' | 'system' | 'order_update'
  is_read: boolean
  action_url: string | null
  created_at: string
  read_at: string | null
}

export default function BildirimlerPage() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  useEffect(() => {
    loadNotifications()
  }, [])

  const loadNotifications = async () => {
    try {
      const customerId = localStorage.getItem('customer_id')
      if (!customerId) {
        router.push('/musteri')
        return
      }

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })

      if (error) throw error

      setNotifications(data || [])
    } catch (error) {
      console.error('Bildirimler yüklenemedi:', error)
    } finally {
      setLoading(false)
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
    } catch (error) {
      console.error('Bildirim güncellenemedi:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      const customerId = localStorage.getItem('customer_id')
      if (!customerId) return

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('customer_id', customerId)
        .eq('is_read', false)

      if (error) throw error

      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    } catch (error) {
      console.error('Bildirimler güncellenemedi:', error)
    }
  }

  const deleteNotification = async (notificationId: string) => {
    if (!confirm('Bu bildirimi silmek istediğinizden emin misiniz?')) return

    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)

      if (error) throw error

      setNotifications(prev => prev.filter(n => n.id !== notificationId))
    } catch (error) {
      console.error('Bildirim silinemedi:', error)
    }
  }

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id)
    }

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

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const filteredNotifications = filter === 'unread'
    ? notifications.filter(n => !n.is_read)
    : notifications

  const unreadCount = notifications.filter(n => !n.is_read).length

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7f7f7] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-[#f59e0b] border-t-transparent mb-4" />
          <p className="text-[#6f6f6f]">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f7f7f7]">
      {/* Header */}
      <div className="bg-white border-b border-[#e8e8e8] sticky top-0 z-10">
        <div className="max-w-[800px] mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-[#f7f7f7] rounded-lg transition-colors"
              >
                <ArrowLeft size={24} className="text-[#3c4043]" />
              </button>
              <div>
                <h1 className="text-[20px] font-bold text-[#3c4043]">
                  Bildirimler
                </h1>
                {unreadCount > 0 && (
                  <p className="text-[12px] text-[#6f6f6f]">
                    {unreadCount} okunmamış bildirim
                  </p>
                )}
              </div>
            </div>

            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="flex items-center gap-2 px-4 py-2 text-[#f59e0b] hover:bg-orange-50 rounded-lg transition-colors"
              >
                <CheckCheck size={18} />
                <span className="text-[13px] font-semibold">Tümünü Okundu İşaretle</span>
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-[13px] font-semibold transition-colors ${
                filter === 'all'
                  ? 'bg-[#f59e0b] text-white'
                  : 'bg-gray-100 text-[#6f6f6f] hover:bg-gray-200'
              }`}
            >
              Tümü ({notifications.length})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-4 py-2 rounded-lg text-[13px] font-semibold transition-colors ${
                filter === 'unread'
                  ? 'bg-[#f59e0b] text-white'
                  : 'bg-gray-100 text-[#6f6f6f] hover:bg-gray-200'
              }`}
            >
              Okunmamış ({unreadCount})
            </button>
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="max-w-[800px] mx-auto px-4 py-6">
        {filteredNotifications.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔔</div>
            <h3 className="text-[18px] font-bold text-[#3c4043] mb-2">
              {filter === 'unread' ? 'Okunmamış Bildirim Yok' : 'Henüz Bildirim Yok'}
            </h3>
            <p className="text-[13px] text-[#6f6f6f]">
              {filter === 'unread'
                ? 'Tüm bildirimlerinizi okudunuz'
                : 'Yeni bildirimler burada görünecek'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredNotifications.map((notification, index) => (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`bg-white rounded-xl p-4 border transition-all ${
                  !notification.is_read
                    ? 'border-orange-200 bg-orange-50/30'
                    : 'border-[#e8e8e8] hover:shadow-md'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className="flex-shrink-0 text-3xl mt-1">
                    {getNotificationIcon(notification.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h4 className={`text-[15px] font-semibold ${
                        !notification.is_read ? 'text-[#3c4043]' : 'text-[#6f6f6f]'
                      }`}>
                        {notification.title}
                      </h4>
                      {!notification.is_read && (
                        <div className="flex-shrink-0 w-2.5 h-2.5 bg-[#f59e0b] rounded-full mt-1.5" />
                      )}
                    </div>
                    <p className="text-[13px] text-[#6f6f6f] leading-relaxed mb-2">
                      {notification.message}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-[#9f9f9f]">
                        {formatDate(notification.created_at)}
                      </span>
                      <div className="flex items-center gap-2">
                        {notification.action_url && (
                          <button
                            onClick={() => handleNotificationClick(notification)}
                            className="text-[12px] text-[#f59e0b] hover:text-[#d97706] font-semibold"
                          >
                            Görüntüle →
                          </button>
                        )}
                        <button
                          onClick={() => deleteNotification(notification.id)}
                          className="p-1.5 text-[#6f6f6f] hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
