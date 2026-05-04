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
 * Kurye atama işlemi + Push Notification (Trendyol Tarzı)
 * 
 * SENARYO:
 * 1. Admin kuryeye paket atar
 * 2. Supabase'de paket güncellenir
 * 3. Kurye'nin FCM token'ı alınır
 * 4. Push notification gönderilir: "YENİ SİPARİŞ 🚀" - "[Restoran Adı] - [Teslimat Adresi]"
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

        // 3. Push Notification Gönder (Trendyol Formatı)
        try {
            const restaurantName = (packageData as any).restaurants?.name || 'Restoran'
            const deliveryAddress = packageData.delivery_address || packageData.customer_name || 'Müşteri'

            console.log('📤 Push notification tetikleniyor (Trendyol formatı):', {
                courierId,
                packageId,
                restaurantName,
                deliveryAddress
            })

            // API route'a istek gönder (absolute URL ile)
            const baseUrl = typeof window !== 'undefined' 
                ? window.location.origin 
                : process.env.NEXT_PUBLIC_SITE_URL || 'https://mergenkuryesistem.vercel.app'
            
            const response = await fetch(`${baseUrl}/api/send-push`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    courierId,
                    restaurantName,
                    deliveryAddress,
                    customerName: packageData.customer_name
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
