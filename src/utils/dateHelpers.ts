// Date and Time Helper Functions

/**
 * Türkiye saatine göre tarih/saat formatlar
 */
export function formatTurkishTime(dateString?: string): string {
    if (!dateString) return '-'

    try {
        const date = new Date(dateString)
        return date.toLocaleTimeString('tr-TR', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Europe/Istanbul'
        })
    } catch {
        return '-'
    }
}

/**
 * Türkiye saatine göre tarih formatlar
 */
export function formatTurkishDate(dateString: string): string {
    if (!dateString) return '-'

    try {
        const date = new Date(dateString)
        return date.toLocaleDateString('tr-TR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            timeZone: 'Europe/Istanbul'
        })
    } catch {
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
