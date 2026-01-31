'use client'

import { Package } from '@/types'

interface OrderActionMenuProps {
    package: Package
    isOpen: boolean
    onToggle: () => void
    onCancel: (id: number, details: string) => void
}

export function OrderActionMenu({ package: pkg, isOpen, onToggle, onCancel }: OrderActionMenuProps) {
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
                <div className="absolute left-0 top-8 bg-white dark:bg-slate-700 rounded-lg shadow-xl border border-slate-200 dark:border-slate-600 py-1 min-w-[160px] z-20">
                    {pkg.status !== 'cancelled' && (
                        <button
                            onClick={() => {
                                onToggle()
                                onCancel(
                                    pkg.id,
                                    `Sipariş: ${pkg.order_number || pkg.id}\nMüşteri: ${pkg.customer_name}\nTutar: ${pkg.amount}₺`
                                )
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-2"
                        >
                            <span>🚫</span>
                            <span>Siparişi İptal Et</span>
                        </button>
                    )}
                </div>
            )}
        </div>
    )
}
