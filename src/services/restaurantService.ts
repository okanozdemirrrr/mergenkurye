/**
 * @file src/services/restaurantService.ts
 * @description Restoran Finansal Servisi — B2B RPC Mimarisi
 *
 * TEK KAYNAK: Supabase RPC (get_restaurant_financials_v2)
 *
 * Yük veritabanına aktarıldı. Frontend'de binlerce satırlık veri çekilip reduce EDİLMEZ.
 */
import { supabase } from '@/app/lib/supabase'

export interface RestaurantFinancialsV2 {
  package_fee: number
  current_balance: number // Kümülatif Bakiye (Tarih bağımsız)
  period: {
    revenue: number
    cost: number
    payments?: number
    delivered_count?: number
    chargeable_count?: number
    total_package_count: number
  }
}

/**
 * Restoran finansal özetini RPC üzerinden çeker.
 * 
 * @param restaurantId Restoran UUID'si
 * @param startDate İsteğe bağlı başlangıç tarihi (ISO String)
 * @param endDate İsteğe bağlı bitiş tarihi (ISO String)
 */
export async function getRestaurantFinancials(
  restaurantId: string,
  startDate?: string,
  endDate?: string
): Promise<{ success: boolean; data?: RestaurantFinancialsV2; error?: string }> {
  try {
    let start: string | undefined = undefined
    let end: string | undefined = undefined

    if (startDate && endDate) {
      // Başlangıç günün başı, bitiş günün sonu
      const sDate = new Date(startDate)
      sDate.setHours(0, 0, 0, 0)
      start = sDate.toISOString()

      const eDate = new Date(endDate)
      eDate.setHours(23, 59, 59, 999)
      end = eDate.toISOString()
    }

    const { data, error } = await supabase.rpc('get_restaurant_financials_v2', {
      p_restaurant_id: restaurantId,
      p_start_date: start || null,
      p_end_date: end || null
    })

    if (error) {
      console.error('❌ Supabase RPC Hatası (get_restaurant_financials_v2):', error)
      return { success: false, error: error.message }
    }

    return {
      success: true,
      data: data as RestaurantFinancialsV2
    }
  } catch (error: any) {
    console.error('❌ getRestaurantFinancials beklenmeyen hata:', error)
    return { success: false, error: error.message || 'Bilinmeyen hata' }
  }
}

/**
 * Tüm restoranların finansal özetlerini RPC üzerinden toplu çeker.
 */
export async function getAllRestaurantsFinancials(
  startDate?: string,
  endDate?: string
): Promise<{ success: boolean; data?: (RestaurantFinancialsV2 & { id: string, name: string })[]; error?: string }> {
  try {
    let start: string | undefined = undefined
    let end: string | undefined = undefined

    if (startDate && endDate) {
      const sDate = new Date(startDate)
      sDate.setHours(0, 0, 0, 0)
      start = sDate.toISOString()

      const eDate = new Date(endDate)
      eDate.setHours(23, 59, 59, 999)
      end = eDate.toISOString()
    }

    const { data, error } = await supabase.rpc('get_all_restaurants_financials', {
      p_start_date: start || null,
      p_end_date: end || null
    })

    if (error) {
      console.error('❌ Supabase RPC Hatası (get_all_restaurants_financials):', error)
      return { success: false, error: error.message }
    }

    return {
      success: true,
      data: data as (RestaurantFinancialsV2 & { id: string, name: string })[]
    }
  } catch (error: any) {
    console.error('❌ getAllRestaurantsFinancials beklenmeyen hata:', error)
    return { success: false, error: error.message || 'Bilinmeyen hata' }
  }
}

/**
 * Restoran ödeme kaydı oluşturur.
 * KURAL: Validasyon üst sınırı YOK.
 */
export async function handleRestaurantPayment(
  restaurantId: string | number,
  amountPaid: number,
  notes?: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    if (amountPaid <= 0) {
      return { success: false, error: 'Ödeme tutarı sıfırdan büyük olmalıdır' }
    }

    const { error } = await supabase
      .from('restaurant_payment_transactions')
      .insert({
        restaurant_id: restaurantId,
        transaction_date: new Date().toISOString().split('T')[0],
        brut_ciro: 0,
        toplam_masraf: 0,
        net_hakedis: 0,
        amount_paid: amountPaid,
        package_count: 0,
        order_ids: [],
        notes: notes || `Ödeme — ${new Date().toLocaleDateString('tr-TR')}`,
      })

    if (error) {
      console.error('❌ Ödeme INSERT hatası:', error)
      return { success: false, error: error.message }
    }

    return { success: true, message: '✅ Ödeme başarıyla kaydedildi' }
  } catch (error: any) {
    console.error('❌ handleRestaurantPayment beklenmeyen hata:', error)
    return { success: false, error: error.message || 'Bilinmeyen hata' }
  }
}
