'use client'

import { useState } from 'react'
import { Bell, Loader2 } from 'lucide-react'
import { createSystemAnnouncement } from '@/services/announcementService'

export function AdminAnnouncementForm() {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim() || !content.trim()) {
      setError('Başlık ve içerik zorunludur.')
      return
    }

    if (!confirm('Bu duyuru tüm restoran ve kurye panellerinde görünecek. Gönderilsin mi?')) {
      return
    }

    setSending(true)
    setError('')
    setSuccess('')

    try {
      await createSystemAnnouncement(title, content)
      setSuccess('Duyuru yayınlandı.')
      setTitle('')
      setContent('')
      setTimeout(() => setSuccess(''), 4000)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Bilinmeyen hata'
      setError('Duyuru gönderilemedi: ' + message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Bell className="w-5 h-5 text-gray-400" strokeWidth={1.5} />
          <h1 className="text-xl font-semibold text-white tracking-tight">Sistem Duyurusu</h1>
        </div>
        <p className="text-sm text-slate-400">
          Restoran ve kurye panellerindeki bildirim çanına tek yönlü duyuru ekleyin.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-slate-900 border border-slate-800 rounded-md p-6 shadow-sm space-y-4"
      >
        <div>
          <label htmlFor="announcement-title" className="block text-xs font-medium uppercase tracking-wider text-gray-400 mb-2">
            Başlık
          </label>
          <input
            id="announcement-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Örn: Sistem güncellemesi v1.5"
            className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-md text-white text-sm placeholder-slate-500 focus:outline-none focus:border-slate-500"
            maxLength={120}
          />
        </div>

        <div>
          <label htmlFor="announcement-content" className="block text-xs font-medium uppercase tracking-wider text-gray-400 mb-2">
            İçerik
          </label>
          <textarea
            id="announcement-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Duyuru metnini yazın..."
            rows={6}
            className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-md text-white text-sm placeholder-slate-500 focus:outline-none focus:border-slate-500 resize-y"
          />
        </div>

        {error && (
          <p className="text-sm text-red-400 border border-red-500/30 bg-red-500/10 rounded-md px-3 py-2">
            {error}
          </p>
        )}

        {success && (
          <p className="text-sm text-green-400 border border-green-500/30 bg-green-500/10 rounded-md px-3 py-2">
            {success}
          </p>
        )}

        <button
          type="submit"
          disabled={sending}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white text-sm font-medium rounded-md transition-colors"
        >
          {sending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} />
              Yayınlanıyor...
            </>
          ) : (
            'Duyuruyu Yayınla'
          )}
        </button>
      </form>
    </div>
  )
}
