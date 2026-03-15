'use client'

import { useState } from 'react'
import { supabase } from '@/app/lib/supabase'
import { Send, Sparkles, Users, Bell } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function DuyurularPage() {
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [sentCount, setSentCount] = useState(0)

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      setError('Başlık ve mesaj alanları boş bırakılamaz!')
      setTimeout(() => setError(''), 3000)
      return
    }

    if (!confirm(`Bu duyuru TÜM müşterilere gönderilecek. Emin misiniz?`)) {
      return
    }

    setSending(true)
    setError('')
    setSuccess(false)

    try {
      console.log('📢 Toplu duyuru gönderiliyor...')

      const { data, error: functionError } = await supabase.rpc('send_campaign_notification', {
        p_title: title.trim(),
        p_message: message.trim(),
        p_action_url: '/musteri'
      })

      if (functionError) {
        console.error('Fonksiyon hatası:', functionError)
        throw functionError
      }

      console.log('✅ Duyuru gönderildi! Etkilenen müşteri sayısı:', data)
      
      setSentCount(data || 0)
      setSuccess(true)
      setTitle('')
      setMessage('')

      setTimeout(() => {
        setSuccess(false)
        setSentCount(0)
      }, 5000)

    } catch (err: any) {
      console.error('💥 Duyuru gönderilemedi:', err)
      setError('Duyuru gönderilirken hata oluştu: ' + (err.message || 'Bilinmeyen hata'))
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-orange-500 to-pink-500 rounded-2xl mb-4 shadow-2xl shadow-orange-500/50">
            <Bell size={40} className="text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2 bg-gradient-to-r from-orange-400 to-pink-400 bg-clip-text text-transparent">
            Toplu Duyuru Sistemi
          </h1>
          <p className="text-slate-400 text-lg">
            Tüm müşterilere anlık bildirim gönderin
          </p>
        </motion.div>

        {/* Success Message */}
        <AnimatePresence>
          {success && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -20 }}
              className="mb-6 p-6 bg-gradient-to-r from-green-900/50 to-emerald-900/50 border-2 border-green-500 rounded-2xl backdrop-blur-sm"
            >
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                  <Sparkles size={24} className="text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-green-300 mb-1">
                    🎉 Duyuru Başarıyla Gönderildi!
                  </h3>
                  <p className="text-green-200">
                    <span className="font-bold text-2xl">{sentCount}</span> müşteriye bildirim ulaştı
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6 p-4 bg-red-900/50 border-2 border-red-500 rounded-xl text-red-300"
          >
            ⚠️ {error}
          </motion.div>
        )}

        {/* Main Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 border-2 border-orange-500/30 shadow-2xl shadow-orange-500/20 overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 via-pink-500/5 to-purple-500/5 animate-pulse" />
          <div className="absolute -inset-1 bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 rounded-3xl opacity-20 blur-xl animate-pulse" />

          <div className="relative z-10">
            {/* Stats Bar */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                <div className="flex items-center gap-3">
                  <Users size={24} className="text-orange-400" />
                  <div>
                    <p className="text-slate-400 text-sm">Toplam Müşteri</p>
                    <p className="text-white text-2xl font-bold">∞</p>
                  </div>
                </div>
              </div>
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                <div className="flex items-center gap-3">
                  <Bell size={24} className="text-pink-400" />
                  <div>
                    <p className="text-slate-400 text-sm">Bildirim Tipi</p>
                    <p className="text-white text-lg font-bold">Kampanya</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Title Input */}
            <div className="mb-6">
              <label className="block text-white font-bold text-lg mb-3 flex items-center gap-2">
                <Sparkles size={20} className="text-orange-400" />
                Duyuru Başlığı
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Örn: 🎉 Özel Kampanya!"
                maxLength={100}
                className="w-full px-6 py-4 bg-slate-800 border-2 border-slate-700 rounded-xl text-white text-lg placeholder-slate-500 outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20 transition-all"
              />
              <p className="text-slate-500 text-sm mt-2">
                {title.length}/100 karakter
              </p>
            </div>

            {/* Message Textarea */}
            <div className="mb-8">
              <label className="block text-white font-bold text-lg mb-3 flex items-center gap-2">
                <Send size={20} className="text-pink-400" />
                Duyuru Mesajı
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Kampanya detaylarını buraya yazın... Müşterilerinizi heyecanlandırın!"
                maxLength={500}
                rows={6}
                className="w-full px-6 py-4 bg-slate-800 border-2 border-slate-700 rounded-xl text-white text-lg placeholder-slate-500 outline-none focus:border-pink-500 focus:ring-4 focus:ring-pink-500/20 transition-all resize-none"
              />
              <p className="text-slate-500 text-sm mt-2">
                {message.length}/500 karakter
              </p>
            </div>

            {/* Preview Box */}
            {(title || message) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mb-8 p-6 bg-gradient-to-br from-orange-900/30 to-pink-900/30 border-2 border-orange-500/50 rounded-2xl"
              >
                <p className="text-orange-300 text-sm font-semibold mb-3 flex items-center gap-2">
                  <Bell size={16} />
                  ÖNİZLEME - Müşteriler böyle görecek:
                </p>
                <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700">
                  <h4 className="text-white font-bold text-lg mb-2">
                    {title || 'Başlık buraya gelecek...'}
                  </h4>
                  <p className="text-slate-300 text-sm leading-relaxed">
                    {message || 'Mesaj buraya gelecek...'}
                  </p>
                </div>
              </motion.div>
            )}

            {/* Send Button */}
            <motion.button
              onClick={handleSend}
              disabled={sending || !title.trim() || !message.trim()}
              whileHover={{ scale: sending ? 1 : 1.02 }}
              whileTap={{ scale: sending ? 1 : 0.98 }}
              className={`w-full py-6 rounded-2xl font-bold text-xl transition-all relative overflow-hidden group ${
                sending || !title.trim() || !message.trim()
                  ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 text-white shadow-2xl shadow-orange-500/50 hover:shadow-orange-500/70'
              }`}
            >
              {!sending && title.trim() && message.trim() && (
                <div className="absolute inset-0 bg-gradient-to-r from-orange-400 via-pink-400 to-purple-400 opacity-0 group-hover:opacity-30 blur-xl transition-opacity" />
              )}

              <span className="relative z-10 flex items-center justify-center gap-3">
                {sending ? (
                  <>
                    <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
                    Gönderiliyor...
                  </>
                ) : (
                  <>
                    <Send size={24} />
                    Tüm Müşterilere Gönder
                    <Sparkles size={24} className="animate-pulse" />
                  </>
                )}
              </span>
            </motion.button>

            {/* Info Box */}
            <div className="mt-6 p-4 bg-blue-900/20 border border-blue-500/30 rounded-xl">
              <p className="text-blue-300 text-sm leading-relaxed">
                <span className="font-semibold">💡 Bilgi:</span> Bu duyuru sistemdeki tüm müşterilere anlık olarak gönderilecektir. 
                Bildirimler hem uygulama içinde hem de tarayıcı push notification olarak iletilir.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Tips Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
            <div className="text-2xl mb-2">🎯</div>
            <h3 className="text-white font-semibold mb-1">Dikkat Çekici Olun</h3>
            <p className="text-slate-400 text-sm">
              Emoji kullanın ve kısa, öz mesajlar yazın
            </p>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
            <div className="text-2xl mb-2">⏰</div>
            <h3 className="text-white font-semibold mb-1">Doğru Zamanlama</h3>
            <p className="text-slate-400 text-sm">
              Öğle ve akşam saatlerinde daha etkili
            </p>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
            <div className="text-2xl mb-2">🎁</div>
            <h3 className="text-white font-semibold mb-1">Değer Sunun</h3>
            <p className="text-slate-400 text-sm">
              İndirim, kampanya gibi fırsatlar paylaşın
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
