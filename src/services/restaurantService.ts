/**
 * @file src/services/restaurantService.ts
 * @description Restoran Finansal Servisi — Paket Bazlı is_paid_to_restaurant Mimarisi
 *
 * YENİ SİSTEM:
 * - Kümülatif global bakiye YOK
 * - Her paket is_paid_to_restaurant flag'i taşır
 * - Hesaplama: filtrelenen tarih aralığındaki ödenmemiş paketler üzerinden
 * - Ödeme: Supabase RPC (process_restaurant_settlement) ile atomik mutabakat
 */
import { supabase } from '@/app/lib/supabase'
import { parseFilterInputToUtcIso } from '@/utils/calculations'

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
    // Europe/Istanbul duvar saati → UTC (tarayıcı TZ / gece yarısı kayması yok)
    const startIso = parseFilterInputToUtcIso(startDate, 'start')
    const endIso = parseFilterInputToUtcIso(endDate, 'end')

    const { data, error } = await supabase.rpc('get_restaurant_period_financials', {
      p_restaurant_id: restaurantId,
      p_start_date: startIso,
      p_end_date: endIso,
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
    // Europe/Istanbul duvar saati → UTC
    const params: Record<string, any> = {}
    if (startDate && endDate) {
      params.p_start_date = parseFilterInputToUtcIso(startDate, 'start')
      params.p_end_date = parseFilterInputToUtcIso(endDate, 'end')
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
/**
 * Dönem mutabakatı: process_restaurant_settlement RPC
 * - restaurant_settlements fişi açar
 * - İlgili paketleri is_paid_to_restaurant=true + restaurant_settlement_id bağlar
 */
export async function processRestaurantPayment(
  restaurantId: string,
  startDate: string,
  endDate: string,
  notes?: string
): Promise<{
  success: boolean
  message?: string
  error?: string
  data?: {
    package_count: number
    revenue: number
    cost: number
    commission?: number
    net_paid: number
    settlement_id?: string
  }
}> {
  try {
    if (!startDate || !endDate) {
      return { success: false, error: 'Başlangıç ve bitiş tarihi zorunludur' }
    }

    // Europe/Istanbul duvar saati → UTC (örn. 13 Temmuz 00:00 TR = 12 Temmuz 21:00 UTC)
    const startIso = parseFilterInputToUtcIso(startDate, 'start')
    const endIso = parseFilterInputToUtcIso(endDate, 'end')

    console.log('📤 Mutabakat RPC çağrılıyor:', {
      restaurant_id: restaurantId,
      start: startIso,
      end: endIso,
    })

    const { data, error } = await supabase.rpc('process_restaurant_settlement', {
      p_restaurant_id: restaurantId,
      p_start_date: startIso,
      p_end_date: endIso,
      p_notes: notes || null,
    })

    if (error) {
      console.error('❌ RPC Hatası (process_restaurant_settlement):', JSON.stringify(error, null, 2))
      return { success: false, error: error.message }
    }

    const result = data as any
    if (!result?.success) {
      return { success: false, error: result?.error || 'Mutabakat işlemi başarısız' }
    }

    console.log('✅ Mutabakat başarılı:', JSON.stringify(result, null, 2))
    return {
      success: true,
      message: result.message,
      data: {
        package_count: result.package_count,
        revenue: result.revenue,
        cost: result.cost,
        commission: result.commission,
        net_paid: result.net_paid,
        settlement_id: result.settlement_id,
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
