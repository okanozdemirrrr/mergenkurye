// Date and Time Helper Functions

/**
 * Türkiye saatine göre tarih/saat formatlar
 * Tüm timestamp'leri tutarlı şekilde Türkiye saatine çevirir
 */
export function formatTurkishTime(dateString?: string | null): string {
    if (!dateString) return '-'

    try {
        // String'i Date objesine çevir
        const date = new Date(dateString)
        
        // Geçersiz tarih kontrolü
        if (isNaN(date.getTime())) {
            console.warn('⚠️ Geçersiz tarih:', dateString)
            return '-'
        }
        
        // Türkiye saatine çevir ve formatla
        return date.toLocaleTimeString('tr-TR', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Europe/Istanbul'
        })
    } catch (error) {
        console.error('❌ Tarih formatlama hatası:', error, dateString)
        return '-'
    }
}

/**
 * Türkiye saatine göre tarih formatlar
 */
export function formatTurkishDate(dateString?: string | null): string {
    if (!dateString) return '-'

    try {
        const date = new Date(dateString)
        
        if (isNaN(date.getTime())) {
            console.warn('⚠️ Geçersiz tarih:', dateString)
            return '-'
        }
        
        return date.toLocaleDateString('tr-TR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            timeZone: 'Europe/Istanbul'
        })
    } catch (error) {
        console.error('❌ Tarih formatlama hatası:', error, dateString)
        return '-'
    }
}

/**
 * Türkiye saatine göre tam tarih ve saat formatlar
 */
export function formatTurkishDateTime(dateString?: string | null): string {
    if (!dateString) return '-'

    try {
        const date = new Date(dateString)
        
        if (isNaN(date.getTime())) {
            console.warn('⚠️ Geçersiz tarih:', dateString)
            return '-'
        }
        
        return date.toLocaleString('tr-TR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Europe/Istanbul'
        })
    } catch (error) {
        console.error('❌ Tarih formatlama hatası:', error, dateString)
        return '-'
    }
}

/**
 * Teslimat süresini dakika cinsinden hesaplar
 */
export function calculateDeliveryDuration(pickedUpAt?: string, deliveredAt?: string): number | null {
    if (!pickedUpAt || !deliveredAt) return null

    try {
        const pickupTime = new Date(pickedUpAt).getTime()
        const deliveryTime = new Date(deliveredAt).getTime()
        const durationMs = deliveryTime - pickupTime
        return Math.round(durationMs / 1000 / 60) // dakikaya çevir
    } catch {
        return null
    }
}
