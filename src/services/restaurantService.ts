/**
 * @file src/services/restaurantService.ts
 * @description Restoran Finansal Servisi — Paket Bazlı is_paid_to_restaurant Mimarisi
 *
 * YENİ SİSTEM:
 * - Kümülatif global bakiye YOK
 * - Her paket is_paid_to_restaurant flag'i taşır
 * - Hesaplama: filtrelenen tarih aralığındaki ödenmemiş paketler üzerinden
 * - Ödeme: Supabase RPC (process_restaurant_payment) ile atomik transaction
 */
import { supabase } from '@/app/lib/supabase'

// ── TİP TANIMLARI ──────────────────────────────────────────────

export interface PeriodFinancials {
  package_fee: number
  unpaid_revenue: number
  unpaid_package_count: number
  unpaid_cost: number
  unpaid_commission?: number
  net_payable: number
  paid_revenue: number
  paid_package_count: number
  total_package_count: number
}

export interface UnpaidBalance {
  id: string
  name: string
  package_fee: number
  unpaid_revenue: number
  unpaid_package_count: number
  unpaid_cost: number
  unpaid_commission?: number
  current_balance: number
}

// ── 1. DÖNEM FİNANSALLARI (RestaurantDetailModal için) ─────────

export async function getRestaurantPeriodFinancials(
  restaurantId: string,
  startDate: string,
  endDate: string
): Promise<{ success: boolean; data?: PeriodFinancials; error?: string }> {
  try {
    const start = new Date(startDate)
    start.setHours(0, 0, 0, 0)
    const end = new Date(endDate)
    end.setHours(23, 59, 59, 999)

    const { data, error } = await supabase.rpc('get_restaurant_period_financials', {
      p_restaurant_id: restaurantId,
      p_start_date: start.toISOString(),
      p_end_date: end.toISOString(),
    })

    if (error) {
      console.error('❌ RPC Hatası (get_restaurant_period_financials):', JSON.stringify(error, null, 2))
      return { success: false, error: error.message }
    }

    return { success: true, data: data as PeriodFinancials }
  } catch (err: any) {
    console.error('❌ getRestaurantPeriodFinancials CATCH:', err.message)
    return { success: false, error: err.message }
  }
}

// ── 2. TÜM RESTORANLARIN ÖDENMEMİŞ BAKİYELERİ (RestaurantsTab) ─

export async function getAllRestaurantsUnpaidBalances(
  startDate?: string,
  endDate?: string
): Promise<{
  success: boolean
  data?: UnpaidBalance[]
  error?: string
}> {
  try {
    // Tarih parametrelerini hazırla (boşsa null gönder → RPC tüm zamanları döner)
    const params: Record<string, any> = {}
    if (startDate && endDate) {
      const start = new Date(startDate)
      start.setHours(0, 0, 0, 0)
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)
      params.p_start_date = start.toISOString()
      params.p_end_date = end.toISOString()
    }

    const { data, error } = await supabase.rpc('get_all_restaurants_unpaid_balances', params)

    if (error) {
      console.error('❌ RPC Hatası (get_all_restaurants_unpaid_balances):', JSON.stringify(error, null, 2))
      return { success: false, error: error.message }
    }

    return { success: true, data: (data || []) as UnpaidBalance[] }
  } catch (err: any) {
    console.error('❌ getAllRestaurantsUnpaidBalances CATCH:', err.message)
    return { success: false, error: err.message }
  }
}

// ── 3. ÖDEME İŞLEMİ (Atomik RPC) ──────────────────────────────
/**
 * p_end_date'e kadar (dahil) tüm ödenmemiş paketleri "ödendi" olarak işaretler.
 * start_date KULLANILMAZ — geçmişten birikmiş tüm bakiye tek seferde kapatılır.
 *
 * KURAL: p_end_date tarihine kadar is_paid_to_restaurant = false olan
 * TÜM paketler kapatılır. Dönem kör noktası (kara delik) oluşmaz.
 */
export async function processRestaurantPayment(
  restaurantId: string,
  _startDate: string,   // Artık kullanılmıyor — geriye uyumluluk için imzada tutuluyor
  endDate: string,
  notes?: string
): Promise<{
  success: boolean
  message?: string
  error?: string
  data?: { package_count: number; revenue: number; cost: number; net_paid: number }
}> {
  try {
    const end = new Date(endDate)
    end.setHours(23, 59, 59, 999)

    console.log('📤 Ödeme RPC çağrılıyor (tüm geçmiş kapatılıyor):', {
      restaurant_id: restaurantId,
      end: end.toISOString(),
    })

    const { data, error } = await supabase.rpc('process_restaurant_payment', {
      p_restaurant_id: restaurantId,
      p_end_date:      end.toISOString(),
      p_notes:         notes || null,
    })

    if (error) {
      console.error('❌ RPC Hatası (process_restaurant_payment):', JSON.stringify(error, null, 2))
      return { success: false, error: error.message }
    }

    const result = data as any
    if (!result?.success) {
      return { success: false, error: result?.error || 'Ödeme işlemi başarısız' }
    }

    console.log('✅ Ödeme başarılı:', JSON.stringify(result, null, 2))
    return {
      success: true,
      message: result.message,
      data: {
        package_count: result.package_count,
        revenue: result.revenue,
        cost: result.cost,
        net_paid: result.net_paid,
      },
    }
  } catch (err: any) {
    console.error('❌ processRestaurantPayment CATCH:', JSON.stringify({
      name: err?.name,
      message: err?.message,
    }, null, 2))
    return { success: false, error: err?.message || 'Beklenmeyen hata' }
  }
}

// ── ESKİ FONKSİYONLAR (Geriye Uyumluluk) ──────────────────────
// RestaurantsTab'daki eski çağrılar kırılmasın diye geçici wrapper'lar

/** @deprecated Yeni sistem: getRestaurantPeriodFinancials kullanın */
export async function getRestaurantFinancials(
  restaurantId: string,
  startDate?: string,
  endDate?: string
) {
  if (startDate && endDate) {
    const result = await getRestaurantPeriodFinancials(restaurantId, startDate, endDate)
    if (result.success && result.data) {
      // Eski formata dönüştür (geriye uyumluluk)
      return {
        success: true,
        data: {
          package_fee: result.data.package_fee,
          current_balance: result.data.net_payable,
          period: {
            revenue: result.data.unpaid_revenue + result.data.paid_revenue,
            cost: result.data.unpaid_cost + (result.data.paid_package_count * result.data.package_fee),
            total_package_count: result.data.total_package_count,
            delivered_count: result.data.total_package_count,
          },
        },
      }
    }
    return result
  }
  return { success: false, error: 'Tarih aralığı gerekli' }
}

/** @deprecated Yeni sistem: processRestaurantPayment kullanın */
export async function handleRestaurantPayment(
  restaurantId: string | number,
  amountPaid: number,
  notes?: string,
  periodStart?: string | null,
  periodEnd?: string | null
) {
  if (periodStart && periodEnd) {
    return processRestaurantPayment(String(restaurantId), periodStart, periodEnd, notes)
  }
  return { success: false, error: 'Tarih aralığı belirtilmeli (yeni sistem)' }
}
