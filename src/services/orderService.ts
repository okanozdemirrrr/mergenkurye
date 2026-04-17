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
 * Kurye atama işlemi + Push Notification
 */
export async function assignCourier(packageId: number, courierId: string) {
    try {
        // 1. Paket bilgilerini al (bildirim için gerekli)
        const { data: packageData, error: packageError } = await supabase
            .from('packages')
            .select('customer_name, delivery_address, restaurant_id, restaurants(name)')
            .eq('id', packageId)
            .single()

        if (packageError) throw packageError

        // 2. Kurye ata
        const { error } = await supabase
            .from('packages')
            .update({
                courier_id: courierId,
                status: 'assigned',
                assigned_at: new Date().toISOString()
            })
            .eq('id', packageId)

        if (error) throw error

        // 3. Push Notification Gönder (Ateşleme Mekanizması)
        try {
            // Mahalle/adres bilgisini çıkar (ilk 50 karakter)
            const addressPreview = packageData.delivery_address?.substring(0, 50) || 'Adres bilgisi yok'
            const restaurantName = (packageData as any).restaurants?.name || 'Restoran'

            // Bildirim içeriği
            const notificationTitle = '🚀 Yeni Paket Atandı!'
            const notificationBody = `${restaurantName} - ${addressPreview}${addressPreview.length >= 50 ? '...' : ''}`

            console.log('📤 Push notification tetikleniyor:', {
                courierId,
                packageId,
                title: notificationTitle,
                body: notificationBody
            })

            // API route'a istek gönder
            const response = await fetch('/api/send-push', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    courierId,
                    title: notificationTitle,
                    body: notificationBody,
                    data: {
                        packageId: packageId.toString(),
                        type: 'new_package'
                    }
                })
            })

            if (response.ok) {
                const result = await response.json()
                console.log('✅ Push notification başarıyla gönderildi:', result)
            } else {
                const error = await response.json()
                console.warn('⚠️ Push notification gönderilemedi:', error)
                // Hata olsa bile kurye atama işlemi başarılı sayılır
            }
        } catch (pushError) {
            console.error('❌ Push notification hatası (kurye atama başarılı):', pushError)
            // Push notification hatası kurye atama işlemini etkilemez
        }

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
