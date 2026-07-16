'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Bell } from 'lucide-react'
import {
  fetchSystemAnnouncements,
  fetchReadAnnouncementIds,
  markAnnouncementsAsRead,
  type SystemAnnouncement,
} from '@/services/announcementService'
import { formatShortDateTime } from '@/utils/dateHelpers'
import { supabase } from '@/app/lib/supabase'

interface NotificationBellProps {
  userId: string | null
  /** Koyu header üzerinde açık buton */
  variant?: 'dark' | 'light'
}

export function NotificationBell({ userId, variant = 'dark' }: NotificationBellProps) {
  const [announcements, setAnnouncements] = useState<SystemAnnouncement[]>([])
  const [readIds, setReadIds] = useState<Set<string>>(new Set())
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const unreadAnnouncements = announcements.filter((a) => !readIds.has(a.id))
  const hasUnread = unreadAnnouncements.length > 0

  const loadData = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const [all, read] = await Promise.all([
        fetchSystemAnnouncements(),
        fetchReadAnnouncementIds(userId),
      ])
      setAnnouncements(all)
      setReadIds(new Set(read))
    } catch (err) {
      console.error('Duyurular yüklenemedi:', err)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Realtime: yeni duyuru INSERT → state güncelle, kırmızı nokta anında görünsün
  useEffect(() => {
    if (!userId) return

    const channel = supabase
      .channel(`system-announcements-realtime-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'system_announcements',
        },
        (payload) => {
          const incoming = payload.new as SystemAnnouncement
          if (!incoming?.id) return

          setAnnouncements((prev) => {
            if (prev.some((a) => a.id === incoming.id)) return prev
            return [incoming, ...prev]
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const handleMarkAsRead = async (ids: string[]) => {
    if (!userId || ids.length === 0) return
    setReadIds((prev) => new Set([...prev, ...ids]))
    try {
      await markAnnouncementsAsRead(userId, ids)
    } catch (err) {
      console.error('Okundu işaretlenemedi:', err)
      await loadData()
    }
  }

  const handleToggle = async () => {
    const next = !isOpen
    setIsOpen(next)

    if (next && unreadAnnouncements.length > 0) {
      const ids = unreadAnnouncements.map((a) => a.id)
      await handleMarkAsRead(ids)
    }
  }

  const handleItemClick = async (announcementId: string) => {
    if (!readIds.has(announcementId)) {
      await handleMarkAsRead([announcementId])
    }
  }

  if (!userId) return null

  const buttonClass =
    variant === 'dark'
      ? 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
      : 'bg-white hover:bg-gray-50 text-gray-800 border border-gray-200'

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={handleToggle}
        aria-label="Sistem duyuruları"
        className={`relative p-2.5 rounded-md shadow-sm transition-colors ${buttonClass}`}
      >
        <Bell className="w-5 h-5 text-gray-400" strokeWidth={1.5} />
        {hasUnread && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-900 border border-slate-800 rounded-md shadow-sm z-[200] overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-800">
            <h3 className="text-sm font-semibold text-white">Sistem Duyuruları</h3>
            <p className="text-xs text-slate-400 mt-0.5">Güncelleme ve bildirimler</p>
          </div>

          <div className="max-h-80 overflow-y-auto admin-scrollbar">
            {loading ? (
              <p className="px-4 py-6 text-sm text-slate-500 text-center">Yükleniyor...</p>
            ) : announcements.length === 0 ? (
              <p className="px-4 py-6 text-sm text-slate-500 text-center">Henüz duyuru yok.</p>
            ) : (
              <ul className="divide-y divide-slate-800">
                {announcements.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => handleItemClick(item.id)}
                      className="w-full text-left px-4 py-3 hover:bg-slate-800/80 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-white">{item.title}</p>
                        {!readIds.has(item.id) && (
                          <span className="shrink-0 w-1.5 h-1.5 mt-1.5 bg-red-500 rounded-full" />
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed whitespace-pre-wrap">
                        {item.content}
                      </p>
                      <p className="text-[10px] text-slate-500 mt-2 uppercase tracking-wide">
                        {formatShortDateTime(item.created_at)}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
