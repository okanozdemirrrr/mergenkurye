'use client'

import { useState } from 'react'
import { supabase } from '@/app/lib/supabase'
import { Courier } from '@/types'
import { User, CheckCircle2, PauseCircle, XCircle, LogOut, AlertCircle, X } from 'lucide-react'

interface CourierAccountStatusModalProps {
  courier: Courier
  onClose: () => void
  onSuccess: () => void
}

type AccountStatusType = 'active' | 'suspended' | 'terminated' | 'resigned'

export function CourierAccountStatusModal({ courier, onClose, onSuccess }: CourierAccountStatusModalProps) {
  const [accountStatus, setAccountStatus] = useState<AccountStatusType>(
    ((courier as any).account_status as AccountStatusType) || 'active'
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    setLoading(true)
    setError('')

    try {
      const updates: any = { account_status: accountStatus }

      // Eğer hesap askıya alınıyor veya kalıcı kapatılıyorsa (işten çıkarılma / istifa), vardiyayı pasif yap
      if (accountStatus === 'terminated' || accountStatus === 'resigned' || accountStatus === 'suspended') {
        updates.is_active = false
        updates.status = 'idle'
      }

      const { error: updateError } = await supabase
        .from('couriers')
        .update(updates)
        .eq('id', courier.id)

      if (updateError) {
        if (updateError.message?.includes('couriers_account_status_check') || updateError.code === '23514') {
          throw new Error(
            "Veritabanında 'İşten Kendisi Çıktı' (resigned) durumu için SQL güncellemesi gerekiyor. Lütfen migrations/add_resigned_status_to_couriers.sql dosyasını Supabase SQL Editor'de çalıştırın."
          )
        }
        throw updateError
      }

      onSuccess()
      onClose()
    } catch (err: any) {
      console.error('Hesap durumu güncelleme hatası:', err)
      setError(err.message || 'Bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const options: {
    value: AccountStatusType
    title: string
    description: string
    icon: typeof CheckCircle2
    colorClass: string
    activeBorderClass: string
    activeBgClass: string
    badgeText?: string
  }[] = [
    {
      value: 'active',
      title: 'Aktif',
      description: 'Normal hesap, kurye paneline giriş yapabilir ve paket taşıyabilir',
      icon: CheckCircle2,
      colorClass: 'text-emerald-400',
      activeBorderClass: 'border-emerald-500/60 ring-1 ring-emerald-500/30',
      activeBgClass: 'bg-emerald-950/20'
    },
    {
      value: 'suspended',
      title: 'Geçici Olarak Kullanıma Kapalı',
      description: 'Hesap askıya alınır, geçici olarak sisteme giriş yapamaz',
      icon: PauseCircle,
      colorClass: 'text-amber-400',
      activeBorderClass: 'border-amber-500/60 ring-1 ring-amber-500/30',
      activeBgClass: 'bg-amber-950/20',
      badgeText: 'Askıda'
    },
    {
      value: 'terminated',
      title: 'Kalıcı Olarak Kullanıma Kapalı — İşten Çıkarıldı',
      description: 'Yönetim tarafından iş akdi sonlandırıldı, kalıcı olarak giriş engellenir',
      icon: XCircle,
      colorClass: 'text-rose-400',
      activeBorderClass: 'border-rose-500/60 ring-1 ring-rose-500/30',
      activeBgClass: 'bg-rose-950/20',
      badgeText: 'İşten Çıkarılan'
    },
    {
      value: 'resigned',
      title: 'Kalıcı Olarak Kullanıma Kapalı — İşten Kendisi Çıktı',
      description: 'Kendi isteğiyle ayrıldı (istifa), kalıcı olarak giriş engellenir',
      icon: LogOut,
      colorClass: 'text-purple-400',
      activeBorderClass: 'border-purple-500/60 ring-1 ring-purple-500/30',
      activeBgClass: 'bg-purple-950/20',
      badgeText: 'Kendi Çıkan'
    }
  ]

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-lg shadow-2xl max-w-lg w-full overflow-hidden text-slate-100">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
              <User className="w-4 h-4" strokeWidth={1.8} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 tracking-tight">
                Hesap Durumu Yönetimi
              </h2>
              <p className="text-xs text-slate-400 tracking-tight">
                {courier.full_name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="text-slate-400 hover:text-slate-200 transition-colors p-1 rounded-md hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <p className="text-xs text-slate-400 mb-4 tracking-tight">
            Kuryenin sisteme erişim ve hesap durumunu aşağıdan belirleyin:
          </p>

          <div className="space-y-2.5">
            {options.map((opt) => {
              const Icon = opt.icon
              const isSelected = accountStatus === opt.value

              return (
                <label
                  key={opt.value}
                  onClick={() => setAccountStatus(opt.value)}
                  className={`flex items-start gap-3 p-3.5 rounded-lg border transition-all cursor-pointer ${
                    isSelected
                      ? `${opt.activeBorderClass} ${opt.activeBgClass}`
                      : 'border-slate-800 bg-slate-950/40 hover:border-slate-700 hover:bg-slate-800/40'
                  }`}
                >
                  <input
                    type="radio"
                    name="accountStatus"
                    value={opt.value}
                    checked={isSelected}
                    onChange={() => setAccountStatus(opt.value)}
                    className="mt-0.5 accent-indigo-500 w-4 h-4 cursor-pointer"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-semibold text-xs flex items-center gap-1.5 ${opt.colorClass}`}>
                        <Icon className="w-4 h-4 shrink-0" strokeWidth={1.8} />
                        {opt.title}
                      </span>
                      {opt.badgeText && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">
                          {opt.badgeText}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                      {opt.description}
                    </div>
                  </div>
                </label>
              )
            })}
          </div>

          {error && (
            <div className="mt-4 p-3.5 bg-rose-950/40 border border-rose-800/60 rounded-md text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <div className="flex-1 leading-relaxed">{error}</div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2.5 px-6 py-4 border-t border-slate-800 bg-slate-950/30">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md text-xs font-medium border border-slate-700 transition-colors disabled:opacity-50 tracking-tight"
          >
            İptal
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md text-xs font-semibold shadow-sm transition-colors disabled:opacity-50 tracking-tight"
          >
            {loading ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
          </button>
        </div>
      </div>
    </div>
  )
}
