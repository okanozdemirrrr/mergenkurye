/**
 * @file src/services/orderService.ts
 * @description Sipariş İşlemleri Servisi.
 * Siparişlerin yaşam döngüsünü yönetir. Sipariş iptali, kurye atama ve 
 * sipariş durumu güncellemeleri gibi temel veritabanı işlemlerini gerçekleştirir.
 */
import { supabase } from '@/app/lib/supabase'

/**
 * Sipariş iptal işlemi
 */
export async function cancelOrder(packageId: number, details: string = 'Sipariş iptal edilecek') {
    try {
        const confirmed = window.confirm(
            `Bu siparişi iptal etmek istediğinizden emin misiniz?\n\n${details}`
        )

        if (!confirmed) return { success: false, cancelled: true }

        const { error } = await supabase
            .from('packages')
            .update({
                status: 'cancelled',
                courier_id: null,  // Kurye bağlantısını kopar
                cancelled_at: new Date().toISOString(),
                cancelled_by: 'admin'
            })
            .eq('id', packageId)

        if (error) throw error

        return { success: true }
    } catch (error) {
        console.error('Sipariş iptal hatası:', error)
        return { success: false, error }
    }
}

/**
 * Kurye atama işlemi
 */
export async function assignCourier(packageId: number, courierId: string) {
    try {
        const { error } = await supabase
            .from('packages')
            .update({
                courier_id: courierId,
                status: 'assigned',
                assigned_at: new Date().toISOString()
            })
            .eq('id', packageId)

        if (error) throw error

        return { success: true }
    } catch (error) {
        console.error('Kurye atama hatası:', error)
        return { success: false, error }
    }
}

/**
 * Sipariş durumu güncelleme
 */
export async function updateOrderStatus(
    packageId: number,
    status: string,
    additionalData?: Record<string, any>
) {
    try {
        const updateData: Record<string, any> = { status, ...additionalData }

        const { error } = await supabase
            .from('packages')
            .update(updateData)
            .eq('id', packageId)

        if (error) throw error

        return { success: true }
    } catch (error) {
        console.error('Durum güncelleme hatası:', error)
        return { success: false, error }
    }
}
