/**
 * @file src/services/orderService.ts
 * @description Sipariş İşlemleri Servisi.
 * Siparişlerin yaşam döngüsünü yönetir. Sipariş iptali, kurye atama ve 
 * sipariş durumu güncellemeleri gibi temel veritabanı işlemlerini gerçekleştirir.
 * @version 2.0 - Push notification support added
 */
import { supabase } from '@/app/lib/supabase'

/**
 * Sipariş iptal işlemi (Finansal Mantık ile)
 * 
 * İPTAL KATEGORİZASYONU:
 * - Ücretli İptal: Kurye paketi aldıktan sonra iptal (on_the_way -> cancelled)
 *   → is_chargeable_cancellation = true
 *   → Hesaplamalara dahil edilir (restoran borcu, kurye kazancı)
 * 
 * - Ücretsiz İptal: Kurye paketi almadan önce iptal (diğer durumlar -> cancelled)
 *   → is_chargeable_cancellation = false
 *   → Hesaplamalara dahil edilmez
 */
export async function cancelOrder(packageId: number, details: string = 'Sipariş iptal edilecek') {
    try {
        const confirmed = window.confirm(
            `Bu siparişi iptal etmek istediğinizden emin misiniz?\n\n${details}`
        )

        if (!confirmed) return { success: false, cancelled: true }

        // 1. Mevcut sipariş durumunu kontrol et
        const { data: packageData, error: fetchError } = await supabase
            .from('packages')
            .select('status, picked_up_at, courier_id')
            .eq('id', packageId)
            .single()

        if (fetchError) throw fetchError

        // 2. Ücretli iptal mi kontrol et
        // KURAL: Kurye atanmamışsa (null) -> Kesinlikle Ücretsiz İptal
        // KURAL: Kurye atanmışsa VE paketi almışsa -> Ücretli İptal
        const isChargeableCancellation = !!(
            packageData.courier_id &&
            (packageData.status === 'on_the_way' || packageData.status === 'picking_up' || packageData.picked_up_at)
        )

        console.log('🔍 İptal Analizi:', {
            packageId,
            currentStatus: packageData.status,
            courierId: packageData.courier_id,
            pickedUpAt: packageData.picked_up_at,
            isChargeableCancellation,
            reason: isChargeableCancellation 
                ? '💰 Ücretli İptal (Kurye paketi aldı/yola çıktı)' 
                : '🆓 Ücretsiz İptal (Kurye paketi almadı veya atanmadı)'
        })

        // 3. İptal işlemini gerçekleştir
        const { error } = await supabase
            .from('packages')
            .update({
                status: 'cancelled',
                courier_id: null,  // Kurye bağlantısını kopar
                cancelled_at: new Date().toISOString(),
                cancelled_by: 'admin',
                is_chargeable_cancellation: isChargeableCancellation
            })
            .eq('id', packageId)

        if (error) throw error

        // 4. Kullanıcıya bilgi ver
        if (isChargeableCancellation) {
            alert('⚠️ Ücretli İptal\n\nKurye paketi aldığı için bu iptal hesaplamalara dahil edilecek.\n(Restoran borcu, kurye kazancı)')
        }

        return { success: true, isChargeableCancellation }
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
        // 1. Paket bilgilerini al (bildirim için gerekli + durum kontrolü)
        const { data: packageData, error: packageError } = await supabase
            .from('packages')
            .select('customer_name, delivery_address, restaurant_id, status, restaurants(name)')
            .eq('id', packageId)
            .single()

        if (packageError) throw packageError

        // 🚫 GÜVENLİK KONTROLÜ: Kurye paketi aldıysa başka kuryeye atanamaz!
        const blockedStatuses = ['picking_up', 'on_the_way', 'delivered']
        if (blockedStatuses.includes((packageData as any).status)) {
            alert(`❌ Bu paket "${(packageData as any).status}" durumunda!\n\nKurye paketi aldıktan sonra başka kuryeye atanamaz.`)
            return { success: false, error: 'Paket kurye tarafından alındı, atanamaz' }
        }

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

            console.log('🔥 DEBUG: Push notification tetikleniyor:', {
                courierId,
                packageId,
                restaurantName,
                deliveryAddress,
                packageData: packageData
            })

            // API route'a istek gönder (absolute URL ile)
            const baseUrl = typeof window !== 'undefined' 
                ? window.location.origin 
                : process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
            
            const apiUrl = `${baseUrl}/api/send-push`
            console.log('🔥 DEBUG: API URL:', apiUrl)
            
            const requestBody = {
                courierId,
                restaurantName,
                deliveryAddress,
                customerName: packageData.customer_name
            }
            console.log('🔥 DEBUG: Request Body:', JSON.stringify(requestBody, null, 2))
            
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            })

            console.log('🔥 DEBUG: API Response Status:', response.status)
            console.log('🔥 DEBUG: API Response OK:', response.ok)
            
            const result = await response.json()
            console.log('🔥 DEBUG: API Response Body:', result)
            
            if (response.ok) {
                console.log('✅ Push notification başarıyla gönderildi:', result)
                alert(`✅ Kurye atandı ve bildirim gönderildi!\n\nKurye: ${result.courierName}\nBildirim: ${result.title}`)
            } else {
                console.warn('⚠️ Push notification gönderilemedi:', result)
                alert(`⚠️ Kurye atandı ama bildirim gönderilemedi!\n\nHata: ${result.error}\nDetay: ${result.details || 'Yok'}`)
            }
        } catch (pushError) {
            console.error('❌ Push notification hatası (kurye atama başarılı):', pushError)
            alert(`❌ Push notification hatası!\n\n${pushError}\n\nKurye atandı ama bildirim gönderilemedi.`)
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
