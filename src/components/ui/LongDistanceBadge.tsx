export function LongDistanceBadge({ className = '' }: { className?: string }) {
  return (
    <span
      className={`bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded font-medium ${className}`}
    >
      Uzak Mesafe
    </span>
  )
}
