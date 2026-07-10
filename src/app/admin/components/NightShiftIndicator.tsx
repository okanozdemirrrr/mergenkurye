interface NightShiftIndicatorProps {
  isNightShift?: boolean
  className?: string
}

export function NightShiftIndicator({ isNightShift, className = '' }: NightShiftIndicatorProps) {
  if (!isNightShift) return null

  return (
    <span
      className={`shrink-0 inline-flex items-center justify-center rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/40 text-[10px] w-5 h-5 leading-none shadow-[0_0_8px_rgba(99,102,241,0.3)] ${className}`}
      title="Gece Vardiyacısı — 00:30-02:00 arası paketler otomatik atanır"
    >
      🌙
    </span>
  )
}
