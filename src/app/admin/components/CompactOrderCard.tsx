/**
 * @file src/app/admin/components/CompactOrderCard.tsx
 * @description Kompakt sipariş kartı - 6 kart yan yana sığacak şekilde optimize edilmiş
 */
'use client'

import { Package, Courier } from '@/types'
import { getPlatformBadgeClass, getPlatformDisplayName } from '@/app/lib/platformUtils'
import { supabase } from '@/app/lib/supabase'

interface CompactOrderCardProps {
    package: Package
    couriers: Courier[]
    isMenuOpen: boolean
    onMenuToggle: () => void
    onCardClick: () => void
    onCancelOrder: (id: number, details: string) => void
}

export function CompactOrderCard({
    package: pkg,
    couriers,
    isMenuOpen,
    onMenuToggle,
    onCardClick,
    onCancelOrder
}: CompactOrderCardProps) {
    const courierName = pkg.courier_id 
        ? couriers.find(c => c.id === pkg.courier_id)?.full_name || 'Bilinmeyen'
        : 'Atanmadı'

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'assigned':
                return { text: 'Atandı', class: 'bg-orange-500 text-white' }
            case 'picking_up':
                return { text: 'Alınıyor', class: 'bg-blue-500 text-white' }
            case 'on_the_way':
                return { text: 'Yolda', class: 'bg-purple-500 text-white' }
            default:
                return { text: status, class: 'bg-gray-500 text-white' }
        }
    }

    const getPaymentBadge = (method: string) => {
        switch (method) {
            case 'cash':
                return { text: 'Nakit', class: 'bg-green-100 text-green-700' }
            case 'iban':
                return { text: 'IBAN', class: 'bg-purple-100 text-purple-700' }
            case 'card':
                return { text: 'Kart', class: 'bg-blue-100 text-blue-700' }
            default:
                return { text: method, class: 'bg-gray-100 text-gray-700' }
        }
    }

    const handleStatusChange = async () => {
        const statusOptions = [
            { value: 'waiting', label: '⏳ Beklemede' },
            { value: 'ready', label: '✅ Hazır' },
            { value: 'assigned', label: '👤 Atandı' },
            { value: 'picking_up', label: '🏃 Alınıyor' },
            { value: 'on_the_way', label: '🚗 Yolda' },
            { value: 'delivered', label: '✅ Teslim Edildi' },
            { value: 'cancelled', label: '❌ İptal Edildi' }
        ]
        
        const choice = prompt(
            `Sipariş #${pkg.order_number} için yeni durum seçin:\n\n` +
            statusOptions.map((opt, i) => `${i + 1}. ${opt.label}`).join('\n') +
            `\n\nMevcut durum: ${pkg.status}\n\nSeçiminizi girin (1-7):`
        )
        
        if (!choice) return
        
        const index = parseInt(choice) - 1
        if (index < 0 || index >= statusOptions.length) {
            alert('Geçersiz seçim!')
            return
        }
        
        const newStatus = statusOptions[index].value
        
        if (newStatus === pkg.status) {
            alert('Aynı durumu seçtiniz!')
            return
        }
        
        try {
            const updates: any = { status: newStatus }
            
            if (newStatus === 'assigned' && !pkg.assigned_at) {
                updates.assigned_at = new Date().toISOString()
            }
            if (newStatus === 'picking_up' && !pkg.picked_up_at) {
                updates.picked_up_at = new Date().toISOString()
            }
            if (newStatus === 'delivered' && !pkg.delivered_at) {
                updates.delivered_at = new Date().toISOString()
            }
            if (newStatus === 'cancelled' && !pkg.cancelled_at) {
                updates.cancelled_at = new Date().toISOString()
                updates.cancelled_by = 'admin'
            }
            
            const { error } = await supabase
                .from('packages')
                .update(updates)
                .eq('id', pkg.id)
            
            if (error) throw error
            
            alert('✅ Sipariş durumu başarıyla güncellendi!')
            onMenuToggle()
        } catch (error) {
            console.error('❌ Durum güncelleme hatası:', error)
            alert('❌ Durum güncellenirken hata oluştu!')
        }
    }

    const statusBadge = getStatusBadge(pkg.status)
    const paymentBadge = getPaymentBadge(pkg.payment_method)

    return (
        <div className="relative bg-white rounded-lg border border-slate-200 hover:border-orange-400 hover:shadow-lg transition-all group">
            {/* Tıklanabilir Alan */}
            <div 
                onClick={onCardClick} 
                className="absolute inset-0 z-0 rounded-lg cursor-pointer"
            />

            {/* 3 Nokta Menü */}
            <div className="absolute top-1 right-1 z-20" onClick={(e) => e.stopPropagation()}>
                <div className="relative">
                    <button
                        onClick={onMenuToggle}
                        className="p-1 hover:bg-slate-100 rounded transition-colors"
                    >
                        <svg className="w-4 h-4 text-slate-600" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                        </svg>
                    </button>

                    {/* Dropdown Menü */}
                    {isMenuOpen && (
                        <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-xl border border-slate-200 py-1 z-50">
                            <button
                                onClick={handleStatusChange}
                                className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-orange-50 hover:text-orange-600 transition-colors"
                            >
                                🔄 Sipariş Durumunu Değiştir
                            </button>
                            <button
                                onClick={() => {
                                    const reason = prompt('İptal nedeni:')
                                    if (reason) {
                                        onCancelOrder(pkg.id, reason)
                                        onMenuToggle()
                                    }
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                            >
                                ❌ Sipariş İptal Et
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Platform Badge */}
            {pkg.platform && (
                <div className="absolute top-1 left-1 z-10">
                    <span className={`text-[9px] py-0.5 px-1.5 rounded font-bold ${getPlatformBadgeClass(pkg.platform)}`}>
                        {getPlatformDisplayName(pkg.platform)}
                    </span>
                </div>
            )}

            {/* Kart İçeriği */}
            <div className="p-2 pt-6 space-y-1.5 relative z-10">
                {/* Sipariş No - Kalın ve Belirgin */}
                <div className="text-center">
                    <div className="text-sm font-black text-orange-600">
                        #{pkg.order_number || '......'}
                    </div>
                </div>

                {/* Durum Badge */}
                <div className="flex justify-center">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${statusBadge.class}`}>
                        {statusBadge.text}
                    </span>
                </div>

                {/* Tutar - Kalın ve Belirgin */}
                <div className="text-center">
                    <div className="text-lg font-black text-green-600">
                        {pkg.amount}₺
                    </div>
                </div>

                <div className="border-t border-slate-100"></div>

                {/* Kurye */}
                <div className="text-center">
                    <div className="text-[10px] text-slate-500 mb-0.5">Kurye</div>
                    <div className="text-xs font-semibold text-slate-800 truncate px-1">
                        {courierName}
                    </div>
                </div>

                {/* Müşteri */}
                <div className="text-center">
                    <div className="text-[10px] text-slate-500 mb-0.5">Müşteri</div>
                    <div className="text-xs text-slate-700 truncate px-1">
                        {pkg.customer_name}
                    </div>
                </div>

                {/* Adres */}
                <div className="text-center">
                    <div className="text-[10px] text-slate-500 mb-0.5">Adres</div>
                    <div className="text-[10px] text-slate-600 truncate px-1" title={pkg.delivery_address}>
                        {pkg.delivery_address}
                    </div>
                </div>

                {/* Ödeme Yöntemi */}
                <div className="flex justify-center">
                    <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${paymentBadge.class}`}>
                        {paymentBadge.text}
                    </span>
                </div>
            </div>
        </div>
    )
}
