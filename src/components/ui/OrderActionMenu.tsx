'use client'

import { Package } from '@/types'

interface OrderActionMenuProps {
    package: Package
    isOpen: boolean
    onToggle: () => void
    onCancel?: (id: number, details: string) => void
    onUpdateAmount?: (pkg: Package) => void
    showCancel?: boolean
}

export function OrderActionMenu({
    package: pkg,
    isOpen,
    onToggle,
    onCancel,
    onUpdateAmount,
    showCancel = true,
}: OrderActionMenuProps) {
    return (
        <div className="relative">
            <button
                onClick={(e) => {
                    e.stopPropagation()
                    onToggle()
                }}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
                title="Menü"
            >
                <span className="text-slate-600 dark:text-slate-400 text-lg">⋮</span>
            </button>

            {isOpen && (
                <div className="absolute left-0 top-8 bg-white dark:bg-slate-700 rounded-lg shadow-xl border border-slate-200 dark:border-slate-600 py-1 min-w-[180px] z-30 flex flex-col">
                    {onUpdateAmount && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                onToggle()
                                onUpdateAmount(pkg)
                            }}
                            className="w-full px-4 py-2.5 text-left text-sm text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors whitespace-nowrap"
                        >
                            Sipariş Tutarı Değiştir
                        </button>
                    )}
                    {showCancel && onCancel && pkg.status !== 'cancelled' && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                onToggle()
                                onCancel(
                                    pkg.id,
                                    `Sipariş: ${pkg.order_number || pkg.id}\nMüşteri: ${pkg.customer_name}\nTutar: ${pkg.amount}₺`
                                )
                            }}
                            className="w-full px-4 py-2.5 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors whitespace-nowrap"
                        >
                            Siparişi İptal Et
                        </button>
                    )}
                </div>
            )}
        </div>
    )
}
