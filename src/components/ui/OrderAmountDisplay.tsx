/**
 * Ücretli iptal siparişlerinin tutar / rozet gösterimi — admin, kurye, restoran ortak.
 */
'use client'

import {
  isChargeableCancellation,
  type PackageLike,
} from '@/utils/calculations'

export {
  isChargeableCancellation,
  sortChargeableCancelsLast,
} from '@/utils/calculations'

/**
 * Ücretli iptal — soluk rose/kırmızı (ücretsiz iptal gri, teslim yeşil/mavi ile karışmaz)
 */
export const CHARGEABLE_CANCEL_CHIP_CLASS =
  'border-rose-800/50 bg-rose-950/40 text-rose-300/90'

export const CHARGEABLE_CANCEL_BADGE_CLASS =
  'bg-rose-950/50 text-rose-300 border border-rose-800/40'

/** Light UI (restoran paneli) */
export const CHARGEABLE_CANCEL_BADGE_CLASS_LIGHT =
  'bg-red-100 text-red-600 border border-red-200'

export const CHARGEABLE_CANCEL_ROW_CLASS =
  'opacity-85 bg-rose-950/20 border-rose-900/30'

export const CHARGEABLE_CANCEL_ROW_CLASS_LIGHT =
  'opacity-90 bg-red-50 border-red-100'

function formatTry(value: number | null | undefined): string {
  const n = Number(value)
  if (!Number.isFinite(n)) return '0,00 ₺'
  return `${n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺`
}

type OrderAmountDisplayProps = {
  amount?: number | null
  /** Direkt flag veya paket objesi */
  isChargeableCancel?: boolean
  pkg?: PackageLike | null
  className?: string
  /** Başarılı sipariş tutar rengi */
  successClassName?: string
  size?: 'sm' | 'md' | 'lg'
}

/**
 * Ücretli iptal: üstü çizili orijinal tutar + kalın "0,00 ₺ (İPTAL)"
 * Diğer: normal tutar
 */
export function OrderAmountDisplay({
  amount,
  isChargeableCancel,
  pkg,
  className = '',
  successClassName = 'text-emerald-400 font-bold',
  size = 'md',
}: OrderAmountDisplayProps) {
  const cancelled =
    isChargeableCancel === true ||
    (pkg != null && isChargeableCancellation(pkg))

  const sizeClass =
    size === 'lg' ? 'text-xl' : size === 'sm' ? 'text-xs' : 'text-sm'

  if (cancelled) {
    return (
      <span
        className={`inline-flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 ${sizeClass} ${className}`}
      >
        <span className="line-through opacity-50 text-rose-400/70 font-normal">
          {formatTry(amount)}
        </span>
        <span className="font-bold text-rose-300">0,00 ₺ (İPTAL)</span>
      </span>
    )
  }

  return (
    <span className={`${sizeClass} ${successClassName} ${className}`}>
      {formatTry(amount)}
    </span>
  )
}

type ChargeableCancelBadgeProps = {
  light?: boolean
  className?: string
  label?: string
}

export function ChargeableCancelBadge({
  light = false,
  className = '',
  label = 'Ücretli İptal',
}: ChargeableCancelBadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${
        light ? CHARGEABLE_CANCEL_BADGE_CLASS_LIGHT : CHARGEABLE_CANCEL_BADGE_CLASS
      } ${className}`}
    >
      {label}
    </span>
  )
}
