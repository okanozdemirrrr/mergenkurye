import { supabase } from '@/app/lib/supabase'

export interface SystemAnnouncement {
  id: string
  title: string
  content: string
  created_at: string
}

export async function fetchSystemAnnouncements(): Promise<SystemAnnouncement[]> {
  const { data, error } = await supabase
    .from('system_announcements')
    .select('id, title, content, created_at')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

export async function fetchReadAnnouncementIds(userId: string): Promise<string[]> {
  if (!userId) return []

  const { data, error } = await supabase
    .from('read_announcements')
    .select('announcement_id')
    .eq('user_id', userId)

  if (error) throw error
  return (data ?? []).map((row) => row.announcement_id)
}

export async function createSystemAnnouncement(title: string, content: string): Promise<SystemAnnouncement> {
  const { data, error } = await supabase
    .from('system_announcements')
    .insert({ title: title.trim(), content: content.trim() })
    .select('id, title, content, created_at')
    .single()

  if (error) throw error
  return data
}

export async function markAnnouncementsAsRead(
  userId: string,
  announcementIds: string[]
): Promise<void> {
  if (!userId || announcementIds.length === 0) return

  const rows = announcementIds.map((announcementId) => ({
    user_id: userId,
    announcement_id: announcementId,
    read_at: new Date().toISOString(),
  }))

  const { error } = await supabase
    .from('read_announcements')
    .upsert(rows, { onConflict: 'user_id,announcement_id', ignoreDuplicates: true })

  if (error) throw error
}
